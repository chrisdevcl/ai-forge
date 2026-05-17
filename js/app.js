/* ── app.js ── estado central y eventos ──────────────────── */

const state = {
  activeCategory: 'all',
  searchQuery: '',
  builderActive: false,
};

function getFilteredCards() {
  const q = state.searchQuery.toLowerCase();
  return CARDS.filter(card => {
    const matchCat = state.activeCategory === 'all' || card.category === state.activeCategory;
    if (!matchCat) return false;
    if (!q) return true;
    return (
      card.title.toLowerCase().includes(q) ||
      card.summary.toLowerCase().includes(q) ||
      (card.tags || []).some(t => t.toLowerCase().includes(q))
    );
  });
}

function getCategoryCounts() {
  const counts = {};
  CARDS.forEach(card => { counts[card.category] = (counts[card.category] || 0) + 1; });
  return counts;
}

function updateHeader() {
  const catObj = CATEGORIES.find(c => c.id === state.activeCategory);
  const header  = document.getElementById('main-header');
  const titleEl = document.getElementById('current-category-title');
  const descEl  = document.getElementById('category-desc');

  if (state.builderActive) {
    header.classList.remove('hidden');
    titleEl.textContent = 'Prompt Lab';
    descEl.textContent  = 'Construye prompts estructurados listos para usar';
    return;
  }

  if (state.activeCategory === 'all') {
    header.classList.add('hidden');
    return;
  }

  header.classList.remove('hidden');
  titleEl.textContent = catObj ? catObj.label : '';
  descEl.textContent  = catObj && catObj.desc ? catObj.desc : '';
}

function setBuilderActive(active) {
  state.builderActive = active;
  document.getElementById('btn-builder').classList.toggle('active', active);
}

function render() {
  const counts = getCategoryCounts();
  renderCategoryBar(state.builderActive ? '' : state.activeCategory, counts);
  updateHeader();

  if (state.builderActive) {
    renderPromptBuilder();
    return;
  }

  const items = getFilteredCards();
  renderCards(items);
  document.getElementById('content-area').addEventListener('click', onCardClick);
}

function onCardClick(e) {
  const cardEl = e.target.closest('.card');
  if (!cardEl) return;
  const card = CARDS.find(c => c.id === cardEl.dataset.id);
  if (card) openModal(card);
}

function init() {
  render();

  document.getElementById('category-bar').addEventListener('click', e => {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    const id = pill.dataset.id;
    if (state.builderActive) setBuilderActive(false);
    if (id === state.activeCategory && !state.builderActive) return;
    state.activeCategory = id;
    state.searchQuery = '';
    document.getElementById('search').value = '';
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

  document.getElementById('search').addEventListener('input', e => {
    state.searchQuery = e.target.value;
    if (state.builderActive) {
      setBuilderActive(false);
      render();
      return;
    }
    renderCategoryBar(state.activeCategory, getCategoryCounts());
    renderCards(getFilteredCards());
    document.getElementById('content-area').addEventListener('click', onCardClick);
  });

  document.getElementById('btn-theme').addEventListener('click', () => {
    const html = document.documentElement;
    const isLight = html.getAttribute('data-theme') === 'light';
    html.setAttribute('data-theme', isLight ? 'dark' : 'light');
    document.getElementById('btn-theme').textContent = isLight ? '☾' : '☀';
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

document.addEventListener('DOMContentLoaded', init);
