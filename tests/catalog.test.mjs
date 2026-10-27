import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEED_CATEGORIES,CATEGORY_TREE,slugify,normalizeCatalogCategory,
  normalizeCatalogEvent,parseCatalogCsv,parseEventImport,
} from '../src/catalog.js';

test('taxonomy provides 12 departments and 72 distinct subcategories',()=>{
  assert.equal(CATEGORY_TREE.length,12);
  assert.equal(SEED_CATEGORIES.length,84);
  assert.equal(new Set(SEED_CATEGORIES.map(c=>c.id)).size,84);
  assert.equal(SEED_CATEGORIES.filter(c=>!!c.parentId).length,72);
  assert.equal(slugify('Łódź i żółte góry'),'lodz-i-zolte-gory');
  assert.ok(SEED_CATEGORIES.every(c=>c.status==='draft'));
});
test('validate catalogue event and multi-category membership',()=>{
  const e=normalizeCatalogEvent({
    id:'event-1',title:'Ważne wydarzenie',year:1990,categoryIds:['poland','cinema','poland'],
    sourceUrl:'https://example.com/source',difficulty:3,status:'review',tags:'PRL, film',
  });
  assert.deepEqual(e.categoryIds,['poland','cinema']);
  assert.equal(e.titleSort,'ważne wydarzenie');
  assert.deepEqual(e.tags,['PRL','film']);
  assert.throws(()=>normalizeCatalogEvent({...e,year:0}),/Rok/);
  assert.throws(()=>normalizeCatalogEvent({...e,sourceUrl:'http://example.com'}),/HTTPS/);
  assert.throws(()=>normalizeCatalogEvent({...e,categoryIds:[]}),/kategorii/);
  assert.throws(()=>normalizeCatalogEvent({...e,sourceUrl:'',status:'published'}),/źródła/);
});
test('category input prevents invalid IDs and own-parent cycles',()=>{
  const c=normalizeCatalogCategory({id:'poland--prl',name:'PRL',parentId:'poland'});
  assert.equal(c.parentId,'poland');
  assert.throws(()=>normalizeCatalogCategory({...c,parentId:c.id}),/rodzicem/);
  assert.throws(()=>normalizeCatalogCategory({...c,id:'śąć'}),/ID/);
});
test('JSON and quoted CSV input produce usable documents',()=>{
  const json=parseEventImport(JSON.stringify([{title:'Nowe wydarzenie',year:2020,categoryIds:['science']}]));
  assert.equal(json.length,1);
  assert.equal(json[0].status,'draft');
  const csv='title,year,categoryIds,description\n"Premiera, filmu",1999,cinema,"Opis, szczegóły"\n';
  const data=parseCatalogCsv(csv);
  assert.equal(data[0].title,'Premiera, filmu');
  assert.equal(data[0].description,'Opis, szczegóły');
  const semicolon=parseCatalogCsv('title;year;categoryIds;description\n"Pierwsza premiera";2001;"cinema,poland";"Opis"');
  assert.deepEqual(semicolon[0].categoryIds,['cinema','poland']);
});
