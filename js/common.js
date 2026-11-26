/* CourtCompare – helpers communs + moteur de recommandation */
const CC = {};

CC.eur = (n) => n == null ? '—' : n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

CC.load = async () => {
  if (CC._data) return CC._data;
  const r = await fetch('data/products.json');
  if (!r.ok) throw new Error('products.json introuvable');
  CC._data = (await r.json()).products;
  return CC._data;
};

CC.minPrice = (p) => Math.min(...p.offers.map(o => o.price));
CC.vintagePrice = (p, year) => {
  const l = p.offers.filter(o => o.year === year).map(o => o.price);
  return l.length ? Math.min(...l) : null;
};
CC.esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Illustration SVG stylisée (raquette ou chaussure) */
CC.art = (p) => {
  const c = p.accent;
  if (p.category === 'chaussures') {
    return `<svg viewBox="0 0 240 150" role="img" aria-label="Illustration ${CC.esc(p.brand)} ${CC.esc(p.name)}" class="art">
      <ellipse cx="120" cy="128" rx="100" ry="8" fill="#0F172A" opacity=".08"/>
      <path d="M30 100 C34 70 52 52 78 50 L96 62 C108 70 122 72 138 70 L170 66 C196 64 214 80 214 102 L214 112 H30 Z" fill="${c}"/>
      <path d="M30 108 H214 V118 C214 122 210 126 204 126 H40 C34 126 30 122 30 118 Z" fill="#F8FAFC" stroke="#CBD5E1"/>
      <path d="M96 62 L112 50 L126 56" stroke="#F8FAFC" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M60 96 C90 84 130 90 170 84" stroke="#F8FAFC" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>
      <path d="M52 112 H200" stroke="#E2E8F0" stroke-width="3" stroke-dasharray="6 6"/></svg>`;
  }
  return `<svg viewBox="0 0 240 150" role="img" aria-label="Illustration raquette ${CC.esc(p.brand)} ${CC.esc(p.name)}" class="art">
    <g transform="rotate(-38 120 75)">
      <rect x="112" y="108" width="16" height="62" rx="6" fill="#0F172A"/>
      <rect x="116" y="96" width="8" height="18" fill="${c}"/>
      <ellipse cx="120" cy="52" rx="38" ry="48" fill="#fff" stroke="${c}" stroke-width="7"/>
      <g stroke="#94A3B8" stroke-width="1" opacity=".8">
        ${Array.from({ length: 9 }, (_, i) => `<line x1="${94 + i * 6.5}" y1="12" x2="${94 + i * 6.5}" y2="92"/>`).join('')}
        ${Array.from({ length: 11 }, (_, i) => `<line x1="84" y1="${12 + i * 8}" x2="156" y2="${12 + i * 8}"/>`).join('')}
      </g></g>
    <circle cx="196" cy="32" r="13" fill="#D9F04A"/><path d="M185 28 C192 34 200 34 207 28" stroke="#fff" stroke-width="2" fill="none"/></svg>`;
};

/* En-tête / pied de page */
CC.chrome = (active) => {
  const nav = [['index.html', 'Catalogue', 'home'], ['trouve-ta-raquette.html', 'Trouve ta raquette', 'finder']];
  document.body.insertAdjacentHTML('afterbegin', `
  <a class="skip" href="#main">Aller au contenu</a>
  <header class="site-header"><div class="wrap bar">
    <a href="index.html" class="logo" id="logo-link"><span class="ball" aria-hidden="true"></span>CourtCompare</a>
    <nav aria-label="Navigation principale">${nav.map(n => `<a href="${n[0]}" id="nav-${n[2]}" ${n[2] === active ? 'aria-current="page"' : ''}>${n[1]}</a>`).join('')}</nav>
  </div></header>`);
  document.body.insertAdjacentHTML('beforeend', `
  <footer class="site-footer"><div class="wrap">
    <p><strong>CourtCompare</strong> – Le comparateur matériel tennis.</p>
    <p class="muted">Les liens vers les boutiques sont des liens d'affiliation : nous pouvons percevoir une commission, sans surcoût pour toi. Prix indicatifs, à vérifier chez le marchand.</p>
  </div></footer>`);
};

/* ----------- Moteur de recommandation raquettes -----------
 profil = { level, style, priority, strength, height, weightKg, age, armPain, budget, weightPref }
 Chaque champ peut valoir 'unknown' / null : le critère est alors ignoré. */
