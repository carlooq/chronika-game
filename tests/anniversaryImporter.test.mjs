import test from 'node:test';
import assert from 'node:assert/strict';
import {
  anniversaryDate,nextAnniversaryDay,anniversaryFeedUrl,parseAnniversaryDay,
  uniqueAnniversaryCandidates,fetchSelectedAnniversaries,
} from '../src/anniversaryImporter.js';

function page(name='Apollo 11'){
  return {titles:{normalized:name,canonical:name.replace(/ /g,'_')},
    content_urls:{desktop:{page:'https://en.wikipedia.org/wiki/'+name.replace(/ /g,'_')}}};
}
const event=(year,text,name)=>({year,text,pages:[page(name)]});

test('source URL and leap-year rollover are safe and deterministic',()=>{
  assert.equal(anniversaryDate(1,3),'01-03');
  assert.equal(nextAnniversaryDay('02-28'),'02-29');
  assert.equal(nextAnniversaryDay('12-31'),'01-01');
  assert.match(anniversaryFeedUrl('10-27'),/\/selected\/10\/27$/);
  assert.throws(()=>anniversaryFeedUrl('02-30'),/Niepoprawny/);
});
test('selected anniversaries are drafts without copying source article text',()=>{
  const feed={selected:[
    event(1969,'Apollo 11 crew reaches the Moon.','Apollo 11'),
    event(1915,'Obscure single football season.','1915 Football Season'),
    {year:2000,text:'No linked article',pages:[]},
  ]};
  const result=parseAnniversaryDay(feed,'07-20');
  assert.equal(result.received,3);
  assert.equal(result.rejected,1);
  assert.equal(result.items.length,2);
  assert.equal(result.items[0].year,1969);
  assert.equal(result.items[0].status,'draft');
  assert.equal(result.items[0].description,'');
  assert.deepEqual(result.items[0].tags,[]);
  assert.ok(result.items[0].originalText.includes('Moon'));
  assert.equal(result.items[0].sourceUrl,'https://en.wikipedia.org/wiki/Apollo_11');
  assert.equal(result.items[1].flags.length>1,true);
});
test('candidate identity ignores repeated retrieval and flags stored IDs',()=>{
  const item=parseAnniversaryDay({selected:[event(1969,'Apollo 11 reached the Moon.','Apollo 11')]},'07-20').items[0];
  const result=uniqueAnniversaryCandidates([item,item],[item.id]);
  assert.equal(result[0].alreadyStored,true);
  assert.equal(result[0].selected,false);
  assert.equal(result[1].duplicateInBatch,true);
});
test('fetch batch respects fixed 7-day minimum and returns partial failures',async()=>{
  let calls=0;
  const fakeFetch=async url=>{
    calls++;
    if(url.endsWith('/01/04'))return {ok:false,status:503};
    return {ok:true,status:200,json:async()=>({
      selected:[event(1990,'Event number '+calls,'Historic Event '+calls)],
    })};
  };
  const loaded=await fetchSelectedAnniversaries({startDay:'01-01',days:7},fakeFetch);
  assert.equal(calls,7);
  assert.equal(loaded.succeeded,6);
  assert.equal(loaded.failed.length,1);
  assert.equal(loaded.nextDay,'01-08');
  assert.ok(loaded.items.every(e=>e.status==='draft'&&!e.selected));
  await assert.rejects(()=>fetchSelectedAnniversaries({startDay:'01-01',days:365},fakeFetch),/7, 14 lub 28/);
});
