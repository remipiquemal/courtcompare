CC.chrome('home');
const state = { cat: 'all', brand: null, weight: null, surface: null, q: '' };
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

CC.load().then(products => {
  const grid = document.getElementById('grid');

  const chipSet = (id, items, key, fmt = x => x) => {
    const el = document.getElementById(id);
    el.innerHTML = items.map(i => `<button type="button" data-v="${i}" aria-pressed="false" id="chip-${key}-${String(i).replace(/\W/g, '')}">${fmt(i)}</button>`).join('');
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = key === 'weight' ? +b.dataset.v : b.dataset.v;
      state[key] = state[key] === v ? null : v;
      [...el.children].forEach(c => c.setAttribute('aria-pressed', String(state[key] !== null && c.dataset.v == state[key])));
      render();
    });
  };
  chipSet('f-brand', [...new Set(products.map(p => p.brand))], 'brand');
  chipSet('f-weight', [285, 300, 305], 'weight', w => w + ' g');
  chipSet('f-surface', ['Toutes surfaces', 'Terre battue'], 'surface');

  const tabs = [['all', 'Toutes'], ['raquettes', 'Raquettes'], ['chaussures', 'Chaussures']];
  const tabsEl = document.getElementById('tabs');
  tabsEl.innerHTML = tabs.map(t => `<button type="button" data-c="${t[0]}" id="tab-${t[0]}" aria-pressed="${t[0] === 'all'}">${t[1]}</button>`).join('');
  tabsEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.cat = b.dataset.c;
    [...tabsEl.children].forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    render();
  });
  document.getElementById('search').addEventListener('input', e => { state.q = norm(e.target.value.trim()); render(); });

  function card(p) {
    const bv = p.vintages.find(v => v.year === p.verdict.bestValueYear) || p.vintages[0];
    const years = p.vintages.map(v => v.year).join(' · ');
    const specs = p.category === 'raquettes'
      ? [bv.weight + ' g', bv.headSize + ' cm²', bv.pattern, bv.stiffness + ' RA']
      : ['Amorti ' + bv.shoe.cushioning + '/10', 'Maintien ' + bv.shoe.lateral + '/10', ...p.surfaces];
    return `<a class="card pcard" href="produit.html?p=${p.slug}" id="card-${p.slug}">
      <div class="visual"><span class="badge">Meilleur rapport qualité/prix · ${p.verdict.bestValueYear}</span>${CC.art(p)}</div>
      <div class="body">
        <span class="brand">${CC.esc(p.brand)} · ${years}</span>
        <h3>${CC.esc(p.name)}</h3>
        <p class="muted" style="margin:0">${CC.esc(p.tagline)}</p>
        <ul class="specs">${specs.map(s => `<li>${CC.esc(s)}</li>`).join('')}</ul>
        <div class="pfoot"><span class="price">Dès ${CC.eur(CC.minPrice(p))}</span><span class="btn btn-dark" style="min-height:38px">Comparer →</span></div>
      </div></a>`;
  }

  function render() {
    const list = products.filter(p =>
      (state.cat === 'all' || p.category === state.cat) &&
      (!state.brand || p.brand === state.brand) &&
      (!state.weight || p.vintages.some(v => v.weight === state.weight && p.category === 'raquettes')) &&
      (!state.surface || p.surfaces.includes(state.surface)) &&
      (!state.q || norm([p.brand, p.name, p.category, p.tagline, ...p.vintages.map(v => v.label)].join(' ')).includes(state.q)));
    document.getElementById('count').textContent = list.length + (list.length > 1 ? ' produits' : ' produit');
    grid.innerHTML = list.length ? list.map(card).join('') : '<div class="empty card pad" style="grid-column:1/-1">Aucun produit ne correspond à ces filtres.</div>';
  }
  render();

  /* Quiz express */
  const dlg = document.getElementById('quiz'), body = document.getElementById('quiz-body');
  const steps = [
    { k: 'level', t: 'Ton niveau ?', o: [['beginner', 'Débutant'], ['intermediate', 'Intermédiaire'], ['competitor', 'Compétiteur']] },
    { k: 'style', t: 'Ton style de jeu ?', o: [['baseline', 'Fond de court lifté'], ['allround', 'Polyvalent'], ['attacker', 'Attaquant']] },
    { k: 'priority', t: 'Ta priorité ?', o: [['comfort', 'Confort du bras'], ['power', 'Puissance'], ['control', 'Contrôle']] }
  ];
  let i = 0, ans = {};
  function showStep() {
    if (i >= steps.length) {
      const res = CC.recommend(products, ans, 1)[0];
      body.innerHTML = `<div class="dots">${steps.map(() => '<i class="on"></i>').join('')}</div>${CC.resultCard(res, 0)}
        <p class="muted">Pour une reco plus fine (morphologie, budget…), essaie le <a href="trouve-ta-raquette.html">module complet</a>.</p>
        <button class="btn" id="quiz-restart" type="button">Recommencer</button>`;
      document.getElementById('quiz-restart').onclick = () => { i = 0; ans = {}; showStep(); };
      return;
    }
    const s = steps[i];
    body.innerHTML = `<div class="dots">${steps.map((_, n) => `<i class="${n <= i ? 'on' : ''}"></i>`).join('')}</div>
      <h2 style="font-size:1.3rem">${s.t}</h2><div class="opts" style="flex-direction:column">${s.o.map(o => `<button class="opt" style="border-radius:12px;min-height:50px;text-align:left" type="button" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`;
    body.querySelectorAll('.opt').forEach(b => b.onclick = () => { ans[s.k] = b.dataset.v; i++; showStep(); });
  }
  document.getElementById('open-quiz').onclick = () => { i = 0; ans = {}; showStep(); dlg.showModal(); };
  document.getElementById('quiz-close').onclick = () => dlg.close();
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
}).catch(e => CC.fail(document.getElementById('grid'), e));
