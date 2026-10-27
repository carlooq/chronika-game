// Curated Wikipedia "Selected anniversaries" importer (public Wikimedia REST feed).
// Editorial shortlist ONLY: never treat selected status as fact verification.
// A candidate is a draft with a source link; review and write Polish prose
// before making it eligible for gameplay.
export const ANNIVERSARY_DAYS=[7,14,28];
export const ANNIVERSARY_SOURCE='Wikipedia — wybrane rocznice (EN)';
const yearValid=year=>Number.isInteger(year)&&year!==0&&year>=-3000&&year<=2100;
const dateParts=date=>{
  const d=String(date||'');
  if(!/^\d{2}-\d{2}$/.test(d))throw new Error('Użyj daty w formacie MM-DD.');
  const [month,day]=d.split('-').map(Number);
  const candidate=new Date(Date.UTC(2024,month-1,day));
  if(candidate.getUTCMonth()!==month-1||candidate.getUTCDate()!==day)throw new Error('Niepoprawny dzień i miesiąc.');
  return {month,day};
};
const pad=n=>String(n).padStart(2,'0');
export const anniversaryDate=(month,day)=>pad(month)+'-'+pad(day);
export function nextAnniversaryDay(start,offset=1){
  const {month,day}=dateParts(start);
  const d=new Date(Date.UTC(2024,month-1,day+offset));
  return anniversaryDate(d.getUTCMonth()+1,d.getUTCDate());
}
export function anniversaryFeedUrl(day){
  dateParts(day);
  return 'https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/'+day.replace('-','/');
}
function simpleText(value){
  return String(value||'').replace(/<[^>]*>/g,'').replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/\s+/g,' ').trim();
}
function eventHash(text){
  let n=2166136261;
  for(const char of text.toLowerCase()){
    n^=char.charCodeAt(0);
    n=Math.imul(n,16777619);
  }
  return (n>>>0).toString(36);
}
function pageUrl(page){
  const supplied=String(page?.content_urls?.desktop?.page||'');
  // Only allow an actual English Wikipedia article as authoritative source link.
  if(/^https:\/\/en\.wikipedia\.org\/wiki\/[^\s?#]+/.test(supplied))return supplied.slice(0,500);
  const name=String(page?.titles?.canonical||page?.titles?.normalized||'');
  if(name)return 'https://en.wikipedia.org/wiki/'+encodeURIComponent(name.replace(/ /g,'_'));
  return '';
}
export function parseAnniversaryDay(feed,day){
  dateParts(day);
  const selected=feed?.selected;
  if(!Array.isArray(selected))throw new Error('Wikipedia zwróciła niepoprawny format rocznic.');
  const events=[];let rejected=0;
  for(const item of selected){
    const year=Number(item?.year);
    const text=simpleText(item?.text);
    const page=(Array.isArray(item.pages)?item.pages:[])
      .find(p=>pageUrl(p))||null;
    const link=pageUrl(page);
    if(!yearValid(year)||!text||!link){rejected++;continue;}
    const originalPageTitle=simpleText(page?.titles?.normalized||page?.titles?.canonical);
    const candidateTitle=originalPageTitle.slice(0,180)||text.slice(0,180);
    if(candidateTitle.length<3){rejected++;continue;}
    const id='anniv-'+(year<0?'b'+Math.abs(year):year)+'-'+eventHash(text);
    const flags=[
      'Opis źródłowy w języku angielskim — przygotuj własny polski opis.',
      ...(/\b(season|league season|qualifying|series)\b/i.test(text)?['Sprawdź, czy nie jest to cykliczne wydarzenie sportowe.']:[]),
      ...(candidateTitle.toLowerCase()===text.toLowerCase()?['Doprecyzuj tytuł wydarzenia.']:[]),
    ];
    events.push({id,year,title:candidateTitle,description:'',originalText:text,
      sourceUrl:link,sourceName:ANNIVERSARY_SOURCE,
      categoryIds:['world'],status:'draft',difficulty:2,tags:[],
      sourceDay:day,flags,selected:false});
  }
  return {items:events,rejected,received:selected.length};
}
export function uniqueAnniversaryCandidates(items,knownIds=[]){
  const ids=new Set(),known=new Set(knownIds);
  return items.map(item=>{
    const duplicateInBatch=ids.has(item.id);
    ids.add(item.id);
    return {...item,duplicateInBatch,alreadyStored:known.has(item.id),selected:false};
  });
}
export async function fetchSelectedAnniversaries({startDay='01-01',days=14},fetchFn=fetch,onProgress=()=>{}){
  dateParts(startDay);
  if(!ANNIVERSARY_DAYS.includes(Number(days)))throw new Error('Wybierz 7, 14 lub 28 dni.');
  const dates=Array.from({length:Number(days)},(_,i)=>nextAnniversaryDay(startDay,i));
  const results=new Array(dates.length);
  let cursor=0,done=0,stop=false,rateLimited=false;
  async function worker(){
    while(cursor<dates.length&&!stop){
      const position=cursor++,day=dates[position];
      const ctl=new AbortController();
      const timeout=setTimeout(()=>ctl.abort(),12000);
      try{
        const response=await fetchFn(anniversaryFeedUrl(day),{
          headers:{Accept:'application/json'},
          signal:ctl.signal,
        });
        if(response.status===429){stop=true;rateLimited=true;results[position]={day,error:'Limit zapytań Wikimedia (429)'};continue;}
        if(!response.ok){results[position]={day,error:'HTTP '+response.status};continue;}
        const parsed=parseAnniversaryDay(await response.json(),day);
        results[position]={day,...parsed};
      }catch(e){
        results[position]={day,error:e?.name==='AbortError'?'Przekroczono 12 s':(e?.message||'Błąd sieci')};
      }finally{
        clearTimeout(timeout);done++;onProgress({done,total:dates.length,day});
      }
    }
  }
  // At most two simultaneous Wikimedia calls; no full-year scraping.
  await Promise.all([worker(),worker()]);
  const successes=results.filter(r=>r?.items);
  const failed=results.filter(r=>r?.error);
  const items=uniqueAnniversaryCandidates(successes.flatMap(r=>r.items));
  if(!successes.length){
    throw new Error('Nie udało się pobrać rocznic. '+(rateLimited?'Wikimedia ograniczyła zapytania. ':'')+
      (failed[0]?.error||'')+'. Spróbuj później.');
  }
  return {
    items,received:successes.reduce((a,r)=>a+r.received,0),
    rejected:successes.reduce((a,r)=>a+r.rejected,0),
    succeeded:successes.length,failed:failed.map(r=>({day:r.day,error:r.error})),
    requested:dates.length,rateLimited,nextDay:nextAnniversaryDay(startDay,Number(days)),
  };
}
