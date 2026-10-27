import test from 'node:test';
import assert from 'node:assert/strict';
import {
  wikidataQuery,parseWikidataResults,identifyCandidateDuplicates,
  fetchWikidataCandidates,WIKIDATA_SCOPES,
} from '../src/wikidataImporter.js';

const result={
  results:{bindings:[
    {item:{value:'http://www.wikidata.org/entity/Q123'},itemLabel:{value:'Wydarzenie historyczne'},
      itemDescription:{value:'Opis wydarzenia'},date:{value:'1991-05-12T00:00:00Z'}},
    {item:{value:'http://www.wikidata.org/entity/Q123'},itemLabel:{value:'Wydarzenie historyczne'},
      date:{value:'1991-05-12T00:00:00Z'}},
    {item:{value:'http://www.wikidata.org/entity/Q456'},itemLabel:{value:'Q456'},
      date:{value:'2000-01-01T00:00:00Z'}},
    {item:{value:'http://www.wikidata.org/entity/Q789'},itemLabel:{value:'Drugie wydarzenie'},
      date:{value:'2003-07-25T00:00:00Z'}},
  ]},
};
test('templates are restricted to 3 fixed scopes and bounded counts',()=>{
  assert.deepEqual(Object.keys(WIKIDATA_SCOPES),['poland','world','science']);
  assert.match(wikidataQuery({scope:'poland',startYear:1980,endYear:1999,limit:25}),/wd:Q36/);
  assert.match(wikidataQuery({scope:'world',startYear:1980,endYear:1999,limit:25}),/wd:Q1190554/);
  assert.match(wikidataQuery({scope:'science',startYear:1980,endYear:1999,limit:50}),/wdt:P575/);
  assert.throws(()=>wikidataQuery({scope:'other',startYear:1980,endYear:1999}),/Nieznany zakres/);
  assert.throws(()=>wikidataQuery({scope:'poland',startYear:2030,endYear:1900}),/przedział/);
  assert.throws(()=>wikidataQuery({scope:'poland',startYear:1900,endYear:2000,limit:200}),/Dozwolone partie/);
});
test('sparql rows generate review-only, attributable and unique source IDs',()=>{
  const parsed=parseWikidataResults(result,'poland');
  assert.equal(parsed.received,4);
  assert.equal(parsed.rejected,1);
  assert.equal(parsed.items.length,2);
  assert.equal(parsed.items[0].id,'wikidata-q123');
  assert.equal(parsed.items[0].status,'draft');
  assert.equal(parsed.items[0].sourceUrl,'https://www.wikidata.org/wiki/Q123');
  assert.deepEqual(parsed.items[0].categoryIds,['poland']);
  assert.ok(parsed.items[1].flags.includes('Brak opisu w Wikidata'));
  const selection=identifyCandidateDuplicates(parsed.items,['wikidata-q123']);
  assert.equal(selection[0].selected,false);
  assert.equal(selection[1].selected,true);
});
test('fetch parses response and handles upstream rate limiting',async()=>{
  const ok=async(url)=>({ok:true,status:200,json:async()=>result});
  const records=await fetchWikidataCandidates({scope:'poland',startYear:1990,endYear:2010,limit:25},ok);
  assert.equal(records.items.length,2);
  await assert.rejects(()=>fetchWikidataCandidates({scope:'poland',startYear:1990,endYear:2010,limit:25},
    async()=>({ok:false,status:429})),/429/);
});
