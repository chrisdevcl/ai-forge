/* ── ui.js ── rendering & modal ──────────────────────────── */

// All categories except the virtual/special ones that are never in the pill bar
const FILTER_CATEGORIES = CATEGORIES.filter(c => c.id !== 'prompts');

// ── Category bar ──────────────────────────────────────────
function renderCategoryBar(activeId, counts, showFavorites = false) {
  const bar  = document.getElementById('category-bar');
  const cats = FILTER_CATEGORIES.filter(c => c.id !== 'favoritos' || showFavorites);

  bar.innerHTML = cats.map(cat => {
    const count = (() => {
      if (cat.id === 'all') {
        return Object.entries(counts)
          .filter(([k]) => k !== 'favoritos')
          .reduce((acc, [, v]) => acc + v, 0);
      }
      return counts[cat.id] || 0;
    })();
    const color = CATEGORY_COLORS[cat.id] || 'var(--accent)';
    return `
      <div class="cat-pill${activeId === cat.id ? ' active' : ''}"
           data-id="${cat.id}"
           style="--cat-color:${color}">
        <span class="cat-pill-icon">${cat.icon}</span>
        <span>${cat.label}</span>
        <span class="cat-pill-count">${count}</span>
      </div>`;
  }).join('');
}

// ── Dot meter (usado por nivel: 1-3 puntos llenos, sin color propio) ──
function dotMeterHTML(rank, total = 3) {
  let dots = '';
  for (let i = 1; i <= total; i++) {
    dots += `<span class="dot${i <= rank ? ' filled' : ''}"></span>`;
  }
  return `<span class="dot-meter">${dots}</span>`;
}

// ── Level bar ─────────────────────────────────────────────
function renderLevelBar(activeId, counts, visible = true) {
  const bar = document.getElementById('level-bar');
  bar.classList.toggle('hidden', !visible);
  if (!visible) { bar.innerHTML = ''; return; }

  bar.innerHTML = LEVELS.map(lvl => {
    const count = counts[lvl.id] || 0;
    return `
      <div class="lvl-pill${activeId === lvl.id ? ' active' : ''}"
           data-id="${lvl.id}"
           title="${lvl.desc}">
        ${dotMeterHTML(lvl.rank)}
        <span>${lvl.label}</span>
        <span class="lvl-pill-count">${count}</span>
      </div>`;
  }).join('');
}

function levelBadgeHTML(levelId) {
  if (!levelId) return '';
  const lvl = LEVELS.find(l => l.id === levelId);
  if (!lvl) return '';
  return `<span class="level-badge" title="${lvl.desc}">${dotMeterHTML(lvl.rank)} ${lvl.label}</span>`;
}

// ── Home banner (entrada a la ruta guiada, no es una categoría) ──
function renderHomeBannerHTML() {
  const read = BASIC_PATH.filter(id => _readCards.has(id)).length;
  const progress = read ? ` — ${read}/${BASIC_PATH.length} leídas` : '';
  return `
    <button class="home-banner" data-action="start-guide">
      <span class="home-banner-icon">➜</span>
      <span class="home-banner-text">
        <span class="home-banner-title">¿Nuevo aquí? Empieza desde cero</span>
        <span class="home-banner-desc">Recorre los ${BASIC_PATH.length} conceptos básicos en el orden recomendado${progress}</span>
      </span>  
    </button>`;
}

