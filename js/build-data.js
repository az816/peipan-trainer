// build-data.js — 配柜实战：任务书、选型题、布置规则、走线题和评分。不碰 DOM，测试可直接加载。
(function (G) {
  const PP = G.PP;
  const M = PP.calcMotor ? PP.calcMotor(2.2) : { I: 4.5 };

  const B = (PP.BUILD = {});
  B.task = {
    name: '小型输送线控制柜',
    no: 'PP-30',
    lines: [
      ['进线电源', '三相 AC380V + N + PE，从柜底格兰头进线'],
      ['输送电机 M1', `2.2 kW，380V，额定电流约 ${M.I.toFixed(1)} A，正反转，热继电器过载保护`],
      ['控制系统', 'S7-1200 PLC，DC24V 控制；接触器线圈 DC24V，由 PLC 晶体管输出直接驱动'],
      ['现场信号', '前、后限位各一个 PNP 三线接近开关（B1、B2）'],
      ['执行元件', '挡料气缸电磁阀 YV（DC24V，约 5W）'],
      ['柜门', '正转 SB2、反转 SB3、停止 SB1（常闭）、运行灯 HL'],
    ],
    io: [['I0.0', 'SB1', '停止（常闭）'], ['I0.1', 'SB2', '正转启动'], ['I0.2', 'SB3', '反转启动'], ['I0.3', 'B1', '前限位 PNP'], ['I0.4', 'B2', '后限位 PNP'],
      ['Q0.0', 'KM1', '正转接触器 DC24V'], ['Q0.1', 'KM2', '反转接触器 DC24V'], ['Q0.2', 'YV', '挡料电磁阀'], ['Q0.3', 'HL', '运行灯']],
  };

  // 选型：每个选项 [文字, 评价 2=推荐 1=能用但不好 0=错, 说明]
  B.sel = [
    { k: 'QF0', name: 'QF0 总断路器', hint: '全柜总电流：电机约 4.5A + 24V 电源约 0.3A，还要躲过电机起动电流、给以后留余量。',
      opts: [['3P 6A', 0, '余量太小：电机起动电流是额定的 5–7 倍（约 30A），以后加设备也没余量，容易误跳。'],
        ['3P 16A（C 曲线）', 2, '总电流约 5A，16A 有足够余量，又能保护 2.5mm² 的进线（载流约 18A）。'],
        ['3P 63A', 0, '太大了：下面的 2.5mm² 进线载流只有约 18A，线烧了断路器都不跳，等于没保护。']] },
    { k: 'QF1', name: 'QF1 电机回路断路器', hint: `电机额定电流约 ${M.I.toFixed(1)} A，断路器管短路，要躲过起动电流。`,
      opts: [['3P 4A', 0, '比电机额定电流还小，正常运行都会跳。'],
        ['3P 10A（D 曲线）', 2, '约 2 倍额定电流，D 曲线能躲过起动电流；1.5mm² 电机线（载流约 13.5A）也在保护范围内。'],
        ['电动机保护断路器 4–6.3A，整定 4.5A', 2, '整定等于电机电流，能同时做短路和过载保护（用它的话热继电器可以省掉）。'],
        ['3P 32A', 0, '太大：1.5mm² 电机线载流约 13.5A，线过载了断路器也不跳。']] },
    { k: 'KM', name: 'KM1 / KM2 接触器', hint: '2.2kW 电机；正反转要硬件互锁（需要常闭辅助触点）；线圈由 PLC 的 DC24V 输出驱动。',
      opts: [['CJX2-0910，线圈 AC220V', 0, '线圈电压不对：PLC 晶体管输出是 DC24V，带不动 220V 线圈；而且 0910 本体只有常开，做不了硬件互锁。'],
        ['CJX2-0910，线圈 DC24V', 1, '容量、电压都对，但 0910 本体只有一个常开辅助触点。正反转的硬件互锁要常闭，得另加辅助触头组。'],
        ['CJX2-0901，线圈 DC24V', 2, '9A（AC-3 可带 4kW）够 2.2kW；“01”是一个常闭辅助触点，正好做 KM1、KM2 互锁；线圈 DC24V 由 PLC 直接带（注意线圈电流不超过输出点 0.5A）。'],
        ['CJX2-3210，线圈 DC24V', 1, '能用但太大：贵、占导轨，线圈功率也大，PLC 晶体管输出可能带不动，要加中间继电器。']] },
    { k: 'FR', name: 'FR 热继电器', hint: `按电机铭牌电流整定（约 ${M.I.toFixed(1)} A），整定范围要包含它。`,
      opts: [['NR2-25 2.5–4A', 0, '最大只能调到 4A，比电机电流小，正常运行就会跳。'],
        ['NR2-25 4–6A，整定 4.5A', 2, '4.5A 在范围中间，整定就等于铭牌电流。'],
        ['NR2-25 7–10A', 0, '最小 7A，比电机电流大太多，电机过载 50% 都不跳，保护不住。']] },
    { k: 'PS', name: 'PS 24V 开关电源', hint: '24V 负载：PLC 约 0.5A、传感器 2×0.03A、电磁阀 0.21A、接触器线圈约 0.25A（一次只吸一个）、指示灯 0.02A，合计约 1.1A。',
      opts: [['24V 1.5A（36W）', 0, '余量不够：一般按负载的 1.5 倍选，1.1A×1.5≈1.6A，满载长期运行电源发热、电压下掉。'],
        ['24V 2.5A（60W）', 2, '2.5A ≥ 1.6A，有余量又不浪费。'],
        ['24V 10A（240W）', 1, '能用但浪费：体积大、贵，空载损耗也大。']] },
    { k: 'PLC', name: 'PLC CPU', hint: '数一数 I/O 表：5 个输入、4 个输出，要留 10–20% 备用；输出要直接带 DC24V 线圈和电磁阀。',
      opts: [['CPU 1211C DC/DC/DC（6 入 4 出）', 1, '5 入 4 出刚好塞满，没有备用点，以后加个传感器就得加模块。'],
        ['CPU 1214C DC/DC/DC（14 入 10 出）', 2, '点数够、有备用；晶体管输出直接带 DC24V 线圈和电磁阀，动作频繁也不怕。'],
        ['CPU 1214C AC/DC/RLY（继电器输出）', 1, '也能用：但继电器触点有寿命，频繁动作的电磁阀用晶体管输出更好；而且它的电源是 AC220V。']] },
    { k: 'W1', name: '电机回路导线截面', hint: `电机电流约 ${M.I.toFixed(1)} A，导线载流 ≥ 1.25 倍，动力回路至少 1.5mm²。`,
      opts: [['0.75 mm²', 0, '动力回路最小 1.5mm²；0.75 只用于控制线。'],
        ['1.5 mm²', 2, '载流约 13.5A（线槽、40°C）≥ 1.25×4.5A，并且在 10A 断路器保护范围内。'],
        ['6 mm²', 1, '能用但浪费，接触器、热继电器端子也不好压。']] },
    { k: 'W2', name: '24V 控制线截面', hint: '柜内控制线常用 0.75–1.0mm² 多股软线。',
      opts: [['0.3 mm²', 0, '太细：机械强度不够，一拉就断，柜内控制线一般不小于 0.5mm²。'],
        ['0.75 mm²', 2, '最常用的控制线规格，PLC 端子好压。'],
        ['2.5 mm²', 1, '能用但太粗，PLC、传感器端子压不进。']] },
    { k: 'X1', name: 'X1 信号端子排节数', hint: '现场线：B1、B2 各 3 根（棕、蓝、黑），电磁阀 2 根，合计 8 根；端子排要留 10–20% 备用。',
      opts: [['6 节', 0, '不够：现场线就有 8 根。'],
        ['10 节', 2, '8 节用上，再留 2 节备用（约 20%）。'],
        ['30 节', 1, '能用但浪费导轨，柜子也会更挤。']] },
  ];
  B.gradeSel = sel => B.sel.map(it => { const i = sel[it.k], o = i == null ? null : it.opts[i]; return { k: it.k, name: it.name, pick: o ? o[0] : null, g: o ? o[1] : -1, why: o ? o[2] : '还没选' }; });

  // 布置：三排导轨，每排 12 格
  B.CAP = 12;
  B.parts = [
    { k: 'QF0', lab: 'QF0', sub: '总断路器', u: 2, cls: 'pwr' }, { k: 'QF1', lab: 'QF1', sub: '电机断路器', u: 2, cls: 'pwr' }, { k: 'QF2', lab: 'QF2', sub: '控制电源', u: 1, cls: 'pwr' },
    { k: 'KM1', lab: 'KM1', sub: '正转', u: 2, cls: 'pwr' }, { k: 'KM2', lab: 'KM2', sub: '反转', u: 2, cls: 'pwr' }, { k: 'FR', lab: 'FR', sub: '热继电器', u: 2, cls: 'pwr' },
    { k: 'PS', lab: 'PS', sub: '24V 电源', u: 3, cls: 'dc' }, { k: 'PLC', lab: 'PLC', sub: 'S7-1200', u: 4, cls: 'dc' },
    { k: 'X1', lab: 'X1', sub: '信号端子', u: 4, cls: 'tb' }, { k: 'X2', lab: 'X2', sub: '动力端子', u: 3, cls: 'tb' }, { k: 'PE', lab: 'PE', sub: '接地排', u: 2, cls: 'pe' },
  ];
  B.part = k => B.parts.find(p => p.k === k);
  B.used = row => row.reduce((a, k) => a + B.part(k).u, 0);
  B.answer = [['QF0', 'QF1', 'KM1', 'KM2', 'FR', 'QF2'], ['PS', 'PLC'], ['X2', 'X1', 'PE']];
  B.gradeLayout = L => {
    const where = k => L.findIndex(r => r.includes(k)), idx = k => (L[where(k)] || []).indexOf(k);
    const all = B.parts.every(p => where(p.k) >= 0);
    const main = ['QF1', 'KM1', 'KM2', 'FR'], mr = where('QF1');
    const mainOk = mr >= 0 && main.every(k => where(k) === mr) && idx('QF1') < Math.min(idx('KM1'), idx('KM2')) && Math.max(idx('KM1'), idx('KM2')) < idx('FR') && Math.abs(idx('KM1') - idx('KM2')) === 1;
    const pwrRows = new Set(['KM1', 'KM2', 'FR'].map(where));
    return [
      { ok: all, name: '元件全部装上导轨', why: '托盘里还有元件没装。' },
      { ok: where('QF0') === 0 && idx('QF0') === 0, name: '总断路器 QF0 在最上排最左边', why: '电从上往下、从左往右走：进线第一个元件就是总断路器，放在最上排最左边，进线最短，检修时一眼就能找到总闸。' },
      { ok: mainOk, name: '主回路顺着电流方向排：QF1 → KM1、KM2 → FR', why: 'QF1、KM1、KM2、FR 放同一排，按电流方向从左到右；KM1 和 KM2 紧挨着，互锁线和换相线最短。' },
      { ok: ['PLC', 'PS', 'KM1', 'KM2', 'FR'].every(k => where(k) >= 0) && !pwrRows.has(where('PLC')) && !pwrRows.has(where('PS')), name: '强弱电分开：PLC、24V 电源不和接触器同一排', why: '接触器、热继电器是强电，动作时有电弧和干扰；PLC、开关电源是弱电，要单独一排，中间隔着线槽。' },
      { ok: where('PS') >= 0 && where('PS') === where('PLC') && Math.abs(idx('PS') - idx('PLC')) === 1, name: '24V 电源 PS 挨着 PLC', why: 'PS 主要给 PLC 和现场信号供电，挨着放 24V 线最短。' },
      { ok: ['X1', 'X2', 'PE'].every(k => where(k) === 2), name: '端子排 X1、X2 和 PE 排在最下面一排', why: '电缆从柜底进线，端子排和接地排放最下面，外部电缆最短、不在柜里绕。' },
      { ok: all && !['QF0', 'QF1', 'QF2', 'KM1', 'KM2', 'FR', 'PS', 'PLC'].some(k => where(k) === 2), name: '最下排只放端子，不放元件', why: '最下排要留给端子排和进线电缆，元件放上面，接线、检修都方便。' },
    ];
  };

  // 走线：每根线选截面、颜色、线槽
  B.SEC = ['0.75', '1.0', '1.5', '2.5', '4'];
  B.COL = ['黑', '黄', '红', '蓝', '棕', '黄绿双色'];
  B.DUCT = ['强电线槽（左）', '弱电线槽（右）'];
  B.wires = [
    { k: 'w1', name: '进线 L1 → QF0 的 1', a: 'IN', b: 'QF0', sec: ['2.5', '4'], col: ['黑', '黄'], duct: 0,
      why: 'QF0 是 16A，进线载流要 ≥ 16A：2.5mm² 约 18A。颜色：设备厂动力线一般全黑（GB/T 5226.1），按配电惯例 L1 用黄色也可以。380V 走强电线槽。' },
    { k: 'w2', name: 'FR 的 2/T1 → X2:U（电机线）', a: 'FR', b: 'X2', sec: ['1.5', '2.5'], col: ['黑', '黄'], duct: 0,
      why: '电机电流约 4.5A，1.5mm² 够用；动力线黑色。走强电线槽到下排动力端子 X2，再出柜到电机。' },
    { k: 'w3', name: 'PE 进线 → PE 接地排', a: 'IN', b: 'PE', sec: ['2.5', '4'], col: ['黄绿双色'], duct: 0,
      why: 'PE 截面不小于相线（这里 2.5mm²），<b>只能用黄绿双色</b>，黄绿线也不能做别的用途。' },
    { k: 'w4', name: 'QF2 → PS 的 L（220V 电源输入）', a: 'QF2', b: 'PS', sec: ['1.0', '1.5'], col: ['黑', '红'], duct: 0,
      why: '电源输入是 220V，虽然要接到弱电区的 PS，也要走<b>强电线槽</b>，到了 PS 旁边再出槽；截面 1.0–1.5mm²。' },
    { k: 'w5', name: 'PS 的 +V → PLC 的 L+', a: 'PS', b: 'PLC', sec: ['0.75', '1.0'], col: ['蓝', '棕'], duct: 1,
      why: '24V 直流控制线：0.75–1.0mm²；GB/T 5226.1 推荐直流控制用蓝色（很多厂 +24V 用棕色，按本厂规定）；走弱电线槽。' },
    { k: 'w6', name: 'X1:3（B1 黑线）→ PLC 的 I0.3', a: 'X1', b: 'PLC', sec: ['0.75', '1.0'], col: ['蓝'], duct: 1,
      why: '传感器信号线：0.75mm² 蓝色，走弱电线槽，不能和 380V 动力线同槽，否则会串干扰让输入乱跳。' },
    { k: 'w7', name: 'PLC 的 Q0.0 → KM1 的 A1（DC24V 线圈）', a: 'PLC', b: 'KM1', sec: ['0.75', '1.0'], col: ['蓝'], duct: 1,
      why: '线圈是 DC24V，属于弱电控制线：0.75mm² 蓝色，走弱电线槽，到接触器附近再出槽。' },
  ];
  B.gradeWires = W => B.wires.map(w => {
    const v = W[w.k] || {}, okS = w.sec.includes(v.sec), okC = w.col.includes(v.col), okD = +v.duct === w.duct && v.duct !== undefined && v.duct !== '';
    return { k: w.k, name: w.name, okS, okC, okD, n: okS + okC + okD, why: w.why };
  });

  B.score = st => {
    const s = B.gradeSel(st.sel || {}), l = B.gradeLayout(st.layout || [[], [], []]), w = B.gradeWires(st.wires || {});
    const a = s.reduce((x, r) => x + Math.max(0, r.g), 0) / (2 * s.length), b = l.filter(r => r.ok).length / l.length, c = w.reduce((x, r) => x + r.n, 0) / (3 * w.length);
    return { sel: Math.round(a * 40), lay: Math.round(b * 30), wire: Math.round(c * 30), total: Math.round(a * 40 + b * 30 + c * 30) };
  };
})(typeof window !== 'undefined' ? window : globalThis);
