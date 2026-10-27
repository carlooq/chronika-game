import { parseEventImport, slugify, CATEGORY_STATUSES, EVENT_STATUSES } from './catalog.js';
import { WIKIDATA_SCOPES, WIKIDATA_LIMITS, fetchWikidataCandidates, identifyCandidateDuplicates } from './wikidataImporter.js';
import { ANNIVERSARY_DAYS, fetchSelectedAnniversaries, uniqueAnniversaryCandidates } from './anniversaryImporter.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labelStatus=s=>({draft:'Szkic',review:'Do weryfikacji',published:'Zatwierdzone',archived:'Archiwum'})[s]||s;
const option=(value,label,selected)=>`<option value="${esc(value)}" ${selected?'selected':''}>${esc(label)}</option>`;

export function createAdminPanel(api) {
  const state={
    tab:'events',categories:[],events:[],loaded:false,busy:false,error:'',info:'',
    edit:null,query:'',categoryFilter:'',cursor:null,hasMore:false,previous:[],page:1,
    wikidata:{scope:'poland',from:'1900',to:'2026',limit:50,items:[],received:0,rejected:0,hasPreview:false},
    curatedCleanup:{checked:false,found:0,totalSourceIds:38,changes:[]},
    anniversaries:{startDay:'01-01',days:14,target:'world',items:[],received:0,rejected:0,
      succeeded:0,failed:[],requested:0,hasPreview:false,nextDay:'01-15',progress:null},
    coverage:null,
  };
  let root=null;
  function notify(message,error=false){state.error=error?message:'';state.info=error?'':message;update();}
  function categoryTitle(id){return state.categories.find(c=>c.id===id)?.name||id;}
  function groupedOptions(selectedIds=[]) {
    const parents=state.categories.filter(c=>!c.parentId);
    return parents.map(parent=>`<optgroup label="${esc(parent.name)}">
      ${option(parent.id,parent.name,selectedIds.includes(parent.id))}
      ${state.categories.filter(c=>c.parentId===parent.id).map(child=>
        option(child.id,'↳ '+child.name,selectedIds.includes(child.id))).join('')}
    </optgroup>`).join('');
  }
  const filters=()=>`<form id="admin-filter-form" class="admin-filters">
    <label>Szukaj po początku tytułu<input name="query" placeholder="np. Powstanie…" value="${esc(state.query)}"></label>
    <label>Kategoria<select name="filterCategory"><option value="">Wszystkie kategorie</option>
      ${state.categories.map(c=>option(c.id,(c.parentId?'↳ ':'')+c.name,c.id===state.categoryFilter)).join('')}
    </select></label>
    <button class="btn btn-primary" type="submit">Szukaj</button>
    <button class="btn btn-outline" type="button" data-admin="clear">Wyczyść</button>
  </form>`;
  function eventForm(){
    const e=state.edit?.type==='event'?(state.edit.value||{}):{};
    const edit=!!state.edit?.value;
    const status=e.status||'draft';
    return `<form id="admin-event-form" class="admin-editor">
      <div class="admin-editor-header"><div><span class="kicker">BAZA WYDARZEŃ</span><h2>${edit?'Edytuj wydarzenie':'Dodaj wydarzenie'}</h2></div><button class="btn btn-outline" type="button" data-admin="cancel">Anuluj</button></div>
      <div class="admin-form-grid">
        <label class="wide">Tytuł wydarzenia<input required name="title" maxlength="200" minlength="3" value="${esc(e.title||'')}" placeholder="Np. Premiera filmu..."></label>
        <div class="admin-technical-slot wide">
          <details class="admin-technical">
            <summary>Dane techniczne ${edit?'wydarzenia':'(opcjonalne)'}</summary>
            <div class="admin-technical-inner">
              ${edit?
                `<p>Stały identyfikator w Firebase (nie jest widoczny dla graczy):</p>
                <code>${esc(e.id)}</code><input type="hidden" name="id" value="${esc(e.id)}">`:
                `<label>Własny identyfikator (opcjonalny)<input name="id" maxlength="140" placeholder="Pozostaw puste — zostanie nadany automatycznie"></label>
                <p>Nie musisz nic tu wpisywać. Identyfikator zostanie wygenerowany z tytułu i roku.</p>`}
            </div>
          </details>
        </div>
        <label>Rok (ujemny = p.n.e.)<input required name="year" type="number" min="-3000" max="2100" value="${esc(e.year??'')}"></label>
        <label>Status<select name="status">${EVENT_STATUSES.map(s=>option(s,labelStatus(s),s===status)).join('')}</select></label>
        <label>Trudność<select name="difficulty">${[1,2,3,4,5].map(n=>option(n,String(n)+' / 5',Number(e.difficulty||2)===n)).join('')}</select></label>
        <label class="wide">Opis / wyjaśnienie<textarea name="description" rows="3" maxlength="1000" placeholder="Krótki, jednoznaczny opis">${esc(e.description||'')}</textarea></label>
        <label class="wide">Przypisane kategorie (Ctrl / Cmd + klik, aby wybrać kilka)<select multiple size="7" required name="categoryIds">${groupedOptions(e.categoryIds||[])}</select></label>
        <label>Źródło (nazwa)<input name="sourceName" maxlength="130" value="${esc(e.sourceName||'')}" placeholder="Np. PWN, Wikidata"></label>
        <label>Źródło (adres HTTPS)<input name="sourceUrl" type="url" maxlength="500" value="${esc(e.sourceUrl||'')}" placeholder="https://..."></label>
        <label class="wide">Tagi (oddzielone przecinkami)<input name="tags" value="${esc((e.tags||[]).join(', '))}" placeholder="np. lata 90., film, Polska"></label>
      </div>
      <div class="admin-form-actions"><button class="btn btn-primary" type="submit" ${state.busy?'disabled':''}>${edit?'Zapisz zmiany':'Dodaj do bazy'}</button><small>Status „Szkic” nie publikuje pytania w grze.</small></div>
    </form>`;
  }
  function categoryForm(){
    const e=state.edit?.type==='category'?(state.edit.value||{}):{};
    const edit=!!state.edit?.value;
    return `<form id="admin-category-form" class="admin-editor">
      <div class="admin-editor-header"><div><span class="kicker">STRUKTURA DZIEDZIN</span><h2>${edit?'Edytuj kategorię':'Dodaj kategorię'}</h2></div><button class="btn btn-outline" type="button" data-admin="cancel">Anuluj</button></div>
      <div class="admin-form-grid">
        <label>Nazwa<input required name="name" maxlength="100" value="${esc(e.name||'')}" placeholder="Np. Historia Polski"></label>
        <div class="admin-technical-slot wide">
          <details class="admin-technical">
            <summary>Dane techniczne ${edit?'kategorii':'(opcjonalne)'}</summary>
            <div class="admin-technical-inner">
              ${edit?
                `<p>Stały identyfikator kategorii w Firebase:</p><code>${esc(e.id)}</code>
                <input type="hidden" name="id" value="${esc(e.id)}">`:
                `<label>Własny identyfikator (opcjonalny)<input name="id" maxlength="130" placeholder="Pozostaw puste, aby wygenerować"></label>`}
            </div>
          </details>
        </div>
        <label>Kategoria nadrzędna<select name="parentId"><option value="">Główna dziedzina</option>
        ${state.categories.filter(c=>!c.parentId&&c.id!==e.id).map(c=>option(c.id,c.name,c.id===e.parentId)).join('')}</select></label>
        <label>Status<select name="status">${CATEGORY_STATUSES.map(s=>option(s,labelStatus(s),s===(e.status||'draft'))).join('')}</select></label>
        <label>Sortowanie<input name="sortOrder" type="number" value="${Number(e.sortOrder||0)}"></label>
        <label class="wide">Opis<textarea name="description" rows="2" maxlength="700">${esc(e.description||'')}</textarea></label>
      </div>
      <div class="admin-form-actions"><button class="btn btn-primary" ${state.busy?'disabled':''} type="submit">${edit?'Zapisz kategorię':'Dodaj kategorię'}</button></div>
    </form>`;
  }
  function categoryRows(){
    if(!state.categories.length)return `<div class="admin-empty">Nie ma jeszcze kategorii. Kliknij „Utwórz katalog startowy”.</div>`;
    return `<div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>Kategoria</th><th>Poziom</th><th>Status</th><th></th></tr></thead><tbody>
      ${state.categories.map(c=>`<tr><td><strong>${c.parentId?'↳ ':''}${esc(c.name)}</strong></td><td>${c.parentId?'Podkategoria':'Dział'}</td><td><span class="admin-state ${esc(c.status||'draft')}">${labelStatus(c.status||'draft')}</span></td><td><button class="admin-link" data-admin="edit-category" data-id="${esc(c.id)}">Edytuj</button></td></tr>`).join('')}
    </tbody></table></div>`;
  }
  function eventRows(entries){
    return `<div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>Wydarzenie</th><th>Rok</th><th>Kategoria</th><th>Stan</th><th></th></tr></thead><tbody>
      ${entries.map(e=>`<tr>
        <td><strong>${esc(e.title)}</strong></td><td>${esc(e.year)}</td>
        <td>${esc((e.categoryIds||[]).slice(0,2).map(categoryTitle).join(', '))}${(e.categoryIds||[]).length>2?'…':''}</td>
        <td><span class="admin-state ${esc(e.status||'draft')}">${labelStatus(e.status||'draft')}</span></td>
        <td><button class="admin-link" data-admin="edit-event" data-id="${esc(e.id)}">Edytuj</button></td>
      </tr>`).join('')}</tbody></table></div>`;
  }
  function importView(){
    return `<section class="admin-panel-card admin-import">
      <h2>Import danych do Firestore</h2>
      <p>Możesz założyć katalog 12 dziedzin + 72 podkategorie, zaimportować próbne wydarzenia albo wkleić własny JSON / CSV. Import pomija istniejące ID — nie nadpisuje Twoich poprawek.</p>
      <div class="admin-import-actions">
        <button class="btn btn-primary" data-admin="seed-categories" ${state.busy?'disabled':''}>Utwórz katalog 84 kategorii</button>
        <button class="btn btn-outline" data-admin="seed-events" ${state.busy?'disabled':''}>Importuj przykładowe wydarzenia</button>
      </div>
      <form id="admin-import-form">
        <label>Import JSON lub CSV (do 1000 wydarzeń na plik)<textarea name="source" rows="9" placeholder='[{"title":"Przykładowe wydarzenie","year":1990,"categoryIds":["poland"],"sourceUrl":"https://..."}]'></textarea></label>
        <label>Lub wczytaj plik<input type="file" id="admin-import-file" accept=".json,.csv,text/csv,application/json"></label>
        <button class="btn btn-primary" type="submit" ${state.busy?'disabled':''}>Sprawdź i importuj dane</button>
      </form>
      <p class="admin-hint">W CSV obowiązkowe nagłówki: <code>title,year,categoryIds</code>. Pozostałe: <code>id,description,status,difficulty,sourceName,sourceUrl,tags</code>. Wielokrotne kategorie oddziel średnikami (pole CSV ujmij w cudzysłów).</p>
      <p class="admin-hint">Wszystkie importowane dane powinny mieć weryfikowalne daty i prawa do treści. Pierwsze próbne wydarzenia są oznaczone jako szkice do weryfikacji.</p>
      <button class="btn btn-outline" data-admin="export" ${state.busy?'disabled':''}>Eksport całego katalogu do JSON</button>
    </section>
    <section class="admin-panel-card admin-import">
      <h2>Porządkowanie tagów · Historia Polski V1</h2>
      <p>Jednorazowa korekta pierwszej paczki 38 wydarzeń. Usuwa z pola tagi wyłącznie oznaczenia techniczne i poziomy rozpoznawalności:
        <code>kuratorskie-pl-v1</code>, <code>ikoniczne</code>, <code>znane</code>.
        Nie zmienia tytułów, dat, opisów, statusów, kategorii ani źródeł.</p>
      <div class="admin-import-actions">
        <button class="btn btn-outline" data-admin="curated-preview" ${state.busy?'disabled':''}>Sprawdź te 38 rekordów</button>
        ${state.curatedCleanup.checked&&state.curatedCleanup.changes.length?
          `<button class="btn btn-primary" data-admin="curated-clean" ${state.busy?'disabled':''}>Wyczyść tagi w ${state.curatedCleanup.changes.length} rekordach</button>`:''}
      </div>
      ${state.curatedCleanup.checked?`
        <p class="admin-hint">Znaleziono w Firebase: <b>${state.curatedCleanup.found}</b> z 38. Wymaga zmiany: <b>${state.curatedCleanup.changes.length}</b>.
        ${state.curatedCleanup.changes.length?'Zachowane zostaną wszystkie inne tagi.':'Nie ma już nic do poprawienia.'}</p>
        ${state.curatedCleanup.changes.length?`<div class="admin-table-scroll">
          <table class="admin-table"><thead><tr><th>Wydarzenie</th><th>Usuwane oznaczenia</th><th>Pozostaje</th></tr></thead>
          <tbody>${state.curatedCleanup.changes.map(e=>`<tr>
            <td><strong>${esc(e.title)}</strong></td>
            <td>${esc(e.beforeTags.filter(x=>!e.afterTags.includes(x)).join(', '))}</td>
            <td>${esc(e.afterTags.join(', ')||'Brak tagów tematycznych')}</td>
          </tr>`).join('')}</tbody></table></div>`:''}
      `:''}
      <p class="admin-hint">Oryginalne oceny rozpoznawalności z paczki zachowaliśmy w kodzie projektu, aby później dodać osobne pole. Nie musisz edytować dokumentów w Firebase ręcznie ani zmieniać reguł.</p>
    </section>`;
  }

  function wikidataView(){
    const wd=state.wikidata;
    const eligible=wd.items.filter(e=>e.selected&&!e.alreadyStored&&!e.duplicateInBatch);
    const duplicateCount=wd.items.filter(e=>e.alreadyStored||e.duplicateInBatch).length;
    const noDescription=wd.items.filter(e=>!e.description).length;
    const isReady=state.categories.some(c=>c.id===WIKIDATA_SCOPES[wd.scope].categoryId);
    return `<section class="admin-panel-card admin-wikidata">
      <div class="admin-toolbar"><div><h2>Pozyskiwanie wydarzeń · Wikidata</h2>
      <p>Pobierz propozycje i zatwierdź je redakcyjnie przed użyciem w CHRONICE.</p></div>
      <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer" class="admin-link">Wikidata ↗</a></div>
      <form id="admin-wikidata-form" class="admin-wikidata-form">
        <label>Dziedzina<select name="scope">
          ${Object.entries(WIKIDATA_SCOPES).map(([id,item])=>option(id,item.label,wd.scope===id)).join('')}
        </select></label>
        <label>Od roku<input name="startYear" type="number" min="1000" max="2030" required value="${esc(wd.from)}"></label>
        <label>Do roku<input name="endYear" type="number" min="1000" max="2030" required value="${esc(wd.to)}"></label>
        <label>Rozmiar partii<select name="limit">
          ${WIKIDATA_LIMITS.map(n=>option(n,n+' rekordów',Number(wd.limit)===n)).join('')}
        </select></label>
        <button class="btn btn-primary" type="submit" ${state.busy?'disabled':''}>
          ${state.busy?'Pobieranie…':'Pobierz propozycje ↗'}</button>
      </form>
      <p class="admin-hint">${esc(WIKIDATA_SCOPES[wd.scope].help)}. Wyniki zależą od dostępności pól w Wikidata — nie są kompletną historią danej dziedziny.</p>
      ${!isReady?'<div class="admin-alert error">Nie znaleziono kategorii docelowej. Najpierw utwórz katalog startowy.</div>':''}
      <div class="admin-wikidata-explain">
        <span>1 · Pobierz dane</span><span>2 · Odrzuć słabe propozycje</span><span>3 · Zapisz jako szkice</span><span>4 · Zweryfikuj i zatwierdź</span>
      </div>
      ${wd.hasPreview?`<div class="admin-wikidata-preview">
        <div class="admin-wikidata-stats">
          <span><b>${wd.received}</b> wyników z Wikidata</span>
          <span><b>${wd.items.length}</b> poprawnie odczytanych</span>
          <span><b>${duplicateCount}</b> duplikatów / już zapisanych</span>
          <span><b>${noDescription}</b> bez opisu</span>
          <span><b>${eligible.length}</b> zaznaczonych</span>
        </div>
        <div class="admin-import-actions">
          <span class="admin-hint">Zaznaczaj wyłącznie sprawdzone wydarzenia.</span>
          <button data-admin="wd-select-none" class="btn btn-outline" ${state.busy?'disabled':''}>Odznacz wszystkie</button>
          <button data-admin="wd-import" class="btn btn-primary" ${!eligible.length||state.busy?'disabled':''}>Zapisz ${eligible.length} szkiców w Firebase</button>
        </div>
        <div class="admin-table-scroll"><table class="admin-table admin-wikidata-table">
          <thead><tr><th>Wybierz</th><th>Proponowane wydarzenie</th><th>Rok</th><th>Ocena</th><th>Źródło</th></tr></thead>
          <tbody>${wd.items.map(e=>`<tr class="${e.alreadyStored||e.duplicateInBatch?'wd-duplicate':''}">
            <td><input type="checkbox" data-wd-id="${esc(e.id)}" aria-label="Wybierz ${esc(e.title)}"
              ${e.selected?'checked':''} ${e.alreadyStored||e.duplicateInBatch||state.busy?'disabled':''}></td>
            <td><strong>${esc(e.title)}</strong>
              <small>${esc(e.description||'Brak opisu — wymaga uzupełnienia')}</small></td>
            <td>${esc(e.year)}</td>
            <td>${e.alreadyStored?'<span class="admin-state archived">Już w bazie</span>':e.duplicateInBatch?'<span class="admin-state archived">Duplikat</span>':e.flags?.length?`<span class="admin-state review" title="${esc(e.flags.join(' • '))}">Sprawdź opis</span>`:'<span class="admin-state draft">Do weryfikacji</span>'}</td>
            <td><a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="admin-link">${esc(e.qid)} ↗</a></td>
          </tr>`).join('')}</tbody>
        </table></div>
        <p class="admin-hint">${wd.rejected} wyników pominięto z powodu brakującego ID, etykiety lub poprawnej daty. Weryfikuj daty i kontekst, zanim zmienisz status na „Zatwierdzone”.</p>
      </div>`:'<div class="admin-empty">Pobierz pierwszą partię, aby zobaczyć propozycje. Nic nie zostanie zapisane bez Twojego wyboru.</div>'}
    </section>`;
  }


  const categoryTargets={
    cinema:1400,world:1050,games:1000,television:900,sport:850,football:850,
    technology:750,literature:750,science:700,poland:650,culture:600,geography:500,
  };
  function coverageView(){
    const coverage=state.coverage;
    return `<section class="admin-panel-card admin-coverage">
      <div class="admin-toolbar"><div><h2>Rzeczywisty stan bazy</h2>
        <p>Liczymy dokumenty z Firebase, nie pobrane propozycje. Cel: 10 000 zatwierdzonych, unikalnych wydarzeń.</p></div>
        <button class="btn btn-primary" data-admin="coverage-refresh" ${state.busy?'disabled':''}>Przelicz bazę</button>
      </div>
      ${coverage?`
        <div class="admin-coverage-summary">
          <div><small>Wszystkie rekordy</small><strong>${coverage.total.toLocaleString('pl-PL')}</strong></div>
          <div><small>Zatwierdzone</small><strong>${(coverage.byStatus.find(x=>x.status==='published')?.count||0).toLocaleString('pl-PL')}</strong></div>
          <div><small>Do weryfikacji i szkice</small><strong>${(['draft','review'].reduce((n,status)=>n+(coverage.byStatus.find(x=>x.status===status)?.count||0),0)).toLocaleString('pl-PL')}</strong></div>
          <div><small>Cel docelowy</small><strong>10 000</strong></div>
        </div>
        <div class="admin-coverage-progress"><div style="width:${Math.min(100,((coverage.byStatus.find(x=>x.status==='published')?.count||0)/10000)*100)}%"></div></div>
        <p class="admin-hint">Postęp: ${((coverage.byStatus.find(x=>x.status==='published')?.count||0)/100).toFixed(2)}% celu 10 000. Zatwierdzone nie oznacza jeszcze opublikowane w trybach gry.</p>
        <div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>Dziedzina</th><th>Rekordy przypisane bezpośrednio</th><th>Cel</th><th>Pokrycie</th></tr></thead><tbody>
        ${Object.entries(categoryTargets).map(([id,target])=>{
          const n=coverage.byCategory.find(x=>x.categoryId===id)?.count||0;
          const pct=Math.min(100,n/target*100);
          return `<tr><td><strong>${esc(categoryTitle(id))}</strong></td><td>${n.toLocaleString('pl-PL')}</td>
            <td>${target.toLocaleString('pl-PL')}</td>
            <td><div class="admin-mini-progress"><div style="width:${pct}%"></div></div></td></tr>`;
        }).join('')}
        </tbody></table></div>
        <p class="admin-hint">W podziale na dziedziny liczone są wszystkie statusy i tylko bezpośrednie przypisania do działu. Wydarzenie przypisane wyłącznie do podkategorii nie zwiększa tu licznika jej rodzica. Suma wierszy nie musi być równa liczbie unikalnych wydarzeń.</p>
      `:'<div class="admin-empty">Kliknij „Przelicz bazę”, aby zobaczyć aktualne dane z Firestore. Pobrane kandydatury i cele nie są liczone jako zatwierdzone wydarzenia.</div>'}
    </section>`;
  }
  function anniversariesView(){
    const a=state.anniversaries;
    const selected=a.items.filter(x=>x.selected&&!x.alreadyStored&&!x.duplicateInBatch);
    const already=a.items.filter(x=>x.alreadyStored||x.duplicateInBatch).length;
    return `<section class="admin-panel-card admin-anniversaries">
      <div class="admin-toolbar"><div>
        <span class="kicker">STUDIO ŹRÓDEŁ · WYBRANE ROCZNICE</span>
        <h2>Wikipedia: propozycje wydarzeń</h2>
        <p>W przeciwieństwie do surowej Wikidata, Wikipedia wybiera te rocznice redakcyjnie. Nadal musimy sprawdzić ważność dla polskiego gracza.</p>
        </div><a class="admin-link" href="https://en.wikipedia.org/wiki/Wikipedia:Selected_anniversaries" target="_blank" rel="noopener noreferrer">O źródle ↗</a>
      </div>
      <form id="admin-anniversaries-form" class="admin-anniversaries-form">
        <label>Dzień startowy (MM-DD)<input type="text" name="startDay" required maxlength="5" pattern="(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])" value="${esc(a.startDay)}"></label>
        <label>Liczba dni<select name="days">${ANNIVERSARY_DAYS.map(n=>option(n,n+' dni',n===Number(a.days))).join('')}</select></label>
        <label>Dziedzina docelowa<select name="target">
          ${['world','poland'].map(id=>option(id,categoryTitle(id),id===a.target)).join('')}
        </select></label>
        <button class="btn btn-primary" type="submit" ${state.busy?'disabled':''}>Pobierz rocznice ↗</button>
      </form>
      <p class="admin-hint">Najlepiej zacznij od 14 dni. 28 dni oznacza do 28 zapytań HTTP do Wikipedii, maksymalnie dwa jednocześnie. Później użyj daty następnej partii. Import do Historii Polski wymaga szczególnie uważnego wyboru — źródło ma zasięg światowy.</p>
      ${state.busy&&a.progress?`<p class="admin-hint">Pobieranie: ${a.progress.done} / ${a.progress.total} dni.</p>`:''}
      ${a.hasPreview?`
        <div class="admin-wikidata-stats">
          <span><b>${a.succeeded}/${a.requested}</b> pobranych dni</span>
          <span><b>${a.received}</b> propozycji w źródle</span>
          <span><b>${a.items.length}</b> poprawnych rekordów</span>
          <span><b>${already}</b> już zapisanych / powtórzeń</span>
          <span><b>${selected.length}</b> zaznaczonych</span>
        </div>
        ${a.failed.length?`<div class="admin-alert error">Nie udało się pobrać ${a.failed.length} dni. Nie zakładaj, że to kompletna partia: ${esc(a.failed.slice(0,4).map(x=>x.day+' ('+x.error+')').join(', '))}</div>`:''}
        <div class="admin-import-actions">
          <button class="btn btn-outline" data-admin="anniv-next" ${state.busy?'disabled':''}>Następna partia: ${esc(a.nextDay)}</button>
          <button class="btn btn-outline" data-admin="anniv-none" ${state.busy?'disabled':''}>Odznacz wszystkie</button>
          <button class="btn btn-primary" data-admin="anniv-import" ${!selected.length||state.busy?'disabled':''}>Zapisz ${selected.length} szkiców w Firebase</button>
        </div>
        <div class="admin-table-scroll"><table class="admin-table admin-anniversaries-table">
          <thead><tr><th>Wybierz</th><th>Wydarzenie i oryginalny opis</th><th>Rok</th><th>Źródło</th><th>Ocena</th></tr></thead>
          <tbody>${a.items.map(e=>`<tr class="${e.alreadyStored||e.duplicateInBatch?'wd-duplicate':''}">
            <td><input type="checkbox" data-anniv-id="${esc(e.id)}" aria-label="Zaznacz ${esc(e.title)}" ${e.selected?'checked':''} ${e.alreadyStored||e.duplicateInBatch||state.busy?'disabled':''}></td>
            <td><strong>${esc(e.title)}</strong><small>${esc(e.originalText)}</small>
              <label class="anniv-edit">Polski tytuł (opcjonalnie teraz, obowiązkowy przed zatwierdzeniem)
                <input type="text" data-anniv-title="${esc(e.id)}" maxlength="200" placeholder="Wpisz własny polski tytuł wydarzenia" value="${esc(e.polishTitle||'')}" ${state.busy?'disabled':''}>
              </label>
            </td>
            <td>${esc(e.year)}</td>
            <td><a class="admin-link" href="${esc(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">Wikipedia ↗</a></td>
            <td>${e.alreadyStored?'<span class="admin-state archived">Jest w bazie</span>':e.duplicateInBatch?'<span class="admin-state archived">Duplikat</span>':'<span class="admin-state review">Wymaga redakcji PL</span>'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        <p class="admin-hint">Uwaga: opisy wyświetlane w podglądzie pochodzą z angielskiej Wikipedii (CC BY-SA), nie są automatycznie kopiowane do rekordów. Zapis tworzy wyłącznie szkice z pustym opisem. Uzupełnij tytuł i opracuj własne polskie wyjaśnienie w edytorze wydarzeń.</p>
      `:'<div class="admin-empty">Wybierz dzień i pobierz redakcyjnie wybrane rocznice. Niczego nie zapisujemy bez ręcznego wyboru.</div>'}
    </section>`;
  }

  function render(){
    const head=`<header class="admin-head"><div><span class="kicker">CHRONIKA · NARZĘDZIA REDAKCYJNE</span><h1>Centrum danych</h1><p>Jedna baza wydarzeń, wiele kategorii. Panel dostępny wyłącznie upoważnionym kontom.</p></div><div class="admin-head-actions"><button data-admin="refresh" class="btn btn-outline">Odśwież</button><button data-admin="export" class="btn btn-outline">Eksport JSON</button></div></header>`;
    const tabs=`<div class="admin-tabs">
      ${[['events','Wydarzenia'],['categories','Kategorie'],['anniversaries','Wybrane rocznice'],['coverage','Postęp bazy'],['wikidata','Wikidata'],['import','Import / eksport']].map(([tab,name])=>`<button data-admin="tab" data-tab="${tab}" class="${state.tab===tab?'active':''}">${name}</button>`).join('')}
    </div>`;
    const alert=`${state.error?`<div class="admin-alert error" role="alert">${esc(state.error)}</div>`:''}${state.info?`<div class="admin-alert success" role="status">${esc(state.info)}</div>`:''}`;
    let body='';
    if(state.tab==='categories')body=`<section class="admin-panel-card">
      <div class="admin-toolbar"><div><h2>Katalog kategorii</h2><p>${state.categories.length} kategorii · ${state.categories.filter(c=>!c.parentId).length} dziedzin</p></div><button class="btn btn-primary" data-admin="new-category">+ Dodaj kategorię</button></div>
      ${state.edit?.type==='category'?categoryForm():''}
      ${categoryRows()}</section>`;
    else if(state.tab==='events'){
      const visibleEvents=state.query&&state.categoryFilter?state.events.filter(e=>(e.categoryIds||[]).includes(state.categoryFilter)):state.events;
      body=`<section class="admin-panel-card">
      <div class="admin-toolbar"><div><h2>Wydarzenia</h2><p>Strona ${state.page} · ${state.events.length} pozycji na stronie · kolejne strony dostępne niżej</p></div><button class="btn btn-primary" data-admin="new-event">+ Dodaj wydarzenie</button></div>
      ${filters()}
      ${state.query&&state.categoryFilter?'<p class="admin-hint">Przy wyszukiwaniu po tytule filtr kategorii działa w obrębie wyników aktualnej strony.</p>':''}
      ${state.edit?.type==='event'?eventForm():''}
      ${visibleEvents.length?eventRows(visibleEvents):'<div class="admin-empty">Brak wydarzeń na tej stronie. Zmień filtr albo przejdź do importu.</div>'}
      <div class="admin-pages"><button class="btn btn-outline" data-admin="prev" ${state.page<=1||state.busy?'disabled':''}>← Poprzednia</button><span>Strona ${state.page}</span><button class="btn btn-outline" data-admin="next" ${!state.hasMore||state.busy?'disabled':''}>Następna →</button></div>
    </section>`;
    }
    else if(state.tab==='anniversaries')body=anniversariesView();
    else if(state.tab==='coverage')body=coverageView();
    else if(state.tab==='wikidata')body=wikidataView();
    else body=importView();
    return `<div id="admin-panel" class="admin-panel">${head}${tabs}${alert}${state.loaded?body:'<div class="admin-empty">Ładowanie katalogu Firebase…</div>'}</div>`;
  }
  function update(){if(root)root.innerHTML=render().replace(/^<div id="admin-panel" class="admin-panel">/,'').replace(/<\/div>$/,'');}
  async function load(){
    state.busy=true;state.error='';update();
    try{
      state.categories=await api.listCategories();
      state.loaded=true;
      await loadEvents(true);
    }catch(error){state.loaded=true;notify(error?.message||String(error),true);}
    finally{state.busy=false;update();}
  }
  async function loadEvents(reset=false){
    if(reset){state.previous=[];state.cursor=null;state.page=1;}
    const data=await api.listEvents({after:state.cursor,categoryId:state.categoryFilter,search:state.query,pageSize:40});
    state.events=data.items;
    state.nextCursor=data.cursor;
    state.hasMore=data.hasMore;
  }
  async function run(work,success){
    if(state.busy)return;
    state.busy=true;state.error='';state.info='';update();
    try{await work();if(success)state.info=success;}
    catch(error){state.error=error?.message||String(error);}
    finally{state.busy=false;update();}
  }
  function downloadFile(filename,content){
    const blob=new Blob([content],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
    URL.revokeObjectURL(url);
  }
  async function exportAll(){
    const records=[];let after=null;
    for(let i=0;i<500;i++){
      const page=await api.listEvents({after,pageSize:100});
      records.push(...page.items);
      if(!page.hasMore||!page.cursor)break;
      after=page.cursor;
    }
    downloadFile('chronika-katalog-'+new Date().toISOString().slice(0,10)+'.json',
      JSON.stringify({exportedAt:new Date().toISOString(),categories:state.categories,events:records},null,2));
  }
  async function click(event){
    const el=event.target.closest('[data-admin]');
    if(!el||el.disabled)return;
    const action=el.dataset.admin,id=el.dataset.id;
    if(action==='tab'){state.tab=el.dataset.tab;state.edit=null;state.error='';state.info='';update();return;}
    if(action==='cancel'){state.edit=null;update();return;}
    if(action==='new-category'){state.edit={type:'category',value:null};update();return;}
    if(action==='new-event'){state.edit={type:'event',value:null};update();return;}
    if(action==='edit-category'){state.edit={type:'category',value:state.categories.find(c=>c.id===id)};update();return;}
    if(action==='edit-event'){state.edit={type:'event',value:state.events.find(e=>e.id===id)};update();return;}
    if(action==='clear'){state.query='';state.categoryFilter='';await run(()=>loadEvents(true));return;}
    if(action==='refresh'){await run(load);return;}
    if(action==='next'&&state.hasMore){
      await run(async()=>{state.previous.push(state.cursor);state.cursor=state.nextCursor;state.page++;await loadEvents();});return;
    }
    if(action==='prev'&&state.page>1){
      await run(async()=>{state.cursor=state.previous.pop()??null;state.page--;await loadEvents();});return;
    }

    if(action==='wd-select-all'){
      state.wikidata.items=state.wikidata.items.map(e=>({...e,selected:!e.alreadyStored&&!e.duplicateInBatch}));
      update();return;
    }
    if(action==='wd-select-none'){
      state.wikidata.items=state.wikidata.items.map(e=>({...e,selected:false}));
      update();return;
    }
    if(action==='wd-import'){
      const selected=state.wikidata.items.filter(e=>e.selected&&!e.alreadyStored&&!e.duplicateInBatch);
      if(!selected.length)return;
      if(!confirm('Zapisać '+selected.length+' propozycji jako SZKICE w Firebase? Żadna nie trafi automatycznie do gry.'))return;
      await run(async()=>{
        const result=await api.importEvents(selected.map(e=>({...e,status:'draft'})));
        const savedIds=new Set(selected.map(e=>e.id));
        state.wikidata.items=state.wikidata.items.map(e=>savedIds.has(e.id)?{...e,selected:false,alreadyStored:true}:e);
        state.info='Wikidata: dodano '+result.added+' szkiców, pominięto '+result.skipped+' istniejących.';
        await loadEvents(true);
      });return;
    }

    if(action==='coverage-refresh'){
      await run(async()=>{state.coverage=await api.catalogCounts();state.info='Odczytano aktualne liczniki Firestore.';});return;
    }
    if(action==='anniv-none'){
      state.anniversaries.items=state.anniversaries.items.map(item=>({...item,selected:false}));
      update();return;
    }
    if(action==='anniv-next'){
      state.anniversaries.startDay=state.anniversaries.nextDay;state.anniversaries.hasPreview=false;
      state.anniversaries.items=[];update();return;
    }
    if(action==='anniv-import'){
      const selected=state.anniversaries.items.filter(x=>x.selected&&!x.alreadyStored&&!x.duplicateInBatch);
      if(!selected.length)return;
      if(!confirm('Zapisać '+selected.length+' wydarzeń jako SZKICE do weryfikacji? Angielskie opisy nie zostaną skopiowane.'))return;
      await run(async()=>{
        const categoryId=state.anniversaries.target;
        const payload=selected.map(item=>({
          id:item.id,title:String(item.polishTitle||'').trim()||item.title,year:item.year,
          description:'',sourceUrl:item.sourceUrl,sourceName:item.sourceName,
          status:'draft',categoryIds:[categoryId],difficulty:2,tags:[],
        }));
        const result=await api.importEvents(payload);
        const done=new Set(selected.map(x=>x.id));
        state.anniversaries.items=state.anniversaries.items.map(e=>
          done.has(e.id)?{...e,selected:false,alreadyStored:true}:e);
        state.coverage=null;
        state.info='Zapisano '+result.added+' szkiców. Pominięto '+result.skipped+' istniejących. Opisy wymagają opracowania.';
        await loadEvents(true);
      });return;
    }
    if(action==='curated-preview'){
      await run(async()=>{
        const preview=await api.previewCuratedV1Cleanup();
        state.curatedCleanup={...preview,checked:true};
        state.info=preview.changes.length?
          'Znaleziono '+preview.changes.length+' rekordów do uporządkowania. Sprawdź podgląd.':
          'Wszystkie znalezione rekordy tej paczki mają już uporządkowane tagi.';
      });return;
    }
    if(action==='curated-clean'){
      const count=state.curatedCleanup.checked?state.curatedCleanup.changes.length:0;
      if(!count)return;
      if(!confirm('Usunąć trzy niepotrzebne oznaczenia z tagów w '+count+
        ' rekordach paczki Historia Polski V1? Inne pola pozostaną bez zmian.'))return;
      await run(async()=>{
        const result=await api.cleanupCuratedV1Tags();
        state.curatedCleanup={...await api.previewCuratedV1Cleanup(),checked:true};
        state.info='Uporządkowano tagi w '+result.updated+' wydarzeniach. Inne pola pozostały bez zmian.';
      });return;
    }
    if(action==='seed-categories'){
      if(!confirm('Utworzyć 84 robocze kategorie w Firebase? Działa tylko przy pustej kolekcji.'))return;
      await run(async()=>{const n=await api.importCategories();state.categories=await api.listCategories();state.info='Utworzono '+n+' kategorii.';},null);return;
    }
    if(action==='seed-events'){
      if(!confirm('Dodać testowe wydarzenia do bazy admina jako szkice? Istniejące rekordy nie będą nadpisane.'))return;
      await run(async()=>{const r=await api.importSampleEvents();await loadEvents(true);state.info='Dodano '+r.added+' wydarzeń, pominięto '+r.skipped+' istniejących.';},null);return;
    }
    if(action==='export'){await run(exportAll,'Eksport katalogu gotowy.');return;}
  }
  async function submit(event){
    if(!['admin-category-form','admin-event-form','admin-import-form','admin-filter-form','admin-wikidata-form','admin-anniversaries-form'].includes(event.target.id))return;
    event.preventDefault();
    const form=event.target,formId=form.id,fd=new FormData(form);


    if(formId==='admin-anniversaries-form'){
      const startDay=String(fd.get('startDay')||'01-01').trim();
      const days=Number(fd.get('days')),target=String(fd.get('target')||'world');
      if(!['world','poland'].includes(target))throw new Error('Nieprawidłowa dziedzina.');
      if(!state.categories.some(c=>c.id===target))throw new Error('Nie znaleziono kategorii docelowej.');
      state.anniversaries={startDay,days,target,items:[],received:0,rejected:0,
        succeeded:0,failed:[],requested:days,hasPreview:false,nextDay:startDay,progress:null};
      await run(async()=>{
        const result=await fetchSelectedAnniversaries({startDay,days},fetch,(progress)=>{
          state.anniversaries.progress=progress;
          // Avoid redrawing the form while requests are in flight.
        });
        const existing=[];
        for(let index=0;index<result.items.length;index+=100){
          existing.push(...await api.existingEventIds(result.items.slice(index,index+100).map(x=>x.id)));
        }
        state.anniversaries={...state.anniversaries,...result,
          items:uniqueAnniversaryCandidates(result.items,existing),hasPreview:true};
        state.info='Pobrano '+result.items.length+' propozycji. Obejrzyj i ręcznie wybierz warte zachowania.';
      });return;
    }
    if(formId==='admin-wikidata-form'){
      const scope=String(fd.get('scope')||'poland');
      const startYear=Number(fd.get('startYear')),endYear=Number(fd.get('endYear'));
      const limit=Number(fd.get('limit'));
      state.wikidata={scope,from:String(startYear),to:String(endYear),limit,items:[],received:0,rejected:0,hasPreview:false};
      await run(async()=>{
        if(!state.categories.some(c=>c.id===WIKIDATA_SCOPES[scope]?.categoryId)){
          throw new Error('Najpierw załóż kategorię docelową w panelu kategorii.');
        }
        const result=await fetchWikidataCandidates({scope,startYear,endYear,limit});
        const existing=result.items.length?await api.existingEventIds(result.items.map(e=>e.id)):[];
        state.wikidata.items=identifyCandidateDuplicates(result.items,existing);
        state.wikidata.received=result.received;state.wikidata.rejected=result.rejected;
        state.wikidata.hasPreview=true;
        state.info='Pobrano '+result.received+' wyników. Wybierz rekordy do zapisania jako szkice.';
      });return;
    }
    if(formId==='admin-filter-form'){
      state.query=String(fd.get('query')||'').trim();
      state.categoryFilter=String(fd.get('filterCategory')||'');
      await run(()=>loadEvents(true));return;
    }
    if(formId==='admin-category-form'){
      const edit=state.edit?.type==='category'?state.edit.value:null;
      const data={name:fd.get('name'),id:fd.get('id')||slugify(fd.get('name')),
        parentId:fd.get('parentId'),status:fd.get('status'),sortOrder:fd.get('sortOrder'),description:fd.get('description')};
      await run(async()=>{
        await api.saveCategory(data,edit?.id||null);
        state.categories=await api.listCategories();state.edit=null;
      },'Kategoria zapisana.');return;
    }
    if(formId==='admin-event-form'){
      const edit=state.edit?.type==='event'?state.edit.value:null;
      const data={id:fd.get('id')||'event-'+slugify(fd.get('title'))+'-'+fd.get('year'),
        title:fd.get('title'),year:fd.get('year'),categoryIds:fd.getAll('categoryIds'),
        status:fd.get('status'),difficulty:fd.get('difficulty'),description:fd.get('description'),
        sourceUrl:fd.get('sourceUrl'),sourceName:fd.get('sourceName'),tags:fd.get('tags')};
      await run(async()=>{
        await api.saveEvent(data,edit?.id||null);
        state.edit=null;
        await loadEvents(true);
      },'Wydarzenie zapisane.');return;
    }
    if(formId==='admin-import-form'){
      let raw=String(fd.get('source')||'').trim();
      const file=form.querySelector('input[type="file"]')?.files?.[0];
      if(!raw&&file)raw=await file.text();
      try{
        const items=parseEventImport(raw);
        if(!items.length)throw new Error('Pusty import.');
        if(items.length>1000)throw new Error('Maksymalnie 1000 pozycji na import.');
        if(!confirm('Wgrać '+items.length+' wydarzeń do Firebase? Istniejące ID zostaną pominięte.'))return;
        await run(async()=>{
          const result=await api.importEvents(items);
          await loadEvents(true);
          state.info='Import zakończony: '+result.added+' dodanych, '+result.skipped+' pominiętych.';
        });return;
      }catch(error){notify(error.message,true);}
    }
  }
  function bind(element){root=element;
    root.onclick=event=>{click(event).catch(error=>notify(error.message,true));};
    root.onsubmit=event=>{submit(event).catch(error=>notify(error.message,true));};
    root.oninput=event=>{
      const input=event.target.closest('[data-anniv-title]');
      if(!input)return;
      const candidate=state.anniversaries.items.find(e=>e.id===input.dataset.annivTitle);
      if(candidate)candidate.polishTitle=input.value;
    };
    root.onchange=event=>{
      const anniv=event.target.closest('[data-anniv-id]');
      if(anniv){
        if(anniv.disabled)return;
        const record=state.anniversaries.items.find(e=>e.id===anniv.dataset.annivId);
        if(record)record.selected=!!anniv.checked;
        update();return;
      }
      const input=event.target.closest('[data-wd-id]');
      if(!input||input.disabled)return;
      const record=state.wikidata.items.find(e=>e.id===input.dataset.wdId);
      if(record)record.selected=!!input.checked;
      update();
    };
  }
  return {render,bind,load,state};
}
