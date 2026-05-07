// ─── Constants ─────────────────────────────────────────────────────
const TEMPLATE_KEY = 'hourly-template-v1';
const CAT_KEY      = 'hourly-categories-v1';
const TOTAL_SLOTS  = 48;
const SLOT_H_PX    = 28; // must match CSS --slot-h

// Fixed day labels — no real calendar dates
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PALETTE = [
  '#2563eb', // blue-600
  '#059669', // emerald-600
  '#db2777', // pink-600
  '#7c3aed', // violet-600
  '#0891b2', // cyan-600
  '#ea580c', // orange-600
  '#dc2626', // red-600
  '#c026d3', // fuchsia-600
  '#0f766e', // teal-700
  '#475569', // slate-600
];

// ─── Categories storage ────────────────────────────────────────────

function loadCategories() {
  try { return JSON.parse(localStorage.getItem(CAT_KEY) ?? '{}'); }
  catch { return {}; }
}

function saveCategories(cats) {
  localStorage.setItem(CAT_KEY, JSON.stringify(cats));
}

function createCategory(name, color) {
  const cats = loadCategories();
  const id = crypto.randomUUID();
  cats[id] = { name: name.trim(), color };
  saveCategories(cats);
  return id;
}

// ─── Template storage (one persistent week template) ───────────────

function loadTemplate() {
  try {
    const raw = JSON.parse(localStorage.getItem(TEMPLATE_KEY) ?? '{}');
    // raw is { "0": entries, "1": entries, … "6": entries }
    return Array.from({ length: 7 }, (_, i) => raw[i] ?? {});
  } catch {
    return Array.from({ length: 7 }, () => ({}));
  }
}

function saveTemplate() {
  const out = {};
  state.allEntries.forEach((entries, i) => {
    if (Object.keys(entries).length > 0) out[i] = entries;
  });
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(out));
}

// ─── Helpers ──────────────────────────────────────────────────────

function slotToTime(i) {
  const h = String(Math.floor((i * 30) / 60)).padStart(2, '0');
  const m = (i * 30) % 60 === 0 ? '00' : '30';
  return `${h}:${m}`;
}

function formatDuration(slots) {
  const min = slots * 30;
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── App state ─────────────────────────────────────────────────────

const state = {
  allEntries:    [],   // [7] { [slotIdx]: { categoryId } }
  activeTool:    null, // null | 'erase' | categoryId

  dragging:      false,
  dragStartDay:  null,
  dragEndDay:    null,
  dragStartSlot: null,
  dragEndSlot:   null,
  dragMode:      'fill',
};

// ─── DOM refs ──────────────────────────────────────────────────────

const weekScroll       = document.getElementById('week-scroll');
const btnNewCat        = document.getElementById('btn-new-cat');
const btnReset         = document.getElementById('btn-reset');
const catList          = document.getElementById('cat-list');
const eraserBtn        = document.getElementById('eraser-btn');
const sidebarTotal     = document.getElementById('sidebar-total');
const sidebarTotalVal  = document.getElementById('sidebar-total-value');

const modalOverlay     = document.getElementById('modal-overlay');
const catNameInput     = document.getElementById('cat-name-input');
const catColorSwatches = document.getElementById('cat-color-swatches');
const modalCancel      = document.getElementById('modal-cancel');
const modalCreate      = document.getElementById('modal-create');

const confirmOverlay   = document.getElementById('confirm-overlay');
const confirmOk        = document.getElementById('confirm-ok');
const confirmCancel    = document.getElementById('confirm-cancel');

// ─── Category modal color swatches (built once) ────────────────────

let newCatColor = PALETTE[0];

PALETTE.forEach(color => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'color-swatch' + (color === newCatColor ? ' selected' : '');
  btn.style.background = color;
  btn.setAttribute('aria-label', `Color ${color}`);
  btn.setAttribute('role', 'option');
  btn.setAttribute('aria-selected', color === newCatColor ? 'true' : 'false');
  btn.dataset.color = color;
  btn.addEventListener('click', () => {
    newCatColor = color;
    catColorSwatches.querySelectorAll('.color-swatch').forEach(s => {
      const active = s.dataset.color === color;
      s.classList.toggle('selected', active);
      s.setAttribute('aria-selected', String(active));
    });
  });
  catColorSwatches.appendChild(btn);
});

