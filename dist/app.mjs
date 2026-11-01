import {filterProduce, monthLabel, nearestCity, readViewState, vegetableGroups} from './logic.mjs?v=3';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = url => typeof url === 'string' && /^https:\/\//.test(url) ? escape(url) : '#';
const readSaved = key => {try {return localStorage.getItem(key);} catch {return null;}};
const save = (key, value) => {try {value ? localStorage.setItem(key, value) : localStorage.removeItem(key);} catch {}};
const currentMonth = new Date().getMonth() + 1;
history.scrollRestoration = 'manual';
const state = {...readViewState(location.search, currentMonth), city:readSaved('dangji-city') || '', items:[], photos:[], cities:[]};
const preferredOrder = ['persimmon','pears','pumpkin','pomegranate','mandarin','lotus-root','apples','radish'];
let ready = false;
let activeDetail = '';

function rememberScroll() {
  if (!$('dialog[open]')) history.replaceState({...history.state, listScrollY:window.scrollY},'',location.href);
}

function writeView(push = false, clearHash = false) {
  const url = new URL(location.href);
  url.searchParams.set('month',state.month);
  for (const [key,value] of [['view',state.mode === 'all' ? 'all' : ''],['type',state.category === 'all' ? '' : state.category],['group',state.group === 'all' ? '' : state.group],['q',state.query]]) {
    value ? url.searchParams.set(key,value) : url.searchParams.delete(key);
  }
  if (clearHash) url.hash = '';
  if (push && url.href !== location.href) history.pushState({listScrollY:0},'',url);
  else history.replaceState(history.state,'',url);
}

function changeView(patch, {push = true} = {}) {
  if (!ready) return;
  rememberScroll();
  Object.assign(state,patch);
  $('#search').value = state.query;
  render();writeView(push,true);
  const heading = $('.catalog-heading').getBoundingClientRect();
  if (heading.top < $('.browse-tools').getBoundingClientRect().bottom || heading.bottom > window.innerHeight) $('#catalog').scrollIntoView({block:'start'});
  rememberScroll();
}

function updateCity() {
  $('#city-name').textContent = state.city || '选择城市';
  $('#region-description').textContent = state.city ? `${state.city}：暂无本地采收资料，当前为通用产区参考。` : '当前为通用产季参考，实际上市时间受产区、品种和天气影响。';
}

function renderMonths() {
  const list = $('#month-list');
  if (!list.children.length) list.innerHTML = Array.from({length:12}, (_, i) => `<button class="month-button ${i+1 === currentMonth ? 'is-current' : ''}" data-month="${i+1}" aria-pressed="${i+1 === state.month}" aria-label="${i+1}月${i+1 === currentMonth ? '，本月' : ''}"><span class="month-number">${i+1}</span><span class="month-suffix">月</span></button>`).join('');
  $$('#month-list button').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.month)===state.month));
  $('#selected-month').textContent = `${state.month}月 · 切换月份`;
}

function photoFor(item) {return state.photos.find(p => p.id === item.id && p.file);}
function photoHtml(item, className = '', loading = 'lazy') {
  const photo = photoFor(item);
  return photo ? `<img class="${className}" src="assets/${escape(photo.file.split('/').at(-1))}" alt="${escape(item.name)}实物参考" loading="${loading}" decoding="async">` : `<span class="image-fallback">${escape(item.name)}</span>`;
}

function card(item) {
  const inSeason = item.months.includes(state.month);
  const showStatus = state.mode === 'all' || state.query.trim() || item.seasonKind;
  const status = showStatus ? `<span class="status-tag ${inSeason ? '' : 'off-season'}">${inSeason ? escape(item.seasonKind || '参考当季') : '查看产季'}</span>` : '';
  return `<article class="produce-card"><a class="card-link" href="#produce/${escape(item.id)}" aria-label="查看${escape(item.name)}的产季、产区和选购指南"><div class="card-image" data-photo="${escape(item.id)}">${photoHtml(item)}</div><div class="card-body"><div class="card-heading"><h3>${escape(item.name)}</h3><span class="card-kind">${item.category === 'fruit' ? '水果' : '蔬菜'}</span></div><p class="card-taste">${escape(item.taste)}</p><p class="card-months"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="15" rx="2"/><path d="M8 3v5m8-5v5M4 11h16"/></svg><span><span class="sr-only">参考产季：</span>${escape(monthLabel(item.months))}</span>${status}</p><p class="card-pick"><span>挑选要点</span>${escape(item.pick[0])}</p><div class="card-footer"><span>产季 · 产区 · 选购</span><span aria-hidden="true">→</span></div></div></a></article>`;
}

