const KEY = 'eceHubDataV3';
const THEME_KEY = 'eceHubTheme';

const seed = {
  profile: { name: 'Student', course: 'EcE Learner' },
  classes: [
    { id: 'c1', name: 'Circuits 101', category: 'Engineering', sets: 24, cards: 156, progress: 75 },
    { id: 'c2', name: 'Electronics', category: 'Engineering', sets: 18, cards: 98, progress: 60 },
    { id: 'c3', name: 'Digital Systems', category: 'Engineering', sets: 20, cards: 120, progress: 80 },
    { id: 'c4', name: 'Control Systems', category: 'Engineering', sets: 15, cards: 75, progress: 45 }
  ],
  folders: [],
  books: [],
  sets: [
    { id: 's1', title: "Ohm's Law", subject: 'Circuits 101', cards: [['What is Ohm’s Law?', 'V = IR'], ['Unit of resistance?', 'Ohm (Ω)'], ['If R increases at constant V?', 'Current decreases.']] },
    { id: 's2', title: 'Logic Gates', subject: 'Digital Systems', cards: [['AND gate output?', '1 only when all inputs are 1.'], ['OR gate output?', '1 when at least one input is 1.'], ['NOT gate?', 'Inverts the input.']] },
    { id: 's3', title: 'Transistors', subject: 'Electronics', cards: [['What are BJT terminals?', 'Base, collector, emitter.'], ['What controls a BJT?', 'Base current.']] }
  ],
  notes: [
    { id: 'n1', title: "Kirchhoff's Laws", subject: 'Circuits 101', body: 'KCL: the algebraic sum of currents entering a node is zero. KVL: the algebraic sum of voltages around a closed loop is zero.', updated: 'Today' },
    { id: 'n2', title: 'Binary Number System', subject: 'Digital Systems', body: 'Review binary-to-decimal conversion, complements, Boolean algebra, and basic logic identities.', updated: 'Yesterday' }
  ],
  quizzes: [
    {
      id: 'q1', title: 'Circuits Basics', subject: 'Circuits 101', questions: [
        { q: 'Which law relates voltage, current and resistance?', options: ['Newton’s Law', 'Ohm’s Law', 'Faraday’s Law', 'Coulomb’s Law'], answer: 1 },
        { q: 'What is the SI unit of resistance?', options: ['Volt', 'Ampere', 'Ohm', 'Watt'], answer: 2 },
        { q: 'In a series circuit, current is…', options: ['the same through each element', 'always zero', 'different everywhere', 'undefined'], answer: 0 }
      ]
    },
    {
      id: 'q2', title: 'Logic Gates', subject: 'Digital Systems', questions: [
        { q: 'Which gate inverts an input?', options: ['AND', 'OR', 'NOT', 'XOR'], answer: 2 },
        { q: 'An AND gate outputs 1 when…', options: ['any input is 1', 'all inputs are 1', 'all inputs are 0', 'inputs differ'], answer: 1 }
      ]
    }
  ],
  activity: [
    { text: 'Completed quiz: Circuits Basics', sub: 'Score: 85%', time: '2h ago' },
    { text: "Studied: Ohm's Law Set", sub: '12 new cards reviewed', time: '5h ago' },
    { text: 'Downloaded: Transistor.pdf', sub: 'Electronics • 2.4 MB', time: '1d ago' },
    { text: 'Created new set: Logic Gates', sub: 'Digital Systems', time: '2d ago' }
  ]
};

let sourceBooks = [];
let libraryFolderId = null;
let data = load();
let route = 'home';
let activeClassId = null;
let activeSetId = null;
let timer = null;
let timerSeconds = 25 * 60;

/* ---------- persistence & helpers ---------- */
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw) return structuredClone(seed);
    // Normalize quizzes so missing/empty questions never crash study mode
    if (Array.isArray(raw.quizzes)) {
      raw.quizzes = raw.quizzes.map(q => ({
        ...q,
        questions: Array.isArray(q.questions)
          ? q.questions.filter(item => item && typeof item.q === 'string' && Array.isArray(item.options))
          : []
      }));
    }
    if (Array.isArray(raw.sets)) {
      raw.sets = raw.sets.map(s => ({
        ...s,
        cards: Array.isArray(s.cards) ? s.cards.filter(c => Array.isArray(c) && c.length >= 2) : []
      }));
    }
    return raw;
  } catch {
    return structuredClone(seed);
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
}
function clone(x) {
  return JSON.parse(JSON.stringify(x));
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])
  );
}
function toast(s) {
  const e = document.querySelector('#toast');
  e.textContent = s;
  e.classList.add('show');
  clearTimeout(window._t);
  window._t = setTimeout(() => e.classList.remove('show'), 1800);
}
function pageTitle(title, sub, button = '') {
  return `<div class="page-title"><div><h1>${title}</h1><p>${sub}</p></div>${button ? `<div class="actions">${button}</div>` : ''}</div>`;
}
function cardIcon(cls, char) {
  return `<span class="round ${cls}">${char}</span>`;
}
function openModal(html, { wide = false } = {}) {
  const modal = document.querySelector('#modal');
  modal.innerHTML = html;
  modal.classList.toggle('wide', !!wide);
  document.querySelector('#modalBackdrop').classList.add('open');
}
function closeModal() {
  document.querySelector('#modalBackdrop').classList.remove('open');
  document.querySelector('#modal').classList.remove('wide');
}
document.querySelector('#modalBackdrop').addEventListener('click', e => {
  if (e.target.id === 'modalBackdrop') closeModal();
});

/* ---------- theme ---------- */
function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  const btn = document.querySelector('#themeButton');
  if (btn) btn.textContent = dark ? '☀' : '☾';
}
function toggleTheme() {
  applyTheme(!document.body.classList.contains('dark'));
}
(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark') applyTheme(true);
})();

/* ---------- header / guest card sync ---------- */
function updateChrome() {
  const name = data.profile.name || 'Student';
  const course = data.profile.course || 'EcE Learner';
  const headerName = document.querySelector('#headerName');
  if (headerName) headerName.textContent = name;
  const headerCourse = document.querySelector('.profile span');
  if (headerCourse) headerCourse.textContent = course;
  const avatar = document.querySelector('.avatar');
  if (avatar) {
    avatar.childNodes[0].textContent = name.charAt(0).toUpperCase();
  }
  const guestStrong = document.querySelector('.guest-card strong');
  if (guestStrong) guestStrong.textContent = name;
  const guestIcon = document.querySelector('.guest-icon');
  if (guestIcon) guestIcon.textContent = name.charAt(0).toUpperCase();
}

/* ---------- routing & render ---------- */
function render() {
  document.querySelectorAll('.nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.route === route)
  );
  const c = document.querySelector('#content');
  const views = {
    home: homeView,
    classes: classesView,
    library: libraryView,
    explore: exploreView,
    quizzes: quizzesView,
    tools: toolsView,
    sets: setsView,
    flashcards: flashcardsView,
    notes: notesView,
    profile: profileView,
    settings: settingsView
  };
  c.innerHTML = (views[route] || homeView)();
  updateChrome();
}
function go(r) {
  route = r;
  if (r !== 'classes') {
    activeClassId = null;
    activeSetId = null;
  }
  closeSidebar();
  render();
  window.scrollTo(0, 0);
}

function setsForClass(cls) {
  if (!cls) return [];
  const name = (cls.name || '').toLowerCase();
  return data.sets.filter(s => (s.subject || '').toLowerCase() === name);
}

function classStats(cls) {
  const sets = setsForClass(cls);
  const cards = sets.reduce((n, s) => n + (Array.isArray(s.cards) ? s.cards.length : 0), 0);
  return { sets: sets.length, cards, list: sets };
}

/* ---------- views ---------- */
function homeView() {
  const cards = data.sets.reduce((n, s) => n + s.cards.length, 0);
  const latestSet = data.sets[0];
  return (
    pageTitle(`Good evening, ${esc(data.profile.name)} 👋`, 'Your academic workspace') +
    `<div class="grid stats">
      <div class="card stat">${cardIcon('purple', '▣')}<div><strong>${data.classes.length}</strong><span>Subjects</span><small>Active subjects</small></div></div>
      <div class="card stat">${cardIcon('green', '▰')}<div><strong>${data.sets.length}</strong><span>Study Sets</span><small>Your flashcard sets</small></div></div>
      <div class="card stat">${cardIcon('blue', '▤')}<div><strong>${cards}</strong><span>Flashcards</span><small>Total cards</small></div></div>
      <div class="card stat">${cardIcon('orange', '♛')}<div><strong>${data.quizzes.length}</strong><span>Quizzes</span><small>Available now</small></div></div>
    </div>
    <div class="grid home-grid">
      <div>
        <div class="card continue" style="cursor:pointer" data-action="continue-study">
          ${cardIcon('purple', '▧')}
          <div>
            <h2>Continue studying</h2>
            <p>${latestSet ? `Resume “${esc(latestSet.title)}”` : 'Pick up where you left off with your latest study set.'}</p>
          </div>
          <div class="continue-art">📚</div>
        </div>
        <div class="section">
          <div class="section-head"><h2>My Classes</h2><button class="btn" data-action="classes">View all</button></div>
          <div class="grid class-grid">${data.classes.map(classCard).join('')}</div>
        </div>
      </div>
      <div class="side-stack">

        <div class="card">
          <div class="section-head">
            <h2>Recent Activity</h2>
          </div>

          ${data.activity.map(a =>
            `<div class="activity-item">
              <div class="activity-icon" style="background: var(--card)">
                ✓
              </div>

              <div>
                <strong>${esc(a.text)}</strong>
                <span>${esc(a.sub)}</span>
              </div>

              <time>${esc(a.time)}</time>
            </div>`
          ).join('')}
        </div>

        ${renderStudyGoal()}

      </div>
    </div>`
  );
}

