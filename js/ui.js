/* ── ui.js ── rendering & modal ──────────────────────────── */

const FILTER_CATEGORIES = CATEGORIES.filter(c => c.id !== 'prompts');

function renderCategoryBar(activeId, counts) {
  const bar = document.getElementById('category-bar');
  bar.innerHTML = FILTER_CATEGORIES.map(cat => {
    const count = cat.id === 'all' ? CARDS.length : (counts[cat.id] || 0);
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

function renderCards(items) {
  const area = document.getElementById('content-area');

  if (!items.length) {
    area.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◌</div>
        <div>sin resultados</div>
      </div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.id = 'cards-grid';
  grid.innerHTML = items.map(card => {
    const color = CATEGORY_COLORS[card.category] || '#555';
    const typeLabel = TYPE_LABEL[card.type] || card.type;
    const tags = (card.tags || []).map(t => `<span class="card-tag">#${t}</span>`).join('');
    return `
      <div class="card" data-id="${card.id}" style="--cat-color:${color}">
        <div class="card-badge">${typeLabel}</div>
        <div class="card-title">${card.title}</div>
        <div class="card-summary">${card.summary}</div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        <span class="card-arrow">↗</span>
      </div>`;
  }).join('');

  area.innerHTML = '';
  area.appendChild(grid);
}

function openModal(card) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  const color = CATEGORY_COLORS[card.category] || '#555';
  const catObj = CATEGORIES.find(c => c.id === card.category) || {};
  const tags = (card.tags || []).map(t => `<span class="modal-tag">#${t}</span>`).join('');

  content.innerHTML = `
    <div class="modal-cat" style="color:${color}">${catObj.icon || ''} ${catObj.label || ''}</div>
    <div class="modal-title" style="color:${color}">${card.title}</div>
    <div class="modal-summary">${card.summary}</div>
    <div class="modal-body">${renderMarkdown(card.detail || '')}</div>
    ${tags ? `<div class="modal-tags">${tags}</div>` : ''}`;

  overlay.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
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
    line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith('```')) {
      if (!inPre) { flushList(); inPre = true; preContent = ''; }
      else { html += `<pre><code>${preContent.trimEnd()}</code></pre>`; inPre = false; preContent = ''; }
      continue;
    }
    if (inPre) { preContent += raw + '\n'; continue; }

    if (/^###\s+/.test(line)) { flushList(); html += `<h3>${parseLine(line.replace(/^###\s+/, ''))}</h3>`; continue; }

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