// ── Glosario: lista compacta (no duplica las tarjetas completas) ──
function renderGlossaryList(query = '') {
  const area = document.getElementById('content-area');
  const q = query.toLowerCase().trim();
  const entries = GLOSSARY_INDEX
    .filter(e => !q || e.term.toLowerCase().includes(q) || e.def.toLowerCase().includes(q))
    .slice()
    .sort((a, b) => a.term.localeCompare(b.term, 'es'));

  if (!entries.length) {
    area.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◌</div>
        <div class="empty-label">sin resultados</div>
      </div>`;
    return;
  }

  area.innerHTML = `
    <div class="glossary-list">
      ${entries.map(e => `
        <button class="glossary-row" data-card-id="${e.cardId}">
          <span class="glossary-term">${e.term}</span>
          <span class="glossary-def">${e.def}</span>
          <span class="glossary-goto">Ver más ↗</span>
        </button>`).join('')}
    </div>`;
}

// ── Cards grid ────────────────────────────────────────────
function renderCards(items, animate = false, bookmarks = new Set(), bannerHTML = '') {
  const area = document.getElementById('content-area');

  if (!items.length) {
    // Empty state with curated search suggestions (SUGGESTED_SEARCHES defined in app.js)
    const chips = (typeof SUGGESTED_SEARCHES !== 'undefined' ? SUGGESTED_SEARCHES : [])
      .map(s => `<span class="empty-suggestion" data-search="${s}">${s}</span>`)
      .join('');
    area.innerHTML = `${bannerHTML}
      <div class="empty-state">
        <div class="empty-icon">◌</div>
        <div class="empty-label">sin resultados</div>
        ${chips ? `<div class="empty-suggestions"><span class="empty-hint">Prueba con:</span>${chips}</div>` : ''}
      </div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.id = 'cards-grid';
  if (animate) grid.classList.add('animated');

  grid.innerHTML = items.map(card => {
    const color      = CATEGORY_COLORS[card.category] || '#555';
    const typeLabel  = TYPE_LABEL[card.type] || card.type;
    const isBookmarked = bookmarks.has(card.id);
    return `
      <div class="card" data-id="${card.id}" style="--cat-color:${color}">
        <button class="card-bookmark${isBookmarked ? ' is-bookmarked' : ''}"
                data-id="${card.id}"
                aria-label="${isBookmarked ? 'Quitar de favoritos' : 'Guardar en favoritos'}"
        >${isBookmarked ? '♥' : '♡'}</button>
        <div class="card-badges">
          <div class="card-badge">${typeLabel}</div>
          ${levelBadgeHTML(card.level)}
        </div>
        <div class="card-title">${card.title}</div>
        <div class="card-summary">${card.summary}</div>
        <span class="card-arrow">↗</span>
      </div>`;
  }).join('');

  area.innerHTML = bannerHTML;
  area.appendChild(grid);
}

// ── Modal ─────────────────────────────────────────────────
// El cierre, guardar/copiar/CTA y la paginación son overlays flotantes
// (position: absolute) sobre #modal-content — no reservan espacio propio
// ni empujan el layout, así el modal se ve como una sola superficie.
// Todos los botones llevan `title` para tooltip nativo. El CTA de Prompt
// Lab es situacional y se integra en la misma barra flotante de arriba
// en vez de tener la suya propia.
function openModal(card, index = -1, total = 0, isBookmarked = false) {
  const overlay    = document.getElementById('modal-overlay');
  const navBar     = document.getElementById('modal-nav-bar');
  const content    = document.getElementById('modal-content');
  const actionsBar = document.getElementById('modal-actions-bar');
  const color      = CATEGORY_COLORS[card.category] || '#555';
  const catObj     = CATEGORIES.find(c => c.id === card.category) || {};

  const showNav = index !== -1 && total > 1;

  // ── Paginación (flotante, abajo, ocupa todo el ancho con space-between) ──
  navBar.hidden = !showNav;
  if (showNav) {
    navBar.innerHTML = `
      <button class="mnav-btn${index === 0 ? ' disabled' : ''}"
              id="modal-prev" ${index === 0 ? 'disabled' : ''}
              title="Anterior" aria-label="Anterior">
        <span class="mnav-arrow">←</span>
        <span class="mnav-label">Anterior</span>
      </button>
      <span class="mnav-pos">${index + 1}<span class="mnav-sep">/</span>${total}</span>
      <button class="mnav-btn${index === total - 1 ? ' disabled' : ''}"
              id="modal-next" ${index === total - 1 ? 'disabled' : ''}
              title="Siguiente" aria-label="Siguiente">
        <span class="mnav-label">Siguiente</span>
        <span class="mnav-arrow">→</span>
      </button>`;
  }

  // ── Contenido scrollable ──────────────────────────────
  content.innerHTML = `
    <div class="modal-cat-row">
      <div class="modal-cat" style="color:${color}">${catObj.icon || ''} ${catObj.label || ''}</div>
      ${levelBadgeHTML(card.level)}
    </div>
    <div class="modal-title" style="color:${color}">${card.title}</div>
    <div class="modal-summary">${card.summary}</div>
    <div class="modal-body">${renderMarkdown(card.detail || '')}</div>`;

  // ── Acciones (flotante, arriba a la derecha) ───────────
  // El CTA de Prompt Lab va primero (más a la izquierda del grupo) porque
  // es situacional; Guardar/Compartir/Copiar/Cerrar son siempre los mismos
  // y van después, en ese orden fijo.
  const labLabel = card.builderHint ? (card.builderHint.label || 'Usar en Prompt Lab') : '';
  actionsBar.innerHTML = `
    ${card.builderHint ? `
      <button class="mact-btn mact-lab" id="modal-use-lab-btn" title="${labLabel}" aria-label="${labLabel}">
        <span class="mact-icon">⌘</span>
      </button>` : ''}
    <button class="mact-btn mact-bookmark${isBookmarked ? ' is-bookmarked' : ''}"
            id="modal-bookmark-btn" data-id="${card.id}"
            title="${isBookmarked ? 'Quitar de favoritos' : 'Guardar en favoritos'}"
            aria-label="${isBookmarked ? 'Quitar de favoritos' : 'Guardar en favoritos'}">
      <span class="mact-icon">${isBookmarked ? '♥' : '♡'}</span>
    </button>
    <button class="mact-btn mact-share" id="modal-share-btn" title="Compartir enlace directo" aria-label="Compartir enlace directo">
      <span class="mact-icon">⤴</span>
    </button>
    <button class="mact-btn mact-copy" id="modal-copy-btn" title="Copiar contenido" aria-label="Copiar contenido">
      <span class="mact-icon">⎘</span>
    </button>
    <span class="mact-toast" id="modal-toast"></span>
    <button class="mact-btn mact-close" id="modal-close" title="Cerrar" aria-label="Cerrar">
      <span class="mact-icon">✕</span>
    </button>`;

  // ── Conectar botones ──────────────────────────────────
  const prevBtn     = document.getElementById('modal-prev');
  const nextBtn     = document.getElementById('modal-next');
  const copyBtn     = document.getElementById('modal-copy-btn');
  const shareBtn    = document.getElementById('modal-share-btn');
  const bookmarkBtn = document.getElementById('modal-bookmark-btn');
  const closeBtn    = document.getElementById('modal-close');
  const useLabBtn   = document.getElementById('modal-use-lab-btn');

  if (prevBtn) prevBtn.addEventListener('click', () => openModalAtIndex(index - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => openModalAtIndex(index + 1));

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(card.detail || '')
        .then(() => showModalToast('✓ copiado'))
        .catch(() => {});
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', () => shareCard(card)); // global in app.js
  }

  if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', () => toggleBookmark(card.id)); // global in app.js
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeModal()); // global in app.js
  }

  if (useLabBtn && card.builderHint) {
    useLabBtn.addEventListener('click', () => useInPromptLab(card.builderHint)); // global in app.js
  }

  overlay.classList.remove('hidden');
}