function classCard(c) {
  return `<div class="card class-card">
    ${cardIcon(c.progress > 70 ? 'green' : c.progress > 50 ? 'orange' : 'purple', '⌘')}
    <h3>${esc(c.name)}</h3>
    <p>${esc(c.category)}</p>
    <span class="meta">${c.sets} sets • ${c.cards} cards</span>
    <div class="progress"><i style="width:${c.progress}%"></i></div>
    <span class="progress-label">${c.progress}%</span>
  </div>`;
}

function classesView() {
  // Drill-down: set cards list
  if (activeSetId) {
    const set = data.sets.find(x => x.id === activeSetId);
    const cls = data.classes.find(x => x.id === activeClassId);
    if (!set) {
      activeSetId = null;
      return classesView();
    }
    const cards = Array.isArray(set.cards) ? set.cards : [];
    const cardsHtml = cards.length
      ? `<div class="cards-list">${cards.map((c, i) =>
          `<div class="card card-item">
            <div class="card-section">
              <span class="card-label">Question</span>
              <p class="card-text">${esc(Array.isArray(c) ? c[0] : c)}</p>
            </div>
            <div class="card-section">
              <span class="card-label">Answer</span>
              <p class="card-text">${esc(Array.isArray(c) ? c[1] : '')}</p>
            </div>
            <span class="card-index">#${i + 1}</span>
          </div>`
        ).join('')}</div>`
      : `<div class="card empty">No cards yet. Edit this set to add question &amp; answer pairs.</div>`;
    return (
      pageTitle(
        esc(set.title),
        `${cards.length} card${cards.length === 1 ? '' : 's'}${cls ? ' · ' + esc(cls.name) : ''}`,
        `<button class="btn" data-action="back-to-class">← Back</button>
         <button class="btn" data-action="edit-set" data-id="${set.id}">Edit</button>
         <button class="btn primary" data-action="study-set" data-id="${set.id}">Study</button>`
      ) +
      `<div class="drill-hero">
        <p style="color:var(--muted);margin:0 0 16px;font-size:13px">Review cards below, or start a study session.</p>
      </div>` +
      cardsHtml
    );
  }

  // Drill-down: sets inside a class
  if (activeClassId) {
    const cls = data.classes.find(x => x.id === activeClassId);
    if (!cls) {
      activeClassId = null;
      return classesView();
    }
    const { list: sets, cards } = classStats(cls);
    const setsHtml = sets.length
      ? `<div class="grid set-grid">${sets.map(s =>
          `<div class="card set-card subject-set-card" data-action="open-set" data-id="${s.id}" style="cursor:pointer">
            <h3>${esc(s.title)}</h3>
            <p>${esc(s.subject)}</p>
            <div class="set-meta">${Array.isArray(s.cards) ? s.cards.length : 0} cards</div>
            <div class="actions set-actions" style="margin-top:16px">
                <button
                    type="button"
                    class="btn primary"
                    data-action="study-set"
                    data-id="${s.id}">
                    Study
                </button>

                <button
                    type="button"
                    class="btn"
                    data-action="open-set"
                    data-id="${s.id}">
                    Cards
                </button>

                <button
                    type="button"
                    class="btn"
                    data-action="edit-set"
                    data-id="${s.id}">
                    Edit
                </button>

                <button
                    type="button"
                    class="btn danger"
                    data-action="delete-set"
                    data-id="${s.id}">
                    Delete
                </button>
            </div>
          </div>`
        ).join('')}</div>`
      : `<div class="card empty">No sets for this subject yet. Create one and set its subject to “${esc(cls.name)}”.</div>`;
    return (
      pageTitle(
        esc(cls.name),
        `${sets.length} set${sets.length === 1 ? '' : 's'} · ${cards} cards`,
        `<button class="btn" data-action="back-to-classes">← Back</button>
         <button class="btn" data-action="edit-class" data-id="${cls.id}">Edit</button>
         <button class="btn primary" data-action="add-set">+ New Set</button>`
      ) +
      `<div class="drill-hero subject-header">
        ${cardIcon(cls.progress > 70 ? 'green' : cls.progress > 50 ? 'orange' : 'purple', '⌘')}
        <div>
          <p style="margin:0;color:var(--muted);font-size:13px">${esc(cls.category || 'Engineering')}</p>
          <div class="progress" style="margin-top:10px;max-width:220px"><i style="width:${cls.progress || 0}%"></i></div>
        </div>
      </div>` +
      setsHtml
    );
  }

  // Root: subject cards
  const grid = data.classes.length
    ? `<div class="grid subject-grid">${data.classes.map(c => {
        const st = classStats(c);
        return `<div class="card subject-card" data-action="open-class" data-id="${c.id}" style="cursor:pointer">
        <button
            type="button"
            class="subject-delete btn danger"
            data-action="delete-class"
            data-id="${c.id}"
            title="Delete subject"
            aria-label="Delete ${esc(c.name)}">
            ×
        </button>

        <div class="subject-icon-wrap">
            ${cardIcon(c.progress > 70 ? 'green' : c.progress > 50 ? 'orange' : 'purple', '⌘')}
        </div>

        <h3>${esc(c.name)}</h3>
        <p>${esc(c.category || 'Engineering')}</p>
        <span class="meta">${st.sets} set${st.sets === 1 ? '' : 's'} · ${st.cards} cards</span>
        <div class="progress">
            <i style="width:${c.progress || 0}%"></i>
        </div>
        <span class="progress-label">${c.progress || 0}%</span>
        </div>`;
      }).join('')}</div>`
    : `<div class="card empty">No subjects yet. Create your first class to get started.</div>`;

  return (
    pageTitle('Classes', 'Pick a subject to browse its study sets and cards.',
      `<button class="btn primary" data-action="add-class">+ New Class</button>`) +
    grid
  );
}
function getDriveFileId(url) {
    if (!url) return null;

    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);

    return match ? match[1] : null;
}


function getDriveThumbnail(driveUrl) {
    const fileId = getDriveFileId(driveUrl);

    if (!fileId) {
        return "";
    }

    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}


function getFolderThumbnail(folderId) {

    const firstBook = data.books.find(
        book => book.folderId === folderId
    );

    if (!firstBook || !firstBook.driveUrl) {
        return "";
    }

    return getDriveThumbnail(firstBook.driveUrl);
}
function renderLibrary(books) {
    const container = document.getElementById('library-container');

    container.innerHTML = '';

    books.forEach(book => {
        const thumbnail = getDriveThumbnail(book.driveUrl);

        const card = document.createElement('div');
        card.className = 'book-card';

        card.innerHTML = `
            <div class="book-cover">
                <img 
                    src="${thumbnail}" 
                    alt="${book.title}"
                    loading="lazy"
                    onerror="this.src='assets/pdf-placeholder.png'"
                >
            </div>

            <div class="book-info">
                <h3>${book.title}</h3>
                <p>${book.folder}</p>
            </div>
        `;

        card.addEventListener('click', () => {
            window.open(book.driveUrl, '_blank');
        });

        container.appendChild(card);
    });
}
async function loadLibraryData() {
  try {
    const response = await fetch('./library.json');

    if (!response.ok) {
      throw new Error(`Failed to load library.json: ${response.status}`);
    }

    sourceBooks = await response.json();

    const library = buildLibraryData(sourceBooks);

    data.folders = library.folders;
    data.books = library.books;

    render();
  } catch (error) {
    console.error('Failed to load library:', error);
  }
}

function buildLibraryData(sourceBooks) {
  const folderMap = new Map();

  const folders = [];
  const books = [];

  sourceBooks.forEach((item, index) => {
    const folderName =
      item.folder?.trim() || 'Uncategorized';

    let folder = folderMap.get(folderName);

    if (!folder) {
      folder = {
        id:
          'folder_' +
          folderName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),

        name: folderName
      };

      folderMap.set(folderName, folder);
      folders.push(folder);
    }

    books.push({
    id: `library_book_${index + 1}`,
    title: item.title || 'Untitled',
    author: item.author || '',
    course: item.course || '',
    folderId: folder.id,
    folder: folderName,
    yearLevel: Array.isArray(item.yearLevel)
        ? item.yearLevel
        : [],
    driveUrl: item.driveUrl || ''
});
  });

  return {
    folders,
    books
  };
}

