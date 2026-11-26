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
// Project a three-turn curve with a fixed outer radius in the viewport.
const grid = get('floor-grid');
function project(x, y, z) {
  return [220 + 113 * (x - y) / Math.SQRT2,
    191 + 42 * (x + y) / Math.SQRT2 - 81 * z];
}
function pointText(point) {
  return point.map(value => value.toFixed(2)).join(' ');
}
for (let i = -4; i <= 4; i++) {
  const v = i / 4;
  for (const [start,end] of [[[-1,v,0],[1,v,0]],[[v,-1,0],[v,1,0]]]) {
    grid.insertAdjacentHTML('beforeend', '<path d="M' + pointText(project(...start)) + 'L' + pointText(project(...end)) + '"/>');
  }
}
function updatePlot() {
  const w = Number(get('growth').value);
  const h = Number(get('lift').value);
  const outer = w ** 3;
  const curve = [];
  const floor = [];
  const markers = [];
  for (let index = 0; index <= 360; index++) {
    const t = index / 120;
    const r = w ** t;
    const x = r * Math.cos(fullTurn * t) / outer;
    const y = r * Math.sin(fullTurn * t) / outer;
    const point = project(x, y, h * (r - 1) / outer);
    const command = index ? 'L' : 'M';
    curve.push(command + pointText(point));
    floor.push(command + pointText(project(x,y,0)));
    if (index % 120 === 0) markers.push('<circle cx="' + point[0] + '" cy="' + point[1] + '" r="3.5"/>');
  }
  get('factor').value = w.toFixed(1);
  get('lift-value').value = h.toFixed(1);
  get('model-curve').setAttribute('d', curve.join(' '));
  get('projection').setAttribute('d', floor.join(' '));
  get('model-marks').innerHTML = markers.join('');
  get('model-caption').textContent = '初始半径为 1。第 3 圈末，半径为 ' + Number(outer.toFixed(2)) +
    '，高度为 ' + Number((h * (outer - 1)).toFixed(2)) + '。';
}
for (const control of [get('growth'), get('lift')]) control.addEventListener('input', updatePlot);
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
let visibleCount = 6;
function updateCards(extend = false) {
  if (extend !== true) visibleCount = 6;
  const query = searchInput.value.trim().toLowerCase();
  const results = entries.filter(([scope, taxon, name, latin, shape]) =>
    (!scopeSelect.value || String(scope) === scopeSelect.value) &&
    (!shapeSelect.value || shape === shapeSelect.value) &&
    (!taxonSelect.value || taxon === taxonSelect.value) &&
    (!query || [name, latin, classNames[taxon] ?? '', shape].some(value => value.toLowerCase().includes(query)))
  );
  get('count').textContent = results.length + ' / ' + entries.length + ' 条';
  get('more-cards').hidden = visibleCount >= results.length;
  get('more-cards').textContent = '再看 ' + Math.min(6, results.length - visibleCount) + ' 条';
  get('cards').innerHTML = results.slice(0, visibleCount).map(([scope,taxon,name,latin,shape,habitat,detail,image,source]) => {
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

get('more-cards').addEventListener('click', () => {
  const previousCount = visibleCount;
  visibleCount += 6;
  updateCards(true);
  get('cards').children[previousCount]?.querySelector('a')?.focus();
});
