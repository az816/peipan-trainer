// pages-plc.js — PLC 与通讯（梯形图练习、故障灯、HMI 绑定、IP 规划、变频器）+ 综合测验（第三批）
(function (G) {
  const PP = G.PP;
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  const exBtn = id => { const x = PP.EX.find(e => e.id === id); return `<button class="b small" data-ex="${id}">${x.name}</button>`; };

  function ledSVG(sc) {
    const col = c => ({ g: 'var(--led)', y: '#f2c200', r: 'var(--live)', rf: 'var(--live)' }[c] || 'var(--bg)');
    const L = (y, c, t) => `${c === 'rf' ? `<circle cx="40" cy="${y}" r="7" fill="var(--bg)" stroke="var(--dev-edge)"/>` : ''}<circle cx="40" cy="${y}" r="7" fill="${col(c)}" stroke="var(--dev-edge)"${c === 'rf' ? ' class="blink"' : ''}/><text x="54" y="${y + 4}" class="lt">${t}</text>`;
    return `<rect x="6" y="6" width="248" height="150" rx="6" fill="var(--dev)" stroke="var(--dev-edge)" stroke-width="1.5"/><rect x="120" y="30" width="120" height="70" rx="3" fill="var(--plate)" stroke="var(--dev-edge)"/><text x="180" y="62" text-anchor="middle" class="lt b">CPU 1214C</text><text x="180" y="78" text-anchor="middle" class="lt">DC/DC/DC</text>`
      + L(34, sc.run, 'RUN/STOP') + L(64, sc.err, 'ERROR') + L(94, sc.maint, 'MAINT') + L(124, sc.link, 'LINK') + `<rect x="150" y="116" width="34" height="26" rx="2" fill="var(--bg)" stroke="var(--dev-edge)"/><text x="167" y="152" text-anchor="middle" class="lt">PN 网口</text>`;
  }

  function mountPLC(el) {
    el.innerHTML = `<div class="page">
  <div class="page-head"><h1>PLC 与通讯</h1><p>PLC 接线就三件事：<b>电源</b>（L+ / M）、<b>输入</b>（公共端 1M + 按钮、传感器）、<b>输出</b>（3L+ / 3M 或继电器的 1L）。接好线，再看懂程序、会配通讯、会看故障灯。</p></div>
  <section class="card"><h2>PLC 接线练习<span>到「接线实训」里亲手接</span></h2><div class="tools" style="margin-top:0">${['npn', 'pnp', 'two', 'combo', 'cyl', 'diode', 'relay', 'estop', 'plcfr'].map(exBtn).join('')}</div></section>
  <section class="card"><h2>梯形图练习<span>按住下面的按钮当作现场按钮，看能流怎么走</span></h2>
    <div class="vt" id="ladsel"></div>
    <div class="cols2"><div class="ladwrap"><svg id="ladsb" class="lad"></svg></div>
      <div><div class="tools" id="ladins" style="margin-top:0"></div><div class="status" id="ladouts"></div><p id="ladnote" class="cap"></p></div></div></section>
  <section class="card"><h2>PLC 故障灯<span>以 S7-1200 为例 · 排查顺序：看灯 → 查程序 → 查接线 → 查电源</span></h2>
    <div class="vt" id="ledsel"></div>
    <div class="cols2"><div><svg id="ledsvg" class="ledp" viewBox="0 0 260 162" style="max-width:360px"></svg></div><div id="ledtxt"></div></div>
    <h3 style="margin-top:12px">看灯判断</h3><div id="ledquiz"></div></section>
  <section class="card"><h2>HMI 变量绑定<span>触摸屏上每个元素要绑定一个 PLC 地址，数据类型要对上</span></h2>
    <div class="tblwrap"><table id="hmitbl"></table></div><div class="tools"><button class="b primary" id="hmichk">检查</button><button class="b ghost" id="hmireset">重做</button></div><div id="hmires"></div>
    <p class="cap">地址怎么认：<span class="mono">%I</span> 输入、<span class="mono">%Q</span> 输出、<span class="mono">%M</span> 中间变量；后面 <span class="mono">0.0</span> 是 1 位（Bool），<span class="mono">W</span> 是 16 位字（Int），<span class="mono">D</span> 是 32 位双字（Real / DInt）。</p></section>
  <section class="card"><h2>PROFINET 组网：IP 规划<span>改对每台设备的 IP 和名称，然后 ping 一下</span></h2>
    <ul class="rules cap"><li><b>IP</b>：前三段相同（同一网段）、不能重复、最后一段不能是 0 或 255；掩码都是 255.255.255.0。</li><li><b>设备名称</b>：只用小写字母、数字、“-”和“.”；不能以“-”开头结尾，不能写成 n.n.n.n 那样，不能以 port-xyz 开头。</li></ul><p class="cap">下面这张表里故意留了 4 处错误。</p>
    <div class="tblwrap"><table id="iptbl"></table></div>
    <pre id="pingout" class="mono" style="white-space:pre-wrap;background:#1e221f;color:#d8e6c8;padding:10px;border-radius:3px;min-height:3em;font-size:12.5px">点表格右边的「ping」，看能不能连通。</pre>
    <p class="cap">网口灯：绿灯常亮 = 已连接；黄 / 绿灯闪 = 正在传数据。通讯不通先查网线，再查 IP 是否同网段、设备是否上电运行。</p>
    <div class="cols2" style="margin-top:10px"><div><h3>组网顺序</h3><ol class="rules"><li>先做表：每台设备的 <b>IP + 设备名称</b>，贴在柜门里。</li><li>博途里组态：添加 PLC、IO 设备、HMI，连到同一个网络。</li><li><b>分配设备名称</b>：在线找到设备（按 MAC 地址），把名称写进去。名称不对，PLC 找不到它。</li><li>下载组态，看 PLC 和设备的灯：RUN 绿、没有红灯、网口灯亮。</li><li>有问题用 ping 和在线诊断查。</li></ol></div>
      <div><h3>三种接法</h3><ul class="rules"><li><b>星形</b>：都接到交换机上，最常用，一台坏了不影响别的。</li><li><b>线形</b>：设备自带两个网口，一台接一台串下去，省交换机；中间一台断电，后面的全断。</li><li><b>环形</b>：首尾再连起来，断一处还能通，要用支持 MRP 的交换机 / 设备并组态。</li></ul></div></div></section>
  <section class="card"><h2>西门子和三菱对照<span>厂里两种 PLC 都常见，接线思路一样，叫法不同</span></h2>
    <div class="tblwrap"><table><tr><th></th><th>西门子 S7-1200</th><th>三菱 FX3U / FX5U</th></tr>
      <tr><td>输入地址</td><td class="mono">I0.0 … I0.7、I1.0 …</td><td class="mono">X0 … X7、X10 …（八进制，没有 X8、X9）</td></tr>
      <tr><td>输出地址</td><td class="mono">Q0.0 … Q0.7、Q1.0 …</td><td class="mono">Y0 … Y7、Y10 …</td></tr>
      <tr><td>中间变量</td><td class="mono">M10.0（位）、MW、MD</td><td class="mono">M0、M1 …（位）、D0（数据寄存器）</td></tr>
      <tr><td>输入公共端</td><td><b>1M</b>：PNP 传感器接 0V，NPN 接 +24V</td><td><b>S/S</b>：PNP（源型）接 0V，NPN（漏型）接 +24V</td></tr>
      <tr><td>输出公共端</td><td>晶体管 3L+ / 3M；继电器 1L、2L</td><td>COM1、COM2 …（每组一个）</td></tr>
      <tr><td>编程软件</td><td>博途 TIA Portal</td><td>GX Works2 / GX Works3</td></tr></table></div>
    <p class="cap">口诀两边都一样：<b>PNP 公共端接 0V，NPN 公共端接 24V</b>。具体型号以手册为准，比如 FX3U 的 S/S 只用于输入；不同系列输出的公共端名称不一样。</p></section>
  <section class="card" id="vfd"><h2>变频器入门<span>接线 + 两个最关键的参数：命令源、频率源</span></h2>
    <div class="cols2"><div><svg id="vfdsvg" class="ledp pn vfd" viewBox="0 0 390 296" role="img" aria-label="变频器接线示意"></svg>
      <div class="tools"><label class="field" style="flex-direction:row;align-items:center;gap:8px">主回路接线<select id="vwire"><option value="ok">R/S/T 接电源，U/V/W 接电机</option><option value="swap">电源接到了 U/V/W（错误）</option></select></label></div></div>
      <div><div class="form">
        <label class="field">运行命令源<select id="vcmd"><option value="panel">0：操作面板</option><option value="term">1：外部端子</option><option value="comm">2：通讯</option></select></label>
        <label class="field">频率源<select id="vfsrc"><option value="panel">面板数字设定</option><option value="ai">AI1 模拟量（电位器）</option><option value="comm">通讯给定</option></select></label>
        <label class="field">面板设定频率 Hz<input id="vfset" type="number" min="0" max="50" value="30"></label>
        <label class="field">AI1 电位器 <span id="vaiv">5.0 V</span><input id="vai" type="range" min="0" max="10" step="0.5" value="5"></label>
        <label class="field">加速时间 s<input id="vacc" type="number" min="1" max="60" value="5"></label></div>
        <div class="tools"><button class="b green" id="vrun">面板 RUN</button><button class="b red" id="vstop">面板 STOP</button><button class="b toggle" id="vdi1" aria-pressed="false">端子 DI1 正转</button><button class="b toggle" id="vdi2" aria-pressed="false">端子 DI2 反转</button></div>
        <div class="meter"><div class="lcd" id="vlcd">0.0</div><div class="mi" id="vstate">停机</div></div><div id="vmsg"></div></div></div>
    <ul class="rules cap"><li>口诀：<b>R/S/T 进，U/V/W 出，PE 必接。</b></li><li>换转向：改参数，或对调 U/V/W 任意两相，不要动 R/S/T。</li><li>参数编号各品牌不同，这里用通用名称，以说明书为准。</li></ul></section>
</div>`;
    const $ = id => el.querySelector('#' + id);
    // 梯形图练习
    let prog = PP.LADS[0], pressed = new Set(), Q = {};
    const ladDraw = () => {
      const bits = {}; prog.ins.forEach(([a, , t]) => (bits[a] = t === 'NO' ? pressed.has(a) : !pressed.has(a)));
      const res = PP.scan(prog, bits, Q); prog.rungs.forEach(r => (Q[r.q] = res[r.q]));
      const names = {}; prog.ins.forEach(([a, n]) => (names[a] = n)); prog.rungs.forEach(r => (names[r.q] = r.label));
      const L = PP.ladderSVG(prog.rungs, res, names); $('ladsb').setAttribute('viewBox', L.vb); $('ladsb').style.maxWidth = L.w * 1.25 + 'px'; $('ladsb').innerHTML = L.svg;
      $('ladsel').innerHTML = PP.LADS.map(p => `<button data-l="${p.id}" aria-selected="${p === prog}">${p.name}</button>`).join('');
      $('ladins').innerHTML = prog.ins.map(([a, n, t]) => `<button class="b hold ${t === 'NC' ? 'red' : 'green'}" data-in="${a}" aria-pressed="${pressed.has(a)}">按住 ${n}<br><span class="mono" style="font-weight:400;font-size:12px">${a} = ${bits[a] ? 1 : 0}${t === 'NC' ? '（常闭接线）' : ''}</span></button>`).join('');
      $('ladouts').innerHTML = prog.rungs.map(r => `<span class="chip ${res[r.q] ? 'on' : ''}">${r.q} ${r.label} <b>${res[r.q] ? '输出' : '—'}</b></span>`).join('');
      $('ladnote').innerHTML = prog.note;
    };
    $('ladsel').onclick = e => { const b = e.target.closest('[data-l]'); if (b) { prog = PP.LADS.find(p => p.id === b.dataset.l); Q = {}; pressed.clear(); ladDraw(); } };
    $('ladins').addEventListener('pointerdown', e => { const b = e.target.closest('[data-in]'); if (b) { e.preventDefault(); pressed.add(b.dataset.in); ladDraw(); } });
    window.addEventListener('pointerup', () => { if (pressed.size) { pressed.clear(); ladDraw(); } });
    ladDraw();
    // 故障灯
    let led = PP.LEDS[0];
    const ledDraw = () => {
      $('ledsel').innerHTML = PP.LEDS.map(s => `<button data-led="${s.id}" aria-selected="${s === led}">${s.name}</button>`).join('');
      $('ledsvg').innerHTML = ledSVG(led);
      $('ledtxt').innerHTML = `<h3>${led.name}</h3><p>${led.mean}</p><p><b>怎么办：</b>${led.act}</p>`;
    };
    $('ledsel').onclick = e => { const b = e.target.closest('[data-led]'); if (b) { led = PP.LEDS.find(s => s.id === b.dataset.led); ledDraw(); } };
    ledDraw();
    const lq = () => PP.quizBox($('ledquiz'), PP.pick(PP.LEDS, 4).map(s => {
      const opts = PP.pick([s.name, ...PP.pick(PP.LEDS.filter(x => x !== s), 3).map(x => x.name)], 4);
      return ['PLC', `<svg class="ledp" viewBox="0 0 260 162" style="max-width:220px;display:block">${ledSVG(s)}</svg>这几个灯说明什么？`, opts, opts.indexOf(s.name), s.mean + ' ' + s.act];
    }), { again: lq, ...(() => { const t = PP.prog.pageQuiz('plc'), box = $('ledquiz'); return { onAnswer: (q, r) => { t.onAnswer(q, r); if (t.check(4)) { let m = box.parentNode.querySelector('.pqdone'); if (!m) { m = document.createElement('p'); m.className = 'pqdone'; box.parentNode.appendChild(m); } m.textContent = '这一页学完了 ✓ 学习路线上已打勾'; } } }; })() });
    lq();
    // HMI 绑定
    const hmiDraw = () => {
      $('hmitbl').innerHTML = `<tr><th>触摸屏元素</th><th>数据类型</th><th>PLC 地址</th></tr>` + PP.HMIBIND.map((r, i) => `<tr><td>${r.el}</td><td><select data-ht="${i}"><option value="">—</option>${['Bool', 'Int', 'Real'].map(t => `<option>${t}</option>`).join('')}</select></td><td><select data-ha="${i}"><option value="">—</option>${r.opts.map(o => `<option>${o}</option>`).join('')}</select></td></tr>`).join('');
      $('hmires').innerHTML = '';
    };
    hmiDraw();
    $('hmireset').onclick = hmiDraw;
    $('hmichk').onclick = () => {
      let ok = 0;
      const li = PP.HMIBIND.map((r, i) => {
        const t = el.querySelector(`[data-ht="${i}"]`).value, a = el.querySelector(`[data-ha="${i}"]`).value;
        const good = t === r.type && a === r.addr; if (good) ok++;
        const why = [t !== r.type ? `类型应该是 ${r.type}` : '', a && a !== r.addr ? (r.why[a] || '') : !a ? '还没选地址' : ''].filter(Boolean).join('；');
        return `<li>${good ? '<span class="tag ok">对</span>' : '<span class="tag bad">不对</span>'} ${r.el}：${good ? `${r.type} → ${r.addr}` : why}</li>`;
      });
      $('hmires').innerHTML = `<p><b>${ok} / ${PP.HMIBIND.length}</b> 绑对了</p><ul class="rules">${li.join('')}</ul>`;
    };
    // IP 规划
    let devs = PP.IPDEVS();
    const ipDraw = () => {
      const errs = PP.ipCheck(devs);
      $('iptbl').innerHTML = `<tr><th>设备</th><th>IP 地址</th><th>子网掩码</th><th>设备名称</th><th>检查</th><th></th></tr>` + devs.map((d, i) => `<tr><td>${d.n}</td><td><input data-ip="${i}" value="${d.ip}" ${d.fixed ? 'readonly' : ''} style="width:9.5em;font:inherit;font-family:var(--f-mono);padding:4px 6px;border-radius:3px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink)"></td><td class="mono">255.255.255.0</td><td>${d.name === undefined ? '—' : `<input data-nm="${i}" value="${d.name}" ${d.fixed ? 'readonly' : ''} style="width:9em;font:inherit;font-family:var(--f-mono);padding:4px 6px;border-radius:3px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink)">`}</td><td>${errs[i].length ? `<span class="tag bad">有问题</span> <span class="cap">${errs[i].join('；')}</span>` : '<span class="tag ok">OK</span>'}</td><td>${i < devs.length - 1 ? `<button class="b small" data-ping="${i}">ping</button>` : ''}</td></tr>`).join('');
    };
    ipDraw();
    $('iptbl').addEventListener('change', e => { const i = e.target.dataset.ip ?? e.target.dataset.nm; if (i === undefined) return; if (e.target.dataset.ip !== undefined) devs[+i].ip = e.target.value.trim(); else devs[+i].name = e.target.value.trim(); ipDraw(); });
    $('iptbl').addEventListener('click', e => { const b = e.target.closest('[data-ping]'); if (b) $('pingout').textContent = `C:\\> ping ${devs[+b.dataset.ping].ip}\n` + PP.ping(devs, +b.dataset.ping); });
    // 变频器
    const vs = { wiring: 'ok', cmd: 'panel', fsrc: 'panel', fset: 30, ai: 5, acc: 5, panelRun: false, di1: false, di2: false };
    let hzNow = 0, timer = null;
    // 写实变频器：黑色机身 + 操作面板（数码管、RUN / STOP、电位器）+ 上进下出的端子 + 一台电机
    const vfdSVG = (r) => {
      const T = PP.R.T, MONO = 'font-family:var(--f-mono);', sw = vs.wiring === 'swap', boom = r.state === 'boom', run = hzNow > 0 && !boom;
      const scr = (x, y) => `<circle cx="${x}" cy="${y}" r="5.5" fill="url(#vf-sc)" stroke="#2a2d2f" stroke-width="1"/><path d="M${x - 3} ${y}h6M${x} ${y - 3}v6" stroke="#55595c" stroke-width="1.2"/>`;
      const lt = (x, y, t, a = 'middle') => `<text x="${x}" y="${y}" text-anchor="${a}" class="lt" style="font-family:var(--f-body);font-size:12px;font-weight:700">${t}</text>`;
      let s = PP.R.defs('vf-');
      // 进线
      const inX = [70, 95, 120], inC = ['#d6a000', '#2b8a3e', '#d32f2f'];
      s += lt(40, 13, sw ? '三相电源 L1 L2 L3（接错位置）' : '三相电源 L1 L2 L3 + PE', 'start');
      if (!sw) s += inX.map((x, i) => `<path d="M${x} 18V44" stroke="${inC[i]}" stroke-width="3.2"/>`).join('');
      else s += inX.map((x, i) => `<path d="M${x} 18V${22 + i * 4}H${18 + i * 5}V${284 - i * 4}H${x}V272" stroke="var(--live)" stroke-width="2.6" fill="none"/>`).join('');
      s += `<path d="M145 18V44" stroke="#2b8a3e" stroke-width="3.2"/><path d="M145 18V44" stroke="#f2c200" stroke-width="3.2" stroke-dasharray="5 5"/>`;
      // 机身
      s += `<rect x="40" y="50" width="180" height="204" rx="5" fill="url(#vf-gk)" stroke="#111"/>`;
      for (let i = 0; i < 9; i++) s += `<rect x="${58 + i * 16}" y="56" width="10" height="3" rx="1.5" fill="#1c1f21"/>`;
      s += `<rect x="56" y="30" width="104" height="24" rx="2" fill="#1d1f21"/>` + [70, 95, 120, 145].map(x => scr(x, 44)).join('') + ['R', 'S', 'T', 'PE'].map((t, i) => T(70 + i * 25, 68, t, MONO + 'font-size:10px;font-weight:700;fill:#e6e9e6')).join('');
      // 操作面板
      s += `<rect x="70" y="76" width="120" height="104" rx="4" fill="#d3d7d4" stroke="#8a8f8c"/><rect x="80" y="84" width="100" height="32" rx="2" fill="#141617"/>`;
      s += T(172, 108, boom ? 'Err' : hzNow.toFixed(1), `${MONO}font-size:21px;font-weight:700;fill:${boom ? '#ff3b30' : '#ff4a2e'}`, 'end');
      [['RUN', run], ['FWD', run && r.state !== 'rev'], ['REV', run && r.state === 'rev'], ['Hz', true]].forEach(([t, o], i) => (s += PP.R.led(86 + i * 25, 124, i === 3 ? '#3ad65d' : '#ff3b30', o, 2.6) + T(92 + i * 25, 127, t, MONO + 'font-size:6.5px;fill:#2a2e2b', 'start')));
      ['PRG', '▲', '▼', 'ENT'].forEach((t, i) => (s += `<rect x="${80 + i * 25}" y="134" width="20" height="12" rx="2" fill="#5b6064"/>` + T(90 + i * 25, 143, t, MONO + 'font-size:6.5px;fill:#e6e9e6')));
      const ang = (-135 + (vs.ai / 10) * 270) * Math.PI / 180;
      s += `<rect x="80" y="154" width="30" height="18" rx="3" fill="#2f9a4c"/>` + T(95, 166, 'RUN', MONO + 'font-size:8px;font-weight:700;fill:#fff');
      s += `<circle cx="130" cy="163" r="10" fill="#2b2f32" stroke="#111"/><line x1="130" y1="163" x2="${130 + Math.sin(ang) * 8}" y2="${163 - Math.cos(ang) * 8}" stroke="#fff" stroke-width="2"/>`;
      s += `<rect x="150" y="154" width="30" height="18" rx="3" fill="#cf3a2e"/>` + T(165, 163, 'STOP', MONO + 'font-size:6.5px;font-weight:700;fill:#fff') + T(165, 170, 'RST', MONO + 'font-size:5.5px;fill:#ffd9d4');
      // 铭牌 + 散热孔
      s += `<rect x="60" y="188" width="140" height="22" rx="1.5" fill="#f1f1ea" stroke="#9a9e98" stroke-width=".7"/>` + T(66, 198, '变频器 VFD', 'font-size:8.5px;font-weight:900;fill:#1f2523', 'start') + T(66, 206, '2.2kW · 3AC 380V · 0–50Hz', MONO + 'font-size:6.5px;fill:#3a3f3c', 'start');
      for (let i = 0; i < 8; i++) s += `<rect x="${62 + i * 17}" y="218" width="12" height="3" rx="1.5" fill="#1c1f21"/>`;
      // 下口：U V W 动力输出 + 控制端子（绿色插拔端子）
      s += `<rect x="56" y="250" width="80" height="24" rx="2" fill="#1d1f21"/>` + [70, 95, 120].map(x => scr(x, 262)).join('') + ['U', 'V', 'W'].map((t, i) => T(70 + i * 25, 240, t, MONO + 'font-size:10px;font-weight:700;fill:#e6e9e6')).join('');
      s += `<rect x="146" y="252" width="66" height="20" rx="2" fill="#2f8f46"/>` + [160, 180, 200].map(x => scr(x, 262)).join('') + ['DI1', 'DI2', 'COM'].map((t, i) => T(160 + i * 20, 240, t, MONO + 'font-size:7px;font-weight:700;fill:#e6e9e6')).join('');
      s += T(179, 232, '控制端子 ↓', 'font-size:7.5px;font-weight:700;fill:#c9cfd3');
      if (vs.di1) s += `<path d="M160 268C160 284 200 284 200 268" stroke="#f2c200" stroke-width="2" fill="none"/>`;
      if (vs.di2) s += `<path d="M180 268C180 280 200 280 200 268" stroke="#1f62c4" stroke-width="2" fill="none"/>`;
      // 电机电缆 + 电机
      if (!sw) s += `<path d="M95 274C95 296 230 296 250 250S300 150 312 150" stroke="#2b2e31" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M95 274C95 296 230 296 250 250S300 150 312 150" stroke="#55595d" stroke-width="3" fill="none"/>`;
      else s += `<text x="300" y="120" text-anchor="middle" style="fill:var(--live);font-size:12px;font-weight:900">电源接到 U/V/W 了！</text>`;
      let m = PP.R.dev({ kind: 'motor', x: 252, y: 150, w: 120, h: 80, terms: [] }, 'M', { p: 'vf-', on: {}, st: {}, r: { motor: run ? (r.state === 'rev' ? 'rev' : 'fwd') : 'stop' } });
      if (run) m = m.replace(/<g class="fan (fwd|rev)">/, (k, d) => `<g class="fan ${d}" style="animation-duration:${Math.max(0.15, 30 / hzNow * 0.3)}s">`);
      s += m;
      if (boom) s += `<rect x="40" y="50" width="180" height="204" rx="5" fill="var(--live)" opacity=".18"/><text x="130" y="236" text-anchor="middle" style="fill:var(--live);font-size:22px;font-weight:900;paint-order:stroke;stroke:#fff;stroke-width:4px">炸机！</text>`;
      return s;
    };
    const vDraw = () => {
      const r = PP.vfdSim(vs);
      $('vaiv').textContent = (+vs.ai).toFixed(1) + ' V';
      $('vdi1').setAttribute('aria-pressed', vs.di1); $('vdi2').setAttribute('aria-pressed', vs.di2);
      clearInterval(timer);
      const acc = +r.acc || +vs.acc || 5, target = r.state === 'boom' ? 0 : +r.hz || 0, step = 50 / Math.max(1, acc) / 10;
      if (r.state === 'boom' || !isFinite(hzNow)) hzNow = 0;
      const tick = () => {
        hzNow = Math.abs(target - hzNow) <= step ? target : hzNow + Math.sign(target - hzNow) * step;
        $('vlcd').textContent = hzNow.toFixed(1); $('vfdsvg').innerHTML = vfdSVG(r);
        $('vstate').innerHTML = r.state === 'boom' ? '<b>故障：炸机</b>' : r.state === 'stop' && hzNow === 0 ? '停机' : `${r.state === 'rev' ? '反转' : '正转'} · 目标 ${target.toFixed(1)} Hz（加速时间 ${acc}s 从 0 到 50Hz）`;
        if (hzNow === target) clearInterval(timer);
      };
      tick(); timer = setInterval(tick, 100);
      $('vmsg').innerHTML = r.msgs.length ? `<ul class="rules" style="margin-top:8px">${r.msgs.map(m => `<li>${m}</li>`).join('')}</ul>` : '<p class="cap" style="margin-top:8px">命令源和频率源设置正确，变频器按给定频率运行。</p>';
    };
    const bindV = (id, k, num) => $(id).addEventListener('input', e => { vs[k] = num ? +e.target.value : e.target.value; vDraw(); });
    bindV('vwire', 'wiring'); bindV('vcmd', 'cmd'); bindV('vfsrc', 'fsrc'); bindV('vfset', 'fset', 1); bindV('vai', 'ai', 1); bindV('vacc', 'acc', 1);
    $('vrun').onclick = () => { vs.panelRun = true; vDraw(); };
    $('vstop').onclick = () => { vs.panelRun = false; if (vs.cmd === 'term') { vs.di1 = vs.di2 = false; } vDraw(); };
    $('vdi1').onclick = () => { vs.di1 = !vs.di1; vDraw(); };
    $('vdi2').onclick = () => { vs.di2 = !vs.di2; vDraw(); };
    vDraw();
  }

  // ---------- 综合测验 ----------
  function mountQuiz(el) {
    const cats = [...new Set(PP.QZ.map(q => q[0]))];
    let cat = '全部';
    el.innerHTML = `<div class="page"><div class="page-head"><h1>综合测验</h1><p>题库 ${PP.QZ.length} 题，覆盖${cats.join('、')}。每组随机 12 题，答错的会进错题本。</p></div>
  <section class="card"><div class="vt" id="qcats"></div><div class="tools" style="margin-top:0"><button class="b primary" id="qnew">开始一组</button><button class="b" id="qwrong">练错题</button><button class="b ghost" id="qclear">清空错题本</button><span class="cap" id="qwc"></span></div></section>
  <section class="card"><div id="qbox"></div></section></div>`;
    const $ = id => el.querySelector('#' + id);
    let wrong = new Set(store.get('pp-wrong-v1', []));
    const saveW = () => { store.set('pp-wrong-v1', [...wrong]); $('qwc').textContent = `错题本 ${wrong.size} 题`; };
    const onAnswer = (q, ok) => { if (ok) wrong.delete(q[1]); else wrong.add(q[1]); saveW(); };
    const start = list => PP.quizBox($('qbox'), list, { onAnswer, again: () => start(PP.pick(pool(), 12)) });
    const pool = () => PP.QZ.filter(q => cat === '全部' || q[0] === cat);
    const drawCats = () => { $('qcats').innerHTML = ['全部', ...cats].map(c => `<button data-c="${c}" aria-selected="${c === cat}">${c}${c === '全部' ? '' : `（${PP.QZ.filter(q => q[0] === c).length}）`}</button>`).join(''); };
    $('qcats').onclick = e => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; drawCats(); start(PP.pick(pool(), 12)); } };
    $('qnew').onclick = () => start(PP.pick(pool(), 12));
    $('qwrong').onclick = () => { const l = PP.QZ.filter(q => wrong.has(q[1])); if (!l.length) { $('qbox').innerHTML = '<p>错题本是空的。</p>'; return; } start(PP.pick(l, l.length)); };
    $('qclear').onclick = () => { wrong.clear(); saveW(); };
    drawCats(); saveW(); start(PP.pick(pool(), 12));
  }

  // 「PLC 与通讯」属于进阶内容，新手版不放进知识库导航（mountPLC 保留，恢复时把它加回来即可）
  PP.PAGES.push({ id: 'quiz', title: '综合测验', order: 6, mount: mountQuiz });
  PP.mountPLC = mountPLC;
})(window);
