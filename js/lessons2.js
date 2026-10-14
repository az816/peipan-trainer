// lessons2.js — 第 2、6、7 关的课：万用表怎么用、剥线压端子套线号、排故方法（电压法 + 测量记录）
(function (G) {
  const PP = G.PP, R = PP.R;

  // ---------- 万用表 ----------
  const POS = [['off', 'OFF', -90], ['vac', 'V~', -30], ['vdc', 'V⎓', 30], ['ohm', 'Ω •)))', 90], ['amp', 'A', 150]];
  function meterSVG(m) {
    const cx = 110, cy = 200, a = POS.find(p => p[0] === m.pos)[2] * Math.PI / 180;
    let g = `<rect x="6" y="6" width="208" height="368" rx="26" fill="#f2c200" stroke="#a88400" stroke-width="2"/><rect x="20" y="20" width="180" height="340" rx="16" fill="#2b2f33"/>`;
    g += `<rect x="34" y="34" width="152" height="64" rx="4" fill="#c9d3b8"/><text x="176" y="80" text-anchor="end" style="font-family:var(--f-mono);font-size:30px;font-weight:700;fill:#1e2a16">${m.lcd}</text><text x="42" y="50" style="font-family:var(--f-mono);font-size:9px;fill:#1e2a16">${m.unit}</text>`;
    g += `<circle cx="${cx}" cy="${cy}" r="56" fill="#1c1f22" stroke="#4b5156" stroke-width="2"/>`;
    for (const [k, t, deg] of POS) {
      const r = deg * Math.PI / 180, tx = cx + 74 * Math.cos(r), ty = cy + 74 * Math.sin(r) + 4;
      const col = m.pos === k ? '#fff' : '#e4e8e6', lab = k === 'vdc' ? `<text x="${tx - 5}" y="${ty}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:${col}">V</text><path d="M${tx + 2} ${ty - 9}h10M${tx + 2} ${ty - 5}h2.5M${tx + 5.8} ${ty - 5}h2.5M${tx + 9.6} ${ty - 5}h2.4" stroke="${col}" stroke-width="1.6"/>` : `<text x="${tx}" y="${ty}" text-anchor="middle" style="font-size:${t.length > 3 ? 9.5 : 12}px;font-weight:700;fill:${col}">${t}</text>`;
      g += `<g class="mpos" data-pos="${k}"><circle cx="${cx + 74 * Math.cos(r)}" cy="${cy + 74 * Math.sin(r)}" r="17" fill="${m.pos === k ? '#e2580f' : 'transparent'}"/>${lab}</g>`;
    }
    g += `<circle cx="${cx}" cy="${cy}" r="40" fill="#3a3f44"/><rect x="${cx - 7}" y="${cy - 40}" width="14" height="80" rx="6" fill="#55595d" transform="rotate(${POS.find(p => p[0] === m.pos)[2] + 90} ${cx} ${cy})"/><line x1="${cx}" y1="${cy}" x2="${cx + 34 * Math.cos(a)}" y2="${cy + 34 * Math.sin(a)}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
    const jacks = [['a', '10A', 52], ['com', 'COM', 110], ['v', 'VΩ', 168]];
    for (const [k, t, x] of jacks) g += `<g class="mjack" data-jack="${k}"><circle cx="${x}" cy="318" r="13" fill="#111" stroke="${k === 'com' ? '#666' : '#d32f2f'}" stroke-width="3"/><text x="${x}" y="346" text-anchor="middle" style="font-size:9.5px;font-weight:700;fill:#e4e8e6">${t}</text></g>`;
    const rx = m.jack === 'a' ? 52 : 168;
    g += `<path d="M110 318V376" stroke="#111" stroke-width="5"/><circle cx="110" cy="318" r="6" fill="#111" stroke="#444"/><path d="M${rx} 318V376" stroke="#d32f2f" stroke-width="5"/><circle cx="${rx}" cy="318" r="6" fill="#d32f2f"/>`;
    return g;
  }
  const TASKS = [
    { k: 'ac', t: '量墙上插座的电压', d: 'AC 220V', need: ['vac', 'v'], ok: ['228', 'V~'] },
    { k: 'dc', t: '量 24V 开关电源输出', d: 'DC 24V', need: ['vdc', 'v'], ok: ['24.1', 'V⎓'] },
    { k: 'cont', t: '断电后量一根线通不通', d: '蜂鸣档', need: ['ohm', 'v'], ok: ['0.3', 'Ω'], beep: true },
    { k: 'coil', t: '断电后量接触器线圈的电阻', d: '电阻档', need: ['ohm', 'v'], ok: ['550', 'Ω'] },
  ];
  function judge(t, m) {
    if (m.pos === 'off') return [false, '表还没开机：先把旋钮转到合适的档位。'];
    const live = t.k === 'ac' || t.k === 'dc';
    if (m.jack === 'a' && live) return [false, '<b>危险！</b>红表笔插在 10A 电流孔去量电压，表内部几乎是短路，会把电源短路：打火、烧表、可能炸表伤人。<b>量电压，红表笔一定插 VΩ 孔。</b>'];
    if (m.pos === 'amp' && live) return [false, '<b>危险！</b>电流档内阻很小，并在电源两端等于短路，会烧保险、炸表。量电压要用电压档。'];
    if (m.pos === 'ohm' && live) return [false, '<b>不能这样量！</b>电阻 / 蜂鸣档是给断电的东西用的，表里自己有电池。拿去量带电的插座或电源，轻则读数乱、重则烧表。'];
    if (m.jack === 'a') return [false, '红表笔插在 10A 孔，只能量电流。量电阻、通断要插 VΩ 孔。'];
    if (t.k === 'ac' && m.pos === 'vdc') return [false, '插座是交流电，要用 V~（交流电压档）。用直流档读数不对。'];
    if (t.k === 'dc' && m.pos === 'vac') return [false, '开关电源输出是直流，要用 V⎓（直流电压档）。'];
    if (!live && (m.pos === 'vac' || m.pos === 'vdc')) return [false, '断了电的东西用电压档量不出来（读数是 0）。量通断、量电阻要用 Ω / 蜂鸣档。'];
    if (!live && m.pos === 'amp') return [false, '电流档要串在回路里量电流，量通断不用它。'];
    return [true, t.k === 'cont' ? '蜂鸣器“嘀——”，读数接近 0Ω：这根线是通的。' : t.k === 'coil' ? '线圈有几百欧电阻是正常的；读数 OL 说明线圈断了，0Ω 说明线圈短路。' : t.k === 'dc' ? '直流 24V 正常。如果读数是 −24V，说明表笔反了：红表笔那头才是 0V。' : '交流 220V 正常（一般在 198–242V 之间都算正常）。'];
  }
  function meterInit(box, done) {
    const m = { pos: 'off', jack: 'v', lcd: '', unit: '' }; let ti = 0; const got = new Set();
    const draw = (msg, tone) => {
      box.querySelector('.dmm').innerHTML = meterSVG(m);
      box.querySelector('.mtasks').innerHTML = TASKS.map((t, i) => `<button class="mtask${i === ti ? ' cur' : ''}${got.has(t.k) ? ' ok' : ''}" data-ti="${i}"><i>${got.has(t.k) ? '✓' : i + 1}</i><span><b>${t.t}</b><small>${t.d}</small></span></button>`).join('');
      box.querySelector('.mmsg').className = 'mmsg msg ' + (tone || 'hint');
      box.querySelector('.mmsg').innerHTML = msg || `现在的任务：<b>${TASKS[ti].t}</b>。转旋钮选档位，点下面的插孔决定红表笔插哪，然后点「去量」。`;
      if (got.size === TASKS.length) { box.dataset.ok = '1'; done(); }
    };
    box.innerHTML = `<div class="mgrid"><svg class="dmm" viewBox="0 0 220 380" role="img" aria-label="数字万用表"></svg><div><div class="mtasks"></div><div class="tools"><button class="b primary" data-go-measure="1">去量</button></div><p class="mmsg msg hint"></p></div></div>
      <ul class="rules cap"><li>量之前先看档位：<b>交流 V~、直流 V⎓、电阻 / 通断 Ω、电流 A</b>。</li><li>量电压、电阻：红表笔插 <b>VΩ</b>，黑表笔插 <b>COM</b>。10A 孔只量电流。</li><li>电阻 / 蜂鸣档只量<b>断了电</b>的东西。不知道电压多高，先用最大档。</li><li>用完转到 OFF。</li></ul>`;
    box.addEventListener('click', e => {
      const p = e.target.closest('[data-pos]'), j = e.target.closest('[data-jack]'), t = e.target.closest('[data-ti]');
      if (p) { m.pos = p.dataset.pos; m.lcd = ''; m.unit = ''; draw(); return; }
      if (j && j.dataset.jack !== 'com') { m.jack = j.dataset.jack; m.lcd = ''; draw(); return; }
      if (t) { ti = +t.dataset.ti; m.lcd = ''; draw(); return; }
      if (e.target.closest('[data-go-measure]')) {
        const T = TASKS[ti], [ok, why] = judge(T, m);
        m.lcd = ok ? T.ok[0] : m.pos === 'off' ? '' : /危险/.test(why) ? 'Err' : '0.0'; m.unit = ok ? T.ok[1] : '';
        if (ok) { got.add(T.k); if (T.beep && PP.sound) PP.sound.beep(); const nx = TASKS.findIndex(x => !got.has(x.k)); draw(`<b class="ok">对了 ✓</b> ${why}${nx >= 0 ? ` 下一个任务：<b>${TASKS[nx].t}</b>。` : ' <b>四个任务都完成了。</b>'}`, 'good'); if (nx >= 0) setTimeout(() => { ti = nx; m.lcd = ''; draw(`下一个任务：<b>${TASKS[nx].t}</b>（${TASKS[nx].d}）。`); }, 2200); }
        else draw(why, 'bad');
      }
    });
    draw();
  }
  PP.addLesson('meter', {
    title: '万用表怎么用', intro: '万用表是电工最常用的工具：查有没有电、线通不通、线圈好不好，都靠它。新手最常见的错误是档位或插孔选错，轻则读数不对，重则烧表、打火。',
    steps: [{ t: '动手量四样东西', init: meterInit }],
    quiz: () => [
      ['', '量插座 220V，旋钮应该转到？', ['V⎓（直流电压）', 'V~（交流电压）', 'Ω（电阻）'], 1, '插座是交流电，用 V~。'],
      ['', '量电压时红表笔应该插哪个孔？', ['10A', 'VΩ', 'COM'], 1, '10A 孔只量电流，插错了量电压会把电源短路。'],
      ['', '断电后量一根线通不通，用？', ['蜂鸣 / 电阻档', '交流电压档', '电流档'], 0, '通了会“嘀”一声，读数接近 0Ω。'],
      ['', '量接触器线圈两端读数是 OL（无穷大），说明？', ['线圈正常，没通电就是 OL', '线圈断了（开路）', '线圈短路（两头碰在一起）'], 1, '正常线圈有几十到几百欧；OL 是断路。'],
      ['', '电阻档可以去量带电的电源吗？', ['可以，读数就是电源的电阻', '不可以，会读数乱甚至烧表', '只要是 24V 就可以量'], 1, '电阻、蜂鸣档只量断了电的东西。'],
    ],
    gate: { text: '完成第 1 步的四个测量任务', ok: () => !!document.querySelector('#page-lesson-meter [data-step="0"][data-ok]') },
  });

  // ---------- 配盘工艺：剥线、压端子、套线号 ----------
  const W = (strip, col = '#1f62c4') => `<svg viewBox="0 0 200 40"><rect x="10" y="12" width="110" height="16" rx="5" fill="${col}"/><g>${Array.from({ length: 6 }, (_, i) => `<line x1="120" y1="${14 + i * 2.4}" x2="${120 + strip * 3}" y2="${14 + i * 2.4}" stroke="#c98a3a" stroke-width="1.6"/>`).join('')}</g><text x="${122 + strip * 1.5}" y="38" text-anchor="middle" style="font-size:9px;fill:var(--muted)">${strip} mm</text></svg>`;
  const FER = { E: `<svg viewBox="0 0 120 40"><rect x="8" y="10" width="34" height="20" rx="5" fill="#e9e9e4" stroke="#999"/><rect x="42" y="14" width="60" height="12" rx="2" fill="#c9ccce" stroke="#8a8f92"/><text x="25" y="38" text-anchor="middle" style="font-size:8px;fill:var(--muted)">塑料套</text><text x="72" y="38" text-anchor="middle" style="font-size:8px;fill:var(--muted)">金属管</text></svg>`,
    O: `<svg viewBox="0 0 120 40"><rect x="8" y="13" width="30" height="14" rx="4" fill="#d32f2f"/><rect x="38" y="15" width="30" height="10" fill="#c9ccce" stroke="#8a8f92"/><circle cx="88" cy="20" r="16" fill="#c9ccce" stroke="#8a8f92"/><circle cx="88" cy="20" r="7" fill="var(--surface)" stroke="#8a8f92"/></svg>`,
    U: `<svg viewBox="0 0 120 40"><rect x="8" y="13" width="30" height="14" rx="4" fill="#1f62c4"/><rect x="38" y="15" width="30" height="10" fill="#c9ccce" stroke="#8a8f92"/><path d="M68 6h22a14 14 0 0 1 0 28H68v-9h20a5 5 0 0 0 0-10H68z" fill="#c9ccce" stroke="#8a8f92"/></svg>` };
  const CRIMP = k => `<svg viewBox="0 0 160 46"><rect x="6" y="15" width="56" height="16" rx="5" fill="#1f62c4"/>${k === 'ins' ? '<rect x="62" y="17" width="16" height="12" fill="#1f62c4"/>' : ''}<rect x="${k === 'ins' ? 62 : 62}" y="13" width="18" height="20" rx="5" fill="#e9e9e4" stroke="#999"/><rect x="80" y="16" width="52" height="14" rx="2" fill="#c9ccce" stroke="#8a8f92"/>${k === 'bare' ? `<g>${Array.from({ length: 5 }, (_, i) => `<line x1="132" y1="${18 + i * 2.4}" x2="150" y2="${18 + i * 2.4}" stroke="#c98a3a" stroke-width="1.6"/>`).join('')}</g>` : k === 'ok' ? '<rect x="132" y="18" width="2" height="10" fill="#c98a3a"/>' : ''}${k === 'ins' ? '<rect x="80" y="18" width="14" height="10" fill="#1f62c4" opacity=".85"/>' : ''}<path d="M92 16v14M104 16v14M116 16v14" stroke="#7a8086" stroke-width="1"/></svg>`;
  const SLV = r => `<svg viewBox="0 0 160 60"><line x1="10" y1="30" x2="150" y2="30" stroke="#1f62c4" stroke-width="7" stroke-linecap="round"/><rect x="58" y="20" width="44" height="20" rx="3" fill="#fbfbf5" stroke="#9a9e98"/><text x="80" y="35" text-anchor="middle" transform="rotate(${r} 80 30)" style="font-family:var(--f-mono);font-size:12px;font-weight:700;fill:#1f2523">101</text></svg>`;
  const flow = [['量', '对着图纸量好长度，留 10–15cm 余量'], ['剥', '剥线钳选对孔，剥掉一段绝缘皮，不伤线芯'], ['套', '先套上线号管（压了端子就套不进去了）'], ['压', '插进冷压端子，用压线钳压到底'], ['拉', '轻轻拉一下，拉不掉才算压好'], ['接', '插进端子，拧紧螺丝；端子不露铜、不压绝缘皮']];
  function craftFlow(box) {
    box.innerHTML = `<ol class="cflow">${flow.map(([a, b], i) => `<li><span class="cf-n">${i + 1}</span><b>${a}</b><small>${b}</small></li>`).join('')}</ol>
      <div class="cfer">${[['E', '管型（针式）端子', '最常用：PLC、端子排、接触器的螺钉压框或弹簧端子，接多股软线必须用'], ['O', 'O 型（圆形）端子', '螺栓压接：接地排、大电流端子，拧紧后不会脱出'], ['U', 'U / 叉型端子', '螺钉压板式端子，不用卸下螺钉就能装拆']].map(([k, n, d]) => `<div class="cf-card">${FER[k]}<b>${n}</b><small>${d}</small></div>`).join('')}</div>
      <p class="cap">导线颜色（设备厂常用，按 GB/T 5226.1）：动力线黑色、交流控制线红色、直流控制线蓝色、保护接地 PE 只能用黄绿双色。具体以本厂图纸和规定为准。</p>`;
  }
  PP.addLesson('craft', {
    title: '剥线 压端子 套线号', intro: '接对只是第一步，接得牢、接得规矩才算合格。师傅验收先看工艺：端子压没压牢、有没有露铜、线号是不是一个方向。',
    steps: [{ t: '一根线从头到尾的做法', init: craftFlow }],
    quiz: () => [
      ['', 'PLC 输入端子要接一根 0.75mm² 多股软线，线头用什么？', [FER.E, FER.O, FER.U].map((s, i) => `<span class="qfer">${s}</span>${['管型端子', 'O 型端子', 'U 型端子'][i]}`), 0, '多股软线进螺钉压框或弹簧端子要用管型端子，不然线芯会散开、压不牢。'],
      ['', '接地排上 M5 螺栓接 PE 线，用什么端子？', [FER.E, FER.O, FER.U].map((s, i) => `<span class="qfer">${s}</span>${['管型端子', 'O 型端子', 'U 型端子'][i]}`), 1, '螺栓压接用 O 型端子，螺栓松了线也不会脱出来。'],
      ['', '管型端子 E0508（金属管长 8mm），线头应该剥多长？', [4, 8, 15].map(n => `<span class="qfer">${W(n)}</span>`), 1, '剥线长度等于端子金属管的长度：短了压不住，长了露铜。'],
      ['', '下面哪个端子压得合格？', ['bare', 'ins', 'ok'].map(k => `<span class="qfer">${CRIMP(k)}</span>`), 2, '合格：线芯到管口齐平或略出一点，绝缘皮顶到塑料套里。露出一截铜线（左）容易碰到旁边端子短路；绝缘皮压进金属管（中）接触不良、会发热。'],
      ['', '水平走的线，线号管上的字应该怎么朝向？', [0, 180, 90].map(r => `<span class="qfer">${SLV(r)}</span>`), 0, '常用规矩：水平的线从左往右读，竖直的线从下往上读，全柜方向一致，维修时一眼就能看清。'],
      ['', '直流 24V 控制线一般用什么颜色？（GB/T 5226.1 推荐）', ['黑色', '蓝色', '黄绿双色'], 1, '直流控制蓝色、交流控制红色、动力黑色；黄绿双色只能做 PE 保护接地。'],
    ],
  });

  // ---------- 排故方法：电压法 ----------
  // 回路：L —FU— 1 —SB1— 2 —SB2— 3 —KM线圈— N；每个元件两头和每根线两头都能量
  const PTS = [['L', 'XT 的 L', 130, 30], ['FU1', 'FU 的 1', 130, 62], ['FU2', 'FU 的 2', 130, 108], ['S11', 'SB1 的 1', 130, 140], ['S12', 'SB1 的 2', 130, 192], ['S23', 'SB2 的 3', 130, 224], ['S24', 'SB2 的 4', 130, 276], ['A1', 'KM 的 A1', 130, 308], ['A2', 'KM 的 A2', 130, 354], ['N', 'XT 的 N', 130, 384]];
  const ELS = [['wL', 'L', 'FU1', 'L 进线（XT → FU）'], ['fu', 'FU1', 'FU2', '熔断器 FU 熔断'], ['w1', 'FU2', 'S11', '线号 1 断线'], ['sb1', 'S11', 'S12', 'SB1 常闭触点接触不良'], ['w2', 'S12', 'S23', '线号 2 断线'], ['sb2', 'S23', 'S24', 'SB2 按下不通'], ['w3', 'S24', 'A1', '线号 3 断线'], ['km', 'A1', 'A2', 'KM 线圈烧断'], ['wN', 'A2', 'N', 'N 线断线']];
  function troubleSVG(t) {
    const { W: Wr, NL, contact, coil, fuse, SRC } = PP.S;
    let g = SRC(130, 16, 'L') + Wr('L', [[130, 24], [130, 62]]) + fuse(130, 62) + Wr('1', [[130, 92], [130, 140]]) + NL('1', 118, 120) + contact(130, 140, { dev: 'SB1', type: 'NC', act: 'btn', t1: '1', t2: '2' });
    g += Wr('2', [[130, 180], [130, 224]]) + NL('2', 118, 206) + contact(130, 224, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + Wr('3', [[130, 264], [130, 308]]) + NL('3', 118, 290) + coil(130, 320, 'KM') + Wr('3', [[130, 308], [130, 320]]) + Wr('N', [[130, 342], [130, 384]]) + SRC(130, 400, 'N');
    for (const [k, n, x, y] of PTS) { const r = t.read[k]; g += `<g class="tp${r != null ? ' done' : ''}" data-pt="${k}"><circle cx="${x + 46}" cy="${y}" r="9"/><text x="${x + 60}" y="${y + 4}">${n}${r != null ? `：<tspan class="${r ? 'v' : 'z'}">${r} V</tspan>` : ''}</text><line x1="${x}" y1="${y}" x2="${x + 37}" y2="${y}"/></g>`; }
    return g;
  }
  function troubleInit(box, done) {
    let t, solved = 0;
    const reset = () => {
      const el = ELS[Math.floor(Math.random() * ELS.length)];
      t = { brk: el[0], read: {}, log: [], tries: 0 };
      draw();
    };
    // 断点前（和 L 连着）读 220V，断点后（经线圈和 N 连着）读 0V
    const volt = k => { const i = PTS.findIndex(p => p[0] === k), bi = ELS.findIndex(e => e[0] === t.brk), endIdx = PTS.findIndex(p => p[0] === ELS[bi][2]); return i < endIdx ? 220 : 0; };
    const draw = msg => {
      box.querySelector('.tsch').innerHTML = troubleSVG(t);
      box.querySelector('.tlog').innerHTML = t.log.length ? `<table><tr><th>#</th><th>红表笔</th><th>黑表笔</th><th>读数</th><th>说明</th></tr>${t.log.map((l, i) => `<tr><td class="mono">${i + 1}</td><td>${l[0]}</td><td>XT 的 N</td><td class="mono">${l[1]} V</td><td>${l[1] ? '这点和 L 连着，有电' : '这点没电'}</td></tr>`).join('')}</table>` : '<p class="cap">还没量。点左边图上的测点（红色圆点）。</p>';
      box.querySelector('.tsel').innerHTML = `<option value="">— 我判断断点在 —</option>` + ELS.map(e => `<option value="${e[0]}">${e[3]}</option>`).join('');
      box.querySelector('.tmsg').innerHTML = msg || '现象：<b>按住 SB2，KM 不吸合</b>。已经送电，按着 SB2。黑表笔夹在 N 上，红表笔从上往下一个个点。';
      box.querySelector('.tcount').textContent = solved ? `已找对 ${solved} 个` : '';
    };
    box.innerHTML = `<p><b>电压法</b>（带电测）：黑表笔固定在 N（或 0V），红表笔沿着回路从电源往负载一个点一个点量。<b>有 220V 的点在断点前面，变成 0V 的那一段就是断点。</b></p>
      <div class="tgrid"><svg class="sch tsch" viewBox="0 0 330 410"></svg><div><div class="tlog tblwrap"></div><div class="tools"><select class="tsel"></select><button class="b primary" data-tok="1">确认</button><button class="b ghost" data-tnew="1">换一个故障</button><span class="cap tcount"></span></div><p class="tmsg msg hint"></p></div></div>
      <p class="cap"><b>电阻法</b>（断电测）：断电、验电后，万用表打到蜂鸣档，一段一段量：同一根线两头应该“嘀”；常闭触点平时应该通；按住按钮量常开触点应该通；线圈两端应该有几百欧。哪一段量出 OL，哪一段就断了。现场带电测要特别小心，没把握就用电阻法。</p>`;
    box.addEventListener('click', e => {
      const p = e.target.closest('[data-pt]');
      if (p) { const k = p.dataset.pt, v = volt(k); t.read[k] = v; t.log.push([PTS.find(x => x[0] === k)[1], v]); if (PP.sound && v) PP.sound.tick(); draw(); return; }
      if (e.target.closest('[data-tnew]')) { reset(); return; }
      if (e.target.closest('[data-tok]')) {
        const v = box.querySelector('.tsel').value; if (!v) return;
        const el = ELS.find(x => x[0] === v), real = ELS.find(x => x[0] === t.brk);
        if (!Object.keys(t.read).length) { draw('先量一量再判断。凭感觉猜不算本事。'); return; }
        if (v === t.brk) { solved++; box.dataset.ok = solved >= 2 ? '1' : ''; draw(`<b class="ok">找对了 ✓</b> 断点是：${real[3]}。你量了 ${t.log.length} 次。${solved < 2 ? '再点「换一个故障」，找对两个就过关。' : '已经找对两个，排故方法掌握了。'}`); if (solved >= 2) done(); }
        else { t.tries++; draw(`<b class="bad">不对。</b>“${el[3]}”不是这次的断点。找<b>最后一个有 220V 的点</b>和<b>第一个 0V 的点</b>，断点就在它们中间。`); }
      }
    });
    reset();
  }
  PP.addLesson('trouble', {
    title: '排故方法：电压法和电阻法', intro: '设备不动了，不要乱拆乱换。按顺序来：看现象 → 缩小范围 → 用万用表量 → 确认故障点 → 修好后试车。',
    steps: [
      { t: '排故四步', html: `<ol class="rules"><li><b>看现象</b>：哪个动作不对？指示灯、接触器、PLC 输入输出灯是什么状态？</li><li><b>缩小范围</b>：对照图纸，是主回路还是控制回路？是哪一条支路？</li><li><b>用万用表量</b>：带电用电压法，断电用电阻法，把每次量的点和读数记下来。</li><li><b>确认并修复</b>：找到故障点修好，送电试车，确认现象消失。</li></ol>` },
      { t: '动手：用电压法找断点（找对 2 个）', init: troubleInit },
    ],
    quiz: () => [
      ['', '用电压法排故，黑表笔一般固定在？', ['L 火线（或 +24V）', 'N 零线（或 0V）', 'PE 地排或者柜体'], 1, '黑表笔固定在 N / 0V，红表笔沿回路一点点往下量。'],
      ['', '前一个点 220V，后一个点 0V，说明？', ['断点就在这两个点之间', '两个点都正常，是负载坏了', '电源坏了'], 0, '有电到没电的那一段就是断点。'],
      ['', '电阻法要在什么状态下量？', ['带电，这样才量得准', '断电、验电以后', '带不带电都可以'], 1, '电阻 / 蜂鸣档只能量断了电的东西。'],
      ['', '排故时最重要的习惯是？', ['先把怀疑的元件换新的试试', '对照图纸量，记下读数再判断', '先问师傅这台设备以前坏过哪里'], 1, '记录测量结果能避免重复测、漏测，也方便和师傅沟通。'],
    ],
    gate: { text: '在第 2 步里找对 2 个断点', ok: () => !!document.querySelector('#page-lesson-trouble [data-step="1"][data-ok="1"]') },
  });
})(window);
