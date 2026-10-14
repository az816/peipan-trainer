// symbols.js — 原理图符号、图框、交叉引用、梯形图。只拼 SVG 字符串，不碰 DOM。
(function (G) {
  const PP = G.PP;
  const DEV = PP.DEV;
  let REG = []; // 本张图上画了哪些线圈和触点（交叉引用用）
  const lab = d => (DEV[d] ? DEV[d].lab : d);
  const P = pts => pts.map(p => p.join(',')).join(' ');
  const S = (PP.S = {});
  S.W = (net, pts) => `<polyline class="hit" data-net="${net}" points="${P(pts)}"/><polyline class="w" data-net="${net}" points="${P(pts)}"/>`;
  S.DOT = (net, x, y) => `<circle class="jd" data-net="${net}" cx="${x}" cy="${y}" r="3.4"/>`;
  S.NL = (net, x, y, t, anchor = 'end') => `<text class="nl" data-net-lab="${net}" x="${x}" y="${y}" text-anchor="${anchor}">${t ?? net}</text>`;
  S.TL = (x, y, t, a = 'start') => `<text class="tl" x="${x}" y="${y}" text-anchor="${a}">${t}</text>`;
  S.SRC = (x, y, t) => `<text class="src" x="${x}" y="${y}">${t}</text>`;
  S.NOTE = (x, y, t, a = 'middle') => `<text class="note" x="${x}" y="${y}" text-anchor="${a}">${t}</text>`;

  // 触点：竖直，y..y+40。type NO/NC；act: btn 按钮 / th 热继 / estop 急停 / mag 磁性开关 / timer 延时
  S.contact = (x, y, o) => {
    REG.push({ dev: o.dev, t: `${o.t1}-${o.t2}`, x, y });
    let s = `<g class="sym" data-dev="${o.dev}"><rect class="box" x="${x - 46}" y="${y}" width="${o.act ? 66 : 40}" height="40"/>`;
    s += `<line class="s" x1="${x}" y1="${y}" x2="${x}" y2="${y + 10}"/><line class="s" x1="${x}" y1="${y + 30}" x2="${x}" y2="${y + 40}"/>`;
    let bx;
    if (o.type === 'NO') { s += `<line class="s" x1="${x}" y1="${y + 30}" x2="${x - 12}" y2="${y + 8}"/>`; bx = x - 6.5; }
    else { s += `<line class="s" x1="${x}" y1="${y + 10}" x2="${x + 11}" y2="${y + 10}"/><line class="s" x1="${x}" y1="${y + 30}" x2="${x + 11}" y2="${y + 6}"/>`; bx = x + 5; }
    const m = y + 19;
    if (o.act === 'btn') s += `<line class="s dash" x1="${bx}" y1="${m}" x2="${x - 26}" y2="${m}"/><path class="s" d="M${x - 21} ${y + 12}H${x - 26}V${y + 26}H${x - 21}"/>`;
    if (o.act === 'th') s += `<line class="s dash" x1="${bx}" y1="${m}" x2="${x - 26}" y2="${m}"/><rect class="s" x="${x - 38}" y="${m - 6}" width="12" height="12"/><path class="s thin" d="M${x - 36} ${m + 3}H${x - 32}V${m - 3}H${x - 28}"/>`;
    if (o.act === 'estop') s += `<line class="s dash" x1="${bx}" y1="${m}" x2="${x - 24}" y2="${m}"/><path class="s fill" d="M${x - 24} ${y + 11}A8 8 0 0 0 ${x - 24} ${y + 27}Z"/>`;
    if (o.act === 'mag') s += `<rect class="s" x="${x - 30}" y="${m - 5}" width="14" height="10"/><text class="tl" x="${x - 23}" y="${m + 3.5}" text-anchor="middle">N</text><line class="s dash" x1="${bx}" y1="${m}" x2="${x - 16}" y2="${m}"/>`;
    if (o.act === 'timer') s += `<line class="s dash" x1="${bx}" y1="${m}" x2="${x - 18}" y2="${m}"/><path class="s thin" d="M${x - 18} ${m - 6}A6 6 0 0 0 ${x - 18} ${m + 6}"/>`;
    const off = o.act === 'th' ? 44 : o.act === 'mag' ? 36 : o.act === 'estop' ? 36 : o.act === 'timer' ? 26 : o.act ? 32 : 12;
    const lx = o.side === 'right' ? x + 16 : x - off, an = o.side === 'right' ? 'start' : 'end';
    s += `<text class="sl" x="${lx}" y="${y + 25}" text-anchor="${an}">${lab(o.dev)}</text><text class="xr" data-xr="${o.dev}" x="${lx}" y="${y + 36}" text-anchor="${an}"></text>`;
    return s + S.TL(x + 5, y + 6, o.t1) + S.TL(x + 5, y + 40, o.t2) + '</g>';
  };
  // 线圈：y..y+22
  S.coil = (x, y, dev, o = {}) => {
    REG.push({ dev, coil: true, x, y });
    const t = o.t || ['A1', 'A2'], right = o.side === 'right', lx = right ? x + (o.diode ? 30 : 22) : x - 22;
    return `<g class="sym" data-dev="${dev}"><rect class="box" x="${x - 40}" y="${y - 6}" width="80" height="34"/><rect class="s fill" x="${x - 15}" y="${y}" width="30" height="22"/>${o.diode ? `<path class="s thin" d="M${x + 15} ${y + 11}h9M${x + 24} ${y + 5}v12"/>` : ''}<text class="sl" x="${lx}" y="${y + 16}" text-anchor="${right ? 'start' : 'end'}">${lab(dev)}</text>${S.TL(x + 5, y - 3, t[0])}${S.TL(x + 5, y + 33, t[1])}</g>`;
  };
  S.fuse = (x, y, dev = 'FU') => `<g class="sym" data-dev="${dev}"><rect class="box" x="${x - 40}" y="${y}" width="60" height="30"/><rect class="s fill" x="${x - 6}" y="${y}" width="12" height="30"/><line class="s" x1="${x}" y1="${y}" x2="${x}" y2="${y + 30}"/><text class="sl" x="${x - 12}" y="${y + 20}" text-anchor="end">FU</text>${S.TL(x + 9, y + 6, '1')}${S.TL(x + 9, y + 30, '2')}</g>`;
  S.triple = (xs, y, kind, dev) => {
    REG.push({ dev, t: kind === 'fr' ? '热元件' : '主触点', x: xs[0], y });
    let s = `<g class="sym" data-dev="${dev}"><rect class="box" x="${xs[0] - 16}" y="${y}" width="${xs[2] - xs[0] + 60}" height="40"/>`;
    const top = ['1', '3', '5'], bot = ['2', '4', '6'];
    xs.forEach((x, i) => {
      s += `<line class="s" x1="${x}" y1="${y}" x2="${x}" y2="${y + 10}"/><line class="s" x1="${x}" y1="${y + 30}" x2="${x}" y2="${y + 40}"/>`;
      if (kind === 'fr') s += `<rect class="s fill" x="${x - 6}" y="${y + 10}" width="12" height="20"/><path class="s thin" d="M${x} ${y + 10}V${y + 16}H${x + 3}V${y + 24}H${x}V${y + 30}"/>`;
      else { s += `<line class="s" x1="${x}" y1="${y + 30}" x2="${x - 12}" y2="${y + 8}"/>`; if (kind === 'qf') s += `<path class="s" style="stroke-width:1.6" d="M${x - 3} ${y + 7}l6 6M${x + 3} ${y + 7}l-6 6"/>`; }
      s += S.TL(x + (kind === 'fr' ? 8 : 5), y + 6, top[i]) + S.TL(x + (kind === 'fr' ? 8 : 5), y + 40, bot[i]);
    });
    return s + `<line class="s dash" x1="${xs[0] - 6.5}" y1="${y + 20}" x2="${xs[2] - 6.5}" y2="${y + 20}"/><text class="sl" x="${xs[2] + 20}" y="${y + 25}">${lab(dev)}</text><text class="xr" data-xr="${dev}" x="${xs[2] + 20}" y="${y + 36}"></text></g>`;
  };
  S.motor = (cx, cy, r) => `<g class="sym" data-dev="M"><circle class="s fill" cx="${cx}" cy="${cy}" r="${r}"/><text class="mt" x="${cx}" y="${cy - 1}">M</text><text class="mt" style="font-size:11px" x="${cx}" y="${cy + 14}">3~</text><text class="sl" x="${cx + r + 8}" y="${cy + 5}">M</text></g>`;
  S.MK = (x, y, l, lx, ly, a = 'start') => `<g class="sym" data-dev="X1"><rect class="box" x="${x - 8}" y="${y - 8}" width="16" height="16"/><circle class="s fill" cx="${x}" cy="${y}" r="4.5"/>${S.TL(lx, ly, l, a)}</g>`;
  S.diode = (x, y, dev) => `<g class="sym" data-dev="${dev}"><rect class="box" x="${x - 14}" y="${y - 4}" width="40" height="30"/><line class="s" x1="${x}" y1="${y}" x2="${x}" y2="${y + 5}"/><path class="s fill" d="M${x - 7} ${y + 17}L${x + 7} ${y + 17}L${x} ${y + 5}Z"/><line class="s" x1="${x - 7}" y1="${y + 5}" x2="${x + 7}" y2="${y + 5}"/><line class="s" x1="${x}" y1="${y + 17}" x2="${x}" y2="${y + 22}"/>${S.TL(x + 9, y + 4, 'K')}${S.TL(x + 9, y + 24, 'A')}<text class="sl" x="${x + 12}" y="${y + 16}">${lab(dev)}</text></g>`;
  S.lamp = (x, y, dev) => `<g class="sym" data-dev="${dev}"><rect class="box" x="${x - 30}" y="${y - 2}" width="50" height="26"/><circle class="s fill" cx="${x}" cy="${y + 11}" r="11"/><path class="s thin" d="M${x - 7.8} ${y + 3.2}l15.6 15.6M${x + 7.8} ${y + 3.2}l-15.6 15.6"/><text class="sl" x="${x - 16}" y="${y + 16}" text-anchor="end">${lab(dev)}</text>${S.TL(x + 13, y + 2, 'X1')}${S.TL(x + 13, y + 26, 'X2')}</g>`;
  S.box = (dev, x, y, w, h, title, sub) => `<g class="sym" data-dev="${dev}"><rect class="s fill" x="${x}" y="${y}" width="${w}" height="${h}"/><text class="sl" x="${x + w / 2}" y="${y + h / 2 + (sub ? 0 : 5)}" text-anchor="middle">${title}</text>${sub ? `<text class="tl" x="${x + w / 2}" y="${y + h / 2 + 14}" text-anchor="middle">${sub}</text>` : ''}</g>`;
  S.sensor = (dev, x, y, type) => `<g class="sym" data-dev="${dev}"><rect class="s fill" x="${x - 25}" y="${y}" width="50" height="50"/><path class="s" d="M${x} ${y + 8}l9 9-9 9-9-9z"/><text class="tl" x="${x}" y="${y + 44}" text-anchor="middle" style="font-weight:700;fill:var(--ink)">${type}</text><text class="sl" x="${x - 30}" y="${y + 30}" text-anchor="end">S1</text></g>`;

  // ---------- 图框 + 区号 + 标题栏 + 交叉引用 ----------
  PP.frame = (ex, idx) => {
    REG = [];
    const [w, h] = ex.vb.split(' ').slice(2).map(Number);
    let body = ex.sch();
    const W = w + 28, H = h + 22 + 52;
    const cols = Math.max(4, Math.round((W - 12) / 64)), cw = (W - 12) / cols;
    const zone = x => Math.min(cols, Math.floor((x + 14 - 6) / cw) + 1);
    const coilZ = {};
    REG.filter(r => r.coil).forEach(r => { coilZ[r.dev] = zone(r.x); });
    // 触点下方写上它的线圈在第几区（EPLAN 那种交叉引用）
    body = body.replace(/<text class="xr" data-xr="([^"]+)"([^>]*)><\/text>/g, (m, d, rest) => `<text class="xr"${rest}>${coilZ[d] ? '/' + coilZ[d] : ''}</text>`);
    let s = `<rect class="frm" x="6" y="6" width="${W - 12}" height="${H - 12}"/><line class="frm" x1="6" y1="18" x2="${W - 6}" y2="18"/>`;
    for (let i = 0; i < cols; i++) {
      const x0 = 6 + i * cw;
      if (i) s += `<line class="frm" x1="${x0}" y1="6" x2="${x0}" y2="18"/>`;
      s += `<text class="zn" x="${x0 + cw / 2}" y="15.5">${i + 1}</text>`;
    }
    s += `<g transform="translate(14,22)">${body}</g>`;
    const tbw = Math.min(250, W - 12), tx = W - 6 - tbw, ty = H - 6 - 34;
    s += `<rect class="frm" x="${tx}" y="${ty}" width="${tbw}" height="34"/><line class="frm" x1="${tx}" y1="${ty + 17}" x2="${tx + tbw}" y2="${ty + 17}"/><line class="frm" x1="${tx + 36}" y1="${ty}" x2="${tx + 36}" y2="${ty + 34}"/><line class="frm" x1="${tx + tbw - 70}" y1="${ty}" x2="${tx + tbw - 70}" y2="${ty + 34}"/>`;
    const room = Math.floor((tbw - 36 - 76) / 10.5), nm = ex.name.length > room ? ex.name.slice(0, room - 1) + '…' : ex.name;
    s += `<text class="tb" x="${tx + 4}" y="${ty + 12}">图名</text><text class="tb b" x="${tx + 40}" y="${ty + 12}">${nm}</text><text class="tb" x="${tx + 4}" y="${ty + 29}">图号</text><text class="tb b" x="${tx + 40}" y="${ty + 29}">${ex.no || 'PP-' + String(idx + 1).padStart(2, '0')}</text><text class="tb" x="${tx + tbw - 66}" y="${ty + 12}">页 ${ex.page || '1/1'}</text><text class="tb" x="${tx + tbw - 66}" y="${ty + 29}">练习台</text>`;
    // 触点镜像表（线圈 → 它的触点在哪几区）
    const mirror = Object.keys(coilZ).map(d => ({ dev: d, zone: coilZ[d], contacts: REG.filter(r => !r.coil && r.dev === d).map(r => ({ t: r.t, zone: zone(r.x) })) })).filter(m => m.contacts.length);
    return { svg: s, vb: `0 0 ${W} ${H}`, mirror, contacts: REG.filter(r => !r.coil).map(r => ({ dev: r.dev, t: r.t, zone: zone(r.x) })) };
  };

  // ---------- 梯形图 ----------
  // 返回 SVG 字符串；bits 给出当前各位的状态，能流经过的地方高亮
  PP.ladderSVG = (ladder, bits, names = {}) => {
    const CW = 64, RH = 52;
    const size = e => {
      if (e[0] === 'ser') { const k = e.slice(1).map(size); return { w: k.reduce((a, b) => a + b.w, 0), h: Math.max(...k.map(b => b.h)) }; }
      if (e[0] === 'par') { const k = e.slice(1).map(size); return { w: Math.max(...k.map(b => b.w)), h: k.reduce((a, b) => a + b.h, 0) }; }
      return { w: 1, h: 1 };
    };
    // 画元素，pin 表示左端有没有能流，返回 {s, pout}
    const draw = (e, x, y, pin) => {
      if (e[0] === 'ser') {
        let s = '', p = pin, cx = x;
        for (const c of e.slice(1)) { const z = size(c); const r = draw(c, cx, y, p); s += r.s; p = r.pout; cx += z.w * CW; }
        return { s, pout: p };
      }
      if (e[0] === 'par') {
        const z = size(e); let s = '', any = false, cy = y;
        const outs = [];
        for (const c of e.slice(1)) {
          const cz = size(c), r = draw(c, x, cy, pin); s += r.s; any = any || r.pout;
          if (cz.w < z.w) s += `<line class="lw${r.pout ? ' on' : ''}" x1="${x + cz.w * CW}" y1="${cy}" x2="${x + z.w * CW}" y2="${cy}"/>`;
          outs.push([cy, r.pout]); cy += cz.h * RH;
        }
        const last = outs[outs.length - 1][0];
        s += `<line class="lw${pin ? ' on' : ''}" x1="${x}" y1="${y}" x2="${x}" y2="${last}"/><line class="lw${any ? ' on' : ''}" x1="${x + z.w * CW}" y1="${y}" x2="${x + z.w * CW}" y2="${last}"/>`;
        return { s, pout: any };
      }
      const closed = e[0] === 'NO' ? !!bits[e[1]] : !bits[e[1]], pout = pin && closed;
      const mx = x + CW / 2;
      let s = `<line class="lw${pin ? ' on' : ''}" x1="${x}" y1="${y}" x2="${mx - 7}" y2="${y}"/><line class="lw${pout ? ' on' : ''}" x1="${mx + 7}" y1="${y}" x2="${x + CW}" y2="${y}"/>`;
      s += `<path class="lc${closed ? ' on' : ''}" d="M${mx - 7} ${y - 9}V${y + 9}M${mx + 7} ${y - 9}V${y + 9}"/>`;
      if (e[0] === 'NC') s += `<line class="lc${closed ? ' on' : ''}" x1="${mx - 9}" y1="${y + 9}" x2="${mx + 9}" y2="${y - 9}"/>`;
      s += `<text class="la" x="${mx}" y="${y - 13}">${e[1]}</text><text class="ln" x="${mx}" y="${y + 21}">${names[e[1]] || ''}</text>`;
      return { s, pout };
    };
    const maxW = Math.max(...ladder.map(r => size(r.e).w)) + 1;
    let y = 30, s = '';
    for (const r of ladder) {
      const z = size(r.e), d = draw(r.e, 20, y, true), ex = 20 + maxW * CW;
      s += d.s + `<line class="lw${d.pout ? ' on' : ''}" x1="${20 + z.w * CW}" y1="${y}" x2="${ex - 16}" y2="${y}"/>`;
      s += `<path class="lc${d.pout ? ' on' : ''}" d="M${ex - 16} ${y - 9}A10 10 0 0 0 ${ex - 16} ${y + 9}M${ex - 4} ${y - 9}A10 10 0 0 1 ${ex - 4} ${y + 9}"/><line class="lw${d.pout ? ' on' : ''}" x1="${ex - 4}" y1="${y}" x2="${ex + 8}" y2="${y}"/>`;
      s += `<text class="la" x="${ex - 10}" y="${y - 13}">${r.q}</text><text class="ln" x="${ex - 10}" y="${y + 21}">${r.label || ''}</text>`;
      y += z.h * RH + 14;
    }
    const Wd = 20 + maxW * CW + 22, Hd = y - 6;
    s = `<line class="lw on" x1="20" y1="10" x2="20" y2="${Hd - 6}"/><line class="lw" x1="${Wd - 14}" y1="10" x2="${Wd - 14}" y2="${Hd - 6}"/>` + s;
    return { svg: s, vb: `0 0 ${Wd} ${Hd}`, w: Wd };
  };
})(typeof window !== 'undefined' ? window : globalThis);
