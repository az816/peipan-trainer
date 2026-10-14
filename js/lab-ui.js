// lab-ui.js — 接线实训页：图纸、盘面、接线、万用表、试车、演示、随机故障、送电前检查
(function (G) {
  const PP = G.PP, DEV = PP.DEV, EX = PP.EX;
  const $ = id => document.getElementById(id);
  const store = PP.store, P = PP.prog;
  let WIRES = store.get('pp-wires-v3', {}), DONE = store.get('pp-done-v3', {}), BEST = store.get('pp-best-v1', {}), PREF = store.get('pp-pref-v3', { route: 'direct', skipCheck: false });
  let cur = 0, lab = null, lastSim = { on: {}, live: () => null, motor: 'stop', power: false };
  let sel = null, selWire = null, hl, marks = null, meterOn = false, mA = null, mB = null, view = 'sch';
  let ts = { i: 0, res: [], done: false }, demo = null, faultMode = null, chk = null, ktTimer = null, total = 0, seen = false, exam = null, examTimer = null;
  let follow = false, assist = false, quiet = false, toastT = null, zoom = PREF.zoom || (G.innerWidth < 700 ? 2 : 1);
  const ex = () => EX[cur];
  const has = d => ex().devs.includes(d);
  const clearHl = () => { hl = { terms: new Set(), dev: null, net: null, wires: new Set() }; };
  clearHl();
  const plcId = () => ex().devs.find(d => DEV[d].kind === 'plc' || DEV[d].kind === 'plcr');
  const tname = t => { const p = PP.termPos(t), side = p.dev === 'X1' ? (p.k.endsWith('t') ? '（上口）' : '（下口）') : ''; return `<b>${DEV[p.dev].lab}</b> 的 <span class="mono">${p.label}</span>${/^\d+$/.test(p.label) ? ' 号' : ''}${side}`; };
  const nlab = PP.nlab;
  const save = () => { WIRES[ex().id] = lab.wires; store.set('pp-wires-v3', WIRES); };
  const countAt = t => lab.wires.filter(w => w[0] === t || w[1] === t).length;
  function say(title, body = '', tone = '') {
    const m = $('msg'); m.className = 'msg ' + tone; m.innerHTML = `<h3>${title}</h3>${body}`; m.scrollTop = 0;
    if (quiet) return;
    // 盘面上冒一个小气泡，不用往下找提示
    const t = $('toast'); t.className = 'toast show ' + tone; t.innerHTML = `<b>${title}</b>${body ? '<span>详情见下方 ↓</span>' : ''}`;
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3600);
  }
  function showInfo(dev) { const i = PP.INFO[dev]; if (i) { $('info').innerHTML = `<h3>${i[0]}</h3>${i[1]}${has(dev) ? `<button class="b small" data-zoomdev="${dev}">放大到这个元件</button>` : ''}`; if (PP.glossify) PP.glossify($('info')); } }
  function changed() { marks = null; if (chk) { chk.checked = false; chk.metered = false; } }

  // ---------- 骨架 ----------
  function mount(root) {
    root.innerHTML = `
<div class="lab">
  <section class="goal" id="goal"></section>
  <div class="steps-row"><span class="tgl">操作步骤</span><ol class="steps" id="steps" aria-label="操作步骤"></ol></div>
  <div class="pair">
    <section class="card side" id="side">
      <div class="side-h"><div class="vt" id="vt" role="tablist"></div><span class="side-act"><button class="b small ghost" id="printbtn">打印任务卡</button><button class="b small ghost side-fold" id="fold" aria-expanded="true">收起图纸</button></span></div>
      <div class="side-body"><div id="view"></div><div class="info" id="info"></div></div>
    </section>
    <section class="card panelcard">
      <div class="ph"><h2>盘面</h2><span class="phint" id="phint"></span>
        <div class="zoom" role="group" aria-label="缩放盘面"><button class="b small ghost" id="zout" aria-label="缩小">−</button><span id="zval">100%</span><button class="b small ghost" id="zin" aria-label="放大">+</button></div>
        <span class="sw"><button class="b small ghost on" id="snd" aria-pressed="false">声音</button><button class="b small ghost on" id="tags" aria-pressed="false">线号管</button><button class="b small ghost on" id="route" aria-pressed="false">线槽走线</button></span></div>
      <div class="stage"><div class="svgwrap zoomwrap" id="zoomwrap"><svg id="panel" class="pn" viewBox="0 0 630 462"></svg></div><div class="toast" id="toast" role="status" aria-live="polite"></div></div>
      <div class="tools">
        <div class="tg"><span class="tgl">接线</span>
          <button class="b" id="hint">提示下一根</button>
          <button class="b" id="demo">看正确接法</button>
          <button class="b danger" id="del" hidden>删除选中的线</button>
          <button class="b ghost" id="reset" hidden>恢复故障现场</button>
          <button class="b ghost danger" id="clear">全部拆掉</button></div>
        <div class="tg"><span class="tgl">检查</span>
          <button class="b" id="check">检查接线</button>
          <button class="b on" id="meterbtn" aria-pressed="false">万用表</button></div>
        <div class="tg"><span class="tgl">试车</span>
          <button class="b primary power" id="power" aria-pressed="false">送电</button>
          <button class="b" id="rand">随机故障</button></div>
      </div>
      <div id="exambar"></div>
      <div id="demobar"></div>
      <div id="faultbox"></div>
      <div id="checklist"></div>
      <div class="meter" id="meter" hidden><div class="lcd" id="lcd">----</div><div class="mi" id="mi"></div></div>
      <section class="msg" id="msg"></section>
      <div class="ops" id="ops"></div>
      <div class="status" id="status"></div>
      <div class="test" id="test"></div>
    </section>
  </div>
  <div class="drawer" id="exdrawer" hidden><div class="drawer-in" role="dialog" aria-label="全部题目"><div class="drawer-h"><h2>全部题目</h2><button class="b small ghost" id="dclose">关闭</button></div><div class="exlist" id="exlist"></div></div></div>
</div>`;
    bind();
  }

  // ---------- 列表 ----------
  function renderList() {
    const cats = [...new Set(EX.map(e => e.cat))];
    const prog = c => { const a = EX.filter(e => e.cat === c); return `${a.filter(e => P.solo(e.id)).length}/${a.length}`; };
    $('exlist').innerHTML = cats.map(c => `<div class="grp">${c}<span>${prog(c)}</span></div>` + EX.map((e, j) => {
      if (e.cat !== c) return '';
      const b = P.best(e.id), sl = P.solo(e.id);
      return `<button data-i="${j}" aria-current="${j === cur}"><span class="n">${EX.filter(x => x.cat === c).indexOf(e) + 1}</span><span>${e.name}</span>${b ? `<span class="done best">${b.score}分</span>` : sl ? '<span class="done">✓</span>' : ''}</button>`;
    }).join('')).join('');
  }
  // 题目标题区：名称、上一题 / 下一题、学习阶段
  function stagesOf(e) { return e.preset ? [['solo', '找出故障并修好'], ['exam', '考核']] : PP.STAGES; }
  function drawGoal() {
    const e = ex(), L = P.learn(e.id), S = stagesOf(e), k = S.findIndex(([id]) => !L[id]);
    const open = id => id !== 'exam' || L.solo || (exam && !exam.done);
    const chip = ([id, t], i) => {
      const done = !!L[id], active = (id === 'follow' && follow) || (id === 'demo' && demo) || (id === 'exam' && exam && !exam.done);
      return `<li class="${done ? 'done' : ''}${i === k ? ' next' : ''}${active ? ' on' : ''}"><button data-stage="${id}"${open(id) ? '' : ' aria-disabled="true" title="先独立接对一次，才能考核"'}><span class="sn">${done ? '✓' : i + 1}</span>${t}${id === 'exam' && P.best(e.id) ? `<em>${P.best(e.id).score}分</em>` : ''}${!open(id) ? '<i class="lock" aria-hidden="true"></i>' : ''}</button></li>`;
    };
    $('goal').innerHTML = `<div class="goal-h"><div class="goal-t"><span class="goal-cat">${e.cat}</span><h2>${e.name}</h2></div>
      <div class="goal-nav"><button class="b small ghost" id="prevex"${cur ? '' : ' disabled'}>‹ 上一题</button><button class="b small" id="exbtn">全部题目</button><button class="b small ghost" id="nextex"${cur < EX.length - 1 ? '' : ' disabled'}>下一题 ›</button></div></div>
      ${e.preset ? `<p><span class="sym-tag">故障现象</span>${e.symptom}</p><p><b>任务：</b>${e.task}</p>` : `<p>${e.goal}</p>`}
      <div class="learn-row"><span class="tgl">学习阶段</span><ol class="learn" aria-label="学习阶段">${S.map(chip).join('')}</ol></div>`;
    if (PP.glossify) PP.glossify($('goal'));
  }

  // ---------- 左侧视图：原理图 / 接线表 / 端子表 / 梯形图 / 触点镜像 ----------
  let FR = null;
  function renderTabs() {
    const e = ex(), T = [['sch', '原理图'], ['q', '读图题'], ['wl', '接线表'], ['tb', '端子表'], ...(e.ladder ? [['lad', '梯形图 / I/O']] : []), ['xref', '交叉引用']];
    if (!T.some(t => t[0] === view)) view = 'sch';
    $('vt').innerHTML = T.map(([k, t]) => `<button role="tab" data-v="${k}" aria-selected="${k === view}">${t}</button>`).join('');
  }
  function renderView() {
    const e = ex(), v = $('view');
    if (view === 'sch') {
      v.innerHTML = `<div class="svgwrap"><svg id="sch" class="sch" viewBox="${FR.vb}">${FR.svg}</svg></div><p class="cap">点符号看说明，点线条看这个线号要连哪些端子；点盘上的线，图纸上对应的线会变橙色。送电后带电的线变色：火线 / +24V 红，零线 / 0V 蓝。触点下面的“/3”表示它的线圈画在第 3 区。</p>`;
      paintSchematic();
    } else if (view === 'q') {
      v.innerHTML = `<h3>读图题</h3><p class="cap">接线之前先把图看懂：这些题都是从本张原理图自动出的，答不上来就切回「原理图」找。</p><div id="rq"></div>`;
      const go = () => { const qs = readQs(e); let n = 0; PP.quizBox($('rq'), qs, { again: go, onAnswer: () => { if (++n === qs.length) { P.mark(e.id, 'q'); drawGoal(); } } }); };
      go();
    } else if (view === 'wl') {
      const c = PP.chain(e);
      v.innerHTML = `<h3>接线表</h3><p class="cap">电气接线图的表格形式：每根线从哪个端子接到哪个端子。按这个顺序接。标准要求一个端子只接一根线，端子允许时最多两根。</p><div class="tblwrap"><table><tr><th>#</th><th>线号</th><th>起点</th><th>终点</th></tr>${c.map((w, i) => `<tr><td class="mono">${i + 1}</td><td class="mono">${nlab(lab.nm[w[0]])}</td><td>${PP.tplain(w[0])}</td><td>${PP.tplain(w[1])}</td></tr>`).join('')}</table></div>`;
    } else if (view === 'tb') {
      const rows = [];
      const others = (t, n) => n ? n.terms.filter(x => x !== t).map(PP.tplain).join('、') : '—';
      if (has('X1')) for (const k of [1, 2, 3, 4]) {
        const nt = lab.nm[`X1.${k}t`], nb = lab.nm[`X1.${k}b`];
        if (nt || nb) rows.push(`<tr><td class="mono">X1:${k}</td><td class="mono">${nlab(nt || nb)}</td><td>${others(`X1.${k}t`, nt)}</td><td>${others(`X1.${k}b`, nb)}</td></tr>`);
      }
      for (const d of e.devs) if (DEV[d].kind === 'xt') for (const z of DEV[d].terms) { const n = lab.nm[d + '.' + z[0]]; if (n) rows.push(`<tr><td class="mono">XT:${z[1]}</td><td class="mono">${nlab(n)}</td><td>${others(d + '.' + z[0], n)}</td><td>上级电源进线</td></tr>`); }
      v.innerHTML = `<h3>端子排接线表</h3><p class="cap">端子排一行一节：柜内的线接上口，现场电缆接下口，两边线号一致。按功能分组：电源 → 输入 → 输出，每组留备用端子。</p>${rows.length ? `<div class="tblwrap"><table><tr><th>端子</th><th>线号</th><th>柜内侧（上口）</th><th>现场侧（下口）</th></tr>${rows.join('')}</table></div>` : '<p>本练习没有端子排。</p>'}`;
    } else if (view === 'lad') {
      v.innerHTML = `<h3>I/O 分配表</h3><div class="tblwrap"><table><tr><th>地址</th><th>元件</th><th>说明</th></tr>${e.io.map(r => `<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table></div><h3 style="margin-top:12px">梯形图<span class="cap" style="font-weight:400">　送电后绿色表示能流通过</span></h3><div class="ladwrap"><svg id="lad" class="lad"></svg></div><p class="cap">程序是固定的，你的任务是把线接对，让程序收到正确的信号。${e.prog === 'hmi' ? 'M10.0 由下面的「触摸屏」按钮控制。' : ''}</p>`;
      paintLadder();
    } else {
      v.innerHTML = `<h3>交叉引用（触点镜像）</h3><p class="cap">图框顶上的数字是“区号”。一个接触器的线圈和触点常常画在不同的区，这张表告诉你线圈在哪、它的触点分别在哪。</p>${FR.mirror.length ? `<div class="tblwrap"><table><tr><th>线圈</th><th>所在区</th><th>它的触点（所在区）</th></tr>${FR.mirror.map(m => `<tr><td><b>${DEV[m.dev] ? DEV[m.dev].lab : m.dev}</b></td><td class="mono">${m.zone}</td><td>${m.contacts.map(c => `<span class="mono">${c.t}</span> → 区 ${c.zone}`).join('；')}</td></tr>`).join('')}</table></div>` : '<p>这张图里没有“线圈和触点分开画”的元件。</p>'}`;
    }
  }
  // 读图题：按本张图自动出题（线号连哪些端子、触点类型、线圈在第几区、一共几根线）
  const CT = { '13-14': 0, '11-14': 0, '3-4': 0, 'BN-BU': 0, '21-22': 1, '95-96': 1, '1-2': 1, '67-68': 2, '55-56': 3 };
  const CTN = ['常开（平时断，动作后通）', '常闭（平时通，动作后断）', '延时闭合的常开', '延时断开的常闭'];
  function readQs(e) {
    const pick = PP.pick, qs = [], fmt = ts => ts.map(PP.tplain).join('、');
    const nets = e.nets.filter(n => n.terms.length >= 2);
    for (const n of pick(nets, Math.min(3, nets.length))) {
      const o = pick(nets.filter(x => x !== n), 2);
      const alt = n.terms.slice(); if (o[0]) alt[alt.length - 1] = o[0].terms[o[0].terms.length - 1];
      const opts = pick([...new Set([fmt(n.terms), fmt(alt), ...(o[1] ? [fmt(o[1].terms)] : [])])], 3);
      qs.push(['', `线号 <span class="mono">${nlab(n)}</span> 要把哪几个端子连在一起？`, opts, opts.indexOf(fmt(n.terms)), `图上标着 ${nlab(n)} 的那一段线，碰到的端子都要连通：${fmt(n.terms)}。`]);
    }
    const cs = (FR.contacts || []).filter(c => CT[c.t] !== undefined);
    for (const c of pick(cs, Math.min(2, cs.length))) {
      const k = CT[c.t], opts = k >= 2 ? [CTN[0], CTN[1], CTN[k]] : [CTN[0], CTN[1], CTN[2]];
      qs.push(['', `图上 <b>${DEV[c.dev] ? DEV[c.dev].lab : c.dev}</b> 的 <span class="mono">${c.t}</span>（第 ${c.zone} 区）是什么触点？`, opts, opts.indexOf(CTN[k]), k === 0 ? '端子号尾数 3–4 是常开（13–14、43–44）。图上开关片“离开”触点，平时是断的。' : k === 1 ? '端子号尾数 1–2 是常闭（21–22、95–96）。图上开关片“搭着”触点，平时是通的。' : k === 2 ? '时间继电器 67–68 是延时闭合的常开：线圈得电后等设定时间才闭合。' : '时间继电器 55–56 是延时断开的常闭：线圈得电后等设定时间才断开。']);
    }
    const m = FR.mirror.length ? pick(FR.mirror, 1)[0] : null;
    if (m) {
      const zs = [...new Set([m.zone, m.zone + 1, Math.max(1, m.zone - 1), m.zone + 2])].slice(0, 3), opts = zs.map(z => `第 ${z} 区`);
      qs.push(['', `<b>${DEV[m.dev] ? DEV[m.dev].lab : m.dev}</b> 的线圈画在第几区？`, opts, 0, `看触点下面写的“/${m.zone}”，或者「交叉引用」表：线圈在第 ${m.zone} 区。`]);
    }
    const n = PP.chain(e).length, wo = [...new Set([n, n + 2, Math.max(1, n - 2)])];
    qs.push(['', '照这张图，一共要接几根线？', wo.map(x => `${x} 根`), 0, `每个线号连着 k 个端子，就要 k − 1 根线。全部线号加起来是 ${n} 根。`]);
    return qs.map(q => { const o = pick(q[2], q[2].length), ans = q[2][q[3]]; return [q[0], q[1], o, o.indexOf(ans), q[4]]; });
  }
  function paintLadder() {
    const s = $('lad'); if (!s) return;
    const e = ex(), d = plcId(), on = lastSim.on || {};
    const bits = { 'M10.0': !!lab.st.hmi };
    ['I0.0', 'I0.1', 'I0.2', 'Q0.0', 'Q0.1'].forEach(k => (bits[k] = !!on[d + ':' + k]));
    const L = PP.ladderSVG(e.ladder, lastSim.power ? bits : {}, e.bitNames || {});
    s.setAttribute('viewBox', L.vb); s.style.maxWidth = L.w * 1.25 + 'px'; s.innerHTML = L.svg;
  }
  function paintSchematic() {
    const svg = $('sch'); if (!svg) return;
    const miss = new Set(marks ? marks.missing.map(m => m.n.id) : []);
    svg.querySelectorAll('[data-net]').forEach(el => {
      const n = lab.nm && ex().nets.find(z => z.id === el.dataset.net), lv = n ? lastSim.live(n.terms[0]) : null;
      if (lv) el.setAttribute('data-live', lv); else el.removeAttribute('data-live');
      const isW = el.classList.contains('w');
      el.classList.toggle('hl', isW && hl.net === el.dataset.net);
      el.classList.toggle('miss', isW && miss.has(el.dataset.net));
    });
    svg.querySelectorAll('[data-net-lab]').forEach(el => el.classList.toggle('hl', hl.net === el.dataset.netLab));
    svg.querySelectorAll('.sym').forEach(el => el.classList.toggle('hl', hl.dev !== null && el.dataset.dev === hl.dev));
  }

  // ---------- 盘面 ----------
  function drawDev(d) {
    const v = DEV[d], { x, y, w, h } = v, r = lastSim, on = r.on || {}, st = lab.st;
    const o = !!on[d], kt = { o, p: o && st.ktStart != null ? Math.min(1, (lab.now() - st.ktStart) / PP.KT_MS) : 0 };
    let s = `<g class="dev${hl.dev === d ? ' hl' : ''}" data-dev="${d}">` + PP.R.dev(v, d, { p: 'pn-', on, st, r, nm: (ex().names || {})[d] || v.name, kt });
    s += PP.R.tlabs(v);
    return s + `<rect class="body" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/></g>`;
  }
  function wireColor(a, b) {
    const n = lab.nm[a] || lab.nm[b];
    if (n && n.ph) return `var(--p${n.ph})`;
    return n && n.col ? { p: 'var(--dcp)', n: 'var(--dcn)', bn: 'var(--bn)', bu: 'var(--dcn)', bk: 'var(--bk)', rd: '#d32f2f', gn: '#2b8a3e', wh: '#e8e8e2', pe: '#5aa83a' }[n.col] : 'var(--wire)';
  }
  // 线槽走线：竖直进最近的线槽，水平走，再竖直下到端子
  const chan = p => (p.side === 't' ? (p.y <= 60 ? 22 : p.y <= 220 ? 181 : 314) : (p.y <= 180 ? 181 : 314));
  function routePts(a, b, i) {
    const pa = PP.termPos(a), pb = PP.termPos(b);
    if (PREF.route !== 'duct') return null;
    const o = ((i % 7) - 3) * 2.2, ya = chan(pa) + o, yb = chan(pb) + o;
    if (Math.abs(ya - yb) < 0.1) return [[pa.x, pa.y], [pa.x, ya], [pb.x, ya], [pb.x, pb.y]];
    const vx = (pa.x + pb.x) / 2 < 315 ? 12 + o * 0.6 : 618 + o * 0.6;
    return [[pa.x, pa.y], [pa.x, ya], [vx, ya], [vx, yb], [pb.x, yb], [pb.x, pb.y]];
  }
  function wirePath(a, b, i) {
    const pts = routePts(a, b, i);
    if (pts) return 'M' + pts.map(p => p.join(' ')).join('L');
    const pa = PP.termPos(a), pb = PP.termPos(b), o = 52, da = pa.side === 't' ? -1 : 1, db = pb.side === 't' ? -1 : 1;
    return `M${pa.x} ${pa.y}C${pa.x} ${pa.y + da * o} ${pb.x} ${pb.y + db * o} ${pb.x} ${pb.y}`;
  }
  function drawPanel() {
    const e = ex(), duct = PREF.route === 'duct';
    let s = PP.R.defs('pn-') + `<rect class="plate" x="6" y="6" width="618" height="304" rx="6"/><rect class="door" x="6" y="320" width="618" height="136" rx="6"/><text class="area" x="18" y="340">${e.field}</text>`;
    const din = yy => `<rect x="14" y="${yy}" width="602" height="12" rx="1" fill="url(#pn-gr)" stroke="#8d938e" stroke-width=".8"/>` + Array.from({ length: 24 }, (_, i) => `<rect x="${22 + i * 25}" y="${yy + 4}" width="13" height="4" rx="2" fill="#7f8680"/>`).join('');
    if (!duct) s += `<text class="area" x="300" y="24">安装板（柜内）</text>`;
    s += din(92);
    // 第二根导轨：没元件时也画出来（备用导轨），盘面不空；右下角空着就画一条 PE 接地排，和现场一样
    const row2 = e.devs.some(d => DEV[d].y >= 180 && DEV[d].y < 310);
    s += din(244) + (row2 ? '' : `<text class="area" x="22" y="236">备用导轨</text>`);
    const hit = (x, y, w, h) => e.devs.some(d => { const v = DEV[d]; return v.x < x + w && v.x + v.w > x && v.y < y + h && v.y + v.h + 20 > y; });
    if (!hit(468, 276, 146, 30)) s += `<g class="pebar" pointer-events="none"><rect x="470" y="284" width="8" height="18" fill="#2b8a3e"/><rect x="604" y="284" width="8" height="18" fill="#2b8a3e"/><rect x="476" y="288" width="130" height="10" fill="url(#pn-gn)" stroke="#8a6a1c" stroke-width=".8"/>${Array.from({ length: 15 }, (_, i) => `<circle cx="${483 + i * 8.3}" cy="293" r="2.2" fill="#d9dcd6" stroke="#666" stroke-width=".8"/>`).join('')}<text class="area" x="476" y="280">PE 接地排</text></g>`;
    if (duct) s += `<g class="ducts"><rect x="10" y="14" width="610" height="16" fill="url(#pn-duct)"/><rect x="10" y="174" width="610" height="14" fill="url(#pn-duct)"/><rect x="10" y="307" width="610" height="14" fill="url(#pn-duct)"/><rect x="6" y="14" width="12" height="307" fill="url(#pn-ductv)"/><rect x="612" y="14" width="12" height="307" fill="url(#pn-ductv)"/></g>`;
    const src = DEV[e.devs[0]];
    if (!duct) {
      if (src.kind === 'xt') src.terms.forEach(z => (s += `<line class="feed" x1="${src.x + z[2]}" y1="${src.y}" x2="${src.x + z[2]}" y2="8"/>`));
      else [30, 56, 82].forEach(dx => (s += `<line class="feed" x1="${src.x + dx}" y1="${src.y}" x2="${src.x + dx}" y2="8"/>`));
      s += `<text class="dn" x="${src.x + src.w + 6}" y="30">← ${src.kind === 'ps' ? 'AC220V 输入' : '来自上级电源'}</text>`;
    }
    e.devs.forEach(d => (s += drawDev(d)));
    const flow = lab.flow(lastSim), instant = learning();
    lab.wires.forEach((w, i) => {
      const dir = flow.get(w), d = wirePath(w[0], w[1], i);
      const cls = ['wire', selWire === i && 'sel', hl.wires.has(i) && 'hlw'].filter(Boolean).join(' ');
      s += `<g class="${cls}" data-w="${i}"><path class="hitw" d="${d}"/><path class="edge" d="${d}"/><path class="core" d="${d}" style="stroke:${wireColor(w[0], w[1])}"/>${(marks && marks.wrong.has(i)) || (instant && lab.whyWrong(w[0], w[1])) ? `<path class="badm" d="${d}"/>` : ''}${dir ? `<path class="flow" d="${wirePath(dir[0], dir[1], i)}"/>` : ''}</g>`;
    });
    if (PREF.tags) {
      const tag = new Map();
      lab.wires.forEach(w => { const a = lab.nm[w[0]], b = lab.nm[w[1]], l = a && a === b ? nlab(a) : '?'; w.forEach(t => { if (!tag.has(t) || l === '?') tag.set(t, l); }); });
      tag.forEach((l, t) => { const p = PP.termPos(t), y = p.y + (p.side === 't' ? -17 : 17), w = l.length * 5.6 + 7; s += `<g class="sleeve${l === '?' ? ' bad' : ''}"><rect x="${p.x - w / 2}" y="${y - 6}" width="${w}" height="12" rx="2"/><text x="${p.x}" y="${y + 3.4}">${l}</text></g>`; });
    }
    const missT = new Set(); if (marks) marks.missing.forEach(m => m.n.terms.forEach(t => missT.add(t)));
    lab.terms.forEach(t => {
      const p = PP.termPos(t), lv = lastSim.live(t);
      const c = ['term', sel === t && 'sel', hl.terms.has(t) && 'hl', missT.has(t) && !hl.terms.has(t) && 'miss', meterOn && mA === t && 'pr', meterOn && mB === t && 'pb'].filter(Boolean).join(' ');
      s += `<g class="${c}" data-t="${t}"${lv ? ` data-live="${lv}"` : ''}><circle class="hitc" cx="${p.x}" cy="${p.y}" r="14"/><circle class="halo" cx="${p.x}" cy="${p.y}" r="13"/><circle class="ring" cx="${p.x}" cy="${p.y}" r="10.5"/><circle class="screw" cx="${p.x}" cy="${p.y}" r="7" fill="url(#pn-sc)"/><path class="x" d="M${p.x - 4} ${p.y}h8M${p.x} ${p.y - 4}v8"/></g>`;
    });
    $('panel').innerHTML = s;
  }

  // ---------- 状态条 ----------
  function drawStatus() {
    const r = lastSim, on = r.on || {}, e = ex(), st = lab.st, C = (t, c = '') => `<span class="chip ${c}">${t}</span>`;
    let s = C(`电源 <b>${st.power ? '已送电' : '已断电'}</b>`, st.power ? 'hot' : '');
    for (const d of e.devs) {
      const v = DEV[d];
      if (['km', 'kmx', 'kmc', 'ka'].includes(v.kind)) s += C(`${v.lab} <b>${on[d] ? '吸合' : '释放'}</b>`, on[d] ? 'on' : '');
      if (v.kind === 'kt') s += C(`KT <b>${!on[d] ? '未通电' : r.ktDone ? '延时到' : '计时中'}</b>`, on[d] ? 'on' : '');
      if ((v.kind === 'fr' || v.kind === 'frc') && lab.nm[d + '.95']) s += C(`FR <b>${st.trip ? '过载跳开' : '正常'}</b>`, st.trip ? 'hot' : '');
      if (v.kind === 'plc' || v.kind === 'plcr') {
        s += C(`PLC <b>${on[d + ':run'] ? 'RUN' : on[d + ':pw'] ? 'STOP' : '没电'}</b>`, on[d + ':run'] ? 'on' : on[d + ':pw'] ? 'hot' : '');
        for (const k of ['I0.0', 'I0.1', 'I0.2', 'Q0.0', 'Q0.1']) if (lab.nm[d + '.' + k]) s += C(`${k} <b>${on[d + ':' + k] ? '亮' : '灭'}</b>`, on[d + ':' + k] ? 'on' : '');
      }
      if (v.kind === 'sensor') s += C(`传感器 <b>${on[d + ':rev'] ? '电源接反' : !st.power ? '—' : !on[d + ':pw'] ? '没电' : on[d] ? '检测到' : '待机'}</b>`, on[d + ':rev'] ? 'hot' : on[d] ? 'on' : '');
      if (v.kind === 'sensor2' || v.kind === 'reed') s += C(`${v.kind === 'reed' ? 'B1 磁性开关' : '传感器'} <b>${on[d] ? '动作' : '未动作'}</b>`, on[d] ? 'on' : '');
      if (v.kind === 'valve') s += C(`电磁阀 <b>${on[d + ':rev'] ? '接反' : on[d] ? '得电' : '失电'}</b>`, on[d + ':rev'] ? 'hot' : on[d] ? 'on' : '');
      if (v.kind === 'lamp') s += C(`${v.lab} <b>${on[d] ? '亮' : on[d + ':burn'] ? '烧了' : '灭'}</b>`, on[d] ? 'on' : on[d + ':burn'] ? 'hot' : '');
      if (v.kind === 'estop' || v.kind === 'estop2') s += C(`急停 <b>${st.estop ? '已拍下' : '正常'}</b>`, st.estop ? 'hot' : '');
      if (v.kind === 'sr') s += C(`安全继电器 <b>${!on[d + ':pw'] ? '没电' : on[d] ? '输出接通' : on[d + ':c1'] && on[d + ':c2'] ? '等复位' : '通道断开'}</b>`, on[d] ? 'on' : on[d + ':pw'] && !(on[d + ':c1'] && on[d + ':c2']) ? 'hot' : '');
      if (v.kind === 'svd') s += C(`伺服 <b>${!on[d + ':cpw'] ? '没电' : on[d + ':alm'] ? '报警' : on[d] ? '运转' : on[d + ':rdy'] ? '准备好' : '未就绪'}</b>`, on[d] ? 'on' : on[d + ':alm'] ? 'hot' : '');
      if (v.kind === 'lc') s += C(`光栅 <b>${!on[d + ':pw'] ? '没电' : on[d] ? '通（OSSD 有输出）' : '被挡住'}</b>`, on[d] ? 'on' : on[d + ':pw'] ? 'hot' : '');
      if (v.kind === 'vi') s += C(`1 号阀 <b>${on[d + ':1'] ? '得电' : '失电'}</b>`, on[d + ':1'] ? 'on' : '') + C(`2 号阀 <b>${on[d + ':2'] ? '得电' : '失电'}</b>`, on[d + ':2'] ? 'on' : '');
      if (v.kind === 'aim') s += C(`AI 读数 <b>${r.power ? (on[d + ':ma'] || 0).toFixed(1) + ' mA' : '—'}</b>`, on[d] ? 'on' : r.power ? 'hot' : '');
      if (v.kind === 'drv') { const run = on[d + ':run']; s += C(`驱动器 <b>${!on[d + ':pw'] ? '没电' : run === 'fwd' ? '正转' : run === 'rev' ? '反转' : run === 'shake' ? '抖动' : '待机'}</b>`, run === 'fwd' || run === 'rev' ? 'on' : run === 'shake' ? 'hot' : ''); }
      if (v.kind === 'motor') s += C(`电机 <b>${{ stop: '停止', fwd: '正转', rev: '反转', loss: '缺相' }[r.motor || 'stop']}</b>`, r.motor === 'fwd' || r.motor === 'rev' ? 'on' : r.motor === 'loss' ? 'hot' : '');
    }
    if (e.motorText) { const t = r.power ? e.motorText(r) : ''; s += C(`电机 <b>${t || '停止'}</b>`, t ? 'on' : ''); }
    if (e.prog === 'hmi') s += C(`触摸屏 <b>${st.hmi ? '启动' : '停止'}</b>`, st.hmi ? 'on' : '');
    s += C(`已接 <b>${lab.wires.length}</b> / ${total} 根线`);
    if (lab.fault) s += C('<b>故障模式</b>', 'hot');
    $('status').innerHTML = s;
    $('phint').textContent = st.power ? '带电中：用下面的按钮试车，不能接线' : meterOn ? '万用表：点一个端子放红表笔，再点一个放黑表笔' : demo ? '演示中：点「下一根」一根根看' : sel ? '已选中一个端子，再点另一个端子' : follow ? '跟着接：照闪的两个端子接' : '点一个端子，再点另一个端子，就接上一根线；双击元件放大';
    $('zval').textContent = Math.round(zoom * 100) + '%';
    $('power').textContent = st.power ? '断电' : '送电'; $('power').setAttribute('aria-pressed', st.power);
    $('del').hidden = selWire === null; $('reset').hidden = !e.preset;
    $('rand').hidden = !!e.preset;
    $('route').setAttribute('aria-pressed', PREF.route === 'duct'); $('tags').setAttribute('aria-pressed', !!PREF.tags); $('snd').setAttribute('aria-pressed', !!(PP.sound && PP.sound.on()));
    const lock = !!(exam && !exam.done); $('hint').disabled = lock; $('demo').disabled = lock; $('rand').disabled = lock;
    document.querySelectorAll('#ops [data-btn]').forEach(b => b.setAttribute('aria-pressed', !!st.p[b.dataset.btn]));
    const tg = (id, k, a, b) => { const el = $(id); if (el) { el.textContent = st[k] ? a : b; el.setAttribute('aria-pressed', !!st[k]); } };
    tg('tripbtn', 'trip', '按复位（FR）', '模拟电机过载'); const TLb = ex().targetLabels || ['拿走工件', '放工件（挡住传感器）']; tg('targetbtn', 'target', TLb[0], TLb[1]);
    tg('hmibtn', 'hmi', '触摸屏：停止', '触摸屏：启动'); tg('estopbtn', 'estop', '旋转复位急停', '拍下急停');
  }

  // ---------- 万用表 ----------
  function drawMeter() {
    $('meter').hidden = !meterOn; $('meterbtn').setAttribute('aria-pressed', meterOn);
    if (!meterOn) return;
    const st = lab.st, mode = !st.power ? '蜂鸣 / 电阻档（断电量通断）' : '电压档（带电量电压）';
    const res = mA && mB ? lab.meter(mA, mB, lastSim) : null;
    $('lcd').textContent = res ? res.v : '----';
    $('mi').innerHTML = `<div>${mode}</div><div><span class="probe-r">红表笔</span> ${mA ? tname(mA) : '点一个端子'} · <span class="probe-b">黑表笔</span> ${mB ? tname(mB) : mA ? '再点一个端子' : '—'}</div>${res ? `<div>${res.n}</div>` : ''}`;
    // 送电前检查：量过电源两端
    if (res && !st.power) {
      chk = chk || { checked: false, metered: false, tight: false, safe: false };
      const sa = ex().sources[mA], sb = ex().sources[mB];
      if (sa && sb && sa !== sb && res.v !== '0.0 Ω') chk.metered = true;
    }
  }

  // ---------- 进度条：现在该做哪一步 ----------
  const passed = () => ts.done && ts.res.length === ex().test.length && ts.res.every(Boolean);
  function drawSteps() {
    const el = $('steps'), e = ex();
    if (faultMode) { el.hidden = true; return; }
    el.hidden = false;
    const c = lab.check(), good = c.rows.filter(x => !x.bad && !x.left).length;
    const S = e.preset
      ? [['power', '送电看现象', seen, '按试车步骤操作，看哪一步不对'],
        ['check', '找出错线改好', c.ok, c.ok ? '接线已和图纸一致' : '对照图纸校线、用万用表量'],
        ['power', '试车通过', passed(), '断电改好后重新送电']]
      : [['hint', '接线', c.ok, `${good} / ${c.rows.length} 个线号已接通`],
        ['check', '校线', !!(chk && chk.checked), '点「检查接线」核对'],
        ['meter', '量电源', !!(chk && chk.metered), '万用表量电源两端不短路'],
        ['power', '送电试车', passed(), '按试车步骤逐步操作']];
    const k = S.findIndex(x => !x[2]);
    el.innerHTML = S.map(([a, t, d, sub], i) => `<li class="${d ? 'done' : i === k ? 'cur' : ''}"><button data-step="${a}"><span class="no">${d ? '✓' : i + 1}</span><span><b>${t}</b><small>${sub}</small></span></button></li>`).join('');
  }

  // ---------- 考核模式：不看提示和演示，自己看图接完、试车通过，按用时和返工次数打分 ----------
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function drawExam() {
    const b = $('exambar');
    if (!exam) { b.innerHTML = ''; return; }
    const t = ((exam.done ? exam.end : Date.now()) - exam.t0) / 1000, best = BEST[ex().id];
    b.innerHTML = `<div class="bar exam"><span class="t"><b>${exam.done ? '考核完成' : '考核中'}</b>　用时 <b class="mono">${mmss(t)}</b> · 校线 ${exam.checks} 次 · 查出错线 ${exam.wrong.size} 根 · 试车失败 ${exam.fails} 次 · 短路 ${exam.shorts} 次${exam.done ? ` · 得分 <b class="score">${exam.score}</b>` : ''}${best ? `　<span class="cap">最好 ${best.score} 分 / ${mmss(best.t)}</span>` : ''}</span><button class="b small ghost" id="examexit">${exam.done ? '关闭' : '退出考核'}</button></div>`;
  }
  function startExam() {
    if (!offOnly()) return;
    demo = null; drawDemo(); faultMode = null; lab.fault = null; drawFault(); meterOn = false; mA = mB = null;
    lab.wires = ex().preset ? ex().preset.map(w => [...w]) : []; sel = null; selWire = null; clearHl(); changed(); chk = null; seen = false;
    ts = { i: 0, res: [], done: false };
    exam = { t0: Date.now(), checks: 0, wrong: new Set(), shorts: 0, fails: 0, done: false };
    clearInterval(examTimer); examTimer = setInterval(drawExam, 1000);
    say('考核开始', `<p>${ex().preset ? '线已经恢复成故障现场。' : '盘上的线已经清空。'}只看图纸，自己接完 → 校线 → 量电源 → 送电试车，全部通过就交卷。</p><p>考核时「提示下一根」「看正确接法」不能用，点图上的线号也不会在盘上标端子。<b>扣分</b>：多校线一次 −5，每根查出来的错线 −10，第一次试车不成功 −3、以后每次 −5，短路一次 −20。</p>`, 'hint');
    drawExam(); drawGoal(); render();
  }
  function stopExam() { exam = null; clearInterval(examTimer); drawExam(); drawGoal(); render(); }
  function finishExam() {
    exam.done = true; exam.end = Date.now(); clearInterval(examTimer);
    const t = (exam.end - exam.t0) / 1000, failPen = exam.fails ? 3 + (exam.fails - 1) * 5 : 0, sc = Math.max(0, 100 - Math.max(0, exam.checks - 1) * 5 - exam.wrong.size * 10 - exam.shorts * 20 - failPen);
    exam.score = sc;
    const id = ex().id, old = BEST[id], better = !old || sc > old.score || (sc === old.score && t < old.t);
    if (better) { BEST[id] = { score: sc, t: Math.round(t) }; store.set('pp-best-v1', BEST); }
    P.mark(id, 'exam', Math.max(sc, (P.learn(id).exam || 0))); P.mark(id, 'solo'); DONE[id] = true; store.set('pp-done-v3', DONE); renderList(); drawGoal();
    const lv = sc >= 90 ? '优秀：可以上岗独立接这种回路了' : sc >= 70 ? '合格：再练几遍，争取一次接对' : '还要多练：先用「读图题」把图看懂再接';
    say(`考核完成：${sc} 分`, `<p>用时 <b>${mmss(t)}</b>，校线 ${exam.checks} 次，查出错线 ${exam.wrong.size} 根，试车失败 ${exam.fails} 次，短路 ${exam.shorts} 次。</p><p><b>${lv}</b>${better && old ? '　（刷新了最好成绩！）' : ''}</p>`, sc >= 70 ? 'good' : 'hint');
    drawExam();
  }

  // ---------- 试车步骤 ----------
  function drawTest() {
    const T = ex().test, n = ts.res.filter(x => x === true).length;
    const head = ts.done && ts.res.length === T.length && ts.res.every(Boolean) ? '全部通过' : ts.res.includes(false) ? '有一步没通过' : lab.st.power ? `进行中 ${n}/${T.length}` : '送电后自动开始';
    $('test').innerHTML = `<h3>试车步骤<span>${head}</span></h3><ol>${T.map((s, i) => {
      const r = ts.res[i], c = r === true ? 'pass' : r === false ? 'fail' : (!ts.done && lab.st.power && i === ts.i) || (!lab.st.power && i === 0 && !ts.res.length) ? 'cur' : '';
      return `<li class="${c}"><div><b>${s.act}</b> <span class="exp">→ 应该：${s.exp}</span></div><span class="res">${r === true ? '通过' : r === false ? '不对' : c === 'cur' ? '下一步' : '待测'}</span></li>`;
    }).join('')}</ol>`;
  }
  function evalStep() {
    const T = ex().test, s = T[ts.i], r = lastSim;
    if (r.wasShort) { ts.res[ts.i] = false; ts.done = true; return; }
    const ok = !!s.ok(r); ts.res[ts.i] = ok; ts.i++;
    if (!ok && exam && !exam.done) { exam.fails++; drawExam(); }
    if (!ok) { ts.done = true; say(`第 ${ts.i} 步不对：${s.act} 后应该「${s.exp}」`, `<p>${s.fail(r) || '对照图纸再检查一遍接线。'}</p><p>断电改好后重新送电，会从第 1 步重新试车。</p>`, 'bad'); }
    else if (ts.i >= T.length) {
      ts.done = true;
      if (lab.fault) say('试车居然全过了', '<p>这个故障在当前接线下没表现出来，点「随机故障」换一个。</p>', 'hint');
      else if (exam && !exam.done) finishExam();
      else {
        const id = ex().id, wasFollow = follow;
        if (follow) { P.mark(id, 'follow'); follow = false; }
        const solo = !assist && !wasFollow;
        if (solo) { P.mark(id, 'solo'); DONE[id] = true; store.set('pp-done-v3', DONE); }
        renderList(); drawGoal();
        const nextStep = solo ? (ex().preset ? '故障排除了！可以点「考核」计时再做一遍。' : '你是自己接对的，「考核」已经解锁。') : wasFollow ? '跟着接完成了。下一步点「独立接」，不看提示自己接一遍。' : '这次用了提示或演示，点「独立接」自己再接一遍才算学会。';
        say('试车全部通过 ✓', `<p>${s.note ? s.note + ' ' : ''}每一步动作都符合图纸要求。</p><p><b>${nextStep}</b></p>`, 'good');
      }
    } else say(`第 ${ts.i} 步通过`, `<p>${s.note ? s.note + ' ' : ''}下一步：<b>${T[ts.i].act}</b>，应该「${T[ts.i].exp}」。</p>`, 'good');
  }
  function fire(ev) {
    if (!lab.st.power && ev !== 'power_on') return;
    const T = ex().test, s = T[ts.i];
    if (ts.done || !s || s.ev !== ev) return;
    evalStep();
    while (!ts.done && T[ts.i] && T[ts.i].ev === 'kt_done' && lastSim.ktDone) evalStep();
    drawTest(); drawSteps();
  }

  // ---------- 主渲染 ----------
  function shortMsg(r) {
    const e = ex();
    if (r.why === 'excl') return e.id === 'yd' ? 'KM2（星形）和 KM3（三角形）同时吸合，主回路被短路！' : '两个接触器同时吸合，主回路相间短路！互锁没接好。';
    if (r.why === 'diode') return '续流二极管接反了：输出一导通，电流直接从二极管流走，等于把 Q0.0 短路。阴极 K（有色环）要接 +。';
    if (r.why === 'valve') return '电磁阀正负接反了，插头里的二极管导通，把输出短路了。+ 接 Q0.0，- 接 0V。';
    const mix = [...r.at.values()].find(x => x.size > 1), arr = mix ? [...mix] : [];
    if (arr.some(x => ['L', 'N'].includes(x)) && arr.some(x => ['+24', '0V'].includes(x))) return '<b>220V 窜进了 24V 回路</b>（强电接到了弱电上）！真实情况下 PLC、开关电源、传感器会一起烧掉。';
    if (arr.includes('+24')) return '+24V 和 0V 被直接连在了一起，开关电源过流保护停机。';
    if (arr.some(x => /^L\d/.test(x))) return '有两相被直接连在一起了（相间短路）。';
    return '火线 L 和零线 N 被直接连通了，中间没有经过负载。';
  }
  function render() {
    let r = lab.sim();
    if (r.power && r.short) {
      lab.applyEv('power_off');
      say('短路！已跳闸断电', `<p>${shortMsg(r)}</p><p>真实情况下熔断器会烧、断路器会跳，还可能打出电弧伤人。断电状态下点「检查接线」或用万用表蜂鸣档找出错线。</p>`, 'bad');
      r = lab.sim(); r.wasShort = true; if (exam && !exam.done) { exam.shorts++; drawExam(); }
    }
    lab.ktTick(r);
    if (PP.sound && r.power && lastSim.power && !r.wasShort) { const ch = e => ['km', 'kmx', 'kmc', 'ka', 'kt'].includes(DEV[e].kind) && !!r.on[e] !== !!(lastSim.on || {})[e]; const d = ex().devs.find(ch); if (d) PP.sound.click(!!r.on[d]); }
    lastSim = r;
    if (lab.st.ktStart == null) lab.st.ktFired = false;
    drawPanel(); if (view === 'sch') paintSchematic(); if (view === 'lad') paintLadder();
    drawStatus(); drawMeter(); drawTest(); drawSteps(); save();
    clearTimeout(ktTimer);
    if (lab.st.power && lab.st.ktStart != null) {
      if (!r.ktDone) ktTimer = setTimeout(render, 200);
      else if (!lab.st.ktFired) { lab.st.ktFired = true; ktTimer = setTimeout(() => fire('kt_done'), 0); }
    }
    return r;
  }
  function doEv(ev) { lab.applyEv(ev); if (ev === 'power_on') lab.st.ktFired = false; const r = render(); if (r.wasShort && ev === 'power_on') { ts.res[0] = false; ts.done = true; drawTest(); return; } fire(ev); }

  // ---------- 操作 ----------
  function onTerm(t) {
    if (meterOn) {
      if (!mA || mB) { mA = t; mB = null; } else if (t !== mA) mB = t;
      render();
      if (mA && mB) {
        const m = lab.meter(mA, mB, lastSim);
        if (m.v === '0.0 Ω' && PP.sound) PP.sound.beep();
        if (faultMode) { faultMode.log.push([tname(mA), tname(mB), m.v, lab.st.power ? '带电' : '断电']); drawFault(); }
      }
      return;
    }
    if (lab.st.power) { say('先断电再接线', '<p>带电接线非常危险。点「断电」后再动手。想带电量电压，先点「万用表」。</p>', 'bad'); return; }
    if (demo) { say('正在演示', '<p>先点「退出演示」再自己接线。</p>'); return; }
    selWire = null;
    if (!sel) { sel = t; clearHl(); say(`选中了 ${tname(t)}`, '<p>再点另一个端子就接上一根线。再点一次这个端子取消。</p>'); render(); return; }
    if (sel === t) { sel = null; render(); return; }
    const a = sel, b = t; sel = null;
    if (lab.wires.some(w => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a))) { say('这两个端子已经接过了'); render(); return; }
    for (const x of [a, b]) if (countAt(x) >= 2) { say('这个端子已经压了两根线', `<p>${tname(x)} 上已经有两根线。标准要求一个端子只接一根，端子允许时最多两根；再多就换到同一线号的另一个端子上接。</p>`, 'bad'); render(); return; }
    lab.wires.push([a, b]); clearHl(); changed();
    const c = lab.check(), why = learning() ? lab.whyWrong(a, b) : '';
    if (why) { say('这根线和图纸不一致', `<p>${tname(a)} ↔ ${tname(b)}：${why}</p><p>点这根线，再点「删除选中的线」拆掉。</p>`, 'bad'); render(); return; }
    if (follow && !c.ok) { giveHint(); return; }
    if (exam && !exam.done) say(`接上了：${tname(a)} ↔ ${tname(b)}`, `<p>已接 ${lab.wires.length} 根。考核中不提示对错，接完自己校线。</p>`);
    else if (c.ok) say('全部接对了！', '<p>按规矩送电前要检查：点「检查接线」校线，再用「万用表」量一下电源两端有没有短路，然后送电试车。</p>', 'good');
    else say(`接上了：${tname(a)} ↔ ${tname(b)}`, `<p>还没接完的线号：${c.missing.map(m => `<span class="mono">${nlab(m.n)}</span>`).join('、') || '无'}。</p>`);
    render();
  }
  function selectWire(i) {
    selWire = selWire === i ? null : i; sel = null; clearHl();
    if (selWire !== null) {
      const w = lab.wires[i], na = lab.nm[w[0]], nb = lab.nm[w[1]], why = exam && !exam.done ? '' : lab.whyWrong(w[0], w[1]);
      hl.terms.add(w[0]); hl.terms.add(w[1]); hl.wires.add(i);
      if (na && na === nb) { hl.net = na.id; if (view !== 'sch') { view = 'sch'; renderTabs(); renderView(); } }
      say(na && na === nb ? `这根线是线号 ${nlab(na)}` : '选中了一根线', `<p>${tname(w[0])} ↔ ${tname(w[1])}。${na && na === nb ? '图纸上对应的线已经标成橙色。' : ''}</p>${why ? `<p>这根线有问题：${why}</p>` : ''}<p>断电状态下点「删除选中的线」可以拆掉它。</p>`, why ? 'hint' : '');
    }
    render();
  }
  function selectNet(id) {
    const n = ex().nets.find(z => z.id === id); if (!n) return;
    clearHl(); hl.net = id;
    if (exam && !exam.done) { say(`线号 ${nlab(n)}`, '<p>考核中：自己顺着图上这段线看它碰到了哪些端子，再到盘上去接。</p>', 'hint'); render(); return; } n.terms.forEach(t => hl.terms.add(t));
    lab.wires.forEach((w, i) => { if (lab.nm[w[0]] === n && lab.nm[w[1]] === n) hl.wires.add(i); });
    say(`线号 ${nlab(n)}`, `<p>图上这段线连着 ${n.terms.length} 个端子，在盘上把它们连到一起：</p><ul>${n.terms.map(t => `<li>${tname(t)}</li>`).join('')}</ul><p>盘上对应的端子在闪${hl.wires.size ? `，已经接好的 ${hl.wires.size} 根线标成了橙色` : ''}。</p>`, 'hint');
    render();
  }
  function giveHint() {
    const c = lab.check(); clearHl(); sel = null;
    if (c.wrong.length) {
      const i = c.wrong[0], w = lab.wires[i]; selWire = i; hl.terms.add(w[0]); hl.terms.add(w[1]); hl.wires.add(i);
      say('先拆掉这根接错的线', `<p>${tname(w[0])} ↔ ${tname(w[1])}。${lab.whyWrong(w[0], w[1])}</p><p>它已经被选中了，断电状态下点「删除选中的线」。</p>`, 'hint'); render(); return;
    }
    if (!c.missing.length) { say('已经全部接好', '<p>下一步：「检查接线」校一遍 →「万用表」量电源两端 →「送电」试车。</p>', 'good'); render(); return; }
    const n = c.missing[0].n, f = c.f, base = f(n.terms[0]);
    const b = n.terms.find(t => f(t) !== base), inBase = n.terms.filter(t => f(t) === base);
    const a = inBase.slice().reverse().find(t => countAt(t) < 2) || inBase[0];
    hl.terms.add(a); hl.terms.add(b); hl.net = n.id;
    if (view !== 'sch') { view = 'sch'; renderTabs(); renderView(); }
    say(`下一根：线号 ${nlab(n)}`, `<p>把 ${tname(a)} 接到 ${tname(b)}。</p><p>为什么？图纸上这两个端子都在线号 <span class="mono">${nlab(n)}</span> 这段线上（图上已标橙色），线号相同就要连在一起。</p>`, 'hint'); render();
  }
  // 学习模式：不在考核、不是故障题、不在随机故障里，接错马上提示
  const learning = () => !(exam && !exam.done) && !ex().preset && !lab.fault;
  function startFollow() {
    if (!offOnly()) return;
    demo = null; drawDemo(); faultMode = null; lab.fault = null; drawFault(); meterOn = false;
    lab.wires = []; changed(); follow = true; assist = true; ts = { i: 0, res: [], done: false };
    drawGoal(); giveHint();
  }
  function startSolo() {
    if (!offOnly()) return;
    demo = null; drawDemo(); faultMode = null; lab.fault = null; drawFault(); meterOn = false; follow = false; assist = false;
    lab.wires = ex().preset ? ex().preset.map(w => [...w]) : []; sel = null; selWire = null; clearHl(); changed(); chk = null; ts = { i: 0, res: [], done: false };
    drawGoal();
    say(ex().preset ? '自己排故' : '独立接线', ex().preset ? '<p>线已经恢复成故障现场。不看提示：送电看现象 → 断电用万用表量 → 改好 → 试车通过。</p>' : '<p>盘上的线已经清空。不用提示和演示，只看图纸接完，再校线、量电源、送电试车。全部通过就算学会了这一题。</p><p>接错的线会马上标红，自己拆掉重接不算违规。</p>', 'hint');
    render();
  }
  // 打印任务卡：图纸 + 接线表 + 试车步骤 + 自检表，拿到真实的实训板上对照着接
  function printCard() {
    const e = ex(), c = PP.chain(e);
    let pc = document.getElementById('printcard');
    if (!pc) { pc = document.createElement('div'); pc.id = 'printcard'; document.body.appendChild(pc); }
    const box = (t) => `<span class="pbox"></span>${t}`;
    pc.innerHTML = `<header><b>配盘实训台 · 接线任务卡</b><span>图号 PP-${String(cur + 1).padStart(2, '0')}　姓名 ________　日期 ________</span></header>
      <h1>${e.name}</h1><p>${(e.preset ? e.symptom + ' ' + e.task : e.goal).replace(/<[^>]+>/g, '')}</p>
      <div class="pc-grid"><div><svg class="sch" viewBox="${FR.vb}">${FR.svg}</svg></div>
      <div><h2>接线表（${c.length} 根）</h2><table><tr><th></th><th>线号</th><th>起点</th><th>终点</th></tr>${c.map((w, i) => `<tr><td>${box('')}</td><td class="mono">${nlab(lab.nm[w[0]])}</td><td>${PP.tplain(w[0])}</td><td>${PP.tplain(w[1])}</td></tr>`).join('')}</table></div></div>
      <div class="pc-grid"><div><h2>送电前自检</h2><ul>${['对照图纸逐根校线，线号和图纸一致', '端子压接牢固、不露铜，螺丝拧紧', '万用表蜂鸣档量电源两端，没有短路', '柜内没有人作业，通知周围人员'].map(t => `<li>${box(t)}</li>`).join('')}</ul></div>
      <div><h2>试车步骤</h2><ol>${e.test.map(s => `<li>${box(`${s.act} → 应该：${s.exp}`)}</li>`).join('')}</ol></div></div>
      <footer>师傅签字 ____________　　用时 ______ 分钟　　一次试车通过 □ 是 □ 否</footer>`;
    document.body.classList.add('pcmode');
    const done = () => { document.body.classList.remove('pcmode'); G.removeEventListener('afterprint', done); };
    G.addEventListener('afterprint', done);
    G.print();
  }
  // 放大到某个元件：盘面放到 2 倍，把这个元件滚到中间
  function zoomTo(d) {
    const v = DEV[d]; if (!v) return;
    setZoom(Math.max(zoom, 2));
    const w = $('zoomwrap'), sw = $('panel').getBoundingClientRect().width, sh = sw * 462 / 630;
    w.scrollLeft = (v.x + v.w / 2) / 630 * sw - w.clientWidth / 2;
    w.scrollTop = (v.y + v.h / 2) / 462 * sh - w.clientHeight / 2;
    $('panel').closest('.panelcard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function setZoom(z) { zoom = Math.max(1, Math.min(3, Math.round(z * 4) / 4)); PREF.zoom = zoom; store.set('pp-pref-v3', PREF); $('panel').style.width = zoom * 100 + '%'; $('zval').textContent = Math.round(zoom * 100) + '%'; }
  const offOnly = () => { if (lab.st.power) { say('先断电', '<p>带电不能接线、拆线。</p>', 'bad'); return false; } return true; };

  function press(k) {
    if (!lab.st.power && !meterOn) say('还没送电', '<p>按钮按下了，但是没电，什么都不会动作。先点「送电」。</p><p>（断电时打开「万用表」，按住按钮可以量它的通断。）</p>');
    doEv('press_' + k);
  }
  function releaseAll() { const held = Object.keys(lab.st.p).filter(k => lab.st.p[k]); held.forEach(k => doEv('release_' + k)); }
  function toggle(k) { doEv(`${k}_${lab.st[k] ? 'off' : 'on'}`); }

  // 送电前检查
  function drawChecklist() {
    const box = $('checklist');
    if (!chk || !chk.open) { box.innerHTML = ''; return; }
    const items = [
      ['checked', '对照图纸逐根校线（点「检查接线」全部正确）', true],
      ['metered', '万用表蜂鸣档量电源两端没有短路（如 L–N、+V–-V）', true],
      ['tight', '端子螺丝拧紧，线号管齐全、和图纸一致', false],
      ['safe', '柜内没有人作业，通知周围人员要送电', false]];
    const all = items.every(([k]) => chk[k]);
    box.innerHTML = `<div class="checklist"><h3>送电前检查</h3>${items.map(([k, t, auto]) => `<label><input type="checkbox" data-chk="${k}"${chk[k] ? ' checked' : ''}${auto ? ' disabled' : ''}><span>${t}${auto ? `<br><span class="auto">${chk[k] ? '已完成' : '自动判断：做了这一步就会打勾'}</span>` : ''}</span></label>`).join('')}
      <div class="tools"><button class="b ${all ? 'primary' : 'danger'}" id="chkgo">${all ? '确认送电' : '没检查完，仍然送电'}</button><button class="b ghost" id="chkcancel">返回检查</button><label class="cap" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="chkskip"${PREF.skipCheck ? ' checked' : ''}>以后不再弹出</label></div></div>`;
  }
  function powerOn() {
    if (chk) chk.open = false; drawChecklist();
    ts = { i: 0, res: [], done: false }; sel = null; seen = true; dynReset();
    const c = lab.check();
    say('已送电', c.ok || lab.fault ? `<p>按下面的试车步骤操作：第 1 步「${ex().test[0].exp}」。</p>` : '<p>注意：接线和图纸不一致，可能动作不正常，甚至短路跳闸。</p>', c.ok ? 'good' : 'hint');
    doEv('power_on');
  }
  function dynReset() { lab.dyn = {}; }
  function onPower() {
    if (lab.st.power) { doEv('power_off'); say('已断电', '<p>现在可以安全地接线、拆线，也可以用万用表蜂鸣档量通断。</p>'); return; }
    if (PREF.skipCheck || (chk && chk.checked && chk.metered && chk.tight && chk.safe)) { powerOn(); return; }
    chk = chk || { checked: false, metered: false, tight: false, safe: false };
    chk.open = true; drawChecklist();
    say('送电前先检查', '<p>新手最容易犯的错之一就是“通电前不检查”。下面四项做完再送电。前两项是自动判断的：点「检查接线」、再用「万用表」量一下电源两端。</p>', 'hint');
  }

  // 演示接法
  function drawDemo() {
    const b = $('demobar');
    if (!demo) { b.innerHTML = ''; return; }
    b.innerHTML = `<div class="bar"><span class="t">演示接线：第 <b>${demo.k}</b> / ${demo.all.length} 根</span><button class="b small" id="dprev"${demo.k ? '' : ' disabled'}>上一根</button><button class="b small primary" id="dnext"${demo.k < demo.all.length ? '' : ' disabled'}>下一根</button><button class="b small" id="dall">全部接上</button><button class="b small ghost" id="dexit">退出演示</button></div>`;
  }
  function demoShow() {
    clearHl(); selWire = null;
    if (demo.k === demo.all.length) { P.mark(ex().id, 'demo'); drawGoal(); }
    if (demo.k > 0) {
      const w = demo.all[demo.k - 1], n = lab.nm[w[0]], i = lab.wires.length - 1;
      hl.terms.add(w[0]); hl.terms.add(w[1]); hl.wires.add(i); hl.net = n.id;
      say(`第 ${demo.k} 根：线号 ${nlab(n)}`, `<p>从 ${tname(w[0])} 接到 ${tname(w[1])}。图纸上这根线已标成橙色——它们在同一个线号上，所以要连在一起。</p>${demo.k === demo.all.length ? '<p>全部接完了。点「退出演示」后送电试车。</p>' : ''}`, 'hint');
    } else say('演示开始', '<p>点「下一根」，一根一根看怎么接。每接一根，图纸上对应的线号会亮起来。</p>', 'hint');
    if (view !== 'sch') { view = 'sch'; renderTabs(); renderView(); }
    drawDemo(); render();
  }
  function startDemo() {
    if (!offOnly()) return;
    meterOn = false; lab.fault = null; faultMode = null; drawFault();
    lab.wires = []; changed();
    demo = { k: 0, all: PP.chain(ex()) }; assist = true; follow = false; drawGoal(); demoShow();
  }

  // 随机故障：像考试一样排故——看现象、量、在图纸上标出故障位置、说出故障类型
  const FTYPES = [['wire', '断线 / 虚接'], ['stuck', '触点粘连 / 卡住'], ['open', '触点接触不良'], ['coil', '线圈烧坏'], ['sensor', '传感器 / 元件损坏'], ['plcstop', 'PLC 处于 STOP']];
  const faultLoc = f => (f.kind === 'wire' ? { net: (lab.nm[f.wref[0]] || {}).id } : { dev: f.dev || f.a.split('.')[0] });
  const markName = m => (!m ? '' : m.net ? `线号 <span class="mono">${nlab(ex().nets.find(n => n.id === m.net))}</span>` : `元件 <b>${DEV[m.dev] ? DEV[m.dev].lab : m.dev}</b>`);
  function drawFault() {
    const b = $('faultbox');
    if (!faultMode) { b.innerHTML = ''; return; }
    const m = faultMode.mark;
    b.innerHTML = `<div class="bar faultbox"><div class="fb-h"><b>故障排查</b><span class="cap">盘上有一处毛病，接线看起来是对的</span></div>
      <ol class="fb-steps"><li>送电，走试车步骤，<b>看哪一步不对</b></li><li>打开「万用表」量，每次都自动记下来</li><li><b>在左边图纸上点出故障位置</b>：点线 = 这根线，点符号 = 这个元件</li><li>选故障类型，点「确认」</li></ol>
      <div class="fb-act"><span class="fmark">${m ? `你标的：${markName(m)}` : '<span class="cap">还没在图纸上标位置</span>'}</span>
      <select id="ftype" aria-label="故障类型"><option value="">— 故障类型 —</option>${FTYPES.map(([k, t]) => `<option value="${k}"${faultMode.type === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <button class="b small primary" id="fok">确认</button><button class="b small ghost" id="fshow">揭晓答案</button><button class="b small ghost" id="fexit">退出</button></div></div>
      <div class="flog"><h3>测量记录<span class="cap">　打开「万用表」量的每一次都会记在这里</span></h3>${faultMode.log.length ? `<div class="tblwrap"><table><tr><th>#</th><th>红表笔</th><th>黑表笔</th><th>状态</th><th>读数</th></tr>${faultMode.log.map((l, i) => `<tr><td class="mono">${i + 1}</td><td>${l[0]}</td><td>${l[1]}</td><td>${l[3]}</td><td class="mono">${l[2]}</td></tr>`).join('')}</table></div>` : '<p class="cap">还没量。带电用电压档：黑表笔放 N（或 0V），红表笔沿回路一点点量；断电用蜂鸣档一段段量。</p>'}</div>`;
  }
  function startFault() {
    if (lab.st.power) doEv('power_off');
    demo = null; drawDemo(); meterOn = false;
    lab.wires = PP.chain(ex()); lab.fault = null; changed(); clearHl(); selWire = null;
    const cands = lab.faultCands().filter(f => !lab.runTest({ fault: f }).pass);
    const f = cands[Math.floor(Math.random() * cands.length)];
    lab.fault = f; faultMode = { cands, tries: 0, log: [], mark: null, type: '' };
    if (chk) chk.open = false; drawChecklist();
    ts = { i: 0, res: [], done: false };
    if (view !== 'sch') { view = 'sch'; renderTabs(); renderView(); }
    say('随机故障已设置', '<p>线已经按图纸接好，但有一处故障：可能是<b>断线</b>、<b>触点粘连 / 接触不良</b>、<b>线圈烧坏</b>或<b>元件损坏</b>。</p><p>排查思路：<b>看现象 → 缩小范围 → 万用表量 → 在图上标出来</b>。先送电走试车步骤，看哪一步不对。</p>', 'hint');
    drawFault(); render();
  }
  function markFault(m) {
    faultMode.mark = m; clearHl(); if (m.net) hl.net = m.net; else hl.dev = m.dev;
    say('已在图纸上标记', `<p>你标的故障位置：${markName(m)}。再选故障类型，点「确认」。</p>`, 'hint');
    drawFault(); render();
  }
  function answerFault() {
    if (!faultMode) return;
    faultMode.type = $('ftype').value;
    const m = faultMode.mark, t = faultMode.type, f = lab.fault;
    if (!m) { say('先在图纸上点出故障位置', '<p>点图纸上的一段线（断线），或者点一个元件符号（触点、线圈、传感器）。</p>', 'hint'); return; }
    if (!t) { say('再选一下故障类型'); drawFault(); return; }
    const loc = faultLoc(f), locOk = loc.net ? m.net === loc.net : m.dev === loc.dev, typeOk = t === f.kind;
    if (locOk && typeOk) {
      say('找对了！', `<p>故障是：<b>${f.name}</b>。${faultMode.tries ? `试了 ${faultMode.tries + 1} 次` : '一次就找到了'}，量了 ${faultMode.log.length} 次。</p><p>已经帮你修好。再点「随机故障」练下一个。</p>`, 'good');
      lab.fault = null; faultMode = null; clearHl(); if (lab.st.power) doEv('power_off');
    } else {
      faultMode.tries++;
      const why = locOk ? '<b>位置对了</b>，故障类型不对。想想：这个现象是“该通的不通”，还是“该断的不断”？' : typeOk ? '<b>故障类型对了</b>，位置不对。回到试车步骤，看哪一步开始不对，再用万用表量那一段。' : '位置和类型都不对。先看现象：哪个动作没出来？再顺着图纸量那一段。';
      say('不对，再查查', `<p>${why}</p>${faultMode.tries >= 2 ? `<p>提示：故障类型是 <b>${f.cat}</b>。</p>` : ''}`, 'bad');
    }
    drawFault(); render();
  }

  // ---------- 绑定 ----------
  function bind() {
    $('exlist').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { closeDrawer(); show(+b.dataset.i); } });
    const closeDrawer = () => { $('exdrawer').hidden = true; };
    $('exdrawer').addEventListener('click', e => { if (e.target.id === 'exdrawer' || e.target.id === 'dclose') closeDrawer(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('exdrawer').hidden) closeDrawer(); });
    $('printbtn').onclick = printCard;
    $('info').addEventListener('click', ev => { const b = ev.target.closest('[data-zoomdev]'); if (b) zoomTo(b.dataset.zoomdev); });
    $('panel').addEventListener('dblclick', ev => { if (ev.target.closest('[data-t],[data-btn],[data-target],[data-estop]')) return; const d = ev.target.closest('[data-dev]'); if (d) zoomTo(d.dataset.dev); });
    $('zin').onclick = () => setZoom(zoom + 0.25); $('zout').onclick = () => setZoom(zoom - 0.25);
    $('fold').onclick = () => { const s = $('side'), f = s.classList.toggle('folded'); $('fold').textContent = f ? '展开图纸' : '收起图纸'; $('fold').setAttribute('aria-expanded', !f); };
    $('vt').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { view = b.dataset.v; renderTabs(); renderView(); } });
    $('view').addEventListener('click', ev => {
      const n = ev.target.closest('[data-net],[data-net-lab]');
      if (faultMode && view === 'sch') { const sy = ev.target.closest('.sym'); if (n) { markFault({ net: n.dataset.net || n.dataset.netLab }); return; } if (sy) { markFault({ dev: sy.dataset.dev }); return; } }
      if (n) { selectNet(n.dataset.net || n.dataset.netLab); return; }
      const s = ev.target.closest('.sym'); if (s) { showInfo(s.dataset.dev); clearHl(); hl.dev = s.dataset.dev; render(); }
    });
    $('panel').addEventListener('click', ev => {
      const t = ev.target.closest('[data-t]'); if (t) { onTerm(t.dataset.t); return; }
      if (ev.target.closest('[data-target]')) { toggle('target'); return; }
      if (ev.target.closest('[data-estop]')) { toggle('estop'); return; }
      const w = ev.target.closest('[data-w]'); if (w) { selectWire(+w.dataset.w); return; }
      const d = ev.target.closest('[data-dev]');
      if (d && !ev.target.closest('[data-btn]')) { showInfo(d.dataset.dev); clearHl(); hl.dev = d.dataset.dev; render(); }
    });
    document.addEventListener('pointerdown', ev => { const b = ev.target.closest && ev.target.closest('#panel [data-btn], #ops [data-btn]'); if (!b) return; ev.preventDefault(); press(b.dataset.btn); });
    window.addEventListener('pointerup', () => lab && releaseAll());
    window.addEventListener('pointercancel', () => lab && releaseAll());
    window.addEventListener('blur', () => lab && releaseAll());
    document.addEventListener('keydown', ev => { const b = ev.target.closest && ev.target.closest('#ops [data-btn]'); if (b && (ev.key === ' ' || ev.key === 'Enter') && !ev.repeat) { ev.preventDefault(); press(b.dataset.btn); } });
    document.addEventListener('keyup', ev => { if ((ev.key === ' ' || ev.key === 'Enter') && lab) releaseAll(); });
    document.addEventListener('contextmenu', ev => { if (ev.target.closest && ev.target.closest('[data-btn]')) ev.preventDefault(); });
    $('ops').addEventListener('click', ev => { const b = ev.target.closest('[data-toggle]'); if (b) toggle(b.dataset.toggle); });
    $('power').onclick = onPower;
    $('check').onclick = () => {
      const c = lab.check(), ws = lab.wires; clearHl(); marks = { wrong: new Set(c.wrong), missing: c.missing };
      if (exam && !exam.done) { exam.checks++; c.wrong.forEach(i => exam.wrong.add(ws[i].join('|'))); drawExam(); }
      if (c.ok && chk) chk.checked = true; if (c.ok && !chk) chk = { checked: true, metered: false, tight: false, safe: false };
      if (view !== 'sch') { view = 'sch'; renderTabs(); renderView(); }
      const rows = c.rows.map(x => `<tr><td class="mono">${nlab(x.n)}</td><td>${x.n.terms.length} 个端子</td><td>${x.bad ? '<span class="tag bad">有错线</span>' : x.left ? `<span class="tag miss">还差 ${x.left} 个</span>` : '<span class="tag ok">已接通</span>'}</td></tr>`).join('');
      const wl = c.wrong.map(i => `<li>${tname(ws[i][0])} ↔ ${tname(ws[i][1])}：${lab.whyWrong(ws[i][0], ws[i][1])}</li>`).join('');
      if (c.ok) say('校线全部正确', `<div class="tblwrap"><table><tr><th>线号</th><th>端子</th><th>状态</th></tr>${rows}</table></div><p>每个线号都接通了，也没有多余的线。下一步用万用表量一下电源两端有没有短路，然后送电。</p>`, 'good');
      else say(`校线发现 ${c.wrong.length + c.missing.length} 处问题`, `${wl ? `<p><b>接错的线</b>（盘上用红点虚线标出）：</p><ul>${wl}</ul>` : ''}<div class="tblwrap"><table><tr><th>线号</th><th>端子</th><th>状态</th></tr>${rows}</table></div><p>没接完的线号在图纸上是橙色虚线，盘上对应端子有虚线圈。不会改就点「提示下一根」。</p>`, 'bad');
      drawChecklist(); render();
    };
    $('meterbtn').onclick = () => {
      meterOn = !meterOn; mA = mB = null; sel = null;
      if (meterOn) say('万用表', lab.st.power ? '<p>带电状态，自动用<b>电压档</b>。点一个端子放红表笔，再点一个放黑表笔。</p>' : '<p>断电状态，用<b>蜂鸣 / 电阻档</b>量通断。点一个端子放红表笔，再点一个放黑表笔。同一个线号的两头应该“嘀”；线圈两端应该是几百欧。</p>', 'hint');
      else say('收起万用表', '<p>点端子又可以接线了。</p>');
      render();
    };
    $('hint').onclick = () => { if (demo) return; assist = true; giveHint(); };
    $('demo').onclick = startDemo;
    $('demobar').addEventListener('click', ev => {
      if (!demo) return;
      const id = ev.target.id;
      if (id === 'dnext' && demo.k < demo.all.length) { lab.wires.push([...demo.all[demo.k]]); demo.k++; demoShow(); }
      if (id === 'dprev' && demo.k > 0) { lab.wires.pop(); demo.k--; demoShow(); }
      if (id === 'dall') { while (demo.k < demo.all.length) { lab.wires.push([...demo.all[demo.k]]); demo.k++; } demoShow(); }
      if (id === 'dexit') { demo = null; clearHl(); drawDemo(); drawGoal(); say('退出演示', '<p>下一步点「跟着接」，照着提示自己接一遍。</p>'); render(); }
    });
    $('rand').onclick = startFault;
    $('goal').addEventListener('click', ev => {
      const t = ev.target.closest('button'); if (!t) return;
      if (t.id === 'prevex' && cur > 0) show(cur - 1);
      if (t.id === 'nextex' && cur < EX.length - 1) show(cur + 1);
      if (t.id === 'exbtn') { renderList(); $('exdrawer').hidden = false; const c = $('exlist').querySelector('[aria-current="true"]'); if (c) c.scrollIntoView({ block: 'center' }); }
      const st = t.dataset.stage; if (!st) return;
      if (st === 'q') { view = 'q'; renderTabs(); renderView(); $('side').classList.remove('folded'); $('side').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      if (st === 'demo') startDemo();
      if (st === 'follow') startFollow();
      if (st === 'solo') startSolo();
      if (st === 'exam') { if (exam && !exam.done) stopExam(); else if (t.getAttribute('aria-disabled')) say('考核还没解锁', '<p>先点「独立接」，不看提示自己接对一次，就能考核了。</p>', 'hint'); else startExam(); }
    });
    $('exambar').addEventListener('click', ev => { if (ev.target.id === 'examexit') stopExam(); });
    $('snd').onclick = () => { PP.sound.set(!PP.sound.on()); if (PP.sound.on()) PP.sound.click(); render(); };
    $('tags').onclick = () => { PREF.tags = !PREF.tags; store.set('pp-pref-v3', PREF); say(PREF.tags ? '线号管' : '收起线号管', PREF.tags ? '<p>真柜子里每根线两头都套着<b>线号管</b>，印的就是图纸上的线号。接对的线显示线号，两头线号对不上的显示红色“?”。维修时就靠它对照图纸找线。</p>' : ''); render(); };
    $('steps').addEventListener('click', ev => {
      const b = ev.target.closest('[data-step]'); if (!b) return;
      const a = b.dataset.step;
      if (a === 'meter') { if (!meterOn) $('meterbtn').click(); }
      else if (a === 'power') { if (!lab.st.power) onPower(); }
      else $(a).click();
    });
    $('faultbox').addEventListener('click', ev => {
      const id = ev.target.id;
      if (id === 'fok') answerFault();
      if (id === 'fshow' && lab.fault) { say('答案', `<p>故障是：<b>${lab.fault.name}</b>。对照试车时哪一步不对，想想为什么这个故障会造成那个现象。</p>`, 'hint'); lab.fault = null; faultMode = null; if (lab.st.power) doEv('power_off'); drawFault(); render(); }
      if (id === 'fexit') { lab.fault = null; faultMode = null; clearHl(); if (lab.st.power) doEv('power_off'); drawFault(); say('已退出故障模式'); render(); }
    });
    $('checklist').addEventListener('change', ev => {
      const k = ev.target.dataset.chk; if (k && chk) { chk[k] = ev.target.checked; drawChecklist(); }
      if (ev.target.id === 'chkskip') { PREF.skipCheck = ev.target.checked; store.set('pp-pref-v3', PREF); }
    });
    $('checklist').addEventListener('click', ev => { if (ev.target.id === 'chkgo') powerOn(); if (ev.target.id === 'chkcancel') { chk.open = false; drawChecklist(); } });
    $('route').onclick = () => { PREF.route = PREF.route === 'duct' ? 'direct' : 'duct'; store.set('pp-pref-v3', PREF); say(PREF.route === 'duct' ? '线槽走线：横平竖直' : '直连显示', PREF.route === 'duct' ? '<p>像真柜子一样：线从端子竖直进线槽，在线槽里水平走，再竖直下到目标端子。横平竖直不是为了好看，是为了安全、好查、好维护。看不清哪根线时，点一下它，图纸上会标出线号。</p>' : '<p>线直接从端子连到端子，方便看清谁和谁连。</p>'); render(); };
    $('reset').onclick = () => { if (!offOnly()) return; lab.wires = ex().preset.map(w => [...w]); sel = null; selWire = null; clearHl(); changed(); say('已恢复故障现场', '<p>接线回到了出故障时的样子，重新排查吧。</p>'); render(); };
    $('clear').onclick = () => { if (!offOnly()) return; demo = null; drawDemo(); follow = false; assist = false; drawGoal(); lab.wires = []; lab.fault = null; faultMode = null; drawFault(); sel = null; selWire = null; clearHl(); changed(); say('已全部拆掉', '<p>从图纸最上面的电源开始，一个线号一个线号往下接。</p>'); render(); };
    $('del').onclick = () => { if (selWire === null || !offOnly()) return; lab.wires.splice(selWire, 1); selWire = null; clearHl(); changed(); say('已删除这根线'); render(); };
  }

  // ---------- 切换练习 ----------
  function show(i) {
    if (lab && lab.st.power) lab.applyEv('power_off');
    cur = i; const e = ex();
    store.set('pp-cur-v3', e.id);
    let ws = WIRES[e.id]; if (!ws) ws = e.preset ? e.preset.map(w => [...w]) : [];
    lab = new PP.Lab(e, ws);
    sel = null; selWire = null; clearHl(); marks = null; mA = mB = null; demo = null; faultMode = null; chk = null; seen = false; exam = null; clearInterval(examTimer);
    follow = false; assist = !e.preset && ws.length > 0;
    P.setLast({ t: 'ex', id: e.id, name: e.name });
    total = PP.chain(e).length;
    ts = { i: 0, res: [], done: false };
    FR = PP.frame(e, i);
    renderList();
    drawGoal();
    renderTabs(); renderView();
    let ops = '';
    for (const d of e.devs) { const v = DEV[d]; if (v.kind === 'btn') ops += `<button class="b hold ${v.color}" data-btn="${d}" aria-pressed="false">按住 ${v.lab} ${(e.names || {})[d] || v.name}</button>`; }
    if (e.devs.some(d => ['fr', 'frc'].includes(DEV[d].kind)) && e.nets.some(n => n.terms.some(t => t.endsWith('.95')))) ops += `<button class="b" id="tripbtn" data-toggle="trip" aria-pressed="false">模拟电机过载</button>`;
    if (has('M')) ops += `<button class="b hold green" data-btn="KM" aria-pressed="false">按住：手动吸合 KM</button>`;
    if (e.devs.some(d => ['sensor', 'sensor2', 'lc', 'pt'].includes(DEV[d].kind))) ops += `<button class="b toggle" id="targetbtn" data-toggle="target" aria-pressed="false">放工件（挡住传感器）</button>`;
    if (e.prog === 'hmi') ops += `<button class="b toggle" id="hmibtn" data-toggle="hmi" aria-pressed="false">触摸屏：启动</button>`;
    if (has('SE') || has('SE2')) ops += `<button class="b red" id="estopbtn" data-toggle="estop" aria-pressed="false">拍下急停</button>`;
    $('ops').innerHTML = ops;
    $('info').innerHTML = '<p class="cap">点图纸上的符号或盘面上的元件，这里会说明它是什么、端子怎么认。</p>';
    quiet = true;
    say(e.name, e.preset ? '<p>这道题的线已经接好了，但有毛病。先送电按试车步骤确认故障，再用万用表和图纸找原因。</p>' : '<p>第一次做这道题，按上面的顺序来：先做「读图题」把图看懂，再「看演示」，然后「跟着接」，最后「独立接」。</p><p>接线方法：在图纸上点一段线，看这个线号要连哪几个端子；再到盘面上点一个端子、再点另一个端子，就接上一根线。</p>');
    quiet = false;
    drawDemo(); drawFault(); drawChecklist(); drawExam(); setZoom(zoom); render();
  }
  function showById(id, v) { if (v) view = v; const i = EX.findIndex(e => e.id === id); show(i >= 0 ? i : 0); }

  PP.LabUI = { mount, show, showById, lastId: () => store.get('pp-cur-v3', 'jog') };
})(window);
