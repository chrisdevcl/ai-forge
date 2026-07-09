/* ── app.js ── estado central y eventos ──────────────────── */

// ── In-memory caches populated on init ────────────────────
let _bookmarks     = new Set();  // card IDs saved by the user
let _promptHistory = [];         // last 5 saved prompts
let _readCards     = new Set();  // card IDs already opened at least once

// ── Cached total counts — CARDS is static ─────────────────
const _totalCounts = (() => {
  const counts = {};
  CARDS.forEach(card => { counts[card.category] = (counts[card.category] || 0) + 1; });
  return counts;
})();

// ── Curated example searches for the empty-state ──────────
// (Raw tags aren't shown as filters anymore — they're inconsistent and
// confusing as a third axis alongside categoría/nivel. Kept only for search.)
const SUGGESTED_SEARCHES = [
  'alucinación', 'prompt', 'temperatura', 'contexto', 'RAG', 'agente',
];

const state = {
  activeCategory: 'all',
  activeLevel:    'all',
  searchQuery:    '',
  builderActive:  false,
  openCardId:     null,   // card currently shown in modal (for permalink)
  builder: {
    role: '', context: '', task: '', restrictions: '', examples: '',
    format: '', tone: '', model: 'claude-sonnet-5',
    cot: false, selfcheck: false,
  },
};

function cardMatchesQuery(card, q) {
  return (
    card.title.toLowerCase().includes(q) ||
    card.summary.toLowerCase().includes(q) ||
    (card.tags   || []).some(t => t.toLowerCase().includes(q)) ||
    (card.detail || '').toLowerCase().includes(q)
  );
}

// ── Filtering ─────────────────────────────────────────────
function getFilteredCards() {
  if (state.activeCategory === 'ruta') {
    return BASIC_PATH.map(id => CARDS.find(c => c.id === id)).filter(Boolean);
  }
  const q = state.searchQuery.toLowerCase();
  return CARDS.filter(card => {
    if (state.activeCategory === 'favoritos') {
      if (!_bookmarks.has(card.id)) return false;
    } else {
      const matchCat = state.activeCategory === 'all' || card.category === state.activeCategory;
      if (!matchCat) return false;
    }
    if (state.activeLevel !== 'all' && card.level !== state.activeLevel) return false;
    if (!q) return true;
    return cardMatchesQuery(card, q);
  });
}

function getCategoryCounts() {
  if (state.activeCategory === 'favoritos' || (!state.searchQuery && state.activeLevel === 'all')) {
    return _totalCounts;
  }
  const q = state.searchQuery.toLowerCase();
  const counts = {};
  CARDS.forEach(card => {
    if (state.activeLevel !== 'all' && card.level !== state.activeLevel) return;
    if (q && !cardMatchesQuery(card, q)) return;
    counts[card.category] = (counts[card.category] || 0) + 1;
  });
  return counts;
}

function getGlossaryCount() {
  if (!state.searchQuery) return GLOSSARY_INDEX.length;
  const q = state.searchQuery.toLowerCase();
  return GLOSSARY_INDEX.filter(e => e.term.toLowerCase().includes(q) || e.def.toLowerCase().includes(q)).length;
}

function findGlossaryTerm(term) {
  const q = term.toLowerCase().trim();
  const entry =
    GLOSSARY_INDEX.find(e => e.term.toLowerCase() === q) ||
    GLOSSARY_INDEX.find(e => e.term.toLowerCase().startsWith(q)) ||
    GLOSSARY_INDEX.find(e => e.term.toLowerCase().includes(q));
  return entry ? CARDS.find(c => c.id === entry.cardId) : null;
}

function getLevelCounts() {
  const q = state.searchQuery.toLowerCase();
  const counts = {};
  CARDS.forEach(card => {
    if (state.activeCategory === 'favoritos') {
      if (!_bookmarks.has(card.id)) return;
    } else if (state.activeCategory !== 'all' && state.activeCategory !== 'ruta' && card.category !== state.activeCategory) {
      return;
    }
    if (q && !cardMatchesQuery(card, q)) return;
    counts[card.level] = (counts[card.level] || 0) + 1;
  });
  return counts;
}

