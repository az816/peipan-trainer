// pages-home.js — 首页：学习路线 9 关 + 我的进度 + 继续上次
(function (G) {
  const PP = G.PP, P = PP.prog;
  const itemKey = it => `${it.t}:${it.id}`;
  const itBtn = it => { const d = P.itemDone(it), best = it.t === 'ex' ? P.best(it.id) : null; return `<button class="it${d ? ' ok' : ''}" data-item="${itemKey(it)}"><i aria-hidden="true">${d ? '✓' : ''}</i>${P.itemName(it)}${best ? `<em>${best.score}分</em>` : ''}</button>`; };
  // 项目多的关分几组显示，一眼看出这一关练的是哪几类
  function itemsHTML(L) {
    if (!L.groups) return `<div class="lv-items">${L.items.map(itBtn).join('')}</div>`;
    let k = 0;
    return `<div class="lv-groups">${L.groups.map(([t, n]) => { const its = L.items.slice(k, (k += n)), d = its.filter(P.itemDone).length; return `<div class="lv-grp"><span class="lv-gt">${t}<small>${d}/${its.length}</small></span><div class="lv-items">${its.map(itBtn).join('')}</div></div>`; }).join('')}</div>`;
  }
  function render(el) {
    const ci = P.current(), CL = PP.LEVELS[ci], nx = P.nextItem(CL), last = P.last(), tot = P.total();
    const lastIt = last && !(nx && last.t === nx.t && last.id === nx.id) && !P.itemDone(last) ? last : null;
    const strip = PP.LEVELS.map((L, i) => { const s = P.level(L); return `<li class="${s.done ? 'done' : i === ci ? 'cur' : ''}"><button data-lv="${i}" title="第 ${i} 关：${L.title}（${s.n}/${s.total}）"><span class="no">${s.done ? '✓' : i}</span><span class="t">${L.title}</span></button></li>`; }).join('');
    el.innerHTML = `<div class="page home">
  <section class="hero">
    <div class="hero-main">
      <p class="hero-k">现在学到第 ${ci} 关，这一关完成了 ${P.level(CL).n} / ${CL.items.length}</p>
      <h1>${CL.title}</h1>
      <p class="hero-goal">${CL.goal}</p>
      <ol class="hero-bar" aria-label="这一关的进度">${CL.items.map(it => `<li class="${P.itemDone(it) ? 'ok' : nx && it.t === nx.t && it.id === nx.id ? 'nx' : ''}" title="${P.itemName(it)}"></li>`).join('')}</ol>
      <div class="hero-cta">${nx ? `<button class="b primary big" data-item="${itemKey(nx)}">开始：${P.itemName(nx)}</button>` : `<button class="b primary big" data-lv="${Math.min(ci + 1, PP.LEVELS.length - 1)}">这一关已过，看下一关</button>`}
        ${lastIt ? `<button class="b big ghost" data-item="${itemKey(lastIt)}">回到上次：${lastIt.name}</button>` : ''}</div>
    </div>
    <div class="hero-side">
      <div class="meterbox"><b>${tot.levels}</b><span>/ ${PP.LEVELS.length} 关过关</span></div>
      <div class="meterbox"><b>${tot.n}</b><span>/ ${tot.total} 项学完</span></div>
    </div>
  </section>
  <ol class="lvstrip" aria-label="9 关进度">${strip}</ol>
  <section class="card daily" id="daily"></section>
  <ol class="levels">${PP.LEVELS.map((L, i) => {
      const s = P.level(L), st = s.done ? 'done' : i === ci ? 'cur' : '';
      return `<li class="lv ${st}" id="lv-${i}"><div class="lv-no"><span>${i}</span></div><div class="lv-body">
        <div class="lv-head"><h2>${L.title}</h2><span class="lv-state">${s.done ? '已过关' : i === ci ? '正在学' : s.n ? `${s.n} / ${s.total}` : '未开始'}</span></div>
        <p class="lv-goal">${L.goal}</p>
        ${itemsHTML(L)}
        <p class="lv-real">现场对应：${L.real}</p></div></li>`;
    }).join('')}</ol>
  <section class="card prepcta"><div><h2>入行准备</h2><p>证书怎么考、要买哪些工具、怎么配一块自己的练习板。</p></div><button class="b" data-go="prep">去看看</button></section>
  <p class="cap home-foot">进度只保存在这台设备的浏览器里。每道接线题按“读图题 → 看演示 → 跟着接 → 独立接 → 考核”练，独立接对才算这一项学完。</p>
</div>`;
  }
  function drawDaily(el) {
    const box = el.querySelector('#daily'), D = P.daily();
    const qs = D.qs.map(t => PP.QZ.find(q => q[1] === t)).filter(Boolean);
    const head = `<h2>今天的 5 道题<span>${D.streak ? `已经连续 ${D.streak} 天` : '每天做一组，隔几天再碰到才记得牢'}</span></h2>`;
    if (D.done) { box.innerHTML = head + `<p class="daily-done"><b>今天做完了 ✓</b> 答对 ${D.right} / ${qs.length}。做错的题已经放进错题本，明天会再出现。想多练就去「测验」。</p>`; return; }
    if (!box.dataset.open) { box.innerHTML = head + `<div class="daily-go"><p>${qs.length} 道题，大约 2 分钟。错题本里的题会优先出现。</p><button class="b primary" id="dgo">开始今天的题</button></div>`; box.querySelector('#dgo').onclick = () => { box.dataset.open = '1'; drawDaily(el); }; return; }
    box.innerHTML = head + '<div id="dq"></div>';
    let n = 0, ok = 0;
    PP.quizBox(box.querySelector('#dq'), qs, { onAnswer: (q, right) => { P.dailyAnswer(q, right); n++; if (right) ok++; if (n === qs.length) { P.dailyDone(ok); setTimeout(() => drawDaily(el), 1600); } } });
  }
  function mount(el) {
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-item],[data-lv]'); if (!b) return;
      if (b.dataset.lv !== undefined) { const t = el.querySelector('#lv-' + b.dataset.lv); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1200); } return; }
      const [t, id] = b.dataset.item.split(':'), it = PP.LEVELS.flatMap(L => L.items).find(x => x.t === t && x.id === id);
      if (it) PP.openItem(it);
    });
  }
  PP.PAGES = PP.PAGES || [];
  PP.PAGES.push({ id: 'home', title: '学习路线', order: 0, mount, onShow: el => { render(el); drawDaily(el); } });
})(window);
