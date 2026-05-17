/* ── prompt-builder.js ───────────────────────────────────── */

const TEMPLATES = {
  'Análisis de documento': {
    role: 'Eres un analista experto en síntesis de información técnica y de negocio.',
    context: 'Tengo un documento que necesito analizar en profundidad.',
    task: 'Analiza el documento adjunto. Identifica los puntos clave, argumentos principales, posibles inconsistencias y conclusiones relevantes.',
    format: 'structured',
    tone: 'professional',
    restrictions: 'No inventes información que no esté en el documento. Si algo no está claro, indícalo explícitamente.',
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
    restrictions: 'Sé específico: menciona línea o sección exacta. Diferencia entre "debe cambiar" y "podría mejorar".',
    examples: '',
    cot: false,
    selfcheck: true,
  },
  'Debugging': {
    role: 'Eres un experto en debugging sistemático.',
    context: 'Tengo un bug que no logro reproducir de forma consistente.',
    task: 'Ayúdame a diagnosticar el problema. Analiza el error, propón hipótesis ordenadas por probabilidad y sugiere pasos de verificación.',
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
    task: 'Explica el concepto de forma progresiva: definición básica, mecanismo interno, casos de uso reales y errores comunes al usarlo.',
    format: 'structured',
    tone: 'educational',
    restrictions: 'No uses analogías infantiles. El lector tiene experiencia técnica general aunque no conozca este tema específico.',
    examples: '',
    cot: false,
    selfcheck: true,
  },
};

const FORMAT_OPTIONS = [
  { value: '',           label: 'Libre (sin restricción)' },
  { value: 'structured', label: 'Estructurado con secciones' },
  { value: 'steps',      label: 'Paso a paso numerado' },
  { value: 'list',       label: 'Lista de puntos' },
  { value: 'json',       label: 'JSON estructurado' },
  { value: 'markdown',   label: 'Markdown formateado' },
];

const TONE_OPTIONS = [
  { value: '',             label: 'Neutral' },
  { value: 'professional', label: 'Profesional y formal' },
  { value: 'technical',    label: 'Técnico y preciso' },
  { value: 'educational',  label: 'Educativo y claro' },
  { value: 'creative',     label: 'Creativo y exploratorio' },
  { value: 'concise',      label: 'Conciso y directo' },
];

