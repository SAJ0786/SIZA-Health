const STORAGE_KEYS = {
  profile: 'siza_profile_v1',
  records: 'siza_records_v1'
};

const state = {
  mode: 'sugar',
  image: null,
  currentResult: null,
  profile: loadJson(STORAGE_KEYS.profile, {
    name: '', dob: '', weight: '', height: '', medications: ''
  }),
  records: loadJson(STORAGE_KEYS.records, [])
};

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');
const modeButtons = document.querySelectorAll('.mode-btn');
const originalPreview = document.getElementById('originalPreview');
const processedCanvas = document.getElementById('processedCanvas');
const imageInput = document.getElementById('imageInput');
const detectBtn = document.getElementById('detectBtn');
const saveBtn = document.getElementById('saveBtn');
const scanFeedback = document.getElementById('scanFeedback');
const resultLabel = document.getElementById('resultLabel');
const resultValue = document.getElementById('resultValue');
const resultConfidence = document.getElementById('resultConfidence');
const recordsList = document.getElementById('recordsList');
const profileForm = document.getElementById('profileForm');
const guideText = document.getElementById('guideText');

bootstrap();

function bootstrap() {
  bindTabs();
  bindModes();
  bindImageInput();
  bindProfile();
  bindRecords();
  renderProfile();
  renderRecords();
  renderSummary();
  updateModeUi();
  resetCanvas();
}

function bindTabs() {
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  }));
}

function bindModes() {
  modeButtons.forEach(btn => btn.addEventListener('click', () => {
    state.mode = btn.dataset.mode;
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentResult = null;
    updateModeUi();
    renderCurrentResult();
  }));
}

function updateModeUi() {
  const sugar = state.mode === 'sugar';
  resultLabel.textContent = sugar ? 'Blood Sugar' : 'Blood Pressure';
  guideText.textContent = sugar
    ? 'Place the glucose meter screen inside the box. Avoid glare and keep the digits straight.'
    : 'Place the BP monitor display inside the box. Keep both SYS and DIA visible.';
  scanFeedback.textContent = state.image
    ? 'Image loaded. Ready to detect.'
    : 'No image loaded.';
}

function bindImageInput() {
  imageInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const img = await loadImage(dataUrl);
    state.image = img;
    state.currentResult = null;
    originalPreview.src = dataUrl;
    drawImageToCanvas(processedCanvas, img);
    scanFeedback.textContent = 'Image loaded. Tap Detect value.';
    renderCurrentResult();
    saveBtn.disabled = true;
  });

  detectBtn.addEventListener('click', async () => {
    if (!state.image) {
      scanFeedback.textContent = 'Please upload an image first.';
      return;
    }
    scanFeedback.textContent = 'Processing image...';
    const result = state.mode === 'sugar'
      ? detectSugarValue(state.image)
      : detectBpValue(state.image);
    state.currentResult = result;
    scanFeedback.textContent = result.message;
    renderCurrentResult();
    saveBtn.disabled = !result.valid;
  });

  saveBtn.addEventListener('click', () => {
    if (!state.currentResult?.valid) return;
    const record = {
      id: crypto.randomUUID(),
      mode: state.mode,
      value: state.currentResult.value,
      confidence: state.currentResult.confidence,
      createdAt: new Date().toISOString()
    };
    state.records.unshift(record);
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(state.records));
    renderRecords();
    renderSummary();
    scanFeedback.textContent = 'Result saved successfully.';
    saveBtn.disabled = true;
  });
}

function bindProfile() {
  profileForm.addEventListener('submit', (event) => {
    event.preventDefault();
    state.profile = {
      name: document.getElementById('name').value,
      dob: document.getElementById('dob').value,
      weight: document.getElementById('weight').value,
      height: document.getElementById('height').value,
      medications: document.getElementById('medications').value
    };
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(state.profile));
    alert('Profile saved.');
  });
}

function bindRecords() {
  document.getElementById('clearRecordsBtn').addEventListener('click', () => {
    if (!confirm('Clear all saved records?')) return;
    state.records = [];
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(state.records));
    renderRecords();
    renderSummary();
  });
}

function renderProfile() {
  document.getElementById('name').value = state.profile.name || '';
  document.getElementById('dob').value = state.profile.dob || '';
  document.getElementById('weight').value = state.profile.weight || '';
  document.getElementById('height').value = state.profile.height || '';
  document.getElementById('medications').value = state.profile.medications || '';
}

function renderCurrentResult() {
  if (!state.currentResult) {
    resultValue.textContent = '—';
    resultConfidence.textContent = '—';
    return;
  }
  resultValue.textContent = state.currentResult.value;
  resultConfidence.textContent = state.currentResult.confidence;
}

function renderSummary() {
  const sugar = state.records.find(r => r.mode === 'sugar');
  const bp = state.records.find(r => r.mode === 'bp');
  document.getElementById('latestSugar').textContent = sugar ? sugar.value : 'No record yet';
  document.getElementById('latestBp').textContent = bp ? bp.value : 'No record yet';
}

function renderRecords() {
  if (!state.records.length) {
    recordsList.className = 'records-list empty-state';
    recordsList.textContent = 'No records saved yet.';
    return;
  }
  recordsList.className = 'records-list';
  recordsList.innerHTML = state.records.map(record => `
    <article class="record-item">
      <div class="record-top">
        <div>
          <div class="record-type">${record.mode === 'sugar' ? 'Blood Sugar' : 'Blood Pressure'}</div>
          <div class="record-meta">${formatDate(record.createdAt)}</div>
        </div>
        <strong>${record.value}</strong>
      </div>
      <div class="record-meta">Confidence: ${record.confidence}</div>
    </article>
  `).join('');
}

function detectSugarValue(img) {
  const roi = extractDisplayRoi(img, 'sugar');
  drawCanvasImage(processedCanvas, roi.canvas);

  const groups = findDigitGroups(roi.binary, roi.width, roi.height);
  const digits = groups.slice(0, 3).map(group => decodeSevenSegment(group, roi.height)).join('');

  if (/^\d{2,3}$/.test(digits)) {
    const value = Number(digits);
    if (value >= 20 && value <= 600) {
      return {
        valid: true,
        value: `${value} mg/dL`,
        confidence: roi.score > 0.55 ? 'High' : 'Medium',
        message: `Glucose value detected: ${value} mg/dL`
      };
    }
  }

  return {
    valid: false,
    value: 'Unable to read',
    confidence: 'Low',
    message: 'Could not confidently read the glucose value. Try a straighter, closer photo with less glare.'
  };
}

function detectBpValue(img) {
  const roi = extractDisplayRoi(img, 'bp');
  drawCanvasImage(processedCanvas, roi.canvas);
  const groups = findDigitGroups(roi.binary, roi.width, roi.height);
  const digits = groups.map(group => decodeSevenSegment(group, roi.height)).join('');

  if (/^\d{5,6}$/.test(digits)) {
    const sys = Number(digits.slice(0, 3));
    const dia = Number(digits.slice(3, 5));
    if (sys >= 70 && sys <= 250 && dia >= 40 && dia <= 150) {
      return {
        valid: true,
        value: `${sys}/${dia} mmHg`,
        confidence: roi.score > 0.55 ? 'Medium' : 'Low',
        message: `Blood pressure detected: ${sys}/${dia} mmHg`
      };
    }
  }

  return {
    valid: false,
    value: 'Unable to read',
    confidence: 'Low',
    message: 'Could not confidently read the blood pressure value. Keep the display fully visible and retake the photo.'
  };
}

