import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CINEMA_TITLE_FIXES,eligibleCinemaTitleFix,previewCinemaTitleFixes,
} from '../src/filmTitleCleanup.js';
import { CURATED_STUDIO_V2 } from '../src/curatedStudioV2.js';

test('correct Polish film titles are all in nominative and match the same immutable source IDs',()=>{
  assert.equal(CINEMA_TITLE_FIXES.length,45);
  assert.equal(new Set(CINEMA_TITLE_FIXES.map(x=>x.id)).size,45);
  for(const record of CINEMA_TITLE_FIXES){
    assert.ok(record.oldTitle.startsWith('Premiera '));
    assert.ok(!record.newTitle.startsWith('Premiera '));
    const normalized=CURATED_STUDIO_V2.find(x=>x.id===record.id);
    assert.equal(normalized?.title,record.newTitle);
    assert.equal(normalized?.year,record.year);
  }
});
test('cleanup preview skips missing docs, renamed docs and unrelated categories',()=>{
  const old=CINEMA_TITLE_FIXES[0],newName=CINEMA_TITLE_FIXES[1];
  const list=[
    {...old,title:old.oldTitle,categoryIds:['cinema']},
    {...newName,title:newName.newTitle,categoryIds:['cinema']},
    {id:'unrelated',title:old.oldTitle,categoryIds:['cinema']},
    {...CINEMA_TITLE_FIXES[2],categoryIds:['world']},
    {...CINEMA_TITLE_FIXES[3],title:'Ręcznie zmieniony',categoryIds:['cinema']},
  ];
  const pending=previewCinemaTitleFixes(list);
  assert.equal(pending.length,1);
  assert.equal(pending[0].id,old.id);
  assert.equal(eligibleCinemaTitleFix({...old,year:2000,categoryIds:['cinema']}),null);
});
