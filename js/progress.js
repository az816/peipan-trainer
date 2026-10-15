// progress.js — 学习路线（8 关）和学习进度。只读写 localStorage，不碰 DOM，测试可直接加载。
(function (G) {
  const PP = G.PP;
  const store = (PP.store = {
    get(k, d) { try { const v = G.localStorage && G.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { G.localStorage && G.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  });

  // 每一关：学什么、练什么、过关标准。新手路线 8 关，由易到难：点动 → 自锁 → 两地 → 正反转 → 星三角
  const ex = id => ({ t: 'ex', id }), lesson = (id, name) => ({ t: 'lesson', id, name }), page = (id, name) => ({ t: 'page', id, name });
  PP.LEVELS = [
    { id: 'L0', title: '安全与电路基础', goal: '知道电从哪来、往哪去，什么是回路、短路、断路；记住断电、验电、挂牌。', real: '第一天进车间就要用',
      items: [lesson('circuit', '电是怎么流的'), lesson('safety', '安全三件事')] },
    { id: 'L1', title: '认识元件和图纸符号', goal: '图上一个符号，能在柜子里找到对应的实物，知道它的端子号在哪。', real: '去仓库、去柜子前认元件',
      items: [lesson('parts', '符号 ↔ 实物 ↔ 端子'), page('read', '看图四步 + 识图小测')] },
    { id: 'L2', title: '万用表', goal: '会选档位，会量通断和电压，知道量之前先确认档位。', real: '买一块表，天天量',
      items: [lesson('meter', '万用表怎么用')] },
    { id: 'L3', title: '点动与自锁', goal: '按住转、松手停是点动；松手还转是自锁。两个都能看图接出来，送电试车一次通过。', real: '板前明线、线槽配线练习',
      items: [ex('jog'), ex('hold'), lesson('craft', '剥线 压端子 套线号'), { t: 'build', id: 'pump', name: '配柜 ★ 水泵启停控制箱' }] },
    { id: 'L4', title: '两地控制', goal: '两个地方都能启动、都能停：启动按钮并联，停止按钮串联。', real: '机床、输送线常见',
      items: [ex('twoloc')] },
    { id: 'L5', title: '主回路与正反转', goal: '三相主回路不串相；正反转一定要互锁，否则一按反转就短路跳闸。', real: '电工中级实操常考题',
      items: [ex('main'), ex('fwdrev'), { t: 'build', id: 'hoist', name: '配柜 ★★ 提升机正反转箱' }] },
    { id: 'L6', title: '星三角降压启动', goal: '知道电机接线盒怎么接星形 / 三角形，星三角启动先星后角、两个不能同时吸合。', real: '大电机启动常用',
      items: [lesson('motorbox', '电机接线盒：星形 / 三角形'), ex('yd'), { t: 'build', id: 'yd', name: '配柜 ★★★ 风机星三角柜' }] },
    { id: 'L7', title: '故障排查', goal: '会按“看现象 → 缩小范围 → 量 → 修好 → 复测 → 试运行”的顺序，用万用表找出故障点并修好。', real: '调试、维修',
      items: [lesson('trouble', '排故方法：电压法和电阻法'), ex('f1'), ex('f6'), ex('f3'), ex('f5')] },
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
    buildScore(id = 'conveyor') { const a = store.get('pp-build-v2', null), st = a && a.p ? a.p[id] : id === 'conveyor' ? store.get('pp-build-v1', null) : null, B = PP.buildOf && PP.buildOf(id); return st && B && st.seen && st.seen[4] ? B.score(st).total : 0; },
    itemDone(it) {
      if (it.t === 'ex') return P.solo(it.id);
      if (it.t === 'lesson') return P.lesson(it.id);
      if (it.t === 'page') return P.seen(it.id);
      if (it.t === 'build') return P.buildScore(it.id === 'build' ? 'conveyor' : it.id) >= 70;
      return false;
    },
    // 学过：动过手但还没验证（看过演示、跟着接过、做过读图题，或配柜打开过）
    itemSeen(it) {
      if (it.t === 'ex') return Object.keys(P.learn(it.id)).length > 0;
      if (it.t === 'build') { const a = store.get('pp-build-v2', null); return !!(a && a.p && a.p[it.id]); }
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
      const CAT = { 安全: 0, 识图: 1, 接线: 3, 布局: 3, 选型: 5 }, lv = Math.max(P.current(), 1);
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
