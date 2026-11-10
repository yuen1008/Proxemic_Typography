const $ = (selector) => document.querySelector(selector);
const root = document.documentElement;
const body = document.body;
const articleContent = $('#articleContent');
let targetProximity = 0, currentProximity = 0, detector, cameraActive = false, latestFaceRatio = null;
let readingRange = { far: null, comfortable: null, near: null }, calibrationStage = 0;
let manualScale = 1, manualLeading = 1.62, highContrast = false;

function setView(view) {
  document.querySelectorAll('[data-view-panel]').forEach((panel) => panel.hidden = panel.dataset.viewPanel !== view);
  document.querySelectorAll('.nav-link').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function toast(message) { const item = $('#toast'); item.textContent = message; item.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => item.classList.remove('show'), 3600); }
async function readServerResponse(response) {
  const raw = await response.text();
  try { return JSON.parse(raw); }
  catch { throw new Error(raw || `The local reader server stopped responding (HTTP ${response.status}). Restart Start Local Server.command and try again.`); }
}
function safeTextToHTML(text) { return text.trim().split(/\n\s*\n/).filter(Boolean).map((paragraph) => `<p>${escapeHTML(paragraph).replace(/\n/g, '<br>')}</p>`).join(''); }
function escapeHTML(value) { const node = document.createElement('div'); node.textContent = value; return node.innerHTML; }
function setArticle({ title, byline, siteName, excerpt, content, leadImage, sourceUrl }) {
  $('#articleTitle').textContent = title || 'Untitled text'; $('#articleKicker').textContent = siteName || 'Your reading'; $('#articleMeta').textContent = [byline, excerpt].filter(Boolean).join(' · '); $('#sourceLabel').textContent = sourceUrl ? new URL(sourceUrl).hostname : 'Local text'; articleContent.innerHTML = content;
  const image = $('#leadImage'), imageElement = $('#leadImageSrc'); if (leadImage) { imageElement.src = leadImage; imageElement.alt = title || 'Article image'; image.hidden = false; } else { image.hidden = true; }
  setView('reader'); resetCalibration(); $('#calibration').hidden = false; $('#demoRange').value = 60; targetProximity = 0;
}
function setDemoDistance(cm) { targetProximity = Math.max(0, Math.min(1, (60 - cm) / 45)); }
function renderProximity() {
  currentProximity += (targetProximity - currentProximity) * .045;
  const cm = readingRange.comfortable ? Math.round(60 / (1 + currentProximity * .95)) : Math.round(60 - currentProximity * 45); const state = currentProximity < .33 ? 'comfortable' : currentProximity < .7 ? 'making room' : 'pause invited';
  root.style.setProperty('--p', currentProximity.toFixed(3)); root.style.setProperty('--scale', (manualScale * (1 + currentProximity * .38)).toFixed(3)); root.style.setProperty('--leading', (manualLeading + currentProximity * .21).toFixed(3)); root.style.setProperty('--paper', highContrast ? '#ffffff' : currentProximity > .28 ? '#f3eadb' : '#f7f3ec'); $('#distanceText').textContent = cm; $('#postureLabel').textContent = state; body.classList.toggle('too-close', currentProximity > .78);
  if (currentProximity > .8 && !toast.closeNotice) { toast('Take a breath. The text will wait for you.'); toast.closeNotice = true; } if (currentProximity < .7) toast.closeNotice = false; requestAnimationFrame(renderProximity);
}
function updateFaceRatio(faceRatio) { latestFaceRatio = faceRatio; if (!readingRange.comfortable) return; const near = readingRange.near || readingRange.comfortable * 1.55; targetProximity = Math.max(0, Math.min(1, (faceRatio - readingRange.comfortable) / (near - readingRange.comfortable))); }
function resetCalibration() { readingRange = { far: null, comfortable: null, near: null }; calibrationStage = 0; latestFaceRatio = null; updateCalibrationUI(); }
function updateCalibrationUI() {
  const button = $('#confirmDistanceButton'), step = $('#rangeStep'), message = $('#calibrationMessage');
  const states = [
    ['Step 1 of 3 · sit upright, shoulders supported.', 'Save upright position'],
    ['Step 2 of 3 · lean slightly closer to the closest distance where text remains easy to read.', 'Save close limit'],
    ['Step 3 of 3 · lean back into your chair with your torso supported.', 'Save supported-backrest position']
  ];
  step.textContent = states[calibrationStage][0]; button.textContent = states[calibrationStage][1]; button.disabled = !detector; message.textContent = detector ? 'Capture three positions to create a personal comfort range; this is not a medical diagnosis.' : 'Enable camera to calibrate, or use manual controls instead.';
}