function libraryView() {
  if (!Array.isArray(data.folders)) {
    data.folders = [];
  }

  if (!Array.isArray(data.books)) {
    data.books = [];
  }

  /* ==============================
     INSIDE A FOLDER
     ============================== */

  if (libraryFolderId) {
    const folder = data.folders.find(
      f => f.id === libraryFolderId
    );

    // Folder no longer exists
    if (!folder) {
      libraryFolderId = null;
      return libraryView();
    }

    const books = data.books.filter(
      b => b.folderId === folder.id
    );

    return (
      pageTitle(
        `📁 ${esc(folder.name)}`,
        `${books.length} ${books.length === 1 ? 'book' : 'books'} in this folder.`,
        `
          <button
            type="button"
            class="btn"
            data-action="back-library">
            ← Library
          </button>

          <button
            type="button"
            class="btn"
            data-action="edit-library-folder"
            data-id="${folder.id}">
            Edit Folder
          </button>

          <button
            type="button"
            class="btn primary"
            data-action="add-book-to-folder"
            data-id="${folder.id}">
            + Add Book
          </button>
        `
      ) +

      `
        <section class="library-folder-content">

          <div class="library-section-heading">
            <div>
              <h2>Books</h2>
              <p>
                Manage the books and PDF links in
                <strong>${esc(folder.name)}</strong>.
              </p>
            </div>
          </div>

          ${
            books.length
              ? `
                <div class="grid library-grid">
                  ${books.map(renderLibraryBook).join('')}
                </div>
              `
              : `
                <div class="card library-empty">

                  <div class="library-empty-icon">📚</div>

                  <strong>This folder is empty</strong>

                  <span>
                    Add a PDF to start building this collection.
                  </span>

                  <button
                    type="button"
                    class="btn primary"
                    data-action="add-book-to-folder"
                    data-id="${folder.id}">
                    + Add Book
                  </button>

                </div>
              `
          }

        </section>
      `
    );
  }

  /* ==============================
     MAIN LIBRARY
     ============================== */

 const folderCards = data.folders.map(folder => {

        const count = data.books.filter(
            b => b.folderId === folder.id
        ).length;

        return `
            <div class="card library-folder-card">

                <div class="library-folder-cover">
                    <img
                        src="${getFolderThumbnail(folder.id)}"
                        alt="${esc(folder.name)}"
                        loading="lazy"
                        onerror="this.onerror=null; this.src='assets/pdf-placeholder.png';"
                    >
                </div>

                <div class="library-folder-info">
                    <h3>${esc(folder.name)}</h3>

                    <p>
                        ${count}
                        ${count === 1 ? 'book' : 'books'}
                    </p>
                </div>

                <button
                    type="button"
                    class="btn library-folder-open"
                    data-action="open-library-folder"
                    data-id="${folder.id}">
                    Open
                </button>

            </div>
        `;

    }).join('');

    return (
        pageTitle(
            'Library',
            'Organize your PDFs and academic references.',
            `
                <button
                    type="button"
                    class="btn"
                    data-action="add-library-folder">
                    + New Folder
                </button>

                <button
                    type="button"
                    class="btn primary"
                    data-action="add-book">
                    + Add PDF
                </button>
            `
        ) +

        `
            <section class="library-folders">

                <div class="library-section-heading">
                    <div>
                        <h2>Folders</h2>
                        <p>
                            Organize your books by subject or category.
                        </p>
                    </div>
                </div>

                ${
                    data.folders.length
                        ? `
                            <div class="library-folder-grid">
                                ${folderCards}
                            </div>
                        `
                        : `
                            <div class="card library-empty">

                                <div class="library-empty-icon">📁</div>

                                <strong>No folders yet</strong>

                                <span>
                                    Create a folder to organize your library.
                                </span>

                            </div>
                        `
                }

            </section>
        `
    );
}

function renderLibraryBook(book) {

    const thumbnail = getDriveThumbnail(book.driveUrl);

    return `
        <div class="card book-card">

            <div class="book-cover">
                <img
                    src="${thumbnail}"
                    alt="${esc(book.title)}"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='assets/pdf-placeholder.png';"
                >
            </div>

            <h3>
                ${esc(book.title)}
            </h3>

            <p>
                ${esc(book.author || 'Unknown author')}
                ${
                    book.course
                        ? ` • ${esc(book.course)}`
                        : ''
                }
            </p>

        <div class="book-actions">

            <button
                type="button"
                class="btn primary"
                data-action="open-book"
                data-id="${book.id}">
                Open
            </button>

            <button
                type="button"
                class="btn"
                data-action="download-book"
                data-id="${book.id}">
                Download
            </button>

            <button
                type="button"
                class="btn"
                data-action="edit-book"
                data-id="${book.id}">
                Edit
            </button>

            <button
                type="button"
                class="btn danger"
                data-action="delete-book"
                data-id="${book.id}">
                Delete
            </button>

        </div>

        </div>
    `;
}
function downloadBook(book) {
    if (!book || !book.driveUrl) {
        console.error('No PDF URL found.');
        return;
    }

    const fileId = getDriveFileId(book.driveUrl);

    if (!fileId) {
        window.open(book.driveUrl, '_blank');
        return;
    }

    const downloadUrl =
        `https://drive.google.com/uc?export=download&id=${fileId}`;

    window.open(downloadUrl, '_blank');
}
function renderFolderBookCard(book) {

    const thumbnail = getDriveThumbnail(book.driveUrl);

    return `
        <div class="card book-card">

            <div class="book-cover">
                <img
                    src="${thumbnail}"
                    alt="${esc(book.title)}"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='assets/pdf-placeholder.png';"
                >
            </div>

            <h3>
                ${esc(book.title)}
            </h3>

            <p class="book-author">
                ${esc(book.author || 'Unknown author')}
            </p>

            ${
                book.course
                    ? `<span class="book-course">${esc(book.course)}</span>`
                    : ''
            }

            <div class="book-actions">

                <button
                    type="button"
                    class="btn primary"
                    data-action="open-book"
                    data-id="${book.id}">
                    Open
                </button>
                <button
                    type="button"
                    class="btn"
                    data-action="download-book"
                    data-id="${book.id}">
                    Download
                </button>
                <button
                    type="button"
                    class="btn"
                    data-action="edit-book"
                    data-id="${book.id}">
                    Edit
                </button>

                <button
                    type="button"
                    class="btn danger"
                    data-action="delete-book"
                    data-id="${book.id}">
                    Delete
                </button>

            </div>

        </div>
    `;
}

function renderBookCard(book) {

    const thumbnail = getDriveThumbnail(book.driveUrl);

    return `
        <div class="card book-card">

            <div class="book-cover">
                <img
                    src="${thumbnail}"
                    alt="${esc(book.title)}"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='assets/pdf-placeholder.png';"
                >
            </div>

            <h3>
                ${esc(book.title)}
            </h3>

            <p>
                ${esc(book.author || '')}
                ${book.author && book.course ? ' • ' : ''}
                ${esc(book.course || '')}
            </p>

            <div class="book-actions">

                <button
                    class="btn primary"
                    data-action="open-book"
                    data-id="${book.id}">
                    Open PDF
                </button>

                <button
                    class="btn danger"
                    data-action="delete-book"
                    data-id="${book.id}">
                    Delete
                </button>

            </div>

        </div>
    `;
}

function openBookForm(book = null, folderId = '') {
  const folders = Array.isArray(data.folders)
    ? data.folders
    : [];

  openModal(`
    <h2>${book ? 'Edit Book' : 'Add PDF'}</h2>

    <div class="form-grid">

      <div class="field">
        <label>Book Title</label>
        <input
          id="f-title"
          value="${esc(book?.title || '')}"
          placeholder="e.g. Engineering Circuit Analysis">
      </div>

      <div class="field">
        <label>Author</label>
        <input
          id="f-author"
          value="${esc(book?.author || '')}"
          placeholder="e.g. Hayt & Kemmerly">
      </div>

      <div class="field">
        <label>Course</label>
        <input
          id="f-course"
          value="${esc(book?.course || '')}"
          placeholder="e.g. Circuits 101">
      </div>

      <div class="field">
        <label>Folder</label>
        <select id="f-folder">
          <option value="">Uncategorized</option>

          ${folders.map(folder => `
            <option
              value="${folder.id}"
              ${
                (book?.folderId || folderId) === folder.id
                  ? 'selected'
                  : ''
              }>
              ${esc(folder.name)}
            </option>
          `).join('')}
        </select>
      </div>

      <div class="field">
        <label>PDF / Google Drive Link</label>
        <input
          id="f-url"
          value="${esc(book?.url || '')}"
          placeholder="Paste the PDF or Google Drive link">
      </div>

    </div>

    <div class="modal-actions">
      <button
        type="button"
        class="btn"
        data-action="close-modal">
        Cancel
      </button>

      <button
        type="button"
        class="btn primary"
        data-action="save-book"
        data-id="${book?.id || ''}">
        ${book ? 'Save Changes' : 'Add Book'}
      </button>
    </div>
  `);
}

function exploreView() {
  return (
    pageTitle('Explore', 'Discover resources across your EcE workspace.') +
    `<div class="card">
      <h2>Explore is ready for your content</h2>
      <p style="color:var(--muted)">This area can become the shared resource/discovery layer later. For now, use Library, Classes, Sets and Quizzes to build your personal workspace.</p>
    </div>`
  );
}

function setsView() {
  return (
    pageTitle('My Sets', 'Create and manage flashcard collections.', `<button class="btn primary" data-action="add-set">+ New Set</button>`) +
    `<div class="grid set-grid">${data.sets.map(s =>
      `<div class="card set-card">
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.subject)}</p>
        <div class="set-meta">${s.cards.length} cards</div>
        <div class="actions" style="margin-top:16px">
          <button class="btn primary" data-action="study-set" data-id="${s.id}">Study</button>
          <button class="btn" data-action="edit-set" data-id="${s.id}">Edit</button>
          <button class="btn danger" data-action="delete-set" data-id="${s.id}">Delete</button>
        </div>
      </div>`
    ).join('')}</div>`
  );
}

