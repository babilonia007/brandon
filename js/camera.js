// Estado de la cámara
const cam = { stream: null, isFront: false, flash: false, blob: null };
const cOverlay = document.getElementById('cameraOverlay');

// Elementos DOM
const cameraVideo = document.getElementById('cameraVideoElement');
const cameraCanvas = document.getElementById('cameraCanvas');
const cameraPreviewResult = document.getElementById('cameraPreviewResult');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const cameraSwitchBtn = document.getElementById('cameraSwitchBtn');
const cameraFlashBtn = document.getElementById('cameraFlashBtn');
const captureBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');
const sendMediaBtn = document.getElementById('sendMediaBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');

// Iniciar cámara
async function startCamera() {
  try {
    if (cam.stream) cam.stream.getTracks().forEach(t => t.stop());
    cam.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: cam.isFront ? 'user' : 'environment' }
    });
    cameraVideo.srcObject = cam.stream;
    cameraVideo.style.display = 'block';
    cameraVideo.style.transform = cam.isFront ? 'scaleX(-1)' : 'scaleX(1)';
    cameraPlaceholder.style.display = 'none';
  } catch (e) {
    cameraPlaceholder.innerHTML = '<p>Error al acceder a la cámara</p><button onclick="startCamera()">Reintentar</button>';
  }
}

// Event listeners
document.getElementById('cameraBtn').addEventListener('click', () => {
  cOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  startCamera();
});

cameraSwitchBtn.addEventListener('click', () => {
  cam.isFront = !cam.isFront;
  startCamera();
});

cameraFlashBtn.addEventListener('click', () => {
  cam.flash = !cam.flash;
  try {
    const track = cam.stream.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      track.applyConstraints({ advanced: [{ torch: cam.flash }] });
    }
  } catch(e) {}
  cameraFlashBtn.classList.toggle('active', cam.flash);
});

captureBtn.addEventListener('click', () => {
  const video = cameraVideo;
  const canvas = cameraCanvas;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (cam.isFront) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(blob => {
    cam.blob = blob;
    const url = URL.createObjectURL(blob);
    cameraPreviewResult.src = url;
    cameraPreviewResult.style.display = 'block';
    video.style.display = 'none';
    retakeBtn.style.display = 'flex';
    sendMediaBtn.style.display = 'flex';
    captureBtn.style.display = 'none';
  }, 'image/jpeg', 0.9);
});

retakeBtn.addEventListener('click', () => {
  cam.blob = null;
  cameraPreviewResult.style.display = 'none';
  cameraVideo.style.display = 'block';
  retakeBtn.style.display = 'none';
  sendMediaBtn.style.display = 'none';
  captureBtn.style.display = 'flex';
});

sendMediaBtn.addEventListener('click', async () => {
  if (!cam.blob) return;
  showUploadOverlay();
  try {
    const url = await uploadToCloudinary(cam.blob, 'image');
    const payload = {
      imageUrl: url,
      userId: user.id,
      userData: { colorIndex: user.colorIndex },
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      replyTo: replyingTo
    };
    await messagesRef.push(payload);
    cOverlay.style.display = 'none';
    document.body.style.overflow = '';
    if (replyingTo) {
      replyingTo = null;
      replyPreview.classList.remove('active');
    }
  } catch (e) {
    alert('Error al enviar');
  } finally {
    hideUploadOverlay();
  }
});

closeCameraBtn.addEventListener('click', () => {
  if (cam.stream) cam.stream.getTracks().forEach(t => t.stop());
  cOverlay.style.display = 'none';
  document.body.style.overflow = '';
});