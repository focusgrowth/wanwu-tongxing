const get = id => document.getElementById(id);
const fullTurn = 2 * Math.PI;
function spiral(cx, cy, radius, growth, turns, rotation = 0) {
  const steps = 240;
  return Array.from({length: steps + 1}, (_, index) => {
    const progress = index / steps;
    const theta = progress * turns * fullTurn;
    const r = radius * growth ** ((progress - 1) * turns);
    return (index ? 'L' : 'M') + (cx + r * Math.cos(theta + rotation)).toFixed(2) + ' ' + (cy + r * Math.sin(theta + rotation)).toFixed(2);
  }).join(' ');
}
get('trace-left').setAttribute('d', spiral(207, 149, 102, 2.5, 2.05, 2.3));
get('trace-right').setAttribute('d', spiral(652, 149, 111, 2.3, 1.43, 2.06));
get('trace').addEventListener('click', event => {
  const active = event.currentTarget.getAttribute('aria-pressed') === 'false';
  event.currentTarget.setAttribute('aria-pressed', active);
  event.currentTarget.textContent = active ? '隐藏螺旋示意' : '叠加螺旋示意';
  document.querySelector('.specimens').classList.toggle('show', active);
  get('trace-note').hidden = !active;
});
const grid = get('grid');
for (const r of [35,70,105,140,175]) {
  grid.insertAdjacentHTML('beforeend', '<circle cx="225" cy="200" r="' + r + '" fill="none" stroke="#d9d4c5"/>');
}
grid.insertAdjacentHTML('beforeend', '<path d="M35 200H415 M225 16V384" stroke="#d9d4c5"/>');
function updatePlot() {
  const growth = Number(get('growth').value);
  get('factor').value = growth.toFixed(1);
  get('curve').setAttribute('d', spiral(225, 200, 174, growth, 2));
  get('points').innerHTML = [0,1,2].map(turn => '<circle cx="' + (225 + 174 * growth ** (turn - 2)) + '" cy="200" r="4.3" fill="#943e28"/>').join('');
  get('sequence').textContent = '相对半径　1 → ' + growth.toFixed(1) + ' → ' + (growth ** 2).toFixed(2);
}
get('growth').addEventListener('input', updatePlot);
updatePlot();

const classNames = Object.fromEntries(classes.map(([name, latin]) => [latin, name]));
const scopeSelect = get('scope');
const shapeSelect = get('group');
const taxonSelect = get('taxon');
const searchInput = get('search');
function addOptions(select, items) {
  for (const [value, label] of items) select.add(new Option(label, value));
}
addOptions(scopeSelect, scopes.map((label, index) => [index, label]));
addOptions(shapeSelect, [...new Set(entries.map(entry => entry[4]))].map(shape => [shape, shape]));
addOptions(taxonSelect, classes.map(([label, latin]) => [latin, label]));
const catalogStart = get('catalog-start');
function showCatalog(scope = '', taxon = '') {
  scopeSelect.value = scope;
  taxonSelect.value = taxon;
  shapeSelect.value = '';
  searchInput.value = '';
  updateCards();
  catalogStart.scrollIntoView({block: 'start'});
  catalogStart.querySelector('button').focus({preventScroll: true});
}
get('class-index').innerHTML = classes.map(([name, latin, description]) => {
  const count = entries.filter(entry => entry[1] === latin).length;
  return '<article><button type="button" data-taxon="' + latin + '" title="' + description + '">' + name +
    '</button><span>' + count + ' 条</span><button class="registry-link" type="button" data-registry="' + latin + '" aria-label="查询' + name + '学名">名录</button></article>';
}).join('');
for (const button of document.querySelectorAll('[data-taxon]')) {
  button.addEventListener('click', () => showCatalog('0', button.dataset.taxon));
}
for (const button of document.querySelectorAll('[data-filter]')) {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    if (filter === 'micro') showCatalog('2');
    else showCatalog('0', filter);
  });
}
function updateCards() {
  const query = searchInput.value.trim().toLowerCase();
  const results = entries.filter(([scope, taxon, name, latin, shape]) =>
    (!scopeSelect.value || String(scope) === scopeSelect.value) &&
    (!shapeSelect.value || shape === shapeSelect.value) &&
    (!taxonSelect.value || taxon === taxonSelect.value) &&
    (!query || [name, latin, classNames[taxon] ?? '', shape].some(value => value.toLowerCase().includes(query)))
  );
  get('count').textContent = results.length + ' / ' + entries.length + ' 条';
  get('cards').innerHTML = results.map(([scope,taxon,name,latin,shape,habitat,detail,image,source]) => {
    const url = source ?? (scope === 0 ? mollusca : marine) + encodeURIComponent(latin);
    const label = classNames[taxon] ?? scopes[scope];
    const photo = image ? '<img class="card-photo" loading="lazy" src="' + image + '" alt="' + name + '标本">' : '';
    return '<article>' + photo + '<p class="eyebrow">' + label + ' · ' + shape + ' · ' + habitat +
      '</p><h4>' + name + '</h4><i>' + latin + '</i><p>' + detail +
      '</p><a href="' + url + '" aria-label="查阅' + name + '的资料">查阅资料</a></article>';
  }).join('') || '<p>没有找到符合条件的条目。可以清除筛选重新浏览。</p>';
}
for (const select of [scopeSelect, shapeSelect, taxonSelect]) select.addEventListener('change', updateCards);
searchInput.addEventListener('input', updateCards);
get('reset-filters').addEventListener('click', () => showCatalog());
updateCards();