// Toast breve junto al grupo de acciones flotante (copiar, compartir, etc.)
function showModalToast(text) {
  const toast = document.getElementById('modal-toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showModalToast._t);
  showModalToast._t = setTimeout(() => toast.classList.remove('show'), 2000);
}

// ── Markdown renderer ─────────────────────────────────────
// Escapa caracteres HTML antes de aplicar las transformaciones de markdown,
// para que texto de ejemplo como <role> o <task> se vea como texto y no
// desaparezca al ser interpretado como una etiqueta HTML real.
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarkdown(text) {
  if (!text) return '';
  const lines = text.trim().split('\n');
  let html = '';
  let inPre = false;
  let preContent = '';
  let inList = false;
  let listType = '';

  const flushList = () => {
    if (inList) { html += `</${listType}>`; inList = false; listType = ''; }
  };

  const parseLine = (line) =>
    escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/`([^`]+)`/g,     '<code>$1</code>')
      .replace(/\[\[(.+?)]]/g, '<button class="glossary-link" data-glossary="$1">$1</button>');

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith('```')) {
      if (!inPre) { flushList(); inPre = true; preContent = ''; }
      else { html += `<pre><code>${escapeHtml(preContent.trimEnd())}</code></pre>`; inPre = false; preContent = ''; }
      continue;
    }
    if (inPre) { preContent += raw + '\n'; continue; }

    if (/^###\s+/.test(line)) { flushList(); html += `<h3>${parseLine(line.replace(/^###\s+/, ''))}</h3>`; continue; }
    if (/^##\s+/.test(line))  { flushList(); html += `<h2>${parseLine(line.replace(/^##\s+/,  ''))}</h2>`; continue; }

    if (/^- /.test(line)) {
      if (!inList || listType !== 'ul') { flushList(); html += '<ul>'; inList = true; listType = 'ul'; }
      html += `<li>${parseLine(line.slice(2))}</li>`; continue;
    }

    if (/^\d+\.\s/.test(line)) {
      if (!inList || listType !== 'ol') { flushList(); html += '<ol>'; inList = true; listType = 'ol'; }
      html += `<li>${parseLine(line.replace(/^\d+\.\s/, ''))}</li>`; continue;
    }

    if (line === '') { flushList(); continue; }

    flushList();
    html += `<p>${parseLine(line)}</p>`;
  }

  flushList();
  return html;
}

// ── Builder history refresh ───────────────────────────────
// Called from app.js after history changes; only updates the
// history section inside the builder without re-rendering everything.
function refreshBuilderHistory() {
  const section = document.getElementById('builder-history');
  if (!section) return; // builder not currently visible
  section.outerHTML = buildHistoryHTML();
}

function buildHistoryHTML() {
  if (!_promptHistory || !_promptHistory.length) return '<div id="builder-history"></div>';
  const chips = _promptHistory.map(p => `
    <div class="history-chip" data-id="${p.id}">
      <button class="history-load" data-id="${p.id}" title="${p.label}">⟳ ${p.label}</button>
      <button class="history-delete" data-id="${p.id}" aria-label="Eliminar">×</button>
    </div>`).join('');
  return `
    <div id="builder-history">
      <div class="field-label" style="margin-bottom:6px">Recientes</div>
      <div class="history-row">${chips}</div>
    </div>`;
}
