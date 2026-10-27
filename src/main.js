import { categoryInfo, CHAPTERS, GAME_TYPES } from './data.js';
import { awardStageProgress, initialProgress, isStageUnlocked, progressSummary, startRun, currentQuestion, applyAnswer, advanceRun, yearOptions } from './engine.js';
import { readLocalProgress, saveLocalProgress, mergeProgress, readLocalStats, saveLocalStats } from './store.js';
import { connectFirebase, friendlyAuthError } from './firebase.js';
import { initialPlayerStats, normaliseStats, applyRunStats, accuracyPercent, formatDuration } from './playerStats.js';

const app=document.getElementById('app');
const state={
  page:'auth', authMode:'register', authError:'', authPending:false, loadingSession:0,
  session:null, profile:null, firebase:null, stats:initialPlayerStats(),
  progress:readLocalProgress(), category:'cinema', type:'timeline', run:null,
  yearChoices:[], result:null, cloudState:'connecting', toast:null,
};
const clean=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=()=>progressSummary(state.progress);
const isMember=()=>!!state.session && !state.session.anonymous;
const playerName=()=>isMember()?state.profile?.displayName||state.session.name||'Odkrywca':'Gość';
const avatarLetter=()=>playerName().trim().charAt(0).toUpperCase()||'C';
const rankName=stars=>stars>=25?'Archiwista':stars>=12?'Badacz':'Odkrywca';
const who=()=>state.session?.uid||null;
const pct=(c,t)=>`${accuracyPercent(c,t)}%`;
const getChapter=id=>CHAPTERS.find(c=>c.id===id);
const getStage=id=>CHAPTERS.flatMap(c=>c.stages).find(s=>s.id===id);
const statline=(label,value)=>`<span class="statline"><small>${label}</small><strong>${value}</strong></span>`;
const icon=(name)=>({spark:'✧',sparkles:'✦',timeline:'◷',arrow:'↗',star:'★',shield:'◈',medal:'♛',target:'◎',swords:'⚔',dots:'···'})[name]||name;
const stars=(n,small=false)=>`<span class="stars ${small?'small':''}" aria-label="${n} z 3 gwiazdek">${[1,2,3].map(i=>`<span class="${i<=n?'lit':''}">★</span>`).join('')}</span>`;
function notice(message){state.toast=message;render();setTimeout(()=>{if(state.toast===message){state.toast=null;render();}},3200);}
function renderShell(inner){const c=count();return `
<div class="site-backdrop"><span></span><span></span><span></span></div>
<div class="layout">
<aside class="sidebar" aria-label="Nawigacja">
  <button class="brand" data-action="navigate" data-target="home"><span class="brand-mark">⌛</span><span class="brand-text">CHRONIKA<small>GRA O CZASIE <b>● PROTOTYP</b></small></span></button>
  <div class="side-caption">ODKRYWAJ</div>
  <nav class="side-nav">
    ${nav('home','⌂','Strona główna')}
    ${nav('campaign','◈','Kampania')}
    ${nav('quick','⌁','Szybka gra')}
    ${nav('arena','♜','Arena 1 na 1')}
    ${nav('profile','♙','Mój profil')}
  </nav>
  <div class="sidebar-spacer"></div>
  <button class="side-profile side-profile-button" data-action="navigate" data-target="profile"><div class="profile-emblem">${clean(avatarLetter())}</div><span><b>${clean(playerName())}</b><small>${isMember()?'Konto gracza · Firebase':'Gra jako gość'}</small></span><span class="profile-arrow">↗</span></button>
  <div class="side-footer">WERSJA 0.1 · OSOBNY PROJEKT<br/>NIEZALEŻNY OD HITSTERIADY</div>
</aside>
<div class="main-wrap">
<header class="topbar"><div class="breadcrumb">CHRONIKA <span> / </span> ${({home:'PULPIT',campaign:'KAMPANIA',quick:'SZYBKA GRA',arena:'ARENA',game:'ROZGRYWKA',result:'WYNIK',auth:'TWOJE KONTO',profile:'MÓJ PROFIL'})[state.page]||'PULPIT'}</div><div class="top-right"><span class="online-tag"><i></i>${state.cloudState==='connected'?(isMember()?'ZAPIS ONLINE':'TRYB GOŚCIA'):state.cloudState==='connecting'?'ŁĄCZENIE…':'ZAPIS LOKALNY'}</span><div class="top-points">${icon('star')} <strong>${c.stars}</strong><span> / ${c.maxStars}</span></div><button class="top-avatar top-avatar-button" aria-label="Otwórz profil" data-action="navigate" data-target="profile">${clean(avatarLetter())}</button></div></header>
<main id="main-content">${inner}</main>
<footer class="mobile-footer">${nav('home','⌂','Start')}${nav('campaign','◈','Kampania')}${nav('quick','⌁','Szybka')}${nav('arena','♜','Arena')}${nav('profile','♙','Profil')}</footer>
</div>
</div>${state.toast?`<div class="toast" role="status">${clean(state.toast)}</div>`:''}`;}
function nav(key,symbol,label){const active=state.page===key?'active':'';return `<button class="nav-item ${active}" data-action="navigate" data-target="${key}" ${active?'aria-current="page"':''}><span class="nav-symbol">${symbol}</span><span>${label}</span>${active?'<span class="active-dot"></span>':''}</button>`;}
function hero(){const c=count();return `
<section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="dash"></span> WIEDZA TO TWOJA PRZEWAGA</div><h1>Każdy moment<br/>ma <em>swoje miejsce.</em></h1><p>Filmy, historia, sport i popkultura. Układaj wydarzenia w czasie, zgaduj daty i buduj swoją własną historię zwycięstw.</p><div class="hero-actions"><button class="btn btn-primary" data-action="navigate" data-target="campaign">Kontynuuj kampanię <b>↗</b></button><button class="btn btn-outline" data-action="navigate" data-target="quick">Szybka gra <span>↗</span></button></div></div><div class="hero-art" aria-hidden="true"><div class="hero-outer-ring"></div><div class="hero-inner-ring"></div><div class="hero-needle"></div><div class="hero-arch arch-1"></div><div class="hero-arch arch-2"></div><div class="art-center"><span>19</span><i></i><span>89</span></div><div class="orb orb-one">1977</div><div class="orb orb-two">2004</div><div class="orb orb-three">1410</div></div><span class="hero-01">01 / ∞</span></section>
<section class="summary-strip">${statline('ODKRYTE ETAPY',`${c.completed} <span class="faint">/ ${c.total}</span>`)}${statline('ZDOBYTE GWIAZDKI',`${c.stars} <span class="accent-gold">★</span>`)}${statline('PUNKTY DOŚWIADCZENIA',`${state.progress.xp||0} <span class="faint">XP</span>`)}${statline('TWOJA RANGA',rankName(c.stars))}</section>`;}
function guestBanner() {
  if(isMember())return '';
  return `<section class="account-banner"><div><b>Twój postęp zasługuje na własne konto.</b><p>Załóż konto, aby zachować gwiazdki, XP i statystyki również na innych urządzeniach.</p></div><button class="btn btn-primary tiny" data-action="auth-open" data-mode="register">Utwórz konto ↗</button><button class="text-link" data-action="auth-open" data-mode="login">Mam już konto</button></section>`;
}
function categoryTile(category){const ch=getChapter(category), info=categoryInfo[category], index=CHAPTERS.findIndex(c=>c.id===category)+1;return `<button class="category-card tone-${category}" data-action="chapter" data-chapter="${category}"><div class="category-head"><span>ROZDZIAŁ ${String(index).padStart(2,'0')}</span><span class="arrow-top">↗</span></div><div class="category-emblem">${info.icon}</div><div class="category-bottom"><strong>${info.label}</strong><small>${info.subtitle}</small></div></button>`;}
function home(){const c=count();return `${guestBanner()}${hero()}<section class="content-section"><div class="section-heading"><div><div class="kicker">WYBIERZ SWÓJ ŚWIAT</div><h2>Odkrywaj <span>epoki.</span></h2></div><button class="text-link" data-action="navigate" data-target="campaign">Cała kampania ↗</button></div><div class="categories-grid">${CHAPTERS.map(ch=>categoryTile(ch.id)).join('')}</div></section><section class="bottom-grid"><div class="feature-panel"><div class="kicker">TWÓJ NASTĘPNY RUCH</div><h3>${c.completed===0?'Wszystko zaczyna się od pierwszej karty.':`Masz już ${c.stars} gwiazdek. Czas po kolejne.`}</h3><p>Trzy różne mechaniki i dwanaście pierwszych wyzwań czekają na odkrycie.</p><button class="btn btn-primary tiny" data-action="navigate" data-target="campaign">Otwórz mapę kampanii ↗</button></div><div class="feature-panel dark"><div class="kicker">NA HORYZONCIE</div><h3>Rywalizacja bez granic.</h3><p>1 na 1, publiczne rankingi, turnieje i sezonowe wyzwania to kolejne etapy prac.</p><button class="text-link" data-action="navigate" data-target="arena">Zobacz plan areny ↗</button></div></section>`;}
function campaign(){const c=count();return `<section class="page-intro"><div class="kicker">TRYB DLA JEDNEGO GRACZA</div><h1>Twoja droga przez <em>czas.</em></h1><p>Cztery światy. Dwanaście etapów. Trzy różne mechaniki. Przechodź kolejne wyzwania i zbieraj maksymalnie trzy gwiazdki na każdym etapie.</p><div class="intro-stats"><span>${c.completed}/${c.total} etapów</span><span>${c.stars}/${c.maxStars} ★</span><span>${state.progress.xp||0} XP</span></div><div class="progress-rail"><i style="width:${Math.round(c.stars/c.maxStars*100)}%"></i></div></section><div class="chapter-stack">${CHAPTERS.map((ch,idx)=>{const completed=ch.stages.reduce((n,s)=>n+Number(state.progress.stages?.[s.id]?.stars||0),0);const info=categoryInfo[ch.category];return `<section class="chapter ${isStageUnlocked(ch.stages[0].id,state.progress)?'':'sealed'}"><div class="chapter-intro"><div class="chapter-num">${ch.code}<span>/ 04</span></div><div class="chapter-copy"><div class="kicker">${ch.eyebrow} · ${info.label.toUpperCase()}</div><h2>${ch.title}</h2><p>${ch.description}</p></div><div class="chapter-progress"><b>${completed}<span> / 9</span></b><small>GWIAZDEK</small></div></div><div class="stages">${ch.stages.map((stage,index)=>{const unlocked=isStageUnlocked(stage.id,state.progress),best=state.progress.stages?.[stage.id]?.stars||0;return `<button class="stage-card ${unlocked?'':'is-locked'}" data-action="stage" data-stage="${stage.id}" ${unlocked?'':'disabled'}><div class="stage-top"><span>${String(index+1).padStart(2,'0')}</span><span class="stage-type">${unlocked?GAME_TYPES[stage.type].glyph:'⌑'}</span></div><h3>${stage.title}</h3><small>${GAME_TYPES[stage.type].label}</small><div class="stage-footer">${unlocked?stars(best,true):'<span class="lock-text">ZABLOKOWANE</span>'}<b>${unlocked?'↗':'⌑'}</b></div></button>`;}).join('')}</div></section>`;}).join('')}</div>`;}
function quick(){return `<section class="page-intro"><div class="kicker">TRENING BEZ ZOBOWIĄZAŃ</div><h1>Szybka gra. <em>Wielka wiedza.</em></h1><p>Wybierz kategorię i mechanikę. Sześć rund, bez odblokowywania etapów. Idealnie, gdy masz kilka minut.</p></section><section class="setup"><div class="setup-column"><div class="setup-label">01 / WYBIERZ KATEGORIĘ</div><div class="choice-grid">${Object.entries(categoryInfo).map(([id,v])=>`<button class="choice ${state.category===id?'selected':''}" data-action="category" data-category="${id}"><span class="choice-icon">${v.icon}</span><b>${v.label}</b><span>${state.category===id?'●':'○'}</span></button>`).join('')}</div></div><div class="setup-column"><div class="setup-label">02 / WYBIERZ TRYB</div><div class="choice-grid modes">${Object.entries(GAME_TYPES).map(([id,v])=>`<button class="choice mode-choice ${state.type===id?'selected':''}" data-action="type" data-type="${id}"><span class="choice-icon">${v.glyph}</span><b>${v.label}</b><small>${v.description}</small><span>${state.type===id?'●':'○'}</span></button>`).join('')}</div></div><div class="start-bar"><div><span>GOTOWY?</span><strong>6 rund · ${categoryInfo[state.category].label} · ${GAME_TYPES[state.type].label}</strong></div><button class="btn btn-primary" data-action="start-quick">Rozpocznij grę ↗</button></div></section>`;}
function arena(){return `<section class="page-intro"><div class="kicker">ROZGRYWKA SIECIOWA · PLAN ROZWOJU</div><h1>Tu będzie <em>arena.</em></h1><p>Rozdział multiplayer zaprojektowaliśmy jako pełnoprawną rywalizację. Online wymaga autoryzacji graczy oraz kontrolowania wyników po stronie serwera — w prototypie nie udajemy działających meczów.</p></section><div class="arena-grid"><article class="arena-card"><span class="arena-icon">⚔</span><div class="kicker">ETAP 02</div><h2>Pojedynek 1 na 1</h2><p>Jedna talia, sześć rund, synchroniczne odpowiedzi. Ta sama pula pytań dla obu graczy, wynik po każdej rundzie i rewanż.</p><span class="roadmap-tag">DO IMPLEMENTACJI</span></article><article class="arena-card"><span class="arena-icon">♛</span><div class="kicker">ETAP 03</div><h2>Turnieje i rankingi</h2><p>Drabinki, rozgrywki sezonowe, nagrody kosmetyczne i ranking według kategorii. Walidacja na backendzie Firebase.</p><span class="roadmap-tag">DO IMPLEMENTACJI</span></article></div><div class="arena-note">Planowana technologia: Firebase Authentication + Firestore do pokojów oraz Cloud Functions do bezpiecznego rozliczania wyników.</div><button class="btn btn-outline" data-action="navigate" data-target="home">← Wróć do grywalnego prototypu</button>`;}

