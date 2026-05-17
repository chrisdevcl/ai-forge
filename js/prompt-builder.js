/* ── prompt-builder.js ───────────────────────────────────── */

const TEMPLATES = {
  'Análisis de documento': {
    role: 'Eres un analista experto en síntesis de información técnica y de negocio.',
    context: 'Tengo un documento que necesito analizar en profundidad.',
    task: 'Analiza el documento adjunto. Identifica los puntos clave, argumentos principales, posibles inconsistencias y conclusiones relevantes.',
    format: 'structured',
    tone: 'professional',
    restrictions: 'No inventes información que no esté en el documento. Si algo no está claro, indícalo explícitamente con "no queda claro en el documento".',
    examples: '',
    cot: true,
    selfcheck: true,
  },
  'Code review': {
    role: 'Eres un senior engineer con experiencia en clean code, performance y seguridad.',
    context: 'Estoy haciendo una revisión de código antes de mergear a main.',
    task: 'Revisa el siguiente código. Identifica bugs, problemas de performance, vulnerabilidades de seguridad y oportunidades de mejora de legibilidad.',
    format: 'structured',
    tone: 'technical',
    restrictions: 'Sé específico: menciona línea o sección exacta. Diferencia explícitamente entre "debe cambiar" y "podría mejorar".',
    examples: '',
    cot: false,
    selfcheck: true,
  },
  'Debugging': {
    role: 'Eres un experto en debugging sistemático.',
    context: 'Tengo un bug que no logro reproducir de forma consistente.',
    task: 'Ayúdame a diagnosticar el problema. Analiza el error, propón hipótesis ordenadas por probabilidad y sugiere pasos concretos de verificación para cada una.',
    format: 'steps',
    tone: 'technical',
    restrictions: 'No asumas la causa sin evidencia. Cada hipótesis debe tener un test concreto para validarla o descartarla.',
    examples: '',
    cot: true,
    selfcheck: false,
  },
  'Brainstorming': {
    role: 'Eres un facilitador creativo con pensamiento lateral.',
    context: 'Necesito generar ideas sin filtro inicial.',
    task: 'Genera ideas diversas y no obvias sobre el tema. Incluye tanto opciones conservadoras como ideas disruptivas.',
    format: 'list',
    tone: 'creative',
    restrictions: 'Evita ideas genéricas o de relleno. Prefiero 5 ideas genuinamente diferentes a 20 variaciones del mismo concepto.',
    examples: '',
    cot: false,
    selfcheck: false,
  },
  'Explicación técnica': {
    role: 'Eres un docente técnico que explica conceptos complejos con claridad y sin condescendencia.',
    context: 'Necesito entender un concepto técnico para poder aplicarlo.',
    task: 'Explica el concepto de forma progresiva: definición precisa, mecanismo interno, casos de uso reales y errores comunes al usarlo.',
    format: 'structured',
    tone: 'educational',
    restrictions: 'No uses analogías infantiles. El lector tiene experiencia técnica general aunque no conozca este tema específico.',
    examples: '',
    cot: false,
    selfcheck: true,
  },
};

const FORMAT_OPTIONS = [
  { value: '',           label: 'Libre',                   instruction: '' },
  { value: 'structured', label: 'Secciones',               instruction: 'Usa secciones claramente delimitadas con headers Markdown (##). Cada sección debe tener un título descriptivo. No mezcles contenido de distintas secciones.' },
  { value: 'steps',      label: 'Paso a paso',             instruction: 'Responde con pasos numerados secuencialmente. Cada paso debe ser una acción concreta y verificable. No combines múltiples acciones en un mismo paso.' },
  { value: 'list',       label: 'Lista de puntos',         instruction: 'Usa listas con viñetas. Cada punto debe ser independiente y autocontenido. Evita repetición entre puntos.' },
  { value: 'json',       label: 'JSON',                    instruction: 'Responde ÚNICAMENTE con JSON válido. Sin texto antes ni después. Sin backticks ni bloques de código. El JSON debe ser parseable directamente.' },
  { value: 'markdown',   label: 'Markdown',                instruction: 'Formatea usando Markdown completo: headers (##, ###), bold (**), listas, y bloques de código (```) donde corresponda.' },
];

