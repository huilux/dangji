import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {filterProduce, monthLabel, nearestCity, readViewState} from './dist/logic.mjs';

const read = file => JSON.parse(readFileSync(new URL(`./dist/${file}`,import.meta.url),'utf8'));
const items = read('produce.json');
const photos = read('photos.json');
const cities = read('cities.json');
assert.equal(items.length,100);
assert.equal(new Set(items.map(i=>i.id)).size,items.length);
assert.equal(new Set(items.map(i=>i.name)).size,items.length);
for(const [category,count] of [['fruit',40],['vegetable',60]]) assert.equal(items.filter(i=>i.category===category).length,count);
assert.equal(photos.length,items.length);
assert.equal(new Set(photos.map(p=>p.id)).size,photos.length);
for(const item of items) {
  for(const key of ['id','name','origins','taste','storage','checkedAt','notes']) assert.ok(typeof item[key]==='string' && item[key].trim(),`${item.id}: ${key}`);
  assert.match(item.checkedAt,/^\d{4}-\d{2}-\d{2}$/);
  assert.ok(item.months.length>0 && item.months.every(m=>Number.isInteger(m)&&m>=1&&m<=12),item.id);
  assert.equal(new Set(item.months).size,item.months.length,item.id);
  assert.ok(item.pick.length>=2 && item.sources.length>0,item.id);
  for(const kind of ['season','guide']) assert.ok(item.sources.some(s=>s.kind===kind),`${item.id}: missing ${kind} source`);
  for(const source of item.sources) {assert.match(source.url,/^https:\/\//);assert.ok(source.title.trim());}
  const photo=photos.find(p=>p.id===item.id);
  assert.ok(photo && existsSync(new URL(`./dist/assets/${photo.file}`,import.meta.url)),`Missing image ${item.id}`);
  assert.ok(photo.author && photo.license && photo.sourceUrl,`Missing attribution ${item.id}`);
}
for(let month=1;month<=12;month++) {
  const matches=filterProduce(items,{month});
  assert.ok(matches.length>0,`Empty month ${month}`);
  assert.ok(matches.every(item=>item.months.includes(month)));
  assert.equal(filterProduce(items,{month,mode:'all'}).length,items.length);
}
assert.equal(filterProduce(items,{month:1,mode:'all',category:'fruit'}).length,40);
assert.equal(filterProduce(items,{month:1,mode:'all',query:'  苹果 '})[0].id,'apples');
assert.equal(filterProduce(items,{month:10,query:'不存在的东西'}).length,0);
assert.equal(monthLabel([9,8,10]),'8–10月');
assert.equal(monthLabel([12,1,2]),'1–2月、12月');
assert.equal(monthLabel([5]),'5月');
assert.equal(monthLabel(Array.from({length:12},(_,i)=>i+1)),'全年有产区上市');
assert.equal(nearestCity(31.23,121.47,cities).name,'上海市');
assert.equal(nearestCity(0,0,cities),null);
assert.equal(nearestCity(NaN,120,cities),null);
assert.deepEqual(readViewState('?month=6&type=fruit&q=西红柿&view=all',10), {
  month:6,category:'fruit',query:'西红柿',mode:'all'
});
assert.deepEqual(readViewState('?month=13&type=invalid&view=invalid',10), {
  month:10,category:'all',query:'',mode:'seasonal'
});
assert.equal(readViewState('?month=1.5',10).month,10);
assert.equal(readViewState('?q='+'a'.repeat(100),10).query.length,60);
assert.equal(filterProduce(items,{month:10,mode:'all',query:'西红柿'})[0].id,'tomato');
for(const [query,id] of [['凤梨','pineapple'],['蒜苗','garlic-greens'],['香菇','shiitake'],['双孢蘑菇','button-mushroom']]) {
  assert.ok(filterProduce(items,{month:1,mode:'all',query}).some(item=>item.id===id),`Missing alias ${query}`);
}
console.log(`通过：${items.length}条内容结构、图片署名、12个月筛选、搜索、月份分组与城市匹配。城市库 ${cities.length} 条。`);
