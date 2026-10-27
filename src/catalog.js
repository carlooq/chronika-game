// CHRONIKA katalog: jeden rekord wydarzenia może mieć wiele kategorii.
// Kategorie utworzone w panelu to osobne dane Firestore, nie nowe tryby gry.
export const CATEGORY_TREE = [
  {id:'cinema',name:'Kino',children:['Polskie kino','Klasyka światowa','Animacje','Horrory','Science fiction','Nagrody filmowe']},
  {id:'television',name:'Seriale i telewizja',children:['Seriale światowe','Polskie seriale','Telewizja lat 90.','Programy TV','Seriale animowane','Nagrody telewizyjne']},
  {id:'poland',name:'Historia Polski',children:['Początki państwa','Jagiellonowie','Rozbiory i powstania','II Rzeczpospolita','PRL 1945–1989','Polska po 1989']},
  {id:'world',name:'Historia świata',children:['Starożytność','Średniowiecze','Wielkie odkrycia','XIX wiek','II wojna światowa','Świat po 1945']},
  {id:'sport',name:'Sport',children:['Igrzyska olimpijskie','Tenis','Lekkoatletyka','Sporty zimowe','Koszykówka','Sportowe rekordy']},
  {id:'football',name:'Piłka nożna',children:['Mundiale','Mistrzostwa Europy','Liga Mistrzów','Polska piłka','Serie A','Transfery i legendy']},
  {id:'games',name:'Gry wideo',children:['Początki gier','Konsole retro','Kultowe premiery','Nintendo','PlayStation i Xbox','E-sport']},
  {id:'science',name:'Nauka',children:['Kosmos','Fizyka','Chemia','Medycyna','Biologia','Odkrywcy i wynalazcy']},
  {id:'technology',name:'Technologia',children:['Komputery','Internet','Smartfony','Media społecznościowe','Elektronika','Transport']},
  {id:'literature',name:'Literatura',children:['Literatura polska','Klasyka światowa','Fantasy','Literackie science fiction','Kryminały','Nagrody literackie']},
  {id:'geography',name:'Geografia i wyprawy',children:['Odkrycia i wyprawy','Góry i alpinizm','Lotnictwo','Koleje','Wielkie budowle','Wyprawy polarne']},
  {id:'culture',name:'Popkultura',children:['Komiksy','Anime','Kultowe marki','Zabawki i gry','Internetowe trendy','Fenomeny popkultury']},
];
export function slugify(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/ł/g,'l').replace(/Ł/g,'L')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,75);
}
export const SEED_CATEGORIES = CATEGORY_TREE.flatMap((group,index)=>[
  {id:group.id,name:group.name,parentId:'',sortOrder:index*100,status:'draft',description:'',createdAt:0,updatedAt:0},
  ...group.children.map((name,i)=>({
    id:group.id+'--'+slugify(name),name,parentId:group.id,
    sortOrder:index*100+i+1,status:'draft',description:'',createdAt:0,updatedAt:0,
  })),
]);
export const CATEGORY_STATUSES=['draft','published','archived'];
export const EVENT_STATUSES=['draft','review','published','archived'];
export function normalizeCatalogCategory(input) {
  const name=String(input.name||'').trim().slice(0,100);
  const id=String(input.id||'').trim().slice(0,130);
  const parentId=String(input.parentId||'').trim().slice(0,130);
  if(!name||!id||!/^[a-z0-9][a-z0-9-]*$/.test(id))throw new Error('Kategoria wymaga nazwy i poprawnego ID (litery a-z, cyfry, myślnik).');
  if(parentId===id)throw new Error('Kategoria nie może być własnym rodzicem.');
  const status=String(input.status||'draft');
  if(!CATEGORY_STATUSES.includes(status))throw new Error('Niepoprawny status kategorii.');
  return {
    name,id,parentId,status,
    description:String(input.description||'').trim().slice(0,700),
    sortOrder:Number.isFinite(Number(input.sortOrder))?Math.floor(Number(input.sortOrder)):0,
  };
}
export function normalizeCatalogEvent(input) {
  const title=String(input.title||'').trim().slice(0,200);
  const id=String(input.id||'').trim().slice(0,140);
  if(!id||!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id))throw new Error('ID wydarzenia musi składać się z liter, cyfr, - lub _.');
  if(title.length<3)throw new Error('Tytuł wydarzenia musi mieć minimum 3 znaki.');
  const year=Number(input.year);
  if(!Number.isInteger(year)||year===0||year< -3000||year>2100)throw new Error('Rok musi być liczbą całkowitą od -3000 do 2100 (bez roku zero).');
  const categoryIds=[...new Set((Array.isArray(input.categoryIds)?input.categoryIds:String(input.categoryIds||'').split(/[;,]/))
    .map(x=>String(x).trim()).filter(Boolean))].slice(0,15);
  if(!categoryIds.length)throw new Error('Wydarzenie musi należeć do co najmniej jednej kategorii.');
  const status=String(input.status||'draft');
  if(!EVENT_STATUSES.includes(status))throw new Error('Niepoprawny status wydarzenia.');
  const difficulty=Number(input.difficulty||2);
  if(!Number.isInteger(difficulty)||difficulty<1||difficulty>5)throw new Error('Trudność musi być w przedziale 1–5.');
  const sourceUrl=String(input.sourceUrl||'').trim().slice(0,500);
  if(sourceUrl&&!/^https:\/\/[^\s]+$/i.test(sourceUrl))throw new Error('Źródło musi być prawidłowym adresem HTTPS.');
  if(status==='published'&&!sourceUrl)throw new Error('Aby zatwierdzić wydarzenie, dodaj adres źródła HTTPS.');
  return {
    id,title,titleSort:title.toLocaleLowerCase('pl'),year,categoryIds,status,difficulty,
    description:String(input.description||input.desc||'').trim().slice(0,1000),
    sourceUrl,sourceName:String(input.sourceName||'').trim().slice(0,130),
    tags:[...new Set((Array.isArray(input.tags)?input.tags:String(input.tags||'').split(/[;,]/))
      .map(v=>String(v).trim()).filter(Boolean))].slice(0,20),
    datePrecision:String(input.datePrecision||'year')==='day'?'day':'year',
  };
}
export function parseCatalogCsv(csv) {
  const firstLine=String(csv).split(/\r?\n/,1)[0];
  const separator=firstLine.includes(';')&&!firstLine.includes(',')?';':',';
  const lines=[];let fields=[],buf='',quoted=false;
  for(let i=0;i<csv.length;i++){
    const char=csv[i];
    if(char==='"'){
      if(quoted&&csv[i+1]==='"'){buf+='"';i++;}
      else quoted=!quoted;
    }else if(char===separator&&!quoted){fields.push(buf);buf='';}
    else if((char==='\n'||char==='\r')&&!quoted){
      if(char==='\r'&&csv[i+1]==='\n')i++;
      fields.push(buf);buf='';
      if(fields.some(x=>x.trim()))lines.push(fields);
      fields=[];
    }else buf+=char;
  }
  if(quoted)throw new Error('Niedomknięty cudzysłów w pliku CSV.');
  fields.push(buf);
  if(fields.some(x=>x.trim()))lines.push(fields);
  if(!lines.length)return [];
  const headers=lines.shift().map(x=>x.trim().replace(/^\uFEFF/,''));
  if(!headers.includes('title')||!headers.includes('year')||!headers.includes('categoryIds')){
    throw new Error('CSV musi mieć kolumny: title, year, categoryIds.');
  }
  return lines.map((values,i)=>{
    const item={};headers.forEach((header,j)=>{item[header]=values[j]||'';});
    if(!item.id)item.id='import-'+slugify(item.title)+'-'+item.year;
    try{return normalizeCatalogEvent(item);}catch(error){throw new Error('Wiersz '+(i+2)+': '+error.message);}
  });
}
export function parseEventImport(text) {
  const input=String(text||'').trim();
  if(!input)throw new Error('Wklej JSON lub CSV.');
  let items;
  if(input.startsWith('[')||input.startsWith('{')){
    const parsed=JSON.parse(input);
    items=Array.isArray(parsed)?parsed:parsed.events;
    if(!Array.isArray(items))throw new Error('JSON musi zawierać tablicę wydarzeń.');
    return items.map((e,i)=>{try{return normalizeCatalogEvent({...e,id:e.id||'import-'+slugify(e.title)+'-'+e.year});}
      catch(error){throw new Error('Rekord '+(i+1)+': '+error.message);}});
  }
  return parseCatalogCsv(input);
}