// ─── Sidebar ───────────────────────────────────────────────────────

function renderSidebar() {
  const cats = loadCategories();

  const tally = {};
  state.allEntries.forEach(entries => {
    Object.values(entries).forEach(e => {
      if (e?.categoryId) tally[e.categoryId] = (tally[e.categoryId] ?? 0) + 1;
    });
  });

  const ids = Object.keys(cats);
  catList.innerHTML = '';

  if (ids.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'cat-list-empty';
    hint.textContent = 'Add a category to start planning your week.';
    catList.appendChild(hint);
  } else {
    ids.forEach(id => {
      const cat    = cats[id];
      const slots  = tally[id] ?? 0;
      const active = state.activeTool === id;

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'cat-card' + (active ? ' active' : '');
      card.dataset.id = id;
      card.style.setProperty('--cat-color', cat.color);
      card.setAttribute('aria-pressed', String(active));

      const bar = document.createElement('span');
      bar.className = 'cat-card-bar';
      bar.style.background = cat.color;

      const body = document.createElement('span');
      body.className = 'cat-card-body';

      const name = document.createElement('span');
      name.className = 'cat-card-name';
      name.textContent = cat.name;

      const dur = document.createElement('span');
      dur.className = 'cat-card-dur';
      dur.textContent = slots > 0 ? formatDuration(slots) : '';

      body.appendChild(name);
      body.appendChild(dur);
      card.appendChild(bar);
      card.appendChild(body);
      card.addEventListener('click', () => setActiveTool(id));
      catList.appendChild(card);
    });
  }

  eraserBtn.classList.toggle('active', state.activeTool === 'erase');
  eraserBtn.setAttribute('aria-pressed', String(state.activeTool === 'erase'));

  const totalSlots = state.allEntries.reduce(
    (sum, entries) => sum + Object.keys(entries).length, 0
  );
  if (totalSlots > 0) {
    sidebarTotalVal.textContent = formatDuration(totalSlots);
    sidebarTotal.hidden = false;
  } else {
    sidebarTotal.hidden = true;
  }

  weekScroll.classList.toggle('tool-active', !!state.activeTool);
  weekScroll.classList.toggle('tool-erase', state.activeTool === 'erase');
}

function setActiveTool(toolId) {
  state.activeTool = state.activeTool === toolId ? null : toolId;
  renderSidebar();
}

eraserBtn.addEventListener('click', () => setActiveTool('erase'));

// ─── Build week grid (once) ────────────────────────────────────────

function buildWeekGrid() {
  weekScroll.innerHTML = '';

  const headerRow = document.createElement('div');
  headerRow.className = 'week-header-row';

  const corner = document.createElement('div');
  corner.className = 'week-corner';
  headerRow.appendChild(corner);

  for (let d = 0; d < 7; d++) {
    const hdr = document.createElement('div');
    hdr.className = 'week-day-hdr';
    hdr.title = DAY_LABELS[d];

    const nameEl = document.createElement('span');
    nameEl.className = 'day-hdr-name';
    nameEl.textContent = DAY_SHORT[d];

    hdr.appendChild(nameEl);
    headerRow.appendChild(hdr);
  }
  weekScroll.appendChild(headerRow);

  for (let slot = 0; slot < TOTAL_SLOTS; slot++) {
    const row = document.createElement('div');
    row.className = 'week-row' + (slot % 2 === 0 ? ' hour-start' : '');

    const timeLabel = document.createElement('div');
    timeLabel.className = 'week-time-label';
    timeLabel.textContent = slot % 2 === 0 ? slotToTime(slot) : '';
    row.appendChild(timeLabel);

    for (let d = 0; d < 7; d++) {
      const cell = document.createElement('div');
      cell.className = 'week-slot';
      cell.dataset.slot = String(slot);
      cell.dataset.day = String(d);
      cell.setAttribute('tabindex', '0');
      row.appendChild(cell);
    }
    weekScroll.appendChild(row);
  }

  attachPointerHandlers();
}

// ─── Cell visual state ─────────────────────────────────────────────

