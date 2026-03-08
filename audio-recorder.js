// Estado del grabador de audio
const audio = { 
  stream: null, 
  recorder: null, 
  chunks: [], 
  blob: null,
  isRecording: false,
  seconds: 0,
  timerInterval: null,
  waveInterval: null
};

// Elementos DOM
const aOverlay = document.getElementById('audioRecorderOverlay');
const permissionSection = document.getElementById('audioPermissionSection');
const recordingControls = document.getElementById('audioRecordingControls');
const startBtn = document.getElementById('startRecordBtn');
const stopBtn = document.getElementById('stopRecordBtn');
const sendBtn = document.getElementById('sendAudioBtn');
const cancelBtn = document.getElementById('cancelAudioBtn');
const audioTimer = document.getElementById('audioTimer');
const audioWave = document.getElementById('audioWave');
const audioStatus = document.getElementById('audioStatusText');

// Inicializar onda de audio
function initAudioWave() {
  audioWave.innerHTML = '';
  for (let i = 0; i < 40; i++) {
    const bar = document.createElement('div');
    bar.className = 'audio-wave-bar';
    bar.style.height = '3px';
    audioWave.appendChild(bar);
  }
}
initAudioWave();

// Simular visualizador durante la grabación
function startWaveAnimation() {
  if (audio.waveInterval) clearInterval(audio.waveInterval);
  audio.waveInterval = setInterval(() => {
    const bars = audioWave.querySelectorAll('.audio-wave-bar');
    bars.forEach(bar => {
      const height = Math.floor(Math.random() * 60) + 5;
      bar.style.height = height + 'px';
    });
  }, 150);
}

function stopWaveAnimation() {
  if (audio.waveInterval) {
    clearInterval(audio.waveInterval);
    audio.waveInterval = null;
  }
  const bars = audioWave.querySelectorAll('.audio-wave-bar');
  bars.forEach(bar => bar.style.height = '3px');
}

// Actualizar timer
function updateTimer() {
  const mins = Math.floor(audio.seconds / 60).toString().padStart(2, '0');
  const secs = (audio.seconds % 60).toString().padStart(2, '0');
  audioTimer.textContent = `${mins}:${secs}`;
}

function startTimer() {
  if (audio.timerInterval) clearInterval(audio.timerInterval);
  audio.timerInterval = setInterval(() => {
    if (audio.isRecording) {
      audio.seconds++;
      updateTimer();
    }
  }, 1000);
}

function stopTimer() {
  if (audio.timerInterval) {
    clearInterval(audio.timerInterval);
    audio.timerInterval = null;
  }
}

// Resetear estado
function resetAudioState() {
  audio.isRecording = false;
  audio.seconds = 0;
  updateTimer();
  stopWaveAnimation();
  stopTimer();
  startBtn.disabled = false;
  stopBtn.disabled = true;
  sendBtn.disabled = true;
  audioStatus.textContent = 'Presiona grabar para comenzar';
}

// Configurar event listeners
document.getElementById('requestMicPermissionBtn').addEventListener('click', async () => {
  try {
    audio.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    permissionSection.style.display = 'none';
    recordingControls.style.display = 'block';
    audioStatus.textContent = 'Listo para grabar';
  } catch (e) {
    alert('Permiso de micrófono denegado');
    aOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }
});

document.getElementById('micBtn').addEventListener('click', () => {
  aOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  resetAudioState();
  if (audio.stream) {
    permissionSection.style.display = 'none';
    recordingControls.style.display = 'block';
  } else {
    permissionSection.style.display = 'block';
    recordingControls.style.display = 'none';
  }
});

startBtn.addEventListener('click', () => {
  if (!audio.stream) return;
  
  audio.chunks = [];
  audio.recorder = new MediaRecorder(audio.stream);
  
  audio.recorder.ondataavailable = (e) => {
    if (e.data.size > 0) audio.chunks.push(e.data);
  };
  
  audio.recorder.onstop = () => {
    audio.blob = new Blob(audio.chunks, { type: 'audio/webm' });
    sendBtn.disabled = false;
    audioStatus.textContent = 'Grabación lista para enviar';
    stopWaveAnimation();
  };
  
  audio.recorder.start(1000);
  audio.isRecording = true;
  audio.seconds = 0;
  updateTimer();
  startTimer();
  startWaveAnimation();
  
  startBtn.disabled = true;
  stopBtn.disabled = false;
  sendBtn.disabled = true;
  audioStatus.textContent = 'Grabando...';
});

stopBtn.addEventListener('click', () => {
  if (audio.recorder && audio.recorder.state !== 'inactive') {
    audio.recorder.stop();
    audio.isRecording = false;
    stopTimer();
    stopBtn.disabled = true;
    audioStatus.textContent = 'Grabación finalizada';
  }
});

cancelBtn.addEventListener('click', () => {
  if (audio.recorder && audio.recorder.state !== 'inactive') {
    audio.recorder.stop();
  }
  if (audio.stream) {
    audio.stream.getTracks().forEach(t => t.stop());
    audio.stream = null;
  }
  aOverlay.style.display = 'none';
  document.body.style.overflow = '';
  resetAudioState();
});

sendBtn.addEventListener('click', async () => {
  if (!audio.blob) return;
  showUploadOverlay();
  try {
    const url = await uploadToCloudinary(audio.blob, 'audio');
    const payload = {
      audioUrl: url,
      userId: user.id,
      userData: { colorIndex: user.colorIndex },
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      replyTo: replyingTo
    };
    await messagesRef.push(payload);
    aOverlay.style.display = 'none';
    document.body.style.overflow = '';
    if (replyingTo) {
      replyingTo = null;
      replyPreview.classList.remove('active');
    }
  } catch (e) {
    alert('Error al enviar audio');
  } finally {
    hideUploadOverlay();
    if (audio.stream) {
      audio.stream.getTracks().forEach(t => t.stop());
      audio.stream = null;
    }
    resetAudioState();
  }
});