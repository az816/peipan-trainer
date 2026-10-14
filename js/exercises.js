// exercises.js — 全部接线练习：设备、线号（网络）、原理图、PLC 程序、试车步骤。
(function (G) {
  const PP = G.PP, { W, DOT, NL, TL, SRC, NOTE, contact, coil, fuse, triple, motor, MK, diode, lamp, sensor } = PP.S;
  const on = (r, d) => !!r.on[d];
  const P = (r, k) => !!(r.on['PLC:' + k] || r.on['PLCR:' + k]);
  const ctlFail = '断电后打开「万用表」蜂鸣档，从 FU 下口开始沿着线号一段段量通断（按钮要按住再量），哪段不通毛病就在哪。';
  const step = (ev, act, exp, ok, fail, note) => ({ ev, act, exp, ok, fail: fail || (() => ''), note });

  // ---------- 继电控制原理图 ----------
  const head = x => SRC(x, 16, 'L') + W('L', [[x, 24], [x, 50]]) + fuse(x, 50) + W('1', [[x, 80], [x, 100]]) + NL('1', x - 12, 94)
    + contact(x, 100, { dev: 'FRC', type: 'NC', act: 'th', t1: '95', t2: '96' }) + W('2', [[x, 140], [x, 160]]) + NL('2', x - 12, 154)
    + contact(x, 160, { dev: 'SB1', type: 'NC', act: 'btn', t1: '1', t2: '2' });

  const schIO = (type, ka) => () => {
    const sd = type === 'NPN' ? 'SN' : 'SP', yT = 40, yB = 320, sx = 75;
    const top = [sx, 185, ...(type === 'NPN' ? [215] : []), ...(ka ? [245] : [])];
    const bot = [sx, 185, ...(type === 'PNP' ? [215] : []), ...(ka ? [245, 320] : [])];
    let s = W('p24', [[24, yT], [Math.max(...top), yT]]) + W('n0', [[24, yB], [Math.max(...bot), yB]]);
    s += NL('p24', 24, yT - 8, '+24V', 'start') + NL('n0', 24, yB + 17, '0V', 'start') + TL(Math.max(...top), yT - 8, '← 来自 PS', 'end');
    top.forEach(x => (s += DOT('p24', x, yT))); bot.forEach(x => (s += DOT('n0', x, yB)));
    s += W('p24', [[sx, yT], [sx, 91]]) + W('fBN', [[sx, 99], [sx, 150]]) + MK(sx, 95, 'X1:1', sx + 8, 99);
    s += W('fBU', [[sx, 200], [sx, 261]]) + W('n0', [[sx, 269], [sx, yB]]) + MK(sx, 265, 'X1:2', sx + 8, 269);
    s += W('fBK', [[sx + 25, 175], [136, 175]]) + MK(140, 175, 'X1:3', 140, 163, 'middle') + W('i0', [[144, 175], [170, 175]]);
    s += NL('fBN', sx - 6, 128, '棕 +24V') + NL('fBU', sx - 6, 236, '蓝 0V') + NL('fBK', 118, 192, '黑', 'middle') + NL('i0', 157, 192, '101', 'middle');
    s += sensor(sd, sx, 150, type);
    s += W('p24', [[185, yT], [185, 110]]) + W('n0', [[185, 250], [185, yB]]);
    s += type === 'NPN' ? W('p24', [[215, yT], [215, 110]]) : W('n0', [[215, 250], [215, yB]]);
    if (ka) s += W('p24', [[245, yT], [245, 110]]) + W('n0', [[245, 250], [245, yB]]) + W('q0', [[260, 175], [320, 175], [320, 200]]) + NL('q0', 290, 168, '301', 'middle') + coil(320, 200, 'KA') + W('n0', [[320, 222], [320, yB]]);
    const bw = ka ? 90 : 62;
    s += `<g class="sym" data-dev="PLC"><rect class="s fill" x="170" y="110" width="${bw}" height="140"/><text class="sl" x="${170 + bw / 2}" y="214" text-anchor="middle">PLC</text>`;
    s += TL(185, 124, 'L+', 'middle') + TL(185, 244, 'M', 'middle') + (type === 'NPN' ? TL(215, 124, '1M', 'middle') : TL(215, 244, '1M', 'middle')) + TL(174, 179, 'I0.0');
    if (ka) s += TL(245, 124, '3L+', 'middle') + TL(245, 244, '3M', 'middle') + TL(256, 179, 'Q0.0', 'end');
    return s + '</g>';
  };

  // ---------- 网络（线号） ----------
  const field = s => [
    { id: 'fBN', lab: '+24V', col: 'bn', terms: ['X1.1b', s + '.BN'] },
    { id: 'fBU', lab: '0V', col: 'bu', terms: ['X1.2b', s + '.BU'] },
    { id: 'fBK', lab: '101', col: 'bk', terms: ['X1.3b', s + '.BK'] }];
  const ctlHead = [{ id: 'L', terms: ['XT1.L', 'FU.1'] }, { id: '1', terms: ['FU.2', 'FRC.95'] }, { id: '2', terms: ['FRC.96', 'SB1.1'] }];
  const NETS = {
    hold: [{ id: 'L', terms: ['XT1.L', 'FU.1'] }, { id: '1', terms: ['FU.2', 'FR.95'] }, { id: '2', terms: ['FR.96', 'SB1.1'] }, { id: '3', terms: ['SB1.2', 'SB2.3', 'KM.13'] }, { id: '4', terms: ['SB2.4', 'KM.14', 'KM.A1'] }, { id: 'N', terms: ['KM.A2', 'XT1.N'] }],
    main: [{ id: 'L1', ph: 1, terms: ['XT3.L1', 'QF.1'] }, { id: 'L2', ph: 2, terms: ['XT3.L2', 'QF.3'] }, { id: 'L3', ph: 3, terms: ['XT3.L3', 'QF.5'] },
      { id: 'U11', ph: 1, terms: ['QF.2', 'KM.1'] }, { id: 'V11', ph: 2, terms: ['QF.4', 'KM.3'] }, { id: 'W11', ph: 3, terms: ['QF.6', 'KM.5'] },
      { id: 'U12', ph: 1, terms: ['KM.2', 'FR.1'] }, { id: 'V12', ph: 2, terms: ['KM.4', 'FR.3'] }, { id: 'W12', ph: 3, terms: ['KM.6', 'FR.5'] },
      { id: 'U', ph: 1, terms: ['FR.2', 'M.U'] }, { id: 'V', ph: 2, terms: ['FR.4', 'M.V'] }, { id: 'W', ph: 3, terms: ['FR.6', 'M.W'] }],
    fwdrev: [...ctlHead, { id: '3', terms: ['SB1.2', 'SB2.3', 'KC1.13', 'SB3.3', 'KC2.13'] }, { id: '4', terms: ['SB2.4', 'KC1.14', 'KC2.21'] }, { id: '5', terms: ['KC2.22', 'KC1.A1'] },
      { id: '6', terms: ['SB3.4', 'KC2.14', 'KC1.21'] }, { id: '7', terms: ['KC1.22', 'KC2.A1'] }, { id: 'N', terms: ['KC1.A2', 'KC2.A2', 'XT1.N'] }],
    seq: [...ctlHead, { id: '3', terms: ['SB1.2', 'SB2.3', 'KC1.13'] }, { id: '4', terms: ['SB2.4', 'KC1.14', 'KC1.A1', 'SB3.3', 'KC2.13'] }, { id: '5', terms: ['SB3.4', 'KC2.14', 'KC2.A1'] }, { id: 'N', terms: ['KC1.A2', 'KC2.A2', 'XT1.N'] }],
    yd: [...ctlHead, { id: '3', terms: ['SB1.2', 'SB2.3', 'KC1.13'] }, { id: '4', terms: ['SB2.4', 'KC1.14', 'KC1.A1', 'KT.A1', 'KT.55', 'KT.67', 'KC3.13'] },
      { id: '5', terms: ['KT.56', 'KC3.21'] }, { id: '6', terms: ['KC3.22', 'KC2.A1'] }, { id: '7', terms: ['KT.68', 'KC3.14', 'KC2.21'] }, { id: '8', terms: ['KC2.22', 'KC3.A1'] },
      { id: 'N', terms: ['KC1.A2', 'KT.A2', 'KC2.A2', 'KC3.A2', 'XT1.N'] }],
    npn: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLC.L+', 'PLC.1M', 'X1.1t'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLC.M', 'X1.2t'] }, { id: 'i0', lab: '101', terms: ['X1.3t', 'PLC.I0.0'] }, ...field('SN')],
    pnp: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLC.L+', 'X1.1t'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLC.M', 'PLC.1M', 'X1.2t'] }, { id: 'i0', lab: '101', terms: ['X1.3t', 'PLC.I0.0'] }, ...field('SP')],
    combo: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLC.L+', 'PLC.3L+', 'X1.1t'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLC.M', 'PLC.1M', 'PLC.3M', 'X1.2t', 'KA.A2'] }, { id: 'i0', lab: '101', terms: ['X1.3t', 'PLC.I0.0'] }, { id: 'q0', lab: '301', terms: ['PLC.Q0.0', 'KA.A1'] }, ...field('SP')],
    two: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLC.L+', 'X1.1t'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLC.M', 'PLC.1M'] }, { id: 'i0', lab: '101', terms: ['X1.2t', 'PLC.I0.0'] },
      { id: 'fBN', lab: '+24V', col: 'bn', terms: ['X1.1b', 'S2.BN'] }, { id: 'fBU', lab: '101', col: 'bu', terms: ['X1.2b', 'S2.BU'] }],
    cyl: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLC.L+', 'PLC.3L+', 'SB2.3', 'X1.3t'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLC.M', 'PLC.1M', 'PLC.3M', 'X1.2t'] },
      { id: 'i0', lab: '101', terms: ['SB2.4', 'PLC.I0.0'] }, { id: 'i1', lab: '102', terms: ['X1.4t', 'PLC.I0.1'] }, { id: 'q0', lab: '301', terms: ['PLC.Q0.0', 'X1.1t'] },
      { id: 'fYp', lab: '301', col: 'p', terms: ['X1.1b', 'YV.+'] }, { id: 'fYn', lab: '0V', col: 'n', terms: ['X1.2b', 'YV.-'] }, { id: 'fBN', lab: '+24V', col: 'bn', terms: ['X1.3b', 'B1.BN'] }, { id: 'fBU', lab: '102', col: 'bu', terms: ['X1.4b', 'B1.BU'] }],
    diode: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLC.L+', 'PLC.3L+'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLC.M', 'PLC.3M', 'X1.2t'] }, { id: 'q0', lab: '301', terms: ['PLC.Q0.0', 'X1.1t'] },
      { id: 'fYp', lab: '301', col: 'p', terms: ['X1.1b', 'YV2.+', 'D1.K'] }, { id: 'fYn', lab: '0V', col: 'n', terms: ['X1.2b', 'YV2.-', 'D1.A'] }],
    relay: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLCR.L+', 'PLCR.2L'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLCR.M', 'HL.X2'] }, { id: 'q1', lab: '302', terms: ['PLCR.Q0.1', 'HL.X1'] },
      { id: 'L', terms: ['XT1B.L', 'FUB.1'] }, { id: '1', terms: ['FUB.2', 'PLCR.1L'] }, { id: 'q0', lab: '301', terms: ['PLCR.Q0.0', 'KMC.A1'] }, { id: 'N', terms: ['KMC.A2', 'XT1B.N'] }],
    estop: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLC.L+', 'PLC.3L+'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLC.M', 'PLC.3M', 'KA2.A2'] }, { id: 'q0', lab: '301', terms: ['PLC.Q0.0', 'KA2.A1'] },
      { id: 'L', terms: ['XT1B.L', 'FUB.1'] }, { id: '1', terms: ['FUB.2', 'SE.1'] }, { id: '2', terms: ['SE.2', 'KA2.11'] }, { id: '3', terms: ['KA2.14', 'KMC.A1'] }, { id: 'N', terms: ['KMC.A2', 'XT1B.N'] }],
    plcfr: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLC.L+', 'PLC.3L+', 'SB1.1', 'SB2.3', 'SB3.3'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLC.M', 'PLC.1M', 'PLC.3M', 'KD1.A2', 'KD2.A2'] },
      { id: 'i0', lab: '101', terms: ['SB2.4', 'PLC.I0.0'] }, { id: 'i1', lab: '102', terms: ['SB3.4', 'PLC.I0.1'] }, { id: 'i2', lab: '103', terms: ['SB1.2', 'PLC.I0.2'] },
      { id: 'q0', lab: '301', terms: ['PLC.Q0.0', 'KD2.21'] }, { id: 'q0b', lab: '303', terms: ['KD2.22', 'KD1.A1'] }, { id: 'q1', lab: '302', terms: ['PLC.Q0.1', 'KD1.21'] }, { id: 'q1b', lab: '304', terms: ['KD1.22', 'KD2.A1'] }],
    twoloc: [...ctlHead, { id: '3', terms: ['SB1.2', 'SB4.1'] }, { id: '4', terms: ['SB4.2', 'SB2.3', 'SB3.3', 'KC1.13'] }, { id: '5', terms: ['SB2.4', 'SB3.4', 'KC1.14', 'KC1.A1'] }, { id: 'N', terms: ['KC1.A2', 'XT1.N'] }],
    lamp: [{ id: 'L', terms: ['XT1.L', 'FU.1'] }, { id: '1', terms: ['FU.2', 'FRC.95', 'KC1.21'] }, { id: '2', terms: ['FRC.96', 'SB1.1'] }, { id: '3', terms: ['SB1.2', 'SB2.3', 'KC1.13'] },
      { id: '4', terms: ['SB2.4', 'KC1.14', 'KC1.A1', 'HLG.X1'] }, { id: '5', terms: ['KC1.22', 'HLR.X1'] }, { id: 'N', terms: ['KC1.A2', 'HLG.X2', 'HLR.X2', 'XT1.N'] }],
    delay: [...ctlHead, { id: '3', terms: ['SB1.2', 'SB2.3', 'KC1.13'] }, { id: '4', terms: ['SB2.4', 'KC1.14', 'KC1.A1', 'KT.A1', 'KT.67'] }, { id: '5', terms: ['KT.68', 'KC2.A1'] }, { id: 'N', terms: ['KC1.A2', 'KT.A2', 'KC2.A2', 'XT1.N'] }],
    plclamp: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLC.L+', 'PLC.3L+', 'SB2.3'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLC.M', 'PLC.1M', 'PLC.3M', 'HL.X2'] },
      { id: 'i0', lab: '101', terms: ['SB2.4', 'PLC.I0.0'] }, { id: 'q0', lab: '301', terms: ['PLC.Q0.0', 'HL.X1'] }],
    srelay: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'SR.A1', 'SR.13'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'SR.A2', 'KD1.A2'] },
      { id: 'c1a', lab: 'S11', terms: ['SR.S11', 'SE2.11'] }, { id: 'c1b', lab: 'S12', terms: ['SE2.12', 'SR.S12'] }, { id: 'c2a', lab: 'S21', terms: ['SR.S21', 'SE2.21'] }, { id: 'c2b', lab: 'S22', terms: ['SE2.22', 'SR.S22'] },
      { id: 'r1', lab: 'S33', terms: ['SR.S33', 'SB2.3'] }, { id: 'r2', lab: 'S34', terms: ['SB2.4', 'SR.S34'] }, { id: 'q', lab: '401', terms: ['SR.14', 'KD1.A1'] }],
    stepper: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLC.L+', 'PLC.3L+', 'DRV.V+', 'SB2.3'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLC.M', 'PLC.1M', 'PLC.3M', 'DRV.GND', 'DRV.PUL-', 'DRV.DIR-'] },
      { id: 'i0', lab: '101', terms: ['SB2.4', 'PLC.I0.0'] }, { id: 'q0', lab: '301', terms: ['PLC.Q0.0', 'DRV.PUL+'] }, { id: 'q1', lab: '302', terms: ['PLC.Q0.1', 'DRV.DIR+'] },
      { id: 'ma', lab: 'A+', col: 'rd', terms: ['DRV.A+', 'STP.A+'] }, { id: 'mb', lab: 'A-', col: 'bu', terms: ['DRV.A-', 'STP.A-'] }, { id: 'mc', lab: 'B+', col: 'gn', terms: ['DRV.B+', 'STP.B+'] }, { id: 'md', lab: 'B-', col: 'bk', terms: ['DRV.B-', 'STP.B-'] }],
    servo: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLC.L+', 'PLC.3L+', 'SVD.24V', 'SVD.COM'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLC.M', 'PLC.1M', 'PLC.3M', 'SVD.0V'] },
      { id: 'L', terms: ['XT1B.L', 'FUB.1'] }, { id: '1', terms: ['FUB.2', 'SVD.L1'] }, { id: 'N', terms: ['SVD.L2', 'XT1B.N'] },
      { id: 'i0', lab: '101', terms: ['SVD.RDY', 'PLC.I0.0'] }, { id: 'q0', lab: '301', terms: ['PLC.Q0.0', 'SVD.PUL'] }, { id: 'q1', lab: '302', terms: ['PLC.Q0.1', 'SVD.SON'] },
      { id: 'mU', lab: 'U', col: 'rd', terms: ['SVD.U', 'SVM.U'] }, { id: 'mV', lab: 'V', col: 'wh', terms: ['SVD.V', 'SVM.V'] }, { id: 'mW', lab: 'W', col: 'bk', terms: ['SVD.W', 'SVM.W'] }, { id: 'mPE', lab: 'PE', col: 'pe', terms: ['SVD.PE', 'SVM.PE'] }],
    lcurtain: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'SR.A1', 'SR.13', 'LC.BN'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'SR.A2', 'KD1.A2', 'LC.BU'] },
      { id: 'o1', lab: 'OSSD1', terms: ['LC.BK', 'SR.S12'] }, { id: 'o2', lab: 'OSSD2', terms: ['LC.WH', 'SR.S22'] },
      { id: 'r1', lab: 'S33', terms: ['SR.S33', 'SB2.3'] }, { id: 'r2', lab: 'S34', terms: ['SB2.4', 'SR.S34'] }, { id: 'q', lab: '401', terms: ['SR.14', 'KD1.A1'] }],
    valveisl: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'PLC.L+', 'PLC.3L+', 'SB2.3'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'PLC.M', 'PLC.1M', 'PLC.3M', 'X1.3t'] },
      { id: 'i0', lab: '101', terms: ['SB2.4', 'PLC.I0.0'] }, { id: 'q0', lab: '301', terms: ['PLC.Q0.0', 'X1.1t'] }, { id: 'q1', lab: '302', terms: ['PLC.Q0.1', 'X1.2t'] },
      { id: 'f1', lab: '301', col: 'p', terms: ['X1.1b', 'VI.1'] }, { id: 'f2', lab: '302', col: 'p', terms: ['X1.2b', 'VI.2'] }, { id: 'f3', lab: '0V', col: 'n', terms: ['X1.3b', 'VI.COM'] }],
    analog: [{ id: 'p24', lab: '+24V', col: 'p', terms: ['PS.+V', 'AIM.L+', 'X1.1t'] }, { id: 'n0', lab: '0V', col: 'n', terms: ['PS.-V', 'AIM.M', 'AIM.0-'] },
      { id: 'a1', lab: '+24V', col: 'bn', terms: ['X1.1b', 'PT.+'] }, { id: 'a2', lab: '201', col: 'bu', terms: ['PT.-', 'X1.2b'] }, { id: 'a3', lab: '201', terms: ['X1.2t', 'AIM.0+'] }],
  };

  // ---------- 试车步骤 ----------
  function diagIO(r, type, o = {}) {
    if (!r.power) return '';
    if (!P(r, 'pw')) return 'PLC 没上电（RUN 灯不亮）：PLC 的 L+ 接 +24V，M 接 0V。';
    const sd = type === 'NPN' ? 'SN' : 'SP';
    if (type !== '2W') {
      if (r.on[sd + ':rev']) return '传感器电源<b>接反</b>了：棕线 BN 经 X1:1 接 +24V，蓝线 BU 经 X1:2 接 0V。真传感器接反可能烧坏。';
      if (!r.on[sd + ':pw']) return '传感器没电：棕线 BN 经 X1:1 接 +24V，蓝线 BU 经 X1:2 接 0V。用万用表直流电压档量传感器 BN 和 BU 之间，应该是 24V。';
    }
    if (!P(r, 'I0.0')) {
      if (type === 'NPN') return '传感器灯亮了，但 PLC 的 I0.0 不亮。<b>NPN 动作时黑线输出 0V</b>，所以公共端 <b>1M 必须接 +24V</b>，电流才能从 1M 流进、从 I0.0 流出。再查黑线 BK 是否经 X1:3 接到 I0.0。';
      if (type === 'PNP') return '传感器灯亮了，但 PLC 的 I0.0 不亮。<b>PNP 动作时黑线输出 +24V</b>，所以公共端 <b>1M 必须接 0V</b>。再查黑线 BK 是否经 X1:3 接到 I0.0。';
      return '两线制传感器动作了，但 I0.0 不亮：它像个开关串在输入回路里——棕线经 X1:1 接 +24V，蓝线经 X1:2 接 I0.0，1M 接 0V。';
    }
    if (o.ka) {
      if (!P(r, 'qok')) return 'I0.0 亮了，Q0.0 灯也亮了，但输出点没有电源：3L+ 要接 +24V，3M 要接 0V。';
      if (!on(r, 'KA')) return 'Q0.0 有输出，KA 不吸合：Q0.0 接 KA 的 A1，KA 的 A2 接 0V。';
    }
    return '';
  }
  const TIO = (type, ka) => [
    step('power_on', '送电', ka ? 'RUN 亮，I0.0 灭，KA 不吸合' : 'RUN 亮，I0.0 灭', r => r.power && P(r, 'pw') && (type === '2W' || r.on[(type === 'NPN' ? 'SN' : 'SP') + ':pw']) && !P(r, 'I0.0') && !(ka && on(r, 'KA')),
      r => (P(r, 'I0.0') ? '没放工件 I0.0 就亮了：检查信号线和公共端 1M 的接法。' : diagIO(r, type, { ka }))),
    step('target_on', '点「放工件」', ka ? '传感器灯亮，I0.0 亮，KA 吸合' : '传感器灯亮，I0.0 亮', r => P(r, 'I0.0') && (!ka || on(r, 'KA')), r => diagIO(r, type, { ka }),
      type === 'NPN' ? 'NPN 把 I0.0 拉到 0V，电流从 1M（+24V）流进 PLC，从 I0.0 流出。' : type === 'PNP' ? 'PNP 把 +24V 送到 I0.0，电流从 I0.0 流进 PLC，从 1M（0V）流出。' : '两线制传感器导通，+24V 经它送到 I0.0。'),
    step('target_off', '点「拿走工件」', ka ? 'I0.0 灭，KA 释放' : 'I0.0 灭', r => !P(r, 'I0.0') && !(ka && on(r, 'KA')), () => '拿走工件 I0.0 还亮：信号线可能直接接到了电源上。')];

  const T = {
    jog: [
      step('power_on', '送电', 'KM 不吸合', r => r.power && !on(r, 'KM'), () => '一送电 KM 就吸合：SB2 被短接了，或者线圈直接接在了 L 和 N 上。'),
      step('press_SB2', '按住 SB2', 'KM 吸合', r => on(r, 'KM'), () => '按住 SB2 KM 不吸合。' + ctlFail),
      step('release_SB2', '松开 SB2', 'KM 释放', r => !on(r, 'KM'), () => '松手 KM 还吸着：点动回路不该有自锁，检查是不是多接了 KM 13–14。', '这就是点动：按住才动，松手就停。')],
    hold: [
      step('power_on', '送电', 'KM 不吸合', r => r.power && !on(r, 'KM'), () => '一送电 KM 就吸合：SB2 被短接了，或者自锁触点接错了位置。'),
      step('press_SB2', '按住 SB2', 'KM 吸合', r => on(r, 'KM'), () => '按住 SB2 KM 不吸合。看一下 FR 是不是处于过载状态。' + ctlFail),
      step('release_SB2', '松开 SB2', 'KM 保持吸合（自锁）', r => on(r, 'KM'), () => '松手就断，自锁没接对。KM 的 13–14 要和 SB2 <b>并联</b>：13 接线号 3，14 接线号 4。', '自锁成功：KM 自己的 13–14 替 SB2 接通了线号 3 和 4。'),
      step('press_SB1', '按住 SB1', 'KM 释放', r => !on(r, 'KM'), () => '按停止停不下来：13–14 可能并在了 SB1 两端，把停止按钮短路了；或者 SB1 没串在回路里。'),
      step('release_SB1', '松开 SB1', 'KM 仍然释放', r => !on(r, 'KM'), () => '松开 SB1 又自己启动了：自锁触点并错了位置。'),
      step('press_SB2', '再按 SB2 启动', 'KM 吸合', r => on(r, 'KM'), () => '再次启动不了。' + ctlFail),
      step('trip_on', '松手后点「模拟电机过载」', 'KM 释放', r => !on(r, 'KM'), () => 'FR 过载跳开后 KM 还吸着：95–96 没串进控制回路，它应该在线号 1 和 2 之间。', '过载保护正常：FR 的 95–96 断开，切断了线圈。')],
    main: [
      step('power_on', '送电（合 QF）', '电机不转', r => r.power && r.motor === 'stop', r => (r.power ? 'KM 没吸合电机就有电：主触点被短接了。' : '')),
      step('press_KM', '按住「手动吸合 KM」', '电机正转', r => r.motor === 'fwd', r => (r.motor === 'rev' ? '电机<b>反转</b>：相序接反了，U V W 中有两根交叉了。现场常用办法是任意对调两相。' : r.motor === 'loss' ? '<b>缺相</b>：有一相没接通，或者两根线接到了同一相。真实电机缺相会嗡嗡响、发烫。用万用表交流电压档量 U-V、V-W、U-W，三个都该是 380V。' : '电机不转：顺着 L1→QF→KM→FR→U 逐相查。'), '三相按 L1→U、L2→V、L3→W 送到了电机。'),
      step('release_KM', '松开', '电机停止', r => r.motor === 'stop', () => '松开后电机还转：KM 主触点被短接了。')],
    fwdrev: [
      step('power_on', '送电', 'KM1、KM2 都不吸合', r => r.power && !on(r, 'KC1') && !on(r, 'KC2'), () => '一送电就有接触器吸合：检查 SB2/SB3 有没有被短接。'),
      step('press_SB2', '按住 SB2（正转）', 'KM1 吸合', r => on(r, 'KC1') && !on(r, 'KC2'), () => '按正转 KM1 不吸合：查线号 3→SB2→4→KM2 的 21–22→5→KM1 线圈。'),
      step('release_SB2', '松开 SB2', 'KM1 保持（自锁）', r => on(r, 'KC1'), () => 'KM1 松手就断：KM1 的 13–14 要并在 SB2 两端（线号 3 和 4）。'),
      step('press_SB3', '按住 SB3（反转）', 'KM2 吸不上，KM1 继续（互锁）', r => on(r, 'KC1') && !on(r, 'KC2'), r => (r.why === 'excl' ? '<b>两个接触器同时吸合</b>，主回路相间短路，跳闸了！互锁没接：KM1 的常闭 21–22 要串在 KM2 线圈回路里，KM2 的 21–22 串在 KM1 线圈回路里。' : 'KM1 被放掉了：检查 SB3 和自锁的接法。'), '互锁生效：KM1 的常闭 21–22 断开了，KM2 线圈回路接不通。'),
      step('release_SB3', '松开 SB3', 'KM1 继续正转', r => on(r, 'KC1') && !on(r, 'KC2')),
      step('press_SB1', '按住 SB1（停止）', '全部释放', r => !on(r, 'KC1') && !on(r, 'KC2'), () => '按停止停不下来：SB1 要串在公共的线号 2→3 上。'),
      step('release_SB1', '松开 SB1', '保持停止', r => !on(r, 'KC1') && !on(r, 'KC2')),
      step('press_SB3', '按住 SB3（反转）', 'KM2 吸合', r => on(r, 'KC2') && !on(r, 'KC1'), () => '按反转 KM2 不吸合：查线号 3→SB3→6→KM1 的 21–22→7→KM2 线圈。'),
      step('release_SB3', '松开 SB3', 'KM2 保持（自锁）', r => on(r, 'KC2'), () => 'KM2 的 13–14 要并在 SB3 两端（线号 3 和 6）。', '正反转都正常，而且“先停再转”。')],
    seq: [
      step('power_on', '送电', '都不吸合', r => r.power && !on(r, 'KC1') && !on(r, 'KC2')),
      step('press_SB3', '先按住 SB3（启动 M2）', 'KM2 吸不上（M1 没启动）', r => !on(r, 'KC2'), () => 'M1 没启动 M2 就能单独启动了：KM2 的控制回路要从 KM1 自锁触点之后（线号 4）接出来。', '顺序控制生效：M1 没启动，M2 不能启动。'),
      step('release_SB3', '松开 SB3', '都不吸合', r => !on(r, 'KC1') && !on(r, 'KC2')),
      step('press_SB2', '按住 SB2（启动 M1）', 'KM1 吸合', r => on(r, 'KC1'), () => '按 SB2 KM1 不吸合。' + ctlFail),
      step('release_SB2', '松开 SB2', 'KM1 保持', r => on(r, 'KC1'), () => 'KM1 的 13–14 要并在 SB2 两端。'),
      step('press_SB3', '按住 SB3（启动 M2）', 'KM2 吸合', r => on(r, 'KC1') && on(r, 'KC2'), () => 'M1 运行了 M2 还启动不了：查线号 4→SB3→5→KM2 线圈。'),
      step('release_SB3', '松开 SB3', 'M1、M2 都运行', r => on(r, 'KC1') && on(r, 'KC2'), () => 'KM2 的 13–14 要并在 SB3 两端（线号 4 和 5）。'),
      step('press_SB1', '按住 SB1（总停）', '全部释放', r => !on(r, 'KC1') && !on(r, 'KC2'), () => 'SB1 要串在最前面（线号 2→3）。', 'M1 一停，M2 也跟着停，因为 M2 的电是从 KM1 后面取的。')],
    yd: [
      step('power_on', '送电', '都不吸合', r => r.power && !on(r, 'KC1') && !on(r, 'KC2') && !on(r, 'KC3')),
      step('press_SB2', '按住 SB2（启动）', 'KM1、KM2 吸合：星形（Y）启动', r => on(r, 'KC1') && on(r, 'KC2') && !on(r, 'KC3') && on(r, 'KT'), r => (!on(r, 'KC1') ? 'KM1 不吸合。' + ctlFail : !on(r, 'KT') ? 'KT 线圈没电：KT 的 A1 接线号 4，A2 接 N。' : !on(r, 'KC2') ? 'KM2（星形）不吸合：查线号 4→KT 55–56→5→KM3 21–22→6→KM2 线圈。' : 'KM3 不该这时吸合：检查 KT 67–68 和 KM3 自锁的接法。'), 'KT 开始计时，3 秒后切换。'),
      step('release_SB2', '松开 SB2', 'KM1 保持，继续启动', r => on(r, 'KC1') && (on(r, 'KC2') || on(r, 'KC3')), () => 'KM1 松手就断：KM1 的 13–14 要并在 SB2 两端。'),
      step('kt_done', '等 3 秒（KT 延时到）', 'KM2 释放、KM3 吸合：三角形（Δ）运行', r => on(r, 'KC1') && on(r, 'KC3') && !on(r, 'KC2'), r => (r.why === 'excl' ? 'KM2 和 KM3 同时吸合，主回路短路！星三角之间必须互锁：KM2 的 21–22 串在 KM3 线圈回路，KM3 的 21–22 串在 KM2 线圈回路。' : !on(r, 'KC3') ? 'KM3 没吸合：查线号 4→KT 67–68→7→KM2 21–22→8→KM3 线圈，以及 KM3 13–14 自锁。' : 'KM2 没放开：KT 的 55–56 要串在 KM2 线圈回路里（线号 4→5）。'), '星三角切换完成：先星形降压启动，再三角形全压运行。'),
      step('press_SB1', '按住 SB1（停止）', '全部释放', r => !on(r, 'KC1') && !on(r, 'KC2') && !on(r, 'KC3'), () => 'SB1 要串在最前面（线号 2→3）。')],
    cyl: [
      step('power_on', '送电', 'RUN 亮，气缸缩回，I0.0、I0.1 灭', r => r.power && P(r, 'pw') && !on(r, 'YV') && !P(r, 'I0.0') && !P(r, 'I0.1'), r => (!P(r, 'pw') ? 'PLC 没上电：L+ 接 +24V，M 接 0V。' : '没按按钮就有动作：检查按钮和输出的接法。')),
      step('press_SB2', '按住 SB2', 'I0.0 亮 → Q0.0 输出 → 气缸伸出 → B1 亮、I0.1 亮', r => P(r, 'I0.0') && on(r, 'YV') && P(r, 'I0.1'), r => {
        if (!P(r, 'I0.0')) return '按钮按了 I0.0 不亮：SB2 一头接 +24V，另一头接 I0.0；<b>1M 要接 0V</b>（按钮送进来的是 +24V，公共端就接 0V）。';
        if (!P(r, 'qok')) return 'Q0.0 灯亮了但输出没电：3L+ 接 +24V，3M 接 0V。';
        if (!on(r, 'YV')) return '电磁阀没得电：+ 经 X1:1 接 Q0.0，- 经 X1:2 接 0V。';
        return '气缸伸出了，但 I0.1 不亮：两线制磁性开关的棕线经 X1:3 接 +24V，蓝线经 X1:4 接 I0.1。';
      }, '完整闭环：按钮 → PLC → 电磁阀 → 气缸 → 磁性开关 → PLC。程序就靠 I0.1 知道“气缸到位了”。'),
      step('release_SB2', '松开 SB2', '气缸缩回，I0.1 灭', r => !on(r, 'YV') && !P(r, 'I0.1'), () => '松开后气缸不回：检查 Q0.0 是不是被直接接到了 +24V。')],
    diode: [
      step('power_on', '送电', '电磁阀不动作', r => r.power && P(r, 'pw') && !on(r, 'YV2'), r => (!P(r, 'pw') ? 'PLC 没上电：L+ 接 +24V，M 接 0V。' : '')),
      step('hmi_on', '点「触摸屏：启动」', '电磁阀得电', r => on(r, 'YV2'), r => (!P(r, 'qok') ? '输出点没电：3L+ 接 +24V，3M 接 0V。' : '电磁阀没得电：+ 经 X1:1 接 Q0.0，- 经 X1:2 接 0V。')),
      step('hmi_off', '点「触摸屏：停止」', '电磁阀失电，关断尖峰被二极管吸收', r => !on(r, 'YV2') && r.diodeOk, r => (on(r, 'YV2') ? '电磁阀没断电。' : '<b>没有并续流二极管</b>（或者没并在线圈两端）。电感线圈断电瞬间会产生很高的反向电压尖峰。PLC 晶体管输出内部一般有钳位保护，但尖峰会让输出管发热、产生干扰；继电器输出和没有内部保护的场合<b>必须加</b>。D1 的阴极 K 接线圈 +，阳极 A 接线圈 -。'), '续流二极管正常：断电时线圈电流经二极管慢慢消耗掉，保护了 Q0.0。')],
    relay: [
      step('power_on', '送电', 'KM、HL 都不动作', r => r.power && P(r, 'pw') && !on(r, 'KMC') && !on(r, 'HL'), r => (!P(r, 'pw') ? 'PLC 没上电：L+ 接 +24V，M 接 0V。' : '')),
      step('hmi_on', '点「触摸屏：启动」', 'KM 吸合（220V），HL 亮（24V）', r => on(r, 'KMC') && on(r, 'HL'), r => (!on(r, 'KMC') ? 'KM 不吸合：Q0.0 这一组的公共端 <b>1L 要接 220V 的 L（经 FU）</b>，Q0.0 接 KM 的 A1，A2 接 N。' : r.on['HL:burn'] ? '指示灯被接到 220V 上烧了！HL 是 24V 灯。' : 'HL 不亮：Q0.1 这一组的公共端 <b>2L 接 +24V</b>，Q0.1 接 HL 的 X1，X2 接 0V。'), '继电器输出的好处：同一个 PLC，一组带 220V 线圈，另一组带 24V 灯。'),
      step('hmi_off', '点「触摸屏：停止」', '都停', r => !on(r, 'KMC') && !on(r, 'HL'))],
    estop: [
      step('power_on', '送电', 'KA、KM 不吸合', r => r.power && P(r, 'pw') && !on(r, 'KA2') && !on(r, 'KMC'), r => (!P(r, 'pw') ? 'PLC 没上电：L+ 接 +24V，M 接 0V。' : '')),
      step('hmi_on', '点「触摸屏：启动」', 'KA 吸合 → KM 吸合', r => on(r, 'KA2') && on(r, 'KMC'), r => (!P(r, 'qok') ? '输出点没电：3L+ 接 +24V，3M 接 0V。' : !on(r, 'KA2') ? 'KA 不吸合：Q0.0 接 KA 的 A1，A2 接 0V。' : 'KA 吸合了 KM 不吸：220V 回路 L→FU→急停 SE→KA 11–14→KM A1，A2→N 查一遍。'), '24V 的 PLC 通过 KA 去控制 220V 的 KM，强电弱电隔开了。'),
      step('estop_on', '点「拍下急停」', 'KM 立即释放', r => !on(r, 'KMC'), () => '拍急停 KM 不停！急停 SE 的常闭触点没串在 KM 线圈回路里（应该在线号 1 和 2 之间）。这是<b>严重安全问题</b>。', '急停直接切断 KM 线圈的 220V，不经过 PLC 程序。安全回路必须硬接线。'),
      step('hmi_off', '点「触摸屏：停止」', 'KA 释放', r => !on(r, 'KA2')),
      step('estop_off', '点「旋转复位急停」', 'KM 保持释放（不会自己启动）', r => !on(r, 'KMC'), () => '', '复位急停后设备不会自己启动，必须重新给启动命令。真实设备里急停信号还要接进 PLC，让程序同时停止输出。')],
    plcfr: [
      step('power_on', '送电', 'RUN 亮，I0.2 亮（停止按钮是常闭），KM1/KM2 不吸', r => r.power && P(r, 'pw') && P(r, 'I0.2') && !on(r, 'KD1') && !on(r, 'KD2'), r => (!P(r, 'pw') ? 'PLC 没上电：L+ 接 +24V，M 接 0V。' : !P(r, 'I0.2') ? '<b>I0.2 不亮</b>：停止按钮 SB1 是常闭，平时就该有信号。SB1 的 1 接 +24V，2 接 I0.2，1M 接 0V。程序里用的是 I0.2 的常开触点，没信号就启动不了。' : '')),
      step('press_SB2', '按住 SB2（正转）', 'I0.0 亮 → Q0.0 → KM1 吸合', r => on(r, 'KD1'), r => (!P(r, 'I0.0') ? 'I0.0 不亮：SB2 的 3 接 +24V，4 接 I0.0。' : !P(r, 'qok') ? '输出没电：3L+ 接 +24V，3M 接 0V。' : !on(r, 'KD1') ? 'Q0.0 亮了 KM1 不吸：Q0.0 → KM2 的 21–22 → KM1 的 A1，A2 接 0V。' : '')),
      step('release_SB2', '松开 SB2', 'KM1 保持（程序自锁）', r => on(r, 'KD1'), () => '', '程序里 Q0.0 的常开触点并在 I0.0 上，这就是梯形图里的自锁。'),
      step('press_SB3', '按住 SB3（反转）', 'KM2 不吸合（程序互锁 + 硬件互锁）', r => on(r, 'KD1') && !on(r, 'KD2'), r => (r.why === 'excl' ? '两个接触器同时吸合，主回路短路！' : '')),
      step('release_SB3', '松开 SB3', 'KM1 继续', r => on(r, 'KD1') && !on(r, 'KD2')),
      step('press_SB1', '按住 SB1（停止）', 'I0.2 灭 → 全停', r => !on(r, 'KD1') && !on(r, 'KD2'), () => '按停止停不了：检查 SB1 → I0.2 的接线。'),
      step('release_SB1', '松开 SB1', '保持停止', r => !on(r, 'KD1') && !on(r, 'KD2')),
      step('press_SB3', '按住 SB3（反转）', 'KM2 吸合', r => on(r, 'KD2') && !on(r, 'KD1'), r => (!P(r, 'I0.1') ? 'I0.1 不亮：SB3 的 3 接 +24V，4 接 I0.1。' : 'Q0.1 亮了 KM2 不吸：Q0.1 → KM1 的 21–22 → KM2 的 A1，A2 接 0V。')),
      step('release_SB3', '松开 SB3', 'KM2 保持', r => on(r, 'KD2'), () => '', '先停再转，程序互锁加接触器常闭的硬件互锁，双保险。')],
    twoloc: [
      step('power_on', '送电', 'KM1 不吸合', r => r.power && !on(r, 'KC1'), () => '一送电就吸合：启动按钮被短接了，或者自锁触点接错了位置。'),
      step('press_SB2', '按住 SB2（甲地启动）', 'KM1 吸合', r => on(r, 'KC1'), () => '甲地启动不了。' + ctlFail),
      step('release_SB2', '松开 SB2', 'KM1 保持（自锁）', r => on(r, 'KC1'), () => 'KM1 的 13–14 要和两个启动按钮<b>并联</b>：13 接线号 4，14 接线号 5。'),
      step('press_SB4', '按住 SB4（乙地停止）', 'KM1 释放', r => !on(r, 'KC1'), () => '乙地停止按了没反应：<b>两个停止按钮要串联</b>，SB4 的 1–2 串在线号 3 和 4 之间。查一下是不是被跨接短路了。', '停止按钮串联：任何一个按下，回路就断。'),
      step('release_SB4', '松开 SB4', '保持停止', r => !on(r, 'KC1')),
      step('press_SB3', '按住 SB3（乙地启动）', 'KM1 吸合', r => on(r, 'KC1'), () => '乙地启动不了：<b>两个启动按钮要并联</b>，SB3 的 3 接线号 4、4 接线号 5。'),
      step('release_SB3', '松开 SB3', 'KM1 保持', r => on(r, 'KC1')),
      step('press_SB1', '按住 SB1（甲地停止）', 'KM1 释放', r => !on(r, 'KC1'), () => 'SB1 要串在线号 2→3 上。', '两地控制口诀：<b>启动并联，停止串联</b>。')],
    lamp: [
      step('power_on', '送电', 'KM1 不吸合，停止灯 HL2 亮，运行灯 HL1 灭', r => r.power && !on(r, 'KC1') && on(r, 'HLR') && !on(r, 'HLG'), r => (on(r, 'HLG') ? '没启动运行灯就亮了：HL1 要接在线号 4（KM1 线圈那一段），不能接在线号 1。' : !on(r, 'HLR') ? '停止灯不亮：线号 1 → KM1 的常闭 21–22 → 线号 5 → HL2 的 X1，X2 接 N。' : '')),
      step('press_SB2', '按住 SB2（启动）', 'KM1 吸合，HL1 亮、HL2 灭', r => on(r, 'KC1') && on(r, 'HLG') && !on(r, 'HLR'), r => (!on(r, 'KC1') ? 'KM1 不吸合。' + ctlFail : !on(r, 'HLG') ? '运行灯不亮：HL1 和 KM1 线圈<b>并联</b>，X1 接线号 4，X2 接 N。' : '停止灯没灭：HL2 要经过 KM1 的<b>常闭</b> 21–22，不能用常开。'), '运行灯和线圈并联，线圈有电它就亮；停止灯走常闭，一吸合就灭。'),
      step('release_SB2', '松开 SB2', 'KM1 保持，HL1 一直亮', r => on(r, 'KC1') && on(r, 'HLG'), () => 'KM1 的 13–14 要并在 SB2 两端（线号 3 和 4）。'),
      step('press_SB1', '按住 SB1（停止）', 'KM1 释放，HL2 亮', r => !on(r, 'KC1') && on(r, 'HLR') && !on(r, 'HLG'), () => '按停止后灯不对：停止灯走 KM1 常闭 21–22，运行灯并在线圈上。'),
      step('release_SB1', '松开 SB1', '保持停止', r => !on(r, 'KC1'))],
    delay: [
      step('power_on', '送电', '都不吸合', r => r.power && !on(r, 'KC1') && !on(r, 'KC2') && !on(r, 'KT'), () => '一送电就有动作：检查 SB2 有没有被短接。'),
      step('press_SB2', '按住 SB2（启动）', 'KM1 吸合，KT 开始计时，KM2 先不吸', r => on(r, 'KC1') && on(r, 'KT') && !on(r, 'KC2'), r => (!on(r, 'KC1') ? 'KM1 不吸合。' + ctlFail : !on(r, 'KT') ? 'KT 线圈没电：A1 接线号 4，A2 接 N。' : 'KM2 一按就吸合了：KM2 线圈要经过 KT 的<b>延时闭合</b>触点 67–68，不能直接接线号 4。'), 'M1 先启动，KT 开始数 3 秒。'),
      step('release_SB2', '松开 SB2', 'KM1 保持，KT 继续计时', r => on(r, 'KC1') && on(r, 'KT'), () => 'KM1 的 13–14 要并在 SB2 两端（线号 3 和 4），KT 也接在线号 4 上才能保持。'),
      step('kt_done', '等 3 秒（KT 延时到）', 'KM2 自动吸合', r => on(r, 'KC1') && on(r, 'KC2'), () => '延时到了 KM2 不吸合：线号 4 → KT 67–68 → 线号 5 → KM2 的 A1，A2 接 N。', '延时顺序启动：M1 先转，3 秒后 M2 自动启动，常用在“先开油泵 / 风机，再开主机”。'),
      step('press_SB1', '按住 SB1（停止）', '全部释放', r => !on(r, 'KC1') && !on(r, 'KC2') && !on(r, 'KT'), () => 'SB1 要串在最前面（线号 2→3）。')],
    plclamp: [
      step('power_on', '送电', 'RUN 亮，I0.0 灭，HL 灭', r => r.power && P(r, 'pw') && !P(r, 'I0.0') && !on(r, 'HL'), r => (!P(r, 'pw') ? 'PLC 没上电（RUN 灯不亮）：L+ 接 +24V，M 接 0V。' : P(r, 'I0.0') ? '没按按钮 I0.0 就亮了：I0.0 被直接接到了 +24V。' : '没按按钮灯就亮了：HL 的 X1 要接 Q0.0，不能直接接 +24V。')),
      step('press_SB2', '按住 SB2', 'I0.0 亮 → Q0.0 输出 → HL 亮', r => P(r, 'I0.0') && on(r, 'HL'), r => (!P(r, 'I0.0') ? '按了 I0.0 不亮：SB2 的 3 接 +24V，4 接 I0.0；<b>1M 要接 0V</b>（按钮送进来的是 +24V）。' : !P(r, 'qok') ? 'Q0.0 灯亮了但输出没电：3L+ 接 +24V，3M 接 0V。' : 'HL 不亮：Q0.0 接 HL 的 X1，X2 接 0V。'), '最基本的 PLC 回路：输入 → 程序 → 输出。看 PLC 上 I0.0、Q0.0 的灯，就知道信号走到了哪一步。'),
      step('release_SB2', '松开 SB2', 'I0.0 灭，HL 灭', r => !P(r, 'I0.0') && !on(r, 'HL'), () => '松手灯还亮：检查 HL 是不是直接接在了 +24V 上。')],
    srelay: [
      step('power_on', '送电', 'POWER、CH.1、CH.2 亮，KM 不吸合（要先复位）', r => r.power && r.on['SR:pw'] && r.on['SR:c1'] && r.on['SR:c2'] && !on(r, 'SR') && !on(r, 'KD1'),
        r => (!r.on['SR:pw'] ? '安全继电器没电：A1 接 +24V，A2 接 0V。' : !r.on['SR:c1'] ? '通道 1 不通：S11 → 急停第一组常闭 11–12 → S12。' : !r.on['SR:c2'] ? '通道 2 不通：S21 → 急停第二组常闭 21–22 → S22。' : '一送电 KM 就吸合了：复位端 S33–S34 被短接了，或者 KM 线圈没经过安全输出 13–14。安全回路<b>上电不能自己启动</b>。')),
      step('press_SB2', '按住 SB2（复位）', 'OUT 亮，KM 吸合', r => on(r, 'SR') && on(r, 'KD1'), r => (!on(r, 'SR') ? '复位没起作用：S33 → SB2 的 3，SB2 的 4 → S34。' : '安全继电器吸合了，KM 没吸：13 接 +24V，14 接 KM 的 A1，A2 接 0V。')),
      step('release_SB2', '松开 SB2', 'KM 保持吸合', r => on(r, 'KD1'), () => '松开复位就掉：检查两个通道是不是都接好了。'),
      step('estop_on', '点「拍下急停」', 'KM 立即释放', r => !on(r, 'KD1'), () => '拍急停 KM 不停！两个通道都要经过急停的常闭触点，KM 线圈只能从安全输出 13–14 取电。这是<b>严重安全问题</b>。', '急停同时断开两个通道，安全继电器立即切断输出。'),
      step('estop_off', '点「旋转复位急停」', 'KM 保持释放（不会自己启动）', r => !on(r, 'KD1'), () => '急停一松开设备就自己启动了：复位端被短接了。安全规定：急停复位后必须人再按一次复位才能启动。'),
      step('press_SB2', '再按 SB2（复位）', 'KM 吸合', r => on(r, 'KD1'), () => '复位后不能重新启动：查 S33、S34 和复位按钮。', '双通道：一个通道的线断了或触点粘住，另一个通道还能保证停下来，安全继电器还会自检出故障。')],
    stepper: [
      step('power_on', '送电', 'PLC RUN，驱动器 PWR 亮，电机不转', r => r.power && P(r, 'pw') && r.on['DRV:pw'] && !r.on['DRV:run'], r => (!P(r, 'pw') ? 'PLC 没上电：L+ 接 +24V，M 接 0V。' : !r.on['DRV:pw'] ? '驱动器没电：V+ 接 +24V，GND 接 0V（实际驱动器一般 24–48V 供电，看铭牌）。' : '没给启动电机就转了：PUL+ 不能直接接 +24V，要接 PLC 的 Q0.0。')),
      step('hmi_on', '点「触摸屏：启动」', 'Q0.0 发脉冲 → 电机正转', r => r.on['DRV:run'] === 'fwd', r => {
        const run = r.on['DRV:run'];
        if (!P(r, 'qok')) return 'Q0.0 灯亮了但输出没电：3L+ 接 +24V，3M 接 0V。';
        if (!r.on['DRV:pul']) return '驱动器收不到脉冲：Q0.0 接 PUL+，PUL- 接 0V（共阴接法）。很多驱动器信号输入是 5V，用 24V 要选 24V 版本或串电阻，以说明书为准。';
        if (run === 'shake') return '电机<b>抖动不转</b>：A、B 两相接混了。A+、A− 是一相，B+、B− 是另一相，按电机线的颜色或说明书接。';
        if (run === 'rev') return '电机反转了：同一相的两根线（A+ 和 A−）接反了。对调同一相的两根就能换向。';
        return '电机不转：查驱动器 A+ A− B+ B− 到电机四根线。';
      }, '步进电机：每来一个脉冲转一小步，脉冲越快转得越快。'),
      step('press_SB2', '按住 SB2（换方向）', 'I0.0 亮 → Q0.1 → 电机反转', r => r.on['DRV:run'] === 'rev', r => (!P(r, 'I0.0') ? 'I0.0 不亮：SB2 的 3 接 +24V，4 接 I0.0，1M 接 0V。' : !r.on['DRV:dir'] ? '方向信号没到驱动器：Q0.1 接 DIR+，DIR− 接 0V。' : '电机没换向。'), '方向信号 DIR 一变，电机就反着转。'),
      step('release_SB2', '松开 SB2', '电机正转', r => r.on['DRV:run'] === 'fwd'),
      step('hmi_off', '点「触摸屏：停止」', '电机停', r => !r.on['DRV:run'])],
    servo: [
      step('power_on', '送电', 'PLC RUN，驱动器显示 rdY，I0.0 亮（伺服准备好），电机不转', r => r.power && P(r, 'pw') && r.on['SVD:rdy'] && P(r, 'I0.0') && !on(r, 'SVD'),
        r => (!P(r, 'pw') ? 'PLC 没上电：L+ 接 +24V，M 接 0V。' : !r.on['SVD:cpw'] ? '驱动器控制电没有：24V 接 +24V，0V 接 0V。' : !r.on['SVD:mpw'] ? '驱动器主电没有：L1 经 FU 接 L，L2 接 N（AC220V）。显示不出 rdY。' : !P(r, 'I0.0') ? '驱动器准备好了，PLC 不知道：COM 接 +24V，RDY 接 I0.0，1M 接 0V。' : '没给使能电机就转了：查 SON、PUL 是不是直接接到了 +24V。')),
      step('hmi_on', '点「触摸屏：启动」', 'Q0.1 使能（SON）、Q0.0 发脉冲 → 电机转', r => on(r, 'SVD'), r => (r.on['SVD:alm'] ? '<b>驱动器报警 AL！</b>U、V、W 没有和电机一一对应。伺服电机<b>不能</b>像普通电机那样对调两相来换向，接错会报警，严重时会飞车。U 接 U、V 接 V、W 接 W。' : !P(r, 'qok') ? '输出点没电：3L+ 接 +24V，3M 接 0V。' : !r.on['SVD:son'] ? '没有使能：Q0.1 接驱动器 SON。' : '有使能没脉冲：Q0.0 接驱动器 PUL。'), '伺服：先使能（SON），再给脉冲；方向和速度都由脉冲决定，换向改程序，不改线。'),
      step('hmi_off', '点「触摸屏：停止」', '电机停，驱动器回到 rdY', r => !on(r, 'SVD') && r.on['SVD:rdy'])],
    lcurtain: [
      step('power_on', '送电', '光栅绿灯，安全继电器两个通道亮，KM 不吸合（要先复位）', r => r.power && on(r, 'LC') && r.on['SR:c1'] && r.on['SR:c2'] && !on(r, 'KD1') && !on(r, 'SR'),
        r => (!r.on['LC:pw'] ? '光栅没电：棕线 BN 接 +24V，蓝线 BU 接 0V。' : !r.on['SR:pw'] ? '安全继电器没电：A1 接 +24V，A2 接 0V。' : !r.on['SR:c1'] ? '通道 1 没信号：光栅 OSSD1（黑）接安全继电器 S12。' : !r.on['SR:c2'] ? '通道 2 没信号：光栅 OSSD2（白）接 S22。' : '一送电 KM 就吸合：复位端被短接了，或者 KM 线圈没经过安全输出 13–14。')),
      step('press_SB2', '按住 SB2（复位）', 'KM 吸合', r => on(r, 'KD1'), r => (!on(r, 'SR') ? '复位没起作用：S33 → SB2 的 3，SB2 的 4 → S34。' : '13 接 +24V，14 接 KM 的 A1，A2 接 0V。')),
      step('release_SB2', '松开 SB2', 'KM 保持吸合', r => on(r, 'KD1')),
      step('target_on', '点「伸手进光栅」', 'KM 立即释放', r => !on(r, 'KD1'), () => '手伸进去了 KM 还吸着！两路 OSSD 都要接到安全继电器，KM 只能从 13–14 取电。', '光栅一被挡住，两路 OSSD 同时断开，安全继电器立刻切断输出。'),
      step('target_off', '点「手拿出来」', 'KM 保持释放（不会自己启动）', r => !on(r, 'KD1'), () => '手拿出来设备就自己动了：复位端被短接了。必须人确认安全后再按复位。'),
      step('press_SB2', '再按 SB2（复位）', 'KM 吸合', r => on(r, 'KD1'), () => '复位后起不来：查复位按钮的两根线。', '光栅输出 OSSD 是两路晶体管输出，光栅自己会互相检测，所以要接带 OSSD 输入的安全继电器或安全 PLC，不能直接接普通 PLC 去停机。')],
    valveisl: [
      step('power_on', '送电', 'PLC RUN，阀岛灯都不亮', r => r.power && P(r, 'pw') && !r.on['VI:1'] && !r.on['VI:2'], r => (!P(r, 'pw') ? 'PLC 没上电：L+ 接 +24V，M 接 0V。' : '没给信号阀就动了：阀的针脚不能直接接 +24V。')),
      step('hmi_on', '点「触摸屏：启动」', 'Q0.0 → 1 号阀得电（灯亮）', r => r.on['VI:1'], r => (!P(r, 'qok') ? '输出点没电：3L+ 接 +24V，3M 接 0V。' : '1 号阀不动作：Q0.0 → X1:1 → 阀岛插头 1 号针；阀岛 <b>COM 要接 0V</b>（PNP 型阀岛；NPN 型阀岛 COM 接 +24V，看型号）。')),
      step('press_SB2', '按住 SB2', 'I0.0 → Q0.1 → 2 号阀也得电', r => r.on['VI:1'] && r.on['VI:2'], r => (!P(r, 'I0.0') ? 'I0.0 不亮：SB2 的 3 接 +24V，4 接 I0.0，1M 接 0V。' : '2 号阀不动作：Q0.1 → X1:2 → 阀岛 2 号针。'), '阀岛把很多个电磁阀装在一块底板上，用一根多芯电缆（或总线）接线，比一个阀一根线省事得多。'),
      step('release_SB2', '松开 SB2', '2 号阀失电', r => r.on['VI:1'] && !r.on['VI:2']),
      step('hmi_off', '点「触摸屏：停止」', '1 号阀失电', r => !r.on['VI:1'])],
    analog: [
      step('power_on', '送电', 'AI 读数 4.0 mA（压力 0）', r => r.power && r.on['AIM:ma'] === 4, r => (!r.on['AIM:pw'] ? '模块没电：L+ 接 +24V，M 接 0V。' : '读数 0 mA：<b>回路不通或者极性反了</b>。+24V → X1:1 → 变送器 +，变送器 − → X1:2 → AI 0+，AI 0− 接 0V。4–20mA 的好处：断线时电流是 0，PLC 能判断出“断线”，而不是当成压力为 0。'), '两线制变送器：电源和信号走同一对线，变送器像一个“会变的电阻”串在回路里。0 压力是 4mA，不是 0mA。'),
      step('target_on', '点「给管路加压」', '读数升到 12.0 mA（压力 50%）', r => r.on['AIM:ma'] === 12, () => '读数没变：检查变送器那一路。', '4mA = 0，20mA = 满量程，12mA 就是一半。PLC 程序里把 4–20mA 换算成压力。'),
      step('target_off', '点「泄压」', '读数回到 4.0 mA', r => r.on['AIM:ma'] === 4)],
  };

  // ---------- 练习 ----------
  const fromChain = (nets, drop = [], add = []) => {
    const k = w => w.join('|');
    const d = new Set(drop.map(k));
    return [...PP.chain({ nets }).filter(w => !d.has(k(w))), ...add];
  };
  const DC_SRC = { 'PS.+V': '+24', 'PS.-V': '0V' };
  const BASE = {
    jog: { name: '点动控制', devs: ['XT1', 'FU', 'KM', 'SB2'], sources: { 'XT1.L': 'L', 'XT1.N': 'N' },
      nets: [{ id: 'L', terms: ['XT1.L', 'FU.1'] }, { id: '1', terms: ['FU.2', 'SB2.3'] }, { id: '2', terms: ['SB2.4', 'KM.A1'] }, { id: 'N', terms: ['KM.A2', 'XT1.N'] }],
      goal: '按住绿色按钮 SB2，接触器 KM 吸合；一松手 KM 就释放。只有 4 个线号、4 根线，最适合第一次练。',
      test: T.jog, vb: '0 0 240 300', field: '柜门按钮',
      sch: () => SRC(120, 16, 'L') + W('L', [[120, 24], [120, 50]]) + fuse(120, 50) + W('1', [[120, 80], [120, 120]]) + NL('1', 108, 104)
        + contact(120, 120, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + W('2', [[120, 160], [120, 200]]) + NL('2', 108, 184)
        + coil(120, 200, 'KM') + W('N', [[120, 222], [120, 262]]) + SRC(120, 282, 'N') },
    hold: { name: '启保停（自锁）', devs: ['XT1', 'FU', 'KM', 'FR', 'SB1', 'SB2'], sources: { 'XT1.L': 'L', 'XT1.N': 'N' }, nets: NETS.hold,
      goal: '按一下 SB2 再松手，KM 也一直吸合；按 SB1 才停；FR 过载也会停。关键是 KM 的常开 13–14 和 SB2 <b>并联</b>，这叫<b>自锁</b>。',
      test: T.hold, vb: '0 0 290 450', field: '柜门按钮',
      sch: () => SRC(120, 16, 'L') + W('L', [[120, 24], [120, 50]]) + fuse(120, 50) + W('1', [[120, 80], [120, 110]]) + NL('1', 108, 99)
        + contact(120, 110, { dev: 'FR', type: 'NC', act: 'th', t1: '95', t2: '96' }) + W('2', [[120, 150], [120, 180]]) + NL('2', 108, 169)
        + contact(120, 180, { dev: 'SB1', type: 'NC', act: 'btn', t1: '1', t2: '2' })
        + W('3', [[120, 220], [120, 260]]) + W('3', [[120, 240], [210, 240], [210, 260]]) + DOT('3', 120, 240) + NL('3', 108, 236)
        + contact(120, 260, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + contact(210, 260, { dev: 'KM', type: 'NO', t1: '13', t2: '14', side: 'right' })
        + W('4', [[120, 300], [120, 350]]) + W('4', [[210, 300], [210, 322], [120, 322]]) + DOT('4', 120, 322) + NL('4', 108, 340)
        + coil(120, 350, 'KM') + W('N', [[120, 372], [120, 412]]) + SRC(120, 432, 'N') },
    main: { name: '电机主回路', devs: ['XT3', 'QF', 'KM', 'FR', 'M'], sources: { 'XT3.L1': 'L1', 'XT3.L2': 'L2', 'XT3.L3': 'L3' }, nets: NETS.main,
      goal: '三相电从 L1 L2 L3 依次经过 <b>QF → KM 主触点 → FR 热元件</b> 送到电机 U V W。三相各走各的，<b>千万不能串相</b>。线色按国内配电惯例：黄 L1、绿 L2、红 L3（设备厂也常用全黑线 + 线号管）。',
      test: T.main, vb: '0 0 260 400', field: '现场电机',
      sch: () => {
        const xs = [70, 110, 150], ph = ['L1', 'L2', 'L3'], n1 = ['U11', 'V11', 'W11'], n2 = ['U12', 'V12', 'W12']; let s = '';
        xs.forEach((x, i) => { s += SRC(x, 16, ph[i]) + W(ph[i], [[x, 24], [x, 50]]) + W(n1[i], [[x, 90], [x, 130]]) + NL(n1[i], x + 3, 114, n1[i], 'start') + W(n2[i], [[x, 170], [x, 210]]) + NL(n2[i], x + 3, 194, n2[i], 'start'); });
        s += triple(xs, 50, 'qf', 'QF') + triple(xs, 130, 'km', 'KM') + triple(xs, 210, 'fr', 'FR');
        s += W('U', [[70, 250], [70, 296], [94, 326]]) + W('V', [[110, 250], [110, 314]]) + W('W', [[150, 250], [150, 296], [126, 326]]);
        return s + NL('U', 64, 282, 'U') + NL('V', 104, 282, 'V') + NL('W', 144, 282, 'W') + motor(110, 342, 28);
      } },
    fwdrev: { name: '正反转互锁', devs: ['XT1', 'FU', 'FRC', 'KC1', 'KC2', 'SB1', 'SB2', 'SB3'], sources: { 'XT1.L': 'L', 'XT1.N': 'N' }, nets: NETS.fwdrev,
      names: { SB2: '正转', SB3: '反转' }, excl: [['KC1', 'KC2']],
      goal: '主回路靠 KM1、KM2 对调两相来改转向，所以 <b>KM1 和 KM2 绝对不能同时吸合</b>，否则相间短路。办法是<b>电气互锁</b>：KM1 的常闭 21–22 串在 KM2 线圈前面，KM2 的常闭串在 KM1 线圈前面。',
      motorText: r => (on(r, 'KC1') ? '正转' : on(r, 'KC2') ? '反转' : ''),
      test: T.fwdrev, vb: '0 0 330 455', field: '柜门按钮',
      sch: () => head(100)
        + W('3', [[100, 200], [100, 240]]) + W('3', [[100, 222], [280, 222]]) + W('3', [[150, 222], [150, 240]]) + W('3', [[230, 222], [230, 240]]) + W('3', [[280, 222], [280, 240]]) + DOT('3', 100, 222) + DOT('3', 150, 222) + DOT('3', 230, 222) + NL('3', 88, 218)
        + contact(100, 240, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + contact(150, 240, { dev: 'KC1', type: 'NO', t1: '13', t2: '14' })
        + contact(230, 240, { dev: 'SB3', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + contact(280, 240, { dev: 'KC2', type: 'NO', t1: '13', t2: '14', side: 'right' })
        + W('4', [[100, 280], [100, 300]]) + W('4', [[150, 280], [150, 292], [100, 292]]) + DOT('4', 100, 292) + NL('4', 88, 292)
        + contact(100, 300, { dev: 'KC2', type: 'NC', t1: '21', t2: '22' }) + W('5', [[100, 340], [100, 370]]) + NL('5', 88, 358) + coil(100, 370, 'KC1')
        + W('6', [[230, 280], [230, 300]]) + W('6', [[280, 280], [280, 292], [230, 292]]) + DOT('6', 230, 292) + NL('6', 218, 292)
        + contact(230, 300, { dev: 'KC1', type: 'NC', t1: '21', t2: '22' }) + W('7', [[230, 340], [230, 370]]) + NL('7', 218, 358) + coil(230, 370, 'KC2')
        + W('N', [[100, 392], [100, 425], [230, 425]]) + W('N', [[230, 392], [230, 425]]) + SRC(100, 445, 'N') },
    yd: { name: '星三角降压启动', devs: ['XT1', 'FU', 'FRC', 'KC1', 'KC2', 'KC3', 'KT', 'SB1', 'SB2'], sources: { 'XT1.L': 'L', 'XT1.N': 'N' }, nets: NETS.yd,
      excl: [['KC2', 'KC3']],
      goal: '大电机直接启动电流太大，先接成<b>星形（Y）</b>降压启动（只有铭牌写 380V △ 的电机才能这样启动），几秒后切到<b>三角形（Δ）</b>全压运行。KM1 主接触器，KM2 星形，KM3 三角形，KT 时间继电器负责延时切换。<b>KM2 和 KM3 必须互锁</b>。',
      motorText: r => (on(r, 'KC1') && on(r, 'KC2') ? '星形（Y）启动' : on(r, 'KC1') && on(r, 'KC3') ? '三角形（Δ）运行' : ''),
      test: T.yd, vb: '0 0 380 510', field: '柜门按钮',
      sch: () => head(80)
        + W('3', [[80, 200], [80, 240]]) + W('3', [[80, 222], [130, 222], [130, 240]]) + DOT('3', 80, 222) + NL('3', 68, 218)
        + contact(80, 240, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + contact(130, 240, { dev: 'KC1', type: 'NO', t1: '13', t2: '14', side: 'right' })
        + W('4', [[80, 280], [80, 430]]) + W('4', [[130, 280], [130, 292], [80, 292]]) + W('4', [[80, 306], [340, 306]]) + W('4', [[160, 306], [160, 430]]) + W('4', [[230, 306], [230, 320]]) + W('4', [[290, 306], [290, 320]]) + W('4', [[340, 306], [340, 320]])
        + DOT('4', 80, 292) + DOT('4', 80, 306) + DOT('4', 160, 306) + DOT('4', 230, 306) + DOT('4', 290, 306) + NL('4', 68, 300)
        + contact(230, 320, { dev: 'KT', type: 'NC', act: 'timer', t1: '55', t2: '56' }) + W('5', [[230, 360], [230, 370]]) + NL('5', 224, 368)
        + contact(230, 370, { dev: 'KC3', type: 'NC', t1: '21', t2: '22' }) + W('6', [[230, 410], [230, 430]]) + NL('6', 224, 424) + coil(230, 430, 'KC2')
        + contact(290, 320, { dev: 'KT', type: 'NO', act: 'timer', t1: '67', t2: '68' }) + contact(340, 320, { dev: 'KC3', type: 'NO', t1: '13', t2: '14', side: 'right' })
        + W('7', [[290, 360], [290, 370]]) + W('7', [[340, 360], [340, 365], [290, 365]]) + DOT('7', 290, 365) + NL('7', 318, 361, '7', 'start')
        + contact(290, 370, { dev: 'KC2', type: 'NC', t1: '21', t2: '22' }) + W('8', [[290, 410], [290, 430]]) + NL('8', 284, 424) + coil(290, 430, 'KC3', { side: 'right' })
        + coil(80, 430, 'KC1') + coil(160, 430, 'KT')
        + W('N', [[80, 452], [80, 478], [290, 478]]) + W('N', [[160, 452], [160, 478]]) + W('N', [[230, 452], [230, 478]]) + W('N', [[290, 452], [290, 478]]) + DOT('N', 160, 478) + DOT('N', 230, 478) + SRC(80, 496, 'N') },
    seq: { name: '顺序启动', devs: ['XT1', 'FU', 'FRC', 'KC1', 'KC2', 'SB1', 'SB2', 'SB3'], sources: { 'XT1.L': 'L', 'XT1.N': 'N' }, nets: NETS.seq,
      names: { SB2: '启动M1', SB3: '启动M2' },
      goal: '传送带常见要求：<b>M1 先启动，M2 才能启动</b>；按总停全停。做法是 KM2 的控制回路从 KM1 自锁触点<b>之后</b>（线号 4）取电。',
      motorText: r => [on(r, 'KC1') && 'M1 运行', on(r, 'KC2') && 'M2 运行'].filter(Boolean).join('，'),
      test: T.seq, vb: '0 0 330 460', field: '柜门按钮',
      sch: () => head(100)
        + W('3', [[100, 200], [100, 240]]) + W('3', [[100, 222], [150, 222], [150, 240]]) + DOT('3', 100, 222) + NL('3', 88, 218)
        + contact(100, 240, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + contact(150, 240, { dev: 'KC1', type: 'NO', t1: '13', t2: '14' })
        + W('4', [[100, 280], [100, 380]]) + W('4', [[150, 280], [150, 292], [100, 292]]) + W('4', [[100, 306], [280, 306]]) + W('4', [[230, 306], [230, 320]]) + W('4', [[280, 306], [280, 320]])
        + DOT('4', 100, 292) + DOT('4', 100, 306) + DOT('4', 230, 306) + NL('4', 88, 300)
        + contact(230, 320, { dev: 'SB3', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + contact(280, 320, { dev: 'KC2', type: 'NO', t1: '13', t2: '14', side: 'right' })
        + W('5', [[230, 360], [230, 380]]) + W('5', [[280, 360], [280, 370], [230, 370]]) + DOT('5', 230, 370) + NL('5', 218, 376)
        + coil(100, 380, 'KC1') + coil(230, 380, 'KC2')
        + W('N', [[100, 402], [100, 430], [230, 430]]) + W('N', [[230, 402], [230, 430]]) + SRC(100, 450, 'N') },
    npn: { name: 'NPN 接近开关 → PLC', devs: ['PS', 'PLC', 'X1', 'SN'], sources: DC_SRC, nets: NETS.npn,
      ladder: [{ q: 'Q0.0', label: '有工件', e: ['NO', 'I0.0'] }], bitNames: { 'I0.0': '接近开关' },
      io: [['I0.0', 'S1', 'NPN 接近开关（黑线）']],
      goal: '把 NPN 三线接近开关经端子排 X1 接到 PLC 输入 I0.0。重点：<b>NPN 动作时输出 0V，所以 PLC 公共端 1M 接 +24V</b>。别忘了 PLC 自己的电源 L+ / M。',
      test: TIO('NPN', false), vb: '0 0 300 350', field: '现场（机器上的传感器）', sch: schIO('NPN', false) },
    pnp: { name: 'PNP 光电开关 → PLC', devs: ['PS', 'PLC', 'X1', 'SP'], sources: DC_SRC, nets: NETS.pnp,
      ladder: [{ q: 'Q0.0', label: '有工件', e: ['NO', 'I0.0'] }], bitNames: { 'I0.0': '光电开关' },
      io: [['I0.0', 'S1', 'PNP 光电开关（黑线）']],
      goal: '同样的位置换成 PNP 光电开关。和 NPN 比只有一处不同：<b>1M 改接 0V</b>。口诀：<b>PNP 接 0V，NPN 接 24V</b>。',
      test: TIO('PNP', false), vb: '0 0 300 350', field: '现场（机器上的传感器）', sch: schIO('PNP', false) },
    combo: { name: '传感器 → PLC → 中间继电器', devs: ['PS', 'PLC', 'KA', 'X1', 'SP'], sources: DC_SRC, nets: NETS.combo,
      ladder: [{ q: 'Q0.0', label: 'KA', e: ['NO', 'I0.0'] }], bitNames: { 'I0.0': '光电开关' },
      io: [['I0.0', 'S1', 'PNP 光电开关'], ['Q0.0', 'KA', '中间继电器线圈']],
      goal: '设备上最常见的信号链：传感器 → PLC 输入 → 程序 → PLC 输出 → 中间继电器 KA。输出点要自己的电源：<b>3L+ 接 +24V，3M 接 0V</b>。',
      test: TIO('PNP', true), vb: '0 0 360 350', field: '现场（机器上的传感器）', sch: schIO('PNP', true) },
    two: { name: '两线制接近开关', devs: ['PS', 'PLC', 'X1', 'S2'], sources: DC_SRC, nets: NETS.two,
      ladder: [{ q: 'Q0.0', label: '有工件', e: ['NO', 'I0.0'] }], bitNames: { 'I0.0': '两线制开关' },
      io: [['I0.0', 'S1', '两线制接近开关（蓝线）']],
      goal: '两线制只有棕、蓝两根线，它就像一个开关<b>串在 PLC 输入回路里</b>：棕线接 +24V，蓝线接 I0.0，1M 接 0V。注意它有漏电流，个别 PLC 不带它可能误亮。',
      test: TIO('2W', false), vb: '0 0 300 350', field: '现场（机器上的传感器）',
      sch: () => {
        const sx = 75, yT = 40, yB = 320;
        let s = W('p24', [[24, yT], [185, yT]]) + W('n0', [[24, yB], [215, yB]]) + NL('p24', 24, yT - 8, '+24V', 'start') + NL('n0', 24, yB + 17, '0V', 'start') + TL(185, yT - 8, '← 来自 PS', 'end') + DOT('p24', sx, yT) + DOT('n0', 185, yB);
        s += W('p24', [[sx, yT], [sx, 91]]) + MK(sx, 95, 'X1:1', sx + 8, 99) + W('fBN', [[sx, 99], [sx, 150]]) + NL('fBN', sx - 6, 128, '棕 +24V');
        s += `<g class="sym" data-dev="S2"><rect class="s fill" x="${sx - 25}" y="150" width="50" height="50"/><path class="s" d="M${sx} 158l9 9-9 9-9-9z"/><text class="tl" x="${sx}" y="194" text-anchor="middle" style="font-weight:700;fill:var(--ink)">2线</text><text class="sl" x="${sx - 30}" y="180" text-anchor="end">S1</text></g>`;
        s += W('fBU', [[sx, 200], [sx, 261]]) + NL('fBU', sx - 6, 236, '蓝 101') + MK(sx, 265, 'X1:2', sx + 8, 259) + W('i0', [[sx + 4, 265], [150, 265], [150, 215], [170, 215]]) + NL('i0', 112, 280, '101', 'middle');
        s += W('p24', [[185, yT], [185, 110]]) + W('n0', [[185, 250], [185, yB]]) + W('n0', [[215, 250], [215, yB]]);
        return s + `<g class="sym" data-dev="PLC"><rect class="s fill" x="170" y="110" width="62" height="140"/><text class="sl" x="201" y="180" text-anchor="middle">PLC</text>` + TL(185, 124, 'L+', 'middle') + TL(185, 244, 'M', 'middle') + TL(215, 244, '1M', 'middle') + TL(174, 219, 'I0.0') + '</g>';
      } },
    cyl: { name: '按钮 + 电磁阀 + 气缸 + 磁性开关', devs: ['PS', 'PLC', 'X1', 'SB2', 'YV', 'B1'], sources: DC_SRC, nets: NETS.cyl,
      names: { SB2: '伸出' },
      ladder: [{ q: 'Q0.0', label: '电磁阀 YV', e: ['NO', 'I0.0'] }], bitNames: { 'I0.0': '按钮SB2', 'I0.1': '伸出到位' },
      io: [['I0.0', 'SB2', '伸出按钮（常开）'], ['I0.1', 'B1', '磁性开关：伸出到位'], ['Q0.0', 'YV', '电磁阀线圈']],
      goal: '自动化设备最常见的闭环：按住 SB2 → PLC 输出 Q0.0 → 电磁阀 YV 得电 → 气缸伸出 → 缸体上的<b>磁性开关 B1</b> 检测到位 → I0.1 亮。现场的阀和磁性开关都要经端子排 X1。',
      test: T.cyl, vb: '0 0 380 350', field: '柜门按钮 / 现场气缸',
      sch: () => {
        const yT = 40, yB = 320;
        let s = W('p24', [[24, yT], [245, yT]]) + W('n0', [[24, yB], [330, yB]]) + NL('p24', 24, yT - 8, '+24V', 'start') + NL('n0', 24, yB + 17, '0V', 'start') + TL(245, yT - 8, '← 来自 PS', 'end');
        [50, 130, 185].forEach(x => (s += DOT('p24', x, yT))); [185, 215, 245].forEach(x => (s += DOT('n0', x, yB)));
        s += W('p24', [[50, yT], [50, 86]]) + MK(50, 90, 'X1:3', 58, 94) + W('fBN', [[50, 94], [50, 120]]) + contact(50, 120, { dev: 'B1', type: 'NO', act: 'mag', t1: 'BN', t2: 'BU' })
          + W('fBU', [[50, 160], [50, 221]]) + MK(50, 225, 'X1:4', 58, 219) + W('i1', [[54, 225], [170, 225]]) + NL('i1', 110, 240, '102', 'middle');
        s += W('p24', [[130, yT], [130, 110]]) + contact(130, 110, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + W('i0', [[130, 150], [130, 165], [170, 165]]) + NL('i0', 152, 160, '101', 'middle');
        s += W('p24', [[185, yT], [185, 110]]) + W('n0', [[185, 250], [185, yB]]) + W('n0', [[215, 250], [215, yB]]) + W('p24', [[245, yT], [245, 110]]) + W('n0', [[245, 250], [245, yB]]);
        s += `<g class="sym" data-dev="PLC"><rect class="s fill" x="170" y="110" width="100" height="140"/><text class="sl" x="220" y="200" text-anchor="middle">PLC</text>` + TL(185, 124, 'L+', 'middle') + TL(245, 124, '3L+', 'middle') + TL(185, 244, 'M', 'middle') + TL(215, 244, '1M', 'middle') + TL(245, 244, '3M', 'middle') + TL(174, 169, 'I0.0') + TL(174, 229, 'I0.1') + TL(266, 169, 'Q0.0', 'end') + '</g>';
        s += W('q0', [[270, 165], [330, 165], [330, 186]]) + NL('q0', 300, 158, '301', 'middle') + MK(330, 190, 'X1:1', 338, 194) + W('fYp', [[330, 194], [330, 215]]) + coil(330, 215, 'YV', { t: ['+', '-'], side: 'right', diode: true }) + W('fYn', [[330, 237], [330, 271]]) + MK(330, 275, 'X1:2', 338, 279) + W('n0', [[330, 279], [330, yB]]);
        return s;
      } },
    diode: { name: '电磁阀 + 续流二极管', devs: ['PS', 'PLC', 'X1', 'YV2', 'D1'], sources: DC_SRC, nets: NETS.diode, prog: 'hmi',
      ladder: [{ q: 'Q0.0', label: '电磁阀 YV', e: ['NO', 'M10.0'] }], bitNames: { 'M10.0': '触摸屏启动' },
      io: [['Q0.0', 'YV', '电磁阀（不带二极管）'], ['M10.0', 'HMI', '触摸屏启动按钮']],
      goal: '线圈是电感，断电瞬间会产生很高的反向电压尖峰，会干扰、损伤输出点。这个电磁阀插头不带保护，要在线圈两端<b>反向并一个续流二极管 D1</b>：<b>阴极 K（有色环那头）接 +，阳极 A 接 -</b>。接反了等于把输出短路。',
      test: T.diode, vb: '0 0 300 350', field: '现场电磁阀',
      sch: () => {
        const yT = 40, yB = 320;
        let s = W('p24', [[24, yT], [105, yT]]) + W('n0', [[24, yB], [200, yB]]) + NL('p24', 24, yT - 8, '+24V', 'start') + NL('n0', 24, yB + 17, '0V', 'start') + DOT('p24', 60, yT) + DOT('n0', 60, yB) + DOT('n0', 105, yB);
        s += W('p24', [[60, yT], [60, 110]]) + W('p24', [[105, yT], [105, 110]]) + W('n0', [[60, 250], [60, yB]]) + W('n0', [[105, 250], [105, yB]]);
        s += `<g class="sym" data-dev="PLC"><rect class="s fill" x="40" y="110" width="90" height="140"/><text class="sl" x="85" y="200" text-anchor="middle">PLC</text>` + TL(60, 124, 'L+', 'middle') + TL(105, 124, '3L+', 'middle') + TL(60, 244, 'M', 'middle') + TL(105, 244, '3M', 'middle') + TL(126, 169, 'Q0.0', 'end') + '</g>';
        s += W('q0', [[130, 165], [200, 165], [200, 186]]) + NL('q0', 165, 158, '301', 'middle') + MK(200, 190, 'X1:1', 208, 186) + W('fYp', [[200, 194], [200, 215]]) + W('fYp', [[200, 204], [250, 204], [250, 215]]) + DOT('fYp', 200, 204);
        s += coil(200, 215, 'YV2', { t: ['+', '-'] }) + diode(250, 215, 'D1');
        return s + W('fYn', [[200, 237], [200, 271]]) + W('fYn', [[250, 237], [250, 250], [200, 250]]) + DOT('fYn', 200, 250) + MK(200, 275, 'X1:2', 208, 279) + W('n0', [[200, 279], [200, yB]]);
      } },
    relay: { name: 'PLC 继电器输出（带 220V 和 24V）', devs: ['PS', 'PLCR', 'XT1B', 'FUB', 'KMC', 'HL'], sources: { ...DC_SRC, 'XT1B.L': 'L', 'XT1B.N': 'N' }, nets: NETS.relay, prog: 'hmi',
      ladder: [{ q: 'Q0.0', label: 'KM 线圈', e: ['NO', 'M10.0'] }, { q: 'Q0.1', label: '运行灯 HL', e: ['NO', 'M10.0'] }], bitNames: { 'M10.0': '触摸屏启动' },
      io: [['Q0.0', 'KM', '接触器线圈 AC220V（1L 组）'], ['Q0.1', 'HL', '运行指示灯 DC24V（2L 组）'], ['M10.0', 'HMI', '触摸屏启动按钮']],
      goal: '继电器输出型 PLC 的输出点是内部继电器的<b>触点</b>，每组有自己的公共端：<b>1L 接 220V 的 L</b>，这一组就能直接带 220V 的接触器线圈；<b>2L 接 +24V</b>，这一组带 24V 指示灯。同一组只能用一种电压。（端子编号做了简化，实际以 PLC 手册为准）',
      test: T.relay, vb: '0 0 360 350', field: '柜门指示灯',
      sch: () => {
        const yT = 40, yB = 320;
        let s = W('p24', [[24, yT], [170, yT]]) + W('n0', [[24, yB], [170, yB]]) + NL('p24', 24, yT - 8, '+24V', 'start') + NL('n0', 24, yB + 17, '0V', 'start') + DOT('p24', 60, yT) + DOT('n0', 60, yB);
        s += W('p24', [[60, yT], [60, 100]]) + W('p24', [[170, yT], [170, 100]]) + W('n0', [[60, 190], [60, yB]]);
        s += `<g class="sym" data-dev="PLCR"><rect class="s fill" x="40" y="100" width="160" height="90"/><text class="sl" x="95" y="148" text-anchor="middle">PLC</text><text class="tl" x="95" y="162" text-anchor="middle">继电器输出</text>` + TL(60, 114, 'L+', 'middle') + TL(60, 184, 'M', 'middle') + TL(160, 114, '2L', 'middle') + TL(160, 184, 'Q0.1', 'middle') + TL(196, 116, '1L', 'end') + TL(196, 178, 'Q0.0', 'end');
        s += `<path class="s dash" d="M200 120H188V130M188 160V170H200"/><line class="s thin" x1="188" y1="160" x2="182" y2="132"/><path class="s dash" d="M170 100V128M170 160V190"/><line class="s thin" x1="170" y1="160" x2="164" y2="130"/></g>`;
        s += W('q1', [[170, 190], [170, 230]]) + lamp(170, 230, 'HL') + W('n0', [[170, 252], [170, yB]]) + NL('q1', 164, 214, '302');
        s += SRC(300, 16, 'L') + W('L', [[300, 24], [300, 50]]) + fuse(300, 50, 'FUB') + W('1', [[300, 80], [300, 120], [200, 120]]) + NL('1', 250, 114, '1', 'middle')
          + W('q0', [[200, 170], [300, 170], [300, 230]]) + NL('q0', 250, 164, '301', 'middle') + coil(300, 230, 'KMC') + W('N', [[300, 252], [300, 300]]) + SRC(300, 318, 'N');
        return s + NOTE(100, 345, 'DC 24V') + NOTE(300, 345, 'AC 220V');
      } },
    estop: { name: '急停回路（PLC → KA → KM）', devs: ['PS', 'PLC', 'KA2', 'XT1B', 'FUB', 'KMC', 'SE'], sources: { ...DC_SRC, 'XT1B.L': 'L', 'XT1B.N': 'N' }, nets: NETS.estop, prog: 'hmi',
      ladder: [{ q: 'Q0.0', label: 'KA', e: ['NO', 'M10.0'] }], bitNames: { 'M10.0': '触摸屏启动' },
      io: [['Q0.0', 'KA', '中间继电器线圈 DC24V'], ['M10.0', 'HMI', '触摸屏启动按钮']],
      goal: 'PLC 只有 24V，通过中间继电器 KA 去控制 220V 的接触器 KM（强弱电隔离）。<b>急停 SE 的常闭触点直接串在 KM 线圈回路里</b>，拍下就断电，不依赖程序。',
      test: T.estop, vb: '0 0 360 360', field: '柜门急停',
      sch: () => {
        const yT = 40, yB = 300;
        let s = W('p24', [[20, yT], [100, yT]]) + W('n0', [[20, yB], [150, yB]]) + NL('p24', 20, yT - 8, '+24V', 'start') + NL('n0', 20, yB + 17, '0V', 'start') + DOT('p24', 50, yT) + DOT('n0', 50, yB) + DOT('n0', 100, yB);
        s += W('p24', [[50, yT], [50, 90]]) + W('p24', [[100, yT], [100, 90]]) + W('n0', [[50, 200], [50, yB]]) + W('n0', [[100, 200], [100, yB]]);
        s += `<g class="sym" data-dev="PLC"><rect class="s fill" x="30" y="90" width="90" height="110"/><text class="sl" x="75" y="150" text-anchor="middle">PLC</text>` + TL(50, 104, 'L+', 'middle') + TL(100, 104, '3L+', 'middle') + TL(50, 194, 'M', 'middle') + TL(100, 194, '3M', 'middle') + TL(116, 164, 'Q0.0', 'end') + '</g>';
        s += W('q0', [[120, 160], [150, 160], [150, 230]]) + NL('q0', 156, 200, '301', 'start') + coil(150, 230, 'KA2', { side: 'right' }) + W('n0', [[150, 252], [150, yB]]);
        s += `<line class="s dash" x1="205" y1="24" x2="205" y2="340"/>`;
        s += SRC(280, 16, 'L') + W('L', [[280, 24], [280, 50]]) + fuse(280, 50, 'FUB') + W('1', [[280, 80], [280, 110]]) + NL('1', 268, 99)
          + contact(280, 110, { dev: 'SE', type: 'NC', act: 'estop', t1: '1', t2: '2' }) + W('2', [[280, 150], [280, 190]]) + NL('2', 268, 174)
          + contact(280, 190, { dev: 'KA2', type: 'NO', t1: '11', t2: '14' }) + W('3', [[280, 230], [280, 270]]) + NL('3', 268, 254)
          + coil(280, 270, 'KMC') + W('N', [[280, 292], [280, 320]]) + SRC(280, 338, 'N');
        return s + NOTE(105, 345, 'DC 24V 控制') + NOTE(290, 355, 'AC 220V 控制');
      } },
    plcfr: { name: 'PLC 控制正反转', devs: ['PS', 'PLC', 'KD1', 'KD2', 'SB1', 'SB2', 'SB3'], sources: DC_SRC, nets: NETS.plcfr, excl: [['KD1', 'KD2']],
      names: { SB2: '正转', SB3: '反转' },
      ladder: [
        { q: 'Q0.0', label: '正转 KM1', e: ['ser', ['par', ['NO', 'I0.0'], ['NO', 'Q0.0']], ['NO', 'I0.2'], ['NC', 'Q0.1']] },
        { q: 'Q0.1', label: '反转 KM2', e: ['ser', ['par', ['NO', 'I0.1'], ['NO', 'Q0.1']], ['NO', 'I0.2'], ['NC', 'Q0.0']] }],
      bitNames: { 'I0.0': '正转', 'I0.1': '反转', 'I0.2': '停止(常闭)', 'Q0.0': '正转', 'Q0.1': '反转' },
      io: [['I0.0', 'SB2', '正转按钮（常开）'], ['I0.1', 'SB3', '反转按钮（常开）'], ['I0.2', 'SB1', '停止按钮（<b>常闭</b>）'], ['Q0.0', 'KM1', '正转接触器（DC24V 线圈）'], ['Q0.1', 'KM2', '反转接触器（DC24V 线圈）']],
      motorText: r => (on(r, 'KD1') ? '正转' : on(r, 'KD2') ? '反转' : ''),
      goal: '按钮进 PLC，PLC 输出带接触器。程序里做自锁和互锁（看下面梯形图），外部还要用接触器常闭触点做<b>硬件互锁</b>，双保险。停止按钮接的是<b>常闭</b>，所以程序里用 I0.2 的常开触点——这是 PLC 接线的老规矩：停止、急停用常闭，断线也能停。',
      test: T.plcfr, vb: '0 0 360 380', field: '柜门按钮',
      sch: () => {
        const yT = 40, yB = 340;
        let s = W('p24', [[20, yT], [245, yT]]) + W('n0', [[20, yB], [320, yB]]) + NL('p24', 20, yT - 8, '+24V', 'start') + NL('n0', 20, yB + 17, '0V', 'start');
        [40, 80, 120, 185].forEach(x => (s += DOT('p24', x, yT))); [185, 215, 245, 280].forEach(x => (s += DOT('n0', x, yB)));
        s += W('p24', [[40, yT], [40, 80]]) + contact(40, 80, { dev: 'SB1', type: 'NC', act: 'btn', t1: '1', t2: '2' }) + W('i2', [[40, 120], [40, 250], [170, 250]]) + NL('i2', 60, 246, '103', 'middle');
        s += W('p24', [[80, yT], [80, 80]]) + contact(80, 80, { dev: 'SB2', type: 'NO', t1: '3', t2: '4' }) + W('i0', [[80, 120], [80, 170], [170, 170]]) + NL('i0', 100, 166, '101', 'middle');
        s += W('p24', [[120, yT], [120, 80]]) + contact(120, 80, { dev: 'SB3', type: 'NO', t1: '3', t2: '4' }) + W('i1', [[120, 120], [120, 210], [170, 210]]) + NL('i1', 140, 206, '102', 'middle');
        s += W('p24', [[185, yT], [185, 140]]) + W('p24', [[245, yT], [245, 140]]) + W('n0', [[185, 280], [185, yB]]) + W('n0', [[215, 280], [215, yB]]) + W('n0', [[245, 280], [245, yB]]);
        s += `<g class="sym" data-dev="PLC"><rect class="s fill" x="170" y="140" width="90" height="140"/><text class="sl" x="215" y="232" text-anchor="middle">PLC</text>` + TL(185, 154, 'L+', 'middle') + TL(245, 154, '3L+', 'middle') + TL(185, 274, 'M', 'middle') + TL(215, 274, '1M', 'middle') + TL(245, 274, '3M', 'middle') + TL(174, 174, 'I0.0') + TL(174, 214, 'I0.1') + TL(174, 254, 'I0.2') + TL(256, 174, 'Q0.0', 'end') + TL(256, 214, 'Q0.1', 'end') + '</g>';
        s += W('q0', [[260, 170], [280, 170], [280, 180]]) + contact(280, 180, { dev: 'KD2', type: 'NC', t1: '21', t2: '22', side: 'right' }) + W('q0b', [[280, 220], [280, 290]]) + coil(280, 290, 'KD1', { side: 'right' }) + W('n0', [[280, 312], [280, yB]]);
        s += W('q1', [[260, 210], [266, 210], [266, 120], [320, 120], [320, 130]]) + contact(320, 130, { dev: 'KD1', type: 'NC', t1: '21', t2: '22', side: 'right' }) + W('q1b', [[320, 170], [320, 290]]) + coil(320, 290, 'KD2', { side: 'right' }) + W('n0', [[320, 312], [320, yB]]);
        return s + NL('q0', 270, 165, '301', 'middle') + NL('q1', 300, 116, '302', 'middle');
      } },
    twoloc: { name: '两地控制', devs: ['XT1', 'FU', 'FRC', 'KC1', 'SB1', 'SB2', 'SB3', 'SB4'], sources: { 'XT1.L': 'L', 'XT1.N': 'N' }, nets: NETS.twoloc,
      names: { SB1: '甲地停止', SB2: '甲地启动', SB3: '乙地启动', SB4: '乙地停止' },
      goal: '一台设备在两个地方都能启动、停止（比如柜门一套按钮、机器旁边一套）。口诀：<b>启动按钮并联，停止按钮串联</b>。自锁触点 KM1 13–14 和两个启动按钮并在一起。',
      motorText: r => (on(r, 'KC1') ? '运行' : ''),
      test: T.twoloc, vb: '0 0 330 455', field: '柜门按钮（甲地 SB1/SB2，乙地 SB3/SB4）',
      sch: () => head(100)
        + W('3', [[100, 200], [100, 220]]) + NL('3', 88, 214) + contact(100, 220, { dev: 'SB4', type: 'NC', act: 'btn', t1: '1', t2: '2' })
        + W('4', [[100, 260], [100, 290]]) + W('4', [[100, 276], [260, 276]]) + W('4', [[180, 276], [180, 290]]) + W('4', [[260, 276], [260, 290]]) + DOT('4', 100, 276) + DOT('4', 180, 276) + NL('4', 88, 282)
        + contact(100, 290, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + contact(180, 290, { dev: 'SB3', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + contact(260, 290, { dev: 'KC1', type: 'NO', t1: '13', t2: '14', side: 'right' })
        + W('5', [[100, 330], [100, 370]]) + W('5', [[180, 330], [180, 346], [100, 346]]) + W('5', [[260, 330], [260, 346], [180, 346]]) + DOT('5', 100, 346) + DOT('5', 180, 346) + NL('5', 88, 362)
        + coil(100, 370, 'KC1') + W('N', [[100, 392], [100, 420]]) + SRC(100, 440, 'N') },
    lamp: { name: '运行 / 停止指示灯', devs: ['XT1', 'FU', 'FRC', 'KC1', 'SB1', 'SB2', 'HLG', 'HLR'], sources: { 'XT1.L': 'L', 'XT1.N': 'N' }, nets: NETS.lamp,
      goal: '在启保停的基础上加两个 220V 指示灯：<b>运行灯 HL1 和 KM1 线圈并联</b>，线圈有电就亮；<b>停止灯 HL2 走 KM1 的常闭 21–22</b>，没吸合时亮、吸合后灭。看图时注意：同一个 KM1 的线圈、常开、常闭分在三个地方画。',
      motorText: r => (on(r, 'KC1') ? '运行' : ''),
      test: T.lamp, vb: '0 0 360 425', field: '柜门按钮和指示灯',
      sch: () => head(80)
        + W('1', [[80, 90], [300, 90], [300, 240]]) + DOT('1', 80, 90)
        + W('3', [[80, 200], [80, 240]]) + W('3', [[80, 222], [130, 222], [130, 240]]) + DOT('3', 80, 222) + NL('3', 68, 218)
        + contact(80, 240, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + contact(130, 240, { dev: 'KC1', type: 'NO', t1: '13', t2: '14', side: 'right' })
        + W('4', [[80, 280], [80, 330]]) + W('4', [[130, 280], [130, 292], [80, 292]]) + W('4', [[80, 306], [200, 306], [200, 330]]) + DOT('4', 80, 292) + DOT('4', 80, 306) + NL('4', 68, 322)
        + contact(300, 240, { dev: 'KC1', type: 'NC', t1: '21', t2: '22', side: 'right' }) + W('5', [[300, 280], [300, 330]]) + NL('5', 294, 312)
        + coil(80, 330, 'KC1') + lamp(200, 330, 'HLG') + lamp(300, 330, 'HLR')
        + W('N', [[80, 352], [80, 386], [300, 386]]) + W('N', [[200, 352], [200, 386]]) + W('N', [[300, 352], [300, 386]]) + DOT('N', 200, 386) + SRC(80, 406, 'N')
        + NOTE(200, 300, '运行') + NOTE(318, 300, '停止', 'start') },
    delay: { name: '延时顺序启动', devs: ['XT1', 'FU', 'FRC', 'KC1', 'KC2', 'KT', 'SB1', 'SB2'], sources: { 'XT1.L': 'L', 'XT1.N': 'N' }, nets: NETS.delay,
      goal: '按一下启动：<b>M1（KM1）马上启动，3 秒后 M2（KM2）自动启动</b>。KT 线圈和 KM1 线圈并联同时得电，KT 的<b>延时闭合常开 67–68</b> 3 秒后才闭合，把 KM2 接通。实际设备里常在 KT 回路串 KM2 常闭，启动完成后让 KT 断电。',
      motorText: r => [on(r, 'KC1') && 'M1 运行', on(r, 'KC2') && 'M2 运行'].filter(Boolean).join('，'),
      test: T.delay, vb: '0 0 320 465', field: '柜门按钮',
      sch: () => head(80)
        + W('3', [[80, 200], [80, 240]]) + W('3', [[80, 222], [130, 222], [130, 240]]) + DOT('3', 80, 222) + NL('3', 68, 218)
        + contact(80, 240, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + contact(130, 240, { dev: 'KC1', type: 'NO', t1: '13', t2: '14', side: 'right' })
        + W('4', [[80, 280], [80, 380]]) + W('4', [[130, 280], [130, 292], [80, 292]]) + W('4', [[80, 306], [240, 306]]) + W('4', [[160, 306], [160, 380]]) + W('4', [[240, 306], [240, 320]])
        + DOT('4', 80, 292) + DOT('4', 80, 306) + DOT('4', 160, 306) + NL('4', 68, 300)
        + contact(240, 320, { dev: 'KT', type: 'NO', act: 'timer', t1: '67', t2: '68', side: 'right' }) + W('5', [[240, 360], [240, 380]]) + NL('5', 234, 374)
        + coil(80, 380, 'KC1') + coil(160, 380, 'KT') + coil(240, 380, 'KC2', { side: 'right' })
        + W('N', [[80, 402], [80, 430], [240, 430]]) + W('N', [[160, 402], [160, 430]]) + W('N', [[240, 402], [240, 430]]) + DOT('N', 160, 430) + SRC(80, 450, 'N') },
    plclamp: { name: '按钮 → PLC → 指示灯', devs: ['PS', 'PLC', 'SB2', 'HL'], sources: DC_SRC, nets: NETS.plclamp,
      ladder: [{ q: 'Q0.0', label: '指示灯 HL', e: ['NO', 'I0.0'] }], bitNames: { 'I0.0': '按钮SB2' },
      io: [['I0.0', 'SB2', '按钮（常开）'], ['Q0.0', 'HL', '指示灯 DC24V']],
      goal: 'PLC 入门第一课：按钮进输入 I0.0，程序让 Q0.0 跟着 I0.0 走，Q0.0 点亮指示灯。要接三组电：<b>L+ / M</b> 给 PLC 供电，<b>1M</b> 是输入公共端（按钮送 +24V 进来，1M 接 0V），<b>3L+ / 3M</b> 给输出供电。',
      test: T.plclamp, vb: '0 0 340 350', field: '柜门按钮和指示灯',
      sch: () => {
        const yT = 40, yB = 320;
        let s = W('p24', [[24, yT], [245, yT]]) + W('n0', [[24, yB], [300, yB]]) + NL('p24', 24, yT - 8, '+24V', 'start') + NL('n0', 24, yB + 17, '0V', 'start') + TL(245, yT - 8, '← 来自 PS', 'end');
        [110, 185].forEach(x => (s += DOT('p24', x, yT))); [185, 215, 245].forEach(x => (s += DOT('n0', x, yB)));
        s += W('p24', [[110, yT], [110, 110]]) + contact(110, 110, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + W('i0', [[110, 150], [110, 165], [170, 165]]) + NL('i0', 140, 160, '101', 'middle');
        s += W('p24', [[185, yT], [185, 110]]) + W('p24', [[245, yT], [245, 110]]) + W('n0', [[185, 250], [185, yB]]) + W('n0', [[215, 250], [215, yB]]) + W('n0', [[245, 250], [245, yB]]);
        s += `<g class="sym" data-dev="PLC"><rect class="s fill" x="170" y="110" width="100" height="140"/><text class="sl" x="220" y="210" text-anchor="middle">PLC</text>` + TL(185, 124, 'L+', 'middle') + TL(245, 124, '3L+', 'middle') + TL(185, 244, 'M', 'middle') + TL(215, 244, '1M', 'middle') + TL(245, 244, '3M', 'middle') + TL(174, 169, 'I0.0') + TL(266, 169, 'Q0.0', 'end') + '</g>';
        return s + W('q0', [[270, 165], [300, 165], [300, 220]]) + NL('q0', 285, 158, '301', 'middle') + lamp(300, 220, 'HL') + W('n0', [[300, 242], [300, yB]]);
      } },
    srelay: { name: '安全继电器 + 双通道急停', devs: ['PS', 'SR', 'KD1', 'SE2', 'SB2'], sources: DC_SRC, nets: NETS.srelay,
      names: { SB2: '复位' },
      goal: '正规设备的急停接<b>安全继电器</b>：急停有两组常闭触点，分别接通道 1（S11–S12）和通道 2（S21–S22）；复位按钮接 S33–S34；KM 线圈从安全输出 <b>13–14</b> 取电。上电不会自己启动，必须按复位；拍下急停立即停；急停松开也不会自己启动。端子号按常见安全继电器简化，实际以产品说明书为准。',
      test: T.srelay, vb: '0 0 380 350', field: '柜门急停和复位按钮',
      sch: () => {
        let s = W('p24', [[20, 40], [330, 40]]) + W('n0', [[20, 320], [300, 320]]) + NL('p24', 20, 32, '+24V', 'start') + NL('n0', 20, 337, '0V', 'start') + TL(330, 32, '← 来自 PS', 'end');
        s += W('p24', [[160, 40], [160, 120]]) + DOT('p24', 160, 40) + W('n0', [[160, 230], [160, 320]]) + DOT('n0', 160, 320);
        s += W('c1a', [[190, 120], [190, 110]]) + contact(190, 70, { dev: 'SE2', type: 'NC', act: 'estop', t1: '12', t2: '11' }) + W('c1b', [[190, 70], [190, 60], [220, 60], [220, 120]]);
        s += W('c2a', [[250, 120], [250, 110]]) + contact(250, 70, { dev: 'SE2', type: 'NC', t1: '22', t2: '21', side: 'right' }) + W('c2b', [[250, 70], [250, 60], [280, 60], [280, 120]]) + `<line class="s dash" x1="196" y1="89" x2="244" y2="89"/>`;
        s += `<g class="sym" data-dev="SR"><rect class="s fill" x="145" y="120" width="150" height="110"/><text class="sl" x="220" y="172" text-anchor="middle">KS</text><text class="tl" x="220" y="186" text-anchor="middle">安全继电器</text>` + TL(160, 134, 'A1', 'middle') + TL(190, 134, 'S11', 'middle') + TL(220, 134, 'S12', 'middle') + TL(250, 134, 'S21', 'middle') + TL(280, 134, 'S22', 'middle') + TL(160, 224, 'A2', 'middle') + TL(190, 224, 'S33', 'middle') + TL(220, 224, 'S34', 'middle') + TL(250, 224, '13', 'middle') + TL(280, 224, '14', 'middle') + '</g>';
        s += W('r1', [[190, 230], [190, 250]]) + contact(190, 250, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + W('r2', [[190, 290], [190, 300], [220, 300], [220, 230]]);
        s += W('p24', [[250, 230], [250, 244], [330, 244], [330, 40]]) + DOT('p24', 330, 40);
        s += W('q', [[280, 230], [280, 262]]) + NL('q', 274, 250, '401', 'end') + coil(280, 262, 'KD1', { side: 'right' }) + W('n0', [[280, 284], [280, 320]]);
        return s + NOTE(75, 100, '急停两组常闭') + NOTE(75, 114, '分别接两个通道');
      } },
    stepper: { name: 'PLC → 步进驱动器 → 步进电机', devs: ['PS', 'PLC', 'DRV', 'STP', 'SB2'], sources: DC_SRC, nets: NETS.stepper, prog: 'hmi',
      names: { SB2: '换方向' },
      ladder: [{ q: 'Q0.0', label: '脉冲 PUL', e: ['NO', 'M10.0'] }, { q: 'Q0.1', label: '方向 DIR', e: ['NO', 'I0.0'] }], bitNames: { 'M10.0': '触摸屏启动', 'I0.0': '换方向' },
      io: [['I0.0', 'SB2', '换方向按钮（按住反转）'], ['Q0.0', 'U1', '脉冲 PUL（高速脉冲输出）'], ['Q0.1', 'U1', '方向 DIR'], ['M10.0', 'HMI', '触摸屏启动']],
      goal: '自动化设备里最常见的运动控制：PLC 的 <b>Q0.0 发脉冲</b>接驱动器 PUL+，<b>Q0.1 给方向</b>接 DIR+，PUL−、DIR− 接 0V（共阴接法）；驱动器 A+ A− B+ B− 接步进电机四根线。A 相、B 相不能混，<b>同一相两根对调就反转</b>。信号电压、细分拨码以驱动器说明书为准。',
      test: T.stepper, vb: '0 0 470 350', field: '柜门按钮 / 现场步进电机',
      sch: () => {
        let s = W('p24', [[20, 40], [270, 40]]) + W('n0', [[20, 330], [270, 330]]) + NL('p24', 20, 32, '+24V', 'start') + NL('n0', 20, 347, '0V', 'start');
        [50, 95, 155].forEach(x => (s += DOT('p24', x, 40))); [95, 125, 155, 230].forEach(x => (s += DOT('n0', x, 330)));
        s += W('p24', [[50, 40], [50, 70]]) + contact(50, 70, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + W('i0', [[50, 110], [50, 140], [80, 140]]) + NL('i0', 62, 134, '101', 'middle');
        s += W('p24', [[95, 40], [95, 100]]) + W('p24', [[155, 40], [155, 100]]) + W('n0', [[95, 250], [95, 330]]) + W('n0', [[125, 250], [125, 330]]) + W('n0', [[155, 250], [155, 330]]);
        s += `<g class="sym" data-dev="PLC"><rect class="s fill" x="80" y="100" width="110" height="150"/><text class="sl" x="135" y="225" text-anchor="middle">PLC</text>` + TL(95, 114, 'L+', 'middle') + TL(155, 114, '3L+', 'middle') + TL(95, 244, 'M', 'middle') + TL(125, 244, '1M', 'middle') + TL(155, 244, '3M', 'middle') + TL(84, 144, 'I0.0') + TL(186, 154, 'Q0.0', 'end') + TL(186, 194, 'Q0.1', 'end') + '</g>';
        s += W('q0', [[190, 150], [250, 150]]) + NL('q0', 220, 144, '301', 'middle') + W('q1', [[190, 190], [250, 190]]) + NL('q1', 220, 184, '302', 'middle');
        s += W('n0', [[250, 170], [230, 170], [230, 330]]) + W('n0', [[250, 210], [230, 210]]) + DOT('n0', 230, 210);
        s += W('p24', [[270, 40], [270, 110]]) + W('n0', [[270, 250], [270, 330]]) + DOT('n0', 270, 330);
        s += `<g class="sym" data-dev="DRV"><rect class="s fill" x="250" y="110" width="110" height="140"/><text class="sl" x="305" y="236" text-anchor="middle">U1</text><text class="tl" x="305" y="222" text-anchor="middle">步进驱动器</text>` + TL(254, 154, 'PUL+') + TL(254, 174, 'PUL-') + TL(254, 194, 'DIR+') + TL(254, 214, 'DIR-') + TL(270, 124, 'V+', 'middle') + TL(270, 244, 'GND', 'middle') + TL(356, 134, 'A+', 'end') + TL(356, 154, 'A-', 'end') + TL(356, 194, 'B+', 'end') + TL(356, 214, 'B-', 'end') + '</g>';
        [['ma', 130, 'A+ 红'], ['mb', 150, 'A- 蓝'], ['mc', 190, 'B+ 绿'], ['md', 210, 'B- 黑']].forEach(([n, y, t]) => (s += W(n, [[360, y], [400, y]]) + NL(n, 380, y - 4, t, 'middle')));
        return s + `<g class="sym" data-dev="STP"><rect class="s fill" x="400" y="115" width="56" height="110"/><circle class="s" cx="428" cy="170" r="18"/><text class="mt" x="428" y="175">M</text><text class="sl" x="428" y="244" text-anchor="middle">M1</text></g>`;
      } },
    servo: { name: 'PLC → 伺服驱动器 → 伺服电机', devs: ['PS', 'PLC', 'XT1B', 'FUB', 'SVD', 'SVM'], sources: { ...DC_SRC, 'XT1B.L': 'L', 'XT1B.N': 'N' }, nets: NETS.servo, prog: 'hmi',
      ladder: [{ q: 'Q0.1', label: '使能 SON', e: ['NO', 'M10.0'] }, { q: 'Q0.0', label: '脉冲 PUL', e: ['ser', ['NO', 'M10.0'], ['NO', 'I0.0']] }], bitNames: { 'M10.0': '触摸屏启动', 'I0.0': '伺服准备好' },
      io: [['I0.0', 'U2', '伺服准备好 RDY'], ['Q0.0', 'U2', '脉冲 PUL'], ['Q0.1', 'U2', '伺服使能 SON'], ['M10.0', 'HMI', '触摸屏启动']],
      goal: '伺服要接四样：<b>主电</b>（L1、L2 接 220V）、<b>控制电</b>（24V、0V）、<b>控制信号</b>（PLC 的 Q0.1 给使能 SON、Q0.0 给脉冲 PUL、驱动器 RDY 回 PLC 的 I0.0）、<b>电机线</b>（U V W PE 一一对应，编码器线插 CN2）。和普通电机不同：<b>伺服 U V W 绝对不能对调</b>。实际伺服的脉冲口多为差分或集电极输入，这里简化成 24V 单端，接线以手册为准。',
      test: T.servo, vb: '0 0 470 350', field: '现场伺服电机',
      sch: () => {
        let s = W('p24', [[20, 40], [300, 40]]) + W('n0', [[20, 320], [300, 320]]) + NL('p24', 20, 32, '+24V', 'start') + NL('n0', 20, 337, '0V', 'start');
        [75, 135, 225, 270].forEach(x => (s += DOT('p24', x, 40))); [75, 105, 135, 270].forEach(x => (s += DOT('n0', x, 320)));
        s += W('p24', [[75, 40], [75, 100]]) + W('p24', [[135, 40], [135, 100]]) + W('n0', [[75, 250], [75, 320]]) + W('n0', [[105, 250], [105, 320]]) + W('n0', [[135, 250], [135, 320]]);
        s += `<g class="sym" data-dev="PLC"><rect class="s fill" x="60" y="100" width="110" height="150"/><text class="sl" x="110" y="200" text-anchor="middle">PLC</text>` + TL(75, 114, 'L+', 'middle') + TL(135, 114, '3L+', 'middle') + TL(75, 244, 'M', 'middle') + TL(105, 244, '1M', 'middle') + TL(135, 244, '3M', 'middle') + TL(166, 154, 'Q0.0', 'end') + TL(166, 184, 'Q0.1', 'end') + TL(166, 214, 'I0.0', 'end') + '</g>';
        s += W('q0', [[170, 150], [250, 150]]) + NL('q0', 200, 144, '301', 'middle') + W('q1', [[170, 180], [250, 180]]) + NL('q1', 200, 174, '302', 'middle') + W('i0', [[250, 210], [170, 210]]) + NL('i0', 200, 204, '101', 'middle');
        s += W('p24', [[250, 235], [225, 235], [225, 40]]) + W('p24', [[270, 40], [270, 100]]) + W('n0', [[270, 260], [270, 320]]);
        s += SRC(330, 16, 'L') + W('L', [[330, 24], [330, 44]]) + fuse(330, 44, 'FUB') + W('1', [[330, 74], [330, 100]]) + NL('1', 342, 90, '1', 'start') + SRC(360, 16, 'N') + W('N', [[360, 24], [360, 100]]);
        s += `<g class="sym" data-dev="SVD"><rect class="s fill" x="250" y="100" width="130" height="160"/><text class="sl" x="315" y="246" text-anchor="middle">U2</text><text class="tl" x="315" y="232" text-anchor="middle">伺服驱动器</text>` + TL(254, 154, 'PUL') + TL(254, 184, 'SON') + TL(254, 214, 'RDY') + TL(254, 239, 'COM') + TL(270, 114, '24V', 'middle') + TL(270, 254, '0V', 'middle') + TL(330, 114, 'L1', 'middle') + TL(360, 114, 'L2', 'middle') + TL(376, 144, 'U', 'end') + TL(376, 164, 'V', 'end') + TL(376, 184, 'W', 'end') + TL(376, 204, 'PE', 'end') + '</g>';
        [['mU', 140, 'U 红'], ['mV', 160, 'V 白'], ['mW', 180, 'W 黑'], ['mPE', 200, 'PE']].forEach(([n, y, t]) => (s += W(n, [[380, y], [410, y]]) + NL(n, 395, y - 3, t, 'middle')));
        return s + `<g class="sym" data-dev="SVM"><rect class="s fill" x="410" y="125" width="52" height="95"/><circle class="s" cx="436" cy="165" r="17"/><text class="mt" x="436" y="170">M</text><text class="sl" x="436" y="238" text-anchor="middle">M2</text></g>` + NOTE(436, 262, '编码器线', 'middle') + NOTE(436, 276, '插 CN2', 'middle');
      } },
    lcurtain: { name: '安全光栅 + 安全继电器', devs: ['PS', 'SR', 'KD1', 'LC', 'SB2'], sources: DC_SRC, nets: NETS.lcurtain,
      names: { SB2: '复位' }, targetLabels: ['手拿出来', '伸手进光栅'],
      goal: '冲压、机器人工位常用<b>安全光栅</b>：手一伸进去设备就停。光栅接收端有两路安全输出 <b>OSSD1、OSSD2</b>，没挡住时都是 +24V，分别接安全继电器的两个通道（S12、S22）；复位按钮接 S33–S34，KM 线圈从安全输出 13–14 取电。注意：要选带 OSSD 输入的安全继电器，接法以说明书为准。',
      test: T.lcurtain, vb: '0 0 380 350', field: '现场光栅和柜门复位按钮',
      sch: () => {
        let s = W('p24', [[20, 40], [330, 40]]) + W('n0', [[20, 320], [300, 320]]) + NL('p24', 20, 32, '+24V', 'start') + NL('n0', 20, 337, '0V', 'start');
        s += W('p24', [[45, 40], [45, 120]]) + DOT('p24', 45, 40) + W('n0', [[45, 200], [45, 320]]) + DOT('n0', 45, 320);
        s += `<g class="sym" data-dev="LC"><rect class="s fill" x="22" y="120" width="70" height="80"/><text class="sl" x="57" y="158" text-anchor="middle">F1</text><text class="tl" x="57" y="172" text-anchor="middle">安全光栅</text>` + TL(45, 134, 'BN', 'middle') + TL(45, 194, 'BU', 'middle') + TL(88, 148, 'OSSD1', 'end') + TL(88, 188, 'OSSD2', 'end') + '</g>';
        s += W('o1', [[92, 144], [116, 144], [116, 92], [220, 92], [220, 120]]) + NL('o1', 168, 86, 'OSSD1', 'middle') + W('o2', [[92, 184], [128, 184], [128, 80], [280, 80], [280, 120]]) + NL('o2', 230, 74, 'OSSD2', 'middle');
        s += W('p24', [[160, 40], [160, 120]]) + DOT('p24', 160, 40) + W('n0', [[160, 230], [160, 320]]) + DOT('n0', 160, 320);
        s += `<g class="sym" data-dev="SR"><rect class="s fill" x="145" y="120" width="150" height="110"/><text class="sl" x="220" y="172" text-anchor="middle">KS</text><text class="tl" x="220" y="186" text-anchor="middle">安全继电器（OSSD 输入）</text>` + TL(160, 134, 'A1', 'middle') + TL(220, 134, 'S12', 'middle') + TL(280, 134, 'S22', 'middle') + TL(160, 224, 'A2', 'middle') + TL(190, 224, 'S33', 'middle') + TL(220, 224, 'S34', 'middle') + TL(250, 224, '13', 'middle') + TL(280, 224, '14', 'middle') + '</g>';
        s += W('r1', [[190, 230], [190, 250]]) + contact(190, 250, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + W('r2', [[190, 290], [190, 300], [220, 300], [220, 230]]);
        s += W('p24', [[250, 230], [250, 244], [330, 244], [330, 40]]) + DOT('p24', 330, 40);
        return s + W('q', [[280, 230], [280, 262]]) + NL('q', 274, 250, '401', 'end') + coil(280, 262, 'KD1', { side: 'right' }) + W('n0', [[280, 284], [280, 320]]);
      } },
    valveisl: { name: 'PLC → 阀岛（多个电磁阀）', devs: ['PS', 'PLC', 'X1', 'VI', 'SB2'], sources: DC_SRC, nets: NETS.valveisl, prog: 'hmi',
      names: { SB2: '2 号阀' },
      ladder: [{ q: 'Q0.0', label: '1 号阀', e: ['NO', 'M10.0'] }, { q: 'Q0.1', label: '2 号阀', e: ['NO', 'I0.0'] }], bitNames: { 'M10.0': '触摸屏启动', 'I0.0': '按钮SB2' },
      io: [['I0.0', 'SB2', '2 号阀按钮'], ['Q0.0', 'Y1', '阀岛 1 号阀'], ['Q0.1', 'Y1', '阀岛 2 号阀'], ['M10.0', 'HMI', '触摸屏启动']],
      goal: '自动化设备的气缸多了，电磁阀就装成<b>阀岛</b>：一块底板上几个阀，用一根多芯电缆接线。PLC 输出经端子排到阀岛插头的 1 号、2 号针，<b>公共端 COM 接 0V</b>（PNP 型；NPN 型阀岛 COM 接 +24V，看型号）。大阀岛常用总线（PROFINET 等）连接，原理一样。',
      test: T.valveisl, vb: '0 0 380 350', field: '柜门按钮 / 现场阀岛',
      sch: () => {
        const yT = 40, yB = 320;
        let s = W('p24', [[24, yT], [245, yT]]) + W('n0', [[24, yB], [350, yB]]) + NL('p24', 24, yT - 8, '+24V', 'start') + NL('n0', 24, yB + 17, '0V', 'start') + TL(245, yT - 8, '← 来自 PS', 'end');
        [110, 185].forEach(x => (s += DOT('p24', x, yT))); [185, 215, 245, 350].forEach(x => (s += DOT('n0', x, yB)));
        s += W('p24', [[110, yT], [110, 110]]) + contact(110, 110, { dev: 'SB2', type: 'NO', act: 'btn', t1: '3', t2: '4' }) + W('i0', [[110, 150], [110, 165], [170, 165]]) + NL('i0', 140, 160, '101', 'middle');
        s += W('p24', [[185, yT], [185, 110]]) + W('p24', [[245, yT], [245, 110]]) + W('n0', [[185, 250], [185, yB]]) + W('n0', [[215, 250], [215, yB]]) + W('n0', [[245, 250], [245, yB]]);
        s += `<g class="sym" data-dev="PLC"><rect class="s fill" x="170" y="110" width="100" height="140"/><text class="sl" x="220" y="215" text-anchor="middle">PLC</text>` + TL(185, 124, 'L+', 'middle') + TL(245, 124, '3L+', 'middle') + TL(185, 244, 'M', 'middle') + TL(215, 244, '1M', 'middle') + TL(245, 244, '3M', 'middle') + TL(174, 169, 'I0.0') + TL(266, 154, 'Q0.0', 'end') + TL(266, 184, 'Q0.1', 'end') + '</g>';
        s += W('q0', [[270, 150], [300, 150], [300, 176]]) + NL('q0', 285, 144, '301', 'middle') + MK(300, 180, 'X1:1', 306, 176) + W('f1', [[300, 184], [300, 214]]);
        s += W('q1', [[270, 180], [282, 180], [282, 198], [345, 198], [345, 206]]) + NL('q1', 320, 192, '302', 'middle') + MK(345, 210, 'X1:2', 351, 206) + W('f2', [[345, 214], [345, 214]]);
        s += `<g class="sym" data-dev="VI"><rect class="s dash" x="282" y="210" width="88" height="62"/></g>` + coil(300, 222, 'VI', { t: ['1', ''] }) + coil(345, 222, 'VI', { t: ['2', ''], side: 'right' });
        s += W('f3', [[300, 244], [300, 262], [345, 262]]) + W('f3', [[345, 244], [345, 262]]) + DOT('f3', 345, 262) + NL('f3', 322, 258, 'COM', 'middle') + W('f3', [[345, 262], [345, 280]]) + MK(350, 284, 'X1:3', 358, 288) + W('n0', [[350, 288], [350, yB]]);
        return s + NOTE(326, 300, '阀岛 Y1', 'middle');
      } },
    analog: { name: '两线制 4–20mA 压力变送器 → 模拟量输入', devs: ['PS', 'AIM', 'X1', 'PT'], sources: DC_SRC, nets: NETS.analog, targetLabels: ['泄压', '给管路加压'],
      goal: '压力、温度、液位这类连续变化的量用<b>模拟量</b>：最常用 <b>4–20mA</b>。两线制变送器只有两根线，它<b>串在回路里</b>：+24V → X1:1 → 变送器 + → 变送器 − → X1:2 → 模拟量模块 AI 0+ → AI 0− → 0V。4mA 代表 0，20mA 代表满量程。信号线用屏蔽线，屏蔽层在柜内一端接 PE（见第 6 关「PE、0V 和屏蔽线」）。',
      test: T.analog, vb: '0 0 340 330', field: '现场压力变送器',
      sch: () => {
        let s = W('p24', [[20, 40], [240, 40]]) + W('n0', [[20, 300], [240, 300]]) + NL('p24', 20, 32, '+24V', 'start') + NL('n0', 20, 317, '0V', 'start') + TL(240, 32, '← 来自 PS', 'end');
        s += DOT('p24', 70, 40) + W('p24', [[70, 40], [70, 76]]) + MK(70, 80, 'X1:1', 78, 84) + W('a1', [[70, 84], [70, 120]]) + NL('a1', 64, 104, '+24V', 'end');
        s += `<g class="sym" data-dev="PT"><circle class="s fill" cx="70" cy="142" r="22"/><text class="sl" x="70" y="140" text-anchor="middle">PT</text><text class="tl" x="70" y="153" text-anchor="middle">4–20mA</text><text class="sl" x="40" y="146" text-anchor="end">B3</text>` + TL(76, 128, '+') + TL(76, 162, '−') + '</g>';
        s += W('a2', [[70, 164], [70, 206]]) + NL('a2', 64, 188, '201', 'end') + MK(70, 210, 'X1:2', 78, 214) + W('a3', [[70, 214], [70, 236], [170, 236], [170, 200]]) + NL('a3', 120, 230, '201', 'middle');
        s += DOT('p24', 200, 40) + W('p24', [[200, 40], [200, 110]]) + W('n0', [[200, 200], [200, 300]]) + DOT('n0', 200, 300) + W('n0', [[230, 200], [230, 300]]) + DOT('n0', 230, 300);
        s += `<g class="sym" data-dev="AIM"><rect class="s fill" x="155" y="110" width="100" height="90"/><text class="sl" x="205" y="150" text-anchor="middle">A1</text><text class="tl" x="205" y="164" text-anchor="middle">模拟量输入</text>` + TL(200, 124, 'L+', 'middle') + TL(170, 194, '0+', 'middle') + TL(200, 194, 'M', 'middle') + TL(230, 194, '0−', 'middle') + '</g>';
        return s + NOTE(280, 250, '电流沿箭头', 'middle') + NOTE(280, 264, '转一圈', 'middle') + `<path class="s thin" d="M96 120v40m-4-6 4 6 4-6" />`;
      } },
  };

  const mk = (id, cat, base, extra = {}) => ({ id, cat, ...BASE[base], ...extra });
  PP.EX = [
    mk('jog', '继电控制', 'jog'), mk('hold', '继电控制', 'hold'), mk('twoloc', '继电控制', 'twoloc'), mk('lamp', '继电控制', 'lamp'), mk('main', '继电控制', 'main'),
    mk('fwdrev', '继电控制', 'fwdrev'), mk('seq', '继电控制', 'seq'), mk('delay', '继电控制', 'delay'), mk('yd', '继电控制', 'yd'),
    mk('plclamp', '传感器 · PLC', 'plclamp'), mk('npn', '传感器 · PLC', 'npn'), mk('pnp', '传感器 · PLC', 'pnp'), mk('two', '传感器 · PLC', 'two'), mk('combo', '传感器 · PLC', 'combo'),
    mk('cyl', '执行与安全', 'cyl'), mk('diode', '执行与安全', 'diode'), mk('relay', '执行与安全', 'relay'), mk('estop', '执行与安全', 'estop'), mk('plcfr', '执行与安全', 'plcfr'), mk('srelay', '执行与安全', 'srelay'), mk('lcurtain', '执行与安全', 'lcurtain'), mk('stepper', '执行与安全', 'stepper'), mk('servo', '执行与安全', 'servo'), mk('valveisl', '执行与安全', 'valveisl'), mk('analog', '执行与安全', 'analog'),
    mk('f1', '故障排查', 'hold', { name: '松手就停',
      preset: fromChain(NETS.hold, [['SB2.3', 'KM.13'], ['SB2.4', 'KM.14'], ['KM.14', 'KM.A1']], [['SB1.1', 'KM.13'], ['KM.14', 'SB1.2'], ['SB2.4', 'KM.A1']]),
      symptom: '师傅说：“按启动电机能转，一松手就停，按停止好像也不太灵。”', task: '先送电按试车步骤确认现象，再断电用<b>万用表蜂鸣档</b>量 KM 的 13、14 分别连到了哪里，对照图纸找错线。' }),
    mk('f2', '故障排查', 'npn', { name: '传感器亮，PLC 不亮',
      preset: fromChain(NETS.npn, [['PLC.L+', 'PLC.1M'], ['PLC.1M', 'X1.1t']], [['PLC.L+', 'X1.1t'], ['X1.2t', 'PLC.1M']]),
      symptom: '新换的 NPN 接近开关，工件过来时传感器尾部的灯会亮，但 PLC 的 I0.0 灯就是不亮。', task: '送电后用<b>万用表直流电压档</b>：红表笔点 1M，黑表笔点 I0.0，放工件前后各量一次。再对照图纸找毛病。' }),
    mk('f3', '故障排查', 'main', { name: '电机反转',
      preset: fromChain(NETS.main, [['KM.4', 'FR.3'], ['KM.6', 'FR.5']], [['KM.4', 'FR.5'], ['KM.6', 'FR.3']]),
      symptom: '换完热继电器后试车，电机转向反了，传送带往回走。', task: '对照图纸线号，看 KM 下口到 FR 上口这几根线哪里交叉了。' }),
    mk('f4', '故障排查', 'cyl', { name: '按钮按了气缸不动',
      preset: fromChain(NETS.cyl, [['PLC.M', 'PLC.1M'], ['PLC.1M', 'PLC.3M']], [['PLC.M', 'PLC.3M']]),
      symptom: '按住伸出按钮，气缸不动，PLC 的 I0.0 灯也不亮。按钮换了新的也一样。', task: '送电后用万用表直流电压档量 I0.0 和 1M 之间的电压，按住按钮再量一次。' }),
    mk('f5', '故障排查', 'fwdrev', { name: '一按反转就跳闸',
      preset: fromChain(NETS.fwdrev, [['KC1.14', 'KC2.21'], ['KC2.22', 'KC1.A1'], ['KC2.14', 'KC1.21'], ['KC1.22', 'KC2.A1']], [['KC1.14', 'KC1.A1'], ['KC2.14', 'KC2.A1']]),
      symptom: '正转运行时，操作工按了反转，总开关“啪”一声跳闸了。', task: '这是最危险的接线错误之一。对照图纸看 KM1、KM2 的 21–22 常闭触点接了没有。' }),
    mk('f6', '故障排查', 'twoloc', { name: '乙地停不下来',
      preset: fromChain(NETS.twoloc, [['SB4.2', 'SB2.3']], [['SB1.2', 'SB2.3']]),
      symptom: '新装的两地控制，柜门上的停止按钮能停，机器旁边的停止按钮 SB4 按了没反应。', task: '断电后用万用表蜂鸣档：按住 SB4，量线号 3 和线号 4 之间还通不通。对照图纸看 SB4 是不是被跨过去了。' }),
    mk('f7', '故障排查', 'lamp', { name: '没启动运行灯就亮',
      preset: fromChain(NETS.lamp, [['KC1.A1', 'HLG.X1']], [['KC1.21', 'HLG.X1']]),
      symptom: '一合上电源，绿色运行灯就亮了，可电机根本没启动。操作工以为设备在运行。', task: '看图纸：运行灯 HL1 的 X1 应该接哪个线号？再用万用表量它现在接到了哪里。' }),
  ];
  PP.EX.forEach(e => { if (!e.preset) delete e.preset; });
})(typeof window !== 'undefined' ? window : globalThis);