function updateCell(dayIdx, slotIdx) {
  const cell = weekScroll.querySelector(
    `.week-slot[data-day="${dayIdx}"][data-slot="${slotIdx}"]`
  );
  if (!cell) return;

  const entry = state.allEntries[dayIdx]?.[slotIdx];
  if (entry) {
    const cats  = loadCategories();
    const cat   = cats[entry.categoryId];
    const color = cat?.color ?? '#6366f1';
    const name  = cat?.name  ?? 'Unknown';

    cell.classList.add('filled');
    cell.style.setProperty('--block-color', color);

    const prev   = state.allEntries[dayIdx]?.[slotIdx - 1];
    const isCont = prev?.categoryId === entry.categoryId;
    cell.classList.toggle('continuation', isCont);
    cell.setAttribute('title', `${DAY_LABELS[dayIdx]}  ${slotToTime(slotIdx)}–${slotToTime(slotIdx + 1)}  ·  ${name}`);
  } else {
    cell.classList.remove('filled', 'continuation');
    cell.style.removeProperty('--block-color');
    cell.removeAttribute('title');
  }
}

function updateAllCells() {
  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < TOTAL_SLOTS; s++) updateCell(d, s);
  }
}

// ─── Pointer / drag ────────────────────────────────────────────────

function attachPointerHandlers() {
  weekScroll.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove, { passive: false });
  document.addEventListener('pointerup', onPointerUp);
  weekScroll.addEventListener('keydown', onKeyDown);
  weekScroll.addEventListener('contextmenu', onContextMenu);
}

function onContextMenu(e) {
  const cell = e.target.closest('.week-slot');
  if (!cell) return;
  e.preventDefault();

  const day  = Number(cell.dataset.day);
  const slot = Number(cell.dataset.slot);
  if (!state.allEntries[day]?.[slot]) return;

  delete state.allEntries[day][slot];
  saveTemplate();

  for (let s = Math.max(0, slot - 1); s <= Math.min(TOTAL_SLOTS - 1, slot + 1); s++) {
    updateCell(day, s);
  }
  renderSidebar();
}

function slotAtPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  const cell = el?.closest?.('.week-slot');
  if (!cell) return null;
  return { day: Number(cell.dataset.day), slot: Number(cell.dataset.slot) };
}

function onPointerDown(e) {
  const pos = slotAtPoint(e.clientX, e.clientY);
  if (!pos || !state.activeTool) return;
  e.preventDefault();

  const { day, slot } = pos;
  state.dragging      = true;
  state.dragStartDay  = day;
  state.dragEndDay    = day;
  state.dragStartSlot = slot;
  state.dragEndSlot   = slot;

  const entry = state.allEntries[day]?.[slot];
  if (state.activeTool === 'erase') {
    state.dragMode = 'erase';
  } else if (entry?.categoryId === state.activeTool) {
    state.dragMode = 'erase';
  } else {
    state.dragMode = 'fill';
  }

  applyDragPreview();
}

function onPointerMove(e) {
  if (!state.dragging) return;
  e.preventDefault();
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const cell = el?.closest?.('.week-slot');
  if (!cell) return;
  const day  = Number(cell.dataset.day);
  const slot = Number(cell.dataset.slot);
  if (day !== state.dragEndDay || slot !== state.dragEndSlot) {
    state.dragEndDay  = day;
    state.dragEndSlot = slot;
    applyDragPreview();
  }
}

function onPointerUp() {
  if (!state.dragging) return;
  state.dragging = false;
  commitDrag();
}

function dragRect() {
  return {
    loDay:  Math.min(state.dragStartDay,  state.dragEndDay),
    hiDay:  Math.max(state.dragStartDay,  state.dragEndDay),
    loSlot: Math.min(state.dragStartSlot, state.dragEndSlot),
    hiSlot: Math.max(state.dragStartSlot, state.dragEndSlot),
  };
}

function applyDragPreview() {
  weekScroll.querySelectorAll('.drag-preview').forEach(c => c.classList.remove('drag-preview'));

  const cats = loadCategories();
  const previewColor =
    state.activeTool === 'erase'
      ? 'var(--danger)'
      : (cats[state.activeTool]?.color ?? 'var(--accent)');
  weekScroll.style.setProperty('--preview-color', previewColor);

  const { loDay, hiDay, loSlot, hiSlot } = dragRect();
  for (let d = loDay; d <= hiDay; d++) {
    for (let s = loSlot; s <= hiSlot; s++) {
      weekScroll
        .querySelector(`.week-slot[data-day="${d}"][data-slot="${s}"]`)
        ?.classList.add('drag-preview');
    }
  }
}

