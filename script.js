/* ============================================================
   MedX-AI Workstation — Application Logic
   Synthetic, self-contained demo. No real model, no real data.
   ============================================================ */

lucide.createIcons();

/* ---------- DOM References ---------- */
const dropZone        = document.getElementById('dropZone');
const fileInput       = document.getElementById('fileInput');
const imageCanvas     = document.getElementById('imageCanvas');
const heatmapCanvas   = document.getElementById('heatmapCanvas');
const imgCtx          = imageCanvas.getContext('2d');
const hmCtx            = heatmapCanvas.getContext('2d');
const opacitySlider   = document.getElementById('opacitySlider');
const opacityVal      = document.getElementById('opacityVal');
const colormapSeg     = document.getElementById('colormapSeg');
const heatmapToggle   = document.getElementById('heatmapToggle');
const compareToggle   = document.getElementById('compareToggle');
const compareHandle   = document.getElementById('compareHandle');
const loader          = document.getElementById('loader');
const loaderText      = document.getElementById('loaderText');
const scanline        = document.getElementById('scanline');
const viewerMode      = document.getElementById('viewerMode');
const viewerContainer = document.getElementById('viewerContainer');
const canvasStage     = document.getElementById('canvasStage');
const pixelReadout    = document.getElementById('pixelReadout');
const fpsReadout      = document.getElementById('fpsReadout');
const analyzeBtn      = document.getElementById('analyzeBtn');
const presetsGrid     = document.getElementById('presetsGrid');
const studyId         = document.getElementById('studyId');
const studyTime       = document.getElementById('studyTime');
const historyToggle   = document.getElementById('historyToggle');
const historyDrawer   = document.getElementById('historyDrawer');
const drawerScrim     = document.getElementById('drawerScrim');
const historyList     = document.getElementById('historyList');
const exportBtn       = document.getElementById('exportBtn');

const modelSeg          = document.getElementById('modelSeg');
const layerSeg           = document.getElementById('layerSeg');
const brightnessSlider  = document.getElementById('brightnessSlider');
const contrastSlider    = document.getElementById('contrastSlider');
const brightnessVal     = document.getElementById('brightnessVal');
const contrastVal       = document.getElementById('contrastVal');
const wlResetBtn        = document.getElementById('wlResetBtn');
const measureTool       = document.getElementById('measureTool');
const annotateTool      = document.getElementById('annotateTool');
const clearAnnotationsBtn = document.getElementById('clearAnnotations');
const annotateCanvas    = document.getElementById('annotateCanvas');
const annCtx            = annotateCanvas.getContext('2d');
const toolStatus        = document.getElementById('toolStatus');
const ctrReadout        = document.getElementById('ctrReadout');
const ensembleTable     = document.getElementById('ensembleTable');
const consensusBadge    = document.getElementById('consensusBadge');
const engineTag         = document.getElementById('engineTag');
const metaToggle        = document.getElementById('metaToggle');
const metaDrawer        = document.getElementById('metaDrawer');
const metaList          = document.getElementById('metaList');
const shortcutsToggle   = document.getElementById('shortcutsToggle');
const shortcutsDrawer   = document.getElementById('shortcutsDrawer');
const clearHistoryBtn   = document.getElementById('clearHistoryBtn');

const gaugeFill        = document.getElementById('gaugeFill');
const gaugeScore       = document.getElementById('gaugeScore');
const findingLabel     = document.getElementById('findingLabel');
const predClass        = document.getElementById('predClass');
const secondaryFindings= document.getElementById('secondaryFindings');
const differentialList = document.getElementById('differentialList');
const xaiExplanation   = document.getElementById('xaiExplanation');
const layerInfo        = document.getElementById('layerInfo');
const peakVal          = document.getElementById('peakVal');
const roiArea          = document.getElementById('roiArea');
const inferTime        = document.getElementById('inferTime');

/* ---------- State ---------- */
let currentImg = new Image();
let isImageLoaded = false;
let activePreset = null;
let activeColormap = 'jet';
let zoomLevel = 1;
let compareMode = false;
let comparePct = 50;
let sessionHistory = [];
let studyCounter = 0;
let activeModel = 'densenet';
let activeLayer = 'deep';
let currentTool = 'none'; // 'none' | 'measure' | 'annotate'
let measurePoints = [];
let annotations = [];
const GAUGE_CIRCUMFERENCE = 327; // 2 * PI * 52

