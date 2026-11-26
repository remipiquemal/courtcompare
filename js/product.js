CC.chrome('home');
const slug = new URLSearchParams(window.__SEARCH || location.search).get('p');
const content = document.getElementById('content');

CC.load().then(products => {
  const p = products.find(x => x.slug === slug);
  if (!p) {
    document.title = 'Produit introuvable – CourtCompare';
    content.innerHTML = '<div class="empty card pad" style="margin-top:30px"><h1 style="font-size:1.6rem">Produit introuvable</h1><p><a href="index.html">← Retour au catalogue</a></p></div>';
    return;
  }
  const isShoe = p.category === 'chaussures';
  const years = p.vintages.map(v => v.year);
  const full = `${p.brand} ${p.name}`;

  // SEO dynamique
  const min = CC.minPrice(p);
  document.title = `${full} : comparatif ${years.join(' vs ')} et meilleur prix (dès ${CC.eur(min)}) | CourtCompare`;
  const setMeta = (sel, attr, val, create) => { let m = document.querySelector(sel); if (!m && create) { m = document.createElement('meta'); create(m); document.head.appendChild(m); } if (m) m.setAttribute(attr, val); };
  setMeta('meta[name=description]', 'content', `${full} comparatif années ${years.join(', ')} : ${p.seoDescription} Meilleur prix actuel : ${CC.eur(min)}.`);
  setMeta('meta[property="og:title"]', 'content', document.title, m => m.setAttribute('property', 'og:title'));
  setMeta('meta[property="og:description"]', 'content', p.seoDescription, m => m.setAttribute('property', 'og:description'));
  const ld = document.createElement('script'); ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: full, brand: { '@type': 'Brand', name: p.brand }, description: p.seoDescription, offers: { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: min, highPrice: Math.max(...p.offers.map(o => o.price)), offerCount: p.offers.length } });
  document.head.appendChild(ld);

  const bv = p.verdict.bestValueYear;
  const vs = p.vintages;

  // Tableau comparatif
  const best = (fn, hi = true) => { const vals = vs.map(fn); const t = hi ? Math.max(...vals) : Math.min(...vals); return vals.map(v => v === t && new Set(vals).size > 1); };
  const row = (label, fn, hiBetter) => {
    const w = hiBetter === undefined ? vs.map(() => false) : best(fn, hiBetter);
    return `<tr><th scope="row">${label}</th>${vs.map((v, i) => `<td class="${w[i] ? 'win' : ''}">${fn(v)}</td>`).join('')}</tr>`;
  };
  const meter = (n) => `<div class="bar-r"><span><i style="width:${n * 10}%"></i></span><b>${n}</b></div>`;
  const rrow = (label, key) => { const w = best(v => v.ratings[key]); return `<tr><th scope="row">${label}</th>${vs.map((v, i) => `<td class="${w[i] ? 'win' : ''}">${meter(v.ratings[key])}</td>`).join('')}</tr>`; };

  let rows = '';
  if (isShoe) {
    rows += row('Poids (pointure 42)', v => v.weight + ' g', false);
    rows += row('Drop', v => v.balance);
    rows += `<tr><th scope="row">Amorti</th>${vs.map(v => `<td>${meter(v.shoe.cushioning)}</td>`).join('')}</tr>`;
    rows += `<tr><th scope="row">Maintien latéral</th>${vs.map(v => `<td>${meter(v.shoe.lateral)}</td>`).join('')}</tr>`;
    rows += `<tr><th scope="row">Durabilité All Court (dur)</th>${vs.map(v => `<td>${meter(v.shoe.durabilityHard)}</td>`).join('')}</tr>`;
    rows += `<tr><th scope="row">Durabilité Terre battue</th>${vs.map(v => `<td>${meter(v.shoe.durabilityClay)}</td>`).join('')}</tr>`;
    rows += rrow('Confort', 'comfort');
  } else {
    rows += row('Poids non cordé', v => v.weight + ' g');
    rows += row('Tamis', v => v.headSize + ' cm²');
    rows += row('Plan de cordage', v => v.pattern);
    rows += row('Équilibre', v => v.balance);
    rows += row('Rigidité (RA)', v => v.stiffness + ' RA');
    rows += row('Inertie (swingweight)', v => v.swingweight);
    rows += rrow('Puissance', 'power') + rrow('Contrôle', 'control') + rrow('Prise d\'effet', 'spin') + rrow('Confort', 'comfort');
  }
  rows += `<tr><th scope="row">Technologies</th>${vs.map(v => `<td><div class="tech">${v.technologies.map(t => `<span>${CC.esc(t)}</span>`).join('')}</div></td>`).join('')}</tr>`;
  rows += `<tr><th scope="row">Prix plancher</th>${vs.map(v => `<td><b>${CC.vintagePrice(p, v.year) != null ? 'Dès ' + CC.eur(CC.vintagePrice(p, v.year)) : '—'}</b></td>`).join('')}</tr>`;

  const offers = [...p.offers].sort((a, b) => a.price - b.price);

  content.innerHTML = `
    <nav class="crumbs" aria-label="Fil d'Ariane"><a href="index.html">Catalogue</a> › ${CC.esc(p.category === 'raquettes' ? 'Raquettes' : 'Chaussures')} › ${CC.esc(full)}</nav>
    <div class="phead">
      <div>
        <span class="brand">${CC.esc(p.brand)}</span>
        <h1 style="font-size:clamp(1.8rem,5vw,2.6rem)">${CC.esc(full)} : comparatif ${years.join(' vs ')}</h1>
        <p class="muted" style="font-size:1.02rem">${CC.esc(p.tagline)}</p>
        <p><span class="badge">Meilleur rapport qualité/prix · ${bv}</span> <span class="price" style="margin-left:8px">Dès ${CC.eur(min)}</span></p>
        <a class="btn btn-primary" href="#offres" id="jump-offers">Voir les meilleures offres ↓</a>
      </div>
      <div class="card">${CC.art(p)}</div>
    </div>

    <section class="verdict" aria-labelledby="verdict-t">
      <h2 id="verdict-t">${CC.esc(p.verdict.title)}</h2>
      <p>${CC.esc(p.verdict.summary)}</p>
      <ul>${p.verdict.points.map(x => `<li>${CC.esc(x)}</li>`).join('')}</ul>
    </section>

    <section class="block" aria-labelledby="cmp-t">
      <h2 id="cmp-t">Comparatif des générations</h2>
      <p class="muted">La meilleure valeur de chaque ligne est surlignée en vert.</p>
      <div class="tablewrap"><table class="cmp" id="cmp-table">
        <thead><tr><th scope="col"><span class="muted">Caractéristique</span></th>${vs.map(v => `<th scope="col">${v.year}${v.year === bv ? '<span class="badge vb">Bon plan</span>' : ''}<small class="muted" style="font-weight:500;display:block">${CC.esc(v.label)}</small></th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody></table></div>
    </section>

    <section class="block" id="offres" aria-labelledby="off-t">
      <h2 id="off-t">Meilleures offres du moment</h2>
      <p class="muted">Triées du moins cher au plus cher. Liens affiliés.</p>
      <div class="offers">${offers.map((o, i) => `
        <div class="offer ${i === 0 ? 'best' : ''}">
          <div><div class="m">${CC.esc(o.merchant)} ${i === 0 ? '<span class="badge">Meilleur Prix</span>' : ''}</div><div class="meta">${isShoe ? 'Modèle' : 'Millésime'} ${o.year}</div></div>
          <div class="meta"><span class="stock-ok">●</span> ${CC.esc(o.stock)}</div>
          <div class="p">${CC.eur(o.price)}</div>
          <a class="btn ${i === 0 ? 'btn-primary' : 'btn-dark'}" href="${CC.esc(o.url)}" target="_blank" rel="nofollow sponsored noopener" id="offer-${i}">Voir l'offre →</a>
        </div>`).join('')}</div>
    </section>
    <p><a href="trouve-ta-raquette.html" class="btn" id="to-finder">Pas sûr du modèle ? Trouve ta raquette</a></p>`;
}).catch(e => CC.fail(content, e));
