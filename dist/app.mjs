import {filterProduce, monthLabel, nearestCity, readViewState} from './logic.mjs?v=2';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = url => typeof url === 'string' && /^https:\/\//.test(url) ? escape(url) : '#';
const readSaved = key => {try {return localStorage.getItem(key);} catch {return null;}};
const save = (key, value) => {try {value ? localStorage.setItem(key, value) : localStorage.removeItem(key);} catch {}};
const currentMonth = new Date().getMonth() + 1;
const state = {...readViewState(location.search, currentMonth), city:readSaved('dangji-city') || '', items:[], photos:[], cities:[]};
const preferredOrder = ['persimmon','pears','pumpkin','pomegranate','mandarin','lotus-root','apples','radish'];
let ready = false;

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
  return `<article class="produce-card"><a class="card-link" href="#produce/${escape(item.id)}" aria-label="查看${escape(item.name)}的挑选和保存方法"><div class="card-image">${photoHtml(item)}</div><div class="card-body"><div class="card-heading"><h3>${escape(item.name)}</h3><span class="card-kind">${item.category === 'fruit' ? '水果' : '蔬菜'}</span></div><p class="card-taste">${escape(item.taste)}</p><p class="card-months"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="15" rx="2"/><path d="M8 3v5m8-5v5M4 11h16"/></svg><span>${escape(monthLabel(item.months))}</span>${status}</p><p class="card-pick"><span>挑选要点</span>${escape(item.pick[0])}</p><div class="card-footer"><span>挑选与保存</span><span aria-hidden="true">→</span></div></div></a></article>`;
}

