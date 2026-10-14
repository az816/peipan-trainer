// lessons4.js — 电机接线盒（星形 / 三角形连接片）、中间继电器认脚（MY2N + 底座，用万用表核对）、送电对点（PLC I/O 点检）
(function (G) {
  const PP = G.PP, R = PP.R, T = R.T, MONO = 'font-family:var(--f-mono);';
  const scr = (p, x, y, r = 7) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${p}sc)" stroke="#5f645f" stroke-width="1.2"/><path d="M${x - r * .55} ${y}h${r * 1.1}M${x} ${y - r * .55}v${r * 1.1}" stroke="#5f645f" stroke-width="1.3"/>`;

  // ---------- 电机接线盒 ----------
  // 上排 W2 U2 V2，下排 U1 V1 W1（国内 Y / Y2 系列电机的常见排法）；竖着三片 = 三角形，上排横着两片 = 星形
  const MB = { top: [['W2', 120], ['U2', 200], ['V2', 280]], bot: [['U1', 120], ['V1', 200], ['W1', 280]], ty: 92, by: 172 };
  const SLOTS = [['v1', 'U1-W2', 120, 'v'], ['v2', 'V1-U2', 200, 'v'], ['v3', 'W1-V2', 280, 'v'], ['h1', 'W2-U2', 160, 'h'], ['h2', 'U2-V2', 240, 'h']];
  const MTASK = [
    { k: 'd', plate: ['Y2-112M-4', '4 kW', '380 V  △', '8.8 A', '1440 r/min'], grid: '电网 380V，直接启动', want: ['v1', 'v2', 'v3'], ok: '铭牌只写 380V △：电网 380V，就接三角形。三片连接片竖着装：U1–W2、V1–U2、W1–V2。' },
    { k: 'y', plate: ['Y2-90S-4', '1.1 kW', '220/380 V  △/Y', '4.7/2.7 A', '1400 r/min'], grid: '电网 380V，直接启动', want: ['h1', 'h2'], ok: '220/380V △/Y 的意思：接 220V 用三角形、接 380V 用星形。电网是 380V，所以接星形：上排 W2、U2、V2 用两片连起来。接成三角形会因为电压太高烧电机。' },
    { k: 's', plate: ['Y2-160M-4', '11 kW', '380 V  △', '22.6 A', '1460 r/min'], grid: '星三角降压启动', want: [], ok: '星三角启动要把连接片全部拆掉，6 个端子各引一根线到柜里：U1 V1 W1 接主接触器 KM，W2 U2 V2 接星形 / 三角形接触器，由接触器来切换。' },
  ];
  function mbSVG(on, task, done) {
    const p = 'mb-';
    let g = R.defs(p) + `<rect x="20" y="16" width="360" height="236" rx="14" fill="url(#${p}gb)" stroke="#24476e" stroke-width="2"/><rect x="34" y="30" width="332" height="208" rx="8" fill="#2b4f78"/>`;
    g += `<rect x="72" y="58" width="256" height="148" rx="6" fill="#3a2f28" stroke="#1d1712"/><rect x="78" y="64" width="244" height="136" rx="4" fill="#4a3c32"/>`;
    // 进线：三相电源接 U1 V1 W1（星三角时 6 根线引出）
    const inC = ['#d6a000', '#2b8a3e', '#d32f2f'];
    if (task.k !== 's' || done) MB.bot.forEach(([, x], i) => (g += `<path d="M${x} ${MB.by}C${x} 222 ${200 + (i - 1) * 16} 228 ${200 + (i - 1) * 16} 262" stroke="${inC[i]}" stroke-width="4" fill="none"/>`));
    if (task.k === 's' && done) MB.top.forEach(([, x], i) => (g += `<path d="M${x} ${MB.ty}C${x} 44 ${340 + i * 10} 40 ${360 + i * 6} 6" stroke="#1d1f22" stroke-width="3.4" fill="none"/>`));
    for (const [n, x] of [...MB.top.map(t => [...t, MB.ty]), ...MB.bot.map(t => [...t, MB.by])]) {
      const y = n === 'W2' || n === 'U2' || n === 'V2' ? MB.ty : MB.by;
      g += `<circle cx="${x}" cy="${y}" r="15" fill="#2a2420"/><circle cx="${x}" cy="${y}" r="9" fill="url(#${p}gn)" stroke="#7a5c14"/>${y === MB.ty ? T(x - 18, y - 19, n, MONO + 'font-size:12px;font-weight:700;fill:#f2e6d0') : T(x - 30, y + 5, n, MONO + 'font-size:12px;font-weight:700;fill:#f2e6d0')}`;
    }
    for (const [k, nm, x, d] of SLOTS) {
      const has = on.has(k);
      const box = d === 'v' ? [x - 9, MB.ty - 9, 18, MB.by - MB.ty + 18] : [x - 40 - 9, MB.ty - 9, 98, 18];
      g += `<g class="mbslot" data-slot="${k}" role="button" aria-label="${nm} 连接片"><rect x="${box[0] - 6}" y="${box[1] - 6}" width="${box[2] + 12}" height="${box[3] + 12}" fill="transparent"/>`;
      g += has ? `<rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" rx="5" fill="#c98a3a" stroke="#7a4f1c"/><rect x="${box[0] + 3}" y="${box[1] + 3}" width="${d === 'v' ? 4 : box[2] - 6}" height="${d === 'v' ? box[3] - 6 : 4}" rx="2" fill="#f1c17a" opacity=".8"/>` : `<rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" rx="5" fill="none" stroke="#e7d6b8" stroke-width="1.4" stroke-dasharray="4 4" opacity=".55"/>`;
      g += `</g>`;
    }
    // 螺母压在连接片上面
    for (const [, x] of MB.top) g += `<circle cx="${x}" cy="${MB.ty}" r="6" fill="#d9dcd6" stroke="#555"/>`;
    for (const [, x] of MB.bot) g += `<circle cx="${x}" cy="${MB.by}" r="6" fill="#d9dcd6" stroke="#555"/>`;
    return g;
  }
  // 根据连接片判断接成了什么
  function mbJudge(on) {
    const V = ['v1', 'v2', 'v3'].filter(k => on.has(k)).length, H = ['h1', 'h2'].filter(k => on.has(k)).length;
    if (V && H) return ['short', '<b class="bad">短路！</b>横片和竖片同时装，三相电源会通过连接片直接连在一起，一送电就跳闸、打火。'];
    if (V === 3) return ['d', '现在是<b>三角形（△）</b>：三个绕组首尾相连成一个圈。'];
    if (H === 2) return ['y', '现在是<b>星形（Y）</b>：三个绕组的尾端 W2、U2、V2 连在一起。'];
    if (!V && !H) return ['none', '现在<b>没有连接片</b>：6 个端子都是空的，电机不能直接送电。'];
    return ['half', '<b class="bad">没接完整。</b>' + (H === 1 ? '星形要用两片把上排三个端子全连上，只装一片有一相绕组是断开的（缺相）。' : '三角形要三片竖着都装上，少一片就有一相绕组没接进去（缺相）。')];
  }
  function mbInit(box, done) {
    let ti = 0; const on = new Set(['v1', 'v2', 'v3']), got = new Set();
    const draw = (msg, tone) => {
      const t = MTASK[ti];
      box.querySelector('.mbsvg').innerHTML = mbSVG(on, t, got.has(t.k));
      box.querySelector('.mbplate').innerHTML = `<b>三相异步电动机</b><span>型号 ${t.plate[0]}</span><span>${t.plate[1]}　<b class="mono">${t.plate[2]}</b></span><span>${t.plate[3]}　${t.plate[4]}</span>`;
      box.querySelector('.mbtasks').innerHTML = MTASK.map((x, i) => `<button class="mtask${i === ti ? ' cur' : ''}${got.has(x.k) ? ' ok' : ''}" data-mt="${i}"><i>${got.has(x.k) ? '✓' : i + 1}</i><span><b>铭牌 ${x.plate[2]}</b><small>${x.grid}</small></span></button>`).join('');
      const m = box.querySelector('.mbmsg'); m.className = 'mbmsg msg ' + (tone || 'hint');
      m.innerHTML = msg || `${mbJudge(on)[1]}<br>任务：看铭牌，<b>${t.grid}</b>，连接片该怎么装？点图上的虚线框装上、点铜片拆下，然后点「检查」。`;
      if (got.size === MTASK.length && !box.dataset.ok) { box.dataset.ok = '1'; done(); }
    };
    box.innerHTML = `<div class="mbgrid"><svg class="mbsvg" viewBox="0 0 400 268" role="img" aria-label="电机接线盒"></svg>
      <div><div class="mbplate"></div><div class="mtasks mbtasks"></div><div class="tools"><button class="b primary" data-mbok="1">检查</button><button class="b ghost" data-mbclr="1">全部拆掉</button></div><p class="mbmsg msg hint"></p></div></div>`;
    box.addEventListener('click', e => {
      const s = e.target.closest('[data-slot]'), mt = e.target.closest('[data-mt]');
      if (s) { const k = s.dataset.slot; on.has(k) ? on.delete(k) : on.add(k); if (PP.sound) PP.sound.click(); draw(); return; }
      if (mt) { ti = +mt.dataset.mt; draw(); return; }
      if (e.target.closest('[data-mbclr]')) { on.clear(); draw(); return; }
      if (e.target.closest('[data-mbok]')) {
        const t = MTASK[ti], ok = t.want.length === on.size && t.want.every(k => on.has(k)), j = mbJudge(on);
        if (ok) { got.add(t.k); const nx = MTASK.findIndex(x => !got.has(x.k)); draw(`<b class="ok">对了 ✓</b> ${t.ok}${nx >= 0 ? `<br>下一个：<b>铭牌 ${MTASK[nx].plate[2]}，${MTASK[nx].grid}</b>。` : '<br><b>三台电机都接对了。</b>'}`, 'good'); if (nx >= 0) setTimeout(() => { ti = nx; draw(); }, 2600); }
        else draw(j[0] === 'short' || j[0] === 'half' ? j[1] : `${j[1]} <b class="bad">和铭牌不符。</b>${t.k === 'y' && j[0] === 'd' ? '这台电机接 380V 要用星形，接成三角形每相绕组电压是 380V，超过它的 220V，会烧。' : t.k === 'd' && j[0] === 'y' ? '这台电机额定是 380V △，接成星形每相只有 220V，力气只剩约 1/3，带载会转不动、发热。' : t.k === 's' ? '星三角启动由接触器切换，接线盒里一片都不能留。' : ''}`, 'bad');
      }
    });
    draw();
  }
  PP.addLesson('motorbox', {
    title: '电机接线盒：星形还是三角形', intro: '打开电机的接线盒，里面是 6 个端子和几片铜连接片。连接片怎么装，看电机铭牌上的电压和接法。装错了，轻则电机没力气，重则烧电机、送电就跳闸。',
    steps: [
      { t: '先认 6 个端子', html: `<ul class="rules"><li>每相绕组有首、尾两端：<b>U1–U2、V1–V2、W1–W2</b>（老电机写成 U V W / X Y Z）。</li><li>接线盒里一般<b>下排 U1 V1 W1，上排 W2 U2 V2</b>，上下错开一位，这样连接片竖着装正好首尾相连。</li><li>电源线（L1 L2 L3）接下排 <b>U1 V1 W1</b>。</li><li><b>星形 Y</b>：上排三个连在一起（两片横着装）。<b>三角形 △</b>：三片竖着装，U1–W2、V1–U2、W1–V2。</li><li>以电机接线盒盖内侧的接线图为准，标记看不清就用万用表量出每相绕组的两端。</li></ul>` },
      { t: '动手：按铭牌装连接片（三台电机）', init: mbInit },
    ],
    quiz: () => [
      ['', '铭牌写 “380V △”，电网是 380V，接线盒怎么接？', ['三片连接片竖着装，接成三角形', '两片横着装，接成星形', '不装连接片，直接送电'], 0, '铭牌只写 380V △ 就是在 380V 下接三角形。'],
      ['', '铭牌写 “220/380V △/Y”，电网是 380V，应该接？', ['三角形，和铭牌第一个符号一样', '星形（Y）', '星形、三角形都行，看习惯'], 1, '斜杠前后一一对应：220V 接 △，380V 接 Y。'],
      ['', '星三角启动的电机，接线盒里的连接片应该？', ['留着三角形的三片，启动更稳', '全部拆掉，6 根线引到柜里', '留一片横的，当星点用'], 1, '星形、三角形由接触器切换，接线盒里不能留连接片。'],
      ['', '电机反转了，想改成正转，应该？', ['把连接片从竖着改成横着装', '对调电源进线的任意两相', '把 U1 和 U2 两根线对调'], 1, '换相序只要对调任意两根电源线（比如 L1、L2）。改连接片改的是星 / 角，不是转向。'],
      ['', '本该接三角形的 380V △ 电机接成了星形，会怎样？', ['电压太高，马上烧掉', '每相电压只有 220V，带载没劲、发热', '没有任何影响，只是转得慢一点'], 1, '星形时每相绕组只有 380/√3 ≈ 220V，转矩约降到 1/3，带载容易堵转发热。'],
    ],
    gate: { text: '完成第 2 步的三台电机', ok: () => !!document.querySelector('#page-lesson-motorbox [data-step="1"][data-ok]') },
  });

  // ---------- 中间继电器认脚 ----------
  // MY2N（两组转换触点）：线圈 13–14；第一组 公共 9、常闭 1、常开 5；第二组 公共 12、常闭 4、常开 8
  const PINS = [['13', 0, 0], ['14', 1, 0], ['9', 0, 1], ['12', 1, 1], ['5', 0, 2], ['8', 1, 2], ['1', 0, 3], ['4', 1, 3]];
  const pinXY = ([, c, r]) => [190 + c * 110, 70 + r * 56];
  function relayMeas(a, b, pw) {
    const k = [a, b].sort((x, y) => +x - +y).join('-');
    if (k === '13-14') return ['coil', '620 Ω'];
    const NC = ['1-9', '4-12'], NO = ['5-9', '8-12'];
    if (!pw && NC.includes(k)) return ['on', '0.2 Ω'];
    if (pw && NO.includes(k)) return ['on', '0.2 Ω'];
    return ['off', 'OL'];
  }
  const RTASK = [
    { t: '找线圈的两个脚', d: '断电，量出几百欧的那一对', pw: false, want: '13-14' },
    { t: '第一组：找常闭触点', d: '线圈不通电，量出“嘀”的那一对（含 9）', pw: false, want: '1-9' },
    { t: '第一组：找常开触点', d: '先点「线圈通电」，再找通的那一对（含 9）', pw: true, want: '5-9' },
    { t: '第二组：找常开触点', d: '线圈通电，找通的那一对（含 12）', pw: true, want: '8-12' },
  ];
  function relaySVG(st) {
    const p = 'rl-';
    let g = R.defs(p);
    // 继电器本体（透明外壳，能看见线圈和触点）
    g += `<rect x="14" y="20" width="118" height="190" rx="6" fill="#d9e8ef" fill-opacity=".85" stroke="#7d8a90"/><rect x="26" y="36" width="94" height="22" rx="2" fill="#fbfbf5" stroke="#9a9e98" stroke-width=".7"/>${T(73, 51, 'MY2N  DC24V', MONO + 'font-size:9px;font-weight:700;fill:#1f2523')}`;
    g += `<rect x="40" y="118" width="66" height="54" rx="4" fill="#b87333" stroke="#7a4a1c"/>${Array.from({ length: 7 }, (_, i) => `<line x1="42" y1="${124 + i * 7}" x2="104" y2="${124 + i * 7}" stroke="#8a5523" stroke-width="1.4"/>`).join('')}`;
    g += `<rect x="38" y="${st.pw ? 96 : 90}" width="70" height="6" rx="2" fill="#7f868b"/><circle cx="118" cy="30" r="4" fill="${st.pw ? '#ff3b30' : '#6b2a26'}"/>${st.pw ? '<circle cx="118" cy="30" r="8" fill="#ff3b30" opacity=".3"/>' : ''}`;
    // 侧面印的接线图
    g += `<rect x="24" y="64" width="98" height="20" rx="1.5" fill="#fbfbf5" stroke="#9a9e98" stroke-width=".6"/>${T(73, 77, '13−14 线圈 9·12 公共', 'font-size:7.5px;fill:#1f2523')}`;
    g += T(73, 228, '继电器（侧面印着接线图）', 'font-size:10px;fill:var(--muted)');
    // 底座
    g += `<rect x="150" y="34" width="190" height="236" rx="6" fill="#3a3e42" stroke="#1d2022"/><rect x="164" y="48" width="162" height="208" rx="4" fill="#2c3034"/>`;
    for (const P of PINS) {
      const [x, y] = pinXY(P), sel = st.sel.includes(P[0]);
      g += `<g class="rpin" data-pin="${P[0]}" role="button" aria-label="端子 ${P[0]}"><rect x="${x - 26}" y="${y - 22}" width="52" height="44" fill="transparent"/>${scr(p, x, y, 10)}<rect x="${x + 13}" y="${y - 8}" width="22" height="16" rx="1.5" fill="#fbfbf5"/>${T(x + 24, y + 4.5, P[0], MONO + 'font-size:11px;font-weight:700;fill:#1f2523')}${sel ? `<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="${st.sel[0] === P[0] ? '#e53935' : '#111'}" stroke-width="4"/>` : ''}</g>`;
    }
    g += T(245, 288, '底座（端子号印在旁边）', 'font-size:10px;fill:var(--muted)');
    return g;
  }
  function relayInit(box, done) {
    const st = { pw: false, sel: [] }; let ti = 0; const got = new Set();
    const draw = (msg, tone) => {
      box.querySelector('.rlsvg').innerHTML = relaySVG(st);
      box.querySelector('.rltasks').innerHTML = RTASK.map((x, i) => `<button class="mtask${i === ti ? ' cur' : ''}${got.has(i) ? ' ok' : ''}" data-rt="${i}"><i>${got.has(i) ? '✓' : i + 1}</i><span><b>${x.t}</b><small>${x.d}</small></span></button>`).join('');
      box.querySelector('[data-rpw]').setAttribute('aria-pressed', st.pw);
      box.querySelector('[data-rpw]').textContent = st.pw ? '线圈已通电（再点断电）' : '线圈通电';
      const m = box.querySelector('.rlmsg'); m.className = 'rlmsg msg ' + (tone || 'hint');
      m.innerHTML = msg || `任务：<b>${RTASK[ti].t}</b>。万用表打蜂鸣 / 电阻档，在底座上点两个端子（红、黑表笔），看读数。`;
      if (got.size === RTASK.length && !box.dataset.ok) { box.dataset.ok = '1'; done(); }
    };
    box.innerHTML = `<div class="rlgrid"><svg class="rlsvg" viewBox="0 0 350 300" role="img" aria-label="中间继电器和底座"></svg>
      <div><div class="mtasks rltasks"></div><div class="tools"><button class="b toggle" data-rpw="1" aria-pressed="false">线圈通电</button><span class="meter rlmeter"><span class="lcd">----</span></span></div><p class="rlmsg msg hint"></p></div></div>`;
    box.addEventListener('click', e => {
      const pin = e.target.closest('[data-pin]'), rt = e.target.closest('[data-rt]');
      if (rt) { ti = +rt.dataset.rt; st.sel = []; draw(); return; }
      if (e.target.closest('[data-rpw]')) { st.pw = !st.pw; st.sel = []; if (PP.sound) PP.sound.click(); box.querySelector('.rlmeter .lcd').textContent = '----'; draw(st.pw ? '线圈通电了：听到“咔哒”一声，常开触点闭合、常闭触点断开。' : '线圈断电：触点回到原来的状态。'); return; }
      if (!pin) return;
      const n = pin.dataset.pin;
      if (st.sel.length === 2 || st.sel.includes(n)) st.sel = [];
      st.sel.push(n);
      if (st.sel.length < 2) { box.querySelector('.rlmeter .lcd').textContent = '----'; draw(`红表笔放在 <b>${n}</b>，再点另一个端子放黑表笔。`); return; }
      const [kind, val] = relayMeas(st.sel[0], st.sel[1], st.pw), pair = st.sel.slice().sort((x, y) => +x - +y).join('-'), T0 = RTASK[ti];
      box.querySelector('.rlmeter .lcd').textContent = val; if (kind === 'on' && PP.sound) PP.sound.beep();
      const what = kind === 'coil' ? '几百欧：这是<b>线圈</b>。' : kind === 'on' ? '“嘀”，接近 0Ω：这两个端子<b>是通的</b>。' : 'OL：这两个端子<b>不通</b>。';
      if (pair === T0.want && st.pw === T0.pw) {
        got.add(ti); const nx = RTASK.findIndex((_, i) => !got.has(i));
        draw(`${st.sel[0]}–${st.sel[1]}：${what} <b class="ok">找对了 ✓</b>${nx >= 0 ? ` 下一个：<b>${RTASK[nx].t}</b>（${RTASK[nx].d}）。` : ' <b>四个都找到了。</b>记住：<b>13–14 线圈，9 / 12 公共，不通电时和 1 / 4 通，通电后和 5 / 8 通。</b>'}`, 'good');
        if (nx >= 0) setTimeout(() => { ti = nx; st.sel = []; draw(); }, 2600);
      } else draw(`${st.sel[0]}–${st.sel[1]}：${what}${pair === T0.want && st.pw !== T0.pw ? ` 端子对了，但这个任务要${T0.pw ? '<b>先给线圈通电</b>' : '<b>线圈不通电</b>'}再量。` : ' 还不是要找的那一对，接着量。'}`, kind === 'off' ? 'hint' : 'hint');
    });
    draw();
  }
  PP.addLesson('relay', {
    title: '中间继电器认脚', intro: '中间继电器插在底座上，线都接在底座的端子上。底座上只印着数字，哪个是线圈、哪个是常开常闭，要会看、更要会用万用表量出来。不同型号编号不一样，别死记，以继电器外壳上印的图为准。',
    steps: [
      { t: '两种常见的继电器', html: `<ul class="rules"><li><b>方脚 8 脚（MY2N 这类，最常见）</b>：线圈 <b>13–14</b>；第一组 公共 <b>9</b>、常闭 <b>1</b>、常开 <b>5</b>；第二组 公共 <b>12</b>、常闭 <b>4</b>、常开 <b>8</b>。</li><li><b>圆脚 8 脚（八角座那种）</b>：编号是 1–8，线圈一般是 <b>2–7</b>，触点编号和方脚完全不同。</li><li>继电器外壳侧面都印着接线图，<b>以实物印的图为准</b>；拿不准就用万用表量：线圈有几百欧，常闭不通电时通、常开通电后通。</li><li>DC24V 线圈带指示灯 / 二极管的，13、14 分正负（看外壳上的 + 号），接反了灯不亮甚至不吸合。</li></ul>` },
      { t: '动手：用万用表把脚量出来（四个任务）', init: relayInit },
    ],
    quiz: () => [
      ['', 'MY2N 方脚中间继电器，线圈是哪两个脚？', ['1 和 4', '13 和 14', '9 和 12'], 1, '方脚 8 脚：13–14 线圈，9 / 12 是两组的公共端。'],
      ['', '线圈不通电时，量 9 和 1 之间是通的，说明 1 是？', ['常闭触点', '常开触点', '线圈的一头'], 0, '不通电时就和公共端通的是常闭；通电后才通的是常开。'],
      ['', '量两个端子之间读数是 620Ω，最可能是？', ['一对常开触点', '继电器线圈', '两个没关系的端子'], 1, '触点通的时候接近 0Ω、断的时候 OL；几百欧是线圈。'],
      ['', '换了一个圆脚 8 脚的继电器，接线还按 13–14 接线圈吗？', ['照旧，所有继电器都一样', '不是，看外壳上印的图，圆脚的线圈一般是 2–7', '随便接，通电试一下就知道'], 1, '编号跟着型号走，以实物印的图为准。'],
    ],
    gate: { text: '完成第 2 步的四个测量任务', ok: () => !!document.querySelector('#page-lesson-relay [data-step="1"][data-ok]') },
  });

  // ---------- 送电对点：PLC I/O 点检 ----------
  // 输送线控制柜的 I/O 表（和配柜实战一致）
  const IO_IN = [['I0.0', 'SB1', '停止按钮（常闭）', 'nc'], ['I0.1', 'SB2', '正转按钮', 'no'], ['I0.2', 'SB3', '反转按钮', 'no'], ['I0.3', 'B1', '前限位 PNP', 'no'], ['I0.4', 'B2', '后限位 PNP', 'no']];
  const IO_OUT = [['Q0.0', 'KM1', '正转接触器'], ['Q0.1', 'KM2', '反转接触器'], ['Q0.2', 'YV', '挡料电磁阀'], ['Q0.3', 'HL', '运行指示灯']];
  // 每一轮随机藏一处接线错误
  const IOF = [
    { k: 'b12', why: 'B1、B2 两根信号线在端子排上接反了：挡前限位亮的是 I0.4，挡后限位亮的是 I0.3。', fixIn: { B1: 'I0.4', B2: 'I0.3' } },
    { k: 'sb23', why: 'SB2、SB3 的线对调了：按正转亮 I0.2，按反转亮 I0.1。', fixIn: { SB2: 'I0.2', SB3: 'I0.1' } },
    { k: 'sb1no', why: 'SB1 停止按钮接成了常开触点：平时 I0.0 不亮，按下才亮。程序按常闭写，PLC 会一直以为在按停止，设备启动不了；而且线断了也不会停机，不安全。', nc: { SB1: false } },
    { k: 'q23', why: 'Q0.2、Q0.3 两根输出线接反了：强制 Q0.2 亮的是运行灯，强制 Q0.3 吸的是电磁阀。', fixOut: { 'Q0.2': 'HL', 'Q0.3': 'YV' } },
  ];
  // M18 接近开关（小图）：检测到铁块时尾部橙灯亮
  const sensorMini = on => `<svg viewBox="0 0 150 60" class="pn part" role="img" aria-label="接近开关"><defs><linearGradient id="smg${on ? 1 : 0}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f8488"/><stop offset=".45" stop-color="#f2f3f3"/><stop offset="1" stop-color="#6a6f73"/></linearGradient></defs>`
    + `<path d="M6 30C14 30 16 30 24 30" stroke="#7f868b" stroke-width="6" stroke-linecap="round"/><rect x="24" y="21" width="14" height="18" rx="2" fill="#3a3e42"/><circle cx="31" cy="30" r="3.4" fill="${on ? '#ff9d1a' : '#5a4a3a'}"/>${on ? '<circle cx="31" cy="30" r="7" fill="#ff9d1a" opacity=".3"/>' : ''}`
    + `<rect x="38" y="19" width="62" height="22" fill="url(#smg${on ? 1 : 0})"/>${Array.from({ length: 15 }, (_, i) => `<line x1="${41 + i * 4}" y1="19" x2="${41 + i * 4}" y2="41" stroke="rgba(0,0,0,.22)" stroke-width=".8"/>`).join('')}<rect x="48" y="16" width="7" height="28" rx="1" fill="#a3a8ab" stroke="#6b7074"/><rect x="86" y="16" width="7" height="28" rx="1" fill="#a3a8ab" stroke="#6b7074"/><rect x="100" y="21" width="8" height="18" rx="2" fill="#e8752a"/>`
    + (on ? `<rect x="114" y="12" width="32" height="36" rx="3" fill="#b9bfc3" stroke="#6b7074"/><text x="130" y="34" text-anchor="middle" style="font-size:9px;fill:#1f2523">铁块</text>` : `<rect x="114" y="12" width="32" height="36" rx="3" fill="none" stroke="var(--dev-edge)" stroke-dasharray="3 3"/>`) + `</svg>`;
  function ioInit(box, done) {
    let f, pressed, forced, marks, rounds = 0;
    const newRound = () => { const pool = IOF.filter(x => x !== f); f = pool[Math.floor(Math.random() * pool.length)]; pressed = new Set(); forced = new Set(); marks = {}; draw(); };
    const inAddr = dev => (f.fixIn && f.fixIn[dev]) || IO_IN.find(r => r[1] === dev)[0];
    const isNC = dev => (f.nc && dev in f.nc ? f.nc[dev] : IO_IN.find(r => r[1] === dev)[3] === 'nc');
    const outDev = q => (f.fixOut && f.fixOut[q]) || IO_OUT.find(r => r[0] === q)[1];
    const inLed = a => IO_IN.some(([, dev]) => inAddr(dev) === a && (isNC(dev) ? !pressed.has(dev) : pressed.has(dev)));
    const devOn = dev => [...forced].some(q => outDev(q) === dev);
    const wrongRows = () => { const s = new Set(); if (f.fixIn) Object.values(f.fixIn).forEach(a => s.add(a)); if (f.nc) s.add('I0.0'); if (f.fixOut) Object.keys(f.fixOut).forEach(q => s.add(q)); return s; };
    function plcSVG() {
      const p = 'io-';
      let g = R.defs(p) + `<rect x="6" y="6" width="348" height="128" rx="4" fill="url(#${p}gk)" stroke="#1f2327"/><rect x="10" y="10" width="340" height="18" fill="#6e757b"/><rect x="10" y="112" width="340" height="18" fill="#6e757b"/>`;
      g += T(22, 52, 'S7-1200', 'font-size:12px;font-weight:900;fill:#f2f4f2', 'start') + T(22, 66, 'CPU 1214C DC/DC/DC', MONO + 'font-size:8px;fill:#c9cfd3', 'start') + R.led(30, 86, '#f2c200', true, 3.6) + T(38, 89, 'STOP', MONO + 'font-size:7.5px;fill:#e6e9e6', 'start');
      ['I0.0', 'I0.1', 'I0.2', 'I0.3', 'I0.4', 'I0.5', 'I0.6', 'I0.7'].forEach((a, i) => (g += R.led(130 + i * 26, 46, '#3ad65d', inLed(a), 4) + T(130 + i * 26, 62, a.slice(1), MONO + 'font-size:8px;fill:#e6e9e6')));
      ['Q0.0', 'Q0.1', 'Q0.2', 'Q0.3', 'Q0.4', 'Q0.5'].forEach((q, i) => (g += R.led(130 + i * 26, 84, '#3ad65d', forced.has(q), 4) + T(130 + i * 26, 100, q.slice(1), MONO + 'font-size:8px;fill:#e6e9e6')));
      g += T(112, 49, 'I', MONO + 'font-size:9px;font-weight:700;fill:#e6e9e6', 'end') + T(112, 87, 'Q', MONO + 'font-size:9px;font-weight:700;fill:#e6e9e6', 'end');
      return g;
    }
    const devCard = (dev, nm, img, act) => `<div class="iodev${act ? ' on' : ''}">${img}<b>${dev}</b><small>${nm}</small></div>`;
    function draw(msg, tone) {
      box.querySelector('.ioplc').innerHTML = plcSVG();
      const inImg = dev => dev.startsWith('SB') ? R.part(dev, 'iob' + dev + '-', { st: { p: { [dev]: pressed.has(dev) } }, on: {} }) : sensorMini(pressed.has(dev));
      box.querySelector('.iofield').innerHTML = IO_IN.map(([, dev, nm]) => `<button class="iobtn${pressed.has(dev) ? ' on' : ''}" data-dev="${dev}" aria-pressed="${pressed.has(dev)}">${devCard(dev, nm, inImg(dev), pressed.has(dev))}<span>${dev.startsWith('SB') ? (pressed.has(dev) ? '松开' : '按下') : (pressed.has(dev) ? '拿走铁块' : '放铁块')}</span></button>`).join('');
      // 这台柜子全是 DC24V：接触器线圈、指示灯都按 24V 画
      const outImg = dev => R.part(dev === 'KM1' || dev === 'KM2' ? 'KM' : dev === 'YV' ? 'YV' : 'HLG', 'ioo' + dev + '-', { on: { KM: devOn(dev), YV: devOn(dev), HLG: devOn(dev) }, st: { power: true }, v: dev.startsWith('KM') ? { coil: 'DC', lab: dev } : dev === 'HL' ? { ac: false, lab: 'HL', name: '运行灯' } : {}, nm: dev === 'HL' ? '运行灯' : undefined });
      box.querySelector('.ioout').innerHTML = IO_OUT.map(([, dev, nm]) => devCard(dev === 'KM1' || dev === 'KM2' ? dev : dev, nm + (devOn(dev) ? (dev.startsWith('KM') ? ' · 吸合' : dev === 'YV' ? ' · 得电' : ' · 亮') : ''), outImg(dev), devOn(dev))).join('');
      box.querySelector('.ioforce').innerHTML = IO_OUT.map(([q]) => `<button class="b small toggle" data-q="${q}" aria-pressed="${forced.has(q)}">强制 <span class="mono">${q} = ${forced.has(q) ? 1 : 0}</span></button>`).join('');
      box.querySelector('.iotbl').innerHTML = `<tr><th>地址</th><th>图纸上接的</th><th>对点结果</th></tr>` + [...IO_IN.map(r => [r[0], `${r[1]} ${r[2]}`]), ...IO_OUT.map(r => [r[0], `${r[1]} ${r[2]}`])].map(([a, t]) => `<tr><td class="mono">${a}</td><td>${t}</td><td class="iomark"><button class="b small${marks[a] === 'ok' ? ' sel-ok' : ''}" data-mk="${a}" data-v="ok">✓ 对</button><button class="b small${marks[a] === 'bad' ? ' sel-bad' : ''}" data-mk="${a}" data-v="bad">✗ 不对</button></td></tr>`).join('');
      const m = box.querySelector('.iomsg'); m.className = 'iomsg msg ' + (tone || 'hint');
      m.innerHTML = msg || '一个一个点：<b>输入</b>点上面的按钮 / 传感器，看 PLC 上哪个 I 灯亮；<b>输出</b>点「强制 Q」，看哪个元件动作。和 I/O 表一致就打「✓ 对」，不一致打「✗ 不对」。全部打完点「交对点表」。';
      box.querySelector('.ioround').textContent = rounds ? `已完成 ${rounds} 轮` : '';
    }
    box.innerHTML = `<div class="ioplcwrap"><svg class="ioplc" viewBox="0 0 360 140" role="img" aria-label="PLC 输入输出指示灯"></svg></div><div class="iogrid"><div><h3 class="ioh">现场输入（点一下操作，看上面 PLC 的 I 灯）</h3><div class="iofield"></div><h3 class="ioh">输出（主回路 QF1 已断开，电机不会转）：一次强制一个，看哪个元件动作</h3><div class="tools ioforce"></div><div class="ioout"></div></div>
      <div><div class="tblwrap"><table class="iotbl"></table></div><div class="tools"><button class="b primary" data-iosub="1">交对点表</button><button class="b ghost" data-ionew="1">换一台柜子</button><span class="cap ioround"></span></div><p class="iomsg msg hint"></p></div></div>`;
    box.addEventListener('click', e => {
      const d = e.target.closest('[data-dev]'), q = e.target.closest('[data-q]'), mk = e.target.closest('[data-mk]');
      if (d) { const k = d.dataset.dev; pressed.has(k) ? pressed.delete(k) : pressed.add(k); if (PP.sound) PP.sound.click(); draw(); return; }
      if (q) {
        const a = q.dataset.q; forced.has(a) ? forced.delete(a) : forced.add(a);
        if (forced.has('Q0.0') && forced.has('Q0.1')) { forced.delete(a); draw('<b class="bad">一次只强制一个输出！</b>Q0.0 和 Q0.1 是正反转接触器，同时强制会被硬件互锁挡住（KM2 吸不上）；要是互锁没接好，主回路一送电就是相间短路。刚才那个已经帮你改回 0 了。', 'bad'); return; }
        draw(); return;
      }
      if (mk) { marks[mk.dataset.mk] = mk.dataset.v; draw(); return; }
      if (e.target.closest('[data-ionew]')) { newRound(); return; }
      if (e.target.closest('[data-iosub]')) {
        const all = [...IO_IN, ...IO_OUT].map(r => r[0]);
        if (all.some(a => !marks[a])) { draw(`还有 ${all.filter(a => !marks[a]).length} 个点没打结果。每个点都要实际点一下、看一眼再打勾，不能凭感觉。`, 'hint'); return; }
        const W = wrongRows(), miss = all.filter(a => (marks[a] === 'bad') !== W.has(a));
        if (!miss.length) { rounds++; draw(`<b class="ok">对点表全对 ✓</b> 问题是：${f.why}<br>改好接线后，<b>把改过的点再对一遍</b>，然后才能下载程序、试自动运行。${rounds < 2 ? '点「换一台柜子」再来一轮。' : '两轮都对了，对点会了。'}`, 'good'); if (rounds >= 2 && !box.dataset.ok) { box.dataset.ok = '1'; done(); } }
        else draw(`<b class="bad">对点表有 ${miss.length} 个点打错了：</b>${miss.join('、')}。回去再按一下、强制一下，<b>看清亮的是哪个灯、动的是哪个元件</b>。提示：停止按钮是常闭，没按的时候 I0.0 应该是亮的。`, 'bad');
      }
    });
    newRound();
  }
  PP.addLesson('iocheck', {
    title: '送电对点：PLC I/O 点检', intro: '柜子接完线、程序下载之前，要先“对点”：一个输入一个输入地按、一个输出一个输出地强制，确认每个点和 I/O 表一致。先手动、后自动，能把接线错误挡在试车之前。',
    steps: [
      { t: '对点前先做这几件事', html: `<ol class="rules"><li><b>断开主回路</b>（电机回路断路器 QF1 拉下），只送控制电：对点时接触器会吸合，但电机不能转。</li><li>PLC 打到 <b>STOP</b>，不运行程序，免得程序和你同时动输出。</li><li>手里拿一份 <b>I/O 表</b>，每对完一个点就打勾，不对的写清楚现象。</li><li><b>输入</b>：按按钮、挡传感器，看 PLC 上对应的 I 灯亮没亮（常闭的停止、急停平时就该亮）。</li><li><b>输出</b>：用博途的监控表 / 强制表让一个输出为 1，看对应的接触器、阀、灯动作没动作。<b>一次只强制一个</b>，对完马上取消强制。</li></ol>` },
      { t: '动手：给输送线控制柜对点（两轮）', init: ioInit },
    ],
    quiz: () => [
      ['', '对点时为什么要先断开电机主回路？', ['省电，对点时用不着电机', '强制输出时接触器会吸合，电机不能突然转起来', '主回路有电时 PLC 输入灯不亮'], 1, '对点只验证控制回路，主回路断开才安全。'],
      ['', '停止按钮 SB1 接常闭，对点时没按它，I0.0 灯应该？', ['亮', '不亮', '一闪一闪'], 0, '常闭平时导通，I0.0=1；按下才灭。平时不亮说明接成常开或线断了。'],
      ['', '按正转按钮，亮的却是 I0.2，应该怎么处理？', ['在程序里把 I0.1 改成 I0.2 就行', '按图纸改接线，再把这个点重新对一遍', '不用管，自动运行时再看'], 1, '接线要和图纸、I/O 表一致；随手改程序，图纸就对不上了，以后维修的人会被坑。'],
      ['', '用监控表强制输出时应该？', ['一次强制一个，对完马上取消', '把所有输出一起强制，节省时间', '强制完不用取消，下载程序会自动覆盖'], 0, '同时强制可能撞上互锁；忘了取消强制，设备会按强制值动作，很危险。'],
    ],
    gate: { text: '完成第 2 步的两轮对点', ok: () => !!document.querySelector('#page-lesson-iocheck [data-step="1"][data-ok]') },
  });
})(window);