const MODEL_INFO = {
  densenet:      { label: 'DenseNet-121',     layer: 'conv5_block3_out', delta: 0 },
  resnet:        { label: 'ResNet-50',        layer: 'conv5_block3_out', delta: -3.4 },
  efficientnet:  { label: 'EfficientNet-B4',  layer: 'block7a_project',  delta: 2.1 }
};

const LAYER_INFO = {
  shallow: { grid: 32, label: 'conv2_block (shallow)', blobs: 3 },
  mid:     { grid: 20, label: 'conv4_block (mid)',      blobs: 2 },
  deep:    { grid: 12, label: 'conv5_block (deep)',     blobs: 1 }
};

/* ---------- Canvas Setup ---------- */
imageCanvas.width = 512;    imageCanvas.height = 512;
heatmapCanvas.width = 512;  heatmapCanvas.height = 512;
annotateCanvas.width = 512; annotateCanvas.height = 512;

/* ---------- Clinical Findings Knowledge Base ---------- */
const FINDINGS = {
  pneumonia: {
    label: 'FINDING DETECTED', tone: 'amber',
    title: 'Pneumonic Infiltration',
    score: 94.2,
    desc: 'Consolidation identified in the lower right lung field with minimal associated pleural reaction.',
    xai: 'Grad-CAM gradients concentrate over the right basal opacity. Attention is driven primarily by increased regional density consistent with alveolar airspace filling.',
    peak: 0.94, roi: '14.8%',
    differential: [
      { name: 'Pneumonic Infiltration', score: 94.2, color: 'amber' },
      { name: 'Pleural Effusion', score: 18.4, color: 'muted' },
      { name: 'Atelectasis', score: 11.2, color: 'muted' },
      { name: 'Normal Variant', score: 3.1, color: 'muted' },
    ],
    center: { x: 11, y: 10, r: 4.5 }
  },
  cardiomegaly: {
    label: 'FINDING DETECTED', tone: 'red',
    title: 'Cardiomegaly',
    score: 88.7,
    desc: 'Transverse cardiac diameter exceeds 50% of total thoracic diameter, consistent with cardiac enlargement.',
    xai: 'High gradient intensity traces the left ventricular border and cardiac silhouette expansion, the dominant spatial driver of this classification.',
    peak: 0.89, roi: '22.1%',
    differential: [
      { name: 'Cardiomegaly', score: 88.7, color: 'red' },
      { name: 'Pericardial Effusion', score: 21.6, color: 'muted' },
      { name: 'Pulmonary Edema', score: 14.9, color: 'muted' },
      { name: 'Normal Variant', score: 4.4, color: 'muted' },
    ],
    center: { x: 7, y: 9, r: 5.5 }
  },
  nodule: {
    label: 'FINDING DETECTED', tone: 'amber',
    title: 'Pulmonary Nodule',
    score: 91.5,
    desc: 'Focal, well-circumscribed high-density opacity identified in the upper left lung segment.',
    xai: 'Grad-CAM focus is tightly localized around the isolated lesion, with negligible attention on peripheral bone or soft tissue.',
    peak: 0.96, roi: '4.2%',
    differential: [
      { name: 'Pulmonary Nodule', score: 91.5, color: 'amber' },
      { name: 'Granuloma', score: 27.3, color: 'muted' },
      { name: 'Calcified Lesion', score: 9.8, color: 'muted' },
      { name: 'Normal Variant', score: 2.6, color: 'muted' },
    ],
    center: { x: 5, y: 5, r: 2.5 }
  },
  normal: {
    label: 'NO ACUTE FINDING', tone: 'green',
    title: 'Unremarkable Study',
    score: 98.1,
    desc: 'Clear pulmonary fields with normal cardiothoracic ratio and sharp costophrenic angles.',
    xai: 'Activation is diffuse and low-magnitude across central anatomical structures, with no singular focal gradient peak — consistent with an unremarkable study.',
    peak: 0.18, roi: '<2%',
    differential: [
      { name: 'Normal Study', score: 98.1, color: 'green' },
      { name: 'Early Infiltrate', score: 3.7, color: 'muted' },
      { name: 'Nodule', score: 1.9, color: 'muted' },
      { name: 'Cardiomegaly', score: 0.8, color: 'muted' },
    ],
    center: { x: 8, y: 8, r: 1 }
  },
  custom: {
    label: 'STUDY PROCESSED', tone: 'teal',
    title: 'Custom Scan Analysis',
    score: 86.4,
    desc: 'Inference completed for the uploaded radiograph using the full Grad-CAM pipeline.',
    xai: 'Attention map computed from the final convolutional block feature activations of the uploaded study.',
    peak: 0.82, roi: '9.5%',
    differential: [
      { name: 'Primary Finding', score: 86.4, color: 'teal' },
      { name: 'Secondary Pattern', score: 24.1, color: 'muted' },
      { name: 'Incidental Finding', score: 8.7, color: 'muted' },
      { name: 'Normal Variant', score: 5.2, color: 'muted' },
    ],
    center: { x: 9, y: 9, r: 3.5 }
  }
};

