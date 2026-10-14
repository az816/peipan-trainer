// lessons.js — 课程页框架 + 第 0、1 关的课：电是怎么流的、安全三件事、符号 ↔ 实物 ↔ 端子
// 每课：几段短讲解（每段带一个能动手的小互动）+ 一组小测，答对 80% 以上算学完。
(function (G) {
  const PP = G.PP, P = PP.prog, R = PP.R;
  PP.LESSONS = PP.LESSONS || {};
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  PP.lessonUtil = { esc };

  // ---------- 框架 ----------
  // def: { title, intro, steps: [{ t, html, init(el, done) }], quiz: () => [...], gate: { text, ok: () => bool } }
  PP.addLesson = (id, def) => {
    PP.LESSONS[id] = def;
    const lvIdx = PP.LEVELS.findIndex(L => L.items.some(it => it.t === 'lesson' && it.id === id));
    const lv = PP.LEVELS[lvIdx];
    function nextItem() {
      const all = PP.LEVELS.flatMap(L => L.items), i = all.findIndex(it => it.t === 'lesson' && it.id === id);
      return all.slice(i + 1).find(it => !P.itemDone(it)) || all[i + 1] || null;
    }
    function result(el) {
      const box = el.querySelector('#lres'), done = P.lesson(id);
      const nx = nextItem();
      box.innerHTML = done ? `<div class="lres ok"><b>这一课学完了 ✓</b><span>${nx ? `下一项：${P.itemName(nx)}` : '全部课程学完了'}</span>${nx ? `<button class="b primary" id="lnext">去学下一项</button>` : ''}<button class="b ghost" data-go="home">回学习路线</button></div>` : '';
      const nb = box.querySelector('#lnext'); if (nb) nb.onclick = () => PP.openItem(nx);
    }
    function check(el, score, total) {
      const gateOk = !def.gate || def.gate.ok();
      if (score / total >= 0.8 && gateOk) { P.setLesson(id); }
      const msg = el.querySelector('#lmsg');
      msg.innerHTML = score / total >= 0.8 ? (gateOk ? '' : `<p class="lwarn">小测过了，还差一步：${def.gate.text}</p>`) : `<p class="lwarn">答对 ${score} / ${total}，要答对 80% 才算学完。看看错题下面的解释，点「换一组题」再来。</p>`;
      result(el);
    }
    function mount(el) {
      const steps = def.steps.map((s, i) => `<section class="card lstep"><h2><span class="ln">${i + 1}</span>${s.t}</h2><div class="lbody" data-step="${i}">${s.html || ''}</div></section>`).join('');
      el.innerHTML = `<div class="page lesson">
  <div class="lcrumb"><button class="b small ghost" data-go="home">‹ 学习路线</button><span>第 ${lvIdx} 关：${lv.title}</span></div>
  <div class="page-head"><h1>${def.title}</h1><p>${def.intro}</p></div>
  ${steps}
  <section class="card lstep lquiz"><h2><span class="ln">✓</span>小测<span class="cap">答对 80% 就学完这一课${def.gate ? `；另外要${def.gate.text}` : ''}</span></h2><div id="lquiz"></div><div id="lmsg"></div><div id="lres"></div></section>
</div>`;
      def.steps.forEach((s, i) => s.init && s.init(el.querySelector(`[data-step="${i}"]`), () => { if (def.gate && def.gate.ok() && el._quizOk) { P.setLesson(id); el.querySelector('#lmsg').innerHTML = ''; result(el); } }));
      const run = () => {
        const qs = def.quiz(); let n = 0, ok = 0;
        el._quizOk = false;
        PP.quizBox(el.querySelector('#lquiz'), qs, { again: run, onAnswer: (q, right) => { n++; if (right) ok++; if (n === qs.length) { el._quizOk = ok / qs.length >= 0.8; check(el, ok, qs.length); } } });
        el.querySelector('#lmsg').innerHTML = '';
      };
      run(); result(el);
      if (PP.glossify) PP.glossify(el.querySelector('.lesson'));
    }
    PP.PAGES = PP.PAGES || [];
    PP.PAGES.push({ id: 'lesson-' + id, title: def.title, order: 10, hidden: true, mount, onShow: () => P.setLast({ t: 'lesson', id, name: def.title }) });
  };

  // ---------- 小互动：回路 ----------
  function circuitSVG(s) {
    const closed = s.sw && !s.cut && !s.blown, short = closed && s.short, lit = closed && !s.short;
    const flowD = s.short ? 'M130 80H470V180H130' : 'M130 80H520V180H130';
    let g = R.defs('cw-');
    g += `<rect x="20" y="50" width="110" height="160" rx="6" fill="url(#cw-gm)" stroke="#8a8f92"/>`;
    for (let i = 0; i < 5; i++) g += `<rect x="32" y="${62 + i * 7}" width="60" height="3.5" rx="1.7" fill="#6a7074"/>`;
    g += `<rect x="30" y="112" width="78" height="40" fill="#fbfbf5" stroke="#9a9e98" stroke-width=".7"/><text x="69" y="129" text-anchor="middle" class="cwt b">24V 直流</text><text x="69" y="144" text-anchor="middle" class="cwt">开关电源</text>`;
    g += `<circle cx="130" cy="80" r="8" fill="#d32f2f"/><text x="130" y="84" text-anchor="middle" class="cwt w">+</text><circle cx="130" cy="180" r="8" fill="#1f62c4"/><text x="130" y="184" text-anchor="middle" class="cwt w">−</text>`;
    // 导线
    g += `<path d="M138 80H190M250 80H310M360 80H520V106" class="cww"/><path d="M520 154V180H330${s.cut ? 'M300 180' : 'H300'}H138" class="cww"/>`;
    if (s.cut) g += `<text x="315" y="186" text-anchor="middle" class="cwt cut">✂</text><text x="315" y="206" text-anchor="middle" class="cwt">断了</text>`;
    // 熔断器
    g += `<rect x="190" y="70" width="60" height="20" rx="4" fill="${s.blown ? '#5b5047' : '#eef6fb'}" stroke="#8a9096" opacity=".95"/><rect x="186" y="69" width="10" height="22" rx="2" fill="#c7cbcd"/><rect x="244" y="69" width="10" height="22" rx="2" fill="#c7cbcd"/>`;
    g += s.blown ? `<path d="M196 80h14M230 80h14" stroke="#3a3a3a" stroke-width="1.5"/><text x="220" y="62" text-anchor="middle" class="cwt bad">熔断了</text>` : `<path d="M196 80h48" stroke="#9aa0a4" stroke-width="1.5"/>`;
    g += `<text x="220" y="110" text-anchor="middle" class="cwt">熔断器</text>`;
    // 开关
    g += `<g class="cwsw" data-sw="1"><rect x="296" y="40" width="78" height="56" fill="transparent"/><circle cx="310" cy="80" r="5" fill="#555"/><circle cx="360" cy="80" r="5" fill="#555"/><line x1="310" y1="80" x2="${s.sw ? 360 : 352}" y2="${s.sw ? 80 : 50}" stroke="#2a2d30" stroke-width="5" stroke-linecap="round"/></g><text x="335" y="110" text-anchor="middle" class="cwt">开关（点一下）</text>`;
    // 短接线
    if (s.short) g += `<path d="M470 80V180" stroke="#d32f2f" stroke-width="4"/><circle cx="470" cy="80" r="3.5" fill="#d32f2f"/><circle cx="470" cy="180" r="3.5" fill="#d32f2f"/><text x="462" y="134" text-anchor="end" class="cwt bad">短接线</text>`;
    // 灯
    if (lit) g += `<circle cx="520" cy="130" r="38" fill="#ffd23f" opacity=".35"/>`;
    g += `<circle cx="520" cy="130" r="24" fill="${lit ? 'url(#cw-ly)' : '#eef1f2'}" stroke="#7d8285" stroke-width="2"/><path d="M510 140q5-16 10 0q5-16 10 0" fill="none" stroke="${lit ? '#a8551a' : '#8a8f92'}" stroke-width="1.6"/><rect x="512" y="152" width="16" height="8" fill="#9aa0a4"/><text x="560" y="134" class="cwt">灯（负载）</text>`;
    if (closed && !s.blown) g += `<path d="${flowD}" class="cwflow"/>`;
    g += `<rect x="190" y="214" width="190" height="36" rx="4" fill="#1d2022"/><text x="202" y="237" class="cwt w">电流</text><text x="370" y="238" text-anchor="end" class="cwt lcd">${short ? '很大！' : lit ? '0.2 A' : '0 A'}</text>`;
    return g;
  }
  function circuitInit(box, done) {
    const s = { sw: false, cut: false, short: false, blown: false };
    const say = () => {
      const closed = s.sw && !s.cut && !s.blown;
      if (s.blown) return '<b class="bad">熔断器烧断了。</b>短路时电流不经过灯，直接从 + 回到 −，电流非常大，熔断器熔断保护了电源和导线。真实的 220V 短路会打火、烧线。先拆掉短接线，再“换一个新熔断器”。';
      if (!s.sw) return '开关是断开的：回路有一个缺口，<b>电过不去，灯不亮</b>。这叫<b>断路</b>。点一下开关把它合上。';
      if (s.cut) return '开关合上了，可是下面那根线断了：回路还是有缺口，<b>灯不亮</b>。断线、端子没拧紧，都是断路。';
      if (closed && !s.short) return '<b class="ok">灯亮了。</b>电从电源 + 出发，经过熔断器、开关、灯，再回到电源 −，这一圈叫<b>回路</b>。灯是用电的东西，叫<b>负载</b>。';
      return '';
    };
    const draw = () => {
      if (s.sw && !s.cut && s.short && !s.blown) s.blown = true;
      box.querySelector('svg').innerHTML = circuitSVG(s);
      box.querySelector('.cwmsg').innerHTML = say();
      box.querySelector('[data-a=sw]').textContent = s.sw ? '断开开关' : '合上开关';
      box.querySelector('[data-a=cut]').textContent = s.cut ? '把线接回去' : '剪断下面那根线';
      box.querySelector('[data-a=short]').textContent = s.short ? '拆掉短接线' : '用一根线把灯短接';
      box.querySelector('[data-a=fuse]').hidden = !s.blown;
      if (s.sw && !s.cut && !s.blown && !s.short) box.dataset.seenLit = '1';
      if (s.blown) box.dataset.seenBlow = '1';
      done();
    };
    box.innerHTML = `<p>这是一个最简单的电路：24V 电源、熔断器、开关、一个灯。自己动手试试，看什么时候灯会亮。</p>
      <div class="cwrap"><svg class="cw" viewBox="0 0 640 260" role="img" aria-label="简单回路"></svg></div>
      <div class="tools"><button class="b primary" data-a="sw">合上开关</button><button class="b" data-a="cut">剪断下面那根线</button><button class="b danger" data-a="short">用一根线把灯短接</button><button class="b" data-a="fuse" hidden>换一个新熔断器</button></div>
      <p class="cwmsg msg hint"></p>
      <div class="kw"><div><b>回路</b>电从电源出发，经过负载再回到电源，转一圈才有电流。</div><div><b>负载</b>用电的东西：灯、接触器线圈、电机、电磁阀。</div><div><b>断路</b>回路断了一处：灯不亮、设备不动。</div><div><b>短路</b>电不经过负载直接回去：电流极大，会烧线、打火、跳闸。</div></div>`;
    box.addEventListener('click', e => {
      const a = e.target.closest('[data-a],[data-sw]'); if (!a) return;
      const k = a.dataset.a || 'sw';
      if (k === 'sw') s.sw = !s.sw; if (k === 'cut') s.cut = !s.cut; if (k === 'short') s.short = !s.short; if (k === 'fuse') s.blown = false;
      draw();
    });
    draw();
  }

  // ---------- 小互动：常开 / 常闭按钮 ----------
  function noncInit(box) {
    const sym = id => PP.symSVG(PP.SYMS.find(x => x.id === id));
    const card = (k, d, t, sid) => `<div class="nc-card" data-k="${k}"><h3>${t}</h3><div class="nc-row"><div class="nc-sym">${sym(sid)}</div><div class="nc-part" data-btn="${d}"></div><div class="nc-lamp"></div></div><p class="nc-state"></p></div>`;
    box.innerHTML = `<p>按钮就是一个“用手控制的开关”。按住下面的按钮（鼠标按住或手指按住），看灯怎么变。</p><div class="nc-grid">${card('no', 'SB2', '常开按钮（绿色 NO 触点块）', 'sbno')}${card('nc', 'SB1', '常闭按钮（红色 NC 触点块）', 'sbnc')}</div>
      <p class="cap">记法：<b>常开</b>＝平时断开，按下才通；<b>常闭</b>＝平时接通，按下才断。图纸上的触点都画的是<b>没按、没通电</b>时的样子。</p>`;
    const st = { no: false, nc: false };
    const draw = () => {
      for (const [k, d] of [['no', 'SB2'], ['nc', 'SB1']]) {
        const c = box.querySelector(`[data-k=${k}]`), pressed = st[k], lit = k === 'no' ? pressed : !pressed;
        c.querySelector('.nc-part').innerHTML = R.part(d, 'nc' + k + '-', { st: { p: { [d]: pressed } }, nm: pressed ? '按住中' : '按住我' });
        c.querySelector('.nc-lamp').innerHTML = R.part('HL', 'ncl' + k + '-', { on: { HL: lit }, nm: lit ? '亮' : '灭' });
        c.querySelector('.nc-state').innerHTML = `${pressed ? '按下' : '没按'}：触点<b>${(k === 'no') === pressed ? '接通' : '断开'}</b>，灯<b>${lit ? '亮' : '灭'}</b>`;
      }
    };
    const set = (k, v) => { if (st[k] !== v) { st[k] = v; draw(); } };
    box.addEventListener('pointerdown', e => { const c = e.target.closest('.nc-part'); if (!c) return; e.preventDefault(); set(c.parentNode.parentNode.dataset.k, true); });
    const up = () => { set('no', false); set('nc', false); };
    G.addEventListener('pointerup', up); G.addEventListener('pointercancel', up);
    draw();
  }

  PP.addLesson('circuit', {
    title: '电是怎么流的', intro: '学接线之前，先搞懂三件事：电要走一个圈才能用（回路）；圈断了就不通（断路）；不经过负载直接回去会出大事（短路）。',
    steps: [
      { t: '自己接通一个回路', init: circuitInit },
      { t: '按钮：常开和常闭', init: noncInit },
      { t: '强电和弱电，千万别混', html: `<div class="tblwrap"><table><tr><th></th><th>强电（交流 AC）</th><th>弱电（直流 DC）</th></tr><tr><th>电压</th><td>220V（L 火线 + N 零线）、380V（L1 L2 L3 三相）</td><td>24V（+24V 和 0V），来自开关电源</td></tr><tr><th>谁在用</th><td>电机、接触器主触点、220V 线圈和灯</td><td>PLC、传感器、电磁阀、24V 继电器和灯</td></tr><tr><th>碰到会怎样</th><td><b class="bad">会触电，可能致命</b></td><td>一般不会电到人，但接错会烧设备</td></tr></table></div>
        <p>最怕的错误：<b>把 220V 接进 24V 回路</b>。PLC、开关电源、传感器会一起烧掉。看图时先认清这一段是 L/N 还是 +24V/0V。</p>` },
    ],
    quiz: () => [
      ['', '灯要亮，电必须怎样走？', ['从电源出发，经过灯，回到电源', '只要灯接到火线上就会亮', '电走到灯就停在那里，不用回去'], 0, '电要走一个完整的圈才有电流，这叫回路。'],
      ['', '开关断开时灯不亮，这叫？', ['短路（电直接回去了）', '断路', '过载（电流太大）'], 1, '回路有一个缺口就是断路，电过不去。'],
      ['', '用一根线把灯两端直接连起来，再合上开关，会怎样？', ['灯更亮，因为电走了两条路', '短路，电流很大，熔断器熔断', '什么都不发生，线只是并在灯上'], 1, '这就是短路。真实的 220V 短路会打火、烧线、跳闸。'],
      ['', '常闭按钮平时是？', ['断开的，按下才通', '接通的，按下才断', '一直是通的'], 1, '常闭＝平时通，按下断。停止按钮用常闭。'],
      ['', '24V 开关电源的 +V、-V 能接到 220V 的火线零线上吗？', ['可以，开关电源本来就接 220V', '不能，会烧坏电源和 24V 设备', '可以，中间加个熔断器就行'], 1, '强电和弱电是两套电，绝对不能接在一起。'],
      ['', '熔断器（保险）是干什么的？', ['稳住电压，让灯更亮', '电流太大时熔断，保护线路', '平时当开关用，方便停电检修'], 1, '短路、严重过载时它先断，保护后面的线和设备。'],
    ],
    gate: { text: '在第 1 步里让灯亮一次', ok: () => !!document.querySelector('#page-lesson-circuit [data-step="0"][data-seen-lit]') },
  });

  // ---------- 安全三件事 ----------
  const lotoSVG = k => ({
    off: `<svg viewBox="0 0 80 80">${R.defs('lo1-')}${R.mini('QF1', 22, 8, 36, 60, 'lo1-', 'QF')}<path d="M40 74l-6-6h12z" fill="#e2580f"/></svg>`,
    lock: `<svg viewBox="0 0 80 80"><rect x="22" y="28" width="26" height="22" rx="3" fill="#d32f2f"/><path d="M27 28v-8a8 8 0 0 1 16 0v8" fill="none" stroke="#9aa0a4" stroke-width="4"/><rect x="44" y="34" width="30" height="40" rx="2" fill="#d32f2f"/><text x="59" y="50" text-anchor="middle" style="font-size:7px;fill:#fff;font-weight:700">禁止合闸</text><text x="59" y="61" text-anchor="middle" style="font-size:7px;fill:#fff;font-weight:700">有人工作</text></svg>`,
    test: `<svg viewBox="0 0 80 80"><rect x="34" y="6" width="12" height="52" rx="5" fill="#2a6bd1"/><rect x="36" y="20" width="8" height="12" rx="2" fill="#ffd23f"/><path d="M40 58v16" stroke="#9aa0a4" stroke-width="3"/><circle cx="40" cy="26" r="9" fill="none" stroke="#ff9d1a" stroke-dasharray="3 3"/></svg>`,
    work: `<svg viewBox="0 0 80 80"><path d="M18 62l30-30" stroke="#c7cbcd" stroke-width="6" stroke-linecap="round"/><path d="M44 36l10-10 8 8-10 10z" fill="#d32f2f"/><rect x="12" y="58" width="12" height="14" rx="3" fill="#ffd23f" transform="rotate(-45 18 65)"/></svg>`,
  })[k];
  function lotoInit(box, done) {
    const cards = [['off', '断电', '拉下断路器，把要干活的那一路电断开。'], ['lock', '上锁挂牌', '在断路器上锁，挂“禁止合闸 有人工作”牌，防止别人合闸。'], ['test', '验电', '用验电笔或万用表确认真的没电。'], ['work', '开始干活', '确认无电后才能动手。']];
    const order = PP.pick(cards, cards.length); let got = [];
    const ok = seq => { const s = seq.join(','); return s === 'off,lock,test,work' || s === 'off,test,lock,work'; };
    const draw = msg => {
      box.querySelector('.lo-cards').innerHTML = order.map(([k, t, d]) => { const i = got.indexOf(k); return `<button class="lo" data-k="${k}"${i >= 0 ? ' disabled' : ''}>${i >= 0 ? `<span class="lo-n">${i + 1}</span>` : ''}${lotoSVG(k)}<b>${t}</b><small>${d}</small></button>`; }).join('');
      box.querySelector('.lo-msg').innerHTML = msg || (got.length ? `已选：${got.map(k => cards.find(c => c[0] === k)[1]).join(' → ')}` : '按动手的先后顺序，依次点这四张卡片。');
    };
    box.innerHTML = `<p>在柜子里干活之前，必须做完这几件事。顺序不能乱。</p><div class="lo-cards"></div><p class="lo-msg msg hint"></p><div class="tools"><button class="b ghost small" data-re="1">重新排</button></div>
      <p class="cap">验电的规矩：先在确定有电的地方试一下，证明验电笔是好的；再去量要干活的地方；最后回到有电的地方再试一次。国家电力安全规程的顺序是“停电 → 验电 → 装设接地线 → 悬挂标示牌和装设遮栏”；车间设备常用“断电 → 上锁挂牌 → 验电”。不管哪种，<b>没验电确认之前，不能碰</b>。</p>`;
    box.addEventListener('click', e => {
      if (e.target.closest('[data-re]')) { got = []; draw(); return; }
      const b = e.target.closest('.lo'); if (!b || got.includes(b.dataset.k)) return;
      got.push(b.dataset.k);
      if (got.length === 4) {
        if (ok(got)) { box.dataset.ok = '1'; draw(`<b class="ok">顺序对了 ✓</b> ${got.map(k => cards.find(c => c[0] === k)[1]).join(' → ')}。每次动手前都这样做。`); done(); }
        else { draw('<b class="bad">顺序不对。</b>第一步一定是断电；上锁挂牌防止别人合闸；验电确认无电之后才能干活。点「重新排」再来。'); }
      } else draw();
    });
    draw();
  }
  PP.addLesson('safety', {
    title: '安全三件事', intro: '电工这行，先保命再干活。记住：断电、上锁挂牌、验电，确认没电才能动手。',
    steps: [
      { t: '为什么要这么小心', html: `<p>220V、380V 碰到就可能致命。24V 属于安全特低电压，一般不会电到人，但柜子里强电、弱电往往在一起，<b>不能因为“这一路是 24V”就带电干活</b>。</p><ul><li>接线、拆线、改线：<b>一律断电</b>。</li><li>送电前：检查接线、量一下有没有短路，通知周围的人。</li><li>不会的、没把握的：问师傅，不要自己试。</li></ul>` },
      { t: '动手前的顺序', init: lotoInit },
      { t: '持证上岗', html: `<p>在国内正式干电工活，要有<b>特种作业操作证（低压电工作业）</b>，由应急管理部门考核发证。没有证不能独立从事电工作业。学到一定程度后，尽早去考。</p>` },
    ],
    quiz: () => [
      ...PP.pick(PP.QZ.filter(q => q[0] === '安全'), 3),
      ['', '动手接线前，第一件事是？', ['先把要拆的线拆下来', '断电（拉下断路器）', '戴好手套就可以开始'], 1, '断电 → 上锁挂牌 → 验电，确认没电才能干活。'],
      ['', '为什么要在断路器上挂“禁止合闸 有人工作”牌并上锁？', ['方便别人找到这个断路器', '防止别人不知情把闸合上', '提醒自己干完活要记得送电'], 1, '很多触电事故都是别人误合闸造成的。'],
    ],
    gate: { text: '在第 2 步里把顺序排对一次', ok: () => !!document.querySelector('#page-lesson-safety [data-step="1"][data-ok]') },
  });

  // ---------- 符号 ↔ 实物 ↔ 端子 ----------
  const PARTS = [
    ['qf', 'QF', '断路器', 'QF', '上进下出：1/3/5 进线，2/4/6 出线。拨把往上是合闸（窗口红色 ON）。'],
    ['fu', 'FU', '熔断器', 'FU', '上下各一个端子 1、2。把熔芯拉出来，这一路就断开了。'],
    ['coil', 'KC1', '接触器', 'KM', '线圈 A1、A2；辅助触点 13–14 常开、21–22 常闭；主触点 1/L1 → 2/T1 接电机。'],
    ['frc', 'FR', '热继电器', 'FR', '插在接触器下面。控制回路只用 95–96（常闭）；过载跳开后按蓝色 RESET 复位。'],
    ['sbno', 'SB2', '按钮（常开）', 'SB', '绿色触点块＝常开 NO，端子 3、4。'],
    ['sbnc', 'SB1', '按钮（常闭）', 'SB', '红色触点块＝常闭 NC，端子 1、2。'],
    ['estop', 'SE', '急停按钮', 'SE', '红色蘑菇头，常闭 1–2。拍下锁住，旋转复位。'],
    ['ktno', 'KT', '时间继电器', 'KT', '插在 8 脚底座上。A1、A2 线圈；67–68 延时闭合，55–56 延时断开。'],
    ['ka', 'KA2', '中间继电器', 'KA', '透明外壳能看见线圈。A1、A2 线圈，11–14 常开。'],
    ['hl', 'HLG', '指示灯', 'HL', '两个端子 X1、X2。灯的电压（AC220V / DC24V）要和回路一样。'],
    ['m', 'M', '三相电动机', 'M', '接线盒里 U、V、W 接三相电。'],
    ['prox', 'SN', '接近开关', 'S / B', '三根线：棕 +24V、蓝 0V、黑 信号。'],
    ['yv', 'YV', '电磁阀', 'YV', '插头上的 +、−（DC24V），通电时插头灯亮。'],
    ['tb', 'X1', '端子排', 'X1', '一节端子上下两个螺丝是通的：上口接柜内，下口接现场。'],
    ['diode', 'D1', '二极管', 'D', '有银色环的一头是阴极 K。'],
  ];
  const symOf = id => PP.symSVG(PP.SYMS.find(x => x.id === id));
  const EXTRA = { main: 'KM', no: 'KC1', nc: 'KC1', frh: 'FR', kt: 'KT', ktnc: 'KT', reed: 'B1', pw: 'XT3' };
  PP.partOfSym = id => { const r = PARTS.find(p => p[0] === id); return r ? r[1] : EXTRA[id] || null; };
  function gallery(box) {
    box.innerHTML = `<p>同一个元件有三张“脸”：<b>图纸上的符号</b>、<b>柜子里的实物</b>、<b>实物上印的端子号</b>。把它们对上，看图接线就不难了。</p>
      <div class="pgal">${PARTS.map(([sid, d, n, code, tip], i) => `<div class="pcard"><div class="pc-sym">${symOf(sid)}</div><div class="pc-arrow" aria-hidden="true">→</div><div class="pc-part">${R.part(d, 'pg' + i + '-')}</div><div class="pc-t"><b>${n}</b><span class="mono">${code}</span><p>${tip}</p></div></div>`).join('')}</div>`;
  }
  const rules = `<div class="tblwrap"><table><tr><th>端子号</th><th>意思</th><th>记法</th></tr>
    <tr><td class="mono">A1 – A2</td><td>线圈</td><td>A 开头就是线圈</td></tr>
    <tr><td class="mono">1/L1 3/L2 5/L3 → 2/T1 4/T2 6/T3</td><td>主触点（三相）</td><td>单数进、双数出</td></tr>
    <tr><td class="mono">13–14、43–44</td><td>辅助常开</td><td>尾数 3、4 是常开</td></tr>
    <tr><td class="mono">21–22、31–32</td><td>辅助常闭</td><td>尾数 1、2 是常闭</td></tr>
    <tr><td class="mono">95–96 / 97–98</td><td>热继电器 常闭 / 常开</td><td>9 开头是热继电器</td></tr>
    <tr><td class="mono">55–56 / 67–68</td><td>时间继电器 延时常闭 / 延时常开</td><td>5、6 开头是延时触点</td></tr></table></div>
    <p class="cap">这套编号是国际通用的（IEC 60947 / GB/T 14048），换了牌子端子号也一样。</p>`;
  PP.addLesson('parts', {
    title: '符号 ↔ 实物 ↔ 端子', intro: '图纸上一个符号，要能在柜子里找到对应的实物，还要知道它的端子号在哪。这一课把常用的 15 个元件一个个对上。',
    steps: [{ t: '一个元件三张脸', init: gallery }, { t: '端子号的规律', html: rules }],
    quiz: () => {
      const qs = [];
      for (const [sid, d, n] of PP.pick(PARTS, 8)) {
        const others = PP.pick(PARTS.filter(p => p[0] !== sid && p[2] !== n), 3);
        if (qs.length % 2 === 0) {
          const opts = PP.pick([[sid, d, n], ...others], 4);
          qs.push(['', `<span class="qpart">${R.part(d, 'qq' + qs.length + '-')}</span>这个实物在图纸上画成哪个符号？`, opts.map(o => `<span class="qsym">${symOf(o[0])}</span>`), opts.findIndex(o => o[0] === sid), `这是${n}。`]);
        } else {
          const opts = PP.pick([[sid, d, n], ...others], 4);
          qs.push(['', `<span class="qsym big">${symOf(sid)}</span>图纸上这个符号，柜子里是哪个？`, opts.map((o, j) => `<span class="qpart sm">${R.part(o[1], 'qo' + qs.length + j + '-')}</span>`), opts.findIndex(o => o[0] === sid), `这个符号是${n}。`]);
        }
      }
      return qs;
    },
  });
})(window);
