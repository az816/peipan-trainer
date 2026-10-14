// pages-build.js — 配柜实战：5 套图纸由易到难，每套都走 看图纸 → 选元件 → 布置 → 走线 → 验收出图
(function (G) {
  const PP = G.PP, ALL = PP.BUILDS;
  let B = ALL[0];
  // 选元件的选项每套图打开时打乱一次（不能靠“选中间那个”），之后点选时顺序不变
  const ORD = {}, ordOf = it => { const k = B.id + ':' + it.k; return ORD[k] || (ORD[k] = PP.pick(it.opts.map((_, j) => j), it.opts.length)); };
  const KEY = 'pp-build-v2';
  const blank = () => ({ stage: 0, seen: {}, sel: {}, layout: Array.from({ length: B.rows }, () => []), wires: {} });
  // 存档：{ cur, p: { 图纸id: 进度 } }；老版本只有输送线一套，搬进来
  const loadAll = () => {
    let a = PP.store.get(KEY, null);
    if (!a) { a = { cur: ALL[0].id, p: {} }; const old = PP.store.get('pp-build-v1', null); if (old) { a.p.conveyor = old; a.cur = 'conveyor'; } }
    return a;
  };
  let all = loadAll(), st, pick = null, showW = false, showL = false;
  const useProj = id => { B = PP.buildOf(id) || ALL[0]; all.cur = B.id; st = all.p[B.id] || (all.p[B.id] = blank()); while (st.layout.length < B.rows) st.layout.push([]); pick = null; showW = showL = false; };
  const save = () => PP.store.set(KEY, all);
  useProj(all.cur);

  // ---------- 主回路原理图（复用原理图符号和图框） ----------
  const S = () => PP.S;
  const ph = ['L1', 'L2', 'L3'];
  // 电源 → 断路器（可以两级）→ 接触器 → 热继 → 电机；rev=true 时加反转接触器（对调 L1、L3）
  function simpleMain({ qf0, rev, kmLab = 'KM', notes = [] }) {
    const { W, DOT, SRC, NOTE, triple, motor } = S(), xs = [50, 80, 110], x2 = [200, 230, 260];
    let s = '', y = 40;
    xs.forEach((x, i) => (s += SRC(x, 16, ph[i]) + W(ph[i], [[x, 24], [x, y]])));
    if (qf0) { s += triple(xs, y, 'qf', 'QF0'); xs.forEach((x, i) => (s += W('a' + i, [[x, y + 40], [x, y + 60]]))); y += 60; }
    s += triple(xs, y, 'qf', 'QF1'); y += 40;
    const ky = y + 30;
    xs.forEach((x, i) => (s += W('b' + i, [[x, y], [x, ky]])));
    if (rev) xs.forEach((x, i) => (s += W('b' + i, [[x, y + 8 + i * 7], [x2[i], y + 8 + i * 7], [x2[i], ky]]) + DOT('b' + i, x, y + 8 + i * 7)));
    s += triple(xs, ky, 'km', rev ? 'KM1' : kmLab) + (rev ? triple(x2, ky, 'km', 'KM2') : '');
    const fy = ky + 80;
    xs.forEach((x, i) => (s += W('c' + i, [[x, ky + 40], [x, fy]])));
    if (rev) x2.forEach((x, i) => { const t = xs[2 - i], yy = ky + 54 + i * 7; s += W('c' + (2 - i), [[x, ky + 40], [x, yy], [t, yy]]) + DOT('c' + (2 - i), t, yy); });
    s += triple(xs, fy, 'fr', 'FR');
    const my = fy + 102;
    s += W('U', [[50, fy + 40], [50, fy + 68], [64, fy + 84]]) + W('V', [[80, fy + 40], [80, fy + 78]]) + W('W', [[110, fy + 40], [110, fy + 68], [96, fy + 84]]) + motor(80, my, 24);
    notes.forEach(([x, yy, t]) => (s += NOTE(x, yy === 'm' ? my - 7 : yy === 'm2' ? my + 7 : yy === 'k' ? fy + 12 : yy === 'k2' ? fy + 26 : yy, t)));
    return { s, h: my + 40 };
  }
  const MAINS = {
    pump: () => simpleMain({ notes: [[210, 'm', 'M1 1.5kW'], [210, 'm2', '380V 直接启动'], [210, 'k', '控制回路见第 2 张图'], [210, 'k2', '（启保停）']] }),
    hoist: () => simpleMain({ rev: true, notes: [[232, 'k', 'KM2 对调 L1、L3'], [232, 'k2', '→ 电机反转'], [250, 'm', 'M1 1.1kW'], [250, 'm2', '上升 / 下降']] }),
    conveyor: () => simpleMain({ qf0: true, rev: true, notes: [[232, 'k', 'KM2 对调 L1、L3'], [232, 'k2', '→ 电机反转'], [250, 'm', 'M1 2.2kW'], [250, 'm2', '380V 正反转']] }),
    // 星三角（代号和控制回路图一致）：KM1 后分两路：FR → U1 V1 W1；KM3（Δ）→ W2 U2 V2；KM2（Y）把 W2 U2 V2 短接成星点
    yd: () => {
      const { W, DOT, SRC, NOTE, triple, TL } = S(), xs = [50, 80, 110], xd = [190, 220, 250], xy = [300, 330, 360];
      let s = '';
      xs.forEach((x, i) => (s += SRC(x, 16, ph[i]) + W(ph[i], [[x, 24], [x, 40]]) + W('a' + i, [[x, 80], [x, 100]])));
      s += triple(xs, 40, 'qf', 'QF1') + triple(xs, 100, 'km', 'KM1');
      xs.forEach((x, i) => { const yy = 150 + i * 7; s += W('b' + i, [[x, 140], [x, 180]]) + W('b' + i, [[x, yy], [xd[i], yy], [xd[i], 180]]) + DOT('b' + i, x, yy); });
      s += triple(xs, 180, 'fr', 'FR') + triple(xd, 180, 'km', 'KM3');
      const T2 = ['W2', 'U2', 'V2'], T1 = ['U1', 'V1', 'W1'];
      xs.forEach((x, i) => (s += W('u' + i, [[x, 220], [x, 300]]) + TL(x + 4, 296, T1[i])));
      xd.forEach((x, i) => { const yy = 238 + i * 7; s += W('w' + i, [[x, 220], [x, 300]]) + TL(x + 4, 296, T2[i]) + W('w' + i, [[x, yy], [xy[i], yy], [xy[i], 254]]) + DOT('w' + i, x, yy); });
      s += triple(xy, 254, 'km', 'KM2') + W('n', [[300, 294], [300, 304], [360, 304], [360, 294]]) + W('n', [[330, 294], [330, 304]]) + DOT('n', 330, 304);
      s += `<g class="sym" data-dev="M"><rect class="s fill" x="34" y="300" width="232" height="44" rx="6"/><text class="mt" x="150" y="320">M 3~</text><text class="tl" x="150" y="336" text-anchor="middle">11kW 380V △ · 接线盒不装连接片</text></g>`;
      s += NOTE(330, 330, 'KM2（Y）下口短接') + NOTE(330, 344, '= 星点') + NOTE(330, 150, 'KM3（Δ）接 U1–W2') + NOTE(330, 164, 'V1–U2  W1–V2');
      return { s, h: 360 };
    },
    vfd: () => {
      const { W, SRC, NOTE, triple, motor, box } = S(), xs = [50, 80, 110];
      let s = '';
      xs.forEach((x, i) => (s += SRC(x, 16, ph[i]) + W(ph[i], [[x, 24], [x, 40]]) + W('a' + i, [[x, 80], [x, 120]])));
      s += triple(xs, 40, 'qf', 'QF1') + box('VFD', 30, 120, 100, 64, '变频器 VFD', 'R S T → U V W');
      ['U', 'V', 'W'].forEach((t, i) => (s += W(t, [[xs[i], 184], [xs[i], 228], [xs[i] + (1 - i) * 14, 244]])));
      s += motor(80, 262, 24) + NOTE(210, 132, '7.5kW 水泵') + NOTE(210, 146, '变频调速') + NOTE(210, 200, '输出到电机：') + NOTE(210, 214, '屏蔽电缆，不加接触器') + NOTE(210, 256, '启停：KA → DI1') + NOTE(210, 270, '压力：4–20mA → AI');
      return { s, h: 300 };
    },
  };
  // 第 2 张图：控制回路（借用接线实训里对应那道题的原理图）
  function ctrlSheet() {
    if (!B.ctrlEx) return '';
    const e = PP.EX.find(x => x.id === B.ctrlEx), i = PP.EX.indexOf(e), F = PP.frame({ ...e, name: B.name + ' 控制回路', no: B.no, page: '2/2' }, i);
    return `<section class="card"><h2>控制回路原理图<span>第 2 张 · 和「接线实训」的「${e.name}」一样</span></h2><div class="svgwrap"><svg class="sch" viewBox="${F.vb}" style="max-width:420px;margin:auto">${F.svg}</svg></div>
      <div class="tools"><button class="b small" data-ex="${e.id}">去接线实训把这张图接一遍</button></div></section>`;
  }

  // ---------- 柜内布置图 ----------
  const GEO = { 3: { RY: [110, 240, 370], HD: [56, 182, 312] }, 2: { RY: [140, 330], HD: [76, 266] } };
  const X0 = 70, DX = [43, 377], RN = r => (B.rows === 2 ? ['上排', '下排'] : ['上排', '中排', '下排'])[r];
  const COL = { 黑: '#25282b', 黄: '#d6a000', 红: '#d32f2f', 蓝: '#1f62c4', 棕: '#7a4a24', 黄绿双色: '#2b8a3e', 屏蔽电缆: '#5b6166', 屏蔽双绞线: '#8a6d3b' };
  function geo(layout) {
    const g = {}, { RY } = GEO[B.rows], UW = 280 / B.CAP;
    layout.forEach((row, r) => { let x = X0; row.forEach(k => { const w = B.part(k).u * UW; g[k] = { x: x + 1.5, y: RY[r] - 28, w: w - 3, h: 56, r, cx: x + w / 2 }; x += w; }); });
    g.IN = { r: B.rows, cx: 0, y: 470 };
    return g;
  }
  function route(w, v, g, i) {
    const a = g[w.a], b = g[w.b], { HD } = GEO[B.rows]; if (!a || !b || v.duct === undefined || v.duct === '') return null;
    const dx = DX[+v.duct] + (i - 3) * 1.6, hy = r => HD[r] + 8 + (i - 3) * 1.4;
    const pts = w.a === 'IN' ? [[dx, 462]] : [[a.cx + (i % 3 - 1) * 4, a.y], [a.cx + (i % 3 - 1) * 4, hy(a.r)], [dx, hy(a.r)]];
    pts.push([dx, hy(b.r)], [b.cx + (i % 3 - 1) * 4, hy(b.r)], [b.cx + (i % 3 - 1) * 4, b.y]);
    return pts.map(p => p.join(',')).join(' ');
  }
  function cabSVG(layout, wires, marks) {
    const g = geo(layout), { RY, HD } = GEO[B.rows];
    let s = PP.R.defs('bd-') + `<rect class="cabinet" x="10" y="10" width="400" height="472" rx="4"/><rect class="plate" x="30" y="30" width="360" height="426"/>`;
    s += `<rect x="34" y="34" width="18" height="418" fill="url(#bd-ductv)"/><rect x="34" y="34" width="18" height="418" fill="#c98a5a" opacity=".35"/><rect x="368" y="34" width="18" height="418" fill="url(#bd-ductv)"/><rect x="368" y="34" width="18" height="418" fill="#6f8fc4" opacity=".35"/>`;
    HD.forEach(y => (s += `<rect x="52" y="${y}" width="316" height="16" fill="url(#bd-duct)"/>`));
    RY.forEach((y, r) => (s += `<g class="railhit" data-row="${r}"><rect class="rowhit" x="58" y="${y - 34}" width="304" height="68" rx="4"/><rect x="62" y="${y - 5}" width="296" height="10" fill="url(#bd-gr)" stroke="#8d938e" stroke-width=".6"/><text class="sm" x="356" y="${y + 41}" text-anchor="end">${RN(r)} ${B.used(layout[r] || [])}/${B.CAP}</text></g>`));
    [70, 110, 150].forEach(x => (s += `<circle class="c" cx="${x}" cy="470" r="6"/>`));
    s += `<text class="sm" x="210" y="474" text-anchor="middle">↑ 电缆从柜底格兰头进线</text><text class="sm" x="43" y="28" text-anchor="middle" style="fill:var(--live)">${B.DUCT[0].slice(0, 2)}</text><text class="sm" x="377" y="28" text-anchor="middle" style="fill:var(--neutral)">${B.DUCT[1].slice(0, 2)}</text>`;
    for (const k in g) {
      if (k === 'IN') continue;
      const p = g[k], pt = B.part(k);
      s += `<g class="bp${pick === k ? ' sel' : ''}" data-placed="${k}">${PP.R.mini(pt.m || k, p.x, p.y, p.w, p.h, 'bd-', pt.lab)}<rect class="ol" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="3"/></g>`;
    }
    if (wires) B.wires.forEach((w, i) => {
      const v = wires[w.k] || {}, pts = route(w, v, g, i); if (!pts) return;
      const c = COL[v.col] || '#7a837c', bad = marks && marks[w.k] === false;
      s += `<g class="bw${bad ? ' bad' : ''}"><polyline class="bwe" points="${pts}"/><polyline class="bwc" points="${pts}" style="stroke:${c}"/>${v.col === '黄绿双色' ? `<polyline class="bwc" points="${pts}" style="stroke:#f2c200;stroke-dasharray:5 5"/>` : ''}</g>`;
    });
    return s;
  }

  // ---------- 页面 ----------
  const STAGES = [['看图纸', '任务书、主回路、控制回路'], ['选元件', '断路器、接触器、电源…'], ['布置', '装上导轨，分区排列'], ['走线', '截面、颜色、走哪条线槽'], ['验收出图', '打分、元件清单']];
  const stars = n => `<span class="stars" aria-label="难度 ${n} 星">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
  const scoreOf = id => { const p = PP.buildOf(id), s = all.p[id]; return s && s.seen && s.seen[4] ? p.score(s).total : null; };
  function mount(el) {
    el.innerHTML = `<div class="page">
  <div class="page-head"><h1>配柜实战</h1><p>对照图纸，自己做一台控制柜：先看懂图纸和任务书，再选元件、把元件装上导轨、决定每根线用多粗、什么颜色、走哪条线槽，最后验收出图。5 套图纸从简单到难，建议按顺序做。</p></div>
  <div class="projs" id="bproj"></div>
  <ol class="steps" id="bst"></ol>
  <div id="bv"></div>
</div>`;
    const $ = id => el.querySelector('#' + id);
    const placed = () => B.parts.every(p => st.layout.some(r => r.includes(p.k)));
    const done = i => [!!st.seen[0], B.sel.every(it => st.sel[it.k] != null), placed(), B.wires.every(w => { const v = st.wires[w.k] || {}; return v.sec && v.col && v.duct !== undefined && v.duct !== ''; }), !!st.seen[4]][i];
    function drawProj() {
      $('bproj').innerHTML = ALL.map(p => { const sc = scoreOf(p.id), s = all.p[p.id]; return `<button class="proj${p.id === B.id ? ' on' : ''}" data-proj="${p.id}" aria-pressed="${p.id === B.id}">${stars(p.star)}<b>${p.name}</b><small>${p.scene.split('。')[0]}</small><span class="pst">${sc != null ? `<em class="${sc >= 70 ? 'ok' : ''}">${sc} 分</em>` : s && Object.keys(s.seen || {}).length ? '做到一半' : '未开始'}</span></button>`; }).join('');
    }
    function drawStages() { $('bst').innerHTML = STAGES.map(([t, d], i) => `<li class="${i === st.stage ? 'cur' : done(i) ? 'done' : ''}"><button data-st="${i}"><span class="no">${done(i) && i !== st.stage ? '✓' : i + 1}</span><span><b>${t}</b><small>${d}</small></span></button></li>`).join(''); }
    const next = (t = '下一步') => st.stage < 4 ? `<div class="tools"><button class="b primary" data-st="${st.stage + 1}">${t}：${STAGES[st.stage + 1][0]} →</button></div>` : '';

    function vDraw() {
      const m = MAINS[B.id](), F = PP.frame({ name: B.name + ' 主回路', no: B.no, page: B.ctrlEx ? '1/2' : '1/1', vb: `0 0 ${B.id === 'yd' ? 420 : 320} ${m.h}`, sch: () => m.s }, 29);
      const ioCard = B.io ? `<section class="card"><h2>PLC I/O 分配表</h2><div class="tblwrap"><table><tr><th>地址</th><th>元件</th><th>说明</th></tr>${B.io.map(r => `<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table></div><p class="cap">${B.ctrlNote}</p></section>` : `<section class="card"><h2>控制回路</h2><p>${B.ctrlNote}</p></section>`;
      return `<section class="card bscene">${stars(B.star)}<p><b>${B.name}</b>　${B.scene}</p></section>
        <div class="cols2"><div style="display:flex;flex-direction:column;gap:14px"><section class="card"><h2>主回路原理图<span>图号 ${B.no} · 第 1 张</span></h2><div class="svgwrap"><svg class="sch" viewBox="${F.vb}" style="max-width:520px;margin:auto">${F.svg}</svg></div></section>${ctrlSheet()}</div>
        <div style="display:flex;flex-direction:column;gap:14px"><section class="card"><h2>任务书</h2><div class="tblwrap"><table>${B.task.map(r => `<tr><th style="white-space:nowrap">${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table></div></section>
        ${ioCard}${next('看懂了')}</div></div>`;
    }
    function vSel() {
      const n = B.sel.filter(it => st.sel[it.k] != null).length;
      return `<section class="card"><h2>选元件<span>已选 ${n} / ${B.sel.length} · 每项选一个，马上告诉你选得对不对</span></h2><div class="selgrid">${B.sel.map(it => {
        const i = st.sel[it.k], o = i == null ? null : it.opts[i];
        return `<div class="selq"><h3>${it.name}</h3><p class="cap">${it.hint}</p><div class="opts">${ordOf(it).map(j => { const op = it.opts[j]; return `<button data-sk="${it.k}" data-si="${j}" aria-pressed="${i === j}" class="${i === j ? ['wrong', 'meh', 'right'][op[1]] : ''}">${op[0]}</button>`; }).join('')}</div>${o ? `<p class="why"><span class="tag ${['bad', 'miss', 'ok'][o[1]]}">${['选错了', '能用但不推荐', '推荐'][o[1]]}</span> ${o[2]}</p>` : ''}</div>`;
      }).join('')}</div>${next()}</section>`;
    }
    function vLay() {
      const left = B.parts.filter(p => !st.layout.some(r => r.includes(p.k))), res = showL ? B.gradeLayout(st.layout) : null;
      return `<div class="cols2"><section class="card"><h2>柜内安装板<span>先点右边托盘里的元件，再点要装的那一排导轨；点已装的元件可以拆回托盘</span></h2>
        <div class="svgwrap"><svg id="bcab" class="cab" viewBox="0 0 420 486" style="max-width:520px;margin:auto">${cabSVG(st.layout)}</svg></div>
        <div class="legend"><span><i style="background:#c98a5a"></i>${B.DUCT[0]}</span><span><i style="background:#6f8fc4"></i>${B.DUCT[1]}</span><span><i style="background:#9aa3a0"></i>横向线槽</span></div></section>
        <section class="card"><h2>元件托盘<span>${left.length ? `还有 ${left.length} 个没装` : '全部装好了'} · 每排 ${B.CAP} 格</span></h2>
        <div class="tray">${left.map(p => `<button class="bp-btn ${p.cls}" data-pick="${p.k}" aria-pressed="${pick === p.k}"><b>${p.lab}</b><small>${p.sub} · ${p.u} 格</small></button>`).join('') || '<p class="cap">点「检查布置」看看排得对不对。</p>'}</div>
        ${pick ? `<div class="tools"><span class="cap">把 <b>${B.part(pick).lab}</b> 装到：</span>${Array.from({ length: B.rows }, (_, r) => `<button class="b small" data-row="${r}">${RN(r)}</button>`).join('')}</div>` : ''}
        <div class="tools"><button class="b primary" id="lchk">检查布置</button><button class="b ghost" id="lans">看参考布置</button><button class="b ghost danger" id="lclr">全部拆下</button></div>
        ${res ? `<ul class="rulelist">${res.map(r => `<li class="${r.ok ? 'ok' : 'no'}"><b>${r.ok ? '✓' : '✗'} ${r.name}</b>${r.ok ? '' : `<br><span class="cap">${r.why}</span>`}</li>`).join('')}</ul>` : `<p class="cap">布置原则：电从上往下、从左往右；强电、弱电分开；端子排放最下面靠近进线。</p>`}
        ${next()}</section></div>`;
    }
    function vWire() {
      const lay = placed() ? st.layout : B.answer, res = showW ? B.gradeWires(st.wires) : null;
      const marks = res ? Object.fromEntries(res.map(r => [r.k, r.n === 3])) : null;
      const sel = (k, f, opts, v) => `<select data-wk="${k}" data-wf="${f}" aria-label="${f === 'sec' ? '截面' : f === 'col' ? '颜色' : '线槽'}"><option value="">—</option>${opts.map((o, i) => { const val = f === 'duct' ? i : o; return `<option value="${val}"${String(v) === String(val) ? ' selected' : ''}>${f === 'sec' ? o + ' mm²' : o}</option>`; }).join('')}</select>`;
      const colHead = B.COL.some(c => c.includes('屏蔽')) ? '颜色 / 线型' : '颜色';
      return `<div class="cols2 wgrid"><section class="card"><h2>走线图<span>${lay === B.answer ? '你的布置还没装完，这里先用参考布置' : '按你的布置'} · 选好线槽线就会画出来</span></h2>
        <div class="svgwrap"><svg class="cab" viewBox="0 0 420 486" style="max-width:520px;margin:auto">${cabSVG(lay, st.wires, marks)}</svg></div>
        <p class="cap">线从元件竖直进上方的横线槽，横着走到侧边竖线槽，再走到目标那一排：<b>横平竖直、强弱分槽</b>。</p></section>
        <section class="card"><h2>每根线怎么走<span>选截面、${colHead}和线槽</span></h2><div class="tblwrap"><table class="wtbl"><tr><th>导线</th><th>截面</th><th>${colHead}</th><th>线槽</th></tr>${B.wires.map(w => {
          const v = st.wires[w.k] || {}, r = res && res.find(x => x.k === w.k), m = ok => (r ? (ok ? ' ok' : ' no') : '');
          return `<tr><td>${w.name}${r && r.n < 3 ? `<div class="cap">${w.why}</div>` : ''}</td><td class="${m(r && r.okS)}">${sel(w.k, 'sec', B.SEC, v.sec)}</td><td class="${m(r && r.okC)}">${sel(w.k, 'col', B.COL, v.col)}</td><td class="${m(r && r.okD)}">${sel(w.k, 'duct', B.DUCT, v.duct)}</td></tr>`;
        }).join('')}</table></div>
        <div class="tools"><button class="b primary" id="wchk">检查走线</button>${res ? `<span class="cap">对了 ${res.reduce((a, r) => a + r.n, 0)} / ${res.length * 3} 项${res.every(r => r.n === 3) ? '，全对！' : '，红色格子要改，下面写了原因'}</span>` : ''}</div>${next()}</section></div>`;
    }
    function vDone() {
      const sc = B.score(st), s = B.gradeSel(st.sel), lay = placed() ? st.layout : null, nx = ALL[ALL.indexOf(B) + 1];
      const card = (k, v, d) => `<div class="r"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${d}</div></div>`;
      const lv = sc.total >= 90 ? '优秀：这台柜子可以交给师傅验收了' : sc.total >= 70 ? '合格：还有几处要改，回到对应步骤看红色提示' : '还要再练：按步骤一项项改';
      return `<section class="card"><h2>验收结果<span>${lv}</span></h2><div class="result">${card('总分', `${sc.total}`, '满分 100，70 分合格')}${card('选元件', `${sc.sel} / 40`, '推荐满分，能用但不推荐给一半')}${card('布置', `${sc.lay} / 30`, `${B.rules.length} 条布置原则`)}${card('走线', `${sc.wire} / 30`, '截面、颜色、线槽')}</div>
        ${sc.total >= 70 && nx ? `<div class="tools"><button class="b primary" data-proj="${nx.id}">下一套：${'★'.repeat(nx.star)} ${nx.name} →</button></div>` : ''}</section>
      <div class="cols2"><section class="card"><h2>柜内布置与走线图<span>图号 ${B.no}-02</span></h2>${lay ? `<div class="svgwrap"><svg class="cab" viewBox="0 0 420 486" style="max-width:520px;margin:auto">${cabSVG(lay, st.wires)}</svg></div>` : '<p class="cap">布置还没完成，回到「布置」把元件装完。</p>'}</section>
      <section class="card"><h2>元件清单（BOM）</h2><div class="tblwrap"><table><tr><th style="white-space:nowrap">代号</th><th>名称</th><th>你选的规格</th><th>评价</th></tr>${s.map(r => `<tr><td class="mono">${r.k}</td><td>${r.name.startsWith(r.k + ' ') ? r.name.slice(r.k.length + 1) : r.name}</td><td>${r.pick || '—'}</td><td>${r.g < 0 ? '<span class="tag miss">没选</span>' : `<span class="tag ${['bad', 'miss', 'ok'][r.g]}">${['错', '可改进', '推荐'][r.g]}</span>`}</td></tr>`).join('')}</table></div>
      <div class="tools"><button class="b" id="bprint">打印 / 存成 PDF</button><button class="b ghost danger" id="breset">清空这套重做</button></div></section></div>`;
    }

    function draw() {
      st.seen[st.stage] = true; save(); drawProj(); drawStages();
      $('bv').innerHTML = [vDraw, vSel, vLay, vWire, vDone][st.stage]();
      PP.prog.setLast({ t: 'build', id: B.id, name: '配柜：' + B.name });
    }
    const place = r => {
      if (!pick) return;
      const u = B.part(pick).u;
      if (B.used(st.layout[r]) + u > B.CAP) { alertRow(r); return; }
      st.layout.forEach(row => { const i = row.indexOf(pick); if (i >= 0) row.splice(i, 1); });
      st.layout[r].push(pick); pick = null; showL = false; draw();
    };
    const alertRow = r => { const t = el.querySelector(`[data-row="${r}"] .rowhit`); if (t) { t.classList.add('full'); setTimeout(() => t.classList.remove('full'), 600); } };

    el.addEventListener('click', e => {
      const t = e.target.closest('[data-st],[data-sk],[data-pick],[data-row],[data-placed],[data-proj],button');
      if (!t) return;
      if (t.dataset.proj) { useProj(t.dataset.proj); draw(); el.scrollIntoView({ behavior: 'smooth' }); return; }
      if (t.dataset.st !== undefined) { st.stage = +t.dataset.st; pick = null; draw(); el.scrollIntoView({ behavior: 'smooth' }); return; }
      if (t.dataset.sk) { st.sel[t.dataset.sk] = +t.dataset.si; draw(); return; }
      if (t.dataset.pick) { pick = pick === t.dataset.pick ? null : t.dataset.pick; draw(); return; }
      if (t.dataset.row !== undefined) { place(+t.dataset.row); return; }
      if (t.dataset.placed) { const k = t.dataset.placed; st.layout.forEach(row => { const i = row.indexOf(k); if (i >= 0) row.splice(i, 1); }); pick = k; showL = false; draw(); return; }
      if (t.id === 'lchk') { showL = true; draw(); }
      if (t.id === 'lans') { st.layout = B.answer.map(r => r.slice()); pick = null; showL = true; draw(); }
      if (t.id === 'lclr') { st.layout = Array.from({ length: B.rows }, () => []); pick = null; showL = false; draw(); }
      if (t.id === 'wchk') { showW = true; draw(); }
      if (t.id === 'bprint') window.print();
      if (t.id === 'breset') { st = all.p[B.id] = blank(); pick = null; showW = showL = false; draw(); }
    });
    el.addEventListener('change', e => {
      const s = e.target.closest('[data-wk]'); if (!s) return;
      const v = (st.wires[s.dataset.wk] = st.wires[s.dataset.wk] || {});
      v[s.dataset.wf] = s.value; draw();
    });
    el._draw = draw;
    draw();
  }

  PP.PAGES = PP.PAGES || [];
  PP.PAGES.push({ id: 'build', title: '配柜实战', order: 3.5, mount, onShow: (el, opt = {}) => { if (opt.proj && PP.buildOf(opt.proj)) { useProj(opt.proj); if (el._draw) el._draw(); } } });
})(window);