function render() {
  renderMonths();
  updateCity();
  const searching = Boolean(state.query.trim());
  const filter = {...state, mode: searching ? 'all' : state.mode};
  $('#page-title').textContent = searching ? '找到你想买的那一种。' : state.mode === 'all' ? '蔬果图鉴，慢慢认识。' : `${state.month}月，吃点当季的。`;
  $('#catalog-title').textContent = searching ? '搜索结果' : state.mode === 'all' ? '全部图鉴' : `${state.month}月清单`;
  $$('.nav-link[data-mode]').forEach(b => {const selected = !searching && b.dataset.mode === state.mode;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected);});
  const counts = Object.fromEntries(['all','fruit','vegetable'].map(category => [category, filterProduce(state.items,{...filter,category,group:'all'}).length]));
  for (const category of ['all','fruit','vegetable']) $(`#count-${category}`).textContent = counts[category];
  $$('.category-tabs button').forEach(b => {const selected = b.dataset.category === state.category;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
  $('#vegetable-groups').hidden = state.category !== 'vegetable';
  $$('#vegetable-groups button').forEach(b => {
    b.setAttribute('aria-pressed',b.dataset.group === state.group);
    b.querySelector('span').textContent = filterProduce(state.items,{...filter,category:'vegetable',group:b.dataset.group}).length;
  });
  if (!$('#vegetable-groups').hidden) {
    const row = $('#vegetable-groups');
    const button = row.querySelector('[aria-pressed=true]').getBoundingClientRect();
    const bounds = row.getBoundingClientRect();
    row.scrollLeft += button.left < bounds.left ? button.left-bounds.left-4 : button.right > bounds.right ? button.right-bounds.right+4 : 0;
  }
  const items = filterProduce(state.items,filter).sort((a,b) => {
    const score = x => {const index = preferredOrder.indexOf(x.id);return index < 0 ? 100 : index;};
    return score(a)-score(b);
  });
  const groupLabel = vegetableGroups[state.group];
  const categoryLabel = state.category === 'fruit' ? '水果' : state.category === 'vegetable' ? '蔬菜' : '蔬果';
  $('#result-description').textContent = searching ? `${items.length} 种匹配 · 搜索全部月份${groupLabel ? ` · ${groupLabel}` : ''}` : `${items.length} 种${groupLabel || categoryLabel} · ${state.mode === 'all' ? `按${state.month}月标注参考产季` : `${state.month}月产季参考`}`;
  $('#clear-search').hidden = !state.query;
  $('#produce-grid').innerHTML = items.map(card).join('');
  $('#produce-grid').setAttribute('aria-busy','false');
  $('#empty-state').hidden = items.length > 0;
  const otherMatches = searching && !items.length && counts.all > 0;
  $('#empty-description').textContent = otherMatches ? `其他分类中有 ${counts.all} 种匹配，可以保留搜索词继续找。` : searching ? '试试其他常用名称或产地，也可以清除搜索词。' : `${state.month}月暂未收录这个分类的产季参考，可以换个月份或查看全年条目。`;
  $('#reset-search').textContent = otherMatches ? '在全部蔬果中搜索' : searching ? '清除搜索' : '查看这个分类的全年条目';
  $('#reset-search').dataset.action = otherMatches ? 'broaden' : searching ? 'clear' : 'year';
}

function photoCredit(photo) {
  return photo ? `<p class="source-note">图片：${escape(photo.author || '作者见来源')} · ${escape(photo.license || '')} <a href="${safeUrl(photo.sourceUrl)}" target="_blank" rel="noopener noreferrer">图片来源及许可 ↗</a></p>` : '';
}

function openDetail(item) {
  const inSeason = item.months.includes(state.month);
  const sourceRows = item.sources.map(s => `<a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ↗</a>`).join('');
  const photo = photoFor(item);
  $('#detail-content').innerHTML = `
    <div class="detail-top">
      <div class="card-image" data-photo="${escape(item.id)}">${photoHtml(item,'detail-photo','eager')}</div>
      <div class="detail-intro">
        <span class="detail-category">${item.category === 'fruit' ? '水果' : '蔬菜'}</span>
        <h2 id="detail-name">${escape(item.name)}</h2>
        <p class="detail-taste">${escape(item.taste)}</p>
      </div>
    </div>
    <section class="detail-overview" aria-labelledby="season-heading">
      <div class="detail-season-heading">
        <h3 id="season-heading">参考产季</h3>
        <span class="status-tag ${inSeason ? '' : 'off-season'}">${inSeason ? `${state.month}月 · ${escape(item.seasonKind || '参考当季')}` : `${state.month}月 · 未列入参考期`}</span>
      </div>
      <p class="season-range">${escape(monthLabel(item.months))}</p>
      <div class="detail-months" aria-label="参考产季：${escape(monthLabel(item.months))}">
        ${Array.from({length:12},(_,i)=>`<span class="${item.months.includes(i+1) ? 'in-season' : ''}" aria-label="${i+1}月，${item.months.includes(i+1) ? '参考产季' : '未列入参考期'}">${i+1}月</span>`).join('')}
      </div>
      <p class="calendar-note">深绿色为参考产季，具体时间因产地而异。</p>
      <div class="detail-origins">
        <h3>常见产区</h3>
        <p>${escape(item.origins)}</p>
      </div>
      <p class="season-note">${escape(item.notes || '月份为常见产区的宽泛参考，品种、产地与天气都会影响上市时间。')}</p>
      <p class="region-scope">通用产区参考，不代表${escape(state.city || '所在城市')}实时供应。</p>
    </section>
    <div class="detail-columns">
      <section class="detail-block"><h3>到摊位前，怎么挑？</h3><ul>${item.pick.map(t=>`<li>${escape(t)}</li>`).join('')}</ul><div class="detail-caution"><strong>多留意这一点</strong><p>${escape(Array.isArray(item.avoid) ? item.avoid.join('；') : item.avoid)}</p></div></section>
      <section class="detail-block"><h3>买回家，怎么放？</h3><p>${escape(item.storage)}</p></section>
    </div>
    <section class="source-section"><details><summary>资料出处与适用范围 · 核对于 ${escape(item.checkedAt)}</summary><p>适用于通用家庭选购参考，不代表${escape(state.city || '某个城市')}实时供应。</p>${sourceRows}<p class="source-note">季节与挑选保存信息可能参考不同资料；月份为宽泛区间，保存应以食材状态和商品标签为准。</p><div id="detail-photo-credit">${photoCredit(photo)}</div></details></section>`;
  activeDetail = item.id;
  const dialog = $('#detail-dialog');if (!dialog.open) dialog.showModal();dialog.scrollTop=0;
}

function syncLocation(restoreScroll = false) {
  const view = readViewState(location.search,currentMonth);
  const changed = Object.keys(view).some(key => view[key] !== state[key]);
  Object.assign(state,view);
  const id = location.hash.startsWith('#produce/') ? location.hash.slice(9) : '';
  const item = state.items.find(i=>i.id === id);
  const target = item ? 'detail-dialog' : {'#city':'city-dialog','#guide':'about-dialog','#credits':'credits-dialog'}[location.hash];
  $$('dialog[open]').filter(d=>d.id !== target).forEach(d=>d.close());
  if (changed && ready) {$('#search').value=state.query;render();}
  if (item && (!$('#detail-dialog').open || activeDetail !== id || changed)) openDetail(item);
  else if (target && !$('#'+target).open) {
    if (target === 'city-dialog') {
      $('#city-input').value=state.city;$('#city-error').textContent='';
      if (!$('#locate-button').disabled) $('#location-status').textContent='仅在点击后请求定位；坐标只在浏览器内用于匹配城市。';
    }
    if (target === 'credits-dialog') renderCredits();
    $('#'+target).showModal();
  }
  if (!target && restoreScroll && Number.isFinite(history.state?.listScrollY)) window.scrollTo(0,history.state.listScrollY);
}

function openModal(hash) {
  rememberScroll();
  if (location.hash !== hash) history.pushState({dangjiModal:true},'',hash);
  syncLocation();
}

function closeModal(dialog) {
  if (history.state?.dangjiModal) history.back();
  else {history.replaceState(history.state,'',location.pathname+location.search);dialog.close();syncLocation();}
}

function setCity(city) {state.city=city;save('dangji-city',city);updateCity();closeModal($('#city-dialog'));}

async function loadJson(name) {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),12000);
  try {
    const response = await fetch(name,{signal:controller.signal});
    if (!response.ok) throw new Error(name);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(name);
    return data;
  } finally {clearTimeout(timer);}
}