const TONE_OPTIONS = [
  { value: '',             label: 'Neutral',                 instruction: '' },
  { value: 'professional', label: 'Profesional',             instruction: 'Tono profesional y formal. Apropiado para presentar a stakeholders. Evita coloquialismos.' },
  { value: 'technical',    label: 'Técnico',                 instruction: 'Tono técnico y directo. Asume que el lector tiene experiencia en el dominio. Sin simplificaciones innecesarias.' },
  { value: 'educational',  label: 'Educativo',               instruction: 'Tono pedagógico y progresivo. Define los términos cuando los introduzcas por primera vez.' },
  { value: 'creative',     label: 'Creativo',                instruction: 'Tono exploratorio y abierto. Prioriza ideas no obvias sobre las predecibles.' },
  { value: 'concise',      label: 'Conciso',                 instruction: 'Respuestas directas y breves. Sin preambles, rodeos ni repeticiones. Máxima información por token.' },
];

const MODEL_OPTIONS = [
  { value: 'claude-opus-4',   label: 'Claude Opus 4' },
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
  { value: 'claude-haiku',    label: 'Claude Haiku' },
  { value: 'gpt-4o',          label: 'GPT-4o' },
  { value: 'gpt-4o-mini',     label: 'GPT-4o mini' },
  { value: 'gemini-2.5-pro',  label: 'Gemini 2.5 Pro' },
  { value: 'deepseek-r1',     label: 'DeepSeek R1' },
];

