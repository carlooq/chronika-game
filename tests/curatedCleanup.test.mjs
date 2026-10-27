import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURATED_PL_V1_LEVELS,CURATED_PL_V1_IDS,CURATED_TAGS_TO_REMOVE,
  cleanCuratedV1Tags,curatedV1CleanupPreview,
} from '../src/curatedCleanup.js';

test('exactly 38 curated records remain identifiable for a safe one-time cleanup',()=>{
  assert.equal(CURATED_PL_V1_IDS.length,38);
  assert.equal(new Set(CURATED_PL_V1_IDS).size,38);
  assert.equal(Object.values(CURATED_PL_V1_LEVELS).filter(x=>x==='ikoniczne').length,25);
  assert.equal(Object.values(CURATED_PL_V1_LEVELS).filter(x=>x==='znane').length,13);
  assert.deepEqual(CURATED_TAGS_TO_REMOVE,['kuratorskie-pl-v1','ikoniczne','znane']);
});
test('only those three unwanted tags are removed from specific curated IDs',()=>{
  const id='kurator-pl-grunwald';
  assert.deepEqual(cleanCuratedV1Tags(id,['kuratorskie-pl-v1','ikoniczne','bitwa','Polska']),['bitwa','Polska']);
  assert.deepEqual(cleanCuratedV1Tags(id,['kuratorskie-pl-v1','ikoniczne']),[]);
  assert.equal(cleanCuratedV1Tags('random-doc',['ikoniczne','znane']),null);
  assert.equal(cleanCuratedV1Tags(id,['bitwa','Polska']),null);
});
test('preview never includes unrelated documents, preserving event metadata',()=>{
  const changes=curatedV1CleanupPreview([
    {id:'kurator-pl-grunwald',title:'Bitwa pod Grunwaldem',year:1410,tags:['kuratorskie-pl-v1','ikoniczne']},
    {id:'unrelated',title:'Nie zmieniaj',year:2020,tags:['kuratorskie-pl-v1']},
  ]);
  assert.equal(changes.length,1);
  assert.equal(changes[0].recognitionLevel,'ikoniczne');
  assert.equal(changes[0].title,'Bitwa pod Grunwaldem');
  assert.deepEqual(changes[0].afterTags,[]);
});
