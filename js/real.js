// real.js — 写实元器件外观：照着现场常见型号画（DZ47 断路器、CJX2 接触器、NR2 热继电器、ST3P 时间继电器、
// MY2N 中间继电器、开关电源、S7-1200、UK 端子、22mm 按钮 / 指示灯、M18 接近开关、4V210 电磁阀、Y2 电机）。
// 颜色是实物的颜色，不跟主题变；只拼 SVG 字符串，不碰 DOM。
(function (G) {
  const PP = G.PP;
  const R = (PP.R = {});
  const L = (id, a, b, c) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/>${c ? `<stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>` : `<stop offset="1" stop-color="${b}"/>`}</linearGradient>`;
  const RG = (id, a, b, c) => `<radialGradient id="${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
  // 每个 SVG 用自己的前缀，避免隐藏页面里的同名渐变被引用
  R.defs = p => `<defs>${L(p + 'gl', '#f6f6f2', '#d5d7d1')}${L(p + 'gd', '#9ca1a5', '#6c7176')}${L(p + 'gk', '#575d63', '#30353a')}${L(p + 'gm', '#f1f3f3', '#b3b7ba')}
${L(p + 'gc', '#7f8488', '#f2f3f3', '#6a6f73')}${L(p + 'gt', '#d6d8d1', '#a6a9a2')}${L(p + 'gb', '#5f8cb9', '#2b5280')}${L(p + 'gr', '#eceeeb', '#a3a8a4')}${L(p + 'gn', '#e2c46c', '#a8862c')}
${RG(p + 'ch', '#ffffff', '#c3c7ca', '#767b7f')}${RG(p + 'sc', '#fdfdf9', '#c0c4be', '#70756f')}${RG(p + 'cr', '#ff9389', '#d72c21', '#8a140f')}${RG(p + 'cg', '#97f2b0', '#20a14a', '#0c5726')}
${RG(p + 'cy', '#fff3a6', '#f2c200', '#a08000')}${RG(p + 'cb', '#9cc9ff', '#2a6bd1', '#113c82')}${RG(p + 'ly', '#fffbe0', '#ffd23f', '#d79b00')}${RG(p + 'lg', '#eafff0', '#3fe070', '#11963d')}${RG(p + 'lr', '#ffe9e6', '#ff5a4e', '#c21a10')}
<pattern id="${p}duct" width="9" height="16" patternUnits="userSpaceOnUse"><rect width="9" height="16" fill="#b9bfba"/><rect x="4" width="1.6" height="16" fill="#8e958f"/></pattern>
<pattern id="${p}ductv" width="16" height="9" patternUnits="userSpaceOnUse"><rect width="16" height="9" fill="#b9bfba"/><rect y="4" width="16" height="1.6" fill="#8e958f"/></pattern></defs>`;

  // ---------- 小零件 ----------
  const T = (x, y, t, st = '', a = 'middle') => `<text x="${x}" y="${y}" text-anchor="${a}" style="${st}">${t}</text>`;
  const rect = (x, y, w, h, fill, o = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${o}/>`;
  const MONO = 'font-family:var(--f-mono);';
  R.T = T;
  // 设备标签牌：白底黑字，现场每个元件旁边都贴
  R.tag = (x, y, t) => { const w = t.length * 6.4 + 8; return rect(x, y, w, 13, '#fbfbf5', 'rx="1.5" stroke="#8d918b" stroke-width=".8"') + T(x + w / 2, y + 9.8, t, MONO + 'font-size:9.5px;font-weight:700;fill:#1f2523'); };
  // 柜门上的铭牌框：黑底白字
  R.legend = (cx, y, t) => { const w = [...t].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 12 : 6.6), 0) + 14; return rect(cx - w / 2, y, w, 17, '#1d2022', 'rx="2"') + T(cx, y + 12.5, t, 'font-size:11.5px;font-weight:700;fill:#f2f3ef'); };
  const recess = (cx, y, p) => rect(cx - 9, y, 18, 13, '#33373a', 'rx="2"');
  const led = (cx, cy, onCol, on, r = 3.6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${on ? onCol : '#4a4f53'}" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>${on ? `<circle cx="${cx}" cy="${cy}" r="${r + 3.5}" fill="${onCol}" opacity=".28"/>` : ''}`;
  R.led = led;

  // ---------- 盘面元件（真实比例做了简化，端子位置以设备库为准） ----------
  // s: { p 前缀, on, st, r, nm, kt:{o,p} }
  R.dev = (v, d, s) => {
    const { x, y, w, h } = v, cx = x + w / 2, p = s.p, on = s.on, st = s.st, u = id => `url(#${p}${id})`;
    const tx = k => x + v.terms.find(z => z[0] === k)[2];
    let g = '';
    switch (v.kind) {
      case 'xt': case 'tb': {
        const xs = v.terms.filter(z => v.kind === 'xt' || z[3] === 't').map(z => x + z[2]), a = Math.min(...xs) - 14, b = Math.max(...xs) + 14;
        g += rect(a - 7, y + 4, 7, h - 8, '#3d4245', 'rx="1"') + rect(b, y + 2, 4, h - 4, '#8e928b') + rect(b + 4, y + 4, 7, h - 8, '#3d4245', 'rx="1"');
        xs.forEach((X, i) => {
          g += rect(X - 14, y + 2, 28, h - 4, u('gt'), 'stroke="#80857e" stroke-width=".8"');
          if (v.kind === 'tb') g += rect(X - 6, y + 13, 12, 6, '#2e3234', 'rx="1"') + rect(X - 6, y + h - 19, 12, 6, '#2e3234', 'rx="1"');
          else g += rect(X - 6, y + h - 19, 12, 6, '#2e3234', 'rx="1"');
          const lb = v.kind === 'tb' ? String(i + 1) : v.terms[i][1];
          g += rect(X - 10, y + (v.kind === 'tb' ? h / 2 - 8 : 8), 20, 15, '#fbfbf5', 'stroke="#9a9e98" stroke-width=".7"') + T(X, y + (v.kind === 'tb' ? h / 2 + 3.5 : 19.5), lb, MONO + 'font-size:10px;font-weight:700;fill:#1f2523');
        });
        if (v.kind === 'xt') g += `<text class="dn" x="${x}" y="${y - 5}">${d === 'XT1B' ? 'XT 220V 进线端子' : 'XT 电源进线端子'}</text>`;
        else g += `<text class="dn" x="${x + w + 8}" y="${y + 24}">↑ 上口：柜内</text><text class="dn" x="${x + w + 8}" y="${y + h - 6}">↓ 下口：现场</text><text class="dl" x="${x + w + 8}" y="${y + 48}" style="font-size:13px">X1 端子排</text>`;
        break;
      }
      case 'fu':
        g += rect(x + 5, y, w - 10, h, u('gl'), 'rx="3" stroke="#9b9e98"') + recess(cx, y + 2) + recess(cx, y + h - 15);
        g += rect(cx - 15, y + 31, 30, 62, '#5b6165', 'rx="4"');
        for (let i = 0; i < 4; i++) g += `<line x1="${cx - 9}" y1="${y + 36 + i * 4}" x2="${cx + 9}" y2="${y + 36 + i * 4}" stroke="#41464a" stroke-width="1.6"/>`;
        g += rect(cx - 6, y + 56, 12, 24, '#e9e2c8', 'rx="2" stroke="#2e3235"') + rect(cx - 3, y + 57, 6, 20, '#f8f4e6', 'rx="1"') + T(cx, y + 90, 'FU', 'font-size:9px;font-weight:700;fill:#f2f3ef');
        break;
      case 'qf': {
        const onP = st.power, hy = onP ? y + 40 : y + 60;
        g += rect(x, y, w, h, u('gl'), 'rx="3" stroke="#a0a39c"');
        [1, 2].forEach(i => (g += `<line x1="${x + i * w / 3}" y1="${y + 3}" x2="${x + i * w / 3}" y2="${y + h - 3}" stroke="#c6c8c2"/>`));
        v.terms.forEach(z => (g += recess(x + z[2], z[3] === 't' ? y + 2 : y + h - 15)));
        g += rect(x + 6, y + 22, w - 12, h - 44, '#e7e8e3', 'rx="3" stroke="#c3c5bf"') + rect(x + 12, y + 38, w - 24, 40, '#92958f', 'rx="3"');
        g += rect(x + 12, hy, w - 24, 16, '#2a2d30', 'rx="3"') + `<line x1="${x + 15}" y1="${hy + 3}" x2="${x + w - 15}" y2="${hy + 3}" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>`;
        g += rect(x + 10, y + h - 32, 13, 8, onP ? '#d63a2f' : '#2fa457', 'rx="1" stroke="#555"') + T(x + 27, y + h - 25, onP ? 'ON' : 'OFF', MONO + 'font-size:8px;font-weight:700;fill:#2a2f2c', 'start') + T(x + w - 10, y + h - 25, 'C16', MONO + 'font-size:10px;font-weight:700;fill:#1f2523', 'end');
        g += R.tag(cx - 7, y + h - 35, 'QF');
        break;
      }
      case 'km': case 'kmx': case 'kmc': {
        const o = !!on[d];
        g += rect(x, y, w, h, u('gd'), 'rx="4" stroke="#55595d"') + rect(x + 3, y + 2, w - 6, 18, '#474c50', 'rx="2"') + rect(x + 3, y + h - 20, w - 6, 18, '#474c50', 'rx="2"');
        g += rect(x + 7, y + 23, w - 14, h - 46, '#b8bcbf', 'rx="4" stroke="#878c90"');
        const win = (wx, wy) => rect(wx, wy, 34, 18, '#1b1e21', 'rx="2"') + rect(wx + 3, o ? wy + 10 : wy + 3, 28, 5, o ? '#ffcf33' : '#ecece6', 'rx="1"') + T(wx + 17, wy + 29, o ? '吸合' : '释放', `font-size:10px;font-weight:700;fill:${o ? '#0b6b2c' : '#2f3431'}`);
        const coil = v.coil === 'DC' ? 'DC24V' : 'AC220V';
        if (v.kind === 'km') {
          g += rect(x + 12, y + 27, 78, 24, '#fbfbf5', 'stroke="#9a9e98" stroke-width=".7"') + T(x + 51, y + 37, 'CJX2-0910', MONO + 'font-size:8.5px;font-weight:700;fill:#1f2523') + T(x + 51, y + 47, `线圈 ${coil}`, 'font-size:8px;fill:#3a3f3c');
          g += R.tag(x + 12, y + 56, v.lab) + win(x + w - 48, y + 34) + T(x + 50, y + 88, '主触点 1/3/5 → 2/4/6', 'font-size:8px;fill:#33383a');
        } else if (v.kind === 'kmx') {
          g += R.tag(x + 10, y + 27, v.lab) + win(x + 9, y + 44);
          g += rect(x + 48, y + 25, w - 56, h - 50, '#dcdfe1', 'rx="3" stroke="#878c90"');
          const ax = x + 48 + (w - 56) / 2;
          g += T(ax, y + 38, `CJX2 ${coil}`, MONO + 'font-size:8px;font-weight:700;fill:#1f2523') + T(ax, y + 51, 'F4-11 辅助触头', 'font-size:8px;fill:#3a3f3c') + T(ax, y + 65, '13-14 常开', 'font-size:8.5px;fill:#1f2523') + T(ax, y + 78, '21-22 常闭', 'font-size:8.5px;fill:#1f2523');
        } else {
          g += R.tag(x + 10, y + 27, v.lab) + win(x + 9, y + 44) + rect(x + 56, y + 27, 66, 24, '#fbfbf5', 'stroke="#9a9e98" stroke-width=".7"') + T(x + 89, y + 37, 'CJX2-0910', MONO + 'font-size:8px;font-weight:700;fill:#1f2523') + T(x + 89, y + 47, `线圈 ${coil}`, 'font-size:8px;fill:#3a3f3c') + T(x + 89, y + 72, '主触点接电机（略）', 'font-size:8px;fill:#33383a');
        }
        break;
      }
      case 'fr': case 'frc': {
        const big = v.kind === 'fr', dx = big ? x + 118 : cx, dy = big ? y + 46 : y + 46, rx = big ? x + 150 : cx, ry = big ? y + 38 : y + 76;
        g += rect(x, y, w, h, u('gd'), 'rx="4" stroke="#55595d"') + rect(x + 3, y + h - 20, w - 6, 18, '#474c50', 'rx="2"');
        if (big) g += rect(x + 3, y + 2, w - 6, 18, '#474c50', 'rx="2"');
        g += rect(x + 6, y + (big ? 22 : 8), w - 12, h - (big ? 44 : 30), '#b8bcbf', 'rx="4" stroke="#878c90"');
        g += `<circle cx="${dx}" cy="${dy}" r="${big ? 13 : 11}" fill="#f6f6f2" stroke="#4b5053" stroke-width="1.2"/>`;
        for (let i = 0; i <= 4; i++) { const a = (-210 + i * 60) * Math.PI / 180, r1 = big ? 9.5 : 8, r2 = big ? 12 : 10; g += `<line x1="${dx + r1 * Math.cos(a)}" y1="${dy + r1 * Math.sin(a)}" x2="${dx + r2 * Math.cos(a)}" y2="${dy + r2 * Math.sin(a)}" stroke="#333" stroke-width=".8"/>`; }
        g += `<line x1="${dx}" y1="${dy}" x2="${dx + 2}" y2="${dy - (big ? 9 : 7.5)}" stroke="#1f2523" stroke-width="2" stroke-linecap="round"/><circle cx="${dx}" cy="${dy}" r="2.4" fill="#1f2523"/>`;
        g += `<circle cx="${rx}" cy="${ry}" r="${big ? 8 : 7}" fill="${u('cb')}" stroke="#123f86"/>` + T(rx, ry + (big ? 17 : 15), 'RESET', MONO + 'font-size:6px;fill:#1f2523');
        if (big) g += `<circle cx="${x + 170}" cy="${y + 38}" r="5.5" fill="${u('cr')}" stroke="#7a120d"/>` + T(x + 170, y + 55, 'STOP', MONO + 'font-size:6px;fill:#1f2523') + R.tag(x + 12, y + 26, 'FR') + T(x + 12, y + 52, 'NR2-25', MONO + 'font-size:8px;font-weight:700;fill:#1f2523', 'start') + T(x + 12, y + 62, '整定 4–6A', 'font-size:8px;fill:#3a3f3c', 'start');
        else g += R.tag(x + 10, y + 12, 'FR') + T(cx, y + 30, 'NR2', MONO + 'font-size:7.5px;fill:#1f2523');
        if (st.trip) g += rect(big ? x + 96 : x + 10, big ? y + 62 : y + 84, big ? 44 : w - 20, 12, '#ff7a1a', 'rx="2"') + T(big ? x + 118 : cx, big ? y + 71.5 : y + 93.5, '过载跳开', 'font-size:8.5px;font-weight:700;fill:#fff');
        break;
      }
      case 'kt': {
        const { o, p: pr } = s.kt, dcx = x + 66, dcy = y + 57;
        g += rect(x, y, w, h, '#2c2f32', 'rx="4"') + rect(x + 26, y + 20, w - 52, h - 38, '#ece9e0', 'rx="5" stroke="#b5b1a5"');
        g += `<circle cx="${dcx}" cy="${dcy}" r="19" fill="#fbfbf7" stroke="#8c8a82"/>`;
        const ang = f => (135 + 270 * f) * Math.PI / 180, pt = (f, r) => [dcx + r * Math.cos(ang(f)), dcy + r * Math.sin(ang(f))];
        for (let i = 0; i <= 10; i++) { const [a1, b1] = pt(i / 10, 14.5), [a2, b2] = pt(i / 10, 17.5); g += `<line x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" stroke="#333" stroke-width="${i % 5 ? .6 : 1.2}"/>`; }
        if (o && pr > 0) { const [sx, sy] = pt(0, 12), [ex, ey] = pt(0.3 * pr, 12); g += `<path d="M${sx} ${sy}A12 12 0 0 1 ${ex} ${ey}" fill="none" stroke="#ff7a1a" stroke-width="3.5"/>`; }
        const [kx, ky] = pt(0.3, 11); g += `<line x1="${dcx}" y1="${dcy}" x2="${kx}" y2="${ky}" stroke="#1f2523" stroke-width="2.4" stroke-linecap="round"/><circle cx="${dcx}" cy="${dcy}" r="4" fill="#3a3e41"/>`;
        g += led(x + 36, y + 29, '#3ad65d', o) + led(x + 96, y + 29, '#ff3b30', o && pr >= 1) + T(x + 36, y + 41, 'PW', MONO + 'font-size:6px;fill:#333') + T(x + 96, y + 41, 'UP', MONO + 'font-size:6px;fill:#333') + T(dcx, y + 31, 'ST3P', MONO + 'font-size:7px;font-weight:700;fill:#1f2523');
        g += T(dcx, y + 88, !o ? '未通电' : pr >= 1 ? '延时到' : '计时中', `font-size:9.5px;font-weight:700;fill:${o ? '#b34a00' : '#333'}`) + R.tag(x + 3, y + 44, 'KT');
        break;
      }
      case 'ka': {
        const o = !!on[d], bx = x + 15, bw = w - 30;
        g += rect(x, y, w, h, '#2c2f32', 'rx="4"') + rect(bx, y + 20, bw, h - 40, '#d4e7ef', 'rx="4" opacity=".75" stroke="#86a7b6"');
        g += rect(bx + bw / 2 - 12, y + 50, 24, 28, '#b87333', 'rx="3"') + `<line x1="${bx + bw / 2 - 12}" y1="${y + 57}" x2="${bx + bw / 2 + 12}" y2="${y + 57}" stroke="#7a4a1e"/><line x1="${bx + bw / 2 - 12}" y1="${y + 70}" x2="${bx + bw / 2 + 12}" y2="${y + 70}" stroke="#7a4a1e"/>`;
        g += `<path d="M${bx + 8} ${y + 44}h${bw - 16}" stroke="#9aa0a4" stroke-width="2"/>` + led(bx + bw - 9, y + 29, '#ff3b30', o, 3) + T(bx + bw / 2, y + 40, 'MY2N DC24V', MONO + 'font-size:7px;font-weight:700;fill:#1f2523') + R.tag(x + 3, y + 84, 'KA');
        break;
      }
      case 'ps':
        g += rect(x, y, w, h, u('gm'), 'rx="3" stroke="#8a8f92"');
        for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) g += rect(x + 9 + j * 14, y + 7 + i * 8, 9, 3.6, '#6a7074', 'rx="1.8"');
        g += rect(x + 8, y + 33, 64, 26, '#fbfbf5', 'stroke="#9a9e98" stroke-width=".7"') + T(x + 40, y + 44, '24V 2.5A', MONO + 'font-size:9px;font-weight:700;fill:#1f2523') + T(x + 40, y + 55, '开关电源', 'font-size:8px;fill:#3a3f3c');
        g += led(x + 92, y + 42, '#3ad65d', st.power) + T(x + 92, y + 55, 'DC OK', MONO + 'font-size:6.5px;fill:#333') + `<circle cx="${x + 92}" cy="${y + 66}" r="4.5" fill="#f2f2ec" stroke="#555"/><line x1="${x + 89}" y1="${y + 66}" x2="${x + 95}" y2="${y + 66}" stroke="#333" stroke-width="1.2"/>`;
        g += rect(x + 3, y + h - 22, w - 6, 20, '#26292c', 'rx="2"') + R.tag(x + 8, y + 62, 'PS');
        break;
      case 'plc': case 'plcr': {
        const pw = on[d + ':pw'], run = on[d + ':run'];
        g += rect(x, y, w, h, u('gk'), 'rx="4" stroke="#1f2327"') + rect(x + 4, y + 2, w - 8, 20, '#6e757b', 'rx="2"') + rect(x + 4, y + h - 22, w - 8, 20, '#6e757b', 'rx="2"');
        [['RUN/STOP', run ? '#3ad65d' : pw ? '#f2c200' : null], ['ERROR', null], ['MAINT', null]].forEach(([t, c], i) => (g += rect(x + 12, y + 29 + i * 10, 10, 5, c || '#4b5156', 'rx="1"') + (c ? rect(x + 9, y + 26 + i * 10, 16, 11, c, 'rx="3" opacity=".25"') : '') + T(x + 26, y + 33.5 + i * 10, t, MONO + 'font-size:6.5px;fill:#d7dcdf', 'start')));
        ['I0.0', 'I0.1', 'I0.2'].forEach((k, i) => { const X = tx(k), o = on[d + ':' + k]; g += rect(X - 5, y + 27, 10, 5, o ? '#3ad65d' : '#4b5156', 'rx="1"') + (o ? rect(X - 8, y + 24, 16, 11, '#3ad65d', 'rx="3" opacity=".3"') : '') + T(X, y + 41, 'a.' + i, MONO + 'font-size:6.5px;fill:#c9cfd3'); });
        ['Q0.0', 'Q0.1'].forEach((k, i) => { const X = tx(k), o = on[d + ':' + k]; g += rect(X - 5, y + h - 32, 10, 5, o ? '#3ad65d' : '#4b5156', 'rx="1"') + (o ? rect(X - 8, y + h - 35, 16, 11, '#3ad65d', 'rx="3" opacity=".3"') : '') + T(X, y + h - 36, 'a.' + i, MONO + 'font-size:6.5px;fill:#c9cfd3'); });
        g += T(x + 128, y + 41, 'DI a', MONO + 'font-size:6.5px;fill:#9aa3a8', 'end') + T(x + 92, y + h - 36, 'DQ a', MONO + 'font-size:6.5px;fill:#9aa3a8', 'end');
        g += T(x + 12, y + 70, 'S7-1200', 'font-size:14px;font-weight:900;fill:#f2f4f2', 'start') + T(x + 12, y + 82, v.kind === 'plcr' ? 'CPU 1214C DC/DC/RLY' : 'CPU 1214C DC/DC/DC', MONO + 'font-size:7.5px;fill:#c9cfd3', 'start') + R.tag(x + 12, y + 87, 'PLC');
        g += rect(x + w - 48, y + h - 52, 28, 20, '#16191b', 'rx="2" stroke="#8a9096"') + rect(x + w - 43, y + h - 48, 18, 10, '#2a2e31') + [0, 1, 2, 3, 4].map(i => rect(x + w - 41 + i * 3.4, y + h - 47, 1.6, 4, '#c9a24a')).join('') + T(x + w - 34, y + h - 55, 'X1 P1', MONO + 'font-size:6px;fill:#9aa3a8');
        break;
      }
      case 'btn': {
        const red = v.color === 'red', pr = !!st.p[d];
        g += rect(x + 10, y + 2, w - 20, 24, '#ecece7', 'rx="2" stroke="#a9aca6"') + rect(x + 10, y + 16, w - 20, 10, red ? '#d23a2f' : '#24924a', 'rx="1"') + T(cx, y + 24, red ? 'NC 常闭' : 'NO 常开', 'font-size:7.5px;font-weight:700;fill:#fff');
        g += `<g class="pbtn${pr ? ' pressed' : ''}" data-btn="${d}"><circle cx="${cx}" cy="${y + 50}" r="23" fill="${u('ch')}" stroke="#6b7074"/><circle class="cap" cx="${cx}" cy="${y + 50}" r="17" fill="${u(red ? 'cr' : 'cg')}" stroke="rgba(0,0,0,.35)"/><ellipse cx="${cx - 5}" cy="${y + 43}" rx="7" ry="4" fill="#fff" opacity="${pr ? .15 : .35}" pointer-events="none"/></g>`;
        g += R.legend(cx, y + h + 3, `${v.lab} ${s.nm}`);
        break;
      }
      case 'estop':
        g += rect(x + 10, y + 2, w - 20, 24, '#ecece7', 'rx="2" stroke="#a9aca6"') + rect(x + 10, y + 16, w - 20, 10, '#d23a2f', 'rx="1"') + T(cx, y + 24, 'NC 常闭', 'font-size:7.5px;font-weight:700;fill:#fff');
        g += `<g class="pbtn" data-estop="1"><circle cx="${cx}" cy="${y + 50}" r="27" fill="${u('cy')}" stroke="#a08000"/><circle cx="${cx}" cy="${y + 50}" r="${st.estop ? 16 : 20}" fill="${u('cr')}" stroke="#7a120d" stroke-width="${st.estop ? 3 : 1}"/><ellipse cx="${cx - 6}" cy="${y + 42}" rx="8" ry="4.5" fill="#fff" opacity=".3" pointer-events="none"/></g>` + T(cx, y + 75, '紧急停止', 'font-size:6.5px;font-weight:700;fill:#1f2523');
        g += R.legend(cx, y + h + 3, `SE 急停${st.estop ? '（已拍下）' : ''}`);
        break;
      case 'estop2':
        g += rect(x + 6, y + 2, w - 12, 24, '#ecece7', 'rx="2" stroke="#a9aca6"') + rect(x + 6, y + 16, w / 2 - 8, 10, '#d23a2f', 'rx="1"') + rect(cx + 2, y + 16, w / 2 - 8, 10, '#d23a2f', 'rx="1"') + T(x + w / 4 + 2, y + 24, 'NC', 'font-size:7.5px;font-weight:700;fill:#fff') + T(x + 3 * w / 4 - 2, y + 24, 'NC', 'font-size:7.5px;font-weight:700;fill:#fff');
        g += `<g class="pbtn" data-estop="1"><circle cx="${cx}" cy="${y + 52}" r="27" fill="${u('cy')}" stroke="#a08000"/><circle cx="${cx}" cy="${y + 52}" r="${st.estop ? 16 : 20}" fill="${u('cr')}" stroke="#7a120d" stroke-width="${st.estop ? 3 : 1}"/><ellipse cx="${cx - 6}" cy="${y + 44}" rx="8" ry="4.5" fill="#fff" opacity=".3" pointer-events="none"/></g>`;
        g += R.legend(cx, y + h + 3, `SE 急停（双通道）${st.estop ? '已拍下' : ''}`);
        break;
      case 'sr': {
        const pw = on[d + ':pw'];
        g += rect(x, y, w, h, '#e8c22e', 'rx="4" stroke="#a88400"') + rect(x + 3, y + 2, w - 6, 18, '#3a3e42', 'rx="2"') + rect(x + 3, y + h - 20, w - 6, 18, '#3a3e42', 'rx="2"');
        g += rect(x + 8, y + 24, w - 16, h - 48, '#f5d35a', 'rx="3" stroke="#c9a21a"');
        [['POWER', pw, '#3ad65d'], ['CH.1', on[d + ':c1'], '#3ad65d'], ['CH.2', on[d + ':c2'], '#3ad65d'], ['OUT', on[d], '#3ad65d']].forEach(([t, o, c], i) => (g += led(x + 22, y + 32 + i * 14, c, o, 3.4) + T(x + 30, y + 35.5 + i * 14, t, MONO + 'font-size:7.5px;font-weight:700;fill:#1f2523', 'start')));
        g += T(x + w - 12, y + 40, '安全继电器', 'font-size:11px;font-weight:900;fill:#1f2523', 'end') + T(x + w - 12, y + 53, '24V DC · 双通道', 'font-size:7.5px;fill:#3a3f3c', 'end') + R.tag(x + w - 34, y + 62, v.lab) + T(x + w - 12, y + 88, '手动复位', 'font-size:7.5px;fill:#3a3f3c', 'end');
        break;
      }
      case 'drv': {
        const run = on[d + ':run'];
        g += rect(x, y, w, h, '#26292c', 'rx="3" stroke="#111"');
        for (let i = 0; i < 9; i++) g += `<line x1="${x + 6}" y1="${y + 26 + i * 7}" x2="${x + 46}" y2="${y + 26 + i * 7}" stroke="#3b4044" stroke-width="3"/>`;
        g += rect(x + 3, y + 2, w - 6, 20, '#2f8f46', 'rx="2"') + rect(x + 3, y + h - 22, w - 6, 20, '#2f8f46', 'rx="2"');
        g += rect(x + 54, y + 26, w - 62, 44, '#e9eef2', 'rx="2" stroke="#8a9096"') + T(x + 60, y + 40, '两相步进驱动器', 'font-size:10px;font-weight:900;fill:#1f2523', 'start') + T(x + 60, y + 52, '24–48V DC · 脉冲 / 方向', 'font-size:7.5px;fill:#3a3f3c', 'start') + T(x + 60, y + 63, 'PUL 脉冲  DIR 方向  A/B 接电机', 'font-size:7px;fill:#3a3f3c', 'start');
        g += led(x + 62, y + 79, '#3ad65d', on[d + ':pw'], 3.2) + T(x + 69, y + 82, 'PWR', MONO + 'font-size:6.5px;fill:#cfd5d8', 'start') + led(x + 96, y + 79, '#ff3b30', run === 'shake', 3.2) + T(x + 103, y + 82, 'ALM', MONO + 'font-size:6.5px;fill:#cfd5d8', 'start');
        g += rect(x + 128, y + 73, 64, 12, '#1d5fbf', 'rx="1"') + Array.from({ length: 8 }, (_, i) => rect(x + 131 + i * 7.6, y + 75 + (i % 3 ? 0 : 4), 4.6, 4, '#f2f2ec')).join('') + R.tag(x + 8, y + 26, v.lab);
        break;
      }
      case 'stp': {
        const run = s.on[(s.drv || 'DRV') + ':run'], cy = y + 52;
        [['#d32f2f', 30], ['#1f62c4', 80], ['#2b8a3e', 130], ['#1d1f22', 180]].forEach(([c, dx], i) => (g += `<path d="M${x + dx} ${y + 8}C${x + dx} ${y + 26} ${x + 104} ${cy - 10 + i * 6} ${x + 112} ${cy - 10 + i * 6}" stroke="${c}" stroke-width="2.6" fill="none"/>`));
        g += `<g class="${run === 'shake' ? 'shake' : ''}">` + rect(x + 112, cy - 22, 8, 44, '#b9bdc0', 'rx="2"') + rect(x + 120, cy - 24, 56, 48, '#1f2224', 'rx="3"') + rect(x + 176, cy - 22, 8, 44, '#b9bdc0', 'rx="2"') + rect(x + 184, cy - 4, 22, 8, '#d9dcde', 'stroke="#80868a"');
        g += `<g class="fan ${run === 'fwd' ? 'fwd' : run === 'rev' ? 'rev' : ''}"><circle cx="${x + 212}" cy="${cy}" r="8" fill="#e3e6e8" stroke="#80868a"/><line x1="${x + 205}" y1="${cy}" x2="${x + 219}" y2="${cy}" stroke="#555" stroke-width="2.5"/></g></g>`;
        g += T(x + 148, cy + 4, '42', MONO + 'font-size:10px;font-weight:700;fill:#9aa0a4');
        g += `<text class="dl" x="${x}" y="${y + h + 16}" style="font-size:13px">M1 两相步进电机${run === 'fwd' ? '（正转）' : run === 'rev' ? '（反转）' : run === 'shake' ? '（抖动不转！）' : ''}</text>`;
        break;
      }
      case 'svd': {
        const cpw = on[d + ':cpw'], alm = on[d + ':alm'], txt = !cpw ? '' : alm ? 'AL.E1' : on[d] ? 'run' : on[d + ':rdy'] ? 'rdY' : 'nrdy';
        g += rect(x, y, w, h, '#1f2224', 'rx="4" stroke="#0e0f10"') + rect(x + 3, y + 2, w - 6, 20, '#3a3e42', 'rx="2"') + rect(x + 3, y + h - 22, w - 6, 20, '#3a3e42', 'rx="2"');
        g += rect(x + 12, y + 28, 78, 24, '#1a0606', 'rx="2" stroke="#444"') + T(x + 84, y + 46, txt, `${MONO}font-size:15px;font-weight:700;fill:${alm ? '#ff3b30' : '#ff5a3c'}`, 'end');
        ['MODE', 'SET', '▲', '▼'].forEach((t, i) => (g += rect(x + 12 + i * 20, y + 58, 16, 10, '#55595d', 'rx="2"') + T(x + 20 + i * 20, y + 75, t, MONO + 'font-size:5.5px;fill:#9aa3a8')));
        g += T(x + 100, y + 38, '伺服驱动器', 'font-size:10px;font-weight:900;fill:#f2f4f2', 'start') + T(x + 100, y + 50, 'AC220V · 400W', 'font-size:7.5px;fill:#c9cfd3', 'start') + T(x + 100, y + 62, 'CN1 控制 · CN2 编码器', 'font-size:7px;fill:#9aa3a8', 'start');
        g += led(x + 190, y + 32, '#3ad65d', cpw, 3) + T(x + 182, y + 35, 'POW', MONO + 'font-size:6px;fill:#cfd5d8', 'end') + R.tag(x + 150, y + 68, v.lab);
        break;
      }
      case 'svm': {
        const run = on['SVD'], cy = y + 50;
        [['#d32f2f', 30], ['#f2f2ec', 70], ['#1d1f22', 110], ['#2b8a3e', 150]].forEach(([c, dx], i) => (g += `<path d="M${x + dx} ${y + 8}C${x + dx} ${y + 26} ${x + 138} ${cy - 9 + i * 6} ${x + 150} ${cy - 9 + i * 6}" stroke="${c}" stroke-width="2.6" fill="none"/>`));
        g += `<path d="M${x + 150} ${y + 26}h6" stroke="#2b8a3e" stroke-width="0"/>`;
        g += rect(x + 150, cy - 20, 12, 40, '#c9ccce', 'rx="2" stroke="#8a8f92"') + rect(x + 162, cy - 18, 50, 36, '#1c1e20', 'rx="4"') + rect(x + 212, cy - 12, 10, 24, '#2c2f32', 'rx="2"') + rect(x + 138, cy - 3, 12, 6, '#d9dcde', 'stroke="#80868a"');
        g += `<path d="M${x + 222} ${cy}C${x + 236} ${cy} ${x + 236} ${y + 6} ${x + 250} ${y + 6}" stroke="#6b7074" stroke-width="5" fill="none"/>` + T(x + 250, y + 22, '编码器线', 'font-size:7.5px;fill:var(--muted)', 'start') + T(x + 250, y + 32, '已插 CN2', 'font-size:7.5px;fill:var(--muted)', 'start');
        g += `<g class="fan ${run ? 'fwd' : ''}"><circle cx="${x + 132}" cy="${cy}" r="7" fill="#e3e6e8" stroke="#80868a"/><line x1="${x + 126}" y1="${cy}" x2="${x + 138}" y2="${cy}" stroke="#555" stroke-width="2.5"/></g>`;
        g += `<text class="dl" x="${x}" y="${y + h + 16}" style="font-size:13px">M2 伺服电机${on['SVD:alm'] ? '（报警停机！）' : run ? '（运转）' : ''}</text>`;
        break;
      }
      case 'lc': {
        const clear = on[d], cy = y + 46, ex = x + 210, rx = x + 268;
        g += `<path d="M${x + 30} ${y + 8}C${x + 30} ${y + 26} ${rx - 6} ${y + 20} ${rx + 6} ${y + 12}M${x + 78} ${y + 8}C${x + 78} ${y + 26} ${rx - 2} ${y + 22} ${rx + 6} ${y + 14}" stroke="#8b9196" stroke-width="2" fill="none"/>`;
        [['#7a4a24', 30], ['#1f62c4', 78], ['#1d1f22', 126], ['#f2f2ec', 174]].forEach(([c, dx]) => (g += `<line x1="${x + dx}" y1="${y + 8}" x2="${x + dx}" y2="${y + 18}" stroke="${c}" stroke-width="2.6"/>`));
        g += `<path d="M${x + 126} ${y + 18}C${x + 126} ${y + 30} ${rx} ${y + 26} ${rx + 6} ${y + 16}M${x + 174} ${y + 18}C${x + 174} ${y + 28} ${rx} ${y + 24} ${rx + 6} ${y + 16}" stroke="#8b9196" stroke-width="2" fill="none"/>`;
        g += rect(ex - 6, y + 14, 12, 62, u('gc'), 'rx="2"') + rect(ex - 2, y + 18, 4, 54, '#1d1f22') + rect(rx, y + 14, 12, 62, u('gc'), 'rx="2"') + rect(rx + 4, y + 18, 4, 54, '#1d1f22');
        if (s.r.power && on[d + ':pw']) for (let i = 0; i < 6; i++) { const yy = y + 22 + i * 9; g += st.target && i > 1 && i < 5 ? `<line x1="${ex + 6}" y1="${yy}" x2="${ex + 26}" y2="${yy}" stroke="#ff3b30" stroke-width="1.4" stroke-dasharray="3 3"/>` : `<line x1="${ex + 6}" y1="${yy}" x2="${rx}" y2="${yy}" stroke="#ff3b30" stroke-width="1.4" stroke-dasharray="3 3" opacity=".75"/>`; }
        g += st.target ? `<rect class="work" data-target="1" x="${ex + 18}" y="${cy - 16}" width="30" height="34" rx="8" fill="#e8b48a" stroke="#a4703f"/>${T(ex + 33, cy + 5, '手', 'font-size:10px;fill:#5a3a1a')}` : `<rect class="workghost" data-target="1" x="${ex + 16}" y="${cy - 18}" width="36" height="38" rx="4"/><text class="dn" x="${ex + 34}" y="${cy + 4}" text-anchor="middle">伸手</text>`;
        g += led(rx + 6, y + 10, clear ? '#3ad65d' : '#ff3b30', on[d + ':pw'], 3);
        g += `<text class="dl" x="${x}" y="${y + h + 16}" style="font-size:13px">F1 安全光栅（发射 / 接收）${st.target && on[d + ':pw'] ? '：被挡住' : ''}</text>`;
        break;
      }
      case 'vi': {
        g += `<path d="M${x + 30} ${y + 8}V${y + 26}M${x + 70} ${y + 8}V${y + 26}M${x + 110} ${y + 8}V${y + 26}" stroke="#55595d" stroke-width="2"/>` + `<circle cx="${x + 70}" cy="${y + 40}" r="20" fill="#2c2f32" stroke="#111"/>` + [0, 1, 2, 3, 4].map(i => `<circle cx="${x + 62 + (i % 3) * 8}" cy="${y + 36 + Math.floor(i / 3) * 8}" r="1.8" fill="#c9a24a"/>`).join('');
        g += `<path d="M${x + 90} ${y + 40}C${x + 110} ${y + 40} ${x + 110} ${y + 58} ${x + 126} ${y + 58}" stroke="#6b7074" stroke-width="6" fill="none"/>`;
        g += rect(x + 124, y + 50, 120, 20, u('gm'), 'rx="2" stroke="#8a8f92"');
        for (let i = 0; i < 4; i++) { const sx = x + 128 + i * 29, o = i < 2 && on[d + ':' + (i + 1)]; g += rect(sx, y + 16, 25, 34, '#1f62c4', 'rx="2" stroke="#123f86"') + rect(sx + 3, y + 20, 19, 10, '#2c2f32', 'rx="1"') + led(sx + 12.5, y + 25, '#ffd23f', o, 2.4) + T(sx + 12.5, y + 44, i < 2 ? String(i + 1) : '备', 'font-size:8px;font-weight:700;fill:#fff'); }
        g += `<text class="dl" x="${x}" y="${y + h + 16}" style="font-size:13px">Y1 阀岛（4 位，PNP · COM 接 0V）</text>`;
        break;
      }
      case 'aim': {
        const pw = on[d + ':pw'], ma = on[d + ':ma'] || 0;
        g += rect(x, y, w, h, u('gk'), 'rx="4" stroke="#1f2327"') + rect(x + 4, y + 2, w - 8, 20, '#6e757b', 'rx="2"') + rect(x + 4, y + h - 22, w - 8, 20, '#6e757b', 'rx="2"');
        g += T(x + 10, y + 38, 'SM 1231', 'font-size:11px;font-weight:900;fill:#f2f4f2', 'start') + T(x + 10, y + 49, 'AI 4–20mA', MONO + 'font-size:7.5px;fill:#c9cfd3', 'start') + led(x + w - 16, y + 32, '#3ad65d', pw, 3) + T(x + w - 24, y + 35, 'DIAG', MONO + 'font-size:6px;fill:#cfd5d8', 'end');
        g += rect(x + 10, y + 56, w - 20, 26, '#c9d3b8', 'rx="2"') + T(x + w - 16, y + 75, pw ? (ma ? ma.toFixed(1) + ' mA' : '0.0 mA') : '', MONO + 'font-size:14px;font-weight:700;fill:#1e2a16', 'end') + T(x + 14, y + 66, '读数', 'font-size:7px;fill:#1e2a16', 'start') + R.tag(x + 10, y + h - 36, v.lab);
        break;
      }
      case 'pt': {
        const cy = y + 46;
        g += `<path d="M${x + 30} ${y + 8}C${x + 30} ${y + 24} ${x + 52} ${y + 22} ${x + 58} ${cy - 6}M${x + 80} ${y + 8}C${x + 80} ${y + 24} ${x + 66} ${y + 22} ${x + 62} ${cy - 6}" stroke="#7f868b" stroke-width="3" fill="none"/>`;
        g += rect(x + 46, cy - 8, 28, 20, '#1d2022', 'rx="2"') + rect(x + 74, cy - 11, 58, 26, u('gc'), 'rx="4"') + rect(x + 132, cy - 13, 14, 30, '#a3a8ab', 'stroke="#6b7074"') + rect(x + 146, cy - 5, 18, 14, u('gc'));
        for (let k = 0; k < 4; k++) g += `<line x1="${x + 149 + k * 4}" y1="${cy - 5}" x2="${x + 149 + k * 4}" y2="${cy + 9}" stroke="rgba(0,0,0,.3)"/>`;
        g += T(x + 103, cy + 5, '0–1.6MPa', MONO + 'font-size:6.5px;fill:#1f2523') + (st.target ? `<path d="M${x + 186} ${cy + 2}h-16m5-5l-5 5 5 5" stroke="#1f62c4" stroke-width="2.5" fill="none"/>${T(x + 190, cy + 6, '加压', 'font-size:9px;fill:#1f62c4;font-weight:700', 'start')}` : '');
        g += `<text class="dl" x="${x}" y="${y + h + 16}" style="font-size:13px">B3 压力变送器（两线制 4–20mA）</text>`;
        break;
      }
      case 'lamp': {
        const lit = on[d], burn = on[d + ':burn'], c = { yellow: 'ly', green: 'lg', red: 'lr' }[v.color], dim = { yellow: '#8b7a2c', green: '#2c6a3f', red: '#7c3029' }[v.color], glow = { yellow: '#ffd23f', green: '#3fe070', red: '#ff5a4e' }[v.color];
        g += rect(x + 14, y + 2, w - 28, 20, '#ecece7', 'rx="2" stroke="#a9aca6"') + T(cx, y + 13, v.ac ? 'AC220V' : 'DC24V', MONO + 'font-size:7px;font-weight:700;fill:#1f2523');
        if (lit) g += `<circle cx="${cx}" cy="${y + 50}" r="30" fill="${glow}" opacity=".3"/>`;
        g += `<circle cx="${cx}" cy="${y + 50}" r="22" fill="${u('ch')}" stroke="#6b7074"/><circle cx="${cx}" cy="${y + 50}" r="16" fill="${burn ? '#2f3133' : lit ? u(c) : dim}" stroke="rgba(0,0,0,.4)"/>`;
        g += burn ? `<path d="M${cx - 8} ${y + 44}l6 5-3 4 7 4" stroke="#999" fill="none"/>` : `<ellipse cx="${cx - 5}" cy="${y + 44}" rx="6" ry="3.5" fill="#fff" opacity="${lit ? .55 : .2}"/>`;
        g += R.legend(cx, y + h + 3, `${v.lab} ${s.nm}${burn ? '（烧了！）' : ''}`);
        break;
      }
      case 'motor': {
        const mo = s.r.motor;
        g += rect(x + 14, y, 96, 20, '#4b77a3', 'rx="2" stroke="#2a4b70"') + rect(x + 8, y + 22, 96, 46, u('gb'), 'rx="7" stroke="#24476e"');
        for (let i = 0; i < 6; i++) g += `<line x1="${x + 18}" y1="${y + 28 + i * 7}" x2="${x + 98}" y2="${y + 28 + i * 7}" stroke="rgba(0,0,0,.28)" stroke-width="1.6"/>`;
        g += rect(x + 2, y + 26, 10, 38, '#3f6894', 'rx="3"') + rect(x - 8, y + 41, 12, 8, '#c7cbcd', 'rx="1" stroke="#80868a"') + rect(x + 103, y + 25, 18, 40, '#2f5680', 'rx="5"');
        for (let i = 0; i < 4; i++) g += `<line x1="${x + 107 + i * 3.5}" y1="${y + 29}" x2="${x + 107 + i * 3.5}" y2="${y + 61}" stroke="#1d3a5c" stroke-width="1.2"/>`;
        g += rect(x + 20, y + 68, 18, 8, '#294a70', 'rx="1"') + rect(x + 74, y + 68, 18, 8, '#294a70', 'rx="1"') + rect(x + 42, y + 36, 32, 15, '#e9ece8', 'rx="1"') + T(x + 58, y + 46, 'Y2 2.2kW', MONO + 'font-size:6px;fill:#1f2523');
        g += `<g class="fan ${mo === 'fwd' ? 'fwd' : mo === 'rev' ? 'rev' : ''}"><circle cx="${x - 2}" cy="${y + 45}" r="8" fill="none" stroke="#c7cbcd" stroke-width="1.5"/><line x1="${x - 9}" y1="${y + 45}" x2="${x + 5}" y2="${y + 45}" stroke="#e3e6e8" stroke-width="2.5"/></g>`;
        g += `<text class="dl" x="${x + w}" y="${y + h + 16}" text-anchor="end" style="font-size:13px">M 电动机${mo === 'fwd' ? '（正转）' : mo === 'rev' ? '（反转）' : mo === 'loss' ? '（缺相！）' : ''}</text>`;
        break;
      }
      case 'sensor': case 'sensor2': {
        const cy = y + 52, cores = v.kind === 'sensor' ? [[40, '#7a4a24'], [110, '#1d1f22'], [180, '#1f62c4']] : [[40, '#7a4a24'], [180, '#1f62c4']], jx = x + 110, jy = y + 30;
        cores.forEach(([dx, c]) => (g += `<path d="M${x + dx} ${y + 8}C${x + dx} ${y + 22} ${jx} ${jy - 8} ${jx} ${jy}" stroke="${c}" stroke-width="2.6" fill="none"/>`));
        g += `<path d="M${jx} ${jy}C${jx} ${cy} ${x + 60} ${cy} ${x + 72} ${cy}" stroke="#7f868b" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M${jx} ${jy}C${jx} ${cy} ${x + 60} ${cy} ${x + 72} ${cy}" stroke="#a7aeb3" stroke-width="2.5" fill="none"/>`;
        g += rect(x + 72, cy - 9, 18, 18, '#3a3e42', 'rx="2"') + led(x + 81, cy, '#ff9d1a', on[d] && (v.kind === 'sensor' || s.r.power), 3);
        g += rect(x + 90, cy - 11, 74, 22, u('gc'));
        for (let k = 0; k < 17; k++) g += `<line x1="${x + 93 + k * 4}" y1="${cy - 11}" x2="${x + 93 + k * 4}" y2="${cy + 11}" stroke="rgba(0,0,0,.22)" stroke-width=".8"/>`;
        g += rect(x + 100, cy - 14, 8, 28, '#a3a8ab', 'rx="1" stroke="#6b7074"') + rect(x + 146, cy - 14, 8, 28, '#a3a8ab', 'rx="1" stroke="#6b7074"') + rect(x + 164, cy - 10, 9, 20, '#e8752a', 'rx="2"');
        g += st.target ? `<rect class="work" data-target="1" x="${x + 186}" y="${cy - 20}" width="40" height="40" rx="3" fill="${u('gm')}" stroke="#80868a"/>${T(x + 206, cy + 4, '工件', 'font-size:10px;fill:#1f2523')}` : `<rect class="workghost" data-target="1" x="${x + 186}" y="${cy - 20}" width="40" height="40" rx="3"/><text class="dn" x="${x + 206}" y="${cy + 4}" text-anchor="middle">放工件</text>`;
        g += `<text class="dl" x="${x}" y="${y + h + 16}" style="font-size:13px">S1 ${v.kind === 'sensor' ? v.type + ' 三线' : '两线制'}接近开关 M18${on[d + ':rev'] ? '（电源接反！）' : ''}</text>`;
        break;
      }
      case 'valve': {
        const o = !!on[d];
        g += rect(x + 14, y + 3, 72, 19, '#2c2f32', 'rx="3"') + led(x + 50, y + 12, '#ff3b30', o, 2.8) + rect(x + 20, y + 22, 44, 22, '#1d2022', 'rx="2"') + T(x + 42, y + 36, 'DC24V', MONO + 'font-size:7px;fill:#d7dcdf');
        g += rect(x + 8, y + 44, 70, 24, u('gm'), 'rx="2" stroke="#8a8f92"') + T(x + 43, y + 60, '4V210', MONO + 'font-size:7px;font-weight:700;fill:#1f2523');
        g += `<path d="M${x + 78} ${y + 50}C${x + 88} ${y + 50} ${x + 90} ${y + 40} ${x + 100} ${y + 40}" stroke="#3d8fd9" stroke-width="3" fill="none"/><path d="M${x + 78} ${y + 62}C${x + 110} ${y + 62} ${x + 130} ${y + 40} ${x + 140} ${y + 40}" stroke="#3d8fd9" stroke-width="3" fill="none"/>`;
        g += rect(x + 94, y + 40, 54, 24, u('gc'), 'rx="2"') + rect(x + 92, y + 38, 6, 28, '#6c7176', 'rx="1"') + rect(x + 146, y + 38, 6, 28, '#6c7176', 'rx="1"') + rect(x + 152, y + 48, o ? 22 : 4, 8, '#e3e5e6', 'stroke="#8f9497"');
        g += `<text class="dl" x="${x}" y="${y + h + 16}" style="font-size:13px">${v.plain ? 'YV 电磁阀（无二极管）' : 'YV 电磁阀 + 气缸'}${on[d + ':rev'] ? '（接反！）' : o ? '（伸出）' : ''}</text>`;
        break;
      }
      case 'reed': {
        const o = on[d] && s.r.power;
        g += rect(x + 8, y + 40, w - 16, 24, u('gc'), 'rx="3"') + `<line x1="${x + 12}" y1="${y + 45}" x2="${x + w - 12}" y2="${y + 45}" stroke="#555b5f" stroke-width="2"/>`;
        g += `<path d="M${x + 30} ${y + 8}C${x + 30} ${y + 20} ${x + 55} ${y + 18} ${x + 55} ${y + 26}M${x + 80} ${y + 8}C${x + 80} ${y + 20} ${x + 55} ${y + 18} ${x + 55} ${y + 26}" stroke-width="2.4" fill="none" stroke="#7a4a24"/><path d="M${x + 80} ${y + 8}C${x + 80} ${y + 20} ${x + 55} ${y + 18} ${x + 55} ${y + 26}" stroke-width="2.4" fill="none" stroke="#1f62c4"/>`;
        g += `<path d="M${x + 55} ${y + 26}V${y + 42}" stroke="#7f868b" stroke-width="5" stroke-linecap="round"/>` + rect(x + 30, y + 41, 34, 8, '#2b2e31', 'rx="2"') + led(x + 36, y + 45, '#ff3b30', o, 2.4);
        g += `<text class="dl" x="${x + w}" y="${y + h + 16}" text-anchor="end" style="font-size:13px">B1 磁性开关</text>`;
        break;
      }
      case 'diode': {
        const cy = y + 50;
        g += `<path d="M${x + 30} ${y + 6}V${cy}H${x + 44}M${x + 80} ${y + 6}V${cy}H${x + 66}" stroke="#a3a8ab" stroke-width="2" fill="none"/>` + rect(x + 44, cy - 6, 22, 12, '#1d1f21', 'rx="2"') + rect(x + 46, cy - 6, 4, 12, '#d0d4d6') + T(x + 55, cy + 18, '1N4007', MONO + 'font-size:7px;fill:var(--muted)');
        g += `<text class="dl" x="${x + w}" y="${y + h + 16}" text-anchor="end" style="font-size:13px">D1 续流二极管</text>`;
        break;
      }
    }
    return g;
  };
  R.darkBody = k => ['km', 'kmx', 'kmc', 'fr', 'frc', 'plc', 'plcr', 'kt', 'ka', 'ps', 'sr', 'drv', 'svd', 'aim'].includes(k);
  // 端子号写在哪、什么颜色：深色元件写在端子条里（浅色字），白色元件写在本体上，现场元件写在底色上
  R.tl = k => (R.darkBody(k) ? ['lt', 17, 8] : ['qf', 'fu'].includes(k) ? ['dk', 26, 19] : ['btn', 'estop', 'estop2', 'lamp'].includes(k) ? ['dk', 13, 0] : ['motor', 'valve'].includes(k) ? ['lt', 15, 0] : ['', 21, 11]);
  R.tlabs = v => { if (['xt', 'tb'].includes(v.kind)) return ''; const L = R.tl(v.kind); return v.terms.map(z => `<text class="tlab ${L[0]}" x="${v.x + z[2]}" y="${z[3] === 't' ? v.y + L[1] : v.y + v.h - L[2]}">${z[1]}</text>`).join(''); };
  // 单独画一个元件（课程、识图页用）：带端子螺丝和端子号，st 可以传通电状态
  // o.v 可以临时改几个属性（比如线圈电压、标签），不动设备库
  R.part = (d, p, o = {}) => {
    const v = o.v ? { ...PP.DEV[d], ...o.v } : PP.DEV[d], pad = 16, lab = ['btn', 'estop', 'estop2', 'lamp', 'motor', 'sensor', 'sensor2', 'valve', 'reed', 'diode', 'stp', 'svm', 'lc', 'vi', 'pt'].includes(v.kind) ? 26 : 0;
    const st = { ...PP.ST0(), ...(o.st || {}) }, on = o.on || {};
    let g = R.dev(v, d, { p, on, st, r: { power: !!st.power, motor: o.motor || 'stop' }, nm: o.nm || v.name || '', kt: { o: false, p: 0 } }) + R.tlabs(v);
    v.terms.forEach(z => { const x = v.x + z[2], y = z[3] === 't' ? v.y : v.y + v.h; g += `<circle cx="${x}" cy="${y}" r="7" fill="url(#${p}sc)" stroke="#5f645f" stroke-width="1.2"/><path d="M${x - 4} ${y}h8M${x} ${y - 4}v8" stroke="#5f645f" stroke-width="1.4"/>`; });
    const x0 = v.x - pad - (v.kind === 'motor' ? 10 : 0), w = v.w + pad * 2 + (v.kind === 'motor' ? 10 : 0) + (v.kind === 'tb' ? 90 : 0);
    return `<svg class="pn part" viewBox="${x0} ${v.y - pad} ${w} ${v.h + pad * 2 + lab}" role="img" aria-label="${v.lab}">${R.defs(p)}<g transform="">${g}</g></svg>`;
  };

  // ---------- 柜体布置图里的小元件（正视缩略图） ----------
  R.mini = (k, x, y, w, h, p, lab) => {
    const u = id => `url(#${p}${id})`, cx = x + w / 2, dots = (yy, n, c = '#d9dcd6') => Array.from({ length: n }, (_, i) => `<circle cx="${x + (i + .5) * w / n}" cy="${yy}" r="1.8" fill="${c}"/>`).join('');
    const lb = (t, col = '#1f2523', yy = y + h - 9) => T(cx, yy, t, `font-size:${w < 30 ? 8 : 10}px;font-weight:700;fill:${col}`);
    const t = k.replace(/\d+$/, '').toLowerCase();
    if (h < 24 && t !== 'nbar') return rect(x, y, w, h, u('gd'), 'rx="2" stroke="#55595d"') + `<circle cx="${x + w - 7}" cy="${y + h / 2}" r="3.5" fill="${u('cb')}"/>` + T(cx - 4, y + h / 2 + 3.5, lab, 'font-size:9px;font-weight:700;fill:#f2f3ef');
    if (t === 'tc') return rect(x, y, w, h, '#5d6265', 'rx="2"') + rect(x + 6, y + 10, w / 2 - 9, h - 20, '#b87333', 'rx="3"') + rect(x + w / 2 + 3, y + 10, w / 2 - 9, h - 20, '#b87333', 'rx="3"') + T(cx, y + h / 2 + 4, lab, 'font-size:9px;font-weight:700;fill:#fff');
    if (t === 'qf') { const n = w < 30 ? 1 : 3; return rect(x, y, w, h, u('gl'), 'rx="2" stroke="#9fa29b"') + dots(y + 5, n, '#55595c') + dots(y + h - 5, n, '#55595c') + rect(x + 3, y + h * .32, w - 6, h * .2, '#2a2d30', 'rx="1.5"') + rect(x + 3, y + h * .58, Math.min(8, w / 3), 4, '#d63a2f') + lb(lab); }
    if (t === 'km') return rect(x, y, w, h, u('gd'), 'rx="2" stroke="#55595d"') + rect(x + 1.5, y + 1.5, w - 3, 8, '#474c50') + rect(x + 1.5, y + h - 9.5, w - 3, 8, '#474c50') + dots(y + 5.5, 3) + dots(y + h - 5.5, 3) + rect(x + 4, y + 12, w - 8, h - 24, '#b8bcbf', 'rx="2"') + rect(cx - 7, y + 16, 14, 7, '#1b1e21') + lb(lab, '#1f2523', y + h - 14);
    if (t === 'fr') return rect(x, y, w, h, u('gd'), 'rx="2" stroke="#55595d"') + rect(x + 1.5, y + h - 9.5, w - 3, 8, '#474c50') + dots(y + h - 5.5, 3) + rect(x + 4, y + 4, w - 8, h - 16, '#b8bcbf', 'rx="2"') + `<circle cx="${cx - 7}" cy="${y + 17}" r="6" fill="#f6f6f2" stroke="#4b5053"/><circle cx="${cx + 9}" cy="${y + 17}" r="4" fill="${u('cb')}"/>` + lb(lab, '#1f2523', y + h - 15);
    if (t === 'ps') { let s = rect(x, y, w, h, u('gm'), 'rx="2" stroke="#8a8f92"'); for (let i = 0; i < 2; i++) for (let j = 0; j < Math.floor((w - 8) / 9); j++) s += rect(x + 5 + j * 9, y + 6 + i * 6, 6, 2.6, '#6a7074', 'rx="1.3"'); return s + `<circle cx="${x + w - 8}" cy="${y + 24}" r="2.6" fill="#3ad65d"/>` + rect(x + 2, y + h - 11, w - 4, 9, '#26292c') + dots(y + h - 6.5, 4) + lb(lab, '#1f2523', y + h - 16); }
    if (t === 'plc') { let s = rect(x, y, w, h, u('gk'), 'rx="2" stroke="#1f2327"') + rect(x + 2, y + 2, w - 4, 9, '#6e757b') + rect(x + 2, y + h - 11, w - 4, 9, '#6e757b'); for (let i = 0; i < 8; i++) s += rect(x + 30 + i * 6.5, y + 14, 4, 2.6, i % 3 ? '#4b5156' : '#3ad65d'); return s + rect(x + 6, y + 14, 5, 3, '#3ad65d') + T(x + 6, y + 30, 'S7-1200', 'font-size:8px;font-weight:900;fill:#f2f4f2', 'start') + T(x + w - 6, y + h - 15, lab, 'font-size:10px;font-weight:700;fill:#d7dcdf', 'end'); }
    if (t === 'x' || t === 'tb') { const sw = /2/.test(k) ? 9 : 7, n = Math.max(2, Math.floor((w - 10) / sw)); let s = rect(x, y + 4, 4, h - 8, '#3d4245') + rect(x + w - 4, y + 4, 4, h - 8, '#3d4245'); for (let i = 0; i < n; i++) s += rect(x + 5 + i * sw, y + 2, sw - .6, h - 4, u('gt'), 'stroke="#80857e" stroke-width=".5"'); return s + rect(x + 5, y + h / 2 - 7, n * sw - .6, 14, '#fbfbf5', 'stroke="#9a9e98" stroke-width=".6"') + T(cx, y + h / 2 + 4, lab, 'font-size:10px;font-weight:700;fill:#1f2523'); }
    if (t === 'pe') { let s = rect(x, y + h / 2 - 9, 7, 18, '#2b8a3e') + rect(x + w - 7, y + h / 2 - 9, 7, 18, '#2b8a3e') + rect(x + 6, y + h / 2 - 5, w - 12, 10, u('gn'), 'stroke="#8a6a1c"'); for (let i = 0; i < Math.floor((w - 14) / 8); i++) s += `<circle cx="${x + 11 + i * 8}" cy="${y + h / 2}" r="2.2" fill="#d9dcd6" stroke="#666"/>`; return s + T(cx, y + h / 2 + 20, lab, 'font-size:9px;font-weight:700;fill:#1f2523'); }
    if (t === 'ka') return rect(x, y, w, h, '#2c2f32', 'rx="2"') + rect(x + 3, y + 8, w - 6, h - 16, '#d4e7ef', 'rx="2" opacity=".8"') + rect(cx - 4, y + h / 2 - 5, 8, 12, '#b87333') + `<circle cx="${x + w - 6}" cy="${y + 12}" r="1.8" fill="#ff3b30"/>` + lb(lab, '#1f2523', y + h - 10);
    if (t === 'vfd') return rect(x, y, w, h, u('gk'), 'rx="2"') + rect(x + 6, y + 8, w - 12, 14, '#9fd27a') + T(cx, y + 19, '50.0', MONO + 'font-size:8px;fill:#1f3b10') + `<circle cx="${cx}" cy="${y + 34}" r="5" fill="#6e757b"/>` + lb(lab, '#d7dcdf');
    if (t === 'kt') return rect(x, y, w, h, u('gt'), 'rx="2" stroke="#8d918b"') + `<circle cx="${cx}" cy="${y + h * .42}" r="${Math.min(w, h) * .26}" fill="#f6f6f2" stroke="#4b5053"/><line x1="${cx}" y1="${y + h * .42}" x2="${cx + Math.min(w, h) * .18}" y2="${y + h * .42 - Math.min(w, h) * .12}" stroke="#d63a2f" stroke-width="1.6"/>` + lb(lab, '#1f2523', y + h - 6);
    if (t === 'ai') { let s = rect(x, y, w, h, u('gk'), 'rx="2" stroke="#1f2327"') + rect(x + 2, y + 2, w - 4, 8, '#6e757b') + rect(x + 2, y + h - 10, w - 4, 8, '#6e757b'); for (let i = 0; i < 4; i++) s += rect(x + 5, y + 14 + i * 5, 4, 2.6, i ? '#4b5156' : '#3ad65d'); return s + T(cx, y + h - 14, lab, 'font-size:9px;font-weight:700;fill:#d7dcdf'); }
    if (t === 'nbar') { let s = rect(x, y, w, h, u('gn'), 'stroke="#8a6a1c"'); for (let i = 0; i < Math.floor(w / 8); i++) s += `<circle cx="${x + 4 + i * 8}" cy="${y + h / 2}" r="2" fill="#d9dcd6" stroke="#666"/>`; return s; }
    return rect(x, y, w, h, u('gl'), 'rx="2" stroke="#9fa29b"') + lb(lab);
  };
})(typeof window !== 'undefined' ? window : globalThis);
