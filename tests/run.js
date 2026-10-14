// 用 node 跑：node tests/run.js
// 检查每个练习：网络端子都存在、设备不重叠、正确接法试车全过、故障题试车不过、随机故障能被试车发现、图纸能画出来。
const fs = require('fs'), path = require('path'), vm = require('vm');
const mem = {};
const ctx = { console, localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } } };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['core.js', 'symbols.js', 'real.js', 'exercises.js', 'progress.js', 'pages-data.js', 'build-data.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
const PP = ctx.PP;
let fails = 0;
const bad = (...m) => { fails++; console.log('  ✗', ...m); }, bad_ = bad;

for (const [i, ex] of PP.EX.entries()) {
  console.log(`${ex.id.padEnd(7)} ${ex.name}`);
  // 1. 端子都存在、同一端子不在两个网络里
  const seen = {};
  for (const n of ex.nets) for (const t of n.terms) {
    try { PP.termPos(t); } catch (e) { bad('端子不存在', t); }
    if (!ex.devs.includes(t.split('.')[0])) bad('端子所属设备不在本练习', t);
    if (seen[t]) bad('端子出现在两个网络', t, seen[t], n.id); seen[t] = n.id;
  }
  // 2. 设备框不重叠
  const box = d => PP.DEV[d];
  for (let a = 0; a < ex.devs.length; a++) for (let b = a + 1; b < ex.devs.length; b++) {
    const A = box(ex.devs[a]), B = box(ex.devs[b]);
    if (A.x < B.x + B.w && B.x < A.x + A.w && A.y < B.y + B.h && B.y < A.y + A.h) bad('设备重叠', ex.devs[a], ex.devs[b]);
  }
  // 3. 正确接法试车
  const lab = new PP.Lab(ex, PP.chain(ex));
  const ck = lab.check(); if (!ck.ok) bad('标准接法校线不过');
  const t = lab.runTest({ fault: null });
  if (!t.pass) bad('标准接法试车不过', JSON.stringify(t.res), t.r && t.r.why);
  // 每个端子最多两根线
  const cnt = {}; PP.chain(ex).forEach(w => w.forEach(x => (cnt[x] = (cnt[x] || 0) + 1)));
  Object.entries(cnt).forEach(([k, v]) => { if (v > 2) bad('标准接法一个端子压了', v, '根线', k); });
  // 4. 故障题：预置接线试车必须不过
  if (ex.preset) {
    const fl = new PP.Lab(ex, ex.preset.map(w => [...w]));
    const ft = fl.runTest({ fault: null });
    if (ft.pass) bad('故障题居然试车通过了'); else console.log('  故障在第', ft.res.length, '步暴露');
  }
  // 5. 随机故障：能被试车发现的候选数量
  if (!ex.preset) {
    const c = lab.faultCands(), caught = c.filter(f => !lab.runTest({ fault: f }).pass);
    console.log(`  随机故障候选 ${c.length}，能被试车发现 ${caught.length}`);
    if (caught.length < 3) bad('可用随机故障太少');
  }
  // 6. 图纸、梯形图能画
  try {
    const fr = PP.frame(ex, i);
    if (!fr.svg.includes('data-net')) bad('图纸没有网络');
    for (const n of ex.nets) if (!fr.svg.includes(`data-net="${n.id}"`)) bad('图纸上找不到线号', n.id);
    for (const d of ex.devs) if (!fr.svg.includes(`data-dev="${d}"`) && !['XT1', 'XT3', 'XT1B', 'PS', 'X1'].includes(d)) bad('图纸上找不到设备', d);
    if (ex.ladder) PP.ladderSVG(ex.ladder, {}, ex.bitNames);
  } catch (e) { bad('画图出错', e.message); }
  // 7. 电流动画：标准接法送电后要有带电流的线
  const fl2 = new PP.Lab(ex, PP.chain(ex)); fl2.applyEv('power_on');
  const r = fl2.sim(); if (r.short) bad('送电就短路');
}
// 万用表几个点
{
  const ex = PP.EX.find(e => e.id === 'hold'), L = new PP.Lab(ex, PP.chain(ex));
  const m1 = L.meter('KM.A1', 'KM.A2'); if (!m1.v.includes('550')) bad('线圈电阻读数', m1.v);
  const m2 = L.meter('FU.2', 'SB1.1'); if (m2.v !== '0.0 Ω') bad('FU2-SB1.1 应该通', m2.v);
  L.st.p.SB2 = true; const m3 = L.meter('SB2.3', 'SB2.4'); if (m3.v !== '0.0 Ω') bad('按住 SB2 应该通', m3.v);
  L.applyEv('power_on'); const r = L.sim(); const m4 = L.meter('XT1.L', 'XT1.N', r); if (!m4.v.includes('220')) bad('L-N 电压', m4.v);
  L.applyEv('press_SB2'); const r2 = L.sim(); const fl = L.flow(r2); if (fl.size < 4) bad('自锁回路电流动画线太少', fl.size);
  // 方向：L→FU 那根线应从 XT1.L 流向 FU.1
  const w = L.wires.find(w => w.includes('XT1.L')); const d = fl.get(w); if (!d || d[0] !== 'XT1.L') bad('电流方向不对', d);
  const wn = L.wires.find(w => w.includes('XT1.N')); const dn = fl.get(wn); if (!dn || dn[1] !== 'XT1.N') bad('零线电流方向不对', dn);
}
{
  const ex = PP.EX.find(e => e.id === 'yd'), L = new PP.Lab(ex, PP.chain(ex));
  let t = 0; L.now = () => t;
  L.applyEv('power_on'); L.applyEv('press_SB2'); let r = L.sim(); L.ktTick(r);
  if (!(r.on.KC2 && !r.on.KC3)) bad('星三角：启动时应星形');
  t += 3100; r = L.sim(); if (!(r.on.KC3 && !r.on.KC2)) bad('星三角：3 秒后应三角形', JSON.stringify(r.on));
}
// 专题页数据
if (PP.calcMotor) {
  console.log('专题页数据');
  const r4 = PP.calcMotor(4);
  if (Math.abs(r4.I - 8.1) > 0.3) bad('4kW 电流应约 8.1A', r4.I);
  if (r4.km[0] !== 'CJX2-0910') bad('4kW 接触器应 0910', r4.km[0]);
  if (!(r4.fr[0] <= r4.I && r4.I <= r4.fr[1])) bad('热继范围不含额定电流', r4.fr);
  if (r4.brk !== 16) bad('4kW 断路器应 16A', r4.brk);
  if (r4.wire[0] !== 1.5 || r4.wire[1] < r4.I * 1.25) bad('4kW 导线应 1.5（载流 ≥ 1.25 倍电流）', r4.wire);
  for (const k of PP.KW) { const r = PP.calcMotor(k), y = PP.calcMotor(k, { start: 'yd' }); if (!r.km || !r.fr || !r.brk || !r.wire) bad('选型表不够用', k, JSON.stringify(r)); if (!y.km || !y.fr) bad('星三角选型不够用', k); }
  for (const q of PP.QZ) if (!(q[3] >= 0 && q[3] < q[2].length) || !q[4]) bad('题目答案下标或解析有问题', q[1]);
  for (const s of PP.SYMS) { try { const v = s.svg(); if (!v.includes('<')) bad('符号空', s.id); } catch (e) { bad('符号画不出', s.id, e.message); } }
  console.log(`  题库 ${PP.QZ.length} 题，符号 ${PP.SYMS.length} 个`);
  // 梯形图练习：启保停
  const qbt = PP.LADS.find(l => l.id === 'qbt'), badL = PP.LADS.find(l => l.id === 'bad');
  let q = PP.scan(qbt, { 'I0.0': true, 'I0.1': true }); if (!q['Q0.0']) bad_('启保停按启动应输出');
  q = PP.scan(qbt, { 'I0.0': false, 'I0.1': true }, { 'Q0.0': true }); if (!q['Q0.0']) bad_('启保停松手应自锁');
  q = PP.scan(qbt, { 'I0.0': false, 'I0.1': false }, { 'Q0.0': true }); if (q['Q0.0']) bad_('启保停按停止应断');
  q = PP.scan(badL, { 'I0.0': true, 'I0.1': true }); if (q['Q0.0']) bad_('错误示范应该启动不了');
  const fr = PP.LADS.find(l => l.id === 'fr');
  q = PP.scan(fr, { 'I0.0': false, 'I0.1': true, 'I0.2': true }, { 'Q0.0': true, 'Q0.1': false }); if (q['Q0.1'] || !q['Q0.0']) bad_('正反转互锁失效');
  // IP 规划
  const dv = PP.IPDEVS(); const e0 = PP.ipCheck(dv);
  if (!e0[3].length || !e0[4].length || !e0[5].length || e0[0].length) bad_('IP 初始题目的错误没检出', JSON.stringify(e0));
  dv[3].ip = '192.168.0.11'; dv[3].name = 'io-device-2'; dv[4].ip = '192.168.0.100'; dv[5].ip = '192.168.0.200';
  if (PP.ipCheck(dv).some(x => x.length)) bad_('改对后 IP 仍报错', JSON.stringify(PP.ipCheck(dv)));
  if (!PP.ping(dv, 2).includes('丢失 = 0')) bad_('ping 应该通');
  // 变频器
  const v = o => PP.vfdSim({ wiring: 'ok', cmd: 'term', fsrc: 'panel', fset: 30, ...o });
  if (v({ di1: true }).state !== 'fwd' || v({ di1: true }).hz !== 30) bad_('变频器端子正转');
  if (v({ di2: true }).state !== 'rev') bad_('变频器端子反转');
  if (v({ cmd: 'panel', di1: true }).state !== 'stop') bad_('面板命令源时端子不应起作用');
  if (v({ di1: true, fsrc: 'ai', ai: 0 }).state !== 'stop') bad_('0V 给定不应转');
  if (v({ wiring: 'swap', di1: true }).state !== 'boom') bad_('接反应炸机');
  // HMI 绑定答案在选项里
  for (const r of PP.HMIBIND) if (!r.opts.includes(r.addr)) bad_('HMI 绑定答案不在选项里', r.el);
}
// 写实元件：每种元件在通电 / 断电、各种状态下都能画出来
if (PP.R) {
  console.log('写实元件');
  const sts = [{ power: false, p: {}, trip: false, target: false, estop: false }, { power: true, p: { SB1: true, SB2: true }, trip: true, target: true, estop: true }];
  for (const [d, v] of Object.entries(PP.DEV)) for (const st of sts) for (const o of [false, true]) {
    const on = o ? { [d]: true, [d + ':pw']: true, [d + ':run']: true, [d + ':I0.0']: true, [d + ':Q0.0']: true, [d + ':burn']: false } : {};
    try { const g = PP.R.dev(v, d, { p: 't-', on, st, r: { power: st.power, motor: o ? 'fwd' : 'stop' }, nm: v.name || '', kt: { o, p: o ? 0.5 : 0 } }); if (!g || g.includes('undefined') || g.includes('NaN')) bad('元件画出来有 undefined/NaN', d); } catch (e) { bad('元件画不出', d, e.message); }
  }
  for (const k of ['QF0', 'QF2', 'KM1', 'FR', 'PS', 'PLC', 'X1', 'X2', 'PE', 'qf1', 'km', 'fr', 'ka', 'x1', 'x2', 'vfd', 'nbar', 'tc']) { const g = PP.R.mini(k, 0, 0, k === 'fr' ? 55 : 44, k === 'fr' ? 14 : 56, 't-', k); if (g.includes('undefined') || g.includes('NaN')) bad('缩略图有 undefined/NaN', k); }
  console.log(`  ${Object.keys(PP.DEV).length} 种元件 × 4 种状态`);
}
// 新元件的典型错接要能被试车查出来
{
  console.log('典型错接');
  const st = PP.EX.find(e => e.id === 'stepper'), sr = PP.EX.find(e => e.id === 'srelay');
  const swap = (ws, a, b) => ws.map(w => w.map(t => (t === a ? b : t === b ? a : t)));
  const base = PP.chain(st);
  const run = (ex, ws) => { const L = new PP.Lab(ex, ws); return L.runTest(); };
  let r = run(st, swap(base, 'STP.A+', 'STP.A-')); if (r.pass || r.r.on['DRV:run'] !== 'rev') bad('步进 A+/A- 对调应反转并试车不过', r.r && r.r.on['DRV:run']);
  r = run(st, swap(base, 'STP.A-', 'STP.B+')); if (r.pass || r.r.on['DRV:run'] !== 'shake') bad('步进 A/B 混接应抖动', r.r && r.r.on['DRV:run']);
  r = run(sr, [...PP.chain(sr), ['SB2.3', 'SB2.4']].filter((w, i, a) => true)); if (r.pass) bad('复位端短接应查出（上电不能自己启动）');
  console.log('  步进对调相、A/B 混接、安全继电器复位短接都能查出');
  const E = id => PP.EX.find(e => e.id === id);
  r = run(E('servo'), swap(PP.chain(E('servo')), 'SVM.U', 'SVM.V')); if (r.pass || !r.r.on['SVD:alm']) bad('伺服 UV 对调应报警');
  r = run(E('analog'), swap(PP.chain(E('analog')), 'PT.+', 'PT.-')); if (r.pass || r.r.on['AIM:ma'] !== 0) bad('变送器接反应 0mA');
  r = run(E('lcurtain'), PP.chain(E('lcurtain')).filter(w => !w.includes('SR.S22'))); if (r.pass) bad('光栅只接一路 OSSD 应查出');
  r = run(E('valveisl'), swap(PP.chain(E('valveisl')), 'X1.3t', 'PS.+V').filter(w => w[0] !== w[1])); if (r.pass) bad('阀岛 COM 接错应查出');
  console.log('  伺服 UV 对调、变送器接反、光栅少接一路、阀岛 COM 接错都能查出');
}
// 随机故障要在图纸上标位置：每个故障的线号 / 元件都必须在原理图上点得到
{
  console.log('故障位置都能在图上标');
  let miss = 0;
  for (const [i, ex] of PP.EX.entries()) {
    if (ex.preset) continue;
    const L = new PP.Lab(ex, PP.chain(ex)), svg = PP.frame(ex, i).svg;
    for (const f of L.faultCands()) {
      const loc = f.kind === 'wire' ? 'data-net="' + L.nm[f.wref[0]].id + '"' : 'data-dev="' + (f.dev || f.a.split('.')[0]) + '"';
      if (!svg.includes(loc)) { miss++; bad('图上找不到故障位置', ex.id, f.name, loc); }
    }
  }
  if (!miss) console.log('  全部练习的故障位置都在图上');
}
// 学习路线：每一关的题目都存在，每道题都在某一关里；进度判断正确
if (PP.LEVELS) {
  console.log('学习路线');
  const exIds = PP.EX.map(e => e.id), inLv = PP.LEVELS.flatMap(L => L.items).filter(i => i.t === 'ex').map(i => i.id);
  inLv.forEach(id => { if (!exIds.includes(id)) bad('路线里的题不存在', id); });
  exIds.forEach(id => { if (!inLv.includes(id)) bad('有题没放进学习路线', id); });
  if (PP.prog.current() !== 0) bad('新用户应从第 0 关开始');
  PP.prog.setLesson('circuit'); PP.prog.setLesson('safety');
  if (PP.prog.current() !== 1) bad('学完第 0 关应到第 1 关');
  PP.prog.mark('jog', 'demo'); if (PP.prog.itemDone({ t: 'ex', id: 'jog' })) bad('只看演示不算学完');
  PP.prog.mark('jog', 'solo'); if (!PP.prog.itemDone({ t: 'ex', id: 'jog' })) bad('独立接对应算学完');
  for (const k of Object.keys(mem)) delete mem[k];
  console.log(`  ${PP.LEVELS.length} 关，${PP.LEVELS.flatMap(L => L.items).length} 项`);
}
// 配柜实战：参考答案满分，常见错误能扣分
if (PP.BUILD) {
  console.log('配柜实战');
  const B = PP.BUILD;
  const bestSel = Object.fromEntries(B.sel.map(it => [it.k, it.opts.findIndex(o => o[1] === 2)]));
  if (B.sel.some(it => !it.opts.some(o => o[1] === 2))) bad('选型题缺推荐答案');
  B.answer.forEach((r, i) => { if (B.used(r) > B.CAP) bad('参考布置超出导轨', i); });
  const lay = B.gradeLayout(B.answer); if (!lay.every(r => r.ok)) bad('参考布置没通过规则', JSON.stringify(lay.filter(r => !r.ok).map(r => r.name)));
  const okW = Object.fromEntries(B.wires.map(w => [w.k, { sec: w.sec[0], col: w.col[0], duct: String(w.duct) }]));
  const sc = B.score({ sel: bestSel, layout: B.answer, wires: okW }); if (sc.total !== 100) bad('参考答案应满分', JSON.stringify(sc));
  const mix = B.gradeLayout([['QF0', 'QF1', 'KM1', 'KM2', 'FR', 'QF2'], ['PS', 'X1'], ['PLC', 'X2', 'PE']]);
  if (mix.find(r => r.name.includes('端子排')).ok || mix.find(r => r.name.includes('最下排')).ok) bad('PLC 放下排应被查出');
  const sw = B.gradeLayout([['QF0', 'KM1', 'QF1', 'KM2', 'FR', 'QF2'], ['PS', 'PLC'], ['X2', 'X1', 'PE']]); if (sw[2].ok) bad('主回路顺序错应被查出');
  const wd = B.gradeWires({ ...okW, w6: { sec: '0.75', col: '蓝', duct: '0' } }); if (wd.find(r => r.k === 'w6').okD) bad('信号线走强电槽应被查出');
  const empty = B.score({}); if (empty.total !== 0) bad('空白应 0 分', JSON.stringify(empty));
  console.log(`  选型 ${B.sel.length} 项，元件 ${B.parts.length} 个，走线 ${B.wires.length} 根，参考答案 ${sc.total} 分`);
  // 每一套图纸：参考答案满分、空白 0 分、参考布置不超导轨、选项都在下拉列表里、学习路线能找到它
  for (const P of PP.BUILDS) {
    const best = Object.fromEntries(P.sel.map(it => [it.k, it.opts.findIndex(o => o[1] === 2)]));
    if (P.sel.some(it => !it.opts.some(o => o[1] === 2))) bad('选型题缺推荐答案', P.id);
    if (P.answer.length !== P.rows || P.answer.some(r => P.used(r) > P.CAP)) bad('参考布置排数不对或超出导轨', P.id);
    if (P.parts.some(p => !P.answer.some(r => r.includes(p.k)))) bad('参考布置漏了元件', P.id);
    const w = Object.fromEntries(P.wires.map(x => [x.k, { sec: x.sec[0], col: x.col[0], duct: String(x.duct) }]));
    if (P.wires.some(x => !x.sec.every(v => P.SEC.includes(v)) || !x.col.every(v => P.COL.includes(v)) || !(x.duct in P.DUCT))) bad('走线答案不在选项里', P.id);
    const s = P.score({ sel: best, layout: P.answer, wires: w });
    if (s.total !== 100) bad('参考答案应满分', P.id, JSON.stringify(s));
    if (P.score({}).total !== 0) bad('空白应 0 分', P.id);
    if (!PP.LEVELS.some(L => L.items.some(it => it.t === 'build' && it.id === P.id))) bad('学习路线里没有这套图纸', P.id);
    console.log(`  ${'★'.repeat(P.star).padEnd(5)} ${P.name}：选型 ${P.sel.length}、元件 ${P.parts.length}、规则 ${P.rules.length}、走线 ${P.wires.length}，参考答案 ${s.total} 分`);
  }
}
// 题库：不能靠“选最长的那个”蒙对（正确答案是唯一最长选项的比例 ≤ 20%）
{
  console.log('题库');
  const len = t => String(t).replace(/<[^>]+>/g, '').length;
  const longest = q => { const m = Math.max(...q[2].map(len)); return len(q[2][q[3]]) === m && q[2].filter(x => len(x) === m).length === 1; };
  const L = PP.QZ.filter(longest).length;
  if (L / PP.QZ.length > 0.2) bad('正确答案太常是最长的选项', `${L}/${PP.QZ.length}`);
  if (PP.QZ.some(q => !(q[3] >= 0 && q[3] < q[2].length))) bad('题库答案下标越界');
  console.log(`  ${PP.QZ.length} 题，正确答案是最长选项的 ${L} 题`);
}
console.log(fails ? `\n失败 ${fails} 项` : '\n全部通过');
process.exit(fails ? 1 : 0);
