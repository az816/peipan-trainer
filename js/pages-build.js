// pages-build.js — 配柜实战：看图纸 → 选元件 → 布置 → 走线 → 验收出图
(function (G) {
  const PP = G.PP, B = PP.BUILD;
  // 选元件的选项每次打开页面打乱一次（不能靠“选中间那个”），之后点选时顺序不变
  const ORD = {}, ordOf = it => ORD[it.k] || (ORD[it.k] = PP.pick(it.opts.map((_, j) => j), it.opts.length));
  const KEY = 'pp-build-v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const blank = () => ({ stage: 0, seen: {}, sel: {}, layout: [[], [], []], wires: {} });
  let st = load() || blank(), pick = null, showW = false, showL = false;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };

  // ---------- 主回路图（复用原理图符号和图框） ----------
  function mainSch() {
    const { W, DOT, SRC, NOTE, triple, motor } = PP.S, xs = [50, 80, 110], x2 = [200, 230, 260], ph = ['L1', 'L2', 'L3'];
    let s = '';
    xs.forEach((x, i) => { s += SRC(x, 16, ph[i]) + W(ph[i], [[x, 24], [x, 40]]) + W('a' + i, [[x, 80], [x, 100]]) + W('b' + i, [[x, 140], [x, 170]]) + W('b' + i, [[x, 148 + i * 7], [x2[i], 148 + i * 7], [x2[i], 170]]) + DOT('b' + i, x, 148 + i * 7); });
    s += triple(xs, 40, 'qf', 'QF0') + triple(xs, 100, 'qf', 'QF1') + triple(xs, 170, 'km', 'KM1') + triple(x2, 170, 'km', 'KM2');
    xs.forEach((x, i) => { s += W('c' + i, [[x, 210], [x, 250]]); });
    x2.forEach((x, i) => { const t = xs[2 - i], y = 224 + i * 7; s += W('c' + (2 - i), [[x, 210], [x, y], [t, y]]) + DOT('c' + (2 - i), t, y); });
    s += triple(xs, 250, 'fr', 'FR');
    s += W('U', [[50, 290], [50, 318], [64, 334]]) + W('V', [[80, 290], [80, 328]]) + W('W', [[110, 290], [110, 318], [96, 334]]) + motor(80, 352, 24);
    return s + NOTE(232, 262, 'KM2 对调 L1、L3') + NOTE(232, 276, '→ 电机反转') + NOTE(250, 345, 'M1 2.2kW') + NOTE(250, 359, '380V 正反转');
  }

  // ---------- 柜内布置图 ----------
  const RY = [110, 240, 370], HD = [56, 182, 312], X0 = 70, UW = 280 / B.CAP, DX = [43, 377];
  const COL = { 黑: '#25282b', 黄: '#d6a000', 红: '#d32f2f', 蓝: '#1f62c4', 棕: '#7a4a24', 黄绿双色: '#2b8a3e' };
  function geo(layout) {
    const g = {};
    layout.forEach((row, r) => { let x = X0; row.forEach(k => { const w = B.part(k).u * UW; g[k] = { x: x + 1.5, y: RY[r] - 28, w: w - 3, h: 56, r, cx: x + w / 2 }; x += w; }); });
    g.IN = { r: 3, cx: 0, y: 470 };
    return g;
  }
  function route(w, v, g, i) {
    const a = g[w.a], b = g[w.b]; if (!a || !b || v.duct === undefined || v.duct === '') return null;
    const dx = DX[+v.duct] + (i - 3) * 1.6, hy = r => HD[r] + 8 + (i - 3) * 1.4;
    const pts = w.a === 'IN' ? [[dx, 462]] : [[a.cx + (i % 3 - 1) * 4, a.y], [a.cx + (i % 3 - 1) * 4, hy(a.r)], [dx, hy(a.r)]];
    pts.push([dx, hy(b.r)], [b.cx + (i % 3 - 1) * 4, hy(b.r)], [b.cx + (i % 3 - 1) * 4, b.y]);
    return pts.map(p => p.join(',')).join(' ');
  }
  function cabSVG(layout, wires, marks) {
    const g = geo(layout);
    let s = PP.R.defs('bd-') + `<rect class="cabinet" x="10" y="10" width="400" height="472" rx="4"/><rect class="plate" x="30" y="30" width="360" height="426"/>`;
    s += `<rect x="34" y="34" width="18" height="418" fill="url(#bd-ductv)"/><rect x="34" y="34" width="18" height="418" fill="#c98a5a" opacity=".35"/><rect x="368" y="34" width="18" height="418" fill="url(#bd-ductv)"/><rect x="368" y="34" width="18" height="418" fill="#6f8fc4" opacity=".35"/>`;
    HD.forEach(y => (s += `<rect x="52" y="${y}" width="316" height="16" fill="url(#bd-duct)"/>`));
    RY.forEach((y, r) => (s += `<g class="railhit" data-row="${r}"><rect class="rowhit" x="58" y="${y - 34}" width="304" height="68" rx="4"/><rect x="62" y="${y - 5}" width="296" height="10" fill="url(#bd-gr)" stroke="#8d938e" stroke-width=".6"/><text class="sm" x="356" y="${y + 41}" text-anchor="end">${['上排', '中排', '下排'][r]} ${B.used(layout[r])}/${B.CAP}</text></g>`));
    [70, 110, 150].forEach(x => (s += `<circle class="c" cx="${x}" cy="470" r="6"/>`));
    s += `<text class="sm" x="210" y="474" text-anchor="middle">↑ 电缆从柜底格兰头进线</text><text class="sm" x="43" y="28" text-anchor="middle" style="fill:var(--live)">强电</text><text class="sm" x="377" y="28" text-anchor="middle" style="fill:var(--neutral)">弱电</text>`;
    for (const k in g) {
      if (k === 'IN') continue;
      const p = g[k], pt = B.part(k);
      s += `<g class="bp${pick === k ? ' sel' : ''}" data-placed="${k}">${PP.R.mini(k, p.x, p.y, p.w, p.h, 'bd-', pt.lab)}<rect class="ol" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="3"/></g>`;
    }
    if (wires) B.wires.forEach((w, i) => {
      const v = wires[w.k] || {}, pts = route(w, v, g, i); if (!pts) return;
      const c = COL[v.col] || '#7a837c', bad = marks && marks[w.k] === false;
      s += `<g class="bw${bad ? ' bad' : ''}"><polyline class="bwe" points="${pts}"/><polyline class="bwc" points="${pts}" style="stroke:${c}"/>${v.col === '黄绿双色' ? `<polyline class="bwc" points="${pts}" style="stroke:#f2c200;stroke-dasharray:5 5"/>` : ''}</g>`;
    });
    return s;
  }

  // ---------- 页面 ----------
  const STAGES = [['看图纸', '任务书、主回路、I/O 表'], ['选元件', '断路器、接触器、电源…'], ['布置', '装上导轨，分区排列'], ['走线', '截面、颜色、走哪条线槽'], ['验收出图', '打分、元件清单']];
  function mount(el) {
    el.innerHTML = `<div class="page">
  <div class="page-head"><h1>配柜实战</h1><p>对照图纸，自己做一台控制柜：先看懂图纸和任务书，再选元件、把元件装上导轨、决定每根线用多粗、什么颜色、走哪条线槽，最后验收出图。</p></div>
  <ol class="steps" id="bst"></ol>
  <div id="bv"></div>
</div>`;
    const $ = id => el.querySelector('#' + id);
    const done = i => [!!st.seen[0], B.sel.every(it => st.sel[it.k] != null), B.parts.every(p => st.layout.some(r => r.includes(p.k))), B.wires.every(w => { const v = st.wires[w.k] || {}; return v.sec && v.col && v.duct !== undefined && v.duct !== ''; }), !!st.seen[4]][i];
    function drawStages() { $('bst').innerHTML = STAGES.map(([t, d], i) => `<li class="${i === st.stage ? 'cur' : done(i) ? 'done' : ''}"><button data-st="${i}"><span class="no">${done(i) && i !== st.stage ? '✓' : i + 1}</span><span><b>${t}</b><small>${d}</small></span></button></li>`).join(''); }
    const next = (t = '下一步') => st.stage < 4 ? `<div class="tools"><button class="b primary" data-st="${st.stage + 1}">${t}：${STAGES[st.stage + 1][0]} →</button></div>` : '';

    function vDraw() {
      const F = PP.frame({ name: B.task.name + ' 主回路', vb: '0 0 320 395', sch: mainSch }, 29);
      return `<div class="cols2"><section class="card"><h2>主回路原理图<span>图号 PP-30 · 控制回路见 PLC I/O 表</span></h2><div class="svgwrap"><svg class="sch" viewBox="${F.vb}" style="max-width:520px;margin:auto">${F.svg}</svg></div>
        <p class="cap">看图顺序：电从 L1 L2 L3 进来 → <b>QF0 总断路器</b> → <b>QF1 电机断路器</b> → 分成两路：<b>KM1 正转</b>、<b>KM2 反转</b>（KM2 把 L1 和 L3 对调）→ <b>FR 热继电器</b> → 电机。KM1 和 KM2 绝对不能同时吸合，所以要互锁。</p></section>
        <div style="display:flex;flex-direction:column;gap:14px"><section class="card"><h2>任务书</h2><div class="tblwrap"><table>${B.task.lines.map(r => `<tr><th style="white-space:nowrap">${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table></div></section>
        <section class="card"><h2>PLC I/O 分配表</h2><div class="tblwrap"><table><tr><th>地址</th><th>元件</th><th>说明</th></tr>${B.task.io.map(r => `<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table></div>
        <p class="cap">控制回路的接法在「接线实训」里都练过：PLC 控制正反转、PNP 传感器、电磁阀。这里重点是<b>整台柜子</b>怎么选、怎么排、怎么走线。</p></section>${next('看懂了')}</div></div>`;
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
        <div class="legend"><span><i style="background:#c98a5a"></i>强电线槽</span><span><i style="background:#6f8fc4"></i>弱电线槽</span><span><i style="background:#9aa3a0"></i>横向线槽</span></div></section>
        <section class="card"><h2>元件托盘<span>${left.length ? `还有 ${left.length} 个没装` : '全部装好了'}</span></h2>
        <div class="tray">${left.map(p => `<button class="bp-btn ${p.cls}" data-pick="${p.k}" aria-pressed="${pick === p.k}"><b>${p.lab}</b><small>${p.sub} · ${p.u} 格</small></button>`).join('') || '<p class="cap">点「检查布置」看看排得对不对。</p>'}</div>
        ${pick ? `<div class="tools"><span class="cap">把 <b>${pick}</b> 装到：</span>${[0, 1, 2].map(r => `<button class="b small" data-row="${r}">${['上排', '中排', '下排'][r]}</button>`).join('')}</div>` : ''}
        <div class="tools"><button class="b primary" id="lchk">检查布置</button><button class="b ghost" id="lans">看参考布置</button><button class="b ghost danger" id="lclr">全部拆下</button></div>
        ${res ? `<ul class="rulelist">${res.map(r => `<li class="${r.ok ? 'ok' : 'no'}"><b>${r.ok ? '✓' : '✗'} ${r.name}</b>${r.ok ? '' : `<br><span class="cap">${r.why}</span>`}</li>`).join('')}</ul>` : `<p class="cap">布置原则：电从上往下、从左往右；强电、弱电分开；端子排放最下面靠近进线。</p>`}
        ${next()}</section></div>`;
    }
    function vWire() {
      const lay = B.parts.every(p => st.layout.some(r => r.includes(p.k))) ? st.layout : B.answer, res = showW ? B.gradeWires(st.wires) : null;
      const marks = res ? Object.fromEntries(res.map(r => [r.k, r.n === 3])) : null;
      const sel = (k, f, opts, v) => `<select data-wk="${k}" data-wf="${f}"><option value="">—</option>${opts.map((o, i) => { const val = f === 'duct' ? i : o; return `<option value="${val}"${String(v) === String(val) ? ' selected' : ''}>${f === 'sec' ? o + ' mm²' : o}</option>`; }).join('')}</select>`;
      return `<div class="cols2 wgrid"><section class="card"><h2>走线图<span>${lay === B.answer ? '你的布置还没装完，这里先用参考布置' : '按你的布置'} · 选好线槽线就会画出来</span></h2>
        <div class="svgwrap"><svg class="cab" viewBox="0 0 420 486" style="max-width:520px;margin:auto">${cabSVG(lay, st.wires, marks)}</svg></div>
        <p class="cap">线从元件竖直进上方的横线槽，横着走到侧边竖线槽，再走到目标那一排：<b>横平竖直、强弱分槽</b>。</p></section>
        <section class="card"><h2>每根线怎么走<span>选截面、颜色和线槽</span></h2><div class="tblwrap"><table class="wtbl"><tr><th>导线</th><th>截面</th><th>颜色</th><th>线槽</th></tr>${B.wires.map(w => {
          const v = st.wires[w.k] || {}, r = res && res.find(x => x.k === w.k), m = ok => (r ? (ok ? ' ok' : ' no') : '');
          return `<tr><td>${w.name}${r && r.n < 3 ? `<div class="cap">${w.why}</div>` : ''}</td><td class="${m(r && r.okS)}">${sel(w.k, 'sec', B.SEC, v.sec)}</td><td class="${m(r && r.okC)}">${sel(w.k, 'col', B.COL, v.col)}</td><td class="${m(r && r.okD)}">${sel(w.k, 'duct', B.DUCT, v.duct)}</td></tr>`;
        }).join('')}</table></div>
        <div class="tools"><button class="b primary" id="wchk">检查走线</button>${res ? `<span class="cap">对了 ${res.reduce((a, r) => a + r.n, 0)} / ${res.length * 3} 项${res.every(r => r.n === 3) ? '，全对！' : '，红色格子要改，下面写了原因'}</span>` : ''}</div>${next()}</section></div>`;
    }
    function vDone() {
      const sc = B.score(st), s = B.gradeSel(st.sel), lay = B.parts.every(p => st.layout.some(r => r.includes(p.k))) ? st.layout : null;
      const card = (k, v, d) => `<div class="r"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${d}</div></div>`;
      const lv = sc.total >= 90 ? '优秀：这台柜子可以交给师傅验收了' : sc.total >= 70 ? '合格：还有几处要改，回到对应步骤看红色提示' : '还要再练：按步骤一项项改';
      return `<section class="card"><h2>验收结果<span>${lv}</span></h2><div class="result">${card('总分', `${sc.total}`, '满分 100')}${card('选元件', `${sc.sel} / 40`, '推荐满分，能用但不推荐给一半')}${card('布置', `${sc.lay} / 30`, '7 条布置原则')}${card('走线', `${sc.wire} / 30`, '截面、颜色、线槽')}</div></section>
      <div class="cols2"><section class="card"><h2>柜内布置与走线图<span>图号 PP-30-02</span></h2>${lay ? `<div class="svgwrap"><svg class="cab" viewBox="0 0 420 486" style="max-width:520px;margin:auto">${cabSVG(lay, st.wires)}</svg></div>` : '<p class="cap">布置还没完成，回到「布置」把元件装完。</p>'}</section>
      <section class="card"><h2>元件清单（BOM）</h2><div class="tblwrap"><table><tr><th style="white-space:nowrap">代号</th><th>名称</th><th>你选的规格</th><th>评价</th></tr>${s.map(r => `<tr><td class="mono">${r.k}</td><td>${r.name.startsWith(r.k + ' ') ? r.name.slice(r.k.length + 1) : r.name}</td><td>${r.pick || '—'}</td><td>${r.g < 0 ? '<span class="tag miss">没选</span>' : `<span class="tag ${['bad', 'miss', 'ok'][r.g]}">${['错', '可改进', '推荐'][r.g]}</span>`}</td></tr>`).join('')}</table></div>
      <div class="tools"><button class="b" id="bprint">打印 / 存成 PDF</button><button class="b ghost danger" id="breset">清空重做</button></div></section></div>`;
    }

    function draw() {
      st.seen[st.stage] = true; save(); drawStages();
      $('bv').innerHTML = [vDraw, vSel, vLay, vWire, vDone][st.stage]();
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
      const t = e.target.closest('[data-st],[data-sk],[data-pick],[data-row],[data-placed],button');
      if (!t) return;
      if (t.dataset.st !== undefined) { st.stage = +t.dataset.st; pick = null; draw(); el.scrollIntoView({ behavior: 'smooth' }); return; }
      if (t.dataset.sk) { st.sel[t.dataset.sk] = +t.dataset.si; draw(); return; }
      if (t.dataset.pick) { pick = pick === t.dataset.pick ? null : t.dataset.pick; draw(); return; }
      if (t.dataset.row !== undefined) { place(+t.dataset.row); return; }
      if (t.dataset.placed) { const k = t.dataset.placed; st.layout.forEach(row => { const i = row.indexOf(k); if (i >= 0) row.splice(i, 1); }); pick = k; showL = false; draw(); return; }
      if (t.id === 'lchk') { showL = true; draw(); }
      if (t.id === 'lans') { st.layout = B.answer.map(r => r.slice()); pick = null; showL = true; draw(); }
      if (t.id === 'lclr') { st.layout = [[], [], []]; pick = null; showL = false; draw(); }
      if (t.id === 'wchk') { showW = true; draw(); }
      if (t.id === 'bprint') window.print();
      if (t.id === 'breset') { st = blank(); pick = null; showW = showL = false; draw(); }
    });
    el.addEventListener('change', e => {
      const s = e.target.closest('[data-wk]'); if (!s) return;
      const v = (st.wires[s.dataset.wk] = st.wires[s.dataset.wk] || {});
      v[s.dataset.wf] = s.value; draw();
    });
    draw();
  }

  PP.PAGES = PP.PAGES || [];
  PP.PAGES.push({ id: 'build', title: '配柜实战', order: 3.5, mount, onShow: () => PP.prog.setLast({ t: 'build', id: 'build', name: '配柜实战' }) });
})(window);