function flashcardsView() {
  if (!window.studyState) {
    return (
      pageTitle('Flashcards', 'Choose a study set to begin.') +
      `<div class="grid set-grid">${data.sets.map(s =>
        `<div class="card set-card">
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.subject)}</p>
          <div class="set-meta">${s.cards.length} cards</div>
          <button class="btn primary" style="margin-top:16px" data-action="study-set" data-id="${s.id}">Start studying</button>
        </div>`
      ).join('')}</div>`
    );
  }

  const s = data.sets.find(x => x.id === window.studyState.setId);
  if (!s || !s.cards.length) {
    window.studyState = null;
    return pageTitle('Flashcards', 'Set not found or empty.') +
      `<div class="card empty">This study set no longer exists. Choose another set.</div>`;
  }

  const card = s.cards[window.studyState.index];
  const shown = window.studyState.revealed;
  return `<div class="flash-study">
    ${pageTitle('Flashcards', `${esc(s.title)} • Card ${window.studyState.index + 1} of ${s.cards.length}`,
      `<button class="btn" data-action="stop-study">Exit</button>`)}
    <div class="card flash-card" data-action="flip-card">
      <div>
        <div class="term">${esc(shown ? card[1] : card[0])}</div>
        <div class="hint">${shown ? 'Answer' : 'Click to reveal answer'}</div>
      </div>
    </div>
    <div class="study-controls">
      <button class="btn" data-action="prev-card">← Previous</button>
      <button class="btn primary" data-action="flip-card">${shown ? 'Hide answer' : 'Reveal answer'}</button>
      <button class="btn" data-action="next-card">Next →</button>
    </div>
  </div>`;
}

function notesView() {
  return (
    pageTitle('Notes', 'Keep lecture notes, formulas and review summaries.', `<button class="btn primary" data-action="add-note">+ New Note</button>`) +
    `<div class="grid note-grid">${data.notes.map(n =>
      `<div class="card note-card">
        <h3>${esc(n.title)}</h3>
        <span class="pill">${esc(n.subject)}</span>
        <p>${esc(n.body)}</p>
        <span class="note-date">${esc(n.updated)}</span>
        <div class="actions" style="margin-top:13px">
          <button class="btn" data-action="edit-note" data-id="${n.id}">Edit</button>
          <button class="btn danger" data-action="delete-note" data-id="${n.id}">Delete</button>
        </div>
      </div>`
    ).join('')}</div>`
  );
}

function quizzesView() {
  return (
    pageTitle('Quizzes', 'Test yourself and measure what you know.', `<button class="btn primary" data-action="add-quiz">+ New Quiz</button>`) +
    `<div class="quiz-list">${data.quizzes.map(q =>
      `<div class="card quiz-card">
        <h3>${esc(q.title)}</h3>
        <p>${esc(q.subject)}</p>
        <div class="quiz-meta">${q.questions.length} questions</div>
        <div class="actions">
          <button class="btn primary" data-action="take-quiz" data-id="${q.id}">Take Quiz</button>
          <button class="btn danger" data-action="delete-quiz" data-id="${q.id}">Delete</button>
        </div>
      </div>`
    ).join('')}</div>`
  );
}

function toolsView() {
  const mm = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const ss = String(timerSeconds % 60).padStart(2, '0');
  return (
    pageTitle('Study Tools', 'Simple tools to support focused study.') +
    `<div class="grid tool-grid">
      <div class="card">
        <h2>Pomodoro</h2>
        <div class="timer" id="timer">${mm}:${ss}</div>
        <div class="timer-controls">
          <button class="btn primary" data-action="timer-start">Start</button>
          <button class="btn" data-action="timer-reset">Reset</button>
        </div>
      </div>
      <div class="card">
        <h2>Quick Calculator</h2>
        <div class="field"><input id="calcInput" placeholder="e.g. 12*24+5"></div>
        <button class="btn primary" style="margin-top:10px" data-action="calculate">Calculate</button>
        <div id="calcResult" style="font-size:22px;font-weight:800;margin-top:18px">—</div>
      </div>
      <div class="card">
        <h2>Study Checklist</h2>
        <label style="display:block;margin:12px 0"><input type="checkbox"> Review notes</label>
        <label style="display:block;margin:12px 0"><input type="checkbox"> Study flashcards</label>
        <label style="display:block;margin:12px 0"><input type="checkbox"> Take a quiz</label>
      </div>
    </div>`
  );
}

function profileView() {
  return (
    pageTitle('Profile', 'Your EcE Hub account information.') +
    `<div class="card">
      <h2>${esc(data.profile.name)}</h2>
      <p style="color:var(--muted)">${esc(data.profile.course)}</p>
      <button class="btn primary" data-action="edit-profile">Edit profile</button>
    </div>`
  );
}

function settingsView() {
  return (
    pageTitle('Settings', 'Control your workspace preferences.') +
    `<div class="card">
      <h2>Appearance</h2>
      <p style="color:var(--muted)">Switch between light and dark mode using the moon/sun button in the top bar, or the button below.</p>
      <button class="btn" data-action="theme">Toggle theme</button>
    </div>`
  );
}

/* ---------- modals & CRUD ---------- */

function asArray(v) {
  return Array.isArray(v) ? v : [];
}
function cardsToText(cards) {
  return asArray(cards)
    .map(c => Array.isArray(c) ? c.join(' | ') : String(c ?? ''))
    .filter(Boolean)
    .join('\n');
}

function modalForm(type, id) {
  const collectionKey = ({
    class: 'classes',
    book: 'books',
    note: 'notes',
    set: 'sets',
    quiz: 'quizzes'
  })[type] || type;
  const list = Array.isArray(data[collectionKey]) ? data[collectionKey] : [];
  const found = id ? list.find(x => x.id === id) : null;
  const forms = {
    class: [
      'Class',
      `<div class="form-grid two">
        <div class="field"><label>Name</label><input id="f-name" value="${esc(found?.name || '')}"></div>
        <div class="field"><label>Category</label><input id="f-category" value="${esc(found?.category || 'Engineering')}"></div>
      </div>
      <div class="field" style="margin-top:13px"><label>Progress %</label><input id="f-progress" type="number" min="0" max="100" value="${found?.progress ?? 0}"></div>`
    ],
    book: [
    'PDF Reference',
    `
        <div class="form-grid">

        <div class="field">
            <label>Title</label>
            <input
            id="f-title"
            value="${esc(found?.title || '')}"
            placeholder="Book title">
        </div>

        <div class="field">
            <label>Author</label>
            <input
            id="f-author"
            value="${esc(found?.author || '')}"
            placeholder="Author">
        </div>

        <div class="field">
            <label>Course</label>
            <input
            id="f-course"
            value="${esc(found?.course || '')}"
            placeholder="e.g. Circuits 101">
        </div>

        <div class="field">
            <label>Folder</label>

            <select id="f-folder">
            <option value="">Uncategorized</option>

            ${(data.folders || []).map(folder => `
                <option
                value="${folder.id}"
                ${found?.folderId === folder.id ? 'selected' : ''}>
                ${esc(folder.name)}
                </option>
            `).join('')}
            </select>
        </div>

        <div class="field">
            <label>Google Drive / PDF URL</label>
            <input
            id="f-url"
            value="${esc(found?.url || '')}"
            placeholder="Paste the Google Drive or PDF link">
        </div>

        </div>
    `
    ],
    note: [
      'Note',
      `<div class="form-grid">
        <div class="field"><label>Title</label><input id="f-title" value="${esc(found?.title || '')}"></div>
        <div class="field"><label>Subject</label><input id="f-subject" value="${esc(found?.subject || '')}"></div>
        <div class="field"><label>Content</label><textarea id="f-body">${esc(found?.body || '')}</textarea></div>
      </div>`
    ],
    set: [
    'Study Set',
    buildSetFormBody(found)
    ],
    quiz: [
      'Quiz',
      buildQuizFormBody(found)
    ]
  };
  if (!forms[type]) {
    console.error('Unknown modal type:', type);
    return toast('Cannot open form');
  }
  const [title, body] = forms[type];
  openModal(
    `<h2>${id ? 'Edit' : 'New'} ${title}</h2>${body}
     <div class="modal-actions">
       <button class="btn" data-action="close-modal">Cancel</button>
       <button class="btn primary" data-action="save-${type}" data-id="${id || ''}">Save</button>
     </div>`,
    { wide: type === 'quiz' }
  );
}

function buildSetFormBody(found) {
  const cards = Array.isArray(found?.cards) && found.cards.length
    ? found.cards
    : [['', '']];

  const defaultSubject =
    found?.subject ||
    (activeClassId
      ? data.classes.find(c => c.id === activeClassId)?.name || ''
      : '');

  return `
    <div class="form-grid">
      <div class="field">
        <label for="f-title">Study Set Title</label>
        <input
          id="f-title"
          value="${esc(found?.title || '')}"
          placeholder="e.g. Ohm's Law"
        >
      </div>

      <div class="field">
        <label for="f-subject">Subject</label>
        <input
          id="f-subject"
          value="${esc(defaultSubject)}"
          placeholder="e.g. Circuits 101"
        >
      </div>
    </div>

    <div class="set-builder">
      <div class="set-builder-head">
        <div>
          <h3>Flashcards</h3>
          <p>Create your cards by entering a question and its answer separately.</p>
        </div>

        <button
          type="button"
          class="btn primary"
          data-action="add-set-card">
          + Add Card
        </button>
      </div>

      <div id="set-cards">
        ${cards.map((card, i) => setCardBlock(i, card)).join('')}
      </div>

      <div class="set-builder-empty" id="set-cards-empty" ${cards.length ? 'style="display:none"' : ''}>
        <div class="set-empty-icon">▧</div>
        <strong>No flashcards yet</strong>
        <span>Click “Add Card” to create your first question and answer.</span>
      </div>
    </div>
  `;
}