const TONE_COLORS = {
  amber: 'var(--amber)', red: 'var(--red)', green: 'var(--green)',
  teal: 'var(--teal)', muted: 'var(--muted)'
};

/* ---------- Status Bar Clock ---------- */
function tickClock() {
  const now = new Date();
  studyTime.textContent = now.toTimeString().split(' ')[0];
}
setInterval(tickClock, 1000);
tickClock();

function nextStudyId() {
  studyCounter += 1;
  return `MX-${String(10000 + studyCounter).padStart(5, '0')}`;
}

/* ---------- File Upload ---------- */
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleImageFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleImageFile(e.target.files[0]);
});

function handleImageFile(file) {
  if (!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    currentImg = new Image();
    currentImg.onload = () => {
      renderBaseImage();
      isImageLoaded = true;
      activePreset = 'custom';
      setActivePresetButton(null);
      clearHeatmap();
      runAnalysis();
    };
    currentImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderBaseImage() {
  imgCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
  imgCtx.drawImage(currentImg, 0, 0, imageCanvas.width, imageCanvas.height);
}

function clearHeatmap() {
  hmCtx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
}

/* ---------- Preset Buttons ---------- */
presetsGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  const type = btn.dataset.preset;
  setActivePresetButton(btn);
  loadPreset(type);
});

function setActivePresetButton(btn) {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

/* ---------- Synthetic Radiograph Generator ---------- */
function loadPreset(type) {
  activePreset = type;
  const width = 512, height = 512;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width; tempCanvas.height = height;
  const ctx = tempCanvas.getContext('2d');

  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, width, height);

  // subtle vignette / film grain base
  const vignette = ctx.createRadialGradient(256, 256, 60, 256, 256, 340);
  vignette.addColorStop(0, 'rgba(20,20,22,1)');
  vignette.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // Lung fields
  ctx.fillStyle = '#18181c';
  ctx.beginPath(); ctx.ellipse(180, 240, 70, 160, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(332, 240, 70, 160, 0.1, 0, Math.PI * 2); ctx.fill();

  // Spine
  ctx.fillStyle = 'rgba(200, 200, 210, 0.4)';
  ctx.fillRect(246, 60, 20, 380);

  // Rib cage
  ctx.strokeStyle = 'rgba(180, 180, 195, 0.25)';
  ctx.lineWidth = 12;
  for (let i = 100; i < 380; i += 35) {
    ctx.beginPath();
    ctx.arc(256, i, 120, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // Clavicles
  ctx.strokeStyle = 'rgba(190, 190, 205, 0.3)';
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(190, 95); ctx.quadraticCurveTo(230, 75, 258, 90); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(322, 95); ctx.quadraticCurveTo(282, 75, 254, 90); ctx.stroke();

  // Cardiac silhouette
  ctx.fillStyle = 'rgba(210, 210, 220, 0.6)';
  ctx.beginPath();
  const heartSize = (type === 'cardiomegaly') ? 95 : 65;
  ctx.ellipse(235, 290, heartSize, 70, 0.3, 0, Math.PI * 2);
  ctx.fill();

  if (type === 'pneumonia') {
    const grad = ctx.createRadialGradient(340, 310, 10, 340, 310, 65);
    grad.addColorStop(0, 'rgba(240, 240, 245, 0.85)');
    grad.addColorStop(1, 'rgba(240, 240, 245, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(340, 310, 65, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'nodule') {
    const grad = ctx.createRadialGradient(170, 160, 2, 170, 160, 22);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.5, 'rgba(220, 220, 230, 0.6)');
    grad.addColorStop(1, 'rgba(220, 220, 230, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(170, 160, 22, 0, Math.PI * 2); ctx.fill();
  }

  currentImg = new Image();
  currentImg.onload = () => {
    renderBaseImage();
    isImageLoaded = true;
    runAnalysis();
  };
  currentImg.src = tempCanvas.toDataURL();
}

/* ---------- Grad-CAM Controls ---------- */
opacitySlider.addEventListener('input', (e) => {
  opacityVal.textContent = `${e.target.value}%`;
  applyHeatmapOpacity();
});

heatmapToggle.addEventListener('change', applyHeatmapOpacity);

function applyHeatmapOpacity() {
  const on = heatmapToggle.checked;
  heatmapCanvas.style.opacity = on ? opacitySlider.value / 100 : 0;
}

colormapSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  colormapSeg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeColormap = btn.dataset.cmap;
  if (isImageLoaded) generateGradCAM();
});

/* ---------- Model Architecture ---------- */
modelSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  modelSeg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeModel = btn.dataset.model;
  engineTag.textContent = `ENGINE: ${MODEL_INFO[activeModel].label} / Grad-CAM v2.1`;
  if (isImageLoaded) runAnalysis();
});