const MODEL_OPTIONS = [
  { value: 'claude-opus-4',        label: 'Claude Opus 4 (máxima capacidad)' },
  { value: 'claude-sonnet-4',      label: 'Claude Sonnet 4 (equilibrado)' },
  { value: 'claude-haiku',         label: 'Claude Haiku (rápido y económico)' },
  { value: 'gpt-4o',               label: 'GPT-4o' },
  { value: 'gpt-4o-mini',          label: 'GPT-4o mini' },
  { value: 'gemini-2.5-pro',       label: 'Gemini 2.5 Pro' },
  { value: 'deepseek-r1',          label: 'DeepSeek R1' },
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
      <div class="builder-form" id="builder-form">

        <div>
          <div class="builder-section-title">Constructor de Prompts</div>
          <div class="builder-section-sub">Completa los campos y obtén un prompt estructurado listo para usar</div>
        </div>

        <div>
          <div class="field-label" style="margin-bottom:8px">Templates</div>
          <div class="templates-row">${tplChips}</div>
        </div>

        <div class="field-group">
          <label class="field-label" for="b-model">Modelo objetivo</label>
          <select class="b-select" id="b-model">${modelOpts}</select>
        </div>

        <div class="field-group">
          <label class="field-label" for="b-role">Rol / Persona</label>
          <span class="field-hint">Define quién es el modelo en esta tarea</span>
          <input class="b-input" id="b-role" type="text" placeholder="Ej: Eres un senior engineer especializado en TypeScript...">
        </div>

        <div class="field-group">
          <label class="field-label" for="b-context">Contexto</label>
          <span class="field-hint">Información de fondo que el modelo necesita saber</span>
          <textarea class="b-textarea" id="b-context" placeholder="Ej: Estoy trabajando en una app Angular con arquitectura standalone..."></textarea>
        </div>

        <div class="field-group">
          <label class="field-label" for="b-task">Tarea principal</label>
          <span class="field-hint">Qué debe hacer el modelo, lo más específico posible</span>
          <textarea class="b-textarea" id="b-task" style="min-height:96px" placeholder="Ej: Refactoriza el siguiente componente para..."></textarea>
        </div>

        <div class="field-group">
          <label class="field-label" for="b-format">Formato de salida</label>
          <select class="b-select" id="b-format">${formatOpts}</select>
        </div>

        <div class="field-group">
          <label class="field-label" for="b-tone">Tono</label>
          <select class="b-select" id="b-tone">${toneOpts}</select>
        </div>

        <div class="field-group">
          <label class="field-label" for="b-restrictions">Restricciones</label>
          <span class="field-hint">Qué NO debe hacer el modelo, o límites explícitos</span>
          <textarea class="b-textarea" id="b-restrictions" placeholder="Ej: No uses librerías externas. No refactorices partes que no mencioné."></textarea>
        </div>

        <div class="field-group">
          <label class="field-label" for="b-examples">Ejemplos (few-shot)</label>
          <span class="field-hint">Input/output de ejemplo para calibrar el comportamiento</span>
          <textarea class="b-textarea" id="b-examples" placeholder="Input: [ejemplo]\nOutput: [resultado esperado]"></textarea>
        </div>

        <div class="field-group">
          <label class="field-label">Técnicas adicionales</label>
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

      <div class="builder-sidebar">
        <div class="preview-header">
          <div class="preview-title">Preview</div>
          <div class="preview-tokens" id="token-count">~0 tokens</div>
        </div>
        <div class="preview-box" id="prompt-preview">
          <span class="preview-placeholder">El prompt aparecerá aquí mientras escribes...</span>
        </div>
        <div class="preview-actions">
          <button class="btn btn-primary" id="btn-copy">Copiar prompt</button>
          <button class="btn" id="btn-clear">Limpiar</button>
          <span class="copy-ok" id="copy-ok">✓ copiado</span>
        </div>
      </div>
    </div>`;

  initBuilderListeners();
}

function initBuilderListeners() {
  const inputs = ['b-role', 'b-context', 'b-task', 'b-restrictions', 'b-examples'];
  const selects = ['b-model', 'b-format', 'b-tone'];
  const checks = ['b-cot', 'b-selfcheck'];

  [...inputs, ...selects, ...checks].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', assemblePrompt);
    if (el) el.addEventListener('change', assemblePrompt);
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

  if (role) parts.push(`# ROL\n${role}`);
  if (context) parts.push(`# CONTEXTO\n${context}`);
  if (task) parts.push(`# TAREA\n${task}`);

  if (format) {
    const fmt = FORMAT_OPTIONS.find(o => o.value === format);
    parts.push(`# FORMATO DE SALIDA\n${fmt ? fmt.label : format}`);
  }

  if (tone) {
    const tn = TONE_OPTIONS.find(o => o.value === tone);
    parts.push(`# TONO\n${tn ? tn.label : tone}`);
  }

  if (restrictions) parts.push(`# RESTRICCIONES\n${restrictions}`);

  if (examples) parts.push(`# EJEMPLOS\n${examples}`);

  if (cot) parts.push(`# INSTRUCCIÓN DE RAZONAMIENTO\nAntes de responder, razona paso a paso internamente. Muestra tu proceso de pensamiento antes de la respuesta final.`);

  if (selfcheck) parts.push(`# AUTO-VERIFICACIÓN\nAntes de entregar la respuesta final, revisa tu propio output: ¿cumple la tarea? ¿hay errores? ¿respeta las restricciones? Corrige si es necesario.`);

  const preview = document.getElementById('prompt-preview');
  const tokenEl = document.getElementById('token-count');

  if (!parts.length) {
    preview.innerHTML = '<span class="preview-placeholder">El prompt aparecerá aquí mientras escribes...</span>';
    tokenEl.textContent = '~0 tokens';
    return;
  }

  const fullText = parts.join('\n\n');
  preview.textContent = fullText;

  const approxTokens = Math.ceil(fullText.length / 3.8);
  tokenEl.textContent = `~${approxTokens.toLocaleString()} tokens`;
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
  ['b-format', 'b-tone'].forEach(id => {
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