function extractDisplayRoi(img, mode) {
  const srcCanvas = document.createElement('canvas');
  const ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
  srcCanvas.width = img.naturalWidth || img.width;
  srcCanvas.height = img.naturalHeight || img.height;
  ctx.drawImage(img, 0, 0);

  const { width, height } = srcCanvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const points = [];

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const brightness = (r + g + b) / 3;
      const isGreenDigit = g > 120 && g > r * 0.85 && g > b * 0.85;
      const isBright = brightness > 155;
      if (mode === 'sugar' ? (isGreenDigit || (isBright && g > 110)) : isBright) {
        points.push([x, y]);
      }
    }
  }

  let bounds;
  if (points.length > 50) {
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const minX = Math.max(0, Math.min(...xs) - width * 0.15);
    const maxX = Math.min(width, Math.max(...xs) + width * 0.15);
    const minY = Math.max(0, Math.min(...ys) - height * 0.12);
    const maxY = Math.min(height, Math.max(...ys) + height * 0.12);
    bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  } else {
    bounds = {
      x: width * 0.15,
      y: height * 0.25,
      w: width * 0.7,
      h: height * 0.35
    };
  }

  const roiCanvas = document.createElement('canvas');
  const roiCtx = roiCanvas.getContext('2d', { willReadFrequently: true });
  roiCanvas.width = Math.max(1, Math.round(bounds.w));
  roiCanvas.height = Math.max(1, Math.round(bounds.h));
  roiCtx.drawImage(srcCanvas, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, roiCanvas.width, roiCanvas.height);

  const imageData = roiCtx.getImageData(0, 0, roiCanvas.width, roiCanvas.height);
  const binary = binarizeDisplay(imageData, mode);
  const processed = new ImageData(binaryToRgba(binary, roiCanvas.width, roiCanvas.height), roiCanvas.width, roiCanvas.height);
  roiCtx.putImageData(processed, 0, 0);

  return {
    canvas: roiCanvas,
    binary,
    width: roiCanvas.width,
    height: roiCanvas.height,
    score: points.length / ((width * height) / 16)
  };
}

function binarizeDisplay(imageData, mode) {
  const { data, width, height } = imageData;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    gray[i] = mode === 'sugar'
      ? Math.max(g, (r + g + b) / 3)
      : (r + g + b) / 3;
  }

  const threshold = otsuThreshold(gray);
  const binary = new Uint8ClampedArray(width * height);
  for (let i = 0; i < gray.length; i++) {
    binary[i] = gray[i] > threshold ? 1 : 0;
  }
  return despeckle(binary, width, height);
}

function findDigitGroups(binary, width, height) {
  const colSums = new Array(width).fill(0);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      colSums[x] += binary[y * width + x];
    }
  }

  const minCol = Math.max(2, Math.round(height * 0.12));
  const rawGroups = [];
  let start = null;
  for (let x = 0; x < width; x++) {
    if (colSums[x] >= minCol && start === null) start = x;
    if ((colSums[x] < minCol || x === width - 1) && start !== null) {
      const end = colSums[x] < minCol ? x - 1 : x;
      if (end - start >= Math.max(6, width * 0.04)) rawGroups.push({ start, end });
      start = null;
    }
  }

  const merged = [];
  rawGroups.forEach(group => {
    const prev = merged[merged.length - 1];
    if (prev && group.start - prev.end < width * 0.03) {
      prev.end = group.end;
    } else {
      merged.push({ ...group });
    }
  });

  return merged.map(group => {
    const rows = [];
    for (let y = 0; y < height; y++) {
      let rowActive = 0;
      for (let x = group.start; x <= group.end; x++) rowActive += binary[y * width + x];
      rows.push(rowActive);
    }
    let top = rows.findIndex(v => v > 0);
    if (top < 0) top = 0;
    let bottom = rows.length - 1 - [...rows].reverse().findIndex(v => v > 0);
    if (bottom < top) bottom = height - 1;

    const digitWidth = group.end - group.start + 1;
    const digitHeight = bottom - top + 1;
    const digitBinary = new Uint8ClampedArray(digitWidth * digitHeight);
    for (let y = 0; y < digitHeight; y++) {
      for (let x = 0; x < digitWidth; x++) {
        digitBinary[y * digitWidth + x] = binary[(top + y) * width + (group.start + x)];
      }
    }
    return { binary: digitBinary, width: digitWidth, height: digitHeight };
  });
}