/* ---------- Attention Layer Depth ---------- */
layerSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  layerSeg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeLayer = btn.dataset.layer;
  if (isImageLoaded) generateGradCAM();
});

/* ---------- Window / Level (Brightness / Contrast) ---------- */
function applyWindowLevel() {
  const b = brightnessSlider.value, c = contrastSlider.value;
  brightnessVal.textContent = `${b}%`;
  contrastVal.textContent = `${c}%`;
  imageCanvas.style.filter = `brightness(${b}%) contrast(${c}%)`;
}
brightnessSlider.addEventListener('input', applyWindowLevel);
contrastSlider.addEventListener('input', applyWindowLevel);
wlResetBtn.addEventListener('click', () => {
  brightnessSlider.value = 100;
  contrastSlider.value = 100;
  applyWindowLevel();
});

/* ---------- Measure & Annotate Tools ---------- */
function setTool(tool) {
  currentTool = (currentTool === tool) ? 'none' : tool;
  measureTool.classList.toggle('active', currentTool === 'measure');
  annotateTool.classList.toggle('active', currentTool === 'annotate');
  viewerContainer.classList.toggle('tool-measure', currentTool === 'measure');
  viewerContainer.classList.toggle('tool-annotate', currentTool === 'annotate');
  toolStatus.textContent = `TOOL · ${currentTool === 'none' ? 'NAVIGATE' : currentTool.toUpperCase()}`;
  measurePoints = [];
}
measureTool.addEventListener('click', () => setTool('measure'));
annotateTool.addEventListener('click', () => setTool('annotate'));

clearAnnotationsBtn.addEventListener('click', () => {
  annotations = [];
  measurePoints = [];
  annCtx.clearRect(0, 0, annotateCanvas.width, annotateCanvas.height);
  ctrReadout.hidden = true;
});

function canvasCoords(e) {
  const rect = annotateCanvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * annotateCanvas.width,
    y: ((e.clientY - rect.top) / rect.height) * annotateCanvas.height
  };
}

annotateCanvas.addEventListener('click', (e) => {
  if (!isImageLoaded) return;
  const p = canvasCoords(e);

  if (currentTool === 'measure') {
    measurePoints.push(p);
    if (measurePoints.length === 2) {
      drawMeasurement(measurePoints[0], measurePoints[1]);
      measurePoints = [];
    } else {
      redrawAnnotations();
    }
  } else if (currentTool === 'annotate') {
    const note = prompt('Annotation note:', '');
    if (note !== null && note.trim() !== '') {
      annotations.push({ x: p.x, y: p.y, note: note.trim(), n: annotations.length + 1 });
      redrawAnnotations();
    }
  }
});

function redrawAnnotations() {
  annCtx.clearRect(0, 0, annotateCanvas.width, annotateCanvas.height);
  annCtx.font = '600 13px JetBrains Mono, monospace';

  annotations.forEach(a => {
    annCtx.fillStyle = 'rgba(242,169,59,0.95)';
    annCtx.beginPath();
    annCtx.arc(a.x, a.y, 9, 0, Math.PI * 2);
    annCtx.fill();
    annCtx.fillStyle = '#0a0d12';
    annCtx.textAlign = 'center';
    annCtx.textBaseline = 'middle';
    annCtx.fillText(a.n, a.x, a.y + 1);
  });

  if (measurePoints.length === 1) {
    annCtx.fillStyle = 'rgba(23,184,196,0.9)';
    annCtx.beginPath();
    annCtx.arc(measurePoints[0].x, measurePoints[0].y, 4, 0, Math.PI * 2);
    annCtx.fill();
  }
}