function setCardBlock(index, card = ['', '']) {
  const question = Array.isArray(card) ? card[0] || '' : '';
  const answer = Array.isArray(card) ? card[1] || '' : '';

  return `
    <div class="set-card-editor" data-card-index="${index}">
      <div class="set-card-editor-head">
        <div class="set-card-number">
          <span>${index + 1}</span>
          <strong>Flashcard ${index + 1}</strong>
        </div>

        <button
          type="button"
          class="btn danger set-card-remove"
          data-action="remove-set-card"
          data-index="${index}">
          Remove
        </button>
      </div>

      <div class="set-card-fields">
        <div class="field">
          <label>
            <span class="field-number">Q</span>
            Question
          </label>
          <textarea
            class="set-question"
            placeholder="Type the question students should answer..."
          >${esc(question)}</textarea>
          <small>Write the question or term you want to study.</small>
        </div>

        <div class="field">
          <label>
            <span class="field-number answer">A</span>
            Answer
          </label>
          <textarea
            class="set-answer"
            placeholder="Type the correct answer here..."
          >${esc(answer)}</textarea>
          <small>Write the answer that should appear when the card is revealed.</small>
        </div>
      </div>
    </div>
  `;
}

function collectSetCardsFromForm() {
  const cards = [];

  document.querySelectorAll('#set-cards .set-card-editor').forEach(block => {
    const question = block.querySelector('.set-question')?.value.trim() || '';
    const answer = block.querySelector('.set-answer')?.value.trim() || '';

    if (!question && !answer) return;

    if (question && answer) {
      cards.push([question, answer]);
    }
  });

  return cards;
}

function renumberSetCards() {
  document.querySelectorAll('#set-cards .set-card-editor').forEach((block, i) => {
    block.dataset.cardIndex = i;

    const number = block.querySelector('.set-card-number span');
    const title = block.querySelector('.set-card-number strong');
    const remove = block.querySelector('[data-action="remove-set-card"]');

    if (number) number.textContent = i + 1;
    if (title) title.textContent = `Flashcard ${i + 1}`;
    if (remove) remove.dataset.index = i;
  });
}
/* ---------- friendly quiz builder ---------- */
function buildQuizFormBody(found) {
  const raw = asArray(found?.questions);
  const questions = raw.length
    ? raw
    : [{ q: '', options: ['', '', '', ''], answer: 0 }];
  return `<div class="form-grid">
    <div class="field"><label>Title</label><input id="f-title" value="${esc(found?.title || '')}" placeholder="e.g. Circuits Basics"></div>
    <div class="field"><label>Subject</label><input id="f-subject" value="${esc(found?.subject || '')}" placeholder="e.g. Circuits 101"></div>
  </div>
  <div class="quiz-builder">
    <div class="quiz-builder-head">
      <strong>Questions</strong>
      <button type="button" class="btn" data-action="add-quiz-question">+ Add question</button>
    </div>
    <div id="quiz-questions">
      ${questions.map((q, i) => quizQuestionBlock(i, q)).join('')}
    </div>
  </div>`;
}

function quizQuestionBlock(index, q = { q: '', options: ['', '', '', ''], answer: 0 }) {
  const opts = Array.isArray(q.options) ? q.options : ['', '', '', ''];
  while (opts.length < 4) opts.push('');
  const ans = typeof q.answer === 'number' ? q.answer : 0;
  return `<div class="q-block" data-q-index="${index}">
    <div class="q-block-head">
      <span class="q-num">Question ${index + 1}</span>
      <button type="button" class="btn danger q-remove" data-action="remove-quiz-question" data-index="${index}">Remove</button>
    </div>
    <div class="field">
      <label>Question</label>
      <input class="q-text" value="${esc(q.q || '')}" placeholder="Type the question here…">
    </div>
    <div class="q-options-label">Answer choices — pick the correct one</div>
    <div class="q-options">
      ${[0, 1, 2, 3].map(i => `
        <label class="q-option-row">
          <input type="radio" name="correct-${index}" value="${i}" ${ans === i ? 'checked' : ''} title="Mark as correct">
          <span class="opt-letter">${String.fromCharCode(65 + i)}</span>
          <input class="q-opt" data-opt="${i}" value="${esc(opts[i] || '')}" placeholder="Option ${String.fromCharCode(65 + i)}">
        </label>
      `).join('')}
    </div>
    <p class="q-hint">Tip: click the circle next to the right answer so it highlights in purple.</p>
  </div>`;
}

function renumberQuizBlocks() {
  const blocks = document.querySelectorAll('#quiz-questions .q-block');
  blocks.forEach((block, i) => {
    block.dataset.qIndex = i;
    const num = block.querySelector('.q-num');
    if (num) num.textContent = `Question ${i + 1}`;
    const removeBtn = block.querySelector('[data-action="remove-quiz-question"]');
    if (removeBtn) removeBtn.dataset.index = i;
    block.querySelectorAll('input[type="radio"]').forEach(r => {
      r.name = `correct-${i}`;
    });
  });
}

function collectQuizQuestionsFromForm() {
  const blocks = document.querySelectorAll('#quiz-questions .q-block');
  const questions = [];
  blocks.forEach(block => {
    const text = (block.querySelector('.q-text')?.value || '').trim();
    const options = [...block.querySelectorAll('.q-opt')].map(inp => inp.value.trim());
    const checked = block.querySelector('input[type="radio"]:checked');
    const answer = checked ? +checked.value : 0;
    if (!text && options.every(o => !o)) return; // skip fully empty
    if (!text) return; // need a question
    const filled = options.map((o, i) => o || `Option ${String.fromCharCode(65 + i)}`);
    questions.push({
      q: text,
      options: filled.slice(0, 4),
      answer: Math.max(0, Math.min(3, answer))
    });
  });
  return questions;
}

function saveEntity(type, id) {
  const uid = id || crypto.randomUUID();
  if (type === 'class') {
    const obj = {
      id: uid,
      name: document.querySelector('#f-name').value.trim(),
      category: document.querySelector('#f-category').value.trim(),
      sets: 0,
      cards: 0,
      progress: +document.querySelector('#f-progress').value || 0
    };
    const old = data.classes.find(x => x.id === id);
    if (old) {
      obj.sets = old.sets;
      obj.cards = old.cards;
      Object.assign(old, obj);
    } else data.classes.push(obj);
  }
  if (type === 'book') {
    const obj = {
      id: uid,
      title: document.querySelector('#f-title').value.trim(),
      author: document.querySelector('#f-author').value.trim(),
      course: document.querySelector('#f-course').value.trim(),
      url: document.querySelector('#f-url').value.trim()
    };
    const old = data.books.find(x => x.id === id);
    if (old) Object.assign(old, obj);
    else data.books.push(obj);
  }
  if (type === 'note') {
    const obj = {
      id: uid,
      title: document.querySelector('#f-title').value.trim(),
      subject: document.querySelector('#f-subject').value.trim(),
      body: document.querySelector('#f-body').value.trim(),
      updated: 'Just now'
    };
    const old = data.notes.find(x => x.id === id);
    if (old) Object.assign(old, obj);
    else data.notes.unshift(obj);
  }
if (type === 'set') {
  const cards = collectSetCardsFromForm();

  const obj = {
    id: uid,
    title: document.querySelector('#f-title').value.trim(),
    subject: document.querySelector('#f-subject').value.trim(),
    cards
  };

  const old = data.sets.find(x => x.id === id);

  if (old) {
    Object.assign(old, obj);
  } else {
    data.sets.push(obj);
  }
}
  if (type === 'quiz') {
    const questions = collectQuizQuestionsFromForm();
    if (!questions.length) {
      toast('Add at least one question with text');
      return;
    }
    const obj = {
      id: uid,
      title: document.querySelector('#f-title').value.trim() || 'Untitled Quiz',
      subject: document.querySelector('#f-subject').value.trim() || 'General',
      questions
    };
    const old = data.quizzes.find(x => x.id === id);
    if (old) Object.assign(old, obj);
    else data.quizzes.push(obj);
  }
  save();
  closeModal();
  render();
  toast('Saved successfully');
}

/* ---------- quiz & study ---------- */
function takeQuiz(id) {
  const q = data.quizzes.find(x => x.id === id);
  if (!q) return toast('Quiz not found');
  if (!Array.isArray(q.questions) || q.questions.length === 0) {
    return toast('This quiz has no questions. Edit it and add some first.');
  }
  window.quizState = { id, index: 0, score: 0 };
  renderQuizQuestion(q);
}
function renderQuizQuestion(q) {
  const st = window.quizState;
  if (!q || !Array.isArray(q.questions) || !q.questions.length) {
    closeModal();
    return toast('Quiz has no questions');
  }
  const item = q.questions[st.index];
  if (!item || item.q == null) {
    closeModal();
    return toast('Question data is missing — try Reset Demo Data');
  }
  const options = Array.isArray(item.options) ? item.options : [];
  openModal(
    `<h2>${esc(q.title)}</h2>
     <div style="color:var(--muted);font-size:12px">Question ${st.index + 1} of ${q.questions.length}</div>
     <div class="question">${esc(item.q)}</div>
     ${options.map((o, i) =>
       `<button class="option" data-action="answer-quiz" data-index="${i}">${esc(o)}</button>`
     ).join('')}
     <div class="modal-actions"><button class="btn" data-action="close-modal">Cancel</button></div>`
  );
}
function studySet(id) {
  window.studyState = { setId: id, index: 0, revealed: false };
  go('flashcards');
}

