import { normalizeCatalogCategory, normalizeCatalogEvent, SEED_CATEGORIES } from './catalog.js';
import { ITEMS } from './data.js';
import { CURATED_PL_V1_IDS, cleanCuratedV1Tags, curatedV1CleanupPreview } from './curatedCleanup.js';

export function createAdminDb(dbSdk, db, auth) {
  const categories=dbSdk.collection(db,'chronikaCategories');
  const events=dbSdk.collection(db,'chronikaEvents');
  const requireAdmin=async()=>{
    const user=auth.currentUser;
    if(!user||user.isAnonymous)throw new Error('Zaloguj się na konto administratora.');
    const snap=await dbSdk.getDoc(dbSdk.doc(db,'chronikaAdmins',user.uid));
    if(!snap.exists()||snap.data().enabled!==true)throw new Error('Brak uprawnień administratora.');
    return user;
  };
  const canEdit=async()=>{
    const uid=auth.currentUser?.uid;
    if(!uid||auth.currentUser.isAnonymous)return false;
    try{
      const snap=await dbSdk.getDoc(dbSdk.doc(db,'chronikaAdmins',uid));
      return snap.exists()&&snap.data().enabled===true;
    }catch(error){
      // Permission denied means rules were not yet published.
      console.warn('CHRONIKA: sprawdzenie administratora:',error?.code||error);
      return false;
    }
  };
  async function listCategories(){
    await requireAdmin();
    const snap=await dbSdk.getDocs(categories);
    return snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)||a.name.localeCompare(b.name,'pl'));
  }
  async function listEvents({after=null,categoryId='',search='',pageSize=40}={}){
    await requireAdmin();
    let constraints=[];
    const word=String(search||'').trim().toLocaleLowerCase('pl');
    if(word){
      constraints=[dbSdk.orderBy('titleSort'),dbSdk.startAt(word),dbSdk.endAt(word+'\uf8ff')];
    }else if(categoryId){
      constraints=[dbSdk.where('categoryIds','array-contains',categoryId)];
    }else{
      constraints=[dbSdk.orderBy('titleSort')];
    }
    if(after)constraints.push(dbSdk.startAfter(after));
    constraints.push(dbSdk.limit(Math.min(100,Math.max(1,pageSize))));
    const snap=await dbSdk.getDocs(dbSdk.query(events,...constraints));
    const entries=snap.docs.map(d=>({id:d.id,...d.data()}));
    return {items:entries,cursor:snap.docs.at(-1)||null,hasMore:snap.size>=pageSize};
  }
  async function saveCategory(input,originalId=null){
    const user=await requireAdmin(),data=normalizeCatalogCategory(input);
    if(data.parentId){
      const parent=await dbSdk.getDoc(dbSdk.doc(categories,data.parentId));
      if(!parent.exists())throw new Error('Kategoria nadrzędna nie istnieje.');
      if(parent.data().parentId)throw new Error('Możliwe są tylko dwa poziomy kategorii.');
    }
    const target=dbSdk.doc(categories,data.id),current=await dbSdk.getDoc(target);
    if(originalId&&data.id!==originalId)throw new Error('Nie można zmienić ID istniejącej kategorii.');
    if(!originalId&&current.exists())throw new Error('Kategoria o tym ID już istnieje.');
    if(originalId&&!current.exists())throw new Error('Nie znaleziono edytowanej kategorii.');
    await dbSdk.setDoc(target,{
      ...data,createdAt:current.exists()?current.data().createdAt||Date.now():Date.now(),
      updatedAt:Date.now(),updatedBy:user.uid,
    });
    return data;
  }
  async function saveEvent(input,originalId=null){
    const user=await requireAdmin(),data=normalizeCatalogEvent(input);
    if(originalId&&data.id!==originalId)throw new Error('Nie można zmienić ID istniejącego wydarzenia.');
    for(const id of data.categoryIds){
      if(!(await dbSdk.getDoc(dbSdk.doc(categories,id))).exists())throw new Error('Nie znaleziono kategorii: '+id);
    }
    const target=dbSdk.doc(events,data.id),current=await dbSdk.getDoc(target);
    if(!originalId&&current.exists())throw new Error('Wydarzenie o takim ID już istnieje.');
    if(originalId&&!current.exists())throw new Error('Nie znaleziono edytowanego wydarzenia.');
    await dbSdk.setDoc(target,{
      ...data,createdAt:current.exists()?current.data().createdAt||Date.now():Date.now(),
      updatedAt:Date.now(),updatedBy:user.uid,
    });
    return data;
  }
  // Reads ONLY the exact 38 source IDs, never the full database.
  async function previewCuratedV1Cleanup(){
    await requireAdmin();
    const matches=[];
    for(let offset=0;offset<CURATED_PL_V1_IDS.length;offset+=12){
      const batch=CURATED_PL_V1_IDS.slice(offset,offset+12);
      const docs=await Promise.all(batch.map(id=>dbSdk.getDoc(dbSdk.doc(events,id))));
      for(let i=0;i<docs.length;i++){
        if(docs[i].exists())matches.push({id:batch[i],...docs[i].data()});
      }
    }
    return {
      totalSourceIds:CURATED_PL_V1_IDS.length,
      found:matches.length,
      changes:curatedV1CleanupPreview(matches),
    };
  }
  // Re-check data inside a single Firestore transaction. Only the tags and
  // audit timestamp are modified; titles, years, descriptions remain intact.
  async function cleanupCuratedV1Tags(){
    const admin=await requireAdmin();
    return dbSdk.runTransaction(db,async transaction=>{
      const refs=CURATED_PL_V1_IDS.map(id=>dbSdk.doc(events,id));
      const snapshots=await Promise.all(refs.map(ref=>transaction.get(ref)));
      const changes=[];
      snapshots.forEach((snap,i)=>{
        if(!snap.exists())return;
        const cleaned=cleanCuratedV1Tags(CURATED_PL_V1_IDS[i],snap.data().tags);
        if(cleaned!==null)changes.push({ref:refs[i],cleaned});
      });
      const now=Date.now();
      for(const item of changes){
        transaction.update(item.ref,{tags:item.cleaned,updatedAt:now,updatedBy:admin.uid});
      }
      return {updated:changes.length,checked:snapshots.filter(s=>s.exists()).length};
    });
  }
  async function importCategories(){
    const user=await requireAdmin();
    const existing=await dbSdk.getDocs(dbSdk.query(categories,dbSdk.limit(1)));
    if(!existing.empty)throw new Error('Katalog kategorii nie jest pusty. Import startowy pominięty, aby niczego nie nadpisać.');
    const batch=dbSdk.writeBatch(db),now=Date.now();
    for(const item of SEED_CATEGORIES)batch.set(dbSdk.doc(categories,item.id),{
      ...item,createdAt:now,updatedAt:now,updatedBy:user.uid,
    });
    await batch.commit();
    return SEED_CATEGORIES.length;
  }
  async function catalogCounts(){
    await requireAdmin();
    if(typeof dbSdk.getCountFromServer!=='function')
      throw new Error('Brak wsparcia dla agregacji Firestore.');
    const count=async constraints=>{
      const q=dbSdk.query(events,...constraints);
      return (await dbSdk.getCountFromServer(q)).data().count;
    };
    const [total,byStatus,byCategory]=await Promise.all([
      count([]),
      Promise.all(['draft','review','published','archived'].map(async status=>({
        status,count:await count([dbSdk.where('status','==',status)]),
      }))),
      Promise.all(['cinema','television','poland','world','sport','football','games','science','technology','literature','geography','culture']
        .map(async categoryId=>({
          categoryId,count:await count([dbSdk.where('categoryIds','array-contains',categoryId)]),
        }))),
    ]);
    return {total,byStatus,byCategory,calculatedAt:Date.now()};
  }
  async function existingEventIds(ids){
    await requireAdmin();
    if(!Array.isArray(ids)||ids.length>150)throw new Error('Limit sprawdzenia to 150 wydarzeń.');
    const cleanIds=[...new Set(ids.filter(id=>typeof id==='string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,139}$/.test(id)))];
    const found=[];
    for(let offset=0;offset<cleanIds.length;offset+=15){
      const batch=cleanIds.slice(offset,offset+15);
      const docs=await Promise.all(batch.map(id=>dbSdk.getDoc(dbSdk.doc(events,id))));
      docs.forEach((snapshot,i)=>{if(snapshot.exists())found.push(batch[i]);});
    }
    return found;
  }
  async function importEvents(records){
    const user=await requireAdmin();
    if(!Array.isArray(records)||!records.length)throw new Error('Brak wydarzeń do importu.');
    if(records.length>1000)throw new Error('Za jednym razem można zaimportować maksymalnie 1000 wydarzeń.');
    const cleanRecords=records.map(normalizeCatalogEvent);
    const keys=new Set();
    for(const item of cleanRecords) {
      if(keys.has(item.id))throw new Error('Powtórzone ID w imporcie: '+item.id);
      keys.add(item.id);
    }
    const existingCategories=new Set((await listCategories()).map(x=>x.id));
    for(const item of cleanRecords){
      if(item.categoryIds.some(id=>!existingCategories.has(id)))throw new Error('Brak kategorii dla '+item.id);
    }
    let added=0,skipped=0;
    // Batches limit write operations; existence reads avoid overwriting edits.
    for(let offset=0;offset<cleanRecords.length;offset+=100){
      const part=cleanRecords.slice(offset,offset+100);
      const checks=[];
      for(let i=0;i<part.length;i+=20){
        checks.push(...await Promise.all(part.slice(i,i+20).map(item=>
          dbSdk.getDoc(dbSdk.doc(events,item.id)))));
      }
      const batch=dbSdk.writeBatch(db),now=Date.now();
      let writes=0;
      part.forEach((item,i)=>{
        if(checks[i].exists()){skipped++;return;}
        batch.set(dbSdk.doc(events,item.id),{...item,createdAt:now,updatedAt:now,updatedBy:user.uid});
        writes++;added++;
      });
      if(writes)await batch.commit();
    }
    return {added,skipped};
  }
  async function importSampleEvents(){
    await requireAdmin();
    const docs=ITEMS.map(e=>normalizeCatalogEvent({
      id:'sample-'+e.id,title:e.title,description:e.desc,year:e.year,
      categoryIds:[e.category],status:'draft',difficulty:2,
      tags:['demo'],sourceName:'Baza demonstracyjna CHRONIKA (do weryfikacji)',
    }));
    return importEvents(docs);
  }
  return {canEdit,listCategories,listEvents,saveCategory,saveEvent,importCategories,importEvents,importSampleEvents,existingEventIds,catalogCounts,previewCuratedV1Cleanup,cleanupCuratedV1Tags};
}