function drawMeasurement(p1, p2) {
  redrawAnnotations();
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const distPx = Math.sqrt(dx * dx + dy * dy);
  const mm = (distPx * 0.35).toFixed(1); // synthetic pixel-spacing conversion

  annCtx.strokeStyle = 'rgba(23,184,196,0.9)';
  annCtx.lineWidth = 2;
  annCtx.setLineDash([6, 4]);
  annCtx.beginPath();
  annCtx.moveTo(p1.x, p1.y);
  annCtx.lineTo(p2.x, p2.y);
  annCtx.stroke();
  annCtx.setLineDash([]);

  [p1, p2].forEach(p => {
    annCtx.fillStyle = 'rgba(23,184,196,0.9)';
    annCtx.beginPath();
    annCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    annCtx.fill();
  });

  const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
  const label = `${distPx.toFixed(0)}px · ${mm}mm`;
  annCtx.font = '600 12px JetBrains Mono, monospace';
  const textW = annCtx.measureText(label).width;
  annCtx.fillStyle = 'rgba(10,13,18,0.85)';
  annCtx.fillRect(midX - textW / 2 - 5, midY - 20, textW + 10, 18);
  annCtx.fillStyle = '#17b8c4';
  annCtx.textAlign = 'center';
  annCtx.fillText(label, midX, midY - 11);
}

/* ---------- Compare Mode ---------- */
compareToggle.addEventListener('change', () => {
  compareMode = compareToggle.checked;
  compareHandle.hidden = !compareMode;
  updateCompareClip();
});

let draggingHandle = false;
compareHandle.addEventListener('mousedown', () => draggingHandle = true);
window.addEventListener('mouseup', () => draggingHandle = false);
viewerContainer.addEventListener('mousemove', (e) => {
  const rect = canvasStage.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const px = Math.round((x / rect.width) * 512);
  const py = Math.round((y / rect.height) * 512);
  if (px >= 0 && px <= 512 && py >= 0 && py <= 512) {
    pixelReadout.textContent = `x: ${px} y: ${py}`;
  }
  if (draggingHandle && compareMode) {
    comparePct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    updateCompareClip();
  }
});

function updateCompareClip() {
  if (compareMode) {
    heatmapCanvas.style.clipPath = `inset(0 0 0 ${comparePct}%)`;
    compareHandle.style.left = `${comparePct}%`;
  } else {
    heatmapCanvas.style.clipPath = 'inset(0 0 0 0)';
  }
}

/* ---------- Zoom ---------- */
document.getElementById('zoomIn').addEventListener('click', () => setZoom(zoomLevel + 0.2));
document.getElementById('zoomOut').addEventListener('click', () => setZoom(zoomLevel - 0.2));
document.getElementById('zoomReset').addEventListener('click', () => setZoom(1));

function setZoom(level) {
  zoomLevel = Math.min(2.5, Math.max(0.6, level));
  canvasStage.style.transform = `scale(${zoomLevel})`;
}

/* ---------- Run Analysis ---------- */
analyzeBtn.addEventListener('click', runAnalysis);

function runAnalysis() {
  if (!isImageLoaded) return;

  const t0 = performance.now();
  loader.style.display = 'flex';
  loaderText.textContent = 'Extracting activation gradients…';
  viewerMode.textContent = 'MODE · COMPUTING ATTENTION MAP';
  fpsReadout.textContent = 'RENDER · BUSY';
  scanline.classList.remove('active');
  void scanline.offsetWidth; // restart animation
  scanline.classList.add('active');

  setTimeout(() => {
    generateGradCAM();
    const elapsed = Math.round(performance.now() - t0 + 180 + Math.random() * 90);
    updateClinicalDashboard(elapsed);
    loader.style.display = 'none';
    viewerMode.textContent = 'MODE · GRAD-CAM OVERLAY ACTIVE';
    fpsReadout.textContent = 'RENDER · IDLE';
  }, 650);
}

// Deterministic pseudo-random generator seeded by a string, so blob
// jitter stays stable for a given preset + layer combination.
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

