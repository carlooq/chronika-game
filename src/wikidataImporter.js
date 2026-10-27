import { normalizeCatalogEvent } from './catalog.js';

// Controlled sources only. Never accept raw SPARQL from form input.
// Date properties: P585 = point in time; P575 = discovery/invention date.
// Wikidata data is CC0, but the resulting questions remain editorial drafts.
export const WIKIDATA_SCOPES = Object.freeze({
  poland: { label:'Historia Polski', categoryId:'poland', kind:'poland',
    help:'Wydarzenia z przypisanym krajem Polska (P17) i datą (P585). Część ważnych wydarzeń może nie mieć tych pól.' },
  world: { label:'Historia świata', categoryId:'world', kind:'world',
    help:'Wydarzenia typu event lub jego podklasy (Q1190554), datowane właściwością P585.' },
  science: { label:'Nauka i odkrycia', categoryId:'science', kind:'science',
    help:'Obiekty z datą odkrycia lub wynalezienia (P575). Trzeba sprawdzić, co dokładnie oznacza data.' },
});
export const WIKIDATA_LIMITS=[25,50,100];
const clampYear=y=>Number.isInteger(y)&&y>=1000&&y<=2030;
export function wikidataQuery({scope,startYear,endYear,limit=50}){
  if(!Object.hasOwn(WIKIDATA_SCOPES,scope))throw new Error('Nieznany zakres Wikidata.');
  const start=Number(startYear),end=Number(endYear),size=Number(limit);
  if(!clampYear(start)||!clampYear(end)||start>end)
    throw new Error('Podaj prawidłowy przedział lat 1000–2030 (od ≤ do).');
  if(!WIKIDATA_LIMITS.includes(size))throw new Error('Dozwolone partie: 25, 50 lub 100 rekordów.');
  // YEAR is supported in Wikidata SPARQL and avoids lexicographic date errors.
  const dateRange=`FILTER(YEAR(?date) >= ${start} && YEAR(?date) <= ${end})`;
  const selector={
    poland:'?item wdt:P17 wd:Q36 ; wdt:P585 ?date .',
    world:'?item wdt:P31/wdt:P279* wd:Q1190554 ; wdt:P585 ?date .',
    science:'?item wdt:P575 ?date .',
  }[scope];
  // Apply LIMIT before the label service: Wikidata documentation recommends
  // this pattern for more predictable performance on the shared endpoint.
  return `SELECT ?item ?itemLabel ?itemDescription ?date WHERE {
  {
    SELECT DISTINCT ?item ?date WHERE {
      ${selector}
      ${dateRange}
      FILTER(DATATYPE(?date) = xsd:dateTime)
    }
    ORDER BY ?date
    LIMIT ${size}
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pl,en" . }
}
ORDER BY ?date`;
}
function safeYear(value){
  const match=String(value||'').match(/^([+-]?\d{1,6})-\d{2}-\d{2}(?:T|$)/);
  if(!match)return null;
  const y=Number(match[1]);
  return Number.isInteger(y)&&y!==0&&y>=1000&&y<=2030?y:null;
}
export function parseWikidataResults(json,scope){
  if(!Object.hasOwn(WIKIDATA_SCOPES,scope))throw new Error('Nieznana kategoria.');
  const bindings=json?.results?.bindings;
  if(!Array.isArray(bindings))throw new Error('Serwis Wikidata zwrócił niepoprawny format odpowiedzi.');
  const unique=new Map();
  let rejected=0;
  for(const row of bindings){
    const link=String(row.item?.value||''),qid=link.match(/^https?:\/\/www\.wikidata\.org\/entity\/(Q[1-9]\d*)$/)?.[1];
    const label=String(row.itemLabel?.value||'').trim();
    const description=String(row.itemDescription?.value||'').trim();
    const year=safeYear(row.date?.value);
    if(!qid||!year||!label||/^Q\d+$/i.test(label)||label.length<3){
      rejected++;continue;
    }
    const title=scope==='science'?`Odkrycie lub wynalezienie: ${label}`:label;
    try{
      const record=normalizeCatalogEvent({
        id:'wikidata-'+qid.toLowerCase(),title,description,year,
        categoryIds:[WIKIDATA_SCOPES[scope].categoryId],difficulty:2,
        status:'draft',sourceUrl:'https://www.wikidata.org/wiki/'+qid,
        sourceName:'Wikidata ('+qid+')',
        tags:['Wikidata',scope],datePrecision:'year',
      });
      if(unique.has(record.id))continue;
      unique.set(record.id,{
        ...record,qid,flags:[
          ...(!description?['Brak opisu w Wikidata']:[]),
          ...(scope==='science'?['Sprawdź, czy data dotyczy odkrycia czy wynalezienia']:[]),
        ],remote:true,
      });
    }catch{rejected++;}
  }
  return {items:[...unique.values()],rejected,received:bindings.length};
}
export async function fetchWikidataCandidates(options,fetchFn=fetch){
  const query=wikidataQuery(options);
  const url='https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(query);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),50000);
  try{
    const response=await fetchFn(url,{
      headers:{Accept:'application/sparql-results+json'},
      signal:controller.signal,
    });
    if(response.status===429)throw new Error('Wikidata ograniczyła liczbę zapytań (HTTP 429). Poczekaj minutę i spróbuj ponownie.');
    if(response.status===503||response.status===504)throw new Error('Wikidata jest chwilowo przeciążona. Spróbuj mniejszego zakresu lat.');
    if(!response.ok)throw new Error('Wikidata zwróciła błąd HTTP '+response.status+'.');
    const json=await response.json();
    return parseWikidataResults(json,options.scope);
  }catch(error){
    if(error?.name==='AbortError')throw new Error('Zapytanie trwało zbyt długo. Zawęź lata i spróbuj ponownie.');
    if(error instanceof TypeError)throw new Error('Nie udało się połączyć z Wikidata. Sprawdź sieć lub spróbuj później.');
    throw error;
  }finally{clearTimeout(timeout);}
}
export function identifyCandidateDuplicates(items,existingIds=[]){
  const existing=new Set(existingIds);
  const nameYear=new Set();
  return items.map(item=>{
    const identity=item.title.toLocaleLowerCase('pl').trim()+'|'+item.year;
    const duplicateInBatch=nameYear.has(identity);
    nameYear.add(identity);
    const alreadyStored=existing.has(item.id);
    return {...item,alreadyStored,duplicateInBatch,
      selected:false};
  });
}
