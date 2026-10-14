// pages-prep.js — 入行准备：证书、工具、自己搭一块实训板、学习节奏
(function (G) {
  const PP = G.PP;
  // 工具图：照实物画（钢件用渐变，手柄是常见的双色防滑套）
  let tid = 0;
  const V = inner => { const p = 'tl' + (tid++) + '-'; return `<svg viewBox="0 0 120 80" class="tool" role="img"><defs><linearGradient id="${p}st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef0f1"/><stop offset=".5" stop-color="#9aa1a6"/><stop offset="1" stop-color="#5e656a"/></linearGradient><linearGradient id="${p}y" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd84a"/><stop offset="1" stop-color="#d9a400"/></linearGradient><radialGradient id="${p}k" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#5c6267"/><stop offset="1" stop-color="#1c1f22"/></radialGradient></defs>${inner(id => `url(#${p}${id})`)}</svg>`; };
  // 钳子：手柄在左、钳头在右，两条手柄在销轴处交叉
  const grip = (d, c1, c2) => `<path d="${d}" fill="${c1}"/><path d="${d}" fill="none" stroke="${c2}" stroke-width="1.2"/>`;
  const handles = (c1, c2) => grip('M6 10C20 12 40 22 54 33L58 37L54 41C40 30 22 20 5 18Z', c1, c2) + grip('M6 70C20 68 40 58 54 47L58 43L54 39C40 50 22 60 5 62Z', c1, c2) + `<path d="M24 16.5L28 25M32 20L36 28M24 63.5L28 55M32 60L36 52" stroke="rgba(0,0,0,.25)" stroke-width="1.4"/>`;
  const pin = (u, x) => `<circle cx="${x}" cy="40" r="4.8" fill="${u('st')}" stroke="#444"/><path d="M${x} 37.5V42.5M${x - 2.5} 40H${x + 2.5}" stroke="#555" stroke-width="1"/>`;
  const TOOLS = [
    ['万用表', '数字万用表，带蜂鸣档；表笔线要软、绝缘好。买 CAT III 600V 安全等级以上的。',
      V(u => `<path d="M76 68C90 76 104 70 112 62" stroke="#d32f2f" stroke-width="2.4" fill="none"/><path d="M64 68C60 76 40 78 30 74" stroke="#1d1f22" stroke-width="2.4" fill="none"/>`
        + `<rect x="38" y="2" width="44" height="72" rx="8" fill="${u('y')}" stroke="#a37c00"/><rect x="42" y="6" width="36" height="64" rx="5" fill="#2b2f33"/><rect x="45" y="9" width="30" height="15" rx="1.5" fill="#c9d3b8"/><text x="73" y="20.5" text-anchor="end" style="font-family:var(--f-mono);font-size:9px;font-weight:700;fill:#1e2a16">220.4</text>`
        + `<circle cx="60" cy="40" r="10" fill="${u('k')}" stroke="#0e1012"/><circle cx="60" cy="40" r="6" fill="#30353a"/><rect x="58.8" y="30" width="2.4" height="10" rx="1" fill="#fff"/>`
        + [-90, -60, -30, 30, 60, 90].map(a => `<circle cx="${(60 + Math.sin(a * Math.PI / 180) * 13.5).toFixed(1)}" cy="${(40 - Math.cos(a * Math.PI / 180) * 13.5).toFixed(1)}" r=".9" fill="#c8cdd0"/>`).join('')
        + `<circle cx="50" cy="62" r="3" fill="#111" stroke="#d32f2f" stroke-width="1.2"/><circle cx="60" cy="62" r="3" fill="#111" stroke="#888" stroke-width="1.2"/><circle cx="70" cy="62" r="3" fill="#111" stroke="#d32f2f" stroke-width="1.2"/><path d="M60 65V72" stroke-width="2.2" stroke="#1d1f22"/><path d="M70 65V70" stroke-width="2.2" stroke="#d32f2f"/>`)],
    ['验电笔', '断电后先验电：先在确定有电的地方试一下笔是好的，再去量要干活的地方。',
      V(u => `<rect x="88" y="38.3" width="22" height="3.4" rx="1.2" fill="${u('st')}"/><path d="M108 38.3L116 40L108 41.7Z" fill="#c7ccd0"/><rect x="80" y="35" width="12" height="10" rx="2" fill="#d32f2f"/>`
        + `<rect x="14" y="32" width="68" height="16" rx="7" fill="#dfe8ec" fill-opacity=".85" stroke="#7d8a90"/><rect x="34" y="36" width="22" height="8" rx="4" fill="#ff8a1a" opacity=".9"/><rect x="37" y="38" width="16" height="4" rx="2" fill="#ffd27a"/>`
        + `<path d="M22 32V22H62V31" fill="none" stroke="#aeb5b9" stroke-width="2.4" stroke-linejoin="round"/><rect x="8" y="34" width="9" height="12" rx="3" fill="#2a2e31"/><text x="60" y="58" text-anchor="middle" style="font-size:7px;font-weight:700;fill:#5d666b">AC 100–500V</text>`)],
    ['剥线钳', '自动剥线钳最省事：能剥 0.5–6mm² 就够用。剥的时候不能伤线芯。',
      V(u => handles('#d32f2f', '#8f1c16') + `<path d="M54 26L110 22L114 30L60 38Z" fill="${u('st')}" stroke="#555c61" stroke-width=".8"/><path d="M54 54L110 58L114 50L60 42Z" fill="${u('st')}" stroke="#555c61" stroke-width=".8"/>`
        + `<rect x="68" y="30" width="46" height="20" rx="2" fill="#30353a"/>` + [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${73 + i * 7.4}" cy="38" r="${(1.3 + i * .35).toFixed(2)}" fill="#e9ecee"/>`).join('')
        + `<text x="91" y="47.5" text-anchor="middle" style="font-family:var(--f-mono);font-size:4.6px;fill:#e9ecee">.5 1 1.5 2.5 4 6</text>` + pin(u, 58))],
    ['压线钳（管型端子用）', '棘轮式方口压线钳，压管型端子；压 O 型、U 型端子要另一把（或换钳口）。',
      V(u => handles('#1f62c4', '#123c78') + `<path d="M56 18H104A10 10 0 0 1 114 28V52A10 10 0 0 1 104 62H56L64 40Z" fill="${u('st')}" stroke="#555c61"/>`
        + `<rect x="80" y="31" width="18" height="18" rx="1" fill="#2a2e31"/><path d="M80 40H98M89 31V49" stroke="#6b7277" stroke-width=".8"/>`
        + `<path d="M60 30A14 14 0 0 1 60 50" fill="none" stroke="#444a4f" stroke-width="2.4" stroke-dasharray="1.6 1.4"/>` + pin(u, 66) + `<text x="89" y="27" text-anchor="middle" style="font-family:var(--f-mono);font-size:5px;font-weight:700;fill:#1f2523">0.25–6mm²</text>`)],
    ['绝缘螺丝刀', '一字、十字各几把，选 1000V 绝缘的（手柄上有 VDE / 1000V 标记），接线端子常用 3mm 一字。',
      V(u => `<path d="M6 32C6 26 12 26 20 28L44 30C48 30 50 34 50 40C50 46 48 50 44 50L20 52C12 54 6 54 6 48Z" fill="#d32f2f"/><path d="M14 29L40 31V49L14 51C10 50 9 46 9 40C9 34 10 30 14 29Z" fill="#f2c200"/><path d="M16 33H38M16 40H40M16 47H38" stroke="#b88f00" stroke-width="1.2"/>`
        + `<rect x="50" y="36" width="44" height="8" rx="2" fill="#d32f2f"/><path d="M94 37.5H112L116 40L112 42.5H94Z" fill="${u('st')}" stroke="#5e656a" stroke-width=".6"/><text x="72" y="42.5" text-anchor="middle" style="font-family:var(--f-mono);font-size:5.5px;font-weight:700;fill:#fff">1000V</text>`)],
    ['斜口钳', '剪线、剪扎带。',
      V(u => handles('#d32f2f', '#8f1c16') + `<path d="M54 33C70 24 92 24 110 34L112 40H60Z" fill="${u('st')}" stroke="#555c61" stroke-width=".8"/><path d="M54 47C70 56 92 56 110 46L112 40H60Z" fill="${u('st')}" stroke="#555c61" stroke-width=".8"/><path d="M70 40H112" stroke="#3f454a" stroke-width="1.2"/>` + pin(u, 60))],
    ['冷压端子', '一盒常用管型端子（0.5 / 0.75 / 1.0 / 1.5 / 2.5mm²），再备点 O 型、U 型。',
      V(u => `<rect x="4" y="6" width="112" height="68" rx="4" fill="#e7f0f4" fill-opacity=".9" stroke="#8fa3ad"/>` + [0, 1, 2, 3, 4].map(i => [0, 1].map(j => `<rect x="${8 + i * 21.6}" y="${10 + j * 32}" width="19.6" height="28" rx="2" fill="#fff" stroke="#b9c7ce"/>` + [0, 1, 2].map(k => `<g transform="rotate(${-20 + k * 18} ${18 + i * 21.6} ${24 + j * 32})"><rect x="${10 + i * 21.6 + k * 1.5}" y="${18 + j * 32 + k * 2.5}" width="6" height="5" rx="1.5" fill="${['#f2f2ec', '#9aa0a4', '#d32f2f', '#1d1f22', '#1f62c4'][i]}" stroke="rgba(0,0,0,.25)" stroke-width=".5"/><rect x="${16 + i * 21.6 + k * 1.5}" y="${19 + j * 32 + k * 2.5}" width="7" height="3" fill="${u('st')}"/></g>`).join('')).join('')).join(''))],
    ['线号管 / 线号机', '白色线号管 + 记号笔就能用；量大用线号机打印，字清楚、方向一致。',
      V(u => `<path d="M4 54C30 54 40 30 60 30S100 54 116 54" stroke="#1f62c4" stroke-width="5" fill="none" stroke-linecap="round"/>` + [[14, 52, 8], [48, 31, -6], [82, 41, 22]].map(([x, y, a], i) => `<g transform="rotate(${a} ${x + 12} ${y})"><rect x="${x}" y="${y - 7}" width="24" height="14" rx="3" fill="#fbfbf5" stroke="#9a9e98"/><text x="${x + 12}" y="${y + 3.2}" text-anchor="middle" style="font-family:var(--f-mono);font-size:8.5px;font-weight:700;fill:#1f2523">10${i + 1}</text></g>`).join('')
        + `<circle cx="100" cy="16" r="11" fill="#f3f3ee" stroke="#a2a69f"/><circle cx="100" cy="16" r="4" fill="#d5d7d0" stroke="#a2a69f"/><path d="M100 27H112" stroke="#f3f3ee" stroke-width="3"/>`)],
  ];
  const BOARD = [['安装板 + 35mm 导轨 + 线槽', '一块木板或网孔板就行'], ['2P 断路器 + 熔断器', '进线保护'], ['24V 开关电源（60W 左右）', '全程用 24V 练最安全'], ['DC24V 线圈接触器 × 2', '点动、自锁、正反转、互锁'], ['热继电器 × 1', '过载保护和 95–96'], ['按钮：绿 × 2、红 × 1、急停 × 1', '启动、停止、急停'], ['24V 指示灯 × 2', '运行、停止指示'], ['端子排 10 节 + 端子标记条', '接现场的线'], ['0.75mm² 多股软线（红、蓝、黑）', '加一卷黄绿线'], ['PNP / NPN 接近开关各 1 个', '练传感器接线（以后再加 PLC）']];
  function mount(el) {
    el.innerHTML = `<div class="page">
  <div class="page-head"><h1>入行准备</h1><p>软件能教你看图、接线、排故的思路，但电工是手艺活。这一页是现实里要准备的东西：证书、工具、一块自己的练习板。</p></div>
  <section class="card"><h2>证书</h2><ol class="rules">
    <li><b>特种作业操作证（低压电工作业）</b>：在国内正式干电工活必须有，由应急管理部门考核发证。没有证不能独立从事电工作业。先学安全和基础，尽早去考。</li>
    <li><b>电工职业技能等级证书（初级 / 中级 / 高级）</b>：证明技能水平，涨工资、评级有用。中级实操常考：启保停、正反转互锁、星三角、排故。软件里第 3、4、7 关就是练这些。</li></ol>
    <p class="cap">报考条件和考试安排以当地应急管理部门、人社部门当年公布的为准。</p></section>
  <section class="card"><h2>工具清单</h2><div class="toolgrid">${TOOLS.map(([n, d, svg]) => `<div class="toolcard">${svg}<b>${n}</b><small>${d}</small></div>`).join('')}</div></section>
  <section class="card"><h2>自己搭一块练习板</h2><p>不用很贵，按下面的清单配一块 24V 的练习板，软件里练过的题就能在实物上再接一遍。<b>全程用 24V 练</b>，碰到 220V、380V 一定要有师傅在场。</p>
    <div class="tblwrap"><table><tr><th>东西</th><th>用来练什么</th></tr>${BOARD.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table></div>
    <p class="cap">接线实训每道题都有「打印任务卡」，打出来贴在练习板旁边，照着接、照着自检。</p></section>
  <section class="card"><h2>每天怎么练</h2><ul class="rules"><li>每天 <b>30 分钟</b>：首页「今天的 5 道题」+ 一道接线题。</li><li>每道新题按 <b>读图题 → 看演示 → 跟着接 → 独立接 → 考核</b> 走一遍。</li><li>每周挑一道学过的题，<b>在练习板上实物接一遍</b>，再做一次随机故障。</li><li>不会的词点一下下划线看解释；看不懂的现场问题记下来问师傅。</li></ul></section>
</div>`;
  }
  PP.PAGES = PP.PAGES || [];
  PP.PAGES.push({ id: 'prep', title: '入行准备', order: 5.7, group: 'kb', mount });
})(window);