// Account screens: all user-facing text is escaped; all login calls go to Firebase Auth.
function authPage() {
  const mode=state.authMode,register=mode==='register',reset=mode==='reset';
  const title=register?'Zapisz swoją historię.':reset?'Odzyskaj dostęp.':'Witaj ponownie.';
  const action=register?'Załóż konto':reset?'Wyślij link resetujący':'Zaloguj się';
  return `<div class="account-page">
    <section class="account-intro"><span class="kicker">CHRONIKA · KONTO GRACZA</span>
      <h1>${title}</h1><p>Jedno konto, cały Twój postęp: kampanie, gwiazdki, XP, wyniki i rozbudowane statystyki. Docelowo także pojedynki i turnieje.</p>
      <div class="account-perks"><span>✦ Synchronizacja na urządzeniach</span><span>★ Osiągnięcia i poziomy</span><span>◈ Twoja historia rozgrywek</span></div>
      <button class="text-link" data-action="guest">← Kontynuuj bez konta</button>
    </section>
    <section class="account-panel">
      <div class="account-switch"><button type="button" class="${register?'selected':''}" data-action="auth-mode" data-mode="register">Rejestracja</button><button type="button" class="${!register&&!reset?'selected':''}" data-action="auth-mode" data-mode="login">Logowanie</button></div>
      <div class="kicker">${reset?'ODZYSKIWANIE HASŁA':register?'NOWY ODKRYWCA':'TWOJA HISTORIA CZEKA'}</div><h2>${action}</h2>
      <form id="auth-form" class="account-form">
        ${register?'<label>Nick gracza<input required name="nickname" maxlength="24" minlength="2" autocomplete="nickname" placeholder="Twój nick"></label>':''}
        <label>Adres e-mail<input required name="email" type="email" autocomplete="email" placeholder="gracz@example.com"></label>
        ${reset?'':`<label>Hasło<input required name="password" type="password" minlength="6" autocomplete="${register?'new-password':'current-password'}" placeholder="Minimum 6 znaków"></label>`}
        ${state.authError?`<p role="alert" class="account-error">${clean(state.authError)}</p>`:''}
        <button type="submit" class="btn btn-primary" ${state.authPending?'disabled':''}>${state.authPending?'Trwa przetwarzanie…':action+' ↗'}</button>
      </form>
      <div class="account-links">
        ${register?'<p>Masz konto? <button data-action="auth-mode" data-mode="login">Zaloguj się</button></p>':''}
        ${!register&&!reset?'<button data-action="auth-mode" data-mode="reset">Nie pamiętam hasła</button>':''}
        ${reset?'<button data-action="auth-mode" data-mode="login">← Wróć do logowania</button>':''}
      </div>
      ${state.session?.anonymous?'<div class="account-info">Rejestracja zachowa wszystkie gwiazdki i wyniki obecnego gościa.</div>':''}
    </section>
  </div>`;
}
function statCard(icon,label,value,detail='') {
  return `<article class="player-stat-card"><span class="player-stat-icon">${icon}</span><small>${clean(label)}</small><strong>${clean(value)}</strong>${detail?`<span>${clean(detail)}</span>`:''}</article>`;
}
function profilePage() {
  const c=count(),stats=normaliseStats(state.stats),guest=!isMember(),name=playerName();
  const recent=stats.recentRuns.map(run=>`<div class="player-recent-row"><div><b>${clean(categoryInfo[run.category]?.label||run.category)}</b><small>${clean(GAME_TYPES[run.type]?.label||run.type)} · ${run.stageId?'Kampania':'Szybka gra'}</small></div><strong>${run.correct}/${run.rounds}</strong><time>${new Date(run.at||Date.now()).toLocaleDateString('pl-PL')}</time></div>`).join('');
  const categories=Object.entries(categoryInfo).map(([id,item])=>{const data=stats.categories[id]||{};return `<div class="player-breakdown-row"><span>${item.icon} ${clean(item.label)}</span><strong>${Number(data.played||0)} gier</strong><small>${pct(data.correct,data.answers)} poprawnych</small></div>`}).join('');
  const modes=Object.entries(GAME_TYPES).map(([id,item])=>{const data=stats.modes[id]||{};return `<div class="player-breakdown-row"><span>${clean(item.glyph)} ${clean(item.label)}</span><strong>${Number(data.played||0)} gier</strong><small>${pct(data.correct,data.answers)} poprawnych</small></div>`}).join('');
  return `<section class="player-hero">
    <div class="player-identity"><div class="player-emblem">${clean(avatarLetter())}</div><div><span class="kicker">KARTA GRACZA · CHRONIKA</span><h1>${clean(name)}</h1><p>${guest?'Konto gościa — wyniki są przypisane tylko do tej przeglądarki.':clean(state.session.email)} · ${rankName(c.stars)}</p><small class="player-sync">${state.cloudState==='connected'?'● Synchronizacja Firebase włączona':'○ '+(state.cloudState==='connecting'?'Łączenie z Firebase…':'Ostatnie zmiany mogą być tylko lokalne')}</small></div></div>
    <div class="player-actions">${guest?`<button class="btn btn-primary" data-action="auth-open" data-mode="register">Utwórz konto ↗</button><button class="btn btn-outline" data-action="auth-open" data-mode="login">Zaloguj się</button>`:`<button class="btn btn-outline" data-action="logout" ${state.authPending?'disabled':''}>Wyloguj</button>`}</div>
  </section>
  <section class="player-stat-grid">
    ${statCard('★','Gwiazdek kampanii',c.stars+' / '+c.maxStars,c.completed+' / '+c.total+' etapów')}
    ${statCard('✦','Doświadczenie',(state.progress.xp||0)+' XP',rankName(c.stars))}
    ${statCard('◷','Rozegrane sesje',stats.totalRuns,stats.campaignRuns+' kampania · '+stats.quickRuns+' szybkie')}
    ${statCard('◎','Skuteczność',pct(stats.correctAnswers,stats.totalAnswers),stats.correctAnswers+' / '+stats.totalAnswers+' odpowiedzi')}
    ${statCard('⌛','Czas rozgrywek',formatDuration(stats.totalTimeSeconds),'Od wprowadzenia statystyk')}
    ${statCard('◈','Ukończone etapy',c.completed+' / '+c.total,'Kampania jednoosobowa')}
  </section>
  <div class="player-details">
    <section class="player-panel"><h2>Postępy kampanii</h2><p>Najlepszy wynik każdego etapu. Powtórki nie zabierają gwiazdek.</p>
      ${CHAPTERS.map(ch=>{const value=ch.stages.reduce((n,st)=>n+Number(state.progress.stages?.[st.id]?.stars||0),0);return `<div class="player-progress-row"><div><span>${clean(categoryInfo[ch.category]?.icon||'◈')} ${clean(ch.title)}</span><strong>${value}/9 ★</strong></div><div class="player-progress-track"><i style="width:${Math.min(100,Math.round(value/9*100))}%"></i></div></div>`}).join('')}
    </section>
    <section class="player-panel"><h2>Według kategorii</h2><p>Najczęściej wybierane dziedziny.</p>${categories}</section>
    <section class="player-panel"><h2>Według trybu</h2><p>Sprawdź swoje najmocniejsze mechaniki.</p>${modes}</section>
    <section class="player-panel"><h2>Ostatnie rozgrywki</h2><p>Historia ostatnich ośmiu zakończonych sesji.</p>${recent||'<div class="player-empty">Jeszcze nie ukończono żadnej rozgrywki.</div>'}</section>
  </div>
  ${guest?'':`<section class="player-panel player-settings"><h2>Ustawienia profilu</h2><p>Możesz zmienić nick widoczny w CHRONICE.</p><form id="nickname-form"><label>Twój nick<input type="text" name="nickname" required minlength="2" maxlength="24" value="${clean(name)}"></label><button class="btn btn-outline" type="submit" ${state.authPending?'disabled':''}>Zapisz nick</button></form></section>`}
  `;
}

