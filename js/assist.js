// assist.js — 小帮手：声音（接触器吸合“咔哒”、万用表通断“嘀”）、术语小词典（点一下看解释）、术语表页面
(function (G) {
  const PP = G.PP;

  // ---------- 声音 ----------
  let ac = null;
  const ctx = () => { if (!ac) { const A = G.AudioContext || G.webkitAudioContext; if (!A) return null; ac = new A(); } if (ac.state === 'suspended') ac.resume(); return ac; };
  const tone = (f, dur, type = 'sine', vol = 0.05) => {
    const c = ctx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  PP.sound = {
    on: () => PP.store.get('pp-sound-v1', true),
    set(v) { PP.store.set('pp-sound-v1', !!v); },
    // 接触器吸合：一声短促的“咔”
    click(close = true) {
      if (!PP.sound.on()) return; const c = ctx(); if (!c) return;
      const n = Math.floor(c.sampleRate * 0.035), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = close ? 1800 : 2600; g.gain.value = close ? 0.5 : 0.25;
      s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start();
      tone(close ? 110 : 160, 0.06, 'triangle', close ? 0.12 : 0.05);
    },
    beep() { if (PP.sound.on()) tone(2700, 0.32, 'square', 0.03); },
    tick() { if (PP.sound.on()) tone(1200, 0.04, 'square', 0.02); },
  };

  // ---------- 术语小词典 ----------
  PP.GLOSS = {
    回路: '电从电源出发，经过负载再回到电源，走一个完整的圈，才有电流。',
    负载: '用电的东西：灯、接触器线圈、电机、电磁阀。',
    断路: '回路断了一处，电过不去：灯不亮、设备不动。断线、端子松、触点坏都会断路。',
    短路: '电不经过负载直接从电源一头回到另一头，电流极大，会烧线、打火、跳闸。',
    常开: '平时断开，动作（按下、线圈得电）后接通。端子号尾数 3–4。',
    常闭: '平时接通，动作后断开。端子号尾数 1–2。停止、急停用常闭。',
    点动: '按住才动，松手就停，没有自锁。',
    自锁: '接触器用自己的常开触点（13–14）并在启动按钮两端，松手后靠它保持吸合。',
    互锁: '两个接触器不能同时吸合时，各把自己的常闭触点串到对方线圈回路里，一个吸合另一个就吸不上。',
    线号: '每一根线的编号，图纸上标着，实物上套线号管。线号相同的端子要连在一起。',
    线圈: '接触器、继电器里的电磁铁，端子 A1、A2。线圈通电，触点就动作。',
    主触点: '接触器上走大电流的三对触点（1/L1→2/T1…），接电机。',
    辅助触点: '接触器上走小电流的触点（13–14、21–22），用在控制回路做自锁、互锁。',
    公共端: 'PLC 一组输入或输出共用的那个端子，比如输入的 1M、三菱的 S/S。接 0V 还是 24V 看传感器类型。',
    NPN: '检测到物体时信号线输出 0V 的传感器。PLC 公共端 1M 要接 +24V。',
    PNP: '检测到物体时信号线输出 +24V 的传感器。PLC 公共端 1M 要接 0V。',
    两线制: '只有棕、蓝两根线的传感器，像一个开关串在输入回路里。',
    端子排: '柜内和现场之间的“中转站”，一节端子上下两个螺丝是通的。',
    上口: '端子排上面那一排螺丝，一般接柜内的线。',
    下口: '端子排下面那一排螺丝，一般接现场来的电缆。',
    交叉引用: '图纸上触点下面写的 “/5”，意思是它的线圈画在第 5 区，方便来回找。',
    区号: '图框顶上的数字，把图纸竖着分成几个区，方便说“在第几区”。',
    续流二极管: '反向并在直流线圈两端的二极管，吸收线圈断电时的反向高压，保护输出点。阴极接 +。',
    整定电流: '热继电器上调的那个电流值，等于电机铭牌额定电流。',
    相序: '三相电 L1、L2、L3 的先后顺序。任意对调两相，电机就反转。',
    缺相: '三相电少了一相，电机嗡嗡响、转不起来、发烫，很快会烧。',
    星三角: '大电机先接成星形降压启动，几秒后切换成三角形全压运行，减小启动电流。',
    万用表: '电工最常用的仪表：量电压、电阻、通断，有的还能量电流。',
    蜂鸣档: '万用表量通断的档位：两点连通时会“嘀”一声。只能量断了电的东西。',
    验电: '用验电笔或万用表确认真的没电。没验电确认之前，不能碰。',
    线槽: '柜内走线用的带齿塑料槽，线在里面横平竖直地走，盖上盖板。',
    冷压端子: '压在线头上的金属端子（管型、O 型、U 型），接进接线端子更牢、不散股。',
    线号管: '套在线头上、印着线号的白色小管，维修时靠它对照图纸找线。',
    PE: '保护接地线，只能用黄绿双色线，接到设备外壳和接地排。',
    熔断器: '俗称保险，电流太大时自己熔断，保护线路。',
    断路器: '俗称空开，能手动通断，过载、短路时自动跳闸。',
    接触器: '用小电流的线圈控制大电流主触点的开关，控制电机的核心元件，文字代号 KM。',
    热继电器: '电机过载保护元件，过载时 95–96 常闭断开，让接触器释放，文字代号 FR。',
    中间继电器: '小型继电器，用来放大、隔离、转换信号，比如 24V 的 PLC 去控制 220V 的线圈，文字代号 KA。',
    时间继电器: '线圈得电后过一段时间触点才动作的继电器，文字代号 KT。',
    梯形图: 'PLC 程序最常用的画法，像继电器原理图横过来：左边是条件，右边是输出。',
    试车: '接线完成、检查无误后送电，按步骤操作，看每个动作是否符合要求。',
    校线: '对照图纸逐根检查接线，确认每个线号都接对、没有多余的线。',
  };
  const TERMS = Object.keys(PP.GLOSS).sort((a, b) => b.length - a.length);
  const SKIP = new Set(['BUTTON', 'A', 'SCRIPT', 'STYLE', 'TEXTAREA', 'SELECT', 'OPTION', 'DFN', 'svg', 'text', 'tspan', 'H1', 'H2', 'H3', 'CODE']);
  // 给一个区域里的专业词加下划线：每个词只标第一次出现
  PP.glossify = root => {
    if (!root || !G.document) return;
    const used = new Set(), walker = G.document.createTreeWalker(root, 4, { acceptNode: n => { for (let p = n.parentNode; p && p !== root; p = p.parentNode) if (SKIP.has(p.nodeName) || (p.classList && p.classList.contains('nog'))) return 2; return n.nodeValue.trim() ? 1 : 2; } });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let txt = node.nodeValue, hit = null;
      for (const t of TERMS) { if (used.has(t)) continue; const i = txt.indexOf(t); if (i >= 0 && (!hit || i < hit.i)) hit = { t, i }; }
      if (!hit) continue;
      used.add(hit.t);
      const d = G.document.createElement('dfn'); d.className = 'g'; d.dataset.g = hit.t; d.tabIndex = 0; d.textContent = hit.t;
      const after = node.splitText(hit.i); after.nodeValue = after.nodeValue.slice(hit.t.length); node.parentNode.insertBefore(d, after);
    }
  };
  if (G.document) {
    let pop = null;
    const close = () => { if (pop) { pop.remove(); pop = null; } };
    PP.closeGloss = close;
    const open = d => {
      close();
      pop = G.document.createElement('div'); pop.className = 'gpop'; pop.setAttribute('role', 'tooltip');
      pop.innerHTML = `<b>${d.dataset.g}</b><span>${PP.GLOSS[d.dataset.g]}</span><button class="b small ghost" data-go="gloss">看全部术语</button>`;
      G.document.body.appendChild(pop);
      const r = d.getBoundingClientRect(), w = pop.offsetWidth, x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), G.innerWidth - w - 8);
      pop.style.left = x + G.scrollX + 'px'; pop.style.top = r.bottom + G.scrollY + 8 + 'px';
    };
    G.document.addEventListener('click', e => { const d = e.target.closest && e.target.closest('dfn.g'); if (d) { e.preventDefault(); open(d); return; } if (!e.target.closest || !e.target.closest('.gpop')) close(); else if (e.target.closest('[data-go]')) close(); });
    G.document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); const d = e.target.closest && e.target.closest('dfn.g'); if (d && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(d); } });
    G.addEventListener('scroll', close, { passive: true });
  }

  // ---------- 术语表页 ----------
  function mountGloss(el) {
    const keys = Object.keys(PP.GLOSS);
    el.innerHTML = `<div class="page"><div class="page-head"><h1>术语表</h1><p>页面里带下划线的词，点一下就能看解释。这里是全部 ${keys.length} 个。</p></div>
      <section class="card"><div class="gfind"><input id="gq" type="search" placeholder="搜一个词，比如 自锁" aria-label="搜索术语"></div><dl class="glist" id="gl"></dl></section></div>`;
    const draw = q => { el.querySelector('#gl').innerHTML = keys.filter(k => !q || k.includes(q) || PP.GLOSS[k].includes(q)).map(k => `<div><dt>${k}</dt><dd>${PP.GLOSS[k]}</dd></div>`).join('') || '<p class="cap">没找到。</p>'; };
    el.querySelector('#gq').addEventListener('input', e => draw(e.target.value.trim()));
    draw('');
  }
  PP.PAGES = PP.PAGES || [];
  PP.PAGES.push({ id: 'gloss', title: '术语表', order: 5.5, group: 'kb', mount: mountGloss });
})(typeof window !== 'undefined' ? window : globalThis);