function generateGradCAM() {
  const w = heatmapCanvas.width, h = heatmapCanvas.height;
  hmCtx.clearRect(0, 0, w, h);

  const layerCfg = LAYER_INFO[activeLayer];
  const gridSize = layerCfg.grid;
  const activations = new Float32Array(gridSize * gridSize);
  const cfg = FINDINGS[activePreset] || FINDINGS.custom;

  // Base center expressed as a fraction of the original 16-unit grid.
  const fracX = cfg.center.x / 16, fracY = cfg.center.y / 16, fracR = cfg.center.r / 16;
  const rng = seededRandom(`${activePreset}-${activeLayer}-${activeModel}`);

  const blobs = [];
  const primaryR = fracR * gridSize * (activeLayer === 'shallow' ? 0.65 : activeLayer === 'mid' ? 0.85 : 1.1);
  blobs.push({ x: fracX * gridSize, y: fracY * gridSize, r: primaryR, w: 1 });

  for (let i = 1; i < layerCfg.blobs; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = (2 + rng() * 3);
    blobs.push({
      x: fracX * gridSize + Math.cos(angle) * dist,
      y: fracY * gridSize + Math.sin(angle) * dist,
      r: primaryR * (0.4 + rng() * 0.3),
      w: 0.45 + rng() * 0.25
    });
  }

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      let val = 0;
      for (const b of blobs) {
        const dist = Math.sqrt((x - b.x) ** 2 + (y - b.y) ** 2);
        const v = Math.max(0, 1 - dist / b.r) * b.w;
        val = Math.max(val, Math.pow(v, 2));
      }
      activations[y * gridSize + x] = activePreset === 'normal' ? val * 0.2 : val;
    }
  }

  const rawData = hmCtx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = (x / w) * (gridSize - 1);
      const gy = (y / h) * (gridSize - 1);
      const gxi = Math.floor(gx), gyi = Math.floor(gy);
      const val = activations[gyi * gridSize + gxi];

      if (val > 0.05) {
        const rgb = applyColormap(val, activeColormap);
        const index = (y * w + x) * 4;
        rawData.data[index] = rgb.r;
        rawData.data[index + 1] = rgb.g;
        rawData.data[index + 2] = rgb.b;
        rawData.data[index + 3] = Math.min(255, val * 220);
      }
    }
  }

  hmCtx.putImageData(rawData, 0, 0);
  applyHeatmapOpacity();
  updateCompareClip();
  layerInfo.textContent = MODEL_INFO[activeModel].layer;
}

function applyColormap(val, type) {
  val = Math.max(0, Math.min(1, val));
  if (type === 'jet') {
    return {
      r: Math.floor(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(val * 4 - 3)))),
      g: Math.floor(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(val * 4 - 2)))),
      b: Math.floor(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(val * 4 - 1))))
    };
  } else if (type === 'inferno') {
    return {
      r: Math.floor(255 * Math.pow(val, 0.7)),
      g: Math.floor(255 * Math.pow(val, 2.0)),
      b: Math.floor(200 * Math.pow(val, 4.0))
    };
  } else {
    return {
      r: Math.floor(255 * (0.2 + 0.8 * val)),
      g: Math.floor(255 * Math.sin(val * Math.PI)),
      b: Math.floor(255 * (1 - val))
    };
  }
}

/* ---------- Dashboard Update ---------- */
function updateClinicalDashboard(elapsedMs) {
  const cfg = FINDINGS[activePreset] || FINDINGS.custom;

  findingLabel.textContent = cfg.label;
  findingLabel.style.color = TONE_COLORS[cfg.tone];
  predClass.textContent = cfg.title;
  secondaryFindings.textContent = cfg.desc;
  xaiExplanation.textContent = cfg.xai;
  peakVal.textContent = `${cfg.peak.toFixed(2)} α`;
  roiArea.textContent = cfg.roi;
  inferTime.textContent = `${elapsedMs} ms`;

  // Gauge
  const offset = GAUGE_CIRCUMFERENCE - (cfg.score / 100) * GAUGE_CIRCUMFERENCE;
  gaugeFill.style.stroke = TONE_COLORS[cfg.tone];
  gaugeFill.style.strokeDashoffset = GAUGE_CIRCUMFERENCE;
  requestAnimationFrame(() => { gaugeFill.style.strokeDashoffset = offset; });
  animateNumber(gaugeScore, cfg.score);

  // Differential list
  differentialList.innerHTML = '';
  cfg.differential.forEach(d => {
    const row = document.createElement('div');
    row.className = 'diff-row';
    row.innerHTML = `
      <div class="diff-row-top"><span>${d.name}</span><span>${d.score.toFixed(1)}%</span></div>
      <div class="diff-bar-bg"><div class="diff-bar-fill" style="width:0%;background:${TONE_COLORS[d.color]}"></div></div>
    `;
    differentialList.appendChild(row);
    const fill = row.querySelector('.diff-bar-fill');
    requestAnimationFrame(() => { fill.style.width = `${d.score}%`; });
  });

  // Study ID
  studyId.textContent = `STUDY ID: ${nextStudyId()}`;

  // Ensemble comparison across simulated model architectures
  renderEnsembleTable(cfg);

  // Auto cardiothoracic ratio measurement for cardiomegaly studies
  if (activePreset === 'cardiomegaly') {
    ctrReadout.hidden = false;
    ctrReadout.textContent = `CTR ≈ ${(0.52 + Math.random() * 0.08).toFixed(2)} (upper limit 0.50)`;
  } else {
    ctrReadout.hidden = true;
  }

  // Metadata panel
  renderMetadata(cfg);

  // History
  addHistoryEntry(cfg, elapsedMs);
}