$('#urlForm').addEventListener('submit', async (event) => { event.preventDefault(); const button = event.submitter, url = $('#urlInput').value.trim(); button.disabled = true; button.textContent = 'Extracting…'; try { const response = await fetch('/api/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }); const article = await readServerResponse(response); if (!response.ok) throw new Error(article.error || 'Could not extract that page.'); setArticle(article); } catch (error) { toast(error.message); } finally { button.disabled = false; button.innerHTML = 'Make it readable <span>↗</span>'; } });
$('#textImportButton').addEventListener('click', () => { const text = $('#textInput').value.trim(); if (!text) return toast('Paste some text or choose a file first.'); setArticle({ title: 'Personal text', content: safeTextToHTML(text) }); });
$('#fileInput').addEventListener('change', async (event) => {
  const file = event.target.files[0]; if (!file) return;
  const extension = file.name.split('.').pop().toLowerCase();
  if (['txt', 'md', 'html', 'htm'].includes(extension)) {
    const source = await file.text(); const content = ['html', 'htm'].includes(extension) ? new DOMParser().parseFromString(source, 'text/html').body.innerHTML : safeTextToHTML(source); setArticle({ title: file.name.replace(/\.[^.]+$/, ''), content }); return;
  }
  if (!['pdf', 'doc', 'docx'].includes(extension)) return toast('Please choose a supported document type.');
  try {
    toast(`Reading ${file.name} locally…`);
    const data = new FormData(); data.append('file', file);
    const response = await fetch('/api/import', { method: 'POST', body: data }); const article = await readServerResponse(response);
    if (!response.ok) throw new Error(article.error || 'Could not read that document.'); setArticle(article);
  } catch (error) { toast(error.message); }
});
document.querySelectorAll('.nav-link').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view))); $('.brand').addEventListener('click', () => setView('library')); $('#newTextButton').addEventListener('click', () => setView('library'));
$('#demoRange').addEventListener('input', (event) => { readingRange = { far: null, comfortable: null, near: null }; cameraActive = false; setDemoDistance(+event.target.value); $('#sensorStatus').textContent = 'Demo slider is in control.'; });
$('#quietButton').addEventListener('click', () => { const on = body.classList.toggle('quiet'); $('#quietButton').setAttribute('aria-pressed', on); $('#quietButton').textContent = on ? 'Quiet mode on' : 'Quiet mode'; });
$('#skipCameraButton').addEventListener('click', () => { $('#calibration').hidden = true; $('#sensorStatus').textContent = 'Manual controls are in control.'; });
$('#calibrateAgain').addEventListener('click', () => { resetCalibration(); $('#calibration').hidden = false; });
$('#controlsToggle').addEventListener('click', () => { const panel = $('#manualControls'); panel.hidden = !panel.hidden; $('#controlsToggle').setAttribute('aria-expanded', !panel.hidden); });
const fontStacks = { literata: '"Literata"', atkinson: '"Atkinson Hyperlegible"', source: '"Source Serif 4"' };
$('#fontChoice').addEventListener('change', (event) => root.style.setProperty('--reader-font', fontStacks[event.target.value]));
$('#fontSizeControl').addEventListener('input', (event) => { manualScale = +event.target.value / 100; $('#fontSizeOutput').textContent = `${event.target.value}%`; });
$('#lineHeightControl').addEventListener('input', (event) => { manualLeading = +event.target.value / 100; $('#lineHeightOutput').textContent = manualLeading.toFixed(2); });
$('#contrastChoice').addEventListener('change', (event) => { highContrast = event.target.value === 'high'; });
$('#editTextButton').addEventListener('click', () => { const editing = articleContent.contentEditable !== 'true'; articleContent.contentEditable = editing; $('#articleTitle').contentEditable = editing; $('#editTextButton').setAttribute('aria-pressed', editing); $('#editTextButton').textContent = editing ? 'Finish editing' : 'Edit imported text'; if (editing) articleContent.focus(); });
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) return toast('Camera access needs localhost. Use Start Local Server.command.');
  const message = $('#calibrationMessage'); $('#startCameraButton').disabled = true; $('#startCameraButton').textContent = 'Starting…';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
    const video = $('#cameraVideo'); video.srcObject = stream; await video.play(); $('#cameraPreview').hidden = false; $('#cameraMessage').textContent = 'Looking for a face…';
    // Pinned to an available package release. The former 0.10.22 URL did not exist on jsDelivr,
    // which caused the browser TypeError after camera permission had already succeeded.
    const { FilesetResolver, FaceDetector } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/vision_bundle.mjs');
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm');
    detector = await FaceDetector.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite', delegate: 'CPU' }, runningMode: 'VIDEO', minDetectionConfidence: .45 });
    cameraActive = true; $('#startCameraButton').textContent = 'Camera ready'; updateCalibrationUI(); message.textContent = 'Face detection is ready. Start upright, then capture your close and supported-backrest positions.'; watchFace();
  } catch (error) { $('#cameraMessage').textContent = 'Camera on; face detection unavailable'; $('#startCameraButton').disabled = false; $('#startCameraButton').textContent = 'Try camera again'; message.textContent = `Camera preview started, but face detection could not load: ${error.message || error.name || 'browser error'}. Use the demo slider or try again.`; }
}
function watchFace() { if (!cameraActive || !detector) return; const video = $('#cameraVideo'); if (video.readyState >= 2) { const result = detector.detectForVideo(video, performance.now()); const box = result.detections?.[0]?.boundingBox; if (box) { updateFaceRatio(box.width / video.videoWidth); $('#cameraMessage').textContent = readingRange.comfortable ? `${Math.round((latestFaceRatio / readingRange.comfortable) * 100)}% of upright position` : 'Face found'; } } requestAnimationFrame(watchFace); }
$('#startCameraButton').addEventListener('click', startCamera);
$('#confirmDistanceButton').addEventListener('click', () => {
  if (!latestFaceRatio) return toast('Let the camera find your face before saving this position.');
  if (calibrationStage === 0) readingRange.comfortable = latestFaceRatio;
  if (calibrationStage === 1) { if (latestFaceRatio <= readingRange.comfortable * 1.05) return toast('Move a little closer before saving your close limit.'); readingRange.near = latestFaceRatio; }
  if (calibrationStage === 2) { if (latestFaceRatio >= readingRange.comfortable * .95) return toast('Lean back into your chair before saving your supported position.'); readingRange.far = latestFaceRatio; }
  calibrationStage += 1;
  if (calibrationStage === 3) { $('#calibration').hidden = true; $('#sensorStatus').textContent = 'Personal comfort range is active — local only.'; return; }
  updateCalibrationUI();
});
renderProximity();