function render() {
  renderMonths();
  updateCity();
  const searching = Boolean(state.query.trim());
  const filter = {...state, mode: searching ? 'all' : state.mode};
  $('#page-title').textContent = searching ? '找到你想买的那一种。' : state.mode === 'all' ? '蔬果图鉴，慢慢认识。' : `${state.month}月，吃点当季的。`;
  $('#catalog-title').textContent = searching ? '搜索结果' : state.mode === 'all' ? '全部图鉴' : `${state.month}月清单`;
  $$('.nav-link[data-mode]').forEach(b => {const selected = !searching && b.dataset.mode === state.mode;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected);});
  const counts = Object.fromEntries(['all','fruit','vegetable'].map(category => [category, filterProduce(state.items,{...filter,category}).length]));
  for (const category of ['all','fruit','vegetable']) $(`#count-${category}`).textContent = counts[category];
  $$('.category-tabs button').forEach(b => {const selected = b.dataset.category === state.category;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
  const items = filterProduce(state.items,filter).sort((a,b) => {
    const score = x => {const index = preferredOrder.indexOf(x.id);return index < 0 ? 100 : index;};
    return score(a)-score(b);
  });
  $('#result-description').textContent = searching ? `${items.length} 种匹配 · 搜索全部月份` : state.mode === 'all' ? `${items.length} 种蔬果 · 按${state.month}月标注参考产季` : `${items.length} 种蔬果 · ${state.month}月产季参考`;
  $('#clear-search').hidden = !state.query;
  $('#produce-grid').innerHTML = items.map(card).join('');
  $('#produce-grid').setAttribute('aria-busy','false');
  $('#empty-state').hidden = items.length > 0;
  $('#empty-description').textContent = searching ? '试试其他常用名称或产地，也可以清除分类筛选。' : '这个分类里暂时没有匹配项，换个分类或月份看看。';
  const url = new URL(location.href);
  url.searchParams.set('month',state.month);
  for (const [key,value] of [['view',state.mode === 'all' ? 'all' : ''],['type',state.category === 'all' ? '' : state.category],['q',state.query]]) {
    value ? url.searchParams.set(key,value) : url.searchParams.delete(key);
  }
  history.replaceState(null,'',url);
}

function openDetail(item) {
  const inSeason = item.months.includes(state.month);
  const sourceRows = item.sources.map(s => `<a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ↗</a>`).join('');
  const photo = photoFor(item);
  $('#detail-content').innerHTML = `<div class="detail-top"><div class="card-image">${photoHtml(item,'detail-photo','eager')}</div><div class="detail-intro"><span class="detail-category">${item.category === 'fruit' ? '水果' : '蔬菜'}</span><h2 id="detail-name">${escape(item.name)}</h2><div class="detail-taste">${escape(item.taste)}</div><span class="status-tag ${inSeason ? '' : 'off-season'}">${inSeason ? `${state.month}月 · ${escape(item.seasonKind || '参考当季')}` : `${state.month}月 · 未列入参考期`}</span><p>参考产季：${escape(monthLabel(item.months))}</p></div></div><div class="detail-columns"><section class="detail-block"><h3>到摊位前，怎么挑？</h3><ul>${item.pick.map(t=>`<li>${escape(t)}</li>`).join('')}</ul><div class="detail-caution"><strong>多留意这一点</strong><p>${escape(Array.isArray(item.avoid) ? item.avoid.join('；') : item.avoid)}</p></div></section><section class="detail-block"><h3>买回家，怎么放？</h3><p>${escape(item.storage)}</p></section></div><section class="detail-section"><details><summary>产季与常见产区<span>${escape(monthLabel(item.months))}</span></summary><div class="detail-months" aria-label="参考当季月份：${escape(monthLabel(item.months))}">${Array.from({length:12},(_,i)=>`<span class="${item.months.includes(i+1) ? 'in-season' : ''}">${i+1}月</span>`).join('')}</div><p>常见产区：${escape(item.origins)}</p><p class="source-note">${escape(item.notes || '月份为常见产区的宽泛参考，品种、产地与天气都会影响上市时间。')}</p></details></section><section class="source-section"><details><summary>资料出处与适用范围 · 核对于 ${escape(item.checkedAt)}</summary><p>适用于通用家庭选购参考，不代表${escape(state.city || '某个城市')}实时供应。</p>${sourceRows}<p class="source-note">季节与挑选保存信息可能参考不同资料；月份为宽泛区间，保存应以食材状态和商品标签为准。</p>${photo ? `<p class="source-note">图片：${escape(photo.author || '作者见来源')} · ${escape(photo.license || '')} <a href="${safeUrl(photo.sourceUrl)}" target="_blank" rel="noopener noreferrer">图片来源及许可 ↗</a></p>` : ''}</details></section>`;
  const dialog = $('#detail-dialog');if (!dialog.open) dialog.showModal();dialog.scrollTop=0;
}

function handleHash() {
  if (!ready) return;
  const id = location.hash.startsWith('#produce/') ? location.hash.slice(9) : '';
  const item = state.items.find(i=>i.id === id);
  if (item) openDetail(item);
  else if ($('#detail-dialog').open) $('#detail-dialog').close();
}

function setCity(city) {state.city=city;save('dangji-city',city);updateCity();$('#city-dialog').close();}
function openCity() {$('#city-input').value=state.city;$('#city-error').textContent='';$('#city-dialog').showModal();}

async function load() {
  try {
    const loadJson = async name => {const r=await fetch(name);if (!r.ok) throw new Error(name);return r.json();};
    const [items,photos,cities]=await Promise.all([loadJson('produce.json'),loadJson('photos.json').catch(()=>[]),loadJson('cities.json').catch(()=>[])]);
    if (!Array.isArray(items) || !items.length) throw new Error('Missing produce');
    state.items=items;state.photos=photos;state.cities=cities;
    $('#city-options').innerHTML=cities.map(c=>`<option value="${escape(c.name)}"></option>`).join('');
    $('#search').value=state.query;
    ready=true;render();handleHash();
  } catch {
    $('#result-description').textContent='资料暂时没有载入成功';
    $('#produce-grid').setAttribute('aria-busy','false');
    $('#produce-grid').innerHTML='<div class="loading-message">蔬果资料暂时无法载入，请检查网络后重试。<br><button class="text-button" id="retry-load">重新载入 →</button></div>';
  }
}

function selectMonth(month) {
  state.month=month;render();
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
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{if(ready){state.mode=b.dataset.mode;state.query='';$('#search').value='';render();}}));
$$('[data-category]').forEach(b=>b.addEventListener('click',()=>{if(ready){state.category=b.dataset.category;render();}}));
$('#search').addEventListener('input',e=>{state.query=e.target.value;if(ready)render();});
$('#clear-search').addEventListener('click',()=>{state.query='';$('#search').value='';render();$('#search').focus();});
$('#reset-search').addEventListener('click',()=>{state.query='';state.category='all';$('#search').value='';render();});
$('#see-all').addEventListener('click',()=>{state.mode='all';state.query='';state.category='all';$('#search').value='';render();});
$$('.about-trigger').forEach(b=>b.addEventListener('click',()=>$('#about-dialog').showModal()));
$('.city-trigger').addEventListener('click',openCity);
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
$$('dialog').forEach(dialog=>{dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());});
$('#detail-dialog').addEventListener('close',()=>{if(location.hash.startsWith('#produce/'))history.replaceState(null,'',location.pathname+location.search);});
$('#credits-trigger').addEventListener('click',()=>{
  $('#photo-credits').innerHTML=state.photos.filter(p=>p.file).map(p=>`<div class="credit-row"><strong>${escape(state.items.find(i=>i.id===p.id)?.name || p.id)}</strong>${escape(p.author || '作者见原图页')} · ${escape(p.license || '许可见原图页')}<br><a href="${safeUrl(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">原图与作者信息 ↗</a>${p.licenseUrl ? ` · <a href="${safeUrl(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">许可条款 ↗</a>` : ''}<br>网页展示使用缩放或裁切后的图片。</div>`).join('') || '<p>当前没有使用外部图片。</p>';
  $('#credits-dialog').showModal();
});
$('#produce-grid').addEventListener('click',e=>{if(e.target.closest('#retry-load'))load();});
$('#produce-grid').addEventListener('error',e=>{if(e.target.tagName==='IMG'){const image=e.target;const fallback=document.createElement('span');fallback.className='image-fallback';fallback.textContent=image.alt.replace('实物参考','');image.replaceWith(fallback);}},true);
window.addEventListener('hashchange',handleHash);
updateCity();renderMonths();load();