function renderEnsembleTable(cfg) {
  const models = Object.entries(MODEL_INFO);
  const scores = models.map(([key, m]) => ({
    key, label: m.label,
    score: Math.min(99.4, Math.max(2, cfg.score + m.delta + (key === activeModel ? 0 : (Math.random() * 2 - 1))))
  }));

  const spread = Math.max(...scores.map(s => s.score)) - Math.min(...scores.map(s => s.score));
  consensusBadge.textContent = spread < 6 ? 'CONSENSUS' : 'MODEL DISAGREEMENT';
  consensusBadge.classList.toggle('split', spread >= 6);

  ensembleTable.innerHTML = scores.map(s => `
    <div class="ensemble-row">
      <span class="em-name"><i data-lucide="cpu"></i>${s.label}${s.key === activeModel ? ' (active)' : ''}</span>
      <span class="em-score" style="color:${s.score >= 50 ? 'var(--teal)' : 'var(--muted)'}">${s.score.toFixed(1)}%</span>
    </div>
  `).join('');
  lucide.createIcons();
}

const BODY_PARTS = { pneumonia: 'CHEST', cardiomegaly: 'CHEST', nodule: 'CHEST', normal: 'CHEST', custom: 'CHEST' };

function renderMetadata(cfg) {
  const rows = [
    ['Modality', 'DX (Digital Radiography)'],
    ['Body Part Examined', BODY_PARTS[activePreset] || 'CHEST'],
    ['View Position', 'PA (Posterior-Anterior)'],
    ['Patient', 'ANONYMIZED — SYNTHETIC'],
    ['Patient Age / Sex', '— / —'],
    ['Study Date', new Date().toISOString().slice(0, 10)],
    ['Pixel Spacing', '0.35 mm × 0.35 mm (synthetic)'],
    ['Image Dimensions', '512 × 512 px'],
    ['Bits Allocated', '8'],
    ['Model Architecture', MODEL_INFO[activeModel].label],
    ['Target Layer', MODEL_INFO[activeModel].layer],
    ['Software Version', 'MedX-AI Workstation v2.0']
  ];
  metaList.innerHTML = rows.map(([k, v]) => `<div class="meta-row"><span>${k}</span><span>${v}</span></div>`).join('');
}

function animateNumber(el, target) {
  const start = 0, duration = 700, startTime = performance.now();
  function step(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = (start + (target - start) * eased).toFixed(1);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- History Drawer ---------- */
const HISTORY_KEY = 'medxai_session_history_v1';

function loadHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) sessionHistory = JSON.parse(raw).slice(0, 20);
  } catch (err) { /* storage unavailable — continue with empty history */ }
}

function saveHistoryToStorage() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(sessionHistory)); }
  catch (err) { /* storage unavailable — history stays in-memory only */ }
}

function addHistoryEntry(cfg, elapsedMs) {
  const entry = {
    id: studyId.textContent.replace('STUDY ID: ', ''),
    title: cfg.title,
    score: cfg.score,
    tone: cfg.tone,
    model: MODEL_INFO[activeModel].label,
    time: new Date().toTimeString().split(' ')[0]
  };
  sessionHistory.unshift(entry);
  sessionHistory = sessionHistory.slice(0, 20);
  saveHistoryToStorage();
  renderHistory();
}

function renderHistory() {
  if (!sessionHistory.length) {
    historyList.innerHTML = '<p class="drawer-empty">No studies analyzed yet this session.</p>';
    return;
  }
  historyList.innerHTML = sessionHistory.map(h => `
    <div class="history-item">
      <div class="history-item-top"><span>${h.id}</span><span>${h.time}</span></div>
      <div class="history-item-title">${h.title}</div>
      <div class="history-item-score" style="color:${TONE_COLORS[h.tone]}">${h.score.toFixed(1)}% · ${h.model || ''}</div>
    </div>
  `).join('');
}

