// Specific IDs and original editorial recognition levels from the 38-record
// CHRONIKA Historia Polski v1 import. Preserve the levels for a future
// dedicated recognitionLevel field; they do not belong in topical tags.
export const CURATED_PL_V1_LEVELS = Object.freeze({
  "kurator-pl-chrzest-polski": "ikoniczne",
  "kurator-pl-zjazd-gnieznienski": "ikoniczne",
  "kurator-pl-koronacja-chrobrego": "ikoniczne",
  "kurator-pl-rozbicie-dzielnicowe": "ikoniczne",
  "kurator-pl-koronacja-lokietka": "znane",
  "kurator-pl-uklad-krewo": "znane",
  "kurator-pl-grunwald": "ikoniczne",
  "kurator-pl-hold-pruski": "znane",
  "kurator-pl-unia-lubelska": "ikoniczne",
  "kurator-pl-pierwsza-wolna-elekcja": "znane",
  "kurator-pl-potop-szwedzki": "ikoniczne",
  "kurator-pl-odsiecz-wiedenska": "ikoniczne",
  "kurator-pl-pierwszy-rozbior": "ikoniczne",
  "kurator-pl-konstytucja-trzeciego-maja": "ikoniczne",
  "kurator-pl-drugi-rozbior": "znane",
  "kurator-pl-powstanie-kosciuszkowskie": "znane",
  "kurator-pl-trzeci-rozbior": "ikoniczne",
  "kurator-pl-ksiestwo-warszawskie": "znane",
  "kurator-pl-powstanie-listopadowe": "ikoniczne",
  "kurator-pl-powstanie-styczniowe": "ikoniczne",
  "kurator-pl-odzyskanie-niepodleglosci": "ikoniczne",
  "kurator-pl-bitwa-warszawska": "ikoniczne",
  "kurator-pl-konstytucja-marcowa": "znane",
  "kurator-pl-zamach-majowy": "znane",
  "kurator-pl-wybuch-ii-wojny": "ikoniczne",
  "kurator-pl-powstanie-warszawskie": "ikoniczne",
  "kurator-pl-koniec-wojny-europa": "ikoniczne",
  "kurator-pl-poznanski-czerwiec": "znane",
  "kurator-pl-marzec-1968": "znane",
  "kurator-pl-grudzien-1970": "znane",
  "kurator-pl-powstanie-kor": "znane",
  "kurator-pl-porozumienia-sierpniowe": "ikoniczne",
  "kurator-pl-solidarnosc": "ikoniczne",
  "kurator-pl-stan-wojenny": "ikoniczne",
  "kurator-pl-okragly-stol": "ikoniczne",
  "kurator-pl-wybory-czerwcowe": "ikoniczne",
  "kurator-pl-polska-nato": "ikoniczne",
  "kurator-pl-polska-unia-europejska": "ikoniczne"
});
export const CURATED_PL_V1_IDS = Object.freeze(Object.keys(CURATED_PL_V1_LEVELS));
export const CURATED_TAGS_TO_REMOVE = Object.freeze(['kuratorskie-pl-v1','ikoniczne','znane']);
const removeSet = new Set(CURATED_TAGS_TO_REMOVE);
export function cleanCuratedV1Tags(id,tags) {
  if(!Object.hasOwn(CURATED_PL_V1_LEVELS,id)||!Array.isArray(tags))return null;
  const cleaned=tags.filter(tag=>!removeSet.has(String(tag).trim().toLocaleLowerCase('pl')));
  return cleaned.length===tags.length?null:cleaned;
}
export function curatedV1CleanupPreview(records){
  return records.filter(record=>record&&Object.hasOwn(CURATED_PL_V1_LEVELS,record.id))
    .map(record=>{
      const after=cleanCuratedV1Tags(record.id,record.tags);
      return after===null?null:{
        id:record.id,title:record.title||record.id,year:record.year,
        beforeTags:[...record.tags],afterTags:after,
        recognitionLevel:CURATED_PL_V1_LEVELS[record.id],
      };
    }).filter(Boolean);
}