function decodeSevenSegment(group, referenceHeight) {
  const w = group.width;
  const h = group.height;
  if (!w || !h) return '?';
  const x1 = Math.floor(w * 0.25), x2 = Math.floor(w * 0.75);
  const y1 = Math.floor(h * 0.18), y2 = Math.floor(h * 0.5), y3 = Math.floor(h * 0.82);
  const left = Math.floor(w * 0.18), right = Math.floor(w * 0.82);

  const segments = {
    a: sampleRect(group.binary, w, h, x1, Math.max(0, y1 - 3), x2 - x1, 6),
    g: sampleRect(group.binary, w, h, x1, Math.max(0, y2 - 3), x2 - x1, 6),
    d: sampleRect(group.binary, w, h, x1, Math.max(0, y3 - 3), x2 - x1, 6),
    f: sampleRect(group.binary, w, h, Math.max(0, left - 3), y1, 6, y2 - y1),
    e: sampleRect(group.binary, w, h, Math.max(0, left - 3), y2, 6, y3 - y2),
    b: sampleRect(group.binary, w, h, Math.max(0, right - 3), y1, 6, y2 - y1),
    c: sampleRect(group.binary, w, h, Math.max(0, right - 3), y2, 6, y3 - y2)
  };

  const on = Object.fromEntries(Object.entries(segments).map(([k, v]) => [k, v > 0.25]));
  const pattern = ['a','b','c','d','e','f','g'].map(k => on[k] ? '1' : '0').join('');
  const map = {
    '1111110': '0', '0110000': '1', '1101101': '2', '1111001': '3', '0110011': '4',
    '1011011': '5', '1011111': '6', '1110000': '7', '1111111': '8', '1111011': '9'
  };
  if (map[pattern]) return map[pattern];

  if (on.b && on.c && !on.a && !on.d && !on.e && !on.f) return '1';
  if (on.a && on.b && on.g && on.e && on.d) return '2';
  if (on.a && on.b && on.g && on.c && on.d) return '3';
  if (on.f && on.g && on.b && on.c) return '4';
  if (on.a && on.f && on.g && on.c && on.d) return '5';
  if (on.a && on.f && on.g && on.e && on.c && on.d) return '6';
  if (on.a && on.b && on.c) return '7';
  if (on.a && on.b && on.c && on.d && on.e && on.f && on.g) return '8';
  if (on.a && on.b && on.c && on.d && on.f && on.g) return '9';
  if (on.a && on.b && on.c && on.d && on.e && on.f) return '0';
  return '?';
}

function sampleRect(binary, w, h, x, y, rectW, rectH) {
  let active = 0;
  let total = 0;
  for (let iy = y; iy < Math.min(h, y + rectH); iy++) {
    for (let ix = x; ix < Math.min(w, x + rectW); ix++) {
      total += 1;
      active += binary[iy * w + ix];
    }
  }
  return total ? active / total : 0;
}

function otsuThreshold(gray) {
  const hist = new Array(256).fill(0);
  gray.forEach(v => hist[Math.round(v)]++);
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) ** 2;
    if (variance > maxVar) {
      maxVar = variance;
      threshold = i;
    }
  }
  return threshold;
}

function despeckle(binary, width, height) {
  const cleaned = new Uint8ClampedArray(binary);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          neighbors += binary[(y + dy) * width + (x + dx)];
        }
      }
      if (binary[idx] && neighbors <= 1) cleaned[idx] = 0;
    }
  }
  return cleaned;
}

function binaryToRgba(binary, width, height) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < binary.length; i++) {
    const value = binary[i] ? 255 : 0;
    rgba[i * 4] = value;
    rgba[i * 4 + 1] = value;
    rgba[i * 4 + 2] = value;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

function drawImageToCanvas(canvas, img) {
  const ctx = canvas.getContext('2d');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function drawCanvasImage(targetCanvas, sourceCanvas) {
  const ctx = targetCanvas.getContext('2d');
  targetCanvas.width = sourceCanvas.width;
  targetCanvas.height = sourceCanvas.height;
  ctx.drawImage(sourceCanvas, 0, 0);
}

function resetCanvas() {
  const ctx = processedCanvas.getContext('2d');
  processedCanvas.width = 600;
  processedCanvas.height = 450;
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, processedCanvas.width, processedCanvas.height);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}
