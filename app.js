// ==================== ESTADO GLOBAL ====================
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const loadingState = document.getElementById('loadingState');
const replyPreview = document.getElementById('replyPreview');
const replyText = document.getElementById('replyPreviewText');

// Usuario
let user = (() => {
  try {
    const saved = localStorage.getItem('brandon-user');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return {
    id: 'user_' + Math.random().toString(36).substring(2, 15) + Date.now(),
    colorIndex: Math.floor(Math.random() * 10),
    created: Date.now()
  };
})();
localStorage.setItem('brandon-user', JSON.stringify(user));

// Variables de control
const displayedIds = new Set();
let shouldScroll = true;
let userScrolling = false;
let replyingTo = null;
let editingId = null;
let selectedImageFile = null;

// ==================== FUNCIÓN PARA CREAR ELEMENTO DE MENSAJE ====================
function createMessageElement(id, msg) {
  const div = document.createElement('div');
  div.className = 'message';
  div.id = 'msg-' + id;
  div.dataset.id = id;
  div.dataset.userId = msg.userId || '';

  if (msg.replyTo && msg.replyTo.text) {
    const replyDiv = document.createElement('div');
    replyDiv.className = 'message-reply-quoted';
    replyDiv.textContent = msg.replyTo.text.slice(0, 100) + (msg.replyTo.text.length > 100 ? '…' : '');
    replyDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      scrollToMessage(msg.replyTo.id);
    });
    div.appendChild(replyDiv);
  }

  if (msg.text && msg.text.trim() !== '' && 
      !msg.text.includes('📷') && !msg.text.includes('🎤') && !msg.text.includes('🎥')) {
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = msg.text;
    div.appendChild(textDiv);
  }

  if (msg.imageUrl) {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'message-image-container';
    const img = document.createElement('img');
    img.className = 'message-image';
    img.src = msg.imageUrl;
    img.loading = 'lazy';
    img.addEventListener('click', () => window.open(msg.imageUrl, '_blank'));
    imgContainer.appendChild(img);
    div.appendChild(imgContainer);
  }

  if (msg.audioUrl) {
    const audioContainer = document.createElement('div');
    audioContainer.className = 'message-audio-container';
    const audio = document.createElement('audio');
    audio.src = msg.audioUrl;
    audio.controls = true;
    audio.preload = 'metadata';
    audioContainer.appendChild(audio);
    div.appendChild(audioContainer);
  }

  if (msg.videoUrl) {
    const videoContainer = document.createElement('div');
    videoContainer.className = 'message-video-container';
    const video = document.createElement('video');
    video.src = msg.videoUrl;
    video.controls = true;
    video.playsInline = true;
    video.className = 'message-video';
    videoContainer.appendChild(video);
    div.appendChild(videoContainer);
  }

  if (msg.edited) {
    const edited = document.createElement('div');
    edited.className = 'message-edited';
    edited.textContent = 'editado';
    div.appendChild(edited);
  }

  if (msg.userId === user.id) {
    div.classList.add('sent');
    const colors = [
      ['#FF6B6B', '#FFA726'], ['#42A5F5', '#66BB6A'], ['#AB47BC', '#EC407A'],
      ['#FFCA28', '#FFA726'], ['#5C6BC0', '#26C6DA'], ['#26A69A', '#66BB6A']
    ];
    const idx = (msg.timestamp ? Math.floor(msg.timestamp / 1000) : Date.now()) % colors.length;
    div.style.background = `linear-gradient(135deg, ${colors[idx][0]}, ${colors[idx][1]})`;
  } else {
    div.classList.add('received');
    const pastelClasses = [
      'pastel-color-1', 'pastel-color-2', 'pastel-color-3', 'pastel-color-4',
      'pastel-color-5', 'pastel-color-6', 'pastel-color-7', 'pastel-color-8',
      'pastel-color-9', 'pastel-color-10'
    ];
    const idx = msg.userId ? Math.abs(msg.userId.split('').reduce((a,c) => a + c.charCodeAt(0), 0)) % 10 : 0;
    div.classList.add(pastelClasses[idx]);
  }

  div.addEventListener('click', () => {
    replyingTo = { id, text: msg.text || '' };
    replyText.textContent = (msg.text || '').slice(0, 140) + ((msg.text || '').length > 140 ? '…' : '');
    replyPreview.classList.add('active');
    messageInput.focus();
  });

  if (msg.userId === user.id) {
    let timer;
    div.addEventListener('touchstart', (e) => {
      e.preventDefault();
      timer = setTimeout(() => startEdit(id, msg.text || '', div), 600);
    }, { passive: false });
    div.addEventListener('touchend', () => clearTimeout(timer));
    div.addEventListener('touchcancel', () => clearTimeout(timer));
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      startEdit(id, msg.text || '', div);
    });
  }

  return div;
}

function startEdit(id, text, element) {
  editingId = id;
  if (element) element.classList.add('editing');
  messageInput.value = text || '';
  messageInput.placeholder = 'Editando mensaje...';
  messageInput.focus();
  messageInput.select();
}

function scrollToMessage(id) {
  const el = document.getElementById('msg-' + id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.boxShadow = '0 0 0 3px #4CAF50';
    setTimeout(() => el.style.boxShadow = '', 1500);
  }
}

function smoothScroll() {
  if (shouldScroll && !userScrolling) {
    setTimeout(() => {
      chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    }, 100);
  }
}