CC.recommend = (products, profile, limit = 3) => {
  const P = Object.assign({ level: 'unknown', style: 'unknown', priority: 'unknown', strength: 'unknown', height: null, weightKg: null, age: null, armPain: false, budget: null, weightPref: 'unknown' }, profile);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const out = [];

  // Poids idéal estimé (g, non cordée)
  let ideal = 300;
  if (P.strength === 'low') ideal = 285; else if (P.strength === 'high') ideal = 305;
  if (P.level === 'beginner') ideal -= 8; else if (P.level === 'competitor') ideal += 3;
  if (P.age && P.age >= 55) ideal -= 5; else if (P.age && P.age < 15) ideal -= 15;
  if (P.weightKg && P.weightKg < 55) ideal -= 5; else if (P.weightKg && P.weightKg > 85) ideal += 3;
  if (P.height && P.height < 160) ideal -= 5;
  if (P.weightPref === 'light') ideal = Math.min(ideal, 290);
  if (P.weightPref === 'heavy') ideal = Math.max(ideal, 305);

  products.filter(p => p.category === 'raquettes').forEach(p => {
    p.vintages.forEach(v => {
      let score = 0, max = 0; const pros = [], cons = [];
      const add = (w, val) => { score += w * clamp(val); max += w; };

      // Poids / physique
      const hasPhysique = P.strength !== 'unknown' || P.weightKg || P.age || P.height || P.weightPref !== 'unknown' || P.level !== 'unknown';
      if (hasPhysique) {
        const d = v.weight - ideal;
        add(3, 1 - Math.abs(d) / 25);
        if (Math.abs(d) <= 5) pros.push(`Poids de ${v.weight} g bien adapté à ton profil physique`);
        else if (d > 5) cons.push(`Un peu lourde (${v.weight} g) pour ton profil`);
        else cons.push(`Plutôt légère (${v.weight} g) pour ton profil`);
      }

      // Confort / rigidité
      const needComfort = P.armPain || P.priority === 'comfort' || P.age >= 50;
      if (needComfort) {
        add(P.armPain ? 4 : 3, (72 - v.stiffness) / 10);
        add(2, (v.ratings.comfort - 5) / 4);
        if (v.stiffness <= 63) pros.push(`Cadre souple (${v.stiffness} RA) : ménage le bras`);
        else cons.push(`Cadre rigide (${v.stiffness} RA), moins ménageant pour le bras`);
      }

      // Style de jeu
      if (P.style === 'baseline') { add(3, (v.ratings.spin - 5) / 4.5); if (v.ratings.spin >= 9) pros.push('Excellente prise d\'effet pour jouer lifté'); }
      if (P.style === 'allround') { add(3, ((v.ratings.control + v.ratings.comfort + v.ratings.power) / 3 - 5) / 3.5); pros.push('Équilibre polyvalent puissance / contrôle'); }
      if (P.style === 'attacker') { add(3, ((v.ratings.control * 1.2 + v.ratings.power) / 2.2 - 5) / 4); if (v.ratings.control >= 8.5) pros.push('Précision pour finir les points à plat'); }

      // Priorité
      const pr = { power: 'power', control: 'control', spin: 'spin', comfort: 'comfort' }[P.priority];
      if (pr) { add(4, (v.ratings[pr] - 5) / 4.5); if (v.ratings[pr] >= 8.5) pros.push(`Très bonne note en ${{ power: 'puissance', control: 'contrôle', spin: 'prise d\'effet', comfort: 'confort' }[pr]} (${v.ratings[pr]}/10)`); }

      // Niveau
      if (P.level === 'beginner') { add(3, 1 - Math.max(0, v.swingweight - 315) / 12); add(2, (v.ratings.comfort + v.ratings.power - 10) / 8); if (v.swingweight > 320) cons.push(`Swingweight élevé (${v.swingweight}) : exigeante pour débuter`); else pros.push('Maniable, accessible pour progresser'); }
      if (P.level === 'intermediate') add(2, 1 - Math.abs(v.swingweight - 321) / 10);
      if (P.level === 'competitor') { add(3, (v.swingweight - 316) / 10); add(2, (v.ratings.control - 6) / 3); if (v.swingweight >= 322) pros.push('Stabilité de compétiteur (swingweight élevé)'); }

      // Budget
      const price = CC.vintagePrice(p, v.year);
      if (P.budget && price != null) { add(3, price <= P.budget ? 1 : 1 - (price - P.budget) / 60); if (price <= P.budget) pros.push(`Dans ton budget (${CC.eur(price)})`); else cons.push(`Au-dessus de ton budget (${CC.eur(price)})`); }
      if (P.budget && price == null) add(3, 0);
      if (price == null) cons.push('Plus de prix neuf relevé');

      if (max === 0) { score = 1; max = 1; } // aucune info : classement neutre
      const pct = Math.round(clamp(score / max) * 100);
      out.push({ product: p, vintage: v, price, score: Math.min(98, pct), pros: pros.slice(0, 4), cons: cons.slice(0, 2) });
    });
  });
  // Un seul millésime par modèle dans le top, tri par score puis prix
  out.sort((a, b) => b.score - a.score || (a.price ?? 9999) - (b.price ?? 9999));
  const seen = new Set(), res = [];
  for (const r of out) { if (seen.has(r.product.slug)) continue; seen.add(r.product.slug); res.push(r); }
  return res.slice(0, limit);
};

CC.resultCard = (r, rank) => `
  <article class="card result ${rank === 0 ? 'top' : ''}">
    <div class="result-head">
      <span class="rank">${rank === 0 ? 'Meilleur match' : '#' + (rank + 1)}</span>
      <span class="match" aria-label="Compatibilité ${r.score} pour cent"><b>${r.score}%</b> compatible</span>
    </div>
    ${CC.art(r.product)}
    <h3>${CC.esc(r.product.brand)} ${CC.esc(r.product.name)}</h3>
    <p class="muted">${CC.esc(r.vintage.label)} · ${r.vintage.weight} g · ${r.vintage.stiffness} RA · SW ${r.vintage.swingweight}</p>
    <ul class="pros">${r.pros.map(x => `<li>${CC.esc(x)}</li>`).join('')}</ul>
    ${r.cons.length ? `<ul class="cons">${r.cons.map(x => `<li>${CC.esc(x)}</li>`).join('')}</ul>` : ''}
    <div class="result-foot">
      <span class="price">${r.price != null ? 'Dès ' + CC.eur(r.price) : 'Prix non relevé'}</span>
      <a class="btn btn-primary" href="produit.html?p=${r.product.slug}">Comparer & offres →</a>
    </div>
  </article>`;

CC.fail = (el, e) => { el.innerHTML = `<div class="card pad"><p><strong>Chargement impossible.</strong> Lance le site via un serveur local (ex. <code>python3 -m http.server</code>).</p><p class="muted">${CC.esc(e.message)}</p></div>`; };
