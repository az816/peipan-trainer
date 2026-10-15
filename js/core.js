// core.js — 设备库 + 电路仿真引擎。不碰 DOM，浏览器和 node 测试共用。
(function (G) {
  const PP = (G.PP = G.PP || {});

  // ---------- 设备库：盘面位置与端子 ----------
  // terms: [端子id, 显示名, 相对x, 't'上边 / 'b'下边]
  const btn = (lab, color, name, x) => ({ lab, kind: 'btn', color, name, x, y: 356, w: 88, h: 76,
    terms: color === 'red' ? [['1', '1', 24, 't'], ['2', '2', 64, 't']] : [['3', '3', 24, 't'], ['4', '4', 64, 't']] });
  const kmx = (lab, x, y, h, coil) => ({ lab, kind: 'kmx', coil, x, y, w: 132, h,
    terms: [['A1', 'A1', 22, 't'], ['13', '13', 66, 't'], ['21', '21', 108, 't'], ['A2', 'A2', 22, 'b'], ['14', '14', 66, 'b'], ['22', '22', 108, 'b']] });
  const plcIn = [['L+', 'L+', 24, 't'], ['M', 'M', 58, 't'], ['1M', '1M', 96, 't'], ['I0.0', 'I0.0', 134, 't'], ['I0.1', 'I0.1', 172, 't'], ['I0.2', 'I0.2', 210, 't']];
  const sensorTerms = [['BN', 'BN 棕', 40, 't'], ['BK', 'BK 黑', 110, 't'], ['BU', 'BU 蓝', 180, 't']];
  const DEV = (PP.DEV = {
    XT1: { lab: 'XT', kind: 'xt', x: 24, y: 44, w: 104, h: 56, terms: [['L', 'L', 32, 'b'], ['N', 'N', 72, 'b']] },
    XT1B: { lab: 'XT', kind: 'xt', x: 24, y: 204, w: 104, h: 56, terms: [['L', 'L', 32, 'b'], ['N', 'N', 72, 'b']] },
    XT3: { lab: 'XT', kind: 'xt', x: 24, y: 44, w: 104, h: 56, terms: [['L1', 'L1', 22, 'b'], ['L2', 'L2', 52, 'b'], ['L3', 'L3', 82, 'b']] },
    FU: { lab: 'FU', kind: 'fu', x: 168, y: 40, w: 48, h: 116, terms: [['1', '1', 24, 't'], ['2', '2', 24, 'b']] },
    FUB: { lab: 'FU', kind: 'fu', x: 168, y: 190, w: 48, h: 116, terms: [['1', '1', 24, 't'], ['2', '2', 24, 'b']] },
    QF: { lab: 'QF', kind: 'qf', x: 150, y: 40, w: 100, h: 116, terms: [['1', '1', 20, 't'], ['3', '3', 50, 't'], ['5', '5', 80, 't'], ['2', '2', 20, 'b'], ['4', '4', 50, 'b'], ['6', '6', 80, 'b']] },
    KM: { lab: 'KM', kind: 'km', coil: 'AC', x: 290, y: 40, w: 184, h: 120, terms: [['1', '1/L1', 22, 't'], ['3', '3/L2', 54, 't'], ['5', '5/L3', 86, 't'], ['13', '13', 126, 't'], ['A1', 'A1', 162, 't'], ['2', '2/T1', 22, 'b'], ['4', '4/T2', 54, 'b'], ['6', '6/T3', 86, 'b'], ['14', '14', 126, 'b'], ['A2', 'A2', 162, 'b']] },
    FR: { lab: 'FR', kind: 'fr', x: 290, y: 204, w: 184, h: 92, terms: [['1', '1', 22, 't'], ['3', '3', 54, 't'], ['5', '5', 86, 't'], ['2', '2/T1', 22, 'b'], ['4', '4/T2', 54, 'b'], ['6', '6/T3', 86, 'b'], ['95', '95', 126, 'b'], ['96', '96', 162, 'b']] },
    FRC: { lab: 'FR', kind: 'frc', x: 236, y: 40, w: 72, h: 116, terms: [['95', '95', 22, 'b'], ['96', '96', 52, 'b']] },
    KC1: kmx('KM1', 330, 40, 116, 'AC'), KC2: kmx('KM2', 480, 40, 116, 'AC'), KC3: kmx('KM3', 330, 194, 110, 'AC'),
    KD1: kmx('KM1', 330, 194, 110, 'DC'), KD2: kmx('KM2', 480, 194, 110, 'DC'),
    KT: { lab: 'KT', kind: 'kt', coil: 'AC', x: 480, y: 194, w: 132, h: 110, terms: [['A1', 'A1', 22, 't'], ['55', '55', 66, 't'], ['67', '67', 108, 't'], ['A2', 'A2', 22, 'b'], ['56', '56', 66, 'b'], ['68', '68', 108, 'b']] },
    KMC: { lab: 'KM', kind: 'kmc', coil: 'AC', x: 290, y: 192, w: 132, h: 110, terms: [['A1', 'A1', 34, 't'], ['A2', 'A2', 34, 'b']] },
    KA: { lab: 'KA', kind: 'ka', coil: 'DC', x: 486, y: 40, w: 96, h: 116, terms: [['A1', 'A1', 48, 't'], ['A2', 'A2', 48, 'b']] },
    KA2: { lab: 'KA', kind: 'ka', coil: 'DC', x: 486, y: 40, w: 110, h: 116, terms: [['A1', 'A1', 26, 't'], ['11', '11', 80, 't'], ['A2', 'A2', 26, 'b'], ['14', '14', 80, 'b']] },
    SB1: btn('SB1', 'red', '停止', 40), SB2: btn('SB2', 'green', '启动', 160), SB3: btn('SB3', 'green', '启动2', 280), SB4: btn('SB4', 'red', '停止2', 400),
    SVD: { lab: 'U2', kind: 'svd', x: 236, y: 192, w: 204, h: 110, terms: [['L1', 'L1', 22, 't'], ['L2', 'L2', 56, 't'], ['24V', '24V', 112, 't'], ['0V', '0V', 146, 't'], ['SON', 'SON', 14, 'b'], ['PUL', 'PUL', 38, 'b'], ['COM', 'COM', 62, 'b'], ['RDY', 'RDY', 86, 'b'], ['U', 'U', 118, 'b'], ['V', 'V', 142, 'b'], ['W', 'W', 166, 'b'], ['PE', 'PE', 190, 'b']] },
    SVM: { lab: 'M2', kind: 'svm', x: 330, y: 356, w: 230, h: 78, terms: [['U', 'U', 30, 't'], ['V', 'V', 70, 't'], ['W', 'W', 110, 't'], ['PE', 'PE', 150, 't']] },
    LC: { lab: 'F1', kind: 'lc', x: 300, y: 356, w: 290, h: 78, terms: [['BN', 'BN', 30, 't'], ['BU', 'BU', 78, 't'], ['BK', 'OSSD1', 126, 't'], ['WH', 'OSSD2', 174, 't']] },
    VI: { lab: 'Y1', kind: 'vi', x: 330, y: 356, w: 250, h: 78, terms: [['1', '1', 30, 't'], ['2', '2', 70, 't'], ['COM', 'COM', 110, 't']] },
    AIM: { lab: 'A1', kind: 'aim', x: 170, y: 40, w: 150, h: 116, terms: [['L+', 'L+', 26, 't'], ['M', 'M', 62, 't'], ['0+', '0+', 26, 'b'], ['0-', '0-', 62, 'b']] },
    PT: { lab: 'B3', kind: 'pt', x: 330, y: 356, w: 200, h: 78, terms: [['+', '+', 30, 't'], ['-', '-', 80, 't']] },
    SE2: { lab: 'SE', kind: 'estop2', x: 40, y: 356, w: 110, h: 78, terms: [['11', '11', 18, 't'], ['12', '12', 42, 't'], ['21', '21', 68, 't'], ['22', '22', 92, 't']] },
    SR: { lab: 'KS', kind: 'sr', x: 170, y: 40, w: 176, h: 116, terms: [['A1', 'A1', 20, 't'], ['S11', 'S11', 54, 't'], ['S12', 'S12', 88, 't'], ['S21', 'S21', 122, 't'], ['S22', 'S22', 156, 't'], ['A2', 'A2', 20, 'b'], ['S33', 'S33', 54, 'b'], ['S34', 'S34', 88, 'b'], ['13', '13', 122, 'b'], ['14', '14', 156, 'b']] },
    DRV: { lab: 'U1', kind: 'drv', x: 200, y: 192, w: 200, h: 110, terms: [['PUL+', 'PUL+', 22, 't'], ['PUL-', 'PUL-', 58, 't'], ['DIR+', 'DIR+', 94, 't'], ['DIR-', 'DIR-', 130, 't'], ['V+', 'V+', 18, 'b'], ['GND', 'GND', 50, 'b'], ['A+', 'A+', 86, 'b'], ['A-', 'A-', 118, 'b'], ['B+', 'B+', 150, 'b'], ['B-', 'B-', 182, 'b']] },
    STP: { lab: 'M1', kind: 'stp', x: 330, y: 356, w: 230, h: 78, terms: [['A+', 'A+ 红', 30, 't'], ['A-', 'A- 蓝', 80, 't'], ['B+', 'B+ 绿', 130, 't'], ['B-', 'B- 黑', 180, 't']] },
    SE: { lab: 'SE', kind: 'estop', x: 40, y: 356, w: 96, h: 78, terms: [['1', '1', 26, 't'], ['2', '2', 70, 't']] },
    HL: { lab: 'HL', kind: 'lamp', color: 'yellow', name: '指示灯 DC24V', x: 40, y: 356, w: 96, h: 78, terms: [['X1', 'X1', 26, 't'], ['X2', 'X2', 70, 't']] },
    HLG: { lab: 'HL1', kind: 'lamp', ac: true, color: 'green', name: '运行灯 220V', x: 280, y: 356, w: 96, h: 78, terms: [['X1', 'X1', 26, 't'], ['X2', 'X2', 70, 't']] },
    HLR: { lab: 'HL2', kind: 'lamp', ac: true, color: 'red', name: '停止灯 220V', x: 400, y: 356, w: 96, h: 78, terms: [['X1', 'X1', 26, 't'], ['X2', 'X2', 70, 't']] },
    M: { lab: 'M', kind: 'motor', x: 480, y: 356, w: 124, h: 84, terms: [['U', 'U', 28, 't'], ['V', 'V', 62, 't'], ['W', 'W', 96, 't']] },
    PS: { lab: 'PS', kind: 'ps', x: 24, y: 40, w: 112, h: 100, terms: [['+V', '+V', 34, 'b'], ['-V', '-V', 78, 'b']] },
    PLC: { lab: 'PLC', kind: 'plc', x: 170, y: 40, w: 272, h: 132, terms: [...plcIn, ['3L+', '3L+', 24, 'b'], ['3M', '3M', 58, 'b'], ['Q0.0', 'Q0.0', 104, 'b'], ['Q0.1', 'Q0.1', 150, 'b']] },
    PLCR: { lab: 'PLC', kind: 'plcr', x: 170, y: 40, w: 272, h: 132, terms: [...plcIn, ['1L', '1L', 24, 'b'], ['Q0.0', 'Q0.0', 64, 'b'], ['2L', '2L', 110, 'b'], ['Q0.1', 'Q0.1', 150, 'b']] },
    X1: { lab: 'X1', kind: 'tb', x: 170, y: 214, w: 176, h: 84, terms: [1, 2, 3, 4].flatMap(k => [[k + 't', String(k), k * 40 - 12, 't'], [k + 'b', String(k), k * 40 - 12, 'b']]) },
    SN: { lab: 'S1', kind: 'sensor', type: 'NPN', x: 330, y: 356, w: 236, h: 78, terms: sensorTerms },
    SP: { lab: 'S1', kind: 'sensor', type: 'PNP', x: 330, y: 356, w: 236, h: 78, terms: sensorTerms },
    S2: { lab: 'S1', kind: 'sensor2', x: 330, y: 356, w: 236, h: 78, terms: [['BN', 'BN 棕', 40, 't'], ['BU', 'BU 蓝', 180, 't']] },
    YV: { lab: 'YV', kind: 'valve', x: 300, y: 356, w: 176, h: 78, terms: [['+', '+', 30, 't'], ['-', '-', 72, 't']] },
    YV2: { lab: 'YV', kind: 'valve', plain: true, x: 300, y: 356, w: 176, h: 78, terms: [['+', '+', 30, 't'], ['-', '-', 72, 't']] },
    B1: { lab: 'B1', kind: 'reed', x: 492, y: 356, w: 110, h: 78, terms: [['BN', 'BN 棕', 30, 't'], ['BU', 'BU 蓝', 80, 't']] },
    D1: { lab: 'D1', kind: 'diode', x: 492, y: 356, w: 110, h: 78, terms: [['K', 'K 阴极', 30, 't'], ['A', 'A 阳极', 80, 't']] },
  });
  const FIELD_KINDS = (PP.FIELD_KINDS = new Set(['sensor', 'sensor2', 'reed', 'valve', 'diode']));
  const COIL_KINDS = new Set(['km', 'kmx', 'kmc', 'kt', 'ka']);
  const AC = ['L', 'N'], DC = ['+24', '0V'];
  const POS = new Set(['L', '+24', 'L1', 'L2', 'L3']), NEG = new Set(['N', '0V']);
  const KT_MS = (PP.KT_MS = 3000);

  // ---------- 工具 ----------
  const split = t => { const i = t.indexOf('.'); return [t.slice(0, i), t.slice(i + 1)]; };
  PP.termPos = t => {
    const [d, k] = split(t), v = DEV[d], tt = v.terms.find(z => z[0] === k);
    return { x: v.x + tt[2], y: tt[3] === 't' ? v.y : v.y + v.h, side: tt[3], label: tt[1], dev: d, k };
  };
  PP.tplain = t => {
    const p = PP.termPos(t), side = p.dev === 'X1' ? (p.k.endsWith('t') ? '上口' : '下口') : '';
    return `${DEV[p.dev].lab} 的 ${p.label}${/^\d+$/.test(p.label) ? ' 号' : ''}${side}`;
  };
  PP.allTerms = ex => ex.devs.flatMap(d => DEV[d].terms.map(z => d + '.' + z[0]));
  PP.netMapOf = ex => { const m = {}; ex.nets.forEach(n => n.terms.forEach(t => (m[t] = n))); return m; };
  PP.nlab = n => n.lab || n.id;
  PP.chain = ex => ex.nets.flatMap(n => n.terms.slice(1).map((t, i) => [n.terms[i], t]));
  function uf(terms, ws, pairs) {
    const p = {}; terms.forEach(t => (p[t] = t));
    const f = t => { while (p[t] !== t) { p[t] = p[p[t]]; t = p[t]; } return t; };
    for (const [a, b] of ws) if (p[a] !== undefined && p[b] !== undefined) p[f(a)] = f(b);
    for (const [a, b] of pairs) if (p[a] !== undefined && p[b] !== undefined) p[f(a)] = f(b);
    return f;
  }
  PP.uf = uf;
  // 梯形图求值：['ser',..] 串联，['par',..] 并联，['NO',位] 常开，['NC',位] 常闭
  const evalL = (PP.evalL = (e, bits) => {
    switch (e[0]) {
      case 'ser': return e.slice(1).every(x => evalL(x, bits));
      case 'par': return e.slice(1).some(x => evalL(x, bits));
      case 'NO': return !!bits[e[1]];
      case 'NC': return !bits[e[1]];
    }
    return false;
  });
  PP.ST0 = () => ({ power: false, p: {}, trip: false, target: false, hmi: false, estop: false, ktStart: null });

  // ---------- 一个练习的实验台 ----------
  class Lab {
    constructor(ex, wires) {
      this.ex = ex; this.wires = wires || []; this.st = PP.ST0(); this.dyn = {}; this.fault = null;
      this.now = () => Date.now(); this.nm = PP.netMapOf(ex); this.terms = PP.allTerms(ex);
    }
    has(d) { return this.ex.devs.includes(d); }
    effWires(ws = this.wires, f = this.fault) { return f && f.kind === 'wire' ? ws.filter(w => w !== f.wref) : ws; }

    // 当前状态下闭合的触点（含故障：粘连/接触不良）
    pairs(on, ktDone, s = this.st, f = this.fault) {
      const P = [];
      const add = (d, a, b, cond) => {
        const A = d + '.' + a, B = d + '.' + b;
        if (f && f.kind === 'open' && f.a === A && f.b === B) return;
        if (cond || (f && f.kind === 'stuck' && f.a === A && f.b === B)) P.push([A, B]);
      };
      for (const d of this.ex.devs) {
        const v = DEV[d];
        switch (v.kind) {
          case 'fu': add(d, '1', '2', true); break;
          case 'qf': ['1', '3', '5'].forEach(a => add(d, a, String(+a + 1), s.power)); break;
          case 'km': ['1', '3', '5'].forEach(a => add(d, a, String(+a + 1), !!on[d])); add(d, '13', '14', !!on[d]); break;
          case 'kmx': add(d, '13', '14', !!on[d]); add(d, '21', '22', !on[d]); break;
          case 'kt': add(d, '55', '56', !(on[d] && ktDone)); add(d, '67', '68', !!(on[d] && ktDone)); break;
          case 'ka': if (v.terms.some(t => t[0] === '11')) add(d, '11', '14', !!on[d]); break;
          case 'fr': ['1', '3', '5'].forEach(a => add(d, a, String(+a + 1), true)); add(d, '95', '96', !s.trip); break;
          case 'frc': add(d, '95', '96', !s.trip); break;
          case 'btn': if (v.color === 'red') add(d, '1', '2', !s.p[d]); else add(d, '3', '4', !!s.p[d]); break;
          case 'estop': add(d, '1', '2', !s.estop); break;
          case 'estop2': add(d, '11', '12', !s.estop); add(d, '21', '22', !s.estop); break;
          case 'svd': add(d, 'COM', 'RDY', !!on[d + ':rdy']); break;
          case 'lc': add(d, 'BN', 'BK', !!on[d]); add(d, 'BN', 'WH', !!on[d]); break;
          case 'sr': add(d, '13', '14', !!on[d]); break;
          case 'tb': [1, 2, 3, 4].forEach(k => add(d, k + 't', k + 'b', true)); break;
          case 'sensor': add(d, 'BK', v.type === 'NPN' ? 'BU' : 'BN', !!on[d]); break;
          case 'sensor2': case 'reed': add(d, 'BN', 'BU', !!on[d]); break;
          case 'plc': add(d, '3L+', 'Q0.0', !!on[d + ':Q0.0on']); add(d, '3L+', 'Q0.1', !!on[d + ':Q0.1on']); break;
          case 'plcr': add(d, '1L', 'Q0.0', !!on[d + ':Q0.0']); add(d, '2L', 'Q0.1', !!on[d + ':Q0.1']); break;
        }
      }
      return P;
    }

    sim() {
      const e = this.ex, s = this.st, f = this.fault;
      if (!s.power) return { power: false, on: {}, short: false, live: () => null, motor: 'stop', pairs: [], f: t => t, at: new Map(), ktDone: false };
      const ktDone = s.ktStart != null && this.now() - s.ktStart >= KT_MS;
      const ws = this.effWires();
      let on = { ...this.dyn }, r = null;
      for (let it = 0; it < 24; it++) {
        const pairs = this.pairs(on, ktDone);
        const fu = uf(this.terms, ws, pairs), at = new Map();
        for (const [t, src] of Object.entries(e.sources)) { const k = fu(t); if (!at.has(k)) at.set(k, new Set()); at.get(k).add(src); }
        const one = t => { const x = at.get(fu(t)); return x && x.size === 1 ? [...x][0] : null; };
        const is = (a, b, set) => { const x = one(a), y = one(b); return !!(x && y && x !== y && set.includes(x) && set.includes(y)); };
        let short = [...at.values()].some(x => x.size > 1), why = short ? 'src' : '';
        const n = {};
        for (const d of e.devs) {
          const v = DEV[d], burnt = f && f.kind === 'coil' && f.dev === d, dead = f && f.kind === 'sensor' && f.dev === d;
          switch (v.kind) {
            case 'km': case 'kmx': case 'kmc': case 'kt': case 'ka':
              n[d] = !burnt && is(d + '.A1', d + '.A2', v.coil === 'DC' ? DC : AC);
              if (v.kind === 'km' && s.p.KM) n[d] = true;
              break;
            case 'valve':
              n[d] = !burnt && one(d + '.+') === '+24' && one(d + '.-') === '0V';
              n[d + ':rev'] = one(d + '.+') === '0V' && one(d + '.-') === '+24';
              if (n[d + ':rev'] && !v.plain) { short = true; why = 'valve'; }
              break;
            case 'diode': if (one(d + '.A') === '+24' && one(d + '.K') === '0V') { short = true; why = 'diode'; } break;
            case 'lamp': n[d] = is(d + '.X1', d + '.X2', v.ac ? AC : DC); n[d + ':burn'] = !v.ac && is(d + '.X1', d + '.X2', AC); break;
            case 'sensor': {
              const pw = one(d + '.BN') === '+24' && one(d + '.BU') === '0V';
              n[d + ':pw'] = pw; n[d + ':rev'] = one(d + '.BN') === '0V' && one(d + '.BU') === '+24';
              n[d] = pw && s.target && !dead; break;
            }
            case 'sensor2': n[d] = s.target && !dead; break;
            case 'reed': { const vd = e.devs.find(x => DEV[x].kind === 'valve'); n[d] = !dead && !!on[vd]; break; }
            // 安全继电器：有电、两个通道都闭合，按复位才吸合；吸合后自保持，任一通道断开立即释放
            case 'sr': {
              const pw = is(d + '.A1', d + '.A2', DC), c1 = fu(d + '.S11') === fu(d + '.S12') || one(d + '.S12') === '+24', c2 = fu(d + '.S21') === fu(d + '.S22') || one(d + '.S22') === '+24', rst = fu(d + '.S33') === fu(d + '.S34');
              n[d + ':pw'] = pw; n[d + ':c1'] = pw && c1; n[d + ':c2'] = pw && c2;
              n[d] = !burnt && pw && c1 && c2 && (!!on[d] || (rst && !on[d + ':rstHeld']));
              n[d + ':rstHeld'] = rst; break;
            }
            // 伺服驱动器：控制电和主电都有才准备好（RDY）；SON 使能 + 有脉冲才转；UVW 必须一一对应，接错报警
            case 'svd': {
              const cpw = is(d + '.24V', d + '.0V', DC), mpw = is(d + '.L1', d + '.L2', AC), son = cpw && one(d + '.SON') === '+24', pul = cpw && one(d + '.PUL') === '+24';
              const m = e.devs.find(x => DEV[x].kind === 'svm'), c = k => fu(d + '.' + k) === fu(m + '.' + k);
              const ph = c('U') && c('V') && c('W'), alm = cpw && mpw && son && !ph;
              n[d + ':cpw'] = cpw; n[d + ':mpw'] = mpw; n[d + ':son'] = son; n[d + ':alm'] = alm; n[d + ':pe'] = c('PE');
              n[d + ':rdy'] = cpw && mpw && !alm && !burnt;
              n[d] = n[d + ':rdy'] && son && pul && ph;
              break;
            }
            // 安全光栅：有电、没被挡住，两路 OSSD 输出 +24V
            case 'lc': { const pw = is(d + '.BN', d + '.BU', DC); n[d + ':pw'] = pw; n[d] = pw && !s.target && !dead; break; }
            // 阀岛：PNP 输出给 +24V，公共端 COM 接 0V
            case 'vi': for (const k of ['1', '2']) n[d + ':' + k] = !burnt && one(d + '.' + k) === '+24' && one(d + '.COM') === '0V'; break;
            // 模拟量输入：两线制变送器串在 +24V → 变送器 → AI 0+ → AI 0- → 0V 的回路里
            case 'aim': {
              const pw = is(d + '.L+', d + '.M', DC), t = e.devs.find(x => DEV[x].kind === 'pt'), tdead = f && f.kind === 'sensor' && f.dev === t;
              const ok = pw && !tdead && one(t + '.+') === '+24' && fu(t + '.-') === fu(d + '.0+') && one(d + '.0-') === '0V';
              n[d + ':pw'] = pw; n[d] = ok; n[d + ':ma'] = ok ? (s.target ? 12 : 4) : 0; break;
            }
            // 步进驱动器：有电 + 有脉冲才转；A、B 两相接对才转得起来，一相两根对调就反转
            case 'drv': {
              const pw = is(d + '.V+', d + '.GND', DC), pul = one(d + '.PUL+') === '+24' && one(d + '.PUL-') === '0V', dir = one(d + '.DIR+') === '+24' && one(d + '.DIR-') === '0V';
              n[d + ':pw'] = pw; n[d + ':pul'] = pw && pul; n[d + ':dir'] = pw && dir;
              const m = e.devs.find(x => DEV[x].kind === 'stp'), c = (a, b) => fu(d + '.' + a) === fu(m + '.' + b);
              const A = c('A+', 'A+') && c('A-', 'A-') ? 1 : c('A+', 'A-') && c('A-', 'A+') ? -1 : 0, B = c('B+', 'B+') && c('B-', 'B-') ? 1 : c('B+', 'B-') && c('B-', 'B+') ? -1 : 0;
              n[d + ':ph'] = A && B ? A * B : 0;
              n[d + ':run'] = pw && pul && !burnt ? (A && B ? ((A * B > 0) !== dir ? 'fwd' : 'rev') : 'shake') : '';
              break;
            }
            case 'plc': case 'plcr': {
              const pw = one(d + '.L+') === '+24' && one(d + '.M') === '0V', run = pw && !(f && f.kind === 'plcstop');
              n[d + ':pw'] = pw; n[d + ':run'] = run;
              const bits = { 'M10.0': !!s.hmi };
              for (const k of ['I0.0', 'I0.1', 'I0.2']) { n[d + ':' + k] = pw && is(d + '.' + k, d + '.1M', DC); bits[k] = n[d + ':' + k]; }
              for (const k of ['Q0.0', 'Q0.1']) bits[k] = !!on[d + ':' + k];
              const qok = v.kind === 'plcr' || (one(d + '.3L+') === '+24' && one(d + '.3M') === '0V');
              n[d + ':qok'] = qok;
              for (const rung of e.ladder || []) { const val = run && evalL(rung.e, bits); n[d + ':' + rung.q] = val; bits[rung.q] = val; }
              for (const k of ['Q0.0', 'Q0.1']) n[d + ':' + k + 'on'] = !!n[d + ':' + k] && qok;
              break;
            }
          }
        }
        if (e.excl) for (const [a, b] of e.excl) if (n[a] && n[b]) { short = true; why = 'excl'; }
        r = { power: true, short, why, f: fu, at, pairs, on: n, ktDone, one };
        if (short) break;
        const same = Object.keys({ ...n, ...on }).every(k => !!n[k] === !!on[k]);
        on = n;
        if (same) break;
      }
      if (!r.short) this.dyn = r.on;
      r.live = t => { const x = r.at.get(r.f(t)); return x ? (x.size > 1 ? 'X' : [...x][0]) : null; };
      r.motor = 'stop';
      if (this.has('M')) {
        const ph = ['M.U', 'M.V', 'M.W'].map(r.live);
        if (ph.every(p => !p)) r.motor = 'stop';
        else if (ph.every(p => /^L[123]$/.test(p || '')) && new Set(ph).size === 3) { const k = ph.map(p => +p[1]); r.motor = (k[1] - k[0] + 3) % 3 === 1 ? 'fwd' : 'rev'; }
        else r.motor = 'loss';
      }
      if (this.has('D1')) r.diodeOk = r.f('D1.K') === r.f('YV2.+') && r.f('D1.A') === r.f('YV2.-');
      return r;
    }

    applyEv(ev) {
      const s = this.st;
      if (ev === 'power_on') { s.power = true; this.dyn = {}; s.ktStart = null; }
      else if (ev === 'power_off') { s.power = false; this.dyn = {}; s.ktStart = null; s.p = {}; }
      else if (ev.startsWith('press_')) s.p[ev.slice(6)] = true;
      else if (ev.startsWith('release_')) s.p[ev.slice(8)] = false;
      else if (ev === 'kt_done') { if (s.ktStart != null) s.ktStart = this.now() - KT_MS - 1; }
      else { const i = ev.lastIndexOf('_'); s[ev.slice(0, i)] = ev.slice(i + 1) === 'on'; }
    }
    ktTick(r) { if (r.power && r.on.KT) { if (this.st.ktStart == null) this.st.ktStart = this.now(); } else this.st.ktStart = null; }

    // 自动跑一遍试车步骤（不影响当前台面）
    runTest(opts = {}) {
      const L = new Lab(this.ex, opts.wires || this.wires);
      L.fault = opts.fault === undefined ? this.fault : opts.fault;
      const t = 1e12; L.now = () => t;
      const res = []; let r = null;
      for (const s of this.ex.test) {
        L.applyEv(s.ev); r = L.sim();
        if (r.short) { res.push(false); break; }
        L.ktTick(r);
        const ok = !!s.ok(r); res.push(ok);
        if (!ok) break;
      }
      return { pass: res.length === this.ex.test.length && res.every(Boolean), res, r };
    }

    // 校线：和图纸线号比对
    check() {
      const ws = this.wires, nm = this.nm;
      const wrong = [];
      ws.forEach((w, i) => { const a = nm[w[0]], b = nm[w[1]]; if (!a || !b || a !== b) wrong.push(i); });
      const f = uf(this.terms, ws, []);
      const rows = this.ex.nets.map(n => {
        const r0 = f(n.terms[0]), left = n.terms.filter(t => f(t) !== r0).length;
        const bad = wrong.some(i => n.terms.includes(ws[i][0]) || n.terms.includes(ws[i][1]));
        return { n, left, bad };
      });
      const missing = rows.filter(x => x.left > 0);
      return { wrong, missing, rows, ok: !wrong.length && !missing.length, f };
    }
    whyWrong(a, b) { return this.diagnose(a, b).msg; }
    // 结构化的接线判断：code 给程序用，msg 给人看，fix 是“应该接到哪”
    //   DUP 已经接过 / TERM_FULL 端子满了（这两个是接之前查的，pre=true 才查）
    //   FIELD_BYPASS_X1 现场设备没经过端子排 / UNUSED_TERM 本题不用的端子 / NET_MISMATCH 线号不同 / '' 正确
    diagnose(a, b, pre = false) {
      if (pre) {
        if (this.wires.some(w => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a))) return { code: 'DUP', msg: '这两个端子已经接过了。' };
        const full = [a, b].find(x => this.wires.filter(w => w[0] === x || w[1] === x).length >= 2);
        if (full) return { code: 'TERM_FULL', term: full, msg: `${PP.tplain(full)} 上已经有两根线。标准要求一个端子只接一根，端子允许时最多两根；再多就换到同一线号的另一个端子上接。` };
      }
      const na = this.nm[a], nb = this.nm[b], pa = PP.termPos(a), pb = PP.termPos(b);
      const fix = t => { const n = this.nm[t]; return n ? n.terms.filter(x => x !== t) : []; };
      if (this.has('X1')) {
        const fa = FIELD_KINDS.has(DEV[pa.dev].kind), fb = FIELD_KINDS.has(DEV[pb.dev].kind);
        if ((fa && pb.dev !== 'X1' && !fb) || (fb && pa.dev !== 'X1' && !fa)) return { code: 'FIELD_BYPASS_X1', msg: '现场设备的线不能直接进柜内设备，要先接到端子排 X1 的下口。', fix: fix(a) };
      }
      if (!na || !nb) { const t = !na ? a : b; return { code: 'UNUSED_TERM', term: t, msg: `${PP.tplain(t)} 在本练习里不用接线。`, fix: fix(t === a ? b : a) }; }
      if (na === nb) return { code: '', msg: '' };
      return { code: 'NET_MISMATCH', msg: `一头是线号 ${PP.nlab(na)}，另一头是线号 ${PP.nlab(nb)}，线号不同不能连。`, fix: fix(a) };
    }

    // 万用表：断电量通断/电阻，带电量电压
    meter(a, b, r) {
      if (!this.st.power) {
        const fu = uf(this.terms, this.effWires(), this.pairs({ KM: !!this.st.p.KM }, false, { ...this.st, power: false }));
        const x = fu(a), y = fu(b);
        if (x === y) return { v: '0.0 Ω', n: '<b>通</b>，蜂鸣器“嘀——”。两点之间是连着的。' };
        for (const d of this.ex.devs) {
          const v = DEV[d], valve = v.kind === 'valve';
          if (!valve && !COIL_KINDS.has(v.kind)) continue;
          if (this.fault && this.fault.kind === 'coil' && this.fault.dev === d) continue;
          const p = fu(d + '.' + (valve ? '+' : 'A1')), q = fu(d + '.' + (valve ? '-' : 'A2'));
          if ((x === p && y === q) || (x === q && y === p)) {
            const R = valve ? '≈ 230 Ω' : v.coil === 'DC' ? '≈ 650 Ω' : '≈ 550 Ω';
            return { v: R, n: `两点之间隔着 <b>${v.lab} 线圈</b>。线圈有电阻，量到几十到几百欧是正常的；读数 OL 说明线圈断了（烧坏）。` };
          }
        }
        if (this.has('D1')) {
          const A = fu('D1.A'), K = fu('D1.K');
          if (x === A && y === K) return { v: '0.55 V', n: '二极管档：红表笔在阳极、黑表笔在阴极，正向导通压降约 0.5–0.7V。' };
          if (x === K && y === A) return { v: 'OL', n: '二极管档：反向不导通，正常。' };
        }
        return { v: 'OL', n: '<b>不通</b>（开路）。两点之间没连上，或者中间有断开的触点。按住按钮再量，就能检查按钮。' };
      }
      const va = r.live(a), vb = r.live(b);
      if (!va || !vb) return { v: '0.0 V', n: `${!va ? '红' : '黑'}表笔那一点<b>没电</b>（悬空，什么都没接到），量出来就是 0。` };
      if (va === vb) return { v: '0.0 V', n: '两点是<b>同一个电位</b>，电压差为 0。' };
      const isAC = x => AC.includes(x), isPh = x => /^L[123]$/.test(x), isDC = x => DC.includes(x);
      if (isAC(va) && isAC(vb)) return { v: '220 V~', n: '交流电压档：火线和零线之间 220V。' };
      if (isPh(va) && isPh(vb)) return { v: '380 V~', n: '交流电压档：两相之间是线电压 380V。' };
      if (va === '+24' && vb === '0V') return { v: '24.0 V', n: '直流电压档：红表笔这点是 +24V，黑表笔这点是 0V。' };
      if (va === '0V' && vb === '+24') return { v: '-24.0 V', n: '直流电压档：读数为负，说明表笔反了，<b>红表笔这点才是 0V</b>。' };
      if ((isDC(va) && isAC(vb)) || (isAC(va) && isDC(vb))) return { v: '???', n: '一边是交流 220V 回路，一边是直流 24V 回路，两个回路不共地，这样量没有意义。' };
      return { v: '---', n: '' };
    }

    // 电流流向：返回 Map(wire → [上游端子, 下游端子])，只含真正有电流的线
    flow(r) {
      const out = new Map();
      if (!r.power || r.short) return out;
      const on = r.on, LT = new Set();
      for (const d of this.ex.devs) {
        const v = DEV[d], T = (...k) => k.forEach(x => LT.add(d + '.' + x));
        if (COIL_KINDS.has(v.kind) && on[d] && !(v.kind === 'km' && this.st.p.KM)) T('A1', 'A2');
        if (v.kind === 'valve' && on[d]) T('+', '-');
        if (v.kind === 'lamp' && on[d]) T('X1', 'X2');
        if (v.kind === 'sr' && on[d + ':pw']) T('A1', 'A2');
        if (v.kind === 'drv' && on[d + ':pw']) T('V+', 'GND');
        if (v.kind === 'drv' && on[d + ':pul']) T('PUL+', 'PUL-');
        if (v.kind === 'drv' && on[d + ':dir']) T('DIR+', 'DIR-');
        if (v.kind === 'svd' && on[d + ':cpw']) T('24V', '0V');
        if (v.kind === 'svd' && on[d + ':son']) T('SON');
        if (v.kind === 'svd' && on[d]) T('PUL', 'U', 'V', 'W');
        if (v.kind === 'lc' && on[d + ':pw']) T('BN', 'BU');
        if (v.kind === 'vi') ['1', '2'].forEach(k => { if (on[d + ':' + k]) T(k, 'COM'); });
        if (v.kind === 'aim' && on[d + ':pw']) T('L+', 'M');
        if (v.kind === 'aim' && on[d]) T('0+', '0-');
        if (v.kind === 'pt' && on['AIM']) T('+', '-');
        if (v.kind === 'sensor' && on[d + ':pw']) { T('BN', 'BU'); if (on[d]) T('BK'); }
        if ((v.kind === 'sensor2' || v.kind === 'reed') && on[d]) T('BN', 'BU');
        if (v.kind === 'plc' || v.kind === 'plcr') {
          if (on[d + ':pw']) T('L+', 'M');
          ['I0.0', 'I0.1', 'I0.2'].forEach(k => { if (on[d + ':' + k]) T(k, '1M'); });
        }
        if (v.kind === 'motor' && (r.motor === 'fwd' || r.motor === 'rev')) T('U', 'V', 'W');
      }
      const groups = new Set([...LT].map(t => r.f(t)).filter(g => r.at.has(g)));
      const ws = this.effWires(), adj = {};
      const link = (a, b) => { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); };
      ws.forEach(([a, b]) => link(a, b)); r.pairs.forEach(([a, b]) => link(a, b));
      const bfs = set => {
        const dist = {}, q = [];
        for (const [t, src] of Object.entries(this.ex.sources)) if (set.has(src)) { dist[t] = 0; q.push(t); }
        while (q.length) { const t = q.shift(); for (const u of adj[t] || []) if (dist[u] === undefined) { dist[u] = dist[t] + 1; q.push(u); } }
        return dist;
      };
      const dP = bfs(POS), dN = bfs(NEG);
      for (const w of ws) {
        const g = r.f(w[0]);
        if (!groups.has(g)) continue;
        const src = [...r.at.get(g)][0];
        let [a, b] = w;
        if (POS.has(src)) { if ((dP[a] ?? 1e9) > (dP[b] ?? 1e9)) [a, b] = [b, a]; }
        else if ((dN[a] ?? 1e9) < (dN[b] ?? 1e9)) [a, b] = [b, a];
        out.set(w, [a, b]);
      }
      return out;
    }

    // 随机故障候选
    faultCands() {
      const C = [], nm = this.nm, used = t => !!nm[t];
      this.wires.forEach(w => { const n = nm[w[0]]; C.push({ kind: 'wire', wref: w, cat: '断线 / 虚接', name: `线号 ${n ? PP.nlab(n) : '?'}：${PP.tplain(w[0])} ↔ ${PP.tplain(w[1])} 这根线断了` }); });
      for (const d of this.ex.devs) {
        const v = DEV[d], L = v.lab, st = (a, b, name) => { if (used(d + '.' + a) && used(d + '.' + b)) C.push({ kind: 'stuck', a: d + '.' + a, b: d + '.' + b, cat: '触点粘连 / 卡住', name }); };
        const op = (a, b, name) => { if (used(d + '.' + a) && used(d + '.' + b)) C.push({ kind: 'open', a: d + '.' + a, b: d + '.' + b, cat: '触点接触不良', name }); };
        if (COIL_KINDS.has(v.kind) || v.kind === 'valve') { if (used(d + '.' + (v.kind === 'valve' ? '+' : 'A1'))) C.push({ kind: 'coil', dev: d, cat: '线圈烧坏', name: `${L} 线圈烧坏（开路）` }); }
        if (v.kind === 'km') { st('13', '14', `${L} 辅助触点 13–14 粘连`); st('1', '2', `${L} 主触点粘连`); }
        if (v.kind === 'kmx') { st('13', '14', `${L} 辅助常开 13–14 粘连`); op('21', '22', `${L} 辅助常闭 21–22 接触不良`); }
        if (v.kind === 'kt') st('67', '68', 'KT 延时触点 67–68 粘连');
        if (v.kind === 'ka') st('11', '14', `${L} 触点 11–14 粘连`);
        if (v.kind === 'btn') v.color === 'red' ? op('1', '2', `${L} 常闭触点接触不良`) : st('3', '4', `${L} 按钮卡住（一直接通）`);
        if (v.kind === 'estop') op('1', '2', '急停 SE 触点接触不良');
        if (v.kind === 'estop2') { op('11', '12', '急停 SE 第一组常闭 11–12 接触不良'); op('21', '22', '急停 SE 第二组常闭 21–22 接触不良'); }
        if (v.kind === 'sr') st('13', '14', '安全继电器输出 13–14 粘连');
        if (v.kind === 'fr' || v.kind === 'frc') op('95', '96', 'FR 常闭 95–96 接触不良');
        if (v.kind === 'vi' && used(d + '.1')) C.push({ kind: 'coil', dev: d, cat: '线圈烧坏', name: '阀岛 Y1 电磁线圈烧坏' });
        if (v.kind === 'lc' && used(d + '.BN')) C.push({ kind: 'sensor', dev: d, cat: '传感器损坏', name: '安全光栅 F1 损坏（OSSD 没输出）' });
        if (v.kind === 'pt' && used(d + '.+')) C.push({ kind: 'sensor', dev: d, cat: '传感器损坏', name: '压力变送器 B3 损坏（没电流）' });
        if ((v.kind === 'sensor' || v.kind === 'sensor2' || v.kind === 'reed') && used(d + '.BN')) C.push({ kind: 'sensor', dev: d, cat: '传感器损坏', name: `${L} ${v.kind === 'reed' ? '磁性开关' : '传感器'}损坏（检测不到）` });
        if ((v.kind === 'plc' || v.kind === 'plcr') && (this.ex.ladder || []).length) C.push({ kind: 'plcstop', dev: d, cat: 'PLC 故障', name: 'PLC 处于 STOP（程序没运行）' });
      }
      return C;
    }
  }
  PP.Lab = Lab;
})(typeof window !== 'undefined' ? window : globalThis);
