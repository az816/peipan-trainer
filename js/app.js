// app.js — 顶部导航与页面切换。页面通过 PP.PAGES 注册：group 表示归到哪个导航（知识库），hidden 表示不进导航（课程页）。
(function (G) {
  const PP = G.PP;
  PP.PAGES = PP.PAGES || [];
  const $ = id => document.getElementById(id);
  const pages = [{ id: 'lab', title: '接线实训', order: 2, mount: el => PP.LabUI.mount(el) }, ...PP.PAGES].sort((a, b) => a.order - b.order);
  const NAV = [['home', '学习路线'], ['lab', '接线实训'], ['build', '配柜实战'], ['kb', '知识库'], ['quiz', '测验']];
  const KB = pages.filter(p => p.group === 'kb');
  const navKey = p => p.group || (p.hidden ? 'home' : p.id);
  const mounted = {};
  let current = null;
  function go(id, opt = {}) {
    if (PP.closeGloss) PP.closeGloss();
    if (id === 'kb') id = (KB.find(p => p.id === PP.store.get('pp-kb-v1', '')) || KB[0]).id;
    if (!pages.some(p => p.id === id)) id = 'home';
    const pg = pages.find(p => p.id === id);
    for (const p of pages) {
      const el = $('page-' + p.id);
      if (p.id === id && !mounted[p.id]) {
        p.mount(el); mounted[p.id] = true;
        if (p.id === 'lab' && !opt.ex) PP.LabUI.showById(PP.LabUI.lastId());
      }
      el.hidden = p.id !== id;
    }
    if (id === 'lab' && opt.ex) PP.LabUI.showById(opt.ex, opt.view);
    if (pg.onShow) pg.onShow($('page-' + id), opt);
    if (pg.group === 'kb') PP.store.set('pp-kb-v1', id);
    current = id;
    const key = navKey(pg);
    document.querySelectorAll('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.p === key ? 'page' : 'false'));
    const sn = $('subnav');
    sn.hidden = pg.group !== 'kb';
    if (!sn.hidden) sn.innerHTML = KB.map(p => `<button data-p="${p.id}" aria-current="${p.id === id ? 'page' : 'false'}">${p.title}</button>`).join('');
    if (opt.anchor) { const a = document.getElementById(opt.anchor); if (a) a.scrollIntoView({ behavior: 'smooth' }); }
    else window.scrollTo(0, 0);
    try { history.replaceState(null, '', '#' + (opt.ex || id)); } catch (e) { }
  }
  PP.go = go;
  PP.current = () => current;
  PP.openExercise = (exId, view) => go('lab', { ex: exId, view });
  // 打开学习路线里的一项
  PP.openItem = it => (it.t === 'ex' ? PP.openExercise(it.id) : it.t === 'lesson' ? go('lesson-' + it.id) : it.t === 'build' ? go('build', { proj: it.id }) : go(it.id));
  function boot() {
    $('nav').innerHTML = NAV.map(([k, t]) => `<button data-p="${k}">${t}</button>`).join('');
    $('pages').innerHTML = `<nav class="subnav" id="subnav" aria-label="知识库" hidden></nav>` + pages.map(p => `<div id="page-${p.id}" hidden></div>`).join('');
    const navClick = e => { const b = e.target.closest('[data-p]'); if (b) go(b.dataset.p); };
    $('nav').addEventListener('click', navClick);
    $('subnav').addEventListener('click', navClick);
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-go],[data-ex]'); if (!a || a.closest('#exlist,#exdrawer')) return;
      e.preventDefault();
      if (a.dataset.ex) PP.openExercise(a.dataset.ex, a.dataset.view); else go(a.dataset.go, { anchor: a.dataset.anchor });
    });
    const route = () => {
      const h = (location.hash || '').slice(1);
      if (PP.EX.some(e => e.id === h)) go('lab', { ex: h });
      else go(pages.some(p => p.id === h) || h === 'kb' ? h : 'home');
    };
    window.addEventListener('hashchange', route);
    route();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