function setupRun(config){state.run=startRun(config);state.run.startedAtMs=Date.now();state.result=null;state.yearChoices=state.run.type==='year'?yearOptions(currentQuestion(state.run)):[];state.page='game';render();window.scrollTo(0,0);}
function game(){const r=state.run;if(!r)return home();const chapter=getChapter(r.category), info=categoryInfo[r.category], mode=GAME_TYPES[r.type],round=Math.floor(r.cursor/(r.type==='earlier'?2:1))+1,question=currentQuestion(r),last=r.answers.at(-1),inFeedback=r.phase==='feedback';return `<div class="game-page"><div class="game-top"><button class="back-link" data-action="exit-run">← Zakończ rozgrywkę</button><span>${info.label.toUpperCase()} <b>/</b> ${mode.label.toUpperCase()}</span></div><div class="game-meter"><div><small>RUNDA</small><strong>${round}<span> / ${r.rounds}</span></strong></div><div class="meter-track"><i style="width:${Math.min(100,(r.answers.length/r.rounds)*100)}%"></i></div><div class="game-score">${r.correct} <small>TRAFIEŃ</small></div></div><div class="game-layout"><section class="question-panel ${inFeedback?'in-feedback':''}"><div class="question-eyebrow"><span>${info.icon}</span> ${clean(info.label)} <b>✦</b> ${clean(mode.label)}</div>${r.type==='timeline'?`<div class="question-sub">GDZIE UMIEŚCISZ TĘ KARTĘ?</div><div class="question-mark">?</div><h1>${clean(question.title)}</h1><p>${clean(question.desc)}</p>`:r.type==='year'?`<div class="question-sub">ZGADNIJ ROK TEGO WYDARZENIA</div><div class="question-mark year">????</div><h1>${clean(question.title)}</h1><p>${clean(question.desc)}</p>`:`<div class="question-sub">CO WYDARZYŁO SIĘ WCZEŚNIEJ?</div><div class="question-mark">⇄</div><h1>Dwie daty. Jedna decyzja.</h1><p>Wybierz wydarzenie, które miało miejsce jako pierwsze.</p>`}<span class="card-deco">CHRONIKA / ARCHIWUM ${round.toString().padStart(2,'0')}</span></section><div class="answer-panel">${r.type==='timeline'?timelineAnswers(r,inFeedback):r.type==='year'?yearAnswers(r,inFeedback):earlierAnswers(r,inFeedback)}${inFeedback?`<div class="feedback ${last.correct?'good':'bad'}"><strong>${last.correct?'✓ Świetne wyczucie czasu!':'✕ Nie tym razem'}</strong><span>${clean(last.explanation)}</span></div><button class="btn btn-primary next-btn" data-action="continue">${round>=r.rounds?'Zobacz wynik':'Następne wydarzenie'} ↗</button>`:''}</div></div></div>`;}
function timelineAnswers(r,feedback){const makeGap=i=>`<button class="gap-slot" data-action="answer" data-index="${i}" ${feedback?'disabled':''}><span>${feedback?'·':'＋'}</span> ${feedback?'':'UMIEŚĆ TUTAJ'}</button>`;return `<div class="answer-head"><span>TWOJA OŚ CZASU</span><small>${r.anchors.length} KARTY</small></div><div class="timeline-board">${r.anchors.map((item,i)=>`${makeGap(i)}<div class="timeline-item"><div class="timeline-year">${item.year}</div><div class="timeline-text"><strong>${clean(item.title)}</strong><small>${clean(item.desc)}</small></div><span>✓</span></div>`).join('')}${makeGap(r.anchors.length)}</div>`;}
function yearAnswers(r,feedback){const current=r.questions[r.cursor];return `<div class="answer-head"><span>WYBIERZ JEDNĄ ODPOWIEDŹ</span><small>4 MOŻLIWOŚCI</small></div><div class="year-grid">${state.yearChoices.map((year,i)=>`<button class="year-answer ${feedback?(year===current.year?'correct':Number(r.selected)===year?'wrong':''):''}" data-action="answer" data-index="${year}" ${feedback?'disabled':''}><small>0${i+1}</small><strong>${year}</strong><span>↗</span></button>`).join('')}</div>`;}
function earlierAnswers(r,feedback){const pair=currentQuestion(r),correctIndex=pair[0].year<=pair[1].year?0:1;return `<div class="answer-head"><span>WYBIERZ WCZEŚNIEJSZE</span><small>2 WYDARZENIA</small></div><div class="pair-grid">${pair.map((item,i)=>`<button class="pair-card ${feedback?(correctIndex===i?'correct':Number(r.selected)===i?'wrong':''):''}" data-action="answer" data-index="${i}" ${feedback?'disabled':''}><span>KARTA 0${i+1}</span><div class="pair-icon">${categoryInfo[item.category].icon}</div><strong>${clean(item.title)}</strong><small>${clean(item.desc)}</small>${feedback?`<b class="revealed-year">${item.year}</b>`:'<b class="pick-cta">WYBIERZ ↗</b>'}</button>`).join('')}</div>`;}
async function finishRun(){const r=state.run,stars= r.stageId?awardStageProgress(state.progress,r.stageId,r.correct,r.rounds):null;
 if(stars){state.progress=stars.next;saveLocalProgress(state.progress,who());if(state.firebase&&who()){const uid=who(),snapshot=state.progress;state.firebase.saveProgress(uid,snapshot).catch(()=>notice('Postęp zapisano lokalnie. Zapis Firebase się nie powiódł.'));}}
 if(who()){
   const uid=who();
   const details={category:r.category,type:r.type,rounds:r.rounds,correct:r.correct,stageId:r.stageId||'',durationSeconds:Math.round((Date.now()-(r.startedAtMs||Date.now()))/1000)};
   state.stats=applyRunStats(state.stats,details);
   saveLocalStats(state.stats,uid);
   if(state.firebase){state.firebase.recordRun(uid,details).then(fresh=>{
     if(who()===uid){state.stats=normaliseStats(fresh);saveLocalStats(state.stats,uid);if(state.page==='profile')render();}
   }).catch(()=>notice('Statystyki zapisano lokalnie; synchronizacja Firebase nie powiodła się.'));}
 }
 state.result={...r,earnedStars:stars?.stars||0,gainedStars:stars?.gained||0};state.run=null;state.page='result';render();window.scrollTo(0,0);
}
function result(){const r=state.result;if(!r)return home();const ratio=Math.round(r.correct/r.rounds*100);return `<div class="result-page"><span class="result-orbit">✧</span><div class="kicker">SESJA ZAKOŃCZONA</div><h1>${ratio>=80?'Mistrz chronologii.':ratio>=50?'Coraz bliżej prawdy.':'Każda epoka uczy.'}</h1><p>Dobry refleks jest ważny, ale prawdziwym atutem jest wiedza. Przed Tobą kolejne rozdziały.</p>${r.stageId?`<div class="result-stars">${stars(r.earnedStars)}</div>`:''}<div class="result-stat-grid"><div><small>POPRAWNE ODPOWIEDZI</small><strong>${r.correct} <span>/ ${r.rounds}</span></strong></div><div><small>SKUTECZNOŚĆ</small><strong>${ratio}%</strong></div><div><small>NOWE XP</small><strong>+${r.gainedStars*20}</strong></div></div>${r.stageId&&r.earnedStars===0?'<p class="result-tip">Aby odblokować kolejny etap, zdobądź przynajmniej jedną gwiazdkę (minimum 35% poprawnych odpowiedzi).</p>':''}<div class="result-actions"><button class="btn btn-primary" data-action="replay">Spróbuj ponownie ↗</button><button class="btn btn-outline" data-action="navigate" data-target="${r.stageId?'campaign':'quick'}">${r.stageId?'Mapa kampanii':'Szybka gra'}</button></div></div>`;}
function render(){const view=state.page==='home'?home():state.page==='campaign'?campaign():state.page==='quick'?quick():state.page==='arena'?arena():state.page==='game'?game():state.page==='auth'?authPage():state.page==='profile'?profilePage():result();app.innerHTML=renderShell(view);}
app.addEventListener('click',async event=>{
 const el=event.target.closest('[data-action]');if(!el||el.disabled)return;
 const action=el.dataset.action;
 if(action==='auth-open'){state.authMode=el.dataset.mode||'login';state.authError='';state.page='auth';render();return;}
 if(action==='auth-mode'){state.authMode=el.dataset.mode||'login';state.authError='';render();return;}
 if(action==='guest'){state.page='home';state.authError='';render();return;}
 if(action==='logout'){
   if(!state.firebase||state.authPending)return;
   state.authPending=true;render();
   try{await state.firebase.logout();state.page='auth';state.authMode='login';state.authError='';}
   catch(error){notice(friendlyAuthError(error));}
   finally{state.authPending=false;render();}
   return;
 }
 if(action==='navigate'){state.page=el.dataset.target;state.toast=null;render();window.scrollTo(0,0);return;}
 if(action==='chapter'){state.page='campaign';render();setTimeout(()=>document.querySelectorAll('.chapter')[CHAPTERS.findIndex(c=>c.id===el.dataset.chapter)]?.scrollIntoView({block:'start',behavior:'smooth'}),50);return;}
 if(action==='category'){state.category=el.dataset.category;render();return;}
 if(action==='type'){state.type=el.dataset.type;render();return;}
 if(action==='stage'){const stage=getStage(el.dataset.stage);if(!stage||!isStageUnlocked(stage.id,state.progress))return;const ch=CHAPTERS.find(c=>c.stages.some(s=>s.id===stage.id));setupRun({...stage,category:ch.category,stageId:stage.id});return;}
 if(action==='start-quick'){setupRun({category:state.category,type:state.type,rounds:6});return;}
 if(action==='exit-run'){const wasCampaign=!!state.run?.stageId;state.run=null;state.page=wasCampaign?'campaign':'quick';render();return;}
 if(action==='answer'&&state.run?.phase==='question'){state.run=applyAnswer(state.run,Number(el.dataset.index));render();return;}
 if(action==='continue'&&state.run?.phase==='feedback'){state.run=advanceRun(state.run);if(state.run.phase==='complete')await finishRun();else{state.yearChoices=state.run.type==='year'?yearOptions(currentQuestion(state.run)):[];render();}return;}
 if(action==='replay'&&state.result){const old=state.result;setupRun({category:old.category,type:old.type,rounds:old.rounds,stageId:old.stageId});}
});
document.addEventListener('keydown',e=>{
 if(state.page!=='game'||state.run?.phase!=='question')return;
 if(/^[1-9]$/.test(e.key)){
   const choices=[...document.querySelectorAll('[data-action="answer"]')];
   const choice=choices[Number(e.key)-1];if(choice&&!choice.disabled)choice.click();
 }
});
// Use separate local caches per Firebase UID, never mixing two accounts.
async function onSession(session) {
  const token=++state.loadingSession, previousUid=who(),nextUid=session?.uid||null;
  if(previousUid!==nextUid) {
    state.progress=readLocalProgress(nextUid);
    state.stats=readLocalStats(nextUid);
    state.run=null;state.result=null;
    if(isMember()||state.page==='game'||state.page==='result')state.page='home';
  }
  state.session=session;
  state.profile=null;
  state.cloudState='connecting';
  if(isMember()&&state.page==='auth')state.page='home';
  render();
  if(!session||!state.firebase){state.cloudState='local';render();return;}
  try{
    const [remoteProgress,remoteStats,profile]=await Promise.all([
      state.firebase.loadProgress(nextUid),state.firebase.loadStats(nextUid),
      session.anonymous?Promise.resolve(null):state.firebase.loadProfile(nextUid),
    ]);
    if(token!==state.loadingSession||who()!==nextUid)return;
    const merged=mergeProgress(state.progress,remoteProgress);
    state.progress=merged;
    saveLocalProgress(merged,nextUid);
    state.stats=remoteStats.totalRuns?remoteStats:readLocalStats(nextUid);
    saveLocalStats(state.stats,nextUid);
    state.profile=profile||(!session.anonymous?{displayName:session.name||'Odkrywca'}:null);
    state.cloudState='connected';
    // Save missing or locally-advanced campaign data after a reconnect.
    const localStages=JSON.stringify(merged.stages);
    const remoteStages=JSON.stringify(remoteProgress?.stages||{});
    if(localStages!==remoteStages) {
      await state.firebase.saveProgress(nextUid,merged);
      if(token!==state.loadingSession||who()!==nextUid)return;
    }
  }catch(error){
    if(token!==state.loadingSession||who()!==nextUid)return;
    state.cloudState='unavailable';
    console.warn('CHRONIKA: Firebase data synchronization unavailable:',error);
  }
  render();
}