function renderCredits() {
  $('#photo-credits').innerHTML=state.photos.filter(p=>p.file).map(p=>`<div class="credit-row"><strong>${escape(state.items.find(i=>i.id===p.id)?.name || p.id)}</strong>${escape(p.author || '作者见原图页')} · ${escape(p.license || '许可见原图页')}<br><a href="${safeUrl(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">原图与作者信息 ↗</a>${p.licenseUrl ? ` · <a href="${safeUrl(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">许可条款 ↗</a>` : ''}<br>网页展示使用缩放或裁切后的图片。</div>`).join('') || '<p>图片资料暂未载入，文字内容仍可浏览。请稍后刷新重试。</p>';
}

async function loadPhotos() {
  try {
    state.photos = await loadJson('photos.json');
    $$('[data-photo]').forEach(container=>{
      const item = state.items.find(i=>i.id === container.dataset.photo);
      if (item) container.innerHTML = photoHtml(item,container.closest('#detail-dialog') ? 'detail-photo' : '',container.closest('#detail-dialog') ? 'eager' : 'lazy');
    });
    if ($('#detail-photo-credit')) $('#detail-photo-credit').innerHTML=photoCredit(photoFor(state.items.find(i=>i.id === activeDetail)));
    if ($('#credits-dialog').open) renderCredits();
  } catch { /* Photos are optional; named placeholders keep the guide usable. */ }
}