function updateHeader() {
  const catObj = CATEGORIES.find(c => c.id === state.activeCategory);
  const header  = document.getElementById('main-header');
  const titleEl = document.getElementById('current-category-title');
  const descEl  = document.getElementById('category-desc');
  const progEl  = document.getElementById('ruta-progress');
  const progFillEl = document.getElementById('ruta-progress-fill');

  if (state.builderActive) {
    header.classList.remove('hidden');
    progEl.classList.add('hidden');
    titleEl.textContent = 'Prompt Lab';
    descEl.textContent  = 'Construye prompts estructurados listos para usar';
    return;
  }

  if (state.activeCategory === 'ruta') {
    header.classList.remove('hidden');
    const read = BASIC_PATH.filter(id => _readCards.has(id)).length;
    titleEl.textContent = 'Empezar desde cero';
    descEl.textContent  = `Los conceptos básicos en el orden recomendado — ${read}/${BASIC_PATH.length} leídas`;
    progEl.classList.remove('hidden');
    progFillEl.style.width = `${Math.round((read / BASIC_PATH.length) * 100)}%`;
    return;
  }

  progEl.classList.add('hidden');

  if (state.activeCategory === 'all' && !state.searchQuery && state.activeLevel === 'all') {
    header.classList.add('hidden');
    return;
  }

  header.classList.remove('hidden');

  const levelObj = LEVELS.find(l => l.id === state.activeLevel);

  if (state.searchQuery && state.activeCategory === 'glosario') {
    const n = getGlossaryCount();
    titleEl.textContent = `"${state.searchQuery}"`;
    descEl.textContent  = `${n} término${n !== 1 ? 's' : ''}`;
  } else if (state.searchQuery) {
    const n = getFilteredCards().length;
    titleEl.textContent = `"${state.searchQuery}"`;
    descEl.textContent  = `${n} resultado${n !== 1 ? 's' : ''}`;
  } else if (state.activeCategory === 'all' && levelObj) {
    titleEl.textContent = `Nivel ${levelObj.label}`;
    descEl.textContent  = levelObj.desc;
  } else {
    titleEl.textContent = catObj ? catObj.label : '';
    descEl.textContent  = levelObj
      ? `${catObj && catObj.desc ? catObj.desc + ' · ' : ''}Nivel ${levelObj.label}`
      : (catObj && catObj.desc ? catObj.desc : '');
  }
}

function setBuilderActive(active) {
  state.builderActive = active;
  const btn = document.getElementById('btn-builder');
  btn.classList.toggle('active', active);
  // Con el Prompt Lab abierto, el botón funciona como "volver" a las tarjetas
  btn.textContent = active ? '← Volver' : '⌘ Prompt Lab';
}