function handleNewMessage(id, msg) {
  if (!id || !msg || displayedIds.has(id)) return;
  displayedIds.add(id);
  const el = createMessageElement(id, msg);
  chatMessages.appendChild(el);
  smoothScroll();
}

function handleUpdateMessage(id, data) {
  const el = document.getElementById('msg-' + id);
  if (!el) return;
  const textDiv = el.querySelector('.message-text');
  if (textDiv && data.text !== undefined) textDiv.textContent = data.text;
  if (data.edited && !el.querySelector('.message-edited')) {
    const edited = document.createElement('div');
    edited.className = 'message-edited';
    edited.textContent = 'editado';
    el.appendChild(edited);
  }
}

function removeMessage(id) {
  const el = document.getElementById('msg-' + id);
  if (el) el.remove();
  displayedIds.delete(id);
}

// ==================== FIREBASE LISTENERS ====================
messagesRef.once('value', (snap) => {
  const msgs = [];
  snap.forEach(child => msgs.push({ id: child.key, ...child.val() }));
  msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  msgs.forEach(m => handleNewMessage(m.id, m));
  if (loadingState) loadingState.style.display = 'none';
  smoothScroll();
}).catch(console.error);

messagesRef.on('child_added', (snap) => {
  if (!displayedIds.has(snap.key)) handleNewMessage(snap.key, snap.val());
});
messagesRef.on('child_changed', (snap) => handleUpdateMessage(snap.key, snap.val()));
messagesRef.on('child_removed', (snap) => removeMessage(snap.key));

connectedRef.on('value', (snap) => {
  const statusEl = document.getElementById('connectionStatus');
  if (snap.val()) {
    statusEl.className = 'connection-status connected';
    statusEl.innerHTML = '<span>✅</span><span>Conectado</span>';
    statusEl.style.display = 'flex';
    setTimeout(() => statusEl.style.display = 'none', 3000);
  } else {
    statusEl.className = 'connection-status disconnected';
    statusEl.innerHTML = '<span>🔴</span><span>Sin conexión</span>';
    statusEl.style.display = 'flex';
  }
});

// ==================== EVENT LISTENERS PRINCIPALES ====================
document.getElementById('messageForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  if (editingId) {
    messagesRef.child(editingId).update({
      text: text,
      edited: true,
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
      editingId = null;
      messageInput.value = '';
      messageInput.placeholder = 'Mensaje...';
    }).catch(console.error);
    return;
  }
  const payload = {
    text: text,
    userId: user.id,
    userData: { colorIndex: user.colorIndex },
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    replyTo: replyingTo
  };
  messagesRef.push(payload).then(() => {
    messageInput.value = '';
    if (replyingTo) {
      replyingTo = null;
      replyPreview.classList.remove('active');
    }
  }).catch(console.error);
});

// Galería
document.getElementById('galleryBtn').addEventListener('click', () => {
  document.getElementById('realFileInput').click();
});

document.getElementById('realFileInput').addEventListener('change', (e) => {
  if (!e.target.files[0]) return;
  selectedImageFile = e.target.files[0];
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('preview').src = ev.target.result;
    document.getElementById('imagePreviewModal').style.display = 'block';
  };
  reader.readAsDataURL(selectedImageFile);
});

document.getElementById('cancelImageBtn').addEventListener('click', () => {
  document.getElementById('imagePreviewModal').style.display = 'none';
  selectedImageFile = null;
  document.getElementById('realFileInput').value = '';
});

document.getElementById('sendImageBtn').addEventListener('click', async () => {
  if (!selectedImageFile) return;
  showUploadOverlay();
  try {
    const url = await uploadToCloudinary(selectedImageFile, 'image');
    const caption = document.getElementById('imageCaption').value.trim();
    const payload = {
      imageUrl: url,
      userId: user.id,
      userData: { colorIndex: user.colorIndex },
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      replyTo: replyingTo
    };
    if (caption) payload.text = caption;
    await messagesRef.push(payload);
    document.getElementById('imagePreviewModal').style.display = 'none';
    document.getElementById('imageCaption').value = '';
    selectedImageFile = null;
    if (replyingTo) {
      replyingTo = null;
      replyPreview.classList.remove('active');
    }
  } catch (e) {
    alert('Error al enviar imagen');
  } finally {
    hideUploadOverlay();
  }
});

// Cerrar respuesta
document.getElementById('closeReplyBtn').addEventListener('click', () => {
  replyingTo = null;
  replyPreview.classList.remove('active');
});

// Scroll
chatMessages.addEventListener('scroll', () => {
  userScrolling = true;
  clearTimeout(window.scrollTimer);
  window.scrollTimer = setTimeout(() => userScrolling = false, 800);
  const distanceFromBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
  shouldScroll = distanceFromBottom < 150;
}, { passive: true });

// Tecla ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (aOverlay.style.display === 'flex') {
      if (audio.stream) audio.stream.getTracks().forEach(t => t.stop());
      aOverlay.style.display = 'none';
      document.body.style.overflow = '';
      resetAudioState();
    }
    if (cOverlay.style.display === 'flex') {
      if (cam.stream) cam.stream.getTracks().forEach(t => t.stop());
      cOverlay.style.display = 'none';
      document.body.style.overflow = '';
    }
    document.getElementById('imagePreviewModal').style.display = 'none';
  }
});

console.log('✅ App con imagen completa sin recorte');