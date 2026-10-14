// lessons3.js — 第 8 关的课：看懂多页图纸（中断点、交叉引用、端子图）。
// 用「配柜实战」那台输送线控制柜画一套 3 页的图：主回路、PLC 控制、端子图。点交叉引用能跳到对应页、对应区。
(function (G) {
  const PP = G.PP;
  const SW = 660, SH = 470, CW = (SW - 12) / 8;
  const zone = x => Math.min(8, Math.floor((x + 14 - 6) / CW) + 1);
  const XR = (x, y, to, t, a = 'start') => `<text class="xref" data-goto="${to}" x="${x}" y="${y}" text-anchor="${a}">${t || '/' + to}</text>`;
  const TITLES = ['主回路', 'PLC 控制', '端子图'];

  function frame(n, body) {
    let s = `<rect class="frm" x="6" y="6" width="${SW - 12}" height="${SH - 12}"/><line class="frm" x1="6" y1="20" x2="${SW - 6}" y2="20"/>`;
    for (let i = 0; i < 8; i++) { const x0 = 6 + i * CW; if (i) s += `<line class="frm" x1="${x0}" y1="6" x2="${x0}" y2="20"/>`; s += `<text class="zn" x="${x0 + CW / 2}" y="16.5">${i + 1}</text>`; }
    s += `<g transform="translate(14,24)">${body}</g>`;
    const tx = SW - 6 - 270, ty = SH - 6 - 36;
    s += `<rect class="frm" x="${tx}" y="${ty}" width="270" height="36"/><line class="frm" x1="${tx}" y1="${ty + 18}" x2="${tx + 270}" y2="${ty + 18}"/><line class="frm" x1="${tx + 190}" y1="${ty}" x2="${tx + 190}" y2="${ty + 36}"/>`;
    s += `<text class="tb" x="${tx + 6}" y="${ty + 13}">图名</text><text class="tb b" x="${tx + 36}" y="${ty + 13}">输送线控制柜　${TITLES[n - 1]}</text><text class="tb" x="${tx + 6}" y="${ty + 31}">图号</text><text class="tb b" x="${tx + 36}" y="${ty + 31}">PP-30-0${n}</text><text class="tb b" x="${tx + 198}" y="${ty + 13}">页 ${n}/3</text><text class="tb" x="${tx + 198}" y="${ty + 31}">练习台</text>`;
    return s;
  }

  // 第 1 页：主回路。KM1、KM2 线圈在第 2 页，触点下面写去哪找；控制电源从 QF2 引到第 2 页
  function page1() {
    const { W, DOT, NL, SRC, NOTE, triple, motor, contact } = PP.S, xs = [40, 60, 80], x2 = [150, 170, 190];
    let s = '';
    ['L1', 'L2', 'L3'].forEach((p, i) => (s += SRC(xs[i], 8, p) + W(p, [[xs[i], 14], [xs[i], 30]]) + W('a' + i, [[xs[i], 70], [xs[i], 120]])));
    s += SRC(110, 8, 'N') + W('N', [[110, 14], [110, 104]]) + SRC(128, 8, 'PE');
    s += triple(xs, 30, 'qf', 'QF0');
    // 控制电源支路
    s += W('a0', [[40, 92], [300, 92], [300, 120]]) + DOT('a0', 40, 92) + W('N', [[110, 104], [340, 104], [340, 120]]);
    s += contact(300, 120, { dev: 'QF2', type: 'NO', t1: '1', t2: '2' }) + contact(340, 120, { dev: 'QF2', type: 'NO', t1: '3', t2: '4', side: 'right' }) + `<line class="s dash" x1="294" y1="139" x2="333" y2="139"/>`;
    s += W('L11', [[300, 160], [300, 178], [420, 178]]) + W('N11', [[340, 160], [340, 194], [420, 194]]) + `<path class="s" d="M420 173l8 5-8 5M420 189l8 5-8 5"/>`;
    s += NL('L11', 360, 172, 'L11', 'middle') + NL('N11', 380, 188, 'N11', 'middle') + XR(432, 182, '2.1', '→ /2.1') + XR(432, 198, '2.1', '→ /2.1') + NOTE(470, 214, '控制电源去第 2 页', 'start');
    s += triple(xs, 120, 'qf', 'QF1');
    xs.forEach((x, i) => (s += W('b' + i, [[x, 160], [x, 200]]) + W('b' + i, [[x, 172 + i * 7], [x2[i], 172 + i * 7], [x2[i], 200]]) + DOT('b' + i, x, 172 + i * 7)));
    s += triple(xs, 200, 'km', 'KM1') + triple(x2, 200, 'km', 'KM2');
    s += XR(100, 248, '2.5', '/2.5', 'start') + XR(210, 248, '2.6', '/2.6', 'start');
    xs.forEach((x, i) => (s += W('c' + i, [[x, 240], [x, 280]])));
    x2.forEach((x, i) => { const t = xs[2 - i], y = 254 + i * 7; s += W('c' + (2 - i), [[x, 240], [x, y], [t, y]]) + DOT('c' + (2 - i), t, y); });
    s += triple(xs, 280, 'fr', 'FR');
    s += W('U', [[40, 320], [40, 340], [52, 352]]) + W('V', [[60, 320], [60, 348]]) + W('W', [[80, 320], [80, 340], [68, 352]]) + motor(60, 372, 18);
    s += NOTE(240, 300, 'KM2 对调 L1、L3 → 反转', 'start') + NOTE(240, 316, '主触点下的 /2.5：线圈在第 2 页第 5 区', 'start');
    return frame(1, s);
  }

  // 第 2 页：PLC 控制。左边从第 1 页来的控制电源；输入接按钮和传感器，输出接 KM1、KM2、YV、HL
  function page2() {
    const { W, DOT, NL, TL, NOTE, contact, coil, MK, lamp } = PP.S, top = 100, bot = 384;
    let s = XR(4, 24, '1.6', '/1.6 →') + XR(4, 54, '1.6', '/1.6 →') + NL('L11', 52, 18, 'L11', 'middle') + NL('N11', 52, 48, 'N11', 'middle');
    s += W('L11', [[40, 28], [70, 28]]) + W('N11', [[40, 58], [70, 58]]);
    s += `<g class="sym" data-dev="PS"><rect class="s fill" x="70" y="16" width="56" height="62"/><text class="sl" x="98" y="44" text-anchor="middle">PS</text><text class="tl" x="98" y="58" text-anchor="middle">24V 电源</text></g>`;
    s += W('p24', [[98, 78], [98, top], [610, top]]) + W('n0', [[110, 78], [110, 88], [80, 88], [80, bot], [610, bot]]) + NL('p24', 610, top - 6, '+24V', 'end') + NL('n0', 610, bot + 14, '0V', 'end');
    s += NOTE(610, 60, 'KM1、KM2 互相串对方常闭：互锁', 'end');
    // 输入：SB1 常闭停止、SB2 正转、SB3 反转、B1 前限位、B2 后限位（端子排 X1 进柜）
    [[110, 'SB1', 'NC', 'I0.0'], [180, 'SB2', 'NO', 'I0.1'], [248, 'SB3', 'NO', 'I0.2']].forEach(([x, d, t], i) => (s += DOT('p24', x, top) + W('p24', [[x, top], [x, 120]]) + contact(x, 120, { dev: d, type: t, act: 'btn', t1: t === 'NC' ? '1' : '3', t2: t === 'NC' ? '2' : '4' }) + W('i' + i, [[x, 160], [x, 230]]) + NL('i' + i, x - 4, 200, '10' + (i + 1), 'end')));
    [[285, 'B1', '前限位', 'X1:3', 3], [360, 'B2', '后限位', 'X1:6', 4]].forEach(([x, d, n, m, i]) => (s += DOT('p24', x, top) + W('p24', [[x, top], [x, 124]]) + `<g class="sym" data-dev="${d}"><rect class="s fill" x="${x - 16}" y="124" width="32" height="32"/><path class="s" d="M${x} 130l7 7-7 7-7-7z"/><text class="sl" x="${x + 20}" y="140">${d}</text><text class="tl" x="${x + 20}" y="155">${n}</text></g>` + W('i' + i, [[x, 156], [x, 186]]) + MK(x, 190, m, x + 8, 194) + W('i' + i, [[x, 194], [x, 230]]) + NL('i' + i, x - 4, 214, '10' + (i + 1), 'end')));
    // PLC
    s += W('p24', [[420, top], [420, 230]]) + W('p24', [[452, top], [452, 230]]) + DOT('p24', 420, top) + DOT('p24', 452, top);
    s += `<g class="sym" data-dev="PLC"><rect class="s fill" x="100" y="230" width="510" height="56"/><text class="sl" x="250" y="276" text-anchor="middle">PLC S7-1200</text>` + [['I0.0', 110], ['I0.1', 180], ['I0.2', 248], ['I0.3', 285], ['I0.4', 360], ['L+', 420], ['3L+', 452]].map(([t, x]) => TL(x, 244, t, 'middle')).join('') + [['M', 120], ['1M', 150], ['3M', 180], ['Q0.0', 370], ['Q0.1', 445], ['Q0.2', 520], ['Q0.3', 595]].map(([t, x]) => TL(x, 282, t, 'middle')).join('') + '</g>';
    [120, 150, 180].forEach(x => (s += W('n0', [[x, 286], [x, bot]]) + DOT('n0', x, bot)));
    // 输出：KM1、KM2 互锁；YV 经端子排 X1:7 到现场；HL 运行灯
    s += W('q0', [[370, 286], [370, 296]]) + contact(370, 296, { dev: 'KM2', type: 'NC', t1: '21', t2: '22' }) + XR(358, 337, '2.6', '/2.6', 'end') + W('q0b', [[370, 336], [370, 352]]) + coil(370, 352, 'KM1') + W('n0', [[370, 374], [370, bot]]) + XR(351, 382, '1.1', '主触点/1.1', 'end');
    s += W('q1', [[445, 286], [445, 296]]) + contact(445, 296, { dev: 'KM1', type: 'NC', t1: '21', t2: '22', side: 'right' }) + XR(461, 337, '2.5', '/2.5') + W('q1b', [[445, 336], [445, 352]]) + coil(445, 352, 'KM2', { side: 'right' }) + W('n0', [[445, 374], [445, bot]]) + XR(461, 382, '1.3', '主触点/1.3');
    s += W('q2', [[520, 286], [520, 306]]) + MK(520, 310, 'X1:7', 528, 314) + W('q2', [[520, 314], [520, 352]]) + coil(520, 352, 'YV', { t: ['+', '-'], side: 'right' }) + W('n0', [[520, 374], [520, bot]]);
    s += W('q3', [[595, 286], [595, 340]]) + lamp(595, 340, 'HL') + W('n0', [[595, 362], [595, bot]]);
    [370, 445, 520, 595].forEach(x => (s += DOT('n0', x, bot)));
    return frame(2, s);
  }

  // 第 3 页：端子图（端子排两侧各接什么）
  const X1 = [['1', '+24V', 'B1 棕 BN', 'PS +24V', '2.4'], ['2', '0V', 'B1 蓝 BU', 'PS 0V', '2.4'], ['3', '103', 'B1 黑 BK', 'PLC I0.3', '2.4'], ['4', '+24V', 'B2 棕 BN', 'PS +24V', '2.5'], ['5', '0V', 'B2 蓝 BU', 'PS 0V', '2.5'], ['6', '104', 'B2 黑 BK', 'PLC I0.4', '2.5'], ['7', '303', 'YV +', 'PLC Q0.2', '2.7'], ['8', '0V', 'YV −', '0V', '2.7'], ['9', '', '备用', '', ''], ['10', '', '备用', '', '']];
  const X2 = [['U', 'U', 'M1 电缆 1 号芯', 'FR 2/T1', '1.1'], ['V', 'V', 'M1 电缆 2 号芯', 'FR 4/T2', '1.1'], ['W', 'W', 'M1 电缆 3 号芯', 'FR 6/T3', '1.1'], ['PE', 'PE', 'M1 电缆黄绿芯', 'PE 接地排', '1.2']];
  function page3() {
    let s = '';
    const table = (x, y, name, rows) => {
      let t = `<text class="sl" x="${x}" y="${y - 8}">${name}</text>`;
      const cols = [[0, '现场（外部）'], [140, '端子'], [190, '线号'], [240, '柜内（内部）'], [350, '图上位置']];
      t += `<rect class="frm" x="${x}" y="${y}" width="420" height="${(rows.length + 1) * 18}"/>` + cols.map(([dx, c]) => `<text class="tb b" x="${x + dx + 6}" y="${y + 13}">${c}</text>`).join('');
      rows.forEach((r, i) => {
        const yy = y + (i + 1) * 18;
        t += `<line class="frm" x1="${x}" y1="${yy}" x2="${x + 420}" y2="${yy}"/><text class="tb" x="${x + 6}" y="${yy + 13}">${r[2]}</text><text class="tb b" x="${x + 146}" y="${yy + 13}">${name.slice(0, 2)}:${r[0]}</text><text class="tb" x="${x + 196}" y="${yy + 13}">${r[1]}</text><text class="tb" x="${x + 246}" y="${yy + 13}">${r[3]}</text>${r[4] ? XR(x + 356, yy + 13, r[4]) : ''}`;
      });
      return t + [140, 190, 240, 350].map(dx => `<line class="frm" x1="${x + dx}" y1="${y}" x2="${x + dx}" y2="${y + (rows.length + 1) * 18}"/>`).join('');
    };
    s += table(20, 20, 'X1 信号端子', X1) + table(20, 260, 'X2 动力端子', X2);
    s += `<text class="note" x="460" y="40">端子图告诉你：</text><text class="tl" x="460" y="58">每一节端子左边接现场电缆，</text><text class="tl" x="460" y="72">右边接柜内的线，</text><text class="tl" x="460" y="86">线号两边一致。</text><text class="tl" x="460" y="108">最后一列是这根线</text><text class="tl" x="460" y="122">在原理图上的位置，</text><text class="tl" x="460" y="136">点它可以跳过去。</text>`;
    return frame(3, s);
  }
  const PAGES = [page1, page2, page3];

  function viewer(box, done) {
    let pg = 1, jumps = 0;
    box.innerHTML = `<p>现场的图纸不会只有一页：主回路、控制回路、端子图分开画。线在这一页画不下，就画一个<b>中断点</b>（箭头 + “/2.1”），意思是“去第 2 页第 1 区接着看”。接触器的线圈和触点也常在不同页，触点下面写着线圈在哪。</p>
      <div class="vt sheet-tabs">${[1, 2, 3].map(n => `<button data-pg="${n}" aria-selected="${n === 1}">第 ${n} 页　${TITLES[n - 1]}</button>`).join('')}</div>
      <div class="sheetwrap"><svg class="sch sheet" viewBox="0 0 ${SW} ${SH}"></svg></div>
      <p class="sheet-msg msg hint">点图上紫色的 <b>/2.5</b> 这类交叉引用，会跳到对应的页和区。试着从第 1 页 KM1 的主触点跳到它的线圈。</p>`;
    const draw = (hz) => {
      box.querySelectorAll('[data-pg]').forEach(b => b.setAttribute('aria-selected', +b.dataset.pg === pg));
      let s = PAGES[pg - 1]();
      if (hz) s += `<rect class="zflash" x="${6 + (hz - 1) * CW}" y="20" width="${CW}" height="${SH - 26}"/>`;
      box.querySelector('svg').innerHTML = s;
    };
    box.addEventListener('click', e => {
      const t = e.target.closest('[data-pg]'); if (t) { pg = +t.dataset.pg; draw(); return; }
      const x = e.target.closest('[data-goto]'); if (!x) return;
      const [p, z] = x.dataset.goto.split('.').map(Number), from = pg;
      pg = p; draw(z); jumps++;
      box.querySelector('.sheet-msg').innerHTML = `从第 ${from} 页跳到了<b>第 ${p} 页第 ${z} 区</b>（橙色那一栏）。${jumps >= 2 ? '会用交叉引用了 ✓' : '再跳一次试试。'}`;
      if (jumps >= 2) { box.dataset.ok = '1'; done(); }
      box.querySelector('.sheetwrap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    draw();
  }

  // ---------- PE、0V 和屏蔽线 ----------
  const cable = (inner) => `<svg viewBox="0 0 220 70"><rect x="4" y="26" width="70" height="18" rx="9" fill="#5b6268"/>${inner}</svg>`;
  const SHD = {
    clamp: cable(`<rect x="74" y="27" width="56" height="16" fill="#c9a24a"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${76 + i * 6} 27l6 16" stroke="#8a6a1c"/>`).join('')}<rect x="130" y="29" width="80" height="12" rx="6" fill="#1f62c4"/><rect x="88" y="12" width="28" height="46" rx="3" fill="none" stroke="#9aa0a4" stroke-width="4"/><rect x="60" y="56" width="90" height="8" fill="#c9ccce" stroke="#8a8f92"/><text x="105" y="9" text-anchor="middle" style="font-size:8px;fill:var(--muted)">屏蔽夹压在接地汇流排上</text>`),
    pig: cable(`<path d="M74 35C100 35 100 62 140 62" stroke="#c9a24a" stroke-width="4" fill="none"/><circle cx="146" cy="62" r="5" fill="#c9ccce" stroke="#8a8f92"/><rect x="74" y="29" width="136" height="12" rx="6" fill="#1f62c4"/><text x="150" y="20" text-anchor="middle" style="font-size:8px;fill:var(--muted)">屏蔽层拧成一根长“尾巴”</text>`),
    cut: cable(`<rect x="74" y="29" width="136" height="12" rx="6" fill="#1f62c4"/><path d="M70 22l8 26" stroke="#d32f2f" stroke-width="2"/><text x="140" y="20" text-anchor="middle" style="font-size:8px;fill:var(--muted)">屏蔽层剪掉不接</text>`),
  };
  PP.addLesson('ground', {
    title: 'PE、0V 和屏蔽线', intro: '接地接不好，轻则信号乱跳、通讯掉线，重则漏电伤人。三件事分清楚：PE 是保命的，0V 是电路的参考点，屏蔽层是挡干扰的。',
    steps: [
      { t: 'PE 保护接地：保命的线', html: `<ul class="rules"><li>设备的金属外壳、安装板、柜门都要接 <b>PE</b>，只能用<b>黄绿双色线</b>。</li><li>漏电时电流顺着 PE 流走，让断路器或漏电保护器跳闸，人摸到外壳才不会触电。</li><li><b>柜门</b>是活动的，要用编织铜带（跨接线）接到柜体，不能靠合页导电。</li><li>接地排上一个螺钉压一根 PE 线，不要几根串着接：拆一根，后面的都断了。</li></ul>` },
      { t: '0V 要不要接 PE', html: `<p>24V 电源的 0V 是电路的参考点。很多设计会在<b>开关电源那一点</b>把 0V 接到 PE（防止 24V 回路“悬浮”、方便查对地漏电），但<b>只能接一点</b>，到处接会形成环路、引入干扰。</p><p><b>按图纸做</b>：图纸上画了才接，没画不要自己接。</p>` },
      { t: '屏蔽线怎么处理', html: `<div class="cfer">${[['clamp', '推荐：屏蔽夹 360° 压在接地排上', 'ok'], ['pig', '不推荐：拧成长尾巴接端子', 'miss'], ['cut', '错误：剪掉不接', 'bad']].map(([k, t, c]) => `<div class="cf-card">${SHD[k]}<b>${t}</b><span class="tag ${c}">${c === 'ok' ? '推荐' : c === 'miss' ? '效果差' : '错误'}</span></div>`).join('')}</div>
        <ul class="rules"><li>模拟量（4–20mA、0–10V）、编码器这类信号线用屏蔽线，屏蔽层一般在<b>柜内一端</b>接到接地排。</li><li>变频器到电机的屏蔽动力电缆，按变频器手册<b>两端都 360° 接地</b>（变频器侧和电机接线盒）。</li><li>屏蔽线和动力线分开走槽，交叉时尽量垂直。具体接法以设备手册和图纸为准。</li></ul>` },
    ],
    quiz: () => [
      ['', 'PE 线只能用什么颜色？', ['绿色', '黄绿双色', '黑色或绿色'], 1, '黄绿双色专门给 PE 用，也不能拿黄绿线做别的用途。'],
      ['', '柜门为什么要单独接一根编织铜带到柜体？', ['让柜门关得更紧，不进灰尘', '合页导电不可靠，门要单独接地', '屏蔽干扰，让 PLC 信号更稳定'], 1, '门上装着按钮、指示灯，漏电时也得能把电流引走。'],
      ['', '24V 的 0V 可以到处接到 PE 上吗？', ['可以，接得越多越安全', '不行，只按图纸在一点接', '一定不能接，0V 必须浮空'], 1, '多点接地会形成环路，引入干扰。按图纸，一般只在电源处一点。'],
      ['', '模拟量信号线的屏蔽层，下面哪个做法最好？', [SHD.clamp, SHD.pig, SHD.cut].map(x => `<span class="qfer">${x}</span>`), 0, '用屏蔽夹 360° 压在接地排上效果最好；拧成长尾巴高频效果差；剪掉等于没屏蔽。'],
      ['', '接地排上三根 PE 线应该怎么接？', ['三根拧在一起压一个螺钉', '一个螺钉压一根', '串着接，一根接一根'], 1, '一个螺钉压一根，拆哪根都不影响别的。'],
    ],
  });

  PP.addLesson('sheets', {
    title: '看懂多页图纸', intro: '工厂里一台设备的图纸往往几十页。会看中断点、交叉引用和端子图，才能在一摞图纸里找到你要的那根线。这里用「配柜实战」那台输送线控制柜的 3 页图来练。',
    steps: [
      { t: '翻图纸，用交叉引用跳转', init: viewer },
      { t: '看图的顺序', html: `<ol class="rules"><li>先看<b>图纸目录和标题栏</b>：一共几页、每页画的是什么。</li><li>从<b>主回路</b>看起：电从哪里来，经过哪些断路器、接触器到电机。</li><li>遇到<b>中断点</b>（→ /2.1），翻到那一页那一区接着看。</li><li>看到触点下面的 <b>/2.5</b>，就知道它的线圈在第 2 页第 5 区；线圈下面也会列出它的触点在哪。</li><li>接现场的线看<b>端子图</b>：哪一节端子、什么线号、接哪个现场元件。</li></ol><p class="cap">EPLAN 等软件出的图还会在元件前面加“=设备 +位置 -元件”的标识，比如 <span class="mono">+A1-KM1</span> 表示 A1 柜里的 KM1。原理一样：标识相同就是同一个元件。</p>` },
    ],
    quiz: () => [
      ['', '第 1 页 KM1 主触点下面写着 “/2.5”，意思是？', ['KM1 的线圈在第 2 页第 5 区', '下面接的线是 2.5 平方的', 'KM1 额定电流是 2.5A，要按它选'], 0, '这是交叉引用：同一个元件的线圈和触点画在不同地方，用页.区号互相指向。'],
      ['', '第 1 页 QF2 后面的 “L11 → /2.1” 是什么？', ['这根线画到这里就断开了', '在第 2 页第 1 区接着画', '这根线要用 2.1 平方的线'], 1, '一页画不下的线用中断点断开，两边写着对方的位置。'],
      ['', '前限位开关 B1 的信号接 PLC 哪个输入？', ['I0.2', 'I0.3', 'I0.4'], 1, '第 2 页 B1 那一路经过 X1:3 接到 I0.3，第 3 页端子图 X1:3 也写着 PLC I0.3。'],
      ['', '端子 X1:7 接的是？', ['电磁阀 YV 的 +', '后限位 B2 的黑色信号线', '电机 M1 的 U 相动力线'], 0, '看第 3 页端子图 X1:7 那一行：PLC Q0.2 来的 303 号线，接电磁阀 YV 的 +。'],
      ['', '第 2 页 KM1 线圈前面串着 KM2 的 21–22，是干什么的？', ['自锁：松手后 KM1 保持吸合', '互锁：KM2 吸合时 KM1 吸不上', '过载保护：KM2 替 FR 断电'], 1, '正反转接触器互相串对方的常闭触点，就是硬件互锁。'],
      ['', '标题栏里写着 “页 2/3”，意思是？', ['这是第 2 页，一共 3 页', '2 月 3 号画的这张图', '第 2 版图纸的第 3 次修改'], 0, '先看标题栏，知道这套图一共几页、现在在第几页。'],
    ],
    gate: { text: '在第 1 步里用交叉引用跳转两次', ok: () => !!document.querySelector('#page-lesson-sheets [data-step="0"][data-ok]') },
  });
})(window);
