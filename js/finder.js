CC.chrome('finder');
const Q = {
  strength: [['unknown', 'Je ne sais pas'], ['low', 'Plutôt faible'], ['medium', 'Moyenne'], ['high', 'Costaud']],
  armPain: [['no', 'Non'], ['yes', 'Oui']],
  level: [['unknown', 'Je ne sais pas'], ['beginner', 'Débutant'], ['intermediate', 'Intermédiaire'], ['competitor', 'Compétiteur']],
  style: [['unknown', 'Je ne sais pas'], ['baseline', 'Fond de court lifté'], ['allround', 'Polyvalent'], ['attacker', 'Attaquant']],
  priority: [['unknown', 'Pas de préférence'], ['comfort', 'Confort du bras'], ['power', 'Puissance'], ['control', 'Contrôle'], ['spin', 'Prise d\'effet']],
  weightPref: [['unknown', 'Je ne sais pas'], ['light', 'Légère'], ['medium', 'Moyenne'], ['heavy', 'Lourde']],
  budget: [['unknown', 'Aucune limite'], ['150', '≤ 150 €'], ['200', '≤ 200 €'], ['250', '≤ 250 €']]
};
const sel = { strength: 'unknown', armPain: 'no', level: 'unknown', style: 'unknown', priority: 'unknown', weightPref: 'unknown', budget: 'unknown' };

function paint() {
  document.querySelectorAll('.opts[data-k]').forEach(box => {
    const k = box.dataset.k;
    box.innerHTML = Q[k].map(o => `<button type="button" class="opt" id="opt-${k}-${o[0]}" data-v="${o[0]}" aria-pressed="${sel[k] === o[0]}">${o[1]}</button>`).join('');
  });
}
paint();
document.addEventListener('click', e => {
  const b = e.target.closest('.opt'); if (!b) return;
  const box = b.closest('.opts'); sel[box.dataset.k] = b.dataset.v;
  box.querySelectorAll('.opt').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
});

const num = id => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; };

CC.load().then(products => {
  document.getElementById('finder').addEventListener('submit', e => {
    e.preventDefault();
    const profile = {
      height: num('f-height'), weightKg: num('f-kg'), age: num('f-age'),
      strength: sel.strength, armPain: sel.armPain === 'yes',
      level: sel.level, style: sel.style, priority: sel.priority,
      weightPref: sel.weightPref, budget: sel.budget === 'unknown' ? null : +sel.budget
    };
    const res = CC.recommend(products, profile, 3);
    const lab = (k) => Q[k].find(o => o[0] === sel[k])[1];
    const bits = [];
    if (sel.level !== 'unknown') bits.push(lab('level'));
    if (sel.style !== 'unknown') bits.push(lab('style'));
    if (sel.priority !== 'unknown') bits.push('priorité : ' + lab('priority').toLowerCase());
    if (profile.armPain) bits.push('douleurs au bras');
    if (profile.budget) bits.push('budget ≤ ' + profile.budget + ' €');
    document.getElementById('profile-sum').textContent = bits.length ? 'Ton profil : ' + bits.join(' · ') : 'Profil non précisé : voici notre sélection générale. Réponds à quelques questions pour l\'affiner.';
    document.getElementById('results').innerHTML = res.map((r, i) => CC.resultCard(r, i)).join('');
    const sec = document.getElementById('results-section'); sec.hidden = false;
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.getElementById('reset').onclick = () => {
    Object.assign(sel, { strength: 'unknown', armPain: 'no', level: 'unknown', style: 'unknown', priority: 'unknown', weightPref: 'unknown', budget: 'unknown' });
    document.getElementById('finder').reset(); paint(); document.getElementById('results-section').hidden = true;
  };
}).catch(e => CC.fail(document.getElementById('results'), e));