/* ---------- event binding (delegated — works for modals too) ---------- */
function action(a, id, index, el) {
  if (a === 'search-go') {
    return goSearchResult(el?.dataset.type || '', id, el?.dataset.route || '');
  }
  if (a === 'open-class') {
    activeClassId = id;
    activeSetId = null;
    route = 'classes';
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (a === 'open-set') {
    activeSetId = id;
    // keep activeClassId if set
    if (!activeClassId) {
      const s = data.sets.find(x => x.id === id);
      const cls = s && data.classes.find(c => (c.name || '').toLowerCase() === (s.subject || '').toLowerCase());
      if (cls) activeClassId = cls.id;
    }
    route = 'classes';
    render();
    window.scrollTo(0, 0);
    return;
  }
    /* ==============================
     LIBRARY
     ============================== */

  if (a === 'open-library-folder') {
    const folder = data.folders?.find(
      f => f.id === id
    );

    if (!folder) {
      return toast('Folder not found');
    }

    libraryFolderId = id;
    route = 'library';

    render();
    return;
  }

  if (a === 'back-library') {
    libraryFolderId = null;
    route = 'library';

    render();
    return;
  }

  if (a === 'add-library-folder') {
    openModal(`
      <h2>New Library Folder</h2>

      <div class="field">
        <label for="f-folder-name">
          Folder Name
        </label>

        <input
          id="f-folder-name"
          type="text"
          placeholder="e.g. Circuits"
          autocomplete="off"
        >

        <small>
          Use folders to organize books by subject,
          course, or category.
        </small>
      </div>

      <div class="modal-actions">

        <button
          type="button"
          class="btn"
          data-action="close-modal">
          Cancel
        </button>

        <button
          type="button"
          class="btn primary"
          data-action="save-library-folder">
          Create Folder
        </button>

      </div>
    `);

    setTimeout(() => {
      document
        .querySelector('#f-folder-name')
        ?.focus();
    }, 0);

    return;
  }

  if (a === 'save-library-folder') {
    const input =
      document.querySelector('#f-folder-name');

    const name = input?.value.trim();

    if (!name) {
      return toast('Please enter a folder name');
    }

    if (!Array.isArray(data.folders)) {
      data.folders = [];
    }

    const duplicate = data.folders.some(
      f =>
        f.name.toLowerCase() ===
        name.toLowerCase()
    );

    if (duplicate) {
      return toast(
        'A folder with that name already exists'
      );
    }

    data.folders.push({
      id:
        'folder_' +
        Date.now() +
        '_' +
        Math.random()
          .toString(36)
          .slice(2, 8),

      name
    });

    save();
    closeModal();
    render();

    toast('Folder created');
    return;
  }

  if (a === 'edit-library-folder') {
    const folder = data.folders?.find(
      f => f.id === id
    );

    if (!folder) {
      return toast('Folder not found');
    }

    openModal(`
      <h2>Edit Library Folder</h2>

      <div class="field">
        <label for="f-folder-name">
          Folder Name
        </label>

        <input
          id="f-folder-name"
          value="${esc(folder.name)}"
          autocomplete="off"
        >
      </div>

      <div class="modal-actions">

        <button
          type="button"
          class="btn"
          data-action="close-modal">
          Cancel
        </button>

        <button
          type="button"
          class="btn primary"
          data-action="save-library-folder-edit"
          data-id="${folder.id}">
          Save Changes
        </button>

      </div>
    `);

    return;
  }

  if (a === 'save-library-folder-edit') {
    const folder = data.folders?.find(
      f => f.id === id
    );

    if (!folder) {
      return toast('Folder not found');
    }

    const name =
      document
        .querySelector('#f-folder-name')
        ?.value.trim();

    if (!name) {
      return toast('Please enter a folder name');
    }

    folder.name = name;

    save();
    closeModal();
    render();

    toast('Folder updated');
    return;
  }

  if (a === 'add-book') {
    openBookForm();
    return;
  }

  if (a === 'add-book-to-folder') {
    const folder = data.folders?.find(
      f => f.id === id
    );

    if (!folder) {
      return toast('Folder not found');
    }

    openBookForm(null, folder.id);
    return;
  }

  if (a === 'edit-book') {
    const book = data.books?.find(
      b => b.id === id
    );

    if (!book) {
      return toast('Book not found');
    }

    openBookForm(book);
    return;
  }

  if (a === 'open-book') {
    const book = data.books?.find(
      b => b.id === id
    );

    if (!book) {
      return toast('Book not found');
    }

    if (!book.driveUrl) {
      return toast('No PDF link configured');
    }

    window.open(book.driveUrl, '_blank');
    return;
  }
  if (action === 'download-book') {
    const book = data.books.find(
        b => b.id === element.dataset.id
    );

    if (book) {
        downloadBook(book);
    }

    return;
 }
  if (a === 'delete-book') {
    const book = data.books?.find(
      b => b.id === id
    );

    if (!book) {
      return toast('Book not found');
    }

    openModal(`
      <div class="delete-modal">

        <div class="delete-modal-icon">
          !
        </div>

        <h2>
          Delete book?
        </h2>

        <p>
          Are you sure you want to delete
          <strong>${esc(book.title)}</strong>?
        </p>

        <p class="delete-warning">
          The book and its PDF link will be
          permanently removed.
        </p>

        <div class="modal-actions">

          <button
            type="button"
            class="btn"
            data-action="close-modal">
            Cancel
          </button>

          <button
            type="button"
            class="btn danger"
            data-action="confirm-delete-book"
            data-id="${book.id}">
            Delete Book
          </button>

        </div>

      </div>
    `);

    return;
  }

  if (a === 'confirm-delete-book') {
    const book = data.books?.find(
      b => b.id === id
    );

    if (!book) {
      closeModal();
      return toast('Book not found');
    }

    data.books = data.books.filter(
      b => b.id !== id
    );

    save();
    closeModal();
    render();

    toast(`"${book.title}" deleted`);
    return;
  }
  if (a === 'back-to-classes') {
    activeClassId = null;
    activeSetId = null;
    route = 'classes';
    render();
    return;
  }
  if (a === 'back-to-class') {
    activeSetId = null;
    route = 'classes';
    render();
    return;
  }
  if (a === 'add-class') return modalForm('class');
  if (a === 'edit-class') return modalForm('class', id);
if (a === 'delete-class') {
  const cls = data.classes.find(x => x.id === id);
  if (!cls) return toast('Class not found');

  openModal(`
    <div class="delete-modal">
      <div class="delete-modal-icon">!</div>

      <h2>Delete subject?</h2>

      <p>
        Are you sure you want to delete
        <strong>${esc(cls.name)}</strong>?
      </p>

      <p class="delete-warning">
        This action cannot be undone.
      </p>

      <div class="modal-actions">
        <button class="btn" data-action="close-modal">
          Cancel
        </button>

        <button
          class="btn danger delete-confirm"
          data-action="confirm-delete-class"
          data-id="${id}">
          Delete Subject
        </button>
      </div>
    </div>
  `);

  return;
}
if (a === 'confirm-delete-class') {
  const cls = data.classes.find(x => x.id === id);

  if (!cls) {
    closeModal();
    return toast('Subject not found');
  }

  data.classes = data.classes.filter(x => x.id !== id);

  save();
  closeModal();
  render();

  toast(`"${cls.name}" deleted`);
  return;
}


if (a === 'save-book') {
  const title = document.querySelector('#f-title')?.value.trim();
  const author = document.querySelector('#f-author')?.value.trim();
  const course = document.querySelector('#f-course')?.value.trim();
  const folderId = document.querySelector('#f-folder')?.value || '';
  const url = document.querySelector('#f-url')?.value.trim();

  if (!title) {
    return toast('Please enter a book title');
  }

  if (!url) {
    return toast('Please enter the PDF or Google Drive link');
  }

  const existing = data.books.find(b => b.id === id);

  if (existing) {
    existing.title = title;
    existing.author = author;
    existing.course = course;
    existing.folderId = folderId;
    existing.url = url;
  } else {
    data.books.push({
      id: 'book_' + Date.now(),
      title,
      author,
      course,
      folderId,
      url
    });
  }

  save();
  closeModal();
  render();

  toast(existing ? 'Book updated' : 'Book added');
  return;
}

  if (a === 'add-note') return modalForm('note');
  if (a === 'edit-note') return modalForm('note', id);
  if (a === 'delete-note') {
    if (confirm('Delete this note?')) {
      data.notes = data.notes.filter(x => x.id !== id);
      save();
      render();
      toast('Note deleted');
    }
    return;
  }
  if (a === 'add-set') return modalForm('set');
  if (a === 'edit-set') return modalForm('set', id);
  if (a === 'delete-set') {
  const set = data.sets.find(x => x.id === id);

  if (!set) {
    return toast('Study set not found');
  }

  const cardCount = Array.isArray(set.cards)
    ? set.cards.length
    : 0;

  openModal(`
    <div class="delete-modal">
      <div class="delete-modal-icon">!</div>

      <h2>Delete study set?</h2>

      <p>
        Are you sure you want to delete
        <strong>${esc(set.title)}</strong>?
      </p>

      <p class="delete-warning">
        This will permanently delete the study set
        and its ${cardCount} flashcard${cardCount === 1 ? '' : 's'}.
      </p>

      <div class="modal-actions">
        <button
          type="button"
          class="btn"
          data-action="close-modal">
          Cancel
        </button>

        <button
          type="button"
          class="btn danger delete-confirm"
          data-action="confirm-delete-set"
          data-id="${id}">
          Delete Study Set
        </button>
      </div>
    </div>
  `);

  return;
}
if (a === 'confirm-delete-set') {
  const set = data.sets.find(x => x.id === id);

  if (!set) {
    closeModal();
    return toast('Study set not found');
  }

  data.sets = data.sets.filter(x => x.id !== id);

  save();
  closeModal();
  render();

  toast(`"${set.title}" deleted`);

  return;
}
  if (a === 'study-set') return studySet(id);
  if (a === 'continue-study') {
    if (data.sets.length) return studySet(data.sets[0].id);
    return toast('No study sets yet — create one first');
  }
  if (a === 'stop-study') {
    window.studyState = null;
    return go('flashcards');
  }
  if (a === 'flip-card') {
    if (!window.studyState) return;
    window.studyState.revealed = !window.studyState.revealed;
    return render();
  }
  if (a === 'next-card') {
    const s = data.sets.find(x => x.id === window.studyState?.setId);
    if (!s) return;
    window.studyState.index = (window.studyState.index + 1) % s.cards.length;
    window.studyState.revealed = false;
    return render();
  }
  if (a === 'prev-card') {
    const s = data.sets.find(x => x.id === window.studyState?.setId);
    if (!s) return;
    window.studyState.index = (window.studyState.index - 1 + s.cards.length) % s.cards.length;
    window.studyState.revealed = false;
    return render();
  }
  if (a === 'delete-set') {
  const set = data.sets.find(x => x.id === id);

  if (!set) {
    return toast('Study set not found');
  }

  openModal(`
    <div class="delete-modal">
      <div class="delete-modal-icon">!</div>

      <h2>Delete study set?</h2>

      <p>
        Are you sure you want to delete
        <strong>${esc(set.title)}</strong>?
      </p>

      <p class="delete-warning">
        All ${Array.isArray(set.cards) ? set.cards.length : 0}
        flashcards in this set will also be deleted.
      </p>

      <div class="modal-actions">
        <button
          type="button"
          class="btn"
          data-action="close-modal">
          Cancel
        </button>

        <button
          type="button"
          class="btn danger delete-confirm"
          data-action="confirm-delete-set"
          data-id="${id}">
          Delete Study Set
        </button>
      </div>
    </div>
  `);

  return;
}
if (a === 'confirm-delete-set') {
  const set = data.sets.find(x => x.id === id);

  if (!set) {
    closeModal();
    return toast('Study set not found');
  }

  data.sets = data.sets.filter(x => x.id !== id);

  save();
  closeModal();
  render();

  toast(`"${set.title}" deleted`);
  return;
}
  if (a === 'add-quiz') return modalForm('quiz');
  if (a === 'add-quiz-question') {
    const container = document.querySelector('#quiz-questions');
    if (!container) return;
    const next = container.querySelectorAll('.q-block').length;
    container.insertAdjacentHTML('beforeend', quizQuestionBlock(next));
    renumberQuizBlocks();
    const last = container.querySelector('.q-block:last-child .q-text');
    if (last) last.focus();
    return;
  }
  if (a === 'remove-quiz-question') {
    const container = document.querySelector('#quiz-questions');
    if (!container) return;
    const blocks = container.querySelectorAll('.q-block');
    if (blocks.length <= 1) {
      toast('Keep at least one question');
      return;
    }
    const block = container.querySelector(`.q-block[data-q-index="${index}"]`)
      || blocks[+index];
    if (block) block.remove();
    renumberQuizBlocks();
    return;
  }
  if (a === 'delete-quiz') {
    if (confirm('Delete this quiz?')) {
      data.quizzes = data.quizzes.filter(x => x.id !== id);
      save();
      render();
      toast('Quiz deleted');
    }
    return;
  }
  if (a === 'take-quiz') return takeQuiz(id);
  if (a === 'answer-quiz') {
    if (!window.quizState) return;
    const q = data.quizzes.find(x => x.id === window.quizState.id);
    if (!q || !Array.isArray(q.questions) || !q.questions.length) {
      closeModal();
      return toast('Quiz data is missing');
    }
    const current = q.questions[window.quizState.index];
    if (current && +index === current.answer) window.quizState.score++;
    window.quizState.index++;
    if (window.quizState.index < q.questions.length) return renderQuizQuestion(q);
    const total = q.questions.length;
    const score = Math.round((window.quizState.score / total) * 100);
    data.activity.unshift({ text: `Completed quiz: ${q.title}`, sub: `Score: ${score}%`, time: 'Just now' });
    data.activity = data.activity.slice(0, 8);
    save();
    openModal(
      `<h2>Quiz complete 🎉</h2>
       <div class="result"><strong>${score}%</strong>
         <p>You got ${window.quizState.score} out of ${total} correct.</p>
       </div>
       <div class="modal-actions"><button class="btn primary" data-action="close-modal">Done</button></div>`
    );
    return;
  }
  if (a.startsWith('save-')) return saveEntity(a.slice(5), id);
  if (a === 'close-modal') return closeModal();
  if (a === 'theme') return toggleTheme();
  if (a === 'classes') return go('classes');
  if (a === 'timer-start') return startTimer();
  if (a === 'timer-reset') return resetTimer();
  if (a === 'calculate') {
    const input = document.querySelector('#calcInput').value.trim();
    const resultEl = document.querySelector('#calcResult');
    if (!input) {
      resultEl.textContent = '—';
      return;
    }
    try {
      // Restrict to basic arithmetic for safety
      if (!/^[\d\s+\-*/().%]+$/.test(input)) throw new Error('Invalid');
      // eslint-disable-next-line no-new-func
      resultEl.textContent = Function(`"use strict"; return (${input})`)();
    } catch {
      resultEl.textContent = 'Invalid';
    }
    return;
  }
  if (a === 'edit-profile') {
    openModal(
      `<h2>Edit Profile</h2>
       <div class="form-grid">
         <div class="field"><label>Name</label><input id="profile-name" value="${esc(data.profile.name)}"></div>
         <div class="field"><label>Course label</label><input id="profile-course" value="${esc(data.profile.course)}"></div>
       </div>
       <div class="modal-actions">
         <button class="btn" data-action="close-modal">Cancel</button>
         <button class="btn primary" data-action="save-profile">Save</button>
       </div>`
    );
    return;
  }
  if (a === 'save-profile') {
    data.profile.name = document.querySelector('#profile-name').value || 'Student';
    data.profile.course = document.querySelector('#profile-course').value || 'EcE Learner';
    save();
    closeModal();
    render();
    toast('Profile updated');
    return;
  }
  if (a === 'add-set-card') {
    const container = document.querySelector('#set-cards');
    if (!container) return;

    const index = container.querySelectorAll('.set-card-editor').length;

    container.insertAdjacentHTML(
        'beforeend',
        setCardBlock(index, ['', ''])
    );

    renumberSetCards();

    const empty = document.querySelector('#set-cards-empty');
    if (empty) empty.style.display = 'none';

    const cards = container.querySelectorAll('.set-card-editor');
    cards[cards.length - 1]
        ?.querySelector('.set-question')
        ?.focus();

    return;
    }

if (a === 'remove-set-card') {
  const block = el?.closest('.set-card-editor');

  if (block) {
    block.remove();
  }

  renumberSetCards();

  const container = document.querySelector('#set-cards');
  const empty = document.querySelector('#set-cards-empty');

  if (container && empty) {
    const count = container.querySelectorAll('.set-card-editor').length;
    empty.style.display = count ? 'none' : 'flex';
  }

  return;
}
}

/* ---------- timer ---------- */
function startTimer() {
  if (timer) return;
  timer = setInterval(() => {
    timerSeconds--;
    if (timerSeconds <= 0) {
      clearInterval(timer);
      timer = null;
      timerSeconds = 0;
      toast('Pomodoro complete!');
    }
    const e = document.querySelector('#timer');
    if (e) {
      e.textContent =
        `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`;
    }
  }, 1000);
}
function resetTimer() {
  clearInterval(timer);
  timer = null;
  timerSeconds = 25 * 60;
  const e = document.querySelector('#timer');
  if (e) e.textContent = '25:00';
}

/* ---------- one-time event delegation (covers content + modals) ---------- */
document.addEventListener('click', e => {
  const actionEl = e.target.closest('[data-action]');

  if (actionEl) {
    e.preventDefault();

    action(
      actionEl.dataset.action,
      actionEl.dataset.id || '',
      actionEl.dataset.index || '',
      actionEl
    );

    return;
  }

  const routeEl = e.target.closest('[data-route]');

  if (routeEl) {
    e.preventDefault();
    go(routeEl.dataset.route);
  }
});

function isMobileNav() {
  return window.matchMedia('(max-width: 850px)').matches;
}
function toggleSidebar() {
  if (isMobileNav()) {
    const open = !document.querySelector('#sidebar').classList.contains('open');
    document.querySelector('#sidebar').classList.toggle('open', open);
    const overlay = document.querySelector('#sidebarOverlay');
    if (overlay) {
      overlay.classList.toggle('show', open);
      overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    document.body.classList.toggle('nav-locked', open);
  } else {
    // Desktop: collapse / expand the fixed sidebar
    document.querySelector('.app-shell').classList.toggle('sidebar-collapsed');
  }
}
function closeSidebar() {
  // Only closes the mobile drawer — does not collapse desktop sidebar
  document.querySelector('#sidebar').classList.remove('open');
  const overlay = document.querySelector('#sidebarOverlay');
  if (overlay) {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('nav-locked');
}

document.querySelector('#menuButton').addEventListener('click', e => {
  e.stopPropagation();
  toggleSidebar();
});
const overlayEl = document.querySelector('#sidebarOverlay');
if (overlayEl) {
  overlayEl.addEventListener('click', () => closeSidebar());
}
window.addEventListener('resize', () => {
  // reset mobile drawer state when crossing breakpoint
  if (!isMobileNav()) {
    document.querySelector('#sidebar').classList.remove('open');
    if (overlayEl) overlayEl.classList.remove('show');
    document.body.classList.remove('nav-locked');
  }
});
document.querySelector('#themeButton').addEventListener('click', () => toggleTheme());
document.querySelector('#helpButton').addEventListener('click', () =>
  toast('EcE Hub help: use the sidebar to open each system.')
);
document.querySelector('#resetData').addEventListener('click', () => {
  if (confirm('Reset all local EcE Hub data to the demo data?')) {
    data = clone(seed);
    save();
    window.studyState = null;
    go('home');
    toast('Demo data restored');
  }
});
/* ---------- global search ---------- */
function collectSearchHits(q) {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const groups = [];
  const match = (s) => String(s || '').toLowerCase().includes(query);

  const classes = data.classes.filter(x => match(x.name) || match(x.category));
  if (classes.length) {
    groups.push({
      label: 'Classes',
      items: classes.map(x => ({
        id: x.id, type: 'class', route: 'classes',
        title: x.name, sub: x.category || 'Class',
        icon: '▣', iconClass: 'purple'
      }))
    });
  }
  const sets = data.sets.filter(x => match(x.title) || match(x.subject));
  if (sets.length) {
    groups.push({
      label: 'Study Sets',
      items: sets.map(x => ({
        id: x.id, type: 'set', route: 'flashcards',
        title: x.title, sub: `${x.subject || 'Set'} · ${x.cards.length} cards`,
        icon: '▧', iconClass: 'green'
      }))
    });
  }
  const notes = data.notes.filter(x => match(x.title) || match(x.subject) || match(x.body));
  if (notes.length) {
    groups.push({
      label: 'Notes',
      items: notes.map(x => ({
        id: x.id, type: 'note', route: 'notes',
        title: x.title, sub: x.subject || 'Note',
        icon: '☑', iconClass: 'blue'
      }))
    });
  }
  const quizzes = data.quizzes.filter(x => match(x.title) || match(x.subject));
  if (quizzes.length) {
    groups.push({
      label: 'Quizzes',
      items: quizzes.map(x => ({
        id: x.id, type: 'quiz', route: 'quizzes',
        title: x.title, sub: `${x.subject || 'Quiz'} · ${x.questions.length} questions`,
        icon: '◈', iconClass: 'orange'
      }))
    });
  }
  const books = data.books.filter(x => match(x.title) || match(x.author) || match(x.course));
  if (books.length) {
    groups.push({
      label: 'Library',
      items: books.map(x => ({
        id: x.id, type: 'book', route: 'library',
        title: x.title, sub: `${x.author || ''} · ${x.course || ''}`.replace(/^ · | · $/g, ''),
        icon: '▤', iconClass: 'blue'
      }))
    });
  }
  return groups;
}

function renderSearchResults(q) {
  const panel = document.querySelector('#searchResults');
  const clearBtn = document.querySelector('#searchClear');
  if (!panel) return;
  const query = (q || '').trim();
  if (clearBtn) clearBtn.hidden = !query;
  if (!query) {
    panel.hidden = true;
    panel.classList.remove('open');
    panel.innerHTML = '';
    return;
  }
  const groups = collectSearchHits(query);
  panel.hidden = false;
  panel.classList.add('open');
  if (!groups.length) {
    panel.innerHTML = `<div class="search-empty">No matches for “${esc(query)}”</div>`;
    return;
  }
  panel.innerHTML = groups.map(g =>
    `<div class="search-group">${esc(g.label)}</div>` +
    g.items.map(item =>
      `<button type="button" class="search-item" data-action="search-go"
        data-type="${esc(item.type)}" data-id="${esc(item.id)}" data-route="${esc(item.route)}">
        <span class="si-icon ${esc(item.iconClass)}">${item.icon}</span>
        <span class="si-body">
          <span class="si-title">${esc(item.title)}</span>
          <span class="si-sub">${esc(item.sub)}</span>
        </span>
      </button>`
    ).join('')
  ).join('');
}

function closeSearch() {
  const panel = document.querySelector('#searchResults');
  const input = document.querySelector('#globalSearch');
  const clearBtn = document.querySelector('#searchClear');
  if (panel) { panel.hidden = true; panel.classList.remove('open'); panel.innerHTML = ''; }
  if (clearBtn) clearBtn.hidden = true;
  if (input) input.value = '';
}

function goSearchResult(type, id, route) {
  closeSearch();

  if (type === 'set') {
    studySet(id);
    return;
  }

  if (type === 'quiz') {
    go('quizzes');

    // Slight delay so the view is ready, then open quiz
    setTimeout(() => takeQuiz(id), 50);
    return;
  }

  if (type === 'book') {
    const book = data.books?.find(book => book.id === id);

    if (!book) {
      toast('Book not found');
      return;
    }

    // Go to the library
    go('library');

    // Open the folder containing the book
    if (book.folderId) {
      libraryFolderId = book.folderId;
    }

    render();

    // Open the PDF after the library view is ready
    setTimeout(() => {
      const currentBook = data.books?.find(book => book.id === id);

      if (!currentBook) {
        toast('Book not found');
        return;
      }

      if (!currentBook.driveUrl && !currentBook.url) {
        toast('No PDF link configured');
        return;
      }

      const pdfUrl = currentBook.driveUrl || currentBook.url;

      window.open(pdfUrl, '_blank');
    }, 50);

    return;
  }

  go(route || 'home');
}
const searchInput = document.querySelector('#globalSearch');
if (searchInput) {
  searchInput.addEventListener('input', e => renderSearchResults(e.target.value));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSearch();
      searchInput.blur();
    }
  });
  searchInput.addEventListener('focus', e => {
    if (e.target.value.trim()) renderSearchResults(e.target.value);
  });
}
const searchClear = document.querySelector('#searchClear');
if (searchClear) {
  searchClear.addEventListener('click', e => {
    e.preventDefault();
    closeSearch();
    document.querySelector('#globalSearch')?.focus();
  });
}
document.addEventListener('click', e => {
  const wrap = document.querySelector('#searchWrap');
  if (wrap && !wrap.contains(e.target)) {
    const panel = document.querySelector('#searchResults');
    if (panel) panel.hidden = true;
  }
});

