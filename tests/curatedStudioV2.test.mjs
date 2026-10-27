import test from 'node:test';
import assert from 'node:assert/strict';
import { CURATED_STUDIO_V2, CURATED_STUDIO_V2_INFO } from '../src/curatedStudioV2.js';
import { normalizeCatalogEvent } from '../src/catalog.js';

test('curated pack includes 112 meaningful, unique, correctly shaped Polish editorial records',()=>{
  assert.equal(CURATED_STUDIO_V2.length,112);
  assert.equal(new Set(CURATED_STUDIO_V2.map(x=>x.id)).size,112);
  assert.deepEqual(CURATED_STUDIO_V2_INFO.topics,{
    cinema:45,games:32,science:24,technology:6,sport:5,
  });
  const normalized=CURATED_STUDIO_V2.map(normalizeCatalogEvent);
  assert.equal(normalized.length,112);
  assert.ok(normalized.every(x=>x.status==='review'));
  assert.ok(normalized.every(x=>x.title.length>=3&&x.description.length>=25));
  assert.ok(normalized.every(x=>x.tags.length===0));
  assert.ok(normalized.every(x=>x.sourceUrl.startsWith('https://')));
  assert.ok(normalized.every(x=>x.year!==0 && x.year<=2026));
  assert.ok(normalized.every(x=>x.categoryIds.length===1));
});
test('sample source-date checks and no technical tags',()=>{
  const get=title=>CURATED_STUDIO_V2.find(x=>x.title===title);
  assert.equal(get('Casablanca')?.year,1942);
  assert.equal(get('King Kong')?.year,1933);
  assert.equal(get('Premiera konsoli NES w Stanach Zjednoczonych')?.year,1985);
  assert.equal(get('Pierwsze lądowanie ludzi na Księżycu')?.year,1969);
  assert.equal(get('Odkrycie cząstki zgodnej z bozonem Higgsa')?.year,2012);
  assert.equal(get('Pierwszy start kobiet na igrzyskach olimpijskich')?.year,1900);
  assert.ok(!CURATED_STUDIO_V2.some(x=>x.id.includes('kurator-pl-')));
  const cinema=CURATED_STUDIO_V2.filter(x=>x.categoryIds.includes('cinema'));
  assert.equal(cinema.length,45);
  assert.ok(cinema.every(x=>!x.title.startsWith('Premiera')));
  assert.equal(get('Ojciec chrzestny')?.year,1972);
  assert.equal(get('Matrix')?.year,1999);
  assert.equal(get('Królewna Śnieżka i siedmiu krasnoludków')?.year,1937);
  assert.equal(get('Władca Pierścieni: Dwie wieże')?.year,2002);
});