function commitDrag() {
  weekScroll.querySelectorAll('.drag-preview').forEach(c => c.classList.remove('drag-preview'));

  const { loDay, hiDay, loSlot, hiSlot } = dragRect();

  for (let d = loDay; d <= hiDay; d++) {
    if (state.dragMode === 'erase') {
      for (let s = loSlot; s <= hiSlot; s++) delete state.allEntries[d][s];
    } else {
      for (let s = loSlot; s <= hiSlot; s++) {
        state.allEntries[d][s] = { categoryId: state.activeTool };
      }
    }
  }

  saveTemplate();

  for (let d = loDay; d <= hiDay; d++) {
    for (let s = Math.max(0, loSlot - 1); s <= Math.min(TOTAL_SLOTS - 1, hiSlot + 1); s++) {
      updateCell(d, s);
    }
  }
  renderSidebar();
}

// ─── Keyboard navigation ───────────────────────────────────────────

function onKeyDown(e) {
  const cell = e.target.closest('.week-slot');
  if (!cell) return;
  const day  = Number(cell.dataset.day);
  const slot = Number(cell.dataset.slot);

  if ((e.key === 'Enter' || e.key === ' ') && state.activeTool) {
    e.preventDefault();
    const entry = state.allEntries[day]?.[slot];
    if (state.activeTool === 'erase' || entry?.categoryId === state.activeTool) {
      delete state.allEntries[day][slot];
    } else {
      state.allEntries[day][slot] = { categoryId: state.activeTool };
    }
    saveTemplate();
    for (let s = Math.max(0, slot - 1); s <= Math.min(TOTAL_SLOTS - 1, slot + 1); s++) {
      updateCell(day, s);
    }
    renderSidebar();
    return;
  }

  const moves = { ArrowDown: [0, 1], ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowLeft: [-1, 0] };
  const delta = moves[e.key];
  if (delta) {
    e.preventDefault();
    const nd = Math.max(0, Math.min(6, day + delta[0]));
    const ns = Math.max(0, Math.min(TOTAL_SLOTS - 1, slot + delta[1]));
    weekScroll.querySelector(`.week-slot[data-day="${nd}"][data-slot="${ns}"]`)?.focus();
  }
}

// ─── Category creation modal ───────────────────────────────────────

function openCatModal() {
  catNameInput.value = '';
  newCatColor = PALETTE[0];
  catColorSwatches.querySelectorAll('.color-swatch').forEach(s => {
    const active = s.dataset.color === newCatColor;
    s.classList.toggle('selected', active);
    s.setAttribute('aria-selected', String(active));
  });
  modalOverlay.hidden = false;
  catNameInput.focus();
}

function closeCatModal() { modalOverlay.hidden = true; }

function createAndSelect() {
  const name = catNameInput.value.trim();
  if (!name) { catNameInput.focus(); return; }
  const id = createCategory(name, newCatColor);
  state.activeTool = id;
  renderSidebar();
  closeCatModal();
}

btnNewCat.addEventListener('click', openCatModal);
modalCancel.addEventListener('click', closeCatModal);
modalCreate.addEventListener('click', createAndSelect);
catNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); createAndSelect(); }
  if (e.key === 'Escape') closeCatModal();
});
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeCatModal();
});

// ─── Reset template ────────────────────────────────────────────────

btnReset.addEventListener('click', () => {
  confirmOverlay.hidden = false;
  confirmOk.focus();
});

confirmOk.addEventListener('click', () => {
  state.allEntries = Array.from({ length: 7 }, () => ({}));
  saveTemplate();
  updateAllCells();
  renderSidebar();
  confirmOverlay.hidden = true;
});

confirmCancel.addEventListener('click', () => { confirmOverlay.hidden = true; });
confirmOverlay.addEventListener('click', e => {
  if (e.target === confirmOverlay) confirmOverlay.hidden = true;
});

// ─── Bootstrap ─────────────────────────────────────────────────────

state.allEntries = loadTemplate();
buildWeekGrid();
updateAllCells();
renderSidebar();

// Scroll to 7 AM
requestAnimationFrame(() => {
  weekScroll.scrollTop = 14 * SLOT_H_PX;
});