// ── URL state ─────────────────────────────────────────────
function pushURLState() {
  const params = new URLSearchParams();
  if (state.activeCategory !== 'all') params.set('cat', state.activeCategory);
  if (state.activeLevel !== 'all')    params.set('lvl', state.activeLevel);
  if (state.searchQuery)              params.set('q',   state.searchQuery);
  if (state.openCardId)               params.set('card', state.openCardId);
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

function readURLState() {
  const params = new URLSearchParams(location.search);
  const cat  = params.get('cat');
  const lvl  = params.get('lvl');
  const q    = params.get('q');
  const card = params.get('card');
  // 'ruta' (guiada) no es una pestaña de categoría, pero sí un estado válido de URL
  if (cat && (cat === 'ruta' || CATEGORIES.some(c => c.id === cat))) state.activeCategory = cat;
  if (lvl && LEVELS.some(l => l.id === lvl)) state.activeLevel = lvl;
  if (q) {
    state.searchQuery = q;
    const el = document.getElementById('search');
    if (el) el.value = q;
  }
  if (card) state.openCardId = card;
}

// ── Utilities ─────────────────────────────────────────────
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// ── Render ────────────────────────────────────────────────
function render(isInitial = false) {
  const counts = getCategoryCounts();
  counts.favoritos = _bookmarks.size;
  counts.glosario  = getGlossaryCount();
  renderCategoryBar(
    state.builderActive ? '' : state.activeCategory,
    counts,
    _bookmarks.size > 0,
  );

  const showLevelBar = !state.builderActive && state.activeCategory !== 'ruta' && state.activeCategory !== 'glosario';
  renderLevelBar(showLevelBar ? state.activeLevel : '', getLevelCounts(), showLevelBar);

  updateHeader();

  if (state.builderActive) {
    renderPromptBuilder();
    return;
  }

  if (state.activeCategory === 'glosario') {
    renderGlossaryList(state.searchQuery);
    return;
  }

  const isHome = state.activeCategory === 'all' && !state.searchQuery && state.activeLevel === 'all';
  renderCards(getFilteredCards(), isInitial, _bookmarks, isHome ? renderHomeBannerHTML() : '');
}

// ── Modal navigation ──────────────────────────────────────
let _modalIndex = -1;
let _modalCards = [];

function openModalAtIndex(index) {
  _modalIndex = index;
  const card = _modalCards[index];
  state.openCardId = card.id;
  pushURLState();
  openModal(card, index, _modalCards.length, _bookmarks.has(card.id));
  markCardRead(card.id);
}

// ── Read progress ─────────────────────────────────────────
async function markCardRead(cardId) {
  if (_readCards.has(cardId)) return;
  _readCards.add(cardId);
  await storage.markRead(cardId);
  if (state.activeCategory === 'ruta' && BASIC_PATH.includes(cardId)) {
    updateHeader();
  }
}

function onCardClick(e) {
  // Home banner → activar la ruta guiada
  const bannerEl = e.target.closest('.home-banner');
  if (bannerEl) {
    state.activeCategory = 'ruta';
    pushURLState();
    render();
    return;
  }

  // Sugerencia de búsqueda en el estado vacío
  const suggEl = e.target.closest('.empty-suggestion');
  if (suggEl) {
    state.searchQuery = suggEl.dataset.search;
    document.getElementById('search').value = suggEl.dataset.search;
    state.activeCategory = 'all';
    pushURLState();
    render();
    return;
  }

  // Fila del glosario → abre la tarjeta que explica el término en profundidad
  const glossRow = e.target.closest('.glossary-row');
  if (glossRow) {
    _modalCards = GLOSSARY_INDEX.map(entry => CARDS.find(c => c.id === entry.cardId)).filter(Boolean);
    const idx = _modalCards.findIndex(c => c.id === glossRow.dataset.cardId);
    if (idx !== -1) openModalAtIndex(idx);
    return;
  }

  // Bookmark toggle
  const bmEl = e.target.closest('.card-bookmark');
  if (bmEl) {
    e.stopPropagation();
    toggleBookmark(bmEl.dataset.id);
    return;
  }

  // Open card modal
  const cardEl = e.target.closest('.card');
  if (!cardEl) return;
  _modalCards = getFilteredCards();
  const idx = _modalCards.findIndex(c => c.id === cardEl.dataset.id);
  if (idx !== -1) openModalAtIndex(idx);
}

// ── Bookmarks ─────────────────────────────────────────────
async function toggleBookmark(cardId) {
  const wasBookmarked = _bookmarks.has(cardId);
  if (wasBookmarked) {
    _bookmarks.delete(cardId);
    await storage.removeBookmark(cardId);
  } else {
    _bookmarks.add(cardId);
    await storage.addBookmark(cardId);
  }
  const isNow = !wasBookmarked;

  // Update all bookmark buttons in DOM without full re-render
  document.querySelectorAll(`.card-bookmark[data-id="${cardId}"]`).forEach(btn => {
    btn.textContent = isNow ? '♥' : '♡';
    btn.classList.toggle('is-bookmarked', isNow);
    btn.setAttribute('aria-label', isNow ? 'Quitar de favoritos' : 'Guardar en favoritos');
  });
  const modalBtn = document.getElementById('modal-bookmark-btn');
  if (modalBtn && modalBtn.dataset.id === cardId) {
    modalBtn.classList.toggle('is-bookmarked', isNow);
    modalBtn.setAttribute('aria-label', isNow ? 'Quitar de favoritos' : 'Guardar en favoritos');
    const icon  = modalBtn.querySelector('.mact-icon');
    const label = modalBtn.querySelector('.mact-label');
    if (icon)  icon.textContent  = isNow ? '♥' : '♡';
    if (label) label.textContent = isNow ? 'Guardado' : 'Guardar';
  }

  // Refresh category bar (favoritos count changed)
  const counts = getCategoryCounts();
  counts.favoritos = _bookmarks.size;
  counts.glosario  = getGlossaryCount();
  renderCategoryBar(
    state.builderActive ? '' : state.activeCategory,
    counts,
    _bookmarks.size > 0,
  );

  // If viewing favoritos, removed card must disappear
  if (state.activeCategory === 'favoritos') {
    renderCards(getFilteredCards(), false, _bookmarks);
  }

  return isNow;
}

// ── Prompt history ────────────────────────────────────────
async function savePromptToHistory(promptText, builderState) {
  const src = builderState.task || builderState.role || builderState.context || '';
  const label = src.slice(0, 40).trim() + (src.length > 40 ? '…' : '') || 'Prompt';
  const record = { label, prompt: promptText, ...builderState };
  await storage.savePrompt(record);
  _promptHistory = await storage.getPromptHistory();
  // Re-render the builder history section without losing field values
  refreshBuilderHistory();
}

async function deletePromptFromHistory(id) {
  await storage.deletePrompt(id);
  _promptHistory = _promptHistory.filter(p => p.id !== id);
  refreshBuilderHistory();
}

// ── "Usar en Prompt Lab" from a card ─────────────────────
function useInPromptLab(hint) {
  if (!hint) return;
  // Merge hint values into builder state
  if (hint.cot       !== undefined) state.builder.cot       = hint.cot;
  if (hint.selfcheck !== undefined) state.builder.selfcheck = hint.selfcheck;
  if (hint.examples  !== undefined) state.builder.examples  = hint.examples;
  if (hint.task      !== undefined) state.builder.task      = hint.task;

  closeModal();
  state.openCardId  = null;
  state.searchQuery = '';
  document.getElementById('search').value = '';
  setBuilderActive(true);
  pushURLState();
  render();

  // Focus the target field after the builder renders
  if (hint.focusField) {
    requestAnimationFrame(() => {
      const el = document.getElementById(hint.focusField);
      if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
  }
}

// ── Init ──────────────────────────────────────────────────
async function init() {
  // 1. Open the database
  await storage.init();

  // 2. Restore theme (from DB, fallback graceful)
  const savedTheme = await storage.getSetting('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('btn-theme').textContent = savedTheme === 'light' ? '☀' : '☾';
  }

  // 3. Load bookmarks, prompt history and read progress into memory
  _bookmarks     = await storage.getBookmarkedIds();
  _promptHistory = await storage.getPromptHistory();
  _readCards     = await storage.getReadIds();

  // 4. Apply URL state, then render
  readURLState();
  render(true);

  // 5. Auto-open card from URL (?card=X)
  if (state.openCardId) {
    _modalCards = getFilteredCards();
    if (!_modalCards.length) _modalCards = CARDS; // fallback: search all
    const idx = CARDS.findIndex(c => c.id === state.openCardId);
    if (idx !== -1) {
      _modalCards = CARDS;
      const visIdx = _modalCards.findIndex(c => c.id === state.openCardId);
      openModalAtIndex(visIdx);
    }
  }

  // Single delegated click listener for the card grid
  document.getElementById('content-area').addEventListener('click', onCardClick);

  // Delegated tag + action clicks inside the modal
  document.getElementById('modal').addEventListener('click', e => {
    const glossEl = e.target.closest('.glossary-link');
    if (glossEl) {
      const card = findGlossaryTerm(glossEl.dataset.glossary);
      if (card) {
        _modalCards = GLOSSARY_INDEX.map(entry => CARDS.find(c => c.id === entry.cardId)).filter(Boolean);
        openModalAtIndex(_modalCards.findIndex(c => c.id === card.id));
      }
    }
  });

  document.getElementById('category-bar').addEventListener('click', e => {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    const id = pill.dataset.id;
    if (state.builderActive) setBuilderActive(false);
    if (id === state.activeCategory && !state.builderActive) return;
    state.activeCategory = id;
    state.searchQuery = '';
    document.getElementById('search').value = '';
    pushURLState();
    render();
  });

  document.getElementById('level-bar').addEventListener('click', e => {
    const pill = e.target.closest('.lvl-pill');
    if (!pill) return;
    const id = pill.dataset.id;
    state.activeLevel = state.activeLevel === id ? 'all' : id;
    pushURLState();
    render();
  });

  document.getElementById('btn-builder').addEventListener('click', () => {
    setBuilderActive(!state.builderActive);
    if (!state.builderActive) {
      state.searchQuery = '';
      document.getElementById('search').value = '';
    }
    render();
  });

  const handleSearch = debounce(e => {
    state.searchQuery = e.target.value;
    if (state.builderActive) setBuilderActive(false);
    // La ruta guiada es una secuencia fija: buscar la saca de ese modo
    if (state.activeCategory === 'ruta' && state.searchQuery) state.activeCategory = 'all';
    pushURLState();
    render();
  }, 150);
  document.getElementById('search').addEventListener('input', handleSearch);

  document.getElementById('btn-theme').addEventListener('click', () => {
    const html    = document.documentElement;
    const isLight = html.getAttribute('data-theme') === 'light';
    const next    = isLight ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    document.getElementById('btn-theme').textContent = isLight ? '☾' : '☀';
    storage.setSetting('theme', next);
  });

  // El botón de cerrar se regenera en cada openModal() (ver ui.js), ahí se conecta.
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  document.addEventListener('keydown', e => {
    const inInput  = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    const modalOpen = !document.getElementById('modal-overlay').classList.contains('hidden');

    // ⌘K or / → focus search
    if (!inInput && (e.key === '/' || (e.metaKey && e.key === 'k'))) {
      e.preventDefault();
      const search = document.getElementById('search');
      search.focus();
      search.select();
      return;
    }

    // ⌘P → toggle Prompt Lab
    if (e.metaKey && e.key === 'p') {
      e.preventDefault();
      setBuilderActive(!state.builderActive);
      if (!state.builderActive) {
        state.searchQuery = '';
        document.getElementById('search').value = '';
      }
      render();
      return;
    }

    // Modal keyboard navigation
    if (e.key === 'Escape') { closeModal(); return; }
    if (!modalOpen) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (_modalIndex < _modalCards.length - 1) openModalAtIndex(_modalIndex + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (_modalIndex > 0) openModalAtIndex(_modalIndex - 1);
    }
  });
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  state.openCardId = null;
  pushURLState();
}

document.addEventListener('DOMContentLoaded', init);