async function loadCities() {
  try {
    state.cities = await loadJson('cities.json');
    $('#city-options').innerHTML=state.cities.map(c=>`<option value="${escape(c.name)}"></option>`).join('');
  } catch { /* Manual city entry stays available without the coordinate data. */ }
}

async function load() {
  ready=false;
  $('#produce-grid').setAttribute('aria-busy','true');
  $('#produce-grid').innerHTML='<p class="loading-message">正在载入时令蔬果…</p>';
  $('#empty-state').hidden=true;
  $('#result-description').textContent='正在载入蔬果…';
  try {
    const items = await loadJson('produce.json');
    if (!items.length) throw new Error('Missing produce');
    state.items=items;
    $('#search').value=state.query;
    ready=true;render();writeView();syncLocation(true);
    if ($('#credits-dialog').open) renderCredits();
  } catch {
    $('#result-description').textContent='资料暂时没有载入成功';
    $('#produce-grid').setAttribute('aria-busy','false');
    $('#produce-grid').innerHTML='<div class="loading-message">蔬果资料暂时无法载入，请检查网络后重试。<br><button class="text-button" id="retry-load">重新载入 →</button></div>';
  }
}

function selectMonth(month) {
  changeView({month});
  if (window.matchMedia('(max-width:760px)').matches) {
    $('.month-panel').dataset.monthOpen='false';
    $('#month-toggle').setAttribute('aria-expanded','false');
    $('#month-toggle').focus({preventScroll:true});
  }
}
$('#month-toggle').addEventListener('click',()=>{
  const open=$('#month-toggle').getAttribute('aria-expanded')!=='true';
  $('#month-toggle').setAttribute('aria-expanded',open);
  $('.month-panel').dataset.monthOpen=String(open);
});
$('#month-list').addEventListener('click',e=>{const b=e.target.closest('[data-month]');if(b&&ready)selectMonth(Number(b.dataset.month));});
$('#today-button').addEventListener('click',()=>{if(ready)selectMonth(currentMonth);});
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>changeView({mode:b.dataset.mode,query:''})));
$$('[data-category]').forEach(b=>b.addEventListener('click',()=>changeView({category:b.dataset.category,group:'all'})));
$('#vegetable-groups').innerHTML=Object.entries({all:'全部蔬菜',...vegetableGroups}).map(([id,label])=>`<button data-group="${id}" aria-pressed="false">${label}<span></span></button>`).join('');
$('#vegetable-groups').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(b)changeView({group:b.dataset.group});});
function searchChanged(e) {if(!e.isComposing && state.query !== e.target.value) changeView({query:e.target.value},{push:false});}
$('#search').addEventListener('input',searchChanged);
$('#search').addEventListener('compositionend',searchChanged);
$('#clear-search').addEventListener('click',()=>{changeView({query:''});$('#search').focus({preventScroll:true});});
$('#reset-search').addEventListener('click',()=>{
  changeView($('#reset-search').dataset.action === 'broaden' ? {category:'all',group:'all'} : $('#reset-search').dataset.action === 'year' ? {mode:'all'} : {query:''});
});
$('#see-all').addEventListener('click',()=>changeView({mode:'all',query:'',category:'all',group:'all'}));
$$('.about-trigger').forEach(b=>b.addEventListener('click',()=>openModal('#guide')));
$('.city-trigger').addEventListener('click',()=>openModal('#city'));
$('#clear-city').addEventListener('click',()=>setCity(''));
$('#city-suggestions').innerHTML=['北京','上海','广州','深圳','杭州','成都','武汉','西安','南京','重庆','长沙','昆明'].map(c=>`<button data-city="${c}">${c}</button>`).join('');
$('#city-suggestions').addEventListener('click',e=>{const b=e.target.closest('[data-city]');if(b)setCity(b.dataset.city);});
$('#city-form').addEventListener('submit',e=>{e.preventDefault();const city=$('#city-input').value.trim();if(!/^[\u3400-\u9fff·]{2,16}$/.test(city)){$('#city-error').textContent='请输入 2–16 个汉字的城市名称，例如“杭州”。';return;}setCity(city);});
$('#locate-button').addEventListener('click',()=>{
  const status=$('#location-status');const button=$('#locate-button');
  if(!navigator.geolocation || !window.isSecureContext){status.textContent='当前浏览器或连接不支持定位，请手动选择城市。';return;}
  if(!state.cities.length){status.textContent='城市资料未载入，请稍后重试或手动输入。';return;}
  button.disabled=true;status.textContent='正在请求位置，请在浏览器提示中选择是否允许。';
  navigator.geolocation.getCurrentPosition(position=>{
    button.disabled=false;const city=nearestCity(position.coords.latitude,position.coords.longitude,state.cities);
    if(city){$('#city-input').value=city.name;status.textContent=`位置大约在${city.name}附近。请核对城市名称后点击“确定”。`;}
    else status.textContent='未匹配到附近城市，请手动输入。精确坐标未保存。';
  },error=>{button.disabled=false;status.textContent=error.code===1?'你未允许定位，可以继续手动选择城市。':'暂时无法取得位置，请手动选择城市。';},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
});
$$('dialog').forEach(dialog=>{
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal(dialog);}});
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeModal(dialog);});
  dialog.querySelector('[data-close]').addEventListener('click',()=>closeModal(dialog));
});
$('#credits-trigger').addEventListener('click',()=>openModal('#credits'));
$('#produce-grid').addEventListener('click',e=>{
  if(e.target.closest('#retry-load')) {load();return;}
  const link=e.target.closest('a.card-link');
  if(link && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {e.preventDefault();openModal(link.hash);}
});
document.addEventListener('error',e=>{if(e.target.tagName==='IMG' && e.target.closest('[data-photo]')){const image=e.target;const fallback=document.createElement('span');fallback.className='image-fallback';fallback.textContent=image.alt.replace('实物参考','');image.replaceWith(fallback);}},true);
window.addEventListener('popstate',()=>syncLocation(true));
window.addEventListener('hashchange',()=>syncLocation());
window.addEventListener('scrollend',rememberScroll);
window.addEventListener('pagehide',rememberScroll);
updateCity();renderMonths();syncLocation();loadPhotos();loadCities();load();
