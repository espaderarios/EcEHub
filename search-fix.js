/* EcE Hub — reliable Home live-search fix */
(() => {
  'use strict';

  const API = 'https://ecehub-community.ecehub-ai-backend.workers.dev';
  const LIBRARY_URL = new URL('library.json', document.baseURI).href;
  const state = {
    q: '',
    timer: 0,
    request: 0,
    community: null,
    libraryBooks: [],
    libraryLoaded: false,
    libraryLoading: false
  };

  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const s = v => String(v ?? '').trim();
  const n = v => s(v).toLocaleLowerCase();

  function els() {
    return {
      input: document.getElementById('globalSearch'),
      panel: document.getElementById('searchResults'),
      content: document.getElementById('content'),
      clear: document.querySelector('[data-search-clear-page]')
    };
  }

  function home() {
    return !!document.querySelector('.nav-item[data-route="home"].active');
  }

  function normalizeBook(book) {
    const folder = s(book?.folder);
    const title = s(book?.title);
    const author = s(book?.author);
    const driveUrl = s(book?.driveUrl);
    const yearLevel = Array.isArray(book?.yearLevel)
      ? book.yearLevel.map(s).filter(Boolean)
      : [];

    return {
      ...book,
      title,
      folder,
      author,
      driveUrl,
      course: s(book?.course) || folder,
      subject: s(book?.subject) || folder,
      description: s(book?.description) || folder,
      yearLevel,
      _librarySource: true
    };
  }

  function mergeBooks(existing, libraryBooks) {
    const merged = [];
    const seen = new Set();

    for (const raw of [...(existing || []), ...(libraryBooks || [])]) {
      const book = normalizeBook(raw);
      if (!book.title && !book.driveUrl) continue;

      const key = book.driveUrl
        || `${n(book.title)}::${n(book.folder)}::${n(book.author)}`;

      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(book);
    }

    return merged;
  }

  async function loadLibraryBooks() {
    if (state.libraryLoaded) return state.libraryBooks;
    if (state.libraryLoading) {
      while (state.libraryLoading) {
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      return state.libraryBooks;
    }

    state.libraryLoading = true;

    try {
      const response = await fetch(LIBRARY_URL, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`library.json returned HTTP ${response.status}`);
      }

      const payload = await response.json();
      const books = Array.isArray(payload)
        ? payload.map(normalizeBook)
        : [];

      state.libraryBooks = books;
      state.libraryLoaded = true;

      console.log(
        'EcE Hub Home search: library index loaded',
        books.length,
        'books'
      );

      return state.libraryBooks;
    } catch (error) {
      console.error(
        'EcE Hub Home search: failed to load library.json:',
        error
      );
      state.libraryBooks = [];
      return state.libraryBooks;
    } finally {
      state.libraryLoading = false;
    }
  }

  function dataSets() {
    const d = globalThis.data || {};

    return {
      books: mergeBooks(
        Array.isArray(d.books) ? d.books : [],
        state.libraryBooks
      ),
      sets: Array.isArray(d.sets) ? d.sets : [],
      notes: Array.isArray(d.notes) ? d.notes : [],
      quizzes: Array.isArray(d.quizzes) ? d.quizzes : [],
      builtin: Array.isArray(globalThis.BUILTIN_FLASHCARDS)
        ? globalThis.BUILTIN_FLASHCARDS
        : []
    };
  }

  function score(x, q) {
    const title=n(x.title), subject=n(x.subject||x.course), desc=n(x.description||x.content||x.text), user=n(x.username||x.authorUsername||x.author_username), name=n(x.displayName||x.authorName), author=n(x.author);
    let v=0;
    if(title===q)v+=1000; else if(title.startsWith(q))v+=700; else if(title.includes(q))v+=450;
    if(subject===q)v+=350; else if(subject.startsWith(q))v+=220; else if(subject.includes(q))v+=150;
    if(author===q)v+=500; else if(author.startsWith(q))v+=300; else if(author.includes(q))v+=180;
    if(user===q)v+=900; else if(user.startsWith(q))v+=600; else if(user.includes(q))v+=300;
    if(name===q)v+=850; else if(name.startsWith(q))v+=550; else if(name.includes(q))v+=300;
    if(desc.includes(q))v+=80;
    return v;
  }

  function local(q) {
    const d=dataSets();
    const match=(x,fields)=>fields.some(v=>n(v).includes(q));
    const sort=a=>a.map(x=>({...x,_score:score(x,q)})).sort((a,b)=>b._score-a._score).slice(0,24);

    return {
      books:sort(d.books.filter(x=>match(x,[
        x.title,
        x.folder,
        x.course,
        x.subject,
        x.author,
        x.description,
        Array.isArray(x.yearLevel) ? x.yearLevel.join(' ') : x.yearLevel
      ]))),
      workspace:sort(d.sets.filter(x=>match(x,[x.title,x.subject,x.description]))),
      builtin:sort(d.builtin.filter(x=>match(x,[x.title,x.subject,x.description]))),
      notes:sort(d.notes.filter(x=>match(x,[x.title,x.subject,x.content,x.text,x.body]))),
      quizzes:sort(d.quizzes.filter(x=>match(x,[x.title,x.subject,x.description])))
    };
  }

  async function community() {
    if(Array.isArray(state.community)) return state.community;
    try {
      if(typeof globalThis.loadCommunityFlashcards==='function') {
        const x=await globalThis.loadCommunityFlashcards();
        state.community=Array.isArray(x)?x:[];
        return state.community;
      }
      let token='';
      try { token=localStorage.getItem('ecehub_community_session')||localStorage.getItem('ecehub_session_token')||''; } catch {}
      const r=await fetch(`${API}/api/flashcards?limit=100`,{credentials:'include',headers:token?{Authorization:`Bearer ${token}`}:{}});
      const j=await r.json();
      state.community=Array.isArray(j?.sets)?j.sets:Array.isArray(j?.flashcards)?j.flashcards:Array.isArray(j?.data)?j.data:[];
    } catch(e) {
      console.warn('Search community index unavailable:',e);
      state.community=[];
    }
    return state.community;
  }

  function mergeCommunity(q,sets) {
    const cards=sets.filter(x=>[x.title,x.subject,x.description,x.authorUsername,x.author_username,x.username,x.authorName].some(v=>n(v).includes(q))).map(x=>({...x,_score:score(x,q)})).sort((a,b)=>b._score-a._score).slice(0,24);
    const users=[],seen=new Set();
    for(const x of cards){
      const username=s(x.authorUsername||x.author_username||x.username), displayName=s(x.authorName||x.authorDisplayName||username), key=n(username||displayName);
      if(!key||seen.has(key)||!n(`${username} ${displayName}`).includes(q))continue;
      seen.add(key); users.push({id:x.authorId||x.author_id||`author:${username}`,username,displayName,avatarUrl:x.authorAvatarUrl||x.author_avatar_url||'',bio:'',_score:score({username,displayName},q)});
    }
    return {communityFlashcards:cards,users:users.sort((a,b)=>b._score-a._score).slice(0,12)};
  }

  const order=[['communityFlashcards','Community Flashcards'],['books','Books / PDFs'],['workspace','My Flashcards'],['builtin','Built-in Flashcards'],['users','People'],['notes','Notes'],['quizzes','Quizzes']];
  const ico={communityFlashcards:'▧',books:'▤',workspace:'▧',builtin:'▤⃞',users:'◉',notes:'☑',quizzes:'◈'};

  function action(type,x){
    const id=esc(x.id||'');
    if(type==='books'&&x.driveUrl)return `data-search-open-book="${esc(x.driveUrl)}"`;
    if(type==='communityFlashcards')return `data-action="view-community-set" data-id="${id}"`;
    if(type==='workspace')return `data-route="flashcards" data-search-id="${id}"`;
    if(type==='builtin')return `data-route="builtin-flashcards" data-search-id="${id}"`;
    if(type==='notes')return `data-route="notes" data-search-id="${id}"`;
    if(type==='quizzes')return `data-route="quizzes" data-search-id="${id}"`;
    return '';
  }

  function title(type,x){return type==='users'?(x.displayName||x.username||'Community member'):(x.title||'Untitled');}
  function meta(type,x){
    if(type==='users')return x.username?`@${x.username}`:'Community member';
    if(type==='books')return x.author ? `${x.course||x.subject||'PDF'} · ${x.author}` : (x.course||x.subject||'PDF');
    if(['communityFlashcards','workspace','builtin'].includes(type)){const c=Number(x.cardCount||(Array.isArray(x.cards)?x.cards.length:0));return `${x.subject||'General'} · ${c} card${c===1?'':'s'}`;}
    return x.subject|| (type==='notes'?'Note':'Quiz');
  }

  function row(type,x){return `<button type="button" class="global-search-row" ${action(type,x)}><span class="global-search-row-icon ${type}">${type==='users'&&x.avatarUrl?`<img src="${esc(x.avatarUrl)}" alt="">`:ico[type]}</span><span class="global-search-row-copy"><strong>${esc(title(type,x))}</strong><small>${esc(meta(type,x))}</small></span><span class="global-search-row-type">${esc(order.find(o=>o[0]===type)?.[1]||'Result')}</span></button>`;}

  function card(type,x){
    const d=s(type==='books' ? (x.author||x.folder||x.description) : (x.description||x.bio||x.content||x.text||x.body));
    return `<article class="global-search-card card"><button type="button" class="global-search-card-hit" ${action(type,x)}><div class="global-search-card-top"><span class="global-search-card-icon ${type}">${type==='users'&&x.avatarUrl?`<img src="${esc(x.avatarUrl)}" alt="">`:ico[type]}</span><span class="global-search-card-kind">${esc(order.find(o=>o[0]===type)?.[1]||'Result')}</span></div><h3>${esc(title(type,x))}</h3><div class="global-search-card-meta">${esc(meta(type,x))}</div>${d?`<p>${esc(d.slice(0,180))}${d.length>180?'…':''}</p>`:''}</button>${type==='communityFlashcards'?`<div class="global-search-card-actions"><button type="button" class="btn primary" data-action="study-community-set" data-id="${esc(x.id||'')}">Study</button><button type="button" class="btn" data-action="add-community-set" data-id="${esc(x.id||'')}">+ Workspace</button></div>`:''}</article>`;
  }

  function render(els,q,results,loading){
    if(!q||!home())return;
    const groups=order.map(([type])=>[type,results[type]||[]]).filter(([,xs])=>xs.length);
    const count=groups.reduce((n,[,xs])=>n+xs.length,0);
    els.panel.innerHTML=groups.length?`<div class="global-search-dropdown-head"><span>Results for “${esc(q)}”</span><span>Live</span></div>${groups.slice(0,5).map(([t,xs])=>`<div class="global-search-group"><div class="global-search-group-title">${esc(order.find(o=>o[0]===t)[1])}</div>${xs.slice(0,4).map(x=>row(t,x)).join('')}</div>`).join('')}`:`<div class="global-search-status">${loading?'Searching EcE Hub…':`No results for <strong>${esc(q)}</strong>`}</div>`;
    els.panel.hidden=false;
    els.content.innerHTML=`<div class="global-search-page"><div class="global-search-page-header"><div><div class="global-search-eyebrow">EcE HUB SEARCH</div><h1>Search results</h1><p>${loading?'Searching…':`${count} result${count===1?'':'s'} for`} <strong>“${esc(q)}”</strong></p></div></div><div class="global-search-filters" role="tablist"><button type="button" class="active" data-search-filter="all">All</button><button type="button" data-search-filter="books">Books</button><button type="button" data-search-filter="flashcards">Flashcards</button><button type="button" data-search-filter="users">People</button><button type="button" data-search-filter="notes">Notes</button><button type="button" data-search-filter="quizzes">Quizzes</button></div>${groups.map(([t,xs])=>`<section class="global-search-section" data-search-section="${t}"><div class="global-search-section-head"><div><span class="global-search-section-icon">${ico[t]}</span><h2>${esc(order.find(o=>o[0]===t)[1])}</h2></div><span>${xs.length}</span></div><div class="global-search-results-grid">${xs.slice(0,12).map(x=>card(t,x)).join('')}</div></section>`).join('')}${!groups.length&&!loading?'<div class="global-search-empty card"><div class="global-search-empty-icon">⌕</div><h2>No results found</h2><p>Try another title, subject, username, or keyword.</p></div>':''}</div>`;
  }

  function clear(els){
    state.q='';
    state.request++;
    if (els.input) els.input.value = '';
    const pageClear = els.clear || document.querySelector('[data-search-clear-page]');
    if (pageClear) pageClear.hidden = true;
    if (els.panel) {
      els.panel.hidden = true;
      els.panel.innerHTML = '';
    }
    if (home() && typeof globalThis.render === 'function') globalThis.render();
  }

  async function search(els,value){
    const q=n(value), id=++state.request; state.q=q;
    if(!q){clear(els);return;}
    const pageClear = els.clear || document.querySelector('[data-search-clear-page]');
    if (pageClear) pageClear.hidden = false;

    /* The public Library catalog is an independent search source.
       Do not depend on app.js's internal data.books timing or scope. */
    await loadLibraryBooks();
    if(id!==state.request||state.q!==q)return;

    const localResults=local(q);
    render(els,q,localResults,true);

    const sets=await community();
    if(id!==state.request||state.q!==q)return;
    render(els,q,{...localResults,...mergeCommunity(q,sets)},false);
  }

  function install(){
    const e=els();
    if(!e.input||!e.panel||!e.content){setTimeout(install,100);return;}
    if(e.input.dataset.searchFixInstalled==='1')return;
    e.input.dataset.searchFixInstalled='1';
    e.input.addEventListener('input',()=>{clearTimeout(state.timer);state.timer=setTimeout(()=>search(e,e.input.value),25);});
    e.clear.addEventListener('click',()=>clear(e));
    document.addEventListener('click',ev=>{
      if(ev.target.closest('[data-search-clear-page]')){ev.preventDefault();clear(e);return;}
      const f=ev.target.closest('[data-search-filter]');
      if(f){document.querySelectorAll('[data-search-filter]').forEach(b=>b.classList.remove('active'));f.classList.add('active');const wanted=f.dataset.searchFilter;document.querySelectorAll('[data-search-section]').forEach(s=>{const t=s.dataset.searchSection;s.hidden=!(wanted==='all'||(wanted==='books'&&t==='books')||(wanted==='flashcards'&&['communityFlashcards','workspace','builtin'].includes(t))||(wanted==='users'&&t==='users')||(wanted==='notes'&&t==='notes')||(wanted==='quizzes'&&t==='quizzes'));});}
      if(!ev.target.closest('#searchWrap'))e.panel.hidden=true;
    });
    console.log('EcE Hub Home live-search fix installed.');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();