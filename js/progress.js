// progress.js — 学习路线（9 关）和学习进度。只读写 localStorage，不碰 DOM，测试可直接加载。
(function (G) {
  const PP = G.PP;
  const store = (PP.store = {
    get(k, d) { try { const v = G.localStorage && G.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { G.localStorage && G.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  });

  // 每一关：学什么、练什么、过关标准
  const ex = id => ({ t: 'ex', id }), lesson = (id, name) => ({ t: 'lesson', id, name }), page = (id, name) => ({ t: 'page', id, name });
  PP.LEVELS = [
    { id: 'L0', title: '安全与电路基础', goal: '知道电从哪来、往哪去，什么是回路、短路、断路；记住断电、验电、挂牌。', real: '第一天进车间就要用',
      items: [lesson('circuit', '电是怎么流的'), lesson('safety', '安全三件事')] },
    { id: 'L1', title: '认识元件和图纸符号', goal: '图上一个符号，能在柜子里找到对应的实物，知道它的端子号在哪。', real: '去仓库、去柜子前认元件',
      items: [lesson('parts', '符号 ↔ 实物 ↔ 端子'), page('read', '看图四步 + 识图小测')] },
    { id: 'L2', title: '万用表', goal: '会选档位，会量通断和电压，知道量之前先确认档位。', real: '买一块表，天天量',
      items: [lesson('meter', '万用表怎么用')] },
    { id: 'L3', title: '继电控制入门', goal: '看懂并接出点动、自锁、两地控制、指示灯，送电试车一次通过。', real: '板前明线、线槽配线练习',
      items: [ex('jog'), ex('hold'), ex('twoloc'), ex('lamp'), lesson('relay', '中间继电器认脚')] },
    { id: 'L4', title: '主回路与互锁', goal: '三相主回路不串相，正反转一定要互锁，会接顺序和星三角。', real: '电工中级实操常考题',
      items: [ex('main'), lesson('motorbox', '电机接线盒：星形 / 三角形'), ex('fwdrev'), ex('seq'), ex('delay'), ex('yd')] },
    { id: 'L5', title: '传感器与 PLC 接线', goal: '分清 NPN / PNP，公共端接对，PLC 输入输出、电磁阀和急停都能接。', real: '自动化设备每天的活',
      groups: [['PLC 输入输出', 5], ['传感器', 4], ['电磁阀与气缸', 3], ['安全回路', 3], ['运动控制', 2]],
      items: [ex('plclamp'), ex('relay'), ex('combo'), ex('plcfr'), page('plc', 'PLC 故障灯测验'), ex('npn'), ex('pnp'), ex('two'), ex('analog'), ex('cyl'), ex('diode'), ex('valveisl'), ex('estop'), ex('srelay'), ex('lcurtain'), ex('stepper'), ex('servo')] },
    { id: 'L6', title: '配盘工艺', goal: '端子选对、压牢，线号朝向一致，横平竖直，强弱电分开。', real: '师傅验收先看工艺',
      items: [lesson('craft', '剥线 压端子 套线号'), lesson('ground', 'PE、0V 和屏蔽线'), page('cab', '柜体布局 + 小测')] },
    { id: 'L7', title: '故障排查', goal: '会按“看现象 → 缩小范围 → 量 → 确认”的顺序，用万用表找出故障点。', real: '调试、维修',
      groups: [['方法', 1], ['实战排故', 7]],
      items: [lesson('trouble', '排故方法：电压法和电阻法'), ex('f1'), ex('f2'), ex('f3'), ex('f4'), ex('f5'), ex('f6'), ex('f7')] },
    { id: 'L8', title: '整柜实战', goal: '对照图纸，从选元件、布置、走线到验收，独立做完一台控制柜。', real: '独立配一台柜子',
      items: [lesson('sheets', '看懂多页图纸'), { t: 'build', id: 'build', name: '配柜实战：输送线控制柜' }, lesson('iocheck', '送电对点：I/O 点检'), page('calc', '选型计算 + 小测')] },
  ];

  // 每道接线题的学习阶段：读图题 → 看演示 → 跟着接 → 独立接 → 考核
  PP.STAGES = [['q', '读图题'], ['demo', '看演示'], ['follow', '跟着接'], ['solo', '独立接'], ['exam', '考核']];
  const P = (PP.prog = {
    learn: id => (store.get('pp-learn-v1', {})[id] || {}),
    mark(id, stage, val = true) { const L = store.get('pp-learn-v1', {}); L[id] = { ...(L[id] || {}), [stage]: val }; store.set('pp-learn-v1', L); },
    lesson: id => !!store.get('pp-lesson-v1', {})[id],
    setLesson(id) { const L = store.get('pp-lesson-v1', {}); L[id] = true; store.set('pp-lesson-v1', L); },
    seen: id => !!store.get('pp-seen-v1', {})[id],
    setSeen(id) { const L = store.get('pp-seen-v1', {}); if (!L[id]) { L[id] = true; store.set('pp-seen-v1', L); } },
    // 独立接对过（老版本只记了 done，也算）
    solo: id => !!(P.learn(id).solo || store.get('pp-done-v3', {})[id]),
    best: id => store.get('pp-best-v1', {})[id] || null,
    buildScore() { const st = store.get('pp-build-v1', null); return st && PP.BUILD ? PP.BUILD.score(st).total : 0; },
    itemDone(it) {
      if (it.t === 'ex') return P.solo(it.id);
      if (it.t === 'lesson') return P.lesson(it.id);
      if (it.t === 'page') return P.seen(it.id);
      if (it.t === 'build') return P.buildScore() >= 70;
      return false;
    },
    // 页面小测：全部答完且答对 80% 以上，这一页才算学完
    pageQuiz(id) { let n = 0, ok = 0; return { onAnswer: (q, right) => { n++; if (right) ok++; }, check: total => { if (n >= total && ok / total >= 0.8) P.setSeen(id); return P.seen(id); }, reset() { n = 0; ok = 0; } }; },
    itemName(it) { if (it.t === 'ex') { const e = PP.EX.find(x => x.id === it.id); return e ? e.name : it.id; } return it.name; },
    level(L) { const n = L.items.filter(P.itemDone).length; return { n, total: L.items.length, done: n === L.items.length }; },
    // 当前该学哪一关：第一个没过关的
    current() { const i = PP.LEVELS.findIndex(L => !P.level(L).done); return i < 0 ? PP.LEVELS.length - 1 : i; },
    nextItem(L) { return L.items.find(it => !P.itemDone(it)) || null; },
    last: () => store.get('pp-last-v1', null),
    setLast(o) { store.set('pp-last-v1', o); },
    // 每日 5 题：先挑错题本，再从已经学到的关卡里挑最久没做的
    daily() {
      const today = new Date().toISOString().slice(0, 10), D = store.get('pp-daily-v1', {});
      if (D.day === today && D.qs) return D;
      const CAT = { 安全: 0, 识图: 1, 接线: 3, 传感器: 5, PLC: 5, 通讯: 5, 变频器: 5, 布局: 6, 选型: 8 }, lv = Math.max(P.current(), 1);
      const seen = store.get('pp-qseen-v1', {}), wrong = new Set(store.get('pp-wrong-v1', []));
      const pool = PP.QZ.filter(q => (CAT[q[0]] ?? 9) <= lv + 1);
      const w = PP.QZ.filter(q => wrong.has(q[1])).slice(0, 2);
      const rest = pool.filter(q => !w.includes(q)).sort((a, b) => (seen[a[1]] || 0) - (seen[b[1]] || 0) || Math.random() - 0.5);
      const qs = [...w, ...rest].slice(0, 5).map(q => q[1]);
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      const nd = { day: today, qs, done: false, right: 0, streak: D.day === y && D.done ? D.streak || 0 : D.day === today ? D.streak || 0 : 0 };
      store.set('pp-daily-v1', nd); return nd;
    },
    dailyAnswer(q, ok) {
      const seen = store.get('pp-qseen-v1', {}); seen[q[1]] = Date.now(); store.set('pp-qseen-v1', seen);
      const wrong = new Set(store.get('pp-wrong-v1', [])); ok ? wrong.delete(q[1]) : wrong.add(q[1]); store.set('pp-wrong-v1', [...wrong]);
    },
    dailyDone(right) { const D = store.get('pp-daily-v1', {}); if (!D.done) { D.done = true; D.right = right; D.streak = (D.streak || 0) + 1; store.set('pp-daily-v1', D); } return D; },
    total() { const all = PP.LEVELS.flatMap(L => L.items); return { n: all.filter(P.itemDone).length, total: all.length, levels: PP.LEVELS.filter(L => P.level(L).done).length }; },
  });
})(typeof window !== 'undefined' ? window : globalThis);
