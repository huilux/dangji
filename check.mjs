import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {filterProduce, monthLabel, nearestCity} from './dist/logic.mjs';

const read = file => JSON.parse(readFileSync(new URL(`./dist/${file}`,import.meta.url),'utf8'));
const items = read('produce.json');
const photos = read('photos.json');
const cities = read('cities.json');
assert.equal(items.length,40);
assert.equal(new Set(items.map(i=>i.id)).size,40);
for(const category of ['fruit','vegetable']) assert.equal(items.filter(i=>i.category===category).length,20);
for(const item of items) {
  for(const key of ['id','name','origins','taste','storage','checkedAt']) assert.equal(typeof item[key],'string',`${item.id}: ${key}`);
  assert.ok(item.months.length>0 && item.months.every(m=>Number.isInteger(m)&&m>=1&&m<=12),item.id);
  assert.equal(new Set(item.months).size,item.months.length,item.id);
  assert.ok(item.pick.length>=2 && item.sources.length>0,item.id);
  for(const source of item.sources) assert.match(source.url,/^https:\/\//);
  const photo=photos.find(p=>p.id===item.id);
  assert.ok(photo && existsSync(new URL(`./dist/assets/${photo.file}`,import.meta.url)),`Missing image ${item.id}`);
  assert.ok(photo.author && photo.license && photo.sourceUrl,`Missing attribution ${item.id}`);
}
for(let month=1;month<=12;month++) {
  const matches=filterProduce(items,{month});
  assert.ok(matches.length>0,`Empty month ${month}`);
  assert.ok(matches.every(item=>item.months.includes(month)));
  assert.equal(filterProduce(items,{month,mode:'all'}).length,40);
}
assert.equal(filterProduce(items,{month:1,mode:'all',category:'fruit'}).length,20);
assert.equal(filterProduce(items,{month:1,mode:'all',query:'  苹果 '})[0].id,'apples');
assert.equal(filterProduce(items,{month:10,query:'不存在的东西'}).length,0);
assert.equal(monthLabel([9,8,10]),'8–10月');
assert.equal(monthLabel([12,1,2]),'1–2月、12月');
assert.equal(monthLabel([5]),'5月');
assert.equal(monthLabel(Array.from({length:12},(_,i)=>i+1)),'全年有产区上市');
assert.equal(nearestCity(31.23,121.47,cities).name,'上海市');
assert.equal(nearestCity(0,0,cities),null);
assert.equal(nearestCity(NaN,120,cities),null);
console.log(`通过：40条内容结构、图片署名、12个月筛选、搜索、月份分组与城市匹配。城市库 ${cities.length} 条。`);
