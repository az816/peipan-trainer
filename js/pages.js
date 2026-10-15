// pages.js — 识图入门、柜体布局、选型计算（第二批）
(function (G) {
  const PP = G.PP;
  PP.PAGES = PP.PAGES || [];
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // ---------- 通用：选择题 ----------
  PP.quizBox = (el, qs, o = {}) => {
    const st = qs.map(() => null);
    // 选项每次打乱顺序：不能靠“总选中间那个”蒙对（o.keep 保留原顺序）
    const ord = qs.map(q => { const a = q[2].map((_, j) => j); if (!o.keep) for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; });
    const draw = () => {
      const n = st.filter((a, i) => a === qs[i][3]).length, done = st.filter(a => a !== null).length;
      el.innerHTML = `<p class="cap">共 ${qs.length} 题 · 已答 ${done} · 答对 <span class="score">${n}</span>${done === qs.length ? `　${n === qs.length ? '全对，厉害！' : n >= qs.length * 0.8 ? '不错，看看错的那几道。' : '多回到实训里练练。'}` : ''}</p><div class="quiz">${qs.map((q, i) => `<div class="q${st[i] === null ? '' : st[i] === q[3] ? ' ok' : ' bad'}"><p><span class="qn">${i + 1}</span>${q[1]}</p><div class="opts">${ord[i].map(j => { const t = q[2][j];
        const a = st[i], c = a === null ? '' : j === q[3] ? 'right' : j === a ? 'wrong' : '';
        return `<button data-q="${i}" data-a="${j}" class="${c}"${a !== null ? ' disabled' : ''}>${t}</button>`;
      }).join('')}</div>${st[i] !== null ? `<div class="why">${st[i] === q[3] ? '✔ 对。' : '✘ 不对。'}${q[4]}</div>` : ''}</div>`).join('')}</div>${o.again ? '<div class="tools"><button class="b ghost" data-again="1">换一组题</button></div>' : ''}`;
    };
    el.onclick = e => {
      const b = e.target.closest('[data-q]');
      if (b) { const i = +b.dataset.q; st[i] = +b.dataset.a; if (o.onAnswer) o.onAnswer(qs[i], st[i] === qs[i][3]); draw(); return; }
      if (e.target.closest('[data-again]') && o.again) o.again();
    };
    draw();
  };
  const pick = (arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  PP.pick = pick;

  // ---------- 识图入门 ----------
  function mountRead(el) {
    el.innerHTML = `<div class="page">
  <div class="page-head"><h1>识图入门</h1><p>装配电工第一步：先学会看懂电气图。看懂图纸，才能接对线、装对控制柜。这一页对应学习路线第 1 关，做完页面最下面的小测就算学完。</p></div>
  <section class="card"><h2>电气图的三种类型<span>配一台柜子，这三张图对着看</span></h2>
    <div class="cols3">
      <div><h3>电气原理图</h3><p>表达电路怎么工作、元件之间的电气关系。看“谁和谁连、为什么这样连”。</p><button class="b small" data-ex="hold">去看自锁电路的原理图</button></div>
      <div><h3>电气接线图 / 接线表</h3><p>指导实际接线：每根线从哪个端子到哪个端子、线号是多少。</p><button class="b small" data-ex="hold" data-view="wl">去看自锁电路的接线表</button></div>
      <div><h3>元件布置图</h3><p>元件在柜里装在哪、怎么排列、线槽怎么走。</p><button class="b small" data-go="cab">去看电柜布置图</button></div>
    </div></section>
  <section class="card"><h2>看图四步</h2>
    <ol class="rules">
      <li><b>先看图名和图例</b>：这张图画的是什么设备、用了哪些符号。</li>
      <li><b>再看主电路</b>：电从电源进来，经过断路器、接触器主触点、热继电器，到电机。搞清楚负载是谁。</li>
      <li><b>最后看控制电路</b>：上面 L（或 +24V），下面 N（或 0V），电从上往下走；一个个元件看，它通了谁就动作。</li>
      <li><b>理清动作过程</b>：按下哪个按钮 → 哪个线圈得电 → 它的哪些触点动作 → 又带动了什么。</li>
    </ol>
    <h3 style="margin-top:12px">三个看图诀窍</h3><ul class="rules"><li><b>文字代号相同就是同一个设备</b>：KM1 的线圈和触点常分开画。</li><li><b>线号相同的端子要连在一起。</b></li><li>触点下面的 <b>“/5”</b>：它的线圈在第 5 区（交叉引用）。</li></ul><p class="cap">图纸画的都是<b>没通电、没按按钮</b>时的状态。</p></section>
  <section class="card" id="sym"><h2>常用电气图符号<span>点符号看说明</span></h2>
    <div class="cols2"><div class="symgrid" id="symgrid"></div><div class="card" id="symdetail" style="background:var(--bg)"><h3>点左边的符号</h3><p>这里会说明它的名字、文字代号、怎么认。</p></div></div></section>
  <section class="card"><h2>符号认读测验<span>看符号选名字，一组 10 题</span></h2><div id="symquiz"></div></section>
  <section class="card"><h2>识图测验</h2><div id="readquiz"></div></section>
</div>`;
    const g = el.querySelector('#symgrid');
    g.innerHTML = PP.SYMS.map((s, i) => `<button class="symcard" data-s="${i}" aria-pressed="false">${PP.symSVG(s)}<div class="nm">${s.name}</div><div class="cd">${s.code}</div></button>`).join('');
    g.onclick = e => {
      const b = e.target.closest('[data-s]'); if (!b) return;
      const s = PP.SYMS[+b.dataset.s];
      g.querySelectorAll('.symcard').forEach(c => c.setAttribute('aria-pressed', c === b));
      const pd = PP.partOfSym && PP.partOfSym(s.id);
      el.querySelector('#symdetail').innerHTML = `<div class="symreal"><div class="sr-sym">${PP.symSVG(s)}<span>图纸上</span></div>${pd ? `<div class="sr-part">${PP.R.part(pd, 'sd-')}<span>柜子里</span></div>` : ''}</div><h3>${s.name}${s.code ? ` <span class="mono" style="color:var(--muted)">${s.code}</span>` : ''}</h3><p>${s.d}</p>${pd ? '<p class="cap">更多对照：学习路线第 1 关「符号 ↔ 实物 ↔ 端子」。</p>' : ''}`;
    };
    const symQuiz = () => {
      const qs = pick(PP.SYMS, 10).map(s => {
        const wrong = pick(PP.SYMS.filter(x => x.name !== s.name), 3).map(x => x.name);
        const opts = pick([s.name, ...wrong], 4);
        return ['', `<span style="display:block;max-width:200px">${PP.symSVG(s)}</span>这是什么符号？`, opts, opts.indexOf(s.name), s.d];
      });
      PP.quizBox(el.querySelector('#symquiz'), qs, { again: symQuiz });
    };
    symQuiz();
    const rq = () => PP.quizBox(el.querySelector('#readquiz'), pick(PP.QZ.filter(q => q[0] === '识图'), 6), { again: rq, ...(() => { const t = PP.prog.pageQuiz('read'), box = el.querySelector('#readquiz'); return { onAnswer: (q, r) => { t.onAnswer(q, r); if (t.check(6)) { let m = box.parentNode.querySelector('.pqdone'); if (!m) { m = document.createElement('p'); m.className = 'pqdone'; box.parentNode.appendChild(m); } m.textContent = '这一页学完了 ✓ 学习路线上已打勾'; } } }; })() });
    rq();
  }

  // ---------- 柜体布局 ----------
  function cabSVG(showZones) {
    const C = PP.CAB, R = (k, x, y, w, h, cls, lb, sm) => `<g data-k="${k}"><rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>${lb ? `<text class="lb" x="${x + w / 2}" y="${y + h / 2 + (sm ? -2 : 4)}">${lb}</text>` : ''}${sm ? `<text class="sm" x="${x + w / 2}" y="${y + h / 2 + 10}" text-anchor="middle">${sm}</text>` : ''}</g>`;
    let s = PP.R.defs('cb-') + `<defs><pattern id="pe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="#f2c200"/><rect x="4" width="4" height="8" fill="#2b8a3e"/></pattern></defs>`;
    s += `<text class="sm" x="20" y="16" style="font-size:12px;font-weight:700;fill:var(--ink)">柜内安装板（正视）</text><text class="sm" x="360" y="16" style="font-size:12px;font-weight:700;fill:var(--ink)">柜门（外视）</text>`;
    s += `<rect class="cabinet" x="20" y="30" width="300" height="400" rx="4"/><rect class="plate" x="35" y="45" width="270" height="370"/>`;
    s += R('fan', 240, 22, 50, 8, 'c', '', '') + `<text class="sm" x="265" y="20" text-anchor="middle">排风扇</text>`;
    s += `<path class="dim" d="M20 440V452M320 440V452M20 448H320"/><text class="dimt" x="170" y="462">600</text><path class="dim" d="M8 30H14M8 430H14M11 30V430"/><text class="dimt" x="4" y="234" transform="rotate(-90 4 234)">800</text>`;
    [99, 195, 290].forEach(y => (s += `<g data-k="rail"><rect class="rail" x="56" y="${y}" width="228" height="6"/></g>`));
    s += R('ductdc', 38, 48, 14, 364, 'duct dc') + R('ductac', 288, 48, 14, 364, 'duct ac');
    [48, 140, 236, 326].forEach(y => (s += R('duct', 52, y, 236, 13, 'duct')));
    for (const it of C.items) s += `<g data-k="${it.k}">${PP.R.mini(it.k, it.x, it.y, it.w, it.h, 'cb-', it.lb)}${it.hot ? `<path d="M${it.x + it.w - 9} ${it.y + 2}h7v7z" fill="#ff7a1a"/>` : ''}<rect class="ol" x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" rx="2"/></g>`;
    s += `<g data-k="pe"><rect class="pe" fill="url(#pe)" x="58" y="352" width="100" height="12"/></g><text class="sm" x="108" y="378" text-anchor="middle">PE 接地排</text>`;
    [80, 120, 160, 200, 240].forEach(x => (s += `<g data-k="gland"><circle class="c" cx="${x}" cy="430" r="7"/></g>`));
    s += `<text class="sm" x="170" y="476" text-anchor="middle">↑ 电缆从底部进线（格兰头）</text>`;
    if (showZones) s += `<g data-k="zac"><rect class="zone" x="54" y="62" width="132" height="168" stroke="var(--live)"/></g><g data-k="zctl"><rect class="zone" x="189" y="64" width="99" height="166" stroke="var(--accent)"/></g><g data-k="zdc"><rect class="zone" x="54" y="256" width="148" height="62" stroke="var(--neutral)"/></g><text class="sm" x="58" y="76" style="fill:var(--live);font-weight:700">强电区</text><text class="sm" x="248" y="76" style="fill:var(--accent);font-weight:700">控制区</text><text class="sm" x="150" y="312" style="fill:var(--neutral);font-weight:700">弱电区</text>`;
    s += `<rect class="cabinet" x="360" y="30" width="260" height="400" rx="4"/>`;
    s += `<g data-k="hmi"><rect x="420" y="60" width="140" height="90" rx="4" fill="#2a2e31"/><rect x="428" y="67" width="124" height="70" fill="#163a52"/><rect x="434" y="73" width="50" height="14" fill="#2fa457"/><rect x="490" y="73" width="50" height="14" fill="#d63a2f"/><rect x="434" y="95" width="106" height="34" fill="#1e5577"/><text x="487" y="116" text-anchor="middle" style="font-size:10px;fill:#d7e7f2">HMI 触摸屏 7 寸</text><circle cx="490" cy="143" r="2" fill="#3ad65d"/><rect class="ol" x="420" y="60" width="140" height="90" rx="4"/></g>`;
    s += `<g data-k="lamps"><circle cx="430" cy="185" r="13" fill="url(#cb-ch)" stroke="#6b7074"/><circle cx="430" cy="185" r="9" fill="#f4f4ee" stroke="rgba(0,0,0,.35)"/><ellipse cx="427" cy="181" rx="3.6" ry="2.25" fill="#fff" opacity=".4"/><circle cx="490" cy="185" r="13" fill="url(#cb-ch)" stroke="#6b7074"/><circle cx="490" cy="185" r="9" fill="url(#cb-lg)" stroke="rgba(0,0,0,.35)"/><ellipse cx="487" cy="181" rx="3.6" ry="2.25" fill="#fff" opacity=".4"/><circle cx="550" cy="185" r="13" fill="url(#cb-ch)" stroke="#6b7074"/><circle cx="550" cy="185" r="9" fill="url(#cb-lr)" stroke="rgba(0,0,0,.35)"/><ellipse cx="547" cy="181" rx="3.6" ry="2.25" fill="#fff" opacity=".4"/><rect class="ol" x="414" y="170" width="152" height="30" rx="3"/></g><text class="sm" x="430" y="210" text-anchor="middle">电源</text><text class="sm" x="490" y="210" text-anchor="middle">运行</text><text class="sm" x="550" y="210" text-anchor="middle">故障</text>`;
    s += `<g data-k="buttons"><circle cx="430" cy="245" r="15" fill="url(#cb-ch)" stroke="#6b7074"/><circle cx="430" cy="245" r="11" fill="url(#cb-cg)" stroke="rgba(0,0,0,.35)"/><ellipse cx="427" cy="241" rx="4.4" ry="2.75" fill="#fff" opacity=".4"/><circle cx="490" cy="245" r="15" fill="url(#cb-ch)" stroke="#6b7074"/><circle cx="490" cy="245" r="11" fill="url(#cb-cr)" stroke="rgba(0,0,0,.35)"/><ellipse cx="487" cy="241" rx="4.4" ry="2.75" fill="#fff" opacity=".4"/><circle cx="550" cy="245" r="15" fill="url(#cb-ch)" stroke="#6b7074"/><circle cx="550" cy="245" r="11" fill="url(#cb-cb)" stroke="rgba(0,0,0,.35)"/><ellipse cx="547" cy="241" rx="4.4" ry="2.75" fill="#fff" opacity=".4"/><rect class="ol" x="412" y="227" width="156" height="36" rx="3"/></g><text class="sm" x="430" y="272" text-anchor="middle">启动</text><text class="sm" x="490" y="272" text-anchor="middle">停止</text><text class="sm" x="550" y="272" text-anchor="middle">复位</text>`;
    s += `<g data-k="estop"><circle cx="490" cy="318" r="27" fill="url(#cb-cy)" stroke="#a08000"/><circle cx="490" cy="318" r="17" fill="url(#cb-cr)" stroke="#7a120d"/><ellipse cx="485" cy="311" rx="7" ry="4" fill="#fff" opacity=".3"/><rect class="ol" x="462" y="290" width="56" height="56" rx="28"/></g><text class="sm" x="490" y="358" text-anchor="middle">急停</text>`;
    s += `<g data-k="sel"><circle cx="430" cy="318" r="15" fill="url(#cb-ch)" stroke="#6b7074"/><circle cx="430" cy="318" r="11" fill="#1d2022"/><rect x="427" y="307" width="6" height="22" rx="2" fill="#e9ece8" transform="rotate(-30 430 318)"/><rect class="ol" x="414" y="302" width="32" height="32" rx="16"/></g><text class="sm" x="430" y="346" text-anchor="middle">手动/自动</text>`;
    s += `<g data-k="lock"><rect class="c" x="598" y="220" width="12" height="30" rx="3"/></g>`;
    s += `<g data-k="filter"><rect class="c" x="420" y="372" width="140" height="40"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="${430 + i * 20}" y1="376" x2="${430 + i * 20}" y2="408" stroke="var(--dev-edge)" pointer-events="none"/>`).join('')}</g><text class="sm" x="490" y="424" text-anchor="middle">进风过滤网</text>`;
    return s;
  }
  function badCabSVG(found) {
    let s = PP.R.defs('cb2-') + `<rect class="cabinet" x="20" y="30" width="300" height="400" rx="4"/><rect class="plate" x="35" y="45" width="270" height="370"/>`;
    const R = (x, y, w, h, lb) => `<g pointer-events="none">${PP.R.mini(/^X1/.test(lb) ? 'x1' : /^TC/.test(lb) ? 'tc' : /^KM/.test(lb) ? 'km' : /^PS/.test(lb) ? 'ps' : /^QF/.test(lb) ? 'qf' : lb.toLowerCase(), x, y, w, h, 'cb2-', lb)}</g>`;
    s += R(58, 64, 226, 30, 'X1 端子排（信号 + 动力）');
    s += R(58, 110, 62, 60, 'TC 15kg', 'c hot') + `<text class="sm" x="89" y="106" text-anchor="middle">变压器</text>` + R(130, 112, 30, 50, 'QF') + R(166, 112, 26, 44, 'KM1') + R(196, 112, 26, 44, 'KM2');
    s += R(120, 180, 78, 52, 'PLC') + R(200, 178, 50, 56, 'VFD', 'c hot');
    s += `<rect class="duct" x="40" y="238" width="262" height="14" pointer-events="none"/>${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${60 + i * 36}" y1="240" x2="${80 + i * 36}" y2="250" stroke="${i % 2 ? 'var(--dcn)' : 'var(--live)'}" stroke-width="2.5" pointer-events="none"/>`).join('')}<text class="sm" x="171" y="264" text-anchor="middle">380V 动力线 + 24V 信号线 同一线槽</text>`;
    s += R(70, 280, 60, 40, 'PS 24V', 'c hot') + R(150, 284, 30, 40, 'QF1') + R(186, 284, 30, 40, 'QF2');
    s += `<text class="sm" x="170" y="476" text-anchor="middle">↑ 电缆从底部进线</text>`;
    for (const b of PP.BADCAB) s += `<rect data-bad="${b.k}" class="${found.has(b.k) ? 'found' : ''}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="transparent" stroke="${found.has(b.k) ? 'var(--ok)' : 'none'}" stroke-width="3" style="cursor:pointer"/>`;
    return s;
  }
  function mountCab(el) {
    el.innerHTML = `<div class="page">
  <div class="page-head"><h1>柜体布局与走线规范</h1><p>布局合理，散热好，维护方便，故障少。规范接线不是为了好看，而是为了安全、稳定、方便维护。</p></div>
  <section class="card"><h2>电柜布置图<span>示例：600 × 800 小型自动化设备控制柜 · 点任意部件看说明</span></h2>
    <div class="cols2"><div><div class="svgwrap"><svg id="cabsvg" class="cab" viewBox="0 0 640 480"></svg></div>
      <div class="legend"><span><i style="background:#c98a5a"></i>强电线槽</span><span><i style="background:#6f8fc4"></i>弱电线槽</span><span><i style="background:#9aa3a0"></i>横向线槽</span><span><i style="background:#ff7a1a"></i>发热元件（右上角橙色三角）</span></div>
      <div class="tools"><button class="b small on" id="zonebtn" aria-pressed="false">显示分区</button></div></div>
      <div class="card" id="cabinfo" style="background:var(--bg)"><h3>点左边的部件</h3><p>这里会说明它为什么装在这个位置、安装时要注意什么。</p></div></div></section>
  <div class="cols2">
    <section class="card"><h2>布局五原则</h2><ol class="rules">
      <li><b>分区明确</b>：强电区、控制区、弱电区分开布置，互不干扰。</li>
      <li><b>重的放中下部</b>：变压器这类重元件放中下部，重心稳，安装板不变形；发热元件放上部靠近排风。</li>
      <li><b>左右对称</b>：同类元件成排对齐，走线顺畅，好看好查。</li>
      <li><b>预留空间</b>：元件之间、元件和线槽之间留 20–30 mm，方便接线和散热；导轨和端子排留 10–20% 备用位置。</li>
      <li><b>走线规范</b>：线槽走线，横平竖直，转角 90°。</li></ol></section>
    <section class="card"><h2>横平竖直的接线要点</h2><ol class="rules">
      <li>线缆走线尽量水平或垂直；</li><li>转角处用线槽或 90° 弯头；</li><li>避免斜拉、交叉、重叠；</li><li>同类线缆走同一路径；</li><li>绑扎整齐，每隔 15–20 cm 用扎带固定，间距一致；</li><li>预留 10–15 cm 余量，便于维护；弯曲半径不小于导线外径 6 倍。</li></ol>
      <p class="cap"><b>口诀：</b>横平竖直是基础；线槽转角用弯头；强弱分开不交叉；绑扎整齐间距匀。在「接线实训」里点「线槽走线」就能看到横平竖直的效果。</p></section>
  </div>
  <div class="cols2">
    <section class="card"><h2>端子排接线规范</h2><ol class="rules">
      <li><b>线号清晰，一线一号</b>：每根线两头套线号管，与图纸一致。</li>
      <li><b>压接牢固</b>：用合适的冷压端头，压紧不松散，避免虚接发热。</li>
      <li><b>走线整齐</b>：横平竖直，避免交叉凌乱。</li>
      <li><b>预留长度</b>：便于拆卸更换，不宜过短或过长。</li>
      <li><b>分组明确</b>：按功能分组，不同回路分开。</li></ol>
      <div class="tblwrap"><table><tr><th>端子排分组</th><th>接什么</th><th>常用线号</th></tr><tr><td>电源端子</td><td>电源进出线</td><td class="mono">001–099</td></tr><tr><td>输入信号</td><td>按钮、传感器</td><td class="mono">100–199</td></tr><tr><td>控制回路</td><td>控制信号</td><td class="mono">200–299</td></tr><tr><td>输出信号</td><td>指示灯、继电器、电磁阀</td><td class="mono">300–399</td></tr></table></div><p class="cap">线号规则各厂不同，以本厂图纸为准。实训里 PLC 练习用的就是 101、301 这种线号。</p></section>
    <section class="card"><h2>导线颜色与截面</h2>
      <div class="tblwrap"><table><tr><th>颜色</th><th>用途</th></tr>
        <tr><td colspan="2" class="cap"><b>国标 GB 7947 规定</b></td></tr>
        <tr><td><span style="color:#5fa8e8">■</span> 浅蓝</td><td>N 中性线</td></tr><tr><td>■ 黄绿双色</td><td>PE 保护接地（专用，不能他用）</td></tr>
        <tr><td colspan="2" class="cap"><b>GB/T 5226.1（机械电气设备）推荐</b></td></tr>
        <tr><td><span style="color:var(--live)">■</span> 红</td><td>交流控制回路</td></tr><tr><td><span style="color:var(--neutral)">■</span> 蓝</td><td>直流控制回路（很多厂 24V+ 用棕 / 红，0V 用蓝）</td></tr><tr><td>■ 黑</td><td>交直流动力电路（设备厂动力线一般全黑 + 线号管）</td></tr><tr><td><span style="color:var(--accent)">■</span> 橙</td><td>例外电路：总开关断开后仍然带电的联锁线</td></tr>
        <tr><td colspan="2" class="cap"><b>国内配电惯例</b></td></tr><tr><td><span style="color:var(--p1)">■</span> 黄 / <span style="color:var(--p2)">■</span> 绿 / <span style="color:var(--p3)">■</span> 红</td><td>L1 / L2 / L3（配电房、母线常用）</td></tr></table></div>
      <div class="tblwrap" style="margin-top:8px"><table><tr><th>铜线截面 mm²</th>${PP.AMP.map(a => `<td class="mono">${a[0]}</td>`).join('')}</tr><tr><th>参考载流 A</th>${PP.AMP.map(a => `<td class="mono">${a[1]}</td>`).join('')}</tr></table></div>
      <ul class="rules cap"><li>表里是柜内线槽、40°C、PVC 铜线的参考值（GB/T 5226.1），条件不同会变。</li><li>控制线：铜芯软线 0.75–1.0 mm²。动力线：按电流选，最小 1.5 mm²。</li><li>线色以国标和本厂规定为准。</li></ul></section>
  </div>
  <section class="card"><h2>新手装配电工最容易犯的 5 个错误</h2><div class="cols3" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">
    ${[['不看图纸直接接线', '凭经验接线，容易接错。', '先看原理图，再确认元件位置。'], ['线号标识错误', '后期维修找不到线路。', '每根线对应编号，图纸和实物一致。'], ['压线不到位', '接触不良、发热、故障。', '使用合适端头，压接牢固。'], ['强弱电混走', '产生干扰，设备不稳定。', '动力线、控制线分开布置。'], ['通电前不检查', '可能短路、烧坏元件。', '检查接线、线号、螺丝紧固、绝缘情况。']].map((m, i) => `<div class="q"><p>${i + 1}. ${m[0]}</p><div class="why"><span class="tag bad">错误</span> ${m[1]}</div><div class="why"><span class="tag ok">正确</span> ${m[2]}</div></div>`).join('')}</div>
    <p class="cap">实训台里这 5 条都有对应：接线前看图、线号表、一个端子只压一根（最多两根）、强电窜弱电会跳闸、送电前检查清单。</p></section>
  <section class="card"><h2>布局纠错<span>这台柜子装错了 5 处，点出来（其中一处是“少了东西”）· 找到 <span class="score" id="badcount">0 / 5</span></span></h2>
    <div class="badgrid"><div class="svgwrap"><svg id="badsvg" class="cab" viewBox="0 0 340 480"></svg></div><div id="badlist"></div></div></section>
  <section class="card"><h2>布局与安全测验</h2><div id="cabquiz"></div></section>
</div>`;
    let zones = false, selK = null;
    const draw = () => { el.querySelector('#cabsvg').innerHTML = cabSVG(zones); if (selK) el.querySelectorAll(`#cabsvg [data-k="${selK}"]`).forEach(g => g.classList.add('sel')); };
    draw();
    el.querySelector('#zonebtn').onclick = e => { zones = !zones; e.target.setAttribute('aria-pressed', zones); draw(); };
    el.querySelector('#cabsvg').onclick = e => {
      const g = e.target.closest('[data-k]'); if (!g) return;
      selK = g.dataset.k; draw();
      const i = PP.CAB.info[selK]; if (!i) return;
      el.querySelector('#cabinfo').innerHTML = `<h3>${i[0]}</h3><p>${i[1]}</p>${(rel => rel.length ? `<p class="cap">相关练习：</p><div class="tools" style="margin-top:4px">${rel.map(x => `<button class="b small" data-ex="${x.id}">${x.name}</button>`).join('')}</div>` : '')(i[2].map(id => PP.EX.find(z => z.id === id)).filter(Boolean))}`;
    };
    const found = new Set();
    const drawBad = () => {
      el.querySelector('#badsvg').innerHTML = badCabSVG(found);
      el.querySelector('#badcount').textContent = `${found.size} / 5`;
      const got = PP.BADCAB.filter(b => found.has(b.k));
      el.querySelector('#badlist').innerHTML = `<p class="cap" style="margin:0 0 8px">${found.size === 5 ? '<b class="ok">全部找到了！</b>这 5 条就是师傅验柜时最先看的地方。' : '看看这台柜子哪里不对，直接点在出问题的地方。想一想：重的东西放哪？强电弱电能不能一起走？少了什么？'}</p><ol class="badslots">${PP.BADCAB.map((_, i) => { const b = got[i]; return b ? `<li class="ok"><b>${b.name}</b><span>${b.why}</span></li>` : `<li><b>第 ${i + 1} 处</b><span>还没找到</span></li>`; }).join('')}</ol>`;
    };
    drawBad();
    el.querySelector('#badsvg').onclick = e => { const r = e.target.closest('[data-bad]'); if (r) { found.add(r.dataset.bad); drawBad(); } };
    const cq = () => PP.quizBox(el.querySelector('#cabquiz'), pick(PP.QZ.filter(q => q[0] === '布局' || q[0] === '安全'), 6), { again: cq, ...(() => { const t = PP.prog.pageQuiz('cab'), box = el.querySelector('#cabquiz'); return { onAnswer: (q, r) => { t.onAnswer(q, r); if (t.check(6)) { let m = box.parentNode.querySelector('.pqdone'); if (!m) { m = document.createElement('p'); m.className = 'pqdone'; box.parentNode.appendChild(m); } m.textContent = '这一页学完了 ✓ 学习路线上已打勾'; } } }; })() });
    cq();
  }

  // ---------- 选型计算 ----------
  function mountCalc(el) {
    el.innerHTML = `<div class="page">
  <div class="page-head"><h1>选型计算</h1><p>输入电机功率，算出额定电流，再选断路器、接触器、热继电器和导线。结果是参考值，最终以元件样本和设计规范为准。</p></div>
  <section class="card"><h2>电机配套元件选型<span>三相 380V 异步电机</span></h2>
    <div class="form">
      <label class="field">电机功率 kW<select id="ckw">${PP.KW.map(k => `<option value="${k}"${k === 4 ? ' selected' : ''}>${k} kW</option>`).join('')}</select></label>
      <label class="field">启动方式<select id="cst"><option value="direct">直接启动</option><option value="yd">星三角降压启动</option></select></label>
      <label class="field">功率因数 cosφ<input id="ccos" type="number" step="0.01" min="0.5" max="1" value="0.85"></label>
      <label class="field">效率 η<input id="ceff" type="number" step="0.01" min="0.5" max="1" value="0.88"></label>
    </div>
    <div class="result" id="cres"></div><div id="cnote"></div></section>
  <div class="cols2">
    <section class="card"><h2>CJX2 接触器常用规格<span>AC-3，380V</span></h2><div class="tblwrap"><table><tr><th>型号</th><th>额定电流</th><th>适用电机</th></tr>${PP.CJX2.map(c => `<tr><td class="mono">${c[0]}</td><td>${c[1]} A</td><td>${c[2]} kW 以下</td></tr>`).join('')}</table></div>
      <ul class="rules cap"><li>CJX2-<b>12</b>10：<b>12</b> 是额定电流 12A。</li><li>最后的 <b>10</b>：1 个常开辅助触点；<b>01</b>：1 个常闭。</li><li>线圈电压另外标（AC220V / AC380V / DC24V），要和控制电压一致。</li></ul></section>
    <section class="card"><h2>热继电器整定</h2><div class="tblwrap"><table><tr><th>电机功率</th><th>额定电流</th><th>整定电流（约 1.0 倍）</th></tr>${[0.75, 1.5, 2.2, 3, 4].map(k => { const r = PP.calcMotor(k); return `<tr><td>${k} kW</td><td>${r.I.toFixed(1)} A</td><td>${r.set[0].toFixed(1)} – ${r.set[1].toFixed(1)} A</td></tr>`; }).join('')}</table></div>
      <ol class="rules" style="margin-top:8px"><li>按电机<b>铭牌</b>额定电流选，整定范围要包含它（最好在中间）；小电机功率因数和效率低，实际电流常比估算大，一定看铭牌；</li><li>整定值就等于铭牌额定电流（0.95–1.05 倍，不超过 1.05 倍）：热继电器 1.05 倍不动作、1.2 倍才动作，余量已经包含在里面；</li><li>热继电器不能代替短路保护，必须配合熔断器或断路器；</li><li>过载跳开后先排除故障再复位。整定时把旋钮对准刻度上的电流值。</li></ol><p class="cap">表里的整定档位对应正泰 NR2 / 施耐德 LRD 系列；JR36 的档位不同，以样本为准。</p></section>
  </div>
  <section class="card"><h2>选型测验</h2><div id="calcquiz"></div></section>
</div>`;
    const $ = id => el.querySelector('#' + id);
    const run = () => {
      const kW = +$('ckw').value, start = $('cst').value, r = PP.calcMotor(kW, { start, cos: +$('ccos').value || 0.85, eff: +$('ceff').value || 0.88 });
      const card = (k, v, s) => `<div class="r"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
      $('cres').innerHTML = card('电机额定电流', `${r.I.toFixed(1)} A`, `I = P ÷ (√3 × U × cosφ × η)；经验：1 kW ≈ 2 A`)
        + card('断路器', r.brk ? `${r.brk} A` : '—', '经验值：D 曲线约 1.5–2 倍额定电流。电机回路也常用电动机保护断路器（GV2 / 3RV 一类），整定等于额定电流，可兼做过载保护')
        + card(start === 'yd' ? '主接触器 / 三角形接触器' : '接触器', r.km ? r.km[0] : '超出表格', start === 'yd' ? `按相电流 ${r.Iph.toFixed(1)} A 选，实际常放大一档留余量` : `按电机功率选（AC-3），频繁启停放大一档`)
        + (start === 'yd' ? card('星形接触器', r.kmY ? r.kmY[0] : '—', `星形时电流约 1/3：${(r.I / 3).toFixed(1)} A`) : '')
        + card('热继电器整定', `${r.setRec.toFixed(1)} A`, r.fr ? `选整定范围 ${r.fr[0]}–${r.fr[1]} A 的热继电器${start === 'yd' ? '（装在主接触器后面、接电机 U1/V1/W1 的绕组回路里，按相电流 0.58 倍整定；装在进线侧就按 1.0 倍）' : ''}` : '超出表格')
        + card('动力线截面（铜）', r.wire ? `${r.wire[0]} mm²` : '—', r.wire ? `参考载流 ${r.wire[1]} A ≥ 1.25 × ${r.I.toFixed(1)} A` : '');
      $('cnote').innerHTML = r.suggestYD ? `<ul class="rules cap" style="color:var(--accent-ink)"><li>${kW} kW 电机直接启动电流约是额定的 5–7 倍（约 ${(r.I * 6).toFixed(0)} A）。</li><li>能不能直接启动看供电容量，很多厂 11 kW 以上改用星三角、软启动或变频器。</li><li>只有铭牌写“380V △”的电机才能星三角启动。</li></ul>` : '';
    };
    ['ckw', 'cst', 'ccos', 'ceff'].forEach(id => $(id).addEventListener('input', run));
    run();
    const q = () => PP.quizBox($('calcquiz'), pick(PP.QZ.filter(x => x[0] === '选型'), 4), { again: q, ...(() => { const t = PP.prog.pageQuiz('calc'), box = $('calcquiz'); return { onAnswer: (q, r) => { t.onAnswer(q, r); if (t.check(4)) { let m = box.parentNode.querySelector('.pqdone'); if (!m) { m = document.createElement('p'); m.className = 'pqdone'; box.parentNode.appendChild(m); } m.textContent = '这一页学完了 ✓ 学习路线上已打勾'; } } }; })() });
    q();
  }

  PP.PAGES.push({ id: 'read', title: '识图入门', order: 1, group: 'kb', mount: mountRead }, { id: 'cab', title: '柜体布局', order: 3, group: 'kb', mount: mountCab }, { id: 'calc', title: '选型计算', order: 5, group: 'kb', mount: mountCalc });
})(window);