function renderPromptBuilder() {
  const area = document.getElementById('content-area');

  const formatOpts = FORMAT_OPTIONS.map(o =>
    `<option value="${o.value}">${o.label}</option>`).join('');
  const toneOpts = TONE_OPTIONS.map(o =>
    `<option value="${o.value}">${o.label}</option>`).join('');
  const modelOpts = MODEL_OPTIONS.map(o =>
    `<option value="${o.value}">${o.label}</option>`).join('');
  const tplChips = Object.keys(TEMPLATES).map(name =>
    `<button class="tpl-chip" data-tpl="${name}">${name}</button>`).join('');

  area.innerHTML = `
    <div id="prompt-builder">

      <div class="builder-tabs" role="tablist">
        <button class="builder-tab active" data-panel="form" role="tab">⚙ Construir prompt</button>
        <button class="builder-tab" data-panel="preview" role="tab">
          ◎ Ver resultado
          <span class="tab-token-badge" id="tab-token-count"></span>
        </button>
      </div>

      <div class="builder-panels">

        <div class="builder-form" id="builder-panel-form">

          <div>
            <div class="field-label" style="margin-bottom:8px">Templates rápidos</div>
            <div class="templates-row">${tplChips}</div>
          </div>

          <div class="field-row-2">
            <div class="field-group">
              <label class="field-label" for="b-model">Modelo objetivo</label>
              <select class="b-select" id="b-model">${modelOpts}</select>
            </div>
            <div class="field-group">
              <label class="field-label" for="b-tone">Tono</label>
              <select class="b-select" id="b-tone">${toneOpts}</select>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label" for="b-role">Rol</label>
            <span class="field-hint">Quién es el modelo en esta tarea</span>
            <input class="b-input" id="b-role" type="text" placeholder="Ej: Eres un senior engineer especializado en TypeScript...">
          </div>

          <div class="field-group">
            <label class="field-label" for="b-context">Contexto</label>
            <span class="field-hint">Información de fondo que el modelo necesita conocer</span>
            <textarea class="b-textarea" id="b-context" placeholder="Ej: Estoy trabajando en una app Angular con arquitectura standalone..."></textarea>
          </div>

          <div class="field-group">
            <label class="field-label" for="b-task">Tarea</label>
            <span class="field-hint">Qué debe hacer exactamente — cuanto más específico, mejor</span>
            <textarea class="b-textarea b-textarea--tall" id="b-task" placeholder="Ej: Refactoriza el siguiente componente para que use signals en lugar de BehaviorSubject..."></textarea>
          </div>

          <div class="field-row-2">
            <div class="field-group">
              <label class="field-label" for="b-format">Formato de salida</label>
              <select class="b-select" id="b-format">${formatOpts}</select>
            </div>
            <div class="field-group">
              <label class="field-label">Técnicas</label>
              <div class="options-row">
                <label class="check-option">
                  <input type="checkbox" id="b-cot">
                  Chain of Thought
                </label>
                <label class="check-option">
                  <input type="checkbox" id="b-selfcheck">
                  Auto-verificación
                </label>
              </div>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label" for="b-restrictions">Restricciones</label>
            <span class="field-hint">Qué NO debe hacer, o límites explícitos</span>
            <textarea class="b-textarea" id="b-restrictions" placeholder="Ej: No uses librerías externas. No refactorices lo que no mencioné."></textarea>
          </div>

          <div class="field-group">
            <label class="field-label" for="b-examples">Ejemplos (few-shot)</label>
            <span class="field-hint">Input/output de ejemplo — 2 o 3 valen más que mil palabras</span>
            <textarea class="b-textarea" id="b-examples" placeholder="Input: [ejemplo]\nOutput esperado: [resultado]"></textarea>
          </div>

        </div>

        <div class="builder-sidebar" id="builder-panel-preview">
          <div class="preview-header">
            <div class="preview-title">Prompt generado</div>
            <div class="preview-tokens" id="token-count">~0 tokens</div>
          </div>
          <div class="preview-box" id="prompt-preview">
            <span class="preview-placeholder">Completa el formulario y el prompt aparecerá aquí...</span>
          </div>
          <div class="preview-actions">
            <button class="btn btn-primary" id="btn-copy">Copiar prompt</button>
            <button class="btn" id="btn-clear">Limpiar</button>
            <span class="copy-ok" id="copy-ok">✓ copiado</span>
          </div>
        </div>

      </div>
    </div>`;

  initBuilderListeners();
  initBuilderTabs();
  initBuilderResize();
}

function initBuilderTabs() {
  document.querySelectorAll('.builder-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.builder-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const panel = btn.dataset.panel;
      document.getElementById('builder-panel-form').classList.toggle('tab-hidden', panel !== 'form');
      document.getElementById('builder-panel-preview').classList.toggle('tab-hidden', panel !== 'preview');
    });
  });
}

function initBuilderResize() {
  const builder = document.getElementById('prompt-builder');
  if (!builder) return;

  const applyNarrow = (isNarrow) => {
    builder.classList.toggle('narrow', isNarrow);
    if (isNarrow) {
      // Aplica estado inicial: form visible, preview oculto
      const activePanel = document.querySelector('.builder-tab.active')?.dataset.panel || 'form';
      document.getElementById('builder-panel-form').classList.toggle('tab-hidden', activePanel !== 'form');
      document.getElementById('builder-panel-preview').classList.toggle('tab-hidden', activePanel !== 'preview');
    } else {
      document.getElementById('builder-panel-form').classList.remove('tab-hidden');
      document.getElementById('builder-panel-preview').classList.remove('tab-hidden');
    }
  };

  const ro = new ResizeObserver(entries => {
    applyNarrow(entries[0].contentRect.width < 620);
  });
  ro.observe(builder);
}

function initBuilderListeners() {
  const ids = ['b-role', 'b-context', 'b-task', 'b-restrictions', 'b-examples',
               'b-model', 'b-format', 'b-tone', 'b-cot', 'b-selfcheck'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', assemblePrompt);
      el.addEventListener('change', assemblePrompt);
    }
  });

  document.querySelectorAll('.tpl-chip').forEach(btn => {
    btn.addEventListener('click', () => loadTemplate(btn.dataset.tpl));
  });

  document.getElementById('btn-copy').addEventListener('click', copyPrompt);
  document.getElementById('btn-clear').addEventListener('click', clearBuilder);
}