clearHistoryBtn.addEventListener('click', () => {
  sessionHistory = [];
  saveHistoryToStorage();
  renderHistory();
});

/* ---------- Generic Drawer System (history / metadata / shortcuts) ---------- */
const drawers = {
  history: historyDrawer,
  meta: metaDrawer,
  shortcuts: shortcutsDrawer
};
let openDrawerKey = null;

function openDrawer(key) {
  Object.values(drawers).forEach(d => d.classList.remove('open'));
  drawers[key].classList.add('open');
  drawerScrim.hidden = false;
  openDrawerKey = key;
}
function closeDrawers() {
  Object.values(drawers).forEach(d => d.classList.remove('open'));
  drawerScrim.hidden = true;
  openDrawerKey = null;
}

historyToggle.addEventListener('click', () => openDrawerKey === 'history' ? closeDrawers() : openDrawer('history'));
metaToggle.addEventListener('click', () => openDrawerKey === 'meta' ? closeDrawers() : openDrawer('meta'));
shortcutsToggle.addEventListener('click', () => openDrawerKey === 'shortcuts' ? closeDrawers() : openDrawer('shortcuts'));
drawerScrim.addEventListener('click', closeDrawers);
document.querySelectorAll('.drawer-close').forEach(btn => btn.addEventListener('click', closeDrawers));

/* ---------- Export Report ---------- */
exportBtn.addEventListener('click', () => {
  if (!isImageLoaded) return;
  const cfg = FINDINGS[activePreset] || FINDINGS.custom;
  const report = [
    'MedX-AI DIAGNOSTIC SUITE — SYNTHETIC DEMO REPORT',
    '='.repeat(52),
    `Study ID: ${studyId.textContent.replace('STUDY ID: ', '')}`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    `Primary Finding: ${cfg.title}`,
    `Confidence: ${cfg.score.toFixed(1)}%`,
    `Description: ${cfg.desc}`,
    '',
    'Differential Diagnosis:',
    ...cfg.differential.map(d => `  - ${d.name}: ${d.score.toFixed(1)}%`),
    '',
    'Explainable AI Summary:',
    `  ${cfg.xai}`,
    '',
    `Target Layer: conv5_block3_out`,
    `Peak Activation: ${cfg.peak.toFixed(2)}`,
    `ROI Coverage: ${cfg.roi}`,
    '',
    'DISCLAIMER: This report is generated by a synthetic demonstration',
    'tool for explainable AI visualization. It uses procedurally',
    'generated imagery and is NOT derived from a trained diagnostic',
    'model or real patient data. Do not use for clinical decisions.'
  ].join('\n');

  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${studyId.textContent.replace('STUDY ID: ', '')}_report.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ---------- Keyboard Shortcuts ---------- */
const PRESET_KEYS = ['pneumonia', 'cardiomegaly', 'nodule', 'normal'];
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.key) {
    case 'a': case 'A': runAnalysis(); break;
    case 'm': case 'M': setTool('measure'); break;
    case 'n': case 'N': setTool('annotate'); break;
    case 'c': case 'C': compareToggle.checked = !compareToggle.checked; compareToggle.dispatchEvent(new Event('change')); break;
    case 'h': case 'H': heatmapToggle.checked = !heatmapToggle.checked; heatmapToggle.dispatchEvent(new Event('change')); break;
    case '+': case '=': setZoom(zoomLevel + 0.2); break;
    case '-': case '_': setZoom(zoomLevel - 0.2); break;
    case '0': setZoom(1); break;
    case 'e': case 'E': exportBtn.click(); break;
    case '?': openDrawer('shortcuts'); break;
    case 'Escape': closeDrawers(); setTool('none'); break;
    default:
      if (['1', '2', '3', '4'].includes(e.key)) {
        const type = PRESET_KEYS[Number(e.key) - 1];
        const btn = presetsGrid.querySelector(`[data-preset="${type}"]`);
        setActivePresetButton(btn);
        loadPreset(type);
      }
  }
});

/* ---------- Init ---------- */
window.addEventListener('load', () => {
  loadHistoryFromStorage();
  renderHistory();
  setActivePresetButton(presetsGrid.querySelector('[data-preset="pneumonia"]'));
  loadPreset('pneumonia');
});