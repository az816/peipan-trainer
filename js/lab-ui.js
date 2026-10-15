// lab-ui.js — 接线实训页：图纸、盘面、接线、万用表、试车、演示、随机故障、送电前检查
// 性能约定：
//   · 盘面分层（静态 / 元件 / 导线 / 端子），一帧最多画一次（requestAnimationFrame），每层只在内容变了时才写 DOM；
//   · 动画只动 transform / opacity：电流、闪烁放在单独的浮层 <svg> 上，缩放平移只改相机层的 transform，松手后才改 viewBox；
//   · 每道题一个会话（S），切题时统一中止手势、取消帧和定时器、断电，临时状态全部回到初始值。
(function (G) {
  const PP = G.PP, DEV = PP.DEV, EX = PP.EX;
  const $ = id => document.getElementById(id);
  const store = PP.store, P = PP.prog;
  const VB_W = 630, VB_H = 462;
  const WIRES = store.get('pp-wires-v3', {}), DONE = store.get('pp-done-v3', {}), BEST = store.get('pp-best-v1', {}), PREF = store.get('pp-pref-v3', { route: 'direct', skipCheck: false });
  const savePref = () => store.set('pp-pref-v3', PREF);
  let cur = 0, lab = null, lastSim = { on: {}, live: () => null, motor: 'stop', power: false };
  // 每道题的临时状态：resetSession() 会全部还原
  let sel, selWire, hl, marks, meterOn, mA, mB, ts, demo, faultMode, chk, seen, exam, follow, assist, undo, stat;
  let S = null, view = 'sch', total = 0, quiet = false, toastT = null, ktTimer = null, examTimer = null;
  const ex = () => EX[cur];
  const has = d => ex().devs.includes(d);
  const clearHl = () => { hl = { terms: new Set(), dev: null, net: null, wires: new Set() }; };
  const plcId = () => ex().devs.find(d => DEV[d].kind === 'plc' || DEV[d].kind === 'plcr');
  const tname = t => { const p = PP.termPos(t), side = p.dev === 'X1' ? (p.k.endsWith('t') ? '（上口）' : '（下口）') : ''; return `<b>${DEV[p.dev].lab}</b> 的 <span class="mono">${p.label}</span>${/^\d+$/.test(p.label) ? ' 号' : ''}${side}`; };
  const nlab = PP.nlab;
  const isMobile = () => G.matchMedia && G.matchMedia('(max-width:700px)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // 只在内容变了时才写 DOM
  const put = (el, s) => { if (el && el._h !== s) { el.innerHTML = s; el._h = s; } };
  const txt = (el, s) => { if (el && el.textContent !== s) el.textContent = s; };
  const attr = (el, k, v) => { v = String(v); if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); };
  const prop = (el, k, v) => { if (el && el[k] !== v) el[k] = v; };

  function resetSession() {
    if (S) S.dispose();
    const ac = new AbortController();
    S = {
      signal: ac.signal,
      dispose() {
        gesture.abort(); hidePicker(); closeSheet();
        clearTimeout(ktTimer); clearInterval(examTimer); ktTimer = examTimer = null;
        if (lab && lab.st.power) lab.applyEv('power_off');
        flushSave(); ac.abort();
      },
    };
    sel = null; selWire = null; clearHl(); marks = null; meterOn = false; mA = mB = null;
    ts = { i: 0, res: [], done: false }; demo = null; faultMode = null; chk = null; seen = false; exam = null;
    follow = false; assist = false; undo = []; stat = { t0: Date.now(), wrong: 0, checks: 0, shorts: 0 };
  }

  // ---------- 存档：防抖 300ms，内容没变不写；页面关闭 / 切到后台时立即写 ----------
  let saveT = 0;
  const savedSig = {};
  function save() {
    if (!lab) return;
    const id = ex().id, s = JSON.stringify(lab.wires);
    if (savedSig[id] === s) return;
    savedSig[id] = s; WIRES[id] = lab.wires; store.set('pp-wires-v3', WIRES);
  }
  const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 300); };
  function flushSave() { clearTimeout(saveT); saveT = 0; save(); }

  // ---------- 提示：右下角小气泡 + 详细说明（手机上点气泡从底部滑出） ----------
  function say(title, body = '', tone = '', acts = '') {
    const m = $('msg'); m.className = 'msg ' + tone; m.innerHTML = `<h3>${title}</h3>${body}${acts ? `<div class="acts">${acts}</div>` : ''}`; m.scrollTop = 0;
    if ($('sheet').classList.contains('open')) fillSheet();
    if (quiet) return;
    const t = $('toast'); t.className = 'toast show ' + tone; t.innerHTML = `<b>${title}</b>${body || acts ? `<span>${isMobile() ? '点这里看详情' : '详情见下方 ↓'}</span>` : ''}`;
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), acts ? 6000 : 3600);
  }
  function fillSheet() { const m = $('msg'), b = $('sheetb'); b.className = m.className + ' bsheet-b'; b.innerHTML = m.innerHTML; }
  function openSheet() { fillSheet(); $('sheet').classList.add('open'); $('sheet').setAttribute('aria-hidden', 'false'); $('toast').classList.remove('show'); }
  function closeSheet() { const s = $('sheet'); if (s) { s.classList.remove('open'); s.setAttribute('aria-hidden', 'true'); } }
  function showInfo(dev) { const i = PP.INFO[dev]; if (i) { $('info').innerHTML = `<h3>${i[0]}</h3>${i[1]}${has(dev) ? `<button class="b small" data-zoomdev="${dev}">放大到这个元件</button>` : ''}`; if (PP.glossify) PP.glossify($('info')); } }
  function changed() { marks = null; if (chk) { chk.checked = false; chk.metered = false; } }

  // ---------- 骨架 ----------
  function mount(root) {
    root.innerHTML = `
<div class="lab" id="lab" data-mt="board">
  <div class="mtabs" role="tablist" aria-label="切换视图"><button role="tab" data-mt="draw">图纸</button><button role="tab" data-mt="board">盘面</button><button role="tab" data-mt="task">任务</button></div>
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
      <div class="stage" id="stage">
        <div class="viewport" id="zoomwrap" tabindex="0" aria-label="盘面。方向键选端子，回车接线，加减号缩放，Ctrl+Z 撤销">
          <div class="camera" id="camera">
            <svg id="panel" class="pn" viewBox="0 0 ${VB_W} ${VB_H}"><g id="pnroot" class="pn"><g id="L-static"></g><g id="L-devs"></g><g id="L-wires"></g><g id="L-terms"></g></g></svg>
            <svg id="fxflow" class="fx fxflow" viewBox="0 0 ${VB_W} ${VB_H}" aria-hidden="true"></svg>
            <svg id="fxpulse" class="fx fxpulse" viewBox="0 0 ${VB_W} ${VB_H}" aria-hidden="true"></svg>
            <svg id="fxtop" class="fx" viewBox="0 0 ${VB_W} ${VB_H}" aria-hidden="true"><line id="rubber" class="rubber" x1="0" y1="0" x2="0" y2="0"/></svg>
          </div>
        </div>
        <div class="snap-ring" id="ring" aria-hidden="true"></div><div class="snaptip" id="snaptip" aria-hidden="true"></div>
        <div class="magnifier" id="mag" aria-hidden="true"><svg class="pn" id="magsvg" viewBox="0 0 56 56"><use href="#pnroot"/><circle class="mag-ring" id="magring" r="9"/></svg></div>
        <div class="picker" id="picker" role="dialog" aria-label="选哪个端子" hidden></div>
        <div class="toast" id="toast" role="status" aria-live="polite"></div>
      </div>
      <div class="tools">
        <div class="tg"><span class="tgl">接线</span>
          <button class="b" id="undo" disabled>撤销</button>
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
  <nav class="mbar" aria-label="常用操作"><button data-proxy="undo">撤销</button><button data-proxy="hint">提示</button><button data-proxy="check">检查</button><button data-proxy="meterbtn">万用表</button><button data-proxy="power" class="pw">送电</button></nav>
  <div class="bsheet" id="sheet" aria-hidden="true"><div class="bsheet-h"><b>详情</b><button class="b small ghost" id="sheetx">收起</button></div><div class="bsheet-b msg" id="sheetb"></div></div>
  <div class="tour" id="tour" hidden><div class="tour-spot" id="tourspot"></div><div class="tour-card" id="tourcard" role="dialog" aria-live="polite"></div></div>
  <div class="drawer" id="exdrawer" hidden><div class="drawer-in" role="dialog" aria-label="全部题目"><div class="drawer-h"><h2>全部题目</h2><button class="b small ghost" id="dclose">关闭</button></div><div class="exlist" id="exlist"></div></div></div>
</div>`;
    bind();
  }
  function setTab(t) {
    $('lab').dataset.mt = t;
    document.querySelectorAll('.mtabs [data-mt]').forEach(b => b.setAttribute('aria-selected', b.dataset.mt === t));
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
    const e = ex(), L = P.learn(e.id), St = stagesOf(e), k = St.findIndex(([id]) => !L[id]);
    const open = id => id !== 'exam' || L.solo || (exam && !exam.done);
    const chip = ([id, t], i) => {
      const done = !!L[id], active = (id === 'follow' && follow) || (id === 'demo' && demo) || (id === 'exam' && exam && !exam.done);
      return `<li class="${done ? 'done' : ''}${i === k ? ' next' : ''}${active ? ' on' : ''}"><button data-stage="${id}"${open(id) ? '' : ' aria-disabled="true" title="先独立接对一次，才能考核"'}><span class="sn">${done ? '✓' : i + 1}</span>${t}${id === 'exam' && P.best(e.id) ? `<em>${P.best(e.id).score}分</em>` : ''}${!open(id) ? '<i class="lock" aria-hidden="true"></i>' : ''}</button></li>`;
    };
    $('goal').innerHTML = `<div class="goal-h"><div class="goal-t"><span class="goal-cat">${e.cat}</span><h2>${e.name}</h2></div>
      <div class="goal-nav"><button class="b small ghost" id="prevex"${cur ? '' : ' disabled'}>‹ 上一题</button><button class="b small" id="exbtn">全部题目</button><button class="b small ghost" id="nextex"${cur < EX.length - 1 ? '' : ' disabled'}>下一题 ›</button><button class="b small ghost" id="tourbtn">新手引导</button></div></div>
      ${e.preset ? `<p><span class="sym-tag">故障现象</span>${e.symptom}</p><p><b>任务：</b>${e.task}</p>` : `<p>${e.goal}</p>`}
      <div class="learn-row"><span class="tgl">学习阶段</span><ol class="learn" aria-label="学习阶段">${St.map(chip).join('')}</ol></div>`;
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
      v.innerHTML = `<div class="svgwrap"><svg id="sch" class="sch" viewBox="${FR.vb}">${FR.svg}</svg></div><p class="cap">点符号看说明，点线条看这个线号要连哪些端子；点盘上的线，图纸上对应的线会变橙色。送电后带电的线变色：火线红，零线蓝。触点下面的“/3”表示它的线圈画在第 3 区。</p>`;
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
    s.setAttribute('viewBox', L.vb); s.style.maxWidth = L.w * 1.25 + 'px'; put(s, L.svg);
  }
  function paintSchematic() {
    const svg = $('sch'); if (!svg) return;
    const miss = new Set(marks ? marks.missing.map(m => m.n.id) : []);
    svg.querySelectorAll('[data-net]').forEach(el => {
      const n = lab.nm && ex().nets.find(z => z.id === el.dataset.net), lv = n ? lastSim.live(n.terms[0]) : null;
      if (lv) { if (el.getAttribute('data-live') !== lv) el.setAttribute('data-live', lv); } else if (el.hasAttribute('data-live')) el.removeAttribute('data-live');
      const isW = el.classList.contains('w');
      el.classList.toggle('hl', isW && hl.net === el.dataset.net);
      el.classList.toggle('miss', isW && miss.has(el.dataset.net));
    });
    svg.querySelectorAll('[data-net-lab]').forEach(el => el.classList.toggle('hl', hl.net === el.dataset.netLab));
    svg.querySelectorAll('.sym').forEach(el => el.classList.toggle('hl', hl.dev !== null && el.dataset.dev === hl.dev));
  }

  // ---------- 盘面：分层绘制 ----------
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
  const bez = (a, b) => { const pa = PP.termPos(a), pb = PP.termPos(b), o = 52; return [[pa.x, pa.y], [pa.x, pa.y + (pa.side === 't' ? -o : o)], [pb.x, pb.y + (pb.side === 't' ? -o : o)], [pb.x, pb.y]]; };
  function wirePath(a, b, i) {
    const pts = routePts(a, b, i);
    if (pts) return 'M' + pts.map(p => p.join(' ')).join('L');
    const [p0, p1, p2, p3] = bez(a, b);
    return `M${p0.join(' ')}C${p1.join(' ')} ${p2.join(' ')} ${p3.join(' ')}`;
  }
  // 线的中点和走向（画电流方向箭头、错线 ✕ 用）
  function wireMid(a, b, i) {
    const pts = routePts(a, b, i);
    if (pts) {
      const seg = pts.slice(1).map((p, k) => [pts[k], p, Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1])]);
      let half = seg.reduce((s, x) => s + x[2], 0) / 2;
      for (const [p, q, l] of seg) { if (half <= l && l) { const f = half / l; return { x: p[0] + (q[0] - p[0]) * f, y: p[1] + (q[1] - p[1]) * f, a: Math.atan2(q[1] - p[1], q[0] - p[0]) }; } half -= l; }
      return { x: pts[0][0], y: pts[0][1], a: 0 };
    }
    const [p0, p1, p2, p3] = bez(a, b);
    return { x: (p0[0] + 3 * p1[0] + 3 * p2[0] + p3[0]) / 8, y: (p0[1] + 3 * p1[1] + 3 * p2[1] + p3[1]) / 8, a: Math.atan2(p3[1] + p2[1] - p1[1] - p0[1], p3[0] + p2[0] - p1[0] - p0[0]) };
  }
  function staticSVG() {
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
    return s;
  }
  let staticKey = '', devSlot = {}, devHTML = {};
  const FLOW_MAX = 12;   // 带电线超过这么多根，电流层不再呼吸，只留静态箭头
  function drawPanel() {
    const e = ex();
    // 静态层：切题或换走线方式时才重画；元件层每个元件一个槽，只替换变了的那个（时间继电器计时时只动 KT）
    const sk = e.id + '|' + PREF.route;
    if (sk !== staticKey) {
      staticKey = sk; $('L-static').innerHTML = staticSVG();
      $('L-devs').innerHTML = e.devs.map(d => `<g data-slot="${d}"></g>`).join('');
      devSlot = {}; devHTML = {}; $('L-devs').querySelectorAll('[data-slot]').forEach(g => (devSlot[g.dataset.slot] = g));
    }
    for (const d of e.devs) { const s = drawDev(d); if (devHTML[d] !== s) { devHTML[d] = s; devSlot[d].innerHTML = s; } }
    const flow = lab.flow(lastSim), instant = learning();
    let ws = '', fl = '';
    lab.wires.forEach((w, i) => {
      const d = wirePath(w[0], w[1], i), bad = (marks && marks.wrong.has(i)) || (instant && lab.whyWrong(w[0], w[1]));
      const cls = ['wire', selWire === i && 'sel', hl.wires.has(i) && 'hlw', bad && 'bad'].filter(Boolean).join(' ');
      let x = '';
      if (bad) { const m = wireMid(w[0], w[1], i); x = `<path class="badm" d="${d}"/><g class="badx" transform="translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})"><circle r="7"/><path d="M-3.2 -3.2L3.2 3.2M3.2 -3.2L-3.2 3.2"/></g>`; }
      ws += `<g class="${cls}" data-w="${i}"><path class="hitw" d="${d}"/><path class="edge" d="${d}"/><path class="core" d="${d}" style="stroke:${wireColor(w[0], w[1])}"/>${x}</g>`;
      const dir = flow.get(w);
      if (dir) { const m = wireMid(dir[0], dir[1], i); fl += `<path class="flow" d="${wirePath(dir[0], dir[1], i)}"/><path class="chev" d="M-3.5 -4L2.5 0L-3.5 4" transform="translate(${m.x.toFixed(1)} ${m.y.toFixed(1)}) rotate(${(m.a * 180 / Math.PI).toFixed(0)})"/>`; }
    });
    put($('L-wires'), ws);
    put($('fxflow'), fl);
    $('fxflow').classList.toggle('calm', flow.size > FLOW_MAX);
    let ts_ = '';
    if (PREF.tags) {
      const tag = new Map();
      lab.wires.forEach(w => { const a = lab.nm[w[0]], b = lab.nm[w[1]], l = a && a === b ? nlab(a) : '?'; w.forEach(t => { if (!tag.has(t) || l === '?') tag.set(t, l); }); });
      tag.forEach((l, t) => { const p = PP.termPos(t), y = p.y + (p.side === 't' ? -17 : 17), w = l.length * 5.6 + 7; ts_ += `<g class="sleeve${l === '?' ? ' bad' : ''}"><rect x="${p.x - w / 2}" y="${y - 6}" width="${w}" height="12" rx="2"/><text x="${p.x}" y="${y + 3.4}">${l}</text></g>`; });
    }
    const missT = new Set(); if (marks) marks.missing.forEach(m => m.n.terms.forEach(t => missT.add(t)));
    let pulse = '';
    lab.terms.forEach(t => {
      const p = PP.termPos(t), lv = lastSim.live(t), miss = missT.has(t) && !hl.terms.has(t);
      const c = ['term', sel === t && 'sel', meterOn && mA === t && 'pr', meterOn && mB === t && 'pb'].filter(Boolean).join(' ');
      ts_ += `<g class="${c}" data-t="${t}"${lv ? ` data-live="${lv}"` : ''}>${miss ? `<circle class="miss" cx="${p.x}" cy="${p.y}" r="13"/>` : ''}<circle class="ring" cx="${p.x}" cy="${p.y}" r="10.5"/><circle class="screw" cx="${p.x}" cy="${p.y}" r="7" fill="url(#pn-sc)"/><path class="x" d="M${p.x - 4} ${p.y}h8M${p.x} ${p.y - 4}v8"/></g>`;
      if (hl.terms.has(t)) pulse += `<circle cx="${p.x}" cy="${p.y}" r="13"/>`;
    });
    put($('L-terms'), ts_);
    put($('fxpulse'), pulse);
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
    put($('status'), s);
    const ph = st.power ? '带电中：用下面的按钮试车，不能接线' : meterOn ? '万用表：点一个端子放红表笔，再点一个放黑表笔' : demo ? '演示中：点「下一根」一根根看' : sel ? '已选中一个端子，再点另一个端子（也可以从端子直接拖到另一个端子）' : follow ? '跟着接：照闪的两个端子接' : isMobile() ? '点端子再点端子接线；双指缩放，按住不放出放大镜' : '点一个端子再点另一个就接上一根线，也可以拖线；Ctrl+滚轮缩放，双击元件放大';
    txt($('phint'), ph);
    txt($('zval'), Math.round(zoomK() * 100) + '%');
    const pw = st.power ? '断电' : '送电';
    txt($('power'), pw); attr($('power'), 'aria-pressed', st.power);
    const mp = document.querySelector('.mbar .pw'); if (mp) { txt(mp, pw); attr(mp, 'aria-pressed', st.power); }
    const mm = document.querySelector('.mbar [data-proxy="meterbtn"]'); if (mm) attr(mm, 'aria-pressed', meterOn);
    prop($('del'), 'hidden', selWire === null); prop($('reset'), 'hidden', !e.preset);
    prop($('rand'), 'hidden', !!e.preset);
    attr($('route'), 'aria-pressed', PREF.route === 'duct'); attr($('tags'), 'aria-pressed', !!PREF.tags); attr($('snd'), 'aria-pressed', !!(PP.sound && PP.sound.on()));
    const lock = !!(exam && !exam.done); prop($('hint'), 'disabled', lock); prop($('demo'), 'disabled', lock); prop($('rand'), 'disabled', lock);
    prop($('undo'), 'disabled', !(undo.length > 0 && !st.power && !demo));
    document.querySelectorAll('.mbar [data-proxy]').forEach(b => { const t = $(b.dataset.proxy); prop(b, 'disabled', !!(t && t.disabled)); });
    document.querySelectorAll('#ops [data-btn]').forEach(b => attr(b, 'aria-pressed', !!st.p[b.dataset.btn]));
    const tg = (id, k, a, b) => { const el = $(id); if (el) { txt(el, st[k] ? a : b); attr(el, 'aria-pressed', !!st[k]); } };
    tg('tripbtn', 'trip', '按复位（FR）', '模拟电机过载'); const TLb = ex().targetLabels || ['拿走工件', '放工件（挡住传感器）']; tg('targetbtn', 'target', TLb[0], TLb[1]);
    tg('hmibtn', 'hmi', '触摸屏：停止', '触摸屏：启动'); tg('estopbtn', 'estop', '旋转复位急停', '拍下急停');
  }

  // ---------- 万用表 ----------
  function drawMeter() {
    prop($('meter'), 'hidden', !meterOn); attr($('meterbtn'), 'aria-pressed', meterOn);
    if (!meterOn) return;
    const st = lab.st, mode = !st.power ? '蜂鸣 / 电阻档（断电量通断）' : '电压档（带电量电压）';
    const res = mA && mB ? lab.meter(mA, mB, lastSim) : null;
    txt($('lcd'), res ? res.v : '----');
    put($('mi'), `<div>${mode}</div><div><span class="probe-r">红表笔</span> ${mA ? tname(mA) : '点一个端子'} · <span class="probe-b">黑表笔</span> ${mB ? tname(mB) : mA ? '再点一个端子' : '—'}</div>${res ? `<div>${res.n}</div>` : ''}`);
    // 送电前检查：量过电源两端
    if (res && !st.power) {
      chk = chk || { checked: false, metered: false, tight: false, safe: false };
      const sa = ex().sources[mA], sb = ex().sources[mB];
      if (sa && sb && sa !== sb && res.v !== '0.0 Ω') chk.metered = true;
    }
  }

  // ---------- 进度条：现在该做哪一步（每一步：做什么 · 怎样算完成） ----------
  const passed = () => ts.done && ts.res.length === ex().test.length && ts.res.every(Boolean);
  function drawSteps() {
    const el = $('steps'), e = ex();
    if (faultMode) { prop(el, 'hidden', true); return; }
    prop(el, 'hidden', false);
    const c = lab.check(), good = c.rows.filter(x => !x.bad && !x.left).length;
    const St = e.preset
      ? [['power', '送电看现象', seen, '按试车步骤操作，看哪一步不对'],
        ['check', '找出错线改好', c.ok, c.ok ? '接线已和图纸一致' : '对照图纸校线、用万用表量'],
        ['power', '试车通过', passed(), '断电改好后重新送电']]
      : [['hint', '接线', c.ok, `同线号的端子连起来：${good} / ${c.rows.length} 个线号已接通`],
        ['check', '校线', !!(chk && chk.checked), '点「检查接线」，全部正确才算'],
        ['meter', '量电源', !!(chk && chk.metered), '断电用万用表量电源两端，不能“嘀”'],
        ['power', '送电试车', passed(), '按试车步骤一步步操作，全部通过']];
    const k = St.findIndex(x => !x[2]);
    put(el, St.map(([a, t, d, sub], i) => `<li class="${d ? 'done' : i === k ? 'cur' : ''}"><button data-step="${a}"><span class="no">${d ? '✓' : i + 1}</span><span><b>${t}</b><small>${sub}</small></span></button></li>`).join(''));
  }

  // ---------- 考核模式：不看提示和演示，自己看图接完、试车通过，按用时和返工次数打分 ----------
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function drawExam() {
    const b = $('exambar');
    if (!exam) { put(b, ''); return; }
    const t = ((exam.done ? exam.end : Date.now()) - exam.t0) / 1000, best = BEST[ex().id];
    put(b, `<div class="bar exam"><span class="t"><b>${exam.done ? '考核完成' : '考核中'}</b>　用时 <b class="mono">${mmss(t)}</b> · 校线 ${exam.checks} 次 · 查出错线 ${exam.wrong.size} 根 · 试车失败 ${exam.fails} 次 · 短路 ${exam.shorts} 次${exam.done ? ` · 得分 <b class="score">${exam.score}</b>` : ''}${best ? `　<span class="cap">最好 ${best.score} 分 / ${mmss(best.t)}</span>` : ''}</span><button class="b small ghost" id="examexit">${exam.done ? '关闭' : '退出考核'}</button></div>`);
  }
  function startExam() {
    if (!offOnly()) return;
    demo = null; drawDemo(); faultMode = null; lab.fault = null; drawFault(); meterOn = false; mA = mB = null;
    snapW(); lab.wires = ex().preset ? ex().preset.map(w => [...w]) : []; sel = null; selWire = null; clearHl(); changed(); chk = null; seen = false;
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
    // 只说练习里做到了什么，不替真实上岗下结论
    const lv = sc >= 90 ? '优秀：这个回路你已经能独立、快速地接对了' : sc >= 70 ? '合格：再练几遍，争取一次接对' : '还要多练：先用「读图题」把图看懂再接';
    say(`考核完成：${sc} 分`, `<p>用时 <b>${mmss(t)}</b>，校线 ${exam.checks} 次，查出错线 ${exam.wrong.size} 根，试车失败 ${exam.fails} 次，短路 ${exam.shorts} 次。</p><p><b>${lv}</b>${better && old ? '　（刷新了最好成绩！）' : ''}</p>`, sc >= 70 ? 'good' : 'hint');
    drawExam();
  }

  // ---------- 试车步骤 ----------
  function drawTest() {
    const T = ex().test, n = ts.res.filter(x => x === true).length;
    const head = ts.done && ts.res.length === T.length && ts.res.every(Boolean) ? '全部通过' : ts.res.includes(false) ? '有一步没通过' : lab.st.power ? `进行中 ${n}/${T.length}` : '送电后自动开始';
    put($('test'), `<h3>试车步骤<span>${head}</span></h3><ol>${T.map((s, i) => {
      const r = ts.res[i], c = r === true ? 'pass' : r === false ? 'fail' : (!ts.done && lab.st.power && i === ts.i) || (!lab.st.power && i === 0 && !ts.res.length) ? 'cur' : '';
      return `<li class="${c}"><div><b>${s.act}</b> <span class="exp">→ 应该：${s.exp}</span></div><span class="res">${r === true ? '通过' : r === false ? '不对' : c === 'cur' ? '下一步' : '待测'}</span></li>`;
    }).join('')}</ol>`);
  }
  // 通关小结：学会了什么、错在哪、用时；徽章只在试车验证通过时给
  function summary(id) {
    const t = (Date.now() - stat.t0) / 1000, B = [];
    if (!stat.wrong && !stat.shorts) B.push(['clean', '一次接对']);
    if (!stat.shorts) B.push(['safe', '零短路']);
    if (t < 300) B.push(['fast', '5 分钟内完成']);
    const old = P.learn(id).badges || [];
    P.mark(id, 'badges', [...new Set([...old, ...B.map(b => b[0])])]);
    const goal = String(ex().goal || ex().task || '').replace(/<[^>]+>/g, '');
    return `<div class="summary"><h4>通关小结</h4><ul><li><b>学会了：</b>${goal}</li><li><b>用时：</b>${mmss(t)}　<b>接错：</b>${stat.wrong} 根　<b>短路：</b>${stat.shorts} 次</li></ul>${B.length ? `<p class="badges">${B.map(b => `<span class="badge">${b[1]}</span>`).join('')}</p>` : ''}</div>`;
  }
  function evalStep() {
    const T = ex().test, s = T[ts.i], r = lastSim;
    if (r.wasShort) { ts.res[ts.i] = false; ts.done = true; return; }
    const ok = !!s.ok(r); ts.res[ts.i] = ok; ts.i++;
    if (!ok && exam && !exam.done) { exam.fails++; drawExam(); }
    if (!ok) { ts.done = true; say(`第 ${ts.i} 步不对：${s.act} 后应该「${s.exp}」`, `<p>${s.fail(r) || '对照图纸再检查一遍接线。'}</p><p>断电改好后重新送电，会从第 1 步重新试车。</p>`, 'bad'); }
    else if (ts.i >= T.length) {
      ts.done = true;
      if (faultMode) faultRunDone();
      else if (exam && !exam.done) finishExam();
      else {
        const id = ex().id, wasFollow = follow;
        if (follow) { P.mark(id, 'follow'); follow = false; }
        const solo = !assist && !wasFollow;
        if (solo) { P.mark(id, 'solo'); DONE[id] = true; store.set('pp-done-v3', DONE); }
        renderList(); drawGoal();
        const nextStep = solo ? (ex().preset ? '故障排除了！可以点「考核」计时再做一遍。' : '你是自己接对的，「考核」已经解锁。') : wasFollow ? '跟着接完成了。下一步点「独立接」，不看提示自己接一遍。' : '这次用了提示或演示，点「独立接」自己再接一遍才算学会。';
        say('试车全部通过 ✓', `<p>${s.note ? s.note + ' ' : ''}每一步动作都符合图纸要求。</p><p><b>${nextStep}</b></p>${solo ? summary(id) : ''}`, 'good');
      }
    } else say(`第 ${ts.i} 步通过`, `<p>${s.note ? s.note + ' ' : ''}下一步：<b>${T[ts.i].act}</b>，应该「${T[ts.i].exp}」。</p>`, 'good');
  }
  function fire(ev) {
    if (!lab.st.power && ev !== 'power_on') return;
    const T = ex().test, s = T[ts.i];
    if (ts.done || !s || s.ev !== ev) return;
    evalStep();
    while (!ts.done && T[ts.i] && T[ts.i].ev === 'kt_done' && lastSim.ktDone) evalStep();
    invalidate();
  }

  // ---------- 主循环：render() 只算状态，画面交给下一帧的 paint() ----------
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
  // 下一帧画；窗口被挡住、某些内嵌浏览器不出帧时，150ms 后用定时器兜底
  let frame = 0, frameT = 0;
  const invalidate = () => { if (!frame) { frame = requestAnimationFrame(paint); frameT = setTimeout(paint, 150); } };
  function paint() {
    cancelAnimationFrame(frame); clearTimeout(frameT); frame = frameT = 0; if (!lab) return;
    drawPanel(); if (view === 'sch') paintSchematic(); if (view === 'lad') paintLadder();
    drawStatus(); drawMeter(); drawTest(); drawSteps();
  }
  function render() {
    let r = lab.sim();
    if (r.power && r.short) {
      lab.applyEv('power_off');
      say('短路！已跳闸断电', `<p>${shortMsg(r)}</p><p>真实情况下熔断器会烧、断路器会跳，还可能打出电弧伤人。断电状态下点「检查接线」或用万用表蜂鸣档找出错线。</p>`, 'bad');
      r = lab.sim(); r.wasShort = true; stat.shorts++; if (exam && !exam.done) { exam.shorts++; drawExam(); }
    }
    lab.ktTick(r);
    if (PP.sound && r.power && lastSim.power && !r.wasShort) { const ch = e => ['km', 'kmx', 'kmc', 'ka', 'kt'].includes(DEV[e].kind) && !!r.on[e] !== !!(lastSim.on || {})[e]; const d = ex().devs.find(ch); if (d) PP.sound.click(!!r.on[d]); }
    lastSim = r;
    if (lab.st.ktStart == null) lab.st.ktFired = false;
    invalidate(); saveSoon();
    // 时间继电器计时：每 200ms 重新算一次；画面上只有 KT 自己的进度在变，其他层内容没变不会重写
    clearTimeout(ktTimer);
    if (lab.st.power && lab.st.ktStart != null) {
      if (!r.ktDone) ktTimer = setTimeout(render, 200);
      else if (!lab.st.ktFired) { lab.st.ktFired = true; ktTimer = setTimeout(() => fire('kt_done'), 0); }
    }
    return r;
  }
  function doEv(ev) { lab.applyEv(ev); if (ev === 'power_on') lab.st.ktFired = false; const r = render(); if (r.wasShort && ev === 'power_on') { ts.res[0] = false; ts.done = true; invalidate(); return; } fire(ev); }

  // ---------- 撤销：所有改线操作先存一份 ----------
  const snapW = () => { undo.push(lab.wires.slice()); if (undo.length > 60) undo.shift(); };
  function doUndo() {
    if (!undo.length || demo || !offOnly()) return;
    lab.wires = undo.pop(); sel = null; selWire = null; clearHl(); changed();
    if (faultMode && lab.fault && lab.fault.kind === 'wire' && !lab.wires.includes(lab.fault.wref)) lab.fault = null;
    say('已撤销上一步', `<p>现在盘上有 ${lab.wires.length} 根线。</p>`); faultProgress(); render();
  }

  // ---------- 操作 ----------
  function onTerm(t) {
    hidePicker();
    if (meterOn) {
      if (!mA || mB) { mA = t; mB = null; } else if (t !== mA) mB = t;
      render();
      if (mA && mB) {
        const m = lab.meter(mA, mB, lastSim);
        if (m.v === '0.0 Ω' && PP.sound) PP.sound.beep();
        if (faultMode) { faultMode.log.push([tname(mA), tname(mB), m.v, lab.st.power ? '带电' : '断电']); faultRetest(mA, mB); drawFault(); }
      }
      return;
    }
    if (lab.st.power) { say('先断电再接线', '<p>带电接线非常危险。点「断电」后再动手。想带电量电压，先点「万用表」。</p>', 'bad'); return; }
    if (demo) { say('正在演示', '<p>先点「退出演示」再自己接线。</p>'); return; }
    selWire = null;
    if (!sel) { sel = t; clearHl(); say(`选中了 ${tname(t)}`, '<p>再点另一个端子就接上一根线。再点一次这个端子取消。</p>'); render(); return; }
    if (sel === t) { sel = null; render(); return; }
    const a = sel; sel = null; connect(a, t);
  }
  const wrongActs = a => `<button class="b small" data-act="undo">撤销这根</button><button class="b small" data-act="rewire" data-t="${a}">改接</button><button class="b small" data-act="look" data-t="${a}">看图</button><button class="b small ghost" data-act="why">为什么</button>`;
  function connect(a, b) {
    const pre = lab.diagnose(a, b, true);
    if (pre.code === 'DUP') { say('这两个端子已经接过了'); render(); return; }
    if (pre.code === 'TERM_FULL') { say('这个端子已经压了两根线', `<p>${pre.msg}</p>`, 'bad'); render(); return; }
    snapW(); lab.wires.push([a, b]); clearHl(); changed();
    const c = lab.check(), dg = learning() ? lab.diagnose(a, b) : { code: '' };
    if (dg.code) {
      stat.wrong++; hl.wires.add(lab.wires.length - 1);
      const fix = dg.fix && dg.fix.length ? `<p>按图纸，${tname(a)} 应该和这些端子连：${dg.fix.map(tname).join('、')}。</p>` : '';
      say('这根线和图纸不一致', `<p>${tname(a)} ↔ ${tname(b)}：${dg.msg}</p><div class="why" hidden><p>每一段线都有一个线号，<b>线号相同的端子才能连在一起</b>。在左边图纸上点这段线，就能看到它要连哪几个端子。</p>${fix}</div>`, 'bad', wrongActs(a));
      render(); return;
    }
    tourCheck();
    if (faultProgress()) { render(); return; }
    if (follow && !c.ok) { giveHint(); return; }
    if (exam && !exam.done) say(`接上了：${tname(a)} ↔ ${tname(b)}`, `<p>已接 ${lab.wires.length} 根。考核中不提示对错，接完自己校线。</p>`);
    else if (c.ok) say('全部接对了！', '<p>按规矩送电前要检查：点「检查接线」校线，再用「万用表」量一下电源两端有没有短路，然后送电试车。</p>', 'good');
    else say(`接上了：${tname(a)} ↔ ${tname(b)}`, `<p>还没接完的线号：${c.missing.map(m => `<span class="mono">${nlab(m.n)}</span>`).join('、') || '无'}。</p>`);
    render();
  }
  function onAct(b) {
    const a = b.dataset.act;
    if (a === 'why') { const w = b.closest('.msg').querySelector('.why'); if (w) w.hidden = !w.hidden; return; }
    closeSheet();
    if (a === 'undo') doUndo();
    if (a === 'rewire') { doUndo(); if (!lab.st.power) { sel = b.dataset.t; say(`改接：已选中 ${tname(sel)}`, '<p>再点它真正要连的那个端子。不知道是哪个，就点「看图」。</p>', 'hint'); render(); } }
    if (a === 'look') { const n = lab.nm[b.dataset.t]; if (n) { selectNet(n.id); if (isMobile()) setTab('draw'); } else { view = 'sch'; renderTabs(); renderView(); if (isMobile()) setTab('draw'); } }
  }
  function selectWire(i) {
    selWire = selWire === i ? null : i; sel = null; clearHl();
    if (selWire !== null) {
      const w = lab.wires[i], na = lab.nm[w[0]], nb = lab.nm[w[1]], why = exam && !exam.done ? '' : lab.whyWrong(w[0], w[1]);
      hl.terms.add(w[0]); hl.terms.add(w[1]); hl.wires.add(i);
      if (na && na === nb) { hl.net = na.id; if (view !== 'sch') { view = 'sch'; renderTabs(); renderView(); } }
      say(na && na === nb ? `这根线是线号 ${nlab(na)}` : '选中了一根线', `<p>${tname(w[0])} ↔ ${tname(w[1])}。${na && na === nb ? '图纸上对应的线已经标成橙色。' : ''}</p>${why ? `<p>这根线有问题：${why}</p>` : ''}<p>断电状态下点「删除选中的线」可以拆掉它。</p>`, why ? 'hint' : '', `<button class="b small danger" data-act2="del">删除这根线</button>`);
    }
    render();
  }
  function selectNet(id) {
    const n = ex().nets.find(z => z.id === id); if (!n) return;
    clearHl(); hl.net = id;
    if (exam && !exam.done) { say(`线号 ${nlab(n)}`, '<p>考核中：自己顺着图上这段线看它碰到了哪些端子，再到盘上去接。</p>', 'hint'); render(); return; } n.terms.forEach(t => hl.terms.add(t));
    lab.wires.forEach((w, i) => { if (lab.nm[w[0]] === n && lab.nm[w[1]] === n) hl.wires.add(i); });
    say(`线号 ${nlab(n)}`, `<p>图上这段线连着 ${n.terms.length} 个端子，在盘上把它们连到一起：</p><ul>${n.terms.map(t => `<li>${tname(t)}</li>`).join('')}</ul><p>盘上对应的端子在闪${hl.wires.size ? `，已经接好的 ${hl.wires.size} 根线标成了橙色` : ''}。</p>`, 'hint', isMobile() ? '<button class="b small primary" data-act2="toboard">去盘面接</button>' : '');
    focusTerms(n.terms); render();
  }
  function giveHint() {
    const c = lab.check(); clearHl(); sel = null;
    if (c.wrong.length) {
      const i = c.wrong[0], w = lab.wires[i]; selWire = i; hl.terms.add(w[0]); hl.terms.add(w[1]); hl.wires.add(i);
      say('先拆掉这根接错的线', `<p>${tname(w[0])} ↔ ${tname(w[1])}。${lab.whyWrong(w[0], w[1])}</p><p>它已经被选中了，断电状态下点「删除选中的线」。</p>`, 'hint', `<button class="b small danger" data-act2="del">删除这根线</button>`); focusTerms(w); render(); return;
    }
    if (!c.missing.length) { say('已经全部接好', '<p>下一步：「检查接线」校一遍 →「万用表」量电源两端 →「送电」试车。</p>', 'good'); render(); return; }
    const n = c.missing[0].n, f = c.f, base = f(n.terms[0]);
    const b = n.terms.find(t => f(t) !== base), inBase = n.terms.filter(t => f(t) === base);
    const a = inBase.slice().reverse().find(t => countAt(t) < 2) || inBase[0];
    hl.terms.add(a); hl.terms.add(b); hl.net = n.id;
    if (view !== 'sch') { view = 'sch'; renderTabs(); renderView(); }
    say(`下一根：线号 ${nlab(n)}`, `<p>把 ${tname(a)} 接到 ${tname(b)}。</p><p>为什么？图纸上这两个端子都在线号 <span class="mono">${nlab(n)}</span> 这段线上（图上已标橙色），线号相同就要连在一起。</p>`, 'hint'); focusTerms([a, b]); render();
  }
  const countAt = t => lab.wires.filter(w => w[0] === t || w[1] === t).length;
  // 学习模式：不在考核、不是故障题、不在随机故障里，接错马上提示
  const learning = () => !(exam && !exam.done) && !ex().preset && !lab.fault && !faultMode;
  function startFollow() {
    if (!offOnly()) return;
    demo = null; drawDemo(); faultMode = null; lab.fault = null; drawFault(); meterOn = false;
    snapW(); lab.wires = []; changed(); follow = true; assist = true; ts = { i: 0, res: [], done: false };
    drawGoal(); giveHint();
  }
  function startSolo() {
    if (!offOnly()) return;
    demo = null; drawDemo(); faultMode = null; lab.fault = null; drawFault(); meterOn = false; follow = false; assist = false;
    snapW(); lab.wires = ex().preset ? ex().preset.map(w => [...w]) : []; sel = null; selWire = null; clearHl(); changed(); chk = null; ts = { i: 0, res: [], done: false };
    stat = { t0: Date.now(), wrong: 0, checks: 0, shorts: 0 };
    drawGoal();
    say(ex().preset ? '自己排故' : '独立接线', ex().preset ? '<p>线已经恢复成故障现场。不看提示：送电看现象 → 断电用万用表量 → 改好 → 试车通过。</p>' : '<p>盘上的线已经清空。不用提示和演示，只看图纸接完，再校线、量电源、送电试车。全部通过就算学会了这一题。</p><p>接错的线会马上标出来，自己拆掉重接不算违规。</p>', 'hint');
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
      <div><h2>接线表（${c.length} 根）</h2><table><tr><th></th><th>线号</th><th>起点</th><th>终点</th></tr>${c.map((w) => `<tr><td>${box('')}</td><td class="mono">${nlab(lab.nm[w[0]])}</td><td>${PP.tplain(w[0])}</td><td>${PP.tplain(w[1])}</td></tr>`).join('')}</table></div></div>
      <div class="pc-grid"><div><h2>送电前自检</h2><ul>${['对照图纸逐根校线，线号和图纸一致', '端子压接牢固、不露铜，螺丝拧紧', '万用表蜂鸣档量电源两端，没有短路', '柜内没有人作业，通知周围人员'].map(t => `<li>${box(t)}</li>`).join('')}</ul></div>
      <div><h2>试车步骤</h2><ol>${e.test.map(s => `<li>${box(`${s.act} → 应该：${s.exp}`)}</li>`).join('')}</ol></div></div>
      <footer>师傅签字 ____________　　用时 ______ 分钟　　一次试车通过 □ 是 □ 否</footer>`;
    document.body.classList.add('pcmode');
    const done = () => { document.body.classList.remove('pcmode'); G.removeEventListener('afterprint', done); };
    G.addEventListener('afterprint', done);
    G.print();
  }

  // ---------- 相机：视野用 viewBox 表示；手势进行中只改 #camera 的 transform（GPU 合成），松手再写回 viewBox ----------
  let vb = { x: 0, y: 0, w: VB_W };
  const vbH = (w = vb.w) => w * VB_H / VB_W;
  const zoomK = () => VB_W / vb.w;
  function setVB(v) {
    const w = clamp(v.w, VB_W / 4, VB_W), h = vbH(w);
    vb = { w, x: clamp(v.x, 0, VB_W - w), y: clamp(v.y, 0, VB_H - h) };
    const s = `${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;
    for (const id of ['panel', 'fxflow', 'fxpulse', 'fxtop']) $(id).setAttribute('viewBox', s);
    $('zval').textContent = Math.round(zoomK() * 100) + '%';
  }
  function setZoom(k, cx = vb.x + vb.w / 2, cy = vb.y + vbH() / 2) { k = clamp(Math.round(k * 4) / 4, 1, 4); const w = VB_W / k; setVB({ w, x: cx - w / 2, y: cy - vbH(w) / 2 }); }
  // 让这些端子都在视野里（放大时才需要平移，不改缩放）
  function focusTerms(list) {
    if (zoomK() <= 1 || !list.length) return;
    const ps = list.map(PP.termPos), inside = ps.every(p => p.x > vb.x + 10 && p.x < vb.x + vb.w - 10 && p.y > vb.y + 10 && p.y < vb.y + vbH() - 10);
    if (inside) return;
    const cx = ps.reduce((s, p) => s + p.x, 0) / ps.length, cy = ps.reduce((s, p) => s + p.y, 0) / ps.length;
    setVB({ w: vb.w, x: cx - vb.w / 2, y: cy - vbH() / 2 });
  }
  function zoomTo(d) {
    const v = DEV[d]; if (!v) return;
    setZoom(Math.max(zoomK(), 2), v.x + v.w / 2, v.y + v.h / 2);
    if (isMobile()) setTab('board');
    $('stage').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  const panelRect = () => $('panel').getBoundingClientRect();
  function toBoard(cx, cy, r = panelRect()) { return { x: vb.x + (cx - r.left) / r.width * vb.w, y: vb.y + (cy - r.top) / r.height * vbH(), ppu: r.width / vb.w }; }
  function toStage(x, y) { const r = panelRect(), s = $('stage').getBoundingClientRect(); return { x: r.left - s.left + (x - vb.x) / vb.w * r.width, y: r.top - s.top + (y - vb.y) / vbH() * r.height }; }

  // ---------- 端子命中：网格索引找最近的端子；屏幕上至少 44px 的热区；两个候选太近就让人选 ----------
  const CELL = 32;
  let grid = new Map();
  function buildGrid() {
    grid = new Map();
    for (const t of lab.terms) { const p = PP.termPos(t), k = Math.floor(p.x / CELL) + ',' + Math.floor(p.y / CELL); if (!grid.has(k)) grid.set(k, []); grid.get(k).push({ t, x: p.x, y: p.y }); }
  }
  function near(pt, R) {
    const out = [];
    for (let gx = Math.floor((pt.x - R) / CELL); gx <= Math.floor((pt.x + R) / CELL); gx++)
      for (let gy = Math.floor((pt.y - R) / CELL); gy <= Math.floor((pt.y + R) / CELL); gy++)
        for (const c of grid.get(gx + ',' + gy) || []) { const d = Math.hypot(c.x - pt.x, c.y - pt.y); if (d <= R) out.push([c.t, d]); }
    return out.sort((a, b) => a[1] - b[1]);
  }
  function pickTerm(pt) {
    const c = near(pt, 22 / pt.ppu);
    if (!c.length) return { hit: null };
    if (c[1] && c[1][1] - c[0][1] < 6 / pt.ppu) return { hit: null, amb: c.slice(0, 3).map(x => x[0]) };
    return { hit: c[0][0] };
  }
  // 吸附：进入 24px 吸住，离开 32px 才松开（滞回，防止在两个端子之间来回跳）
  let snapped = null;
  function snap(pt) {
    if (snapped) { const p = PP.termPos(snapped); if (Math.hypot(p.x - pt.x, p.y - pt.y) < 32 / pt.ppu) return snapped; }
    const c = near(pt, 24 / pt.ppu);
    return (snapped = c.length ? c[0][0] : null);
  }
  // 吸附圈和名字：HTML 元素，只用 transform 定位、opacity 显隐
  function showRing(t) {
    const ring = $('ring'), tip = $('snaptip');
    if (!t) { hideRing(); return; }
    const s = toStage(...(p => [p.x, p.y])(PP.termPos(t)));
    ring.style.transform = `translate3d(${s.x - 16}px,${s.y - 16}px,0)`; ring.classList.add('on');
    tip.innerHTML = PP.tplain(t); tip.style.transform = `translate3d(${s.x + 18}px,${s.y - 34}px,0)`; tip.classList.add('on');
  }
  function hideRing() { $('ring').classList.remove('on'); $('snaptip').classList.remove('on'); }
  // 歧义：在点的位置弹出两三个候选端子让人选
  function showPicker(list, cx, cy) {
    const pk = $('picker'), s = $('stage').getBoundingClientRect();
    pk.innerHTML = `<p>你点的是哪一个？</p>${list.map(t => `<button class="b small" data-pick="${t}">${tname(t)}</button>`).join('')}<button class="b small ghost" data-pick="">取消</button>`;
    pk.hidden = false;
    const x = clamp(cx - s.left - 90, 4, Math.max(4, s.width - 190)), y = clamp(cy - s.top + 14, 4, Math.max(4, s.height - 40));
    pk.style.transform = `translate3d(${x}px,${y}px,0)`;
    const b = pk.querySelector('button'); if (b) b.focus({ preventScroll: true });
  }
  function hidePicker() { const pk = $('picker'); if (pk && !pk.hidden) { pk.hidden = true; hideRing(); } }

  // ---------- 放大镜：<use> 引用盘面，不复制 DOM；用 transform 定位、opacity 显隐 ----------
  const MAG = 140;
  function moveMag(cx, cy, pt, t) {
    const s = $('stage').getBoundingClientRect(), mag = $('mag');
    let y = cy - s.top - MAG - 36; if (cy - MAG - 36 < 8) y = cy - s.top + 36;
    mag.style.transform = `translate3d(${cx - s.left - MAG / 2}px,${y}px,0)`;
    const w = MAG / (pt.ppu * 2.5);
    $('magsvg').setAttribute('viewBox', `${pt.x - w / 2} ${pt.y - w / 2} ${w} ${w}`);
    const mr = $('magring'), p = t ? PP.termPos(t) : null;
    if (p) { mr.setAttribute('cx', p.x); mr.setAttribute('cy', p.y); mr.setAttribute('r', 9); mr.style.opacity = 1; } else mr.style.opacity = 0;
    mag.classList.add('on');
  }
  const hideMag = () => $('mag').classList.remove('on');

  // ---------- 手势状态机：空闲 → 按下 →（拖线 / 平移 / 双指缩放 / 长按放大镜）；任何中断都走 abort() ----------
  const canWire = () => !lab.st.power && !meterOn && !demo;
  const gesture = (() => {
    const pts = new Map();
    let g = null, raf = 0, lp = 0, last = null;
    const cam = () => $('camera');
    const setT = (tx, ty, s) => { cam().style.transform = `translate3d(${tx}px,${ty}px,0) scale(${s})`; };
    const resetT = () => { cam().style.transform = ''; cam().classList.remove('is-gesturing'); };
    function abort() {
      clearTimeout(lp); lp = 0; cancelAnimationFrame(raf); raf = 0;
      if (g && (g.mode === 'pan' || g.mode === 'pinch')) resetT();
      g = null; pts.clear(); snapped = null;
      if (document.getElementById('mag')) { hideMag(); hideRing(); $('rubber').classList.remove('on'); }
    }
    // 一帧最多处理一次移动
    const req = fn => { last = fn; if (!raf) raf = requestAnimationFrame(() => { raf = 0; const f = last; last = null; if (f) f(); }); };
    function down(e) {
      if (e.button > 0 || !lab) return;
      if (e.target.closest('[data-btn]')) return;   // 柜门按钮：按住 / 松开由 press() 管
      hidePicker();
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { $('zoomwrap').setPointerCapture(e.pointerId); } catch (_) { }
      if (pts.size === 1) {
        // 拖线只从端子上开始：鼠标用正常热区，手指要几乎压在端子上（12px），免得滑动翻页时误拉出线
        const pt = toBoard(e.clientX, e.clientY), pk = pickTerm(pt), onT = e.pointerType === 'mouse' ? pk.hit : (near(pt, 12 / pt.ppu)[0] || [])[0];
        g = { mode: 'press', id: e.pointerId, sx: e.clientX, sy: e.clientY, target: e.target, type: e.pointerType, from: onT && canWire() ? onT : null };
        if (e.pointerType !== 'mouse') lp = setTimeout(() => { lp = 0; if (g && g.mode === 'press') { g.mode = 'mag'; snapped = null; magAt(g.sx, g.sy); } }, 400);
      } else if (pts.size === 2 && g && g.mode !== 'wire') {
        clearTimeout(lp); lp = 0; hideMag(); hideRing(); cancelAnimationFrame(raf); raf = 0;
        // 先把单指平移的结果写回 viewBox，双指缩放从干净的状态开始
        if (g.mode === 'pan' && (g.tx || g.ty)) { setVB({ w: vb.w, x: g.vb0.x - g.tx / g.ppu0, y: g.vb0.y - g.ty / g.ppu0 }); resetT(); }
        const [a, b] = [...pts.values()], r = panelRect(), v = $('zoomwrap').getBoundingClientRect();
        g = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, vb0: { ...vb }, ppu0: r.width / vb.w, ox: r.left - v.left, oy: r.top - v.top, left: r.left, top: r.top, s: 1, tx: 0, ty: 0 };
        cam().classList.add('is-gesturing');
      }
    }
    function magAt(cx, cy) { const pt = toBoard(cx, cy), t = snap(pt); moveMag(cx, cy, pt, t); if (t) showRing(t); else hideRing(); }
    function move(e) {
      if (!g) { if (e.pointerType === 'mouse' && !e.buttons && lab) req(() => { const pk = pickTerm(toBoard(e.clientX, e.clientY)); showRing(pk.hit); }); return; }
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (g.mode === 'press') {
        if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < 8) return;
        clearTimeout(lp); lp = 0;
        if (g.from) { g.mode = 'wire'; $('rubber').classList.add('on'); }
        else { g.mode = 'pan'; g.vb0 = { ...vb }; g.ppu0 = panelRect().width / vb.w; g.py = e.clientY; if (zoomK() > 1) cam().classList.add('is-gesturing'); }
      }
      const cx = e.clientX, cy = e.clientY;
      if (g.mode === 'mag') req(() => magAt(cx, cy));
      else if (g.mode === 'wire') req(() => {
        if (!g) return;
        const pt = toBoard(cx, cy), t = snap(pt), a = PP.termPos(g.from), p = t && t !== g.from ? PP.termPos(t) : pt, rb = $('rubber');
        rb.setAttribute('x1', a.x); rb.setAttribute('y1', a.y); rb.setAttribute('x2', p.x); rb.setAttribute('y2', p.y);
        rb.classList.toggle('snap', !!(t && t !== g.from)); showRing(t && t !== g.from ? t : null);
      });
      else if (g.mode === 'pan') req(() => {
        if (!g) return;
        if (zoomK() <= 1) { if (g.type !== 'mouse') { G.scrollBy(0, g.py - cy); g.py = cy; } return; }   // 不放大时单指拖动 = 滚动页面
        panCalc(cx, cy); setT(g.tx, g.ty, 1);
      });
      else if (g.mode === 'pinch' && pts.size >= 2) req(() => { if (g && g.mode === 'pinch') { pinchCalc(); setT(g.tx, g.ty, g.s); } });
    }
    // 平移量（夹在盘面边界内）
    function panCalc(cx, cy) {
      const { vb0, ppu0 } = g;
      g.tx = clamp(cx - g.sx, (vb0.x - (VB_W - vb0.w)) * ppu0, vb0.x * ppu0); g.ty = clamp(cy - g.sy, (vb0.y - (VB_H - vbH(vb0.w))) * ppu0, vb0.y * ppu0);
    }
    // 以两指中点为缩放中心：起始中点下的那一点，跟着手指走到当前中点
    function pinchCalc() {
      const [a, b] = [...pts.values()], k0 = VB_W / g.vb0.w, k1 = clamp(k0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0, 1, 4), s = k1 / k0;
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      g.s = s; g.tx = (m.x - g.left) - s * (g.m0.x - g.left); g.ty = (m.y - g.top) - s * (g.m0.y - g.top);
    }
    function up(e) {
      if (!g || !pts.has(e.pointerId)) { pts.delete(e.pointerId); return; }
      // 松手时按手指的最终位置结算（不用上一帧的值，帧率低时也不会“弹回去”一截）
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (g.mode === 'pinch' && pts.size === 2) pinchCalc();
      if (g.mode === 'pan' && zoomK() > 1) panCalc(e.clientX, e.clientY);
      pts.delete(e.pointerId);
      clearTimeout(lp); lp = 0; cancelAnimationFrame(raf); raf = 0; last = null;
      const m = g.mode, gg = g;
      if (m === 'pinch') {
        if (pts.size) return;   // 等所有手指都抬起
        const w = gg.vb0.w / gg.s; setVB({ w, x: gg.vb0.x - gg.tx / (gg.s * gg.ppu0), y: gg.vb0.y - gg.ty / (gg.s * gg.ppu0) }); resetT(); g = null; return;
      }
      g = null; pts.clear();
      if (m === 'pan') { if (zoomK() > 1 && (gg.tx || gg.ty)) setVB({ w: vb.w, x: gg.vb0.x - gg.tx / gg.ppu0, y: gg.vb0.y - gg.ty / gg.ppu0 }); resetT(); return; }
      if (m === 'mag') { const t = snap(toBoard(e.clientX, e.clientY)); hideMag(); hideRing(); snapped = null; if (t) onTerm(t); return; }
      if (m === 'wire') {
        const t = snap(toBoard(e.clientX, e.clientY)); $('rubber').classList.remove('on'); hideRing(); snapped = null;
        if (t && t !== gg.from) { sel = null; selWire = null; connect(gg.from, t); }
        return;
      }
      if (m === 'press') tap(e.clientX, e.clientY, gg.target);
    }
    function cancel(e) { if (g) { if (g.mode === 'pinch' || g.mode === 'pan') { pts.delete(e.pointerId); if (pts.size) return; } abort(); } }
    return { abort, down, move, up, cancel, active: () => !!g };
  })();
  // 轻点：先看是不是柜门上的工件 / 急停，再找端子，再找导线和元件
  function tap(cx, cy, target) {
    const el = target && target.closest ? target : document.elementFromPoint(cx, cy);
    if (el && el.closest('[data-target]')) { toggle('target'); return; }
    if (el && el.closest('[data-estop]')) { toggle('estop'); return; }
    const pt = toBoard(cx, cy), w = el && el.closest('[data-w]');
    // 点在线身上：除非手指几乎压在端子上（10px 内），否则选线——短线两头的端子很近，不能让端子热区把线盖住
    if (w && !meterOn) { const c = near(pt, 10 / pt.ppu); if (!c.length) { selectWire(+w.dataset.w); return; } }
    const pk = pickTerm(pt);
    if (pk.amb) { showPicker(pk.amb, cx, cy); return; }
    if (pk.hit) { onTerm(pk.hit); return; }
    if (w) { selectWire(+w.dataset.w); return; }
    const d = el && el.closest('[data-dev]');
    if (d) { showInfo(d.dataset.dev); clearHl(); hl.dev = d.dataset.dev; render(); return; }
    if (sel) { sel = null; render(); }
  }
  // 键盘：方向键在端子之间移动，回车 / 空格接线或下表笔，Esc 取消
  let kf = null;
  function keyNav(e) {
    if (!lab) return;
    const k = e.key;
    if (k === '+' || k === '=') { setZoom(zoomK() + 0.5); e.preventDefault(); return; }
    if (k === '-') { setZoom(zoomK() - 0.5); e.preventDefault(); return; }
    if (k === 'Escape') { sel = null; hidePicker(); render(); return; }
    if ((k === 'Enter' || k === ' ') && kf) { e.preventDefault(); onTerm(kf); showRing(kf); return; }
    const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[k];
    if (!dir) return;
    e.preventDefault();
    const p0 = kf ? PP.termPos(kf) : { x: vb.x, y: vb.y };
    let best = null, bs = 1e9;
    for (const t of lab.terms) {
      if (t === kf) continue;
      const p = PP.termPos(t), dx = p.x - p0.x, dy = p.y - p0.y, along = dx * dir[0] + dy * dir[1], side = Math.abs(dx * dir[1] - dy * dir[0]);
      if (kf && along <= 0) continue;
      const sc = (kf ? along : Math.hypot(dx, dy)) + side * 2;
      if (sc < bs) { bs = sc; best = t; }
    }
    if (best) { kf = best; focusTerms([kf]); showRing(kf); }
  }

  function offOnly() { if (lab.st.power) { say('先断电', '<p>带电不能接线、拆线。</p>', 'bad'); return false; } return true; }
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
    ts = { i: 0, res: [], done: false }; sel = null; seen = true; lab.dyn = {};
    if (faultMode) faultMode.seen = true;
    const c = lab.check();
    say('已送电', c.ok || lab.fault ? `<p>按下面的试车步骤操作：第 1 步「${ex().test[0].exp}」。</p>` : '<p>注意：接线和图纸不一致，可能动作不正常，甚至短路跳闸。</p>', c.ok ? 'good' : 'hint');
    doEv('power_on');
  }
  function onPower() {
    gesture.abort();
    if (lab.st.power) { doEv('power_off'); say('已断电', '<p>现在可以安全地接线、拆线，也可以用万用表蜂鸣档量通断。</p>'); return; }
    if (PREF.skipCheck || (chk && chk.checked && chk.metered && chk.tight && chk.safe)) { powerOn(); return; }
    chk = chk || { checked: false, metered: false, tight: false, safe: false };
    chk.open = true; drawChecklist();
    say('送电前先检查', '<p>新手最容易犯的错之一就是“通电前不检查”。下面四项做完再送电。前两项是自动判断的：点「检查接线」、再用「万用表」量一下电源两端。</p>', 'hint');
    if (isMobile()) $('checklist').scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      focusTerms(w);
    } else say('演示开始', '<p>点「下一根」，一根一根看怎么接。每接一根，图纸上对应的线号会亮起来。</p>', 'hint');
    if (view !== 'sch') { view = 'sch'; renderTabs(); renderView(); }
    drawDemo(); render();
  }
  function startDemo() {
    if (!offOnly()) return;
    meterOn = false; lab.fault = null; faultMode = null; drawFault();
    snapW(); lab.wires = []; changed();
    demo = { k: 0, all: PP.chain(ex()) }; assist = true; follow = false; drawGoal(); demoShow();
  }

  // ---------- 随机故障：看现象 → 缩小范围、量 → 判断 → 自己修 → 复测 → 试运行，全部做到才算完成 ----------
  const FTYPES = [['wire', '断线 / 虚接'], ['stuck', '触点粘连 / 卡住'], ['open', '触点接触不良'], ['coil', '线圈烧坏'], ['sensor', '传感器 / 元件损坏'], ['plcstop', 'PLC 处于 STOP']];
  const faultLoc = f => (f.kind === 'wire' ? { net: (lab.nm[f.wref[0]] || {}).id } : { dev: f.dev || f.a.split('.')[0] });
  const markName = m => (!m ? '' : m.net ? `线号 <span class="mono">${nlab(ex().nets.find(n => n.id === m.net))}</span>` : `元件 <b>${DEV[m.dev] ? DEV[m.dev].lab : m.dev}</b>`);
  const FPH = [['seen', '看现象'], ['meas', '缩小范围 · 量'], ['find', '判断位置和类型'], ['repair', '自己修'], ['retest', '复测'], ['run', '试运行']];
  function faultDone(k) { const f = faultMode, order = ['find', 'repair', 'retest', 'run', 'done']; if (k === 'seen') return !!f.seen; if (k === 'meas') return f.log.length > 0; return order.indexOf(f.phase) > order.indexOf(k) || f.phase === 'done'; }
  function drawFault() {
    const b = $('faultbox');
    if (!faultMode) { b.innerHTML = ''; return; }
    const m = faultMode.mark, f = lab.fault, ph = faultMode.phase;
    const steps = `<ol class="fb-steps fb-phase">${FPH.map(([k, t]) => `<li class="${faultDone(k) ? 'done' : ph === k || (ph === 'find' && !faultDone(k) && ['seen', 'meas'].includes(k)) ? 'cur' : ''}">${t}</li>`).join('')}</ol>`;
    let act = '';
    if (ph === 'find') act = `<div class="fb-act"><span class="fmark">${m ? `你标的：${markName(m)}` : '<span class="cap">在左边图纸上点出故障位置：点线 = 这根线，点符号 = 这个元件</span>'}</span>
      <select id="ftype" aria-label="故障类型"><option value="">— 故障类型 —</option>${FTYPES.map(([k, t]) => `<option value="${k}"${faultMode.type === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <button class="b small primary" id="fok">确认</button><button class="b small ghost" id="fshow">揭晓答案</button><button class="b small ghost" id="fexit">退出</button></div>`;
    else if (ph === 'repair') act = `<div class="fb-act"><span>${f && f.kind === 'wire' ? '<b>修法：</b>断电 → 选中这根断了的线删掉 → 重新接上。' : `<b>修法：</b>断电 → 换一个新的。`}</span>${f && f.kind !== 'wire' ? `<button class="b small primary" id="freplace">更换 ${DEV[faultLoc(f).dev] ? DEV[faultLoc(f).dev].lab : ''}</button>` : ''}<button class="b small ghost" id="fexit">退出</button></div>`;
    else if (ph === 'retest') act = `<div class="fb-act"><span><b>复测：</b>断电状态打开「万用表」，量一下刚修好的地方。</span><button class="b small ghost" id="fexit">退出</button></div>`;
    else if (ph === 'run') act = `<div class="fb-act"><span><b>试运行：</b>送电，按试车步骤从头走一遍，全部通过就修好了。</span><button class="b small ghost" id="fexit">退出</button></div>`;
    else act = `<div class="fb-act"><span><b>这个故障修好了 ✓</b></span><button class="b small primary" id="fagain">再练一个</button><button class="b small ghost" id="fexit">退出</button></div>`;
    b.innerHTML = `<div class="bar faultbox"><div class="fb-h"><b>故障排查</b><span class="cap">${ph === 'find' ? '盘上有一处毛病，接线看起来是对的' : faultMode.name}</span></div>${steps}${act}</div>
      <div class="flog"><h3>测量记录<span class="cap">　打开「万用表」量的每一次都会记在这里</span></h3>${faultMode.log.length ? `<div class="tblwrap"><table><tr><th>#</th><th>红表笔</th><th>黑表笔</th><th>状态</th><th>读数</th></tr>${faultMode.log.map((l, i) => `<tr><td class="mono">${i + 1}</td><td>${l[0]}</td><td>${l[1]}</td><td>${l[3]}</td><td class="mono">${l[2]}</td></tr>`).join('')}</table></div>` : '<p class="cap">还没量。带电用电压档：黑表笔放 N（或 0V），红表笔沿回路一点点量；断电用蜂鸣档一段段量。</p>'}</div>`;
  }
  function startFault() {
    if (lab.st.power) doEv('power_off');
    demo = null; drawDemo(); meterOn = false; follow = false;
    lab.wires = PP.chain(ex()); lab.fault = null; changed(); clearHl(); selWire = null; undo = [];
    const cands = lab.faultCands().filter(f => !lab.runTest({ fault: f }).pass);
    const f = cands[Math.floor(Math.random() * cands.length)];
    lab.fault = f; faultMode = { cands, tries: 0, log: [], mark: null, type: '', phase: 'find', seen: false, name: f.name, loc: null };
    if (chk) chk.open = false; drawChecklist();
    ts = { i: 0, res: [], done: false };
    if (view !== 'sch') { view = 'sch'; renderTabs(); renderView(); }
    say('随机故障已设置', '<p>线已经按图纸接好，但有一处故障：可能是<b>断线</b>、<b>触点粘连 / 接触不良</b>、<b>线圈烧坏</b>或<b>元件损坏</b>。</p><p>排查顺序：<b>看现象 → 缩小范围、量 → 判断 → 自己修 → 复测 → 试运行</b>。先送电走试车步骤，看哪一步不对。</p>', 'hint');
    drawFault(); render();
  }
  function markFault(m) {
    faultMode.mark = m; clearHl(); if (m.net) hl.net = m.net; else hl.dev = m.dev;
    say('已在图纸上标记', `<p>你标的故障位置：${markName(m)}。再选故障类型，点「确认」。</p>`, 'hint');
    drawFault(); render();
  }
  // 找到故障后进入“自己修”：记下修好后要复测的端子
  function toRepair(f) {
    faultMode.phase = 'repair'; faultMode.name = f.name;
    faultMode.loc = new Set(f.kind === 'wire' ? (lab.nm[f.wref[0]] || { terms: f.wref }).terms : lab.terms.filter(t => t.startsWith(faultLoc(f).dev + '.')));
  }
  function answerFault() {
    if (!faultMode) return;
    faultMode.type = $('ftype').value;
    const m = faultMode.mark, t = faultMode.type, f = lab.fault;
    if (!m) { say('先在图纸上点出故障位置', '<p>点图纸上的一段线（断线），或者点一个元件符号（触点、线圈、传感器）。</p>', 'hint'); return; }
    if (!t) { say('再选一下故障类型'); drawFault(); return; }
    const loc = faultLoc(f), locOk = loc.net ? m.net === loc.net : m.dev === loc.dev, typeOk = t === f.kind;
    if (locOk && typeOk) {
      toRepair(f);
      say('找对了！现在自己修', `<p>故障是：<b>${f.name}</b>。${faultMode.tries ? `试了 ${faultMode.tries + 1} 次` : '一次就找到了'}，量了 ${faultMode.log.length} 次。</p><p>现场找到故障不算完：<b>断电 → 修好 → 复测 → 试运行</b>，都做完才算修好。</p>`, 'good');
      if (lab.st.power) doEv('power_off');
    } else {
      faultMode.tries++;
      const why = locOk ? '<b>位置对了</b>，故障类型不对。想想：这个现象是“该通的不通”，还是“该断的不断”？' : typeOk ? '<b>故障类型对了</b>，位置不对。回到试车步骤，看哪一步开始不对，再用万用表量那一段。' : '位置和类型都不对。先看现象：哪个动作没出来？再顺着图纸量那一段。';
      say('不对，再查查', `<p>${why}</p>${faultMode.tries >= 2 ? `<p>提示：故障类型是 <b>${f.cat}</b>。</p>` : ''}`, 'bad');
    }
    drawFault(); render();
  }
  // 修的过程：断线被拆掉、重新接上，或者元件换了新的 → 进入复测
  function faultProgress() {
    if (!faultMode || faultMode.phase !== 'repair' || lab.fault) return false;
    if (!lab.check().ok) return false;
    faultMode.phase = 'retest';
    say('修好了，先复测', '<p>断电状态下打开「万用表」，量一下刚修好的地方：断线就量这根线两头（应该“嘀”），线圈量 A1–A2（几百欧）。</p>', 'hint');
    drawFault(); return true;
  }
  function faultRetest(a, b) {
    if (!faultMode || faultMode.phase !== 'retest' || lab.st.power) return;
    if (!faultMode.loc || !(faultMode.loc.has(a) || faultMode.loc.has(b))) return;
    faultMode.phase = 'run';
    say('复测正常 ✓', '<p>量过了，修好的地方没问题。最后一步：送电，按试车步骤从头走一遍。</p>', 'good');
  }
  function faultRunDone() {
    const ph = faultMode.phase;
    if (lab.fault) say('试车居然全过了', '<p>这个故障在当前接线下没表现出来，点「随机故障」换一个。</p>', 'hint');
    else if (ph === 'run') {
      faultMode.phase = 'done';
      say('排故完成 ✓', `<p>故障：<b>${faultMode.name}</b>。看现象 → 量 → 判断 → 修好 → 复测 → 试运行，一步没落下，量了 ${faultMode.log.length} 次。</p>`, 'good');
    } else if (ph === 'done') say('试车全部通过 ✓', '<p>这个故障已经修好了。点「再练一个」换一个故障。</p>', 'good');
    else say('试车通过了，但还没复测', '<p>修完要先断电复测：用万用表量一下修好的地方，再送电试运行。</p>', 'hint');
    drawFault();
  }

  // ---------- 新手引导：5 步，“接一根线”那步必须真接对才能往下走；可以跳过、可以重看 ----------
  const TOUR_KEY = 'pp-tour-v1';
  let tour = null;
  function tourSteps() {
    const w = PP.chain(ex())[0], m = isMobile();
    return [
      { tab: 'draw', el: '#side', t: '这是图纸', b: '图纸告诉你哪些端子要连在一起。图上每段线都有一个<b>线号</b>，点一下那段线，就知道它要连哪几个端子。' },
      { tab: 'board', el: '#stage', t: '这是盘面', b: `这就是柜子里的安装板，元件上的小螺丝就是<b>端子</b>，线就接在端子上。${m ? '双指可以放大，按住不放会出现放大镜。' : 'Ctrl + 滚轮可以放大，双击元件也行。'}` },
      { tab: 'board', el: '#stage', t: '自己接一根线', b: `先点 ${tname(w[0])}，再点 ${tname(w[1])}（盘上在闪的两个端子）。也可以从一个端子直接拖到另一个。`, gate: () => lab.wires.some(x => (x[0] === w[0] && x[1] === w[1]) || (x[0] === w[1] && x[1] === w[0])), enter: () => { clearHl(); hl.terms.add(w[0]); hl.terms.add(w[1]); focusTerms(w); render(); } },
      { tab: 'board', el: m ? '.mbar' : '.tools', t: '检查和送电', b: '接完先点「检查接线」，再用「万用表」量电源两端有没有短路，最后「送电」。接错了随时点「撤销」。' },
      { tab: 'task', el: '#test', t: '按步骤试车', b: '送电后照这里的步骤一步步操作，全部通过，这一题就学会了。' },
    ];
  }
  function startTour() { tour = { i: 0, steps: tourSteps() }; $('tour').hidden = false; tourShow(); }
  function endTour() { if (!tour) return; tour = null; $('tour').hidden = true; store.set(TOUR_KEY, true); clearHl(); render(); G.removeEventListener('resize', tourPlace); }
  function tourShow() {
    const s = tour.steps[tour.i], ok = !s.gate || s.gate();
    if (isMobile()) setTab(s.tab);
    if (s.enter) s.enter();
    $('tourcard').innerHTML = `<p class="tour-n">新手引导 ${tour.i + 1} / ${tour.steps.length}</p><h3>${s.t}</h3><p>${s.b}</p>${s.gate ? `<p class="tour-gate${ok ? ' ok' : ''}">${ok ? '接对了 ✓' : '接对这根线才能继续'}</p>` : ''}<div class="tour-act"><button class="b small ghost" id="tourskip">跳过引导</button>${tour.i ? '<button class="b small" id="tourprev">上一步</button>' : ''}<button class="b small primary" id="tournext"${ok ? '' : ' disabled'}>${tour.i === tour.steps.length - 1 ? '开始练习' : '下一步'}</button></div>`;
    const el = document.querySelector(s.el); if (el) el.scrollIntoView({ block: 'nearest' });
    G.removeEventListener('resize', tourPlace); G.addEventListener('resize', tourPlace);
    tourPlace(); requestAnimationFrame(tourPlace);
  }
  // 聚光框和说明卡只用 transform 定位；尺寸在换步时一次设好，不做动画
  function tourPlace() {
    if (!tour) return;
    const s = tour.steps[tour.i], el = document.querySelector(s.el), sp = $('tourspot'), cd = $('tourcard');
    if (!el) return;
    const r = el.getBoundingClientRect(), pad = 6;
    sp.style.width = r.width + pad * 2 + 'px'; sp.style.height = r.height + pad * 2 + 'px';
    sp.style.transform = `translate3d(${r.left - pad}px,${r.top - pad}px,0)`;
    if (isMobile()) { cd.style.transform = ''; return; }
    // 先放下面，放不下放上面，再不行放右边 / 左边，最后压在目标里面靠下
    const cw = cd.offsetWidth, ch = cd.offsetHeight, W = G.innerWidth, H = G.innerHeight;
    let x, y;
    if (r.bottom + 12 + ch < H) { x = r.left; y = r.bottom + 12; }
    else if (r.top - ch - 12 > 0) { x = r.left; y = r.top - ch - 12; }
    else if (r.right + 12 + cw < W) { x = r.right + 12; y = Math.max(12, r.top); }
    else if (r.left - cw - 12 > 0) { x = r.left - cw - 12; y = Math.max(12, r.top); }
    else { x = r.left + 12; y = Math.min(H, r.bottom) - ch - 12; }
    cd.style.transform = `translate3d(${clamp(x, 12, W - cw - 12)}px,${clamp(y, 12, H - ch - 12)}px,0)`;
  }
  function tourCheck() { if (tour && tour.steps[tour.i].gate) tourShow(); }

  // ---------- 绑定 ----------
  function bind() {
    $('exlist').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { closeDrawer(); show(+b.dataset.i); } });
    const closeDrawer = () => { $('exdrawer').hidden = true; };
    $('exdrawer').addEventListener('click', e => { if (e.target.id === 'exdrawer' || e.target.id === 'dclose') closeDrawer(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$('exdrawer').hidden) closeDrawer();
      if (e.key === 'Escape' && tour) endTour();
      // Ctrl+Z 撤销（在输入框里不拦）
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && lab && PP.current && PP.current() === 'lab' && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); doUndo(); }
    });
    $('printbtn').onclick = printCard;
    $('info').addEventListener('click', ev => { const b = ev.target.closest('[data-zoomdev]'); if (b) zoomTo(b.dataset.zoomdev); });
    document.querySelector('.mtabs').addEventListener('click', e => { const b = e.target.closest('[data-mt]'); if (b) { setTab(b.dataset.mt); G.scrollTo(0, 0); } });
    // 盘面手势（Pointer Events）；页面切到后台、窗口失焦都中止手势
    const vp = $('zoomwrap');
    vp.addEventListener('pointerdown', gesture.down);
    vp.addEventListener('pointermove', gesture.move, { passive: true });
    vp.addEventListener('pointerup', gesture.up);
    vp.addEventListener('pointercancel', gesture.cancel);
    vp.addEventListener('lostpointercapture', e => { if (gesture.active()) gesture.cancel(e); });
    vp.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !gesture.active()) hideRing(); });
    vp.addEventListener('dblclick', ev => { if (ev.target.closest('[data-btn],[data-target],[data-estop]')) return; const pk = pickTerm(toBoard(ev.clientX, ev.clientY)); if (pk.hit) return; const d = ev.target.closest('[data-dev]'); if (d) zoomTo(d.dataset.dev); });
    vp.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); const p = toBoard(e.clientX, e.clientY), k = clamp(zoomK() * (e.deltaY < 0 ? 1.25 : 0.8), 1, 4), w = VB_W / k; setVB({ w, x: p.x - (p.x - vb.x) * (w / vb.w), y: p.y - (p.y - vb.y) * (w / vb.w) }); }, { passive: false });
    vp.addEventListener('keydown', keyNav);
    vp.addEventListener('blur', () => { if (!gesture.active()) hideRing(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { gesture.abort(); flushSave(); } });
    G.addEventListener('pagehide', flushSave);
    G.addEventListener('blur', () => { gesture.abort(); if (lab) releaseAll(); });
    $('picker').addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b) return; const t = b.dataset.pick; hidePicker(); if (t) onTerm(t); });
    $('picker').addEventListener('pointerover', e => { const b = e.target.closest('[data-pick]'); if (b && b.dataset.pick) showRing(b.dataset.pick); });
    $('picker').addEventListener('keydown', e => { if (e.key === 'Escape') hidePicker(); });
    $('zin').onclick = () => setZoom(zoomK() + 0.5); $('zout').onclick = () => setZoom(zoomK() - 0.5);
    $('fold').onclick = () => { const s = $('side'), f = s.classList.toggle('folded'); $('fold').textContent = f ? '展开图纸' : '收起图纸'; $('fold').setAttribute('aria-expanded', !f); };
    $('vt').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { view = b.dataset.v; renderTabs(); renderView(); } });
    $('view').addEventListener('click', ev => {
      const n = ev.target.closest('[data-net],[data-net-lab]');
      if (faultMode && faultMode.phase === 'find' && view === 'sch') { const sy = ev.target.closest('.sym'); if (n) { markFault({ net: n.dataset.net || n.dataset.netLab }); return; } if (sy) { markFault({ dev: sy.dataset.dev }); return; } }
      if (n) { selectNet(n.dataset.net || n.dataset.netLab); return; }
      const s = ev.target.closest('.sym'); if (s) { showInfo(s.dataset.dev); clearHl(); hl.dev = s.dataset.dev; render(); }
    });
    document.addEventListener('pointerdown', ev => { const b = ev.target.closest && ev.target.closest('#panel [data-btn], #ops [data-btn]'); if (!b) return; ev.preventDefault(); gesture.abort(); press(b.dataset.btn); });
    G.addEventListener('pointerup', () => lab && releaseAll());
    G.addEventListener('pointercancel', () => lab && releaseAll());
    document.addEventListener('keydown', ev => { const b = ev.target.closest && ev.target.closest('#ops [data-btn]'); if (b && (ev.key === ' ' || ev.key === 'Enter') && !ev.repeat) { ev.preventDefault(); press(b.dataset.btn); } });
    document.addEventListener('keyup', ev => { if ((ev.key === ' ' || ev.key === 'Enter') && lab) releaseAll(); });
    document.addEventListener('contextmenu', ev => { if (ev.target.closest && ev.target.closest('[data-btn],#zoomwrap')) ev.preventDefault(); });
    $('ops').addEventListener('click', ev => { const b = ev.target.closest('[data-toggle]'); if (b) toggle(b.dataset.toggle); });
    $('power').onclick = onPower;
    $('undo').onclick = doUndo;
    // 提示里的操作按钮（详细说明区和手机底部抽屉共用）
    const actClick = ev => {
      const b = ev.target.closest('[data-act],[data-act2]'); if (!b) return;
      if (b.dataset.act) { onAct(b); return; }
      closeSheet();
      if (b.dataset.act2 === 'del') $('del').click();
      if (b.dataset.act2 === 'toboard') setTab('board');
    };
    $('msg').addEventListener('click', actClick); $('sheetb').addEventListener('click', actClick);
    $('sheetx').onclick = closeSheet;
    $('toast').addEventListener('click', () => { if (isMobile()) openSheet(); else $('msg').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    document.querySelector('.mbar').addEventListener('click', e => { const b = e.target.closest('[data-proxy]'); if (b && $(b.dataset.proxy)) $(b.dataset.proxy).click(); });
    $('check').onclick = () => {
      const c = lab.check(), ws = lab.wires; clearHl(); marks = { wrong: new Set(c.wrong), missing: c.missing }; stat.checks++;
      if (exam && !exam.done) { exam.checks++; c.wrong.forEach(i => exam.wrong.add(ws[i].join('|'))); drawExam(); }
      if (c.ok && chk) chk.checked = true; if (c.ok && !chk) chk = { checked: true, metered: false, tight: false, safe: false };
      if (view !== 'sch') { view = 'sch'; renderTabs(); renderView(); }
      const rows = c.rows.map(x => `<tr><td class="mono">${nlab(x.n)}</td><td>${x.n.terms.length} 个端子</td><td>${x.bad ? '<span class="tag bad">✕ 有错线</span>' : x.left ? `<span class="tag miss">还差 ${x.left} 个</span>` : '<span class="tag ok">✓ 已接通</span>'}</td></tr>`).join('');
      const wl = c.wrong.map(i => `<li>${tname(ws[i][0])} ↔ ${tname(ws[i][1])}：${lab.whyWrong(ws[i][0], ws[i][1])}</li>`).join('');
      if (c.ok) say('校线全部正确', `<div class="tblwrap"><table><tr><th>线号</th><th>端子</th><th>状态</th></tr>${rows}</table></div><p>每个线号都接通了，也没有多余的线。下一步用万用表量一下电源两端有没有短路，然后送电。</p>`, 'good');
      else { say(`校线发现 ${c.wrong.length + c.missing.length} 处问题`, `${wl ? `<p><b>接错的线</b>（盘上用 ✕ 和虚线标出）：</p><ul>${wl}</ul>` : ''}<div class="tblwrap"><table><tr><th>线号</th><th>端子</th><th>状态</th></tr>${rows}</table></div><p>没接完的线号在图纸上是橙色虚线，盘上对应端子有虚线圈。不会改就点「提示下一根」。</p>`, 'bad'); if (c.wrong.length) focusTerms(ws[c.wrong[0]]); }
      drawChecklist(); render();
    };
    $('meterbtn').onclick = () => {
      meterOn = !meterOn; mA = mB = null; sel = null; gesture.abort();
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
      if (t.id === 'tourbtn') startTour();
      if (t.id === 'exbtn') { renderList(); $('exdrawer').hidden = false; const c = $('exlist').querySelector('[aria-current="true"]'); if (c) c.scrollIntoView({ block: 'center' }); }
      const st = t.dataset.stage; if (!st) return;
      if (st === 'q') { view = 'q'; renderTabs(); renderView(); $('side').classList.remove('folded'); if (isMobile()) setTab('draw'); else $('side').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      if (st === 'demo') startDemo();
      if (st === 'follow') startFollow();
      if (st === 'solo') startSolo();
      if (st === 'exam') { if (exam && !exam.done) stopExam(); else if (t.getAttribute('aria-disabled')) say('考核还没解锁', '<p>先点「独立接」，不看提示自己接对一次，就能考核了。</p>', 'hint'); else startExam(); }
      if (isMobile() && ['demo', 'follow', 'solo', 'exam'].includes(st)) setTab('board');
    });
    $('exambar').addEventListener('click', ev => { if (ev.target.id === 'examexit') stopExam(); });
    $('snd').onclick = () => { PP.sound.set(!PP.sound.on()); if (PP.sound.on()) PP.sound.click(); render(); };
    $('tags').onclick = () => { PREF.tags = !PREF.tags; savePref(); say(PREF.tags ? '线号管' : '收起线号管', PREF.tags ? '<p>真柜子里每根线两头都套着<b>线号管</b>，印的就是图纸上的线号。接对的线显示线号，两头线号对不上的显示红色“?”。维修时就靠它对照图纸找线。</p>' : ''); render(); };
    $('steps').addEventListener('click', ev => {
      const b = ev.target.closest('[data-step]'); if (!b) return;
      const a = b.dataset.step;
      if (isMobile()) setTab('board');
      if (a === 'meter') { if (!meterOn) $('meterbtn').click(); }
      else if (a === 'power') { if (!lab.st.power) onPower(); }
      else $(a).click();
    });
    $('faultbox').addEventListener('click', ev => {
      const id = ev.target.id;
      if (id === 'fok') answerFault();
      if (id === 'fshow' && lab.fault) { const f = lab.fault; toRepair(f); faultMode.revealed = true; if (lab.st.power) doEv('power_off'); say('答案', `<p>故障是：<b>${f.name}</b>。对照试车时哪一步不对，想想为什么这个故障会造成那个现象。</p><p>下面自己把它修好：断电 → 修 → 复测 → 试运行。</p>`, 'hint'); drawFault(); render(); }
      if (id === 'freplace') { if (!offOnly()) return; lab.fault = null; say('已换上新的', '<p>元件换好了。接下来复测。</p>'); faultProgress(); render(); }
      if (id === 'fagain') startFault();
      if (id === 'fexit') { lab.fault = null; faultMode = null; clearHl(); if (lab.st.power) doEv('power_off'); drawFault(); say('已退出故障模式'); render(); }
    });
    $('checklist').addEventListener('change', ev => {
      const k = ev.target.dataset.chk; if (k && chk) { chk[k] = ev.target.checked; drawChecklist(); }
      if (ev.target.id === 'chkskip') { PREF.skipCheck = ev.target.checked; savePref(); }
    });
    $('checklist').addEventListener('click', ev => { if (ev.target.id === 'chkgo') powerOn(); if (ev.target.id === 'chkcancel') { chk.open = false; drawChecklist(); } });
    $('route').onclick = () => { PREF.route = PREF.route === 'duct' ? 'direct' : 'duct'; savePref(); say(PREF.route === 'duct' ? '线槽走线：横平竖直' : '直连显示', PREF.route === 'duct' ? '<p>像真柜子一样：线从端子竖直进线槽，在线槽里水平走，再竖直下到目标端子。横平竖直不是为了好看，是为了安全、好查、好维护。看不清哪根线时，点一下它，图纸上会标出线号。</p>' : '<p>线直接从端子连到端子，方便看清谁和谁连。</p>'); render(); };
    $('reset').onclick = () => { if (!offOnly()) return; snapW(); lab.wires = ex().preset.map(w => [...w]); sel = null; selWire = null; clearHl(); changed(); say('已恢复故障现场', '<p>接线回到了出故障时的样子，重新排查吧。</p>'); render(); };
    $('clear').onclick = () => { if (!offOnly()) return; snapW(); demo = null; drawDemo(); follow = false; assist = false; drawGoal(); lab.wires = []; lab.fault = null; faultMode = null; drawFault(); sel = null; selWire = null; clearHl(); changed(); say('已全部拆掉', '<p>从图纸最上面的电源开始，一个线号一个线号往下接。点「撤销」可以恢复。</p>'); render(); };
    $('del').onclick = () => {
      if (selWire === null || !offOnly()) return;
      snapW(); const [w] = lab.wires.splice(selWire, 1); selWire = null; clearHl(); changed();
      if (faultMode && lab.fault && lab.fault.kind === 'wire' && w === lab.fault.wref) { lab.fault = null; say('断线拆掉了', '<p>现在把这两个端子重新接上一根新线。</p>', 'hint'); }
      else say('已删除这根线', '<p>删错了点「撤销」。</p>');
      faultProgress(); render();
    };
    $('tour').addEventListener('click', e => { const id = e.target.id; if (id === 'tourskip') endTour(); if (id === 'tourprev' && tour.i) { tour.i--; tourShow(); } if (id === 'tournext') { if (tour.i === tour.steps.length - 1) endTour(); else { tour.i++; tourShow(); } } });
    G.addEventListener('scroll', () => { if (tour) requestAnimationFrame(tourPlace); }, { passive: true });
  }

  // ---------- 切换练习：先销毁上一题的会话，再建新的 ----------
  function show(i) {
    if (tour) endTour();
    resetSession();
    cur = i; const e = ex();
    store.set('pp-cur-v3', e.id);
    let ws = WIRES[e.id]; if (!ws) ws = e.preset ? e.preset.map(w => [...w]) : [];
    lab = new PP.Lab(e, ws); savedSig[e.id] = JSON.stringify(ws);
    assist = !e.preset && ws.length > 0;
    P.setLast({ t: 'ex', id: e.id, name: e.name });
    total = PP.chain(e).length;
    FR = PP.frame(e, i);
    buildGrid(); kf = null; staticKey = '';
    setVB({ x: 0, y: 0, w: VB_W });
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
    drawDemo(); drawFault(); drawChecklist(); drawExam(); setTab($('lab').dataset.mt || 'board'); render();
    if (e.id === EX[0].id && !store.get(TOUR_KEY, false)) setTimeout(() => { if (!tour && ex().id === e.id) startTour(); }, 80);
  }
  function showById(id, v) { if (v) view = v; const i = EX.findIndex(e => e.id === id); show(i >= 0 ? i : 0); }

  // 调试 / 验收用：看当前会话的临时状态
  const debug = () => ({ id: ex().id, sel, selWire, meterOn, mA, mB, demo: !!demo, fault: !!faultMode, phase: faultMode && faultMode.phase, exam: !!exam, chk: !!chk, follow, marks: !!marks, hl: hl.terms.size + hl.wires.size + (hl.net ? 1 : 0) + (hl.dev ? 1 : 0), undo: undo.length, power: lab.st.power, wires: lab.wires.length, vb: { ...vb }, faultInfo: lab.fault && { kind: lab.fault.kind, wi: lab.wires.indexOf(lab.fault.wref), dev: lab.fault.dev || (lab.fault.a || '').split('.')[0] }, gesture: gesture.active(), tour: !!tour, timers: { kt: !!ktTimer, exam: !!examTimer } });
  PP.LabUI = { mount, show, showById, lastId: () => store.get('pp-cur-v3', EX[0].id), _debug: debug, _pick: (x, y) => pickTerm({ x, y, ppu: panelRect().width / vb.w }) };
})(window);