app.addEventListener('submit',async event=>{
  if(!['auth-form','nickname-form'].includes(event.target.id))return;
  event.preventDefault();
  if(state.authPending||!state.firebase)return;
  const values=new FormData(event.target);
  state.authPending=true;state.authError='';render();
  try{
    if(event.target.id==='nickname-form'){
      const name=await state.firebase.rename(values.get('nickname'));
      state.session={...state.session,name};
      state.profile={...state.profile,displayName:name};
      notice('Nick został zaktualizowany.');
    }else{
      const email=String(values.get('email')||'').trim();
      const password=String(values.get('password')||'');
      if(state.authMode==='reset'){
        await state.firebase.resetPassword(email);
        state.authMode='login';notice('Jeśli konto istnieje, wysłaliśmy wiadomość do resetowania hasła.');
      }else if(state.authMode==='register'){
        await state.firebase.register(email,password,values.get('nickname'));
        await onSession(state.firebase.currentSession());
        state.page='profile';notice('Konto utworzone! Zachowaliśmy Twój dotychczasowy postęp.');
      }else{
        await state.firebase.login(email,password);
        await onSession(state.firebase.currentSession());
        state.page='profile';notice('Witaj ponownie! Postęp jest przypisany do Twojego konta.');
      }
    }
  }catch(error){state.authError=friendlyAuthError(error);if(event.target.id==='nickname-form')notice(state.authError);}
  finally{state.authPending=false;render();}
});

render();
connectFirebase().then(firebase=>{
  state.firebase=firebase;
  state.stopAuthWatch=firebase.observe(session=>{onSession(session).catch(error=>{
    console.warn('CHRONIKA session error:',error);
    state.cloudState='unavailable';render();
  });});
}).catch(error=>{
  state.cloudState='unavailable';state.authError=friendlyAuthError(error);
  console.warn('CHRONIKA Firebase unavailable:',error);render();
});
