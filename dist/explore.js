const registry = get('registry');
const registryStatus = get('registry-status');
const registryResults = get('registry-results');
const registryMore = get('registry-more');
const registryPath = get('registry-path');
const ids = [101, 105, 11707, 55, 104, 415, 151365, 2094];
const roots = classes.map(([label, scientificname], index) => ({
  AphiaID: ids[index], scientificname, label, rank: 'Class'
}));
let trail = [];
let nextPage = null;
let controller;
const cachedRoots = fetch('./registry-roots.json').then(response => response.ok ? response.json() : {}).catch(() => ({}));
const rankNames = {Class:"纲",Subclass:"亚纲",Order:"目",Suborder:"亚目",Family:"科",Superfamily:"总科",Subfamily:"亚科",Genus:"属",Species:"种",Subspecies:"亚种"};

function taxonButton(label, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', action);
  return button;
}
function registryURL(id) {
  return 'https://www.molluscabase.org/aphia.php?p=taxdetails&id=' + id;
}
function listTaxon(record, drill) {
  const item = document.createElement('li');
  const text = record.label ? record.label + ' · ' + record.scientificname : record.scientificname;
  const name = drill ? taxonButton(text, drill) : document.createElement('span');
  if (!drill) name.textContent = text;
  const meta = document.createElement('small');
  meta.textContent = record.status === 'unaccepted' && record.valid_name ? '异名 · ' + record.valid_name : (rankNames[record.rank] || record.rank);
  const link = document.createElement('a');
  link.href = registryURL(record.valid_AphiaID || record.AphiaID);
  link.textContent = '名录';
  link.setAttribute('aria-label', '查看 ' + (record.valid_name || record.scientificname));
  item.append(name, meta, link);
  return item;
}
function updateTrail() {
  registryPath.replaceChildren(taxonButton('八个纲', showRoots), ...trail.map((record, index) =>
    taxonButton(record.scientificname, () => browse(trail.slice(0,index + 1)))
  ));
}
function showRoots() {
  controller?.abort();
  trail = [];
  updateTrail();
  registryMore.hidden = true;
  registryStatus.textContent = '选择一个纲，展开下一级分类。';
  registryResults.replaceChildren(...roots.map(record => listTaxon(record, () => browse([record]))));
}
async function requestRegistry(endpoint) {
  controller?.abort();
  const request = new AbortController();
  controller = request;
  registryMore.hidden = true;
  registryStatus.textContent = '正在查询名录…';
  const timeout = setTimeout(() => request.abort('timeout'), 12000);
  try {
    const response = await fetch('https://www.marinespecies.org/rest/' + endpoint, {signal: request.signal});
    if (!response.ok) throw Error('request failed');
    const records = response.status === 204 ? [] : await response.json();
    if (!Array.isArray(records)) throw Error('unexpected response');
    return controller === request && !request.signal.aborted ? records : null;
  } catch {
    if (controller === request && (!request.signal.aborted || request.signal.reason === 'timeout')) {
      registryStatus.textContent = '名录暂时无法连接。可重新查询，或打开下方的原始分类树。';
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
async function browse(path, offset = 1) {
  controller?.abort();
  trail = path;
  updateTrail();
  registryResults.replaceChildren();
  const parent = path.at(-1);
  registryMore.hidden = true;
  registryStatus.textContent = '正在载入分类…';
  const cached = path.length === 1 && offset === 1 ? (await cachedRoots)[parent.AphiaID] : null;
  if (trail !== path) return;
  const records = cached ?? await requestRegistry('AphiaChildrenByAphiaID/' + parent.AphiaID + '?marine_only=false&offset=' + offset);
  if (!records) return;
  const accepted = records.filter(record => record.status === 'accepted');
  registryStatus.textContent = records.length ? '本页有效分类 ' + accepted.length + ' 项' + (cached ? ' · 名录快照' : '') : '该类群没有可浏览的下一级记录。';
  registryResults.replaceChildren(...accepted.map(record => listTaxon(record,
    record.rank === 'Species' || record.rank === 'Subspecies' ? null : () => browse([...path, record])
  )));
  nextPage = {path, offset: offset + records.length};
  registryMore.hidden = records.length < 50;
}
registryMore.addEventListener('click', () => browse(nextPage.path, nextPage.offset));
get('registry-search').addEventListener('submit', async event => {
  event.preventDefault();
  const query = get('latin-query').value.trim();
  if (!query) return;
  trail = [];
  updateTrail();
  registryResults.replaceChildren();
  const records = await requestRegistry('AphiaRecordsByName/' + encodeURIComponent(query) + '?like=false&marine_only=false');
  if (!records) return;
  const matches = records.filter(record => record.phylum === 'Mollusca');
  registryStatus.textContent = matches.length ? '找到 ' + matches.length + ' 项名录记录。' : '未找到这个完整学名的软体动物记录。';
  registryResults.replaceChildren(...matches.map(record => listTaxon(record,
    record.status === 'accepted' && record.rank !== 'Species' && record.rank !== 'Subspecies' ? () => browse([record]) : null
  )));
});
showRoots();
get('scope-audit').replaceChildren(...scopes.map((label,index) => {
  const item = document.createElement('li');
  item.append(taxonButton(label, () => showCatalog(String(index))));
  const count = entries.filter(entry => entry[0] === index).length;
  const text = document.createElement('span');
  text.textContent = count + ' 条 · ' + ['现生八纲均有条目','跨类群选录','微观类群选录','相似形状对照'][index];
  item.append(text);
  return item;
}));
for (const link of document.querySelectorAll('[data-registry]')) {
  link.addEventListener('click', () => {
    registry.open = true;
    browse([roots.find(record => record.scientificname === link.dataset.registry)]);
    registry.scrollIntoView({block:'start'});
    registry.querySelector('summary').focus({preventScroll:true});
  });
}

const compareLeft = get('compare-left');
const compareRight = get('compare-right');
const specimens = entries.filter(entry => entry[7]);
for (const select of [compareLeft, compareRight]) {
  addOptions(select, specimens.map((record,index) => [index,record[2]]));
  select.addEventListener('change', updateComparison);
}
compareRight.value = specimens.findIndex(entry => entry[3] === 'Ovis canadensis');
function renderSpecimen(target, record) {
  const [, , name, latin, shape, , detail, image] = record;
  target.innerHTML = '<figure><img loading="lazy" src="' + image + '" alt="' + name + '标本照片"><figcaption><strong>' +
    name + '</strong><i>' + latin + '</i><span>' + shape + '</span></figcaption></figure><p>' + detail + '</p>';
}
function updateComparison() {
  const left = specimens[Number(compareLeft.value)];
  const right = specimens[Number(compareRight.value)];
  renderSpecimen(get('compare-left-card'), left);
  renderSpecimen(get('compare-right-card'), right);
  let note = '观察这两种结构各自的轮廓、边缘与开口。';
  if (left === right) note = '两侧选中了同一件标本。换一侧就可以比较。';
  else if (left[4] === right[4]) note = '两件标本都有' + left[4] + '的外观。沿着边缘看一圈，找找哪里开始出现差别。';
  const pair = [left[7], right[7]].sort().join(',');
  const observations = {
    'horn.webp,snail.webp': '先找蜗牛的壳顶，再找羊角的尖端。壳圈在顶端一层层围合，羊角能从根部追到自由伸出的角尖。两张侧影的相似，到这里有了边界。',
    'nautilus.webp,snail.webp': '先只看外缘，两件标本都有逐圈放大的轮廓。再看中心：蜗牛照片拍的是壳表面，鹦鹉螺照片拍的是剖面。剖面里横过螺旋的线，一道就是一面隔壁。',
    'chiton.webp,scallop.webp': '在扇贝上用手指从窄端向宽边划，能沿着一条放射肋走完全程。换到石鳖背上，从头端向尾端划，指尖会依次越过八块壳板。'
  };
  get('compare-note').textContent = observations[pair] || note;
  for (const button of document.querySelectorAll('[data-pair]')) {
    const files = button.dataset.pair.split(',').map(key => key + '.webp').sort();
    button.setAttribute('aria-pressed', files.join(',') === pair);
  }
}
for (const button of document.querySelectorAll('[data-pair]')) {
  button.addEventListener('click', () => {
    const [left, right] = button.dataset.pair.split(',');
    compareLeft.value = specimens.findIndex(entry => entry[7] === left + '.webp');
    compareRight.value = specimens.findIndex(entry => entry[7] === right + '.webp');
    updateComparison();
  });
}
updateComparison();
for (const button of document.querySelectorAll('[data-food]')) {
  button.addEventListener('click', () => {
    showCatalog('0');
    searchInput.value = button.dataset.food;
    updateCards();
  });
}