function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  if (el.type === 'checkbox') return el.checked;
  return el.value.trim();
}

function xmlTag(tag, content) {
  return `<${tag}>\n${content}\n</${tag}>`;
}

function assemblePrompt() {
  const role         = getVal('b-role');
  const context      = getVal('b-context');
  const task         = getVal('b-task');
  const format       = getVal('b-format');
  const tone         = getVal('b-tone');
  const restrictions = getVal('b-restrictions');
  const examples     = getVal('b-examples');
  const cot          = getVal('b-cot');
  const selfcheck    = getVal('b-selfcheck');

  const parts = [];

  if (role)    parts.push(xmlTag('rol', role));
  if (context) parts.push(xmlTag('contexto', context));
  if (task)    parts.push(xmlTag('tarea', task));

  const fmtObj = FORMAT_OPTIONS.find(o => o.value === format);
  if (fmtObj && fmtObj.instruction) parts.push(xmlTag('formato', fmtObj.instruction));

  const toneObj = TONE_OPTIONS.find(o => o.value === tone);
  if (toneObj && toneObj.instruction) parts.push(xmlTag('tono', toneObj.instruction));

  if (restrictions) parts.push(xmlTag('restricciones', restrictions));

  if (examples) parts.push(xmlTag('ejemplos', examples));

  if (cot) parts.push(xmlTag('razonamiento',
    'Piensa paso a paso antes de responder. Muestra tu proceso de razonamiento de forma explícita antes de dar la respuesta final.'));

  if (selfcheck) parts.push(xmlTag('verificacion',
    'Antes de responder, revisa tu propio output: ¿cumple la tarea al pie de la letra? ¿hay errores o imprecisiones? ¿respeta todas las restricciones? Corrige antes de entregar la respuesta final.'));

  const preview = document.getElementById('prompt-preview');
  const tokenEl = document.getElementById('token-count');
  const tabBadge = document.getElementById('tab-token-count');

  if (!parts.length) {
    preview.innerHTML = '<span class="preview-placeholder">Completa el formulario y el prompt aparecerá aquí...</span>';
    tokenEl.textContent = '~0 tokens';
    if (tabBadge) tabBadge.textContent = '';
    return;
  }

  const fullText = parts.join('\n\n');
  preview.textContent = fullText;

  const approxTokens = Math.ceil(fullText.length / 3.8);
  const tokenLabel = `~${approxTokens.toLocaleString()} tokens`;
  tokenEl.textContent = tokenLabel;
  if (tabBadge) tabBadge.textContent = tokenLabel;
}

function copyPrompt() {
  const text = document.getElementById('prompt-preview').textContent;
  if (!text || text.includes('aparecerá aquí')) return;
  navigator.clipboard.writeText(text).then(() => {
    const ok = document.getElementById('copy-ok');
    ok.classList.add('show');
    setTimeout(() => ok.classList.remove('show'), 2000);
  });
}

function clearBuilder() {
  ['b-role', 'b-context', 'b-task', 'b-restrictions', 'b-examples'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['b-format', 'b-tone', 'b-model'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  ['b-cot', 'b-selfcheck'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  assemblePrompt();
}

function loadTemplate(name) {
  const tpl = TEMPLATES[name];
  if (!tpl) return;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = val;
    else el.value = val;
  };
  set('b-role', tpl.role);
  set('b-context', tpl.context);
  set('b-task', tpl.task);
  set('b-format', tpl.format);
  set('b-tone', tpl.tone);
  set('b-restrictions', tpl.restrictions);
  set('b-examples', tpl.examples);
  set('b-cot', tpl.cot);
  set('b-selfcheck', tpl.selfcheck);
  assemblePrompt();
}