function getStudyGoalData() {
  const today = new Date();

  // Monday = start of week
  const startOfWeek = new Date(today);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  startOfWeek.setDate(startOfWeek.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const days = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);

    days.push({
      date,
      label: date.toLocaleDateString('en-US', {
        weekday: 'short'
      }),
      studied: false
    });
  }

  /*
   * Use the existing activity data.
   *
   * IMPORTANT:
   * This assumes activity entries contain a date/time field.
   */
  if (Array.isArray(data.activity)) {
    days.forEach(day => {
      const target = day.date.toISOString().slice(0, 10);

      day.studied = data.activity.some(activity => {
        const value =
          activity.date ||
          activity.createdAt ||
          activity.timestamp;

        if (!value) return false;

        const activityDate = new Date(value);

        if (Number.isNaN(activityDate.getTime())) {
          return false;
        }

        return activityDate.toISOString().slice(0, 10) === target;
      });
    });
  }

  const completed = days.filter(day => day.studied).length;

  return {
    completed,
    total: 7,
    percentage: Math.round((completed / 7) * 100),
    days
  };
}

function renderStudyGoal() {
  const goal = getStudyGoalData();

  return `
    <div class="card">
      <div class="section-head">
        <h2>Study Goal</h2>

        <button
          type="button"
          class="btn">
          This Week
        </button>
      </div>

      <p style="color:var(--muted);font-size:12px">
        Keep your streak going!
      </p>

      <div class="goal-big">
        ${goal.completed}
        <span>/ ${goal.total} days</span>
      </div>

      <div class="goal-progress">
        <i style="width:${goal.percentage}%"></i>
      </div>

      <div style="
        display:flex;
        justify-content:space-between;
        color:var(--muted);
        font-size:10px;
      ">
        ${goal.days.map(day => `
          <span>
            ${day.label}${day.studied ? ' ✓' : ''}
          </span>
        `).join('')}
      </div>
    </div>
  `;
}

loadLibraryData();
/* ---------- boot ---------- */
render();
