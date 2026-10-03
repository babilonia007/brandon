// ==================== FIREBASE CONFIG ====================    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const messagesRef = database.ref('brandon-chat/messages');
    const connectedRef = database.ref('.info/connected');

    // ==================== NOTIFICACIONES NATIVAS ====================
    const notificationBtn = document.getElementById('notificationBtn');
    const nativeNotificationModal = document.getElementById('nativeNotificationModal');
    const nativeNotificationPermissionBtn = document.getElementById('nativeNotificationPermissionBtn');
    const nativeNotificationCloseBtn = document.getElementById('nativeNotificationCloseBtn');
    const nativeNotificationText = document.getElementById('nativeNotificationText');

    function notificationsSupported() {
      return 'Notification' in window;
    }

    function updateNotificationUI() {
      if (!notificationBtn) return;
      notificationBtn.classList.remove('notifications-enabled', 'notifications-denied');

      if (!notificationsSupported()) {
        notificationBtn.title = 'Este navegador no admite notificaciones nativas';
        return;
      }

      if (Notification.permission === 'granted') {
        // Al aceptar, la campanita desaparece y no vuelve a mostrarse.
        notificationBtn.style.display = 'none';
        return;
      } else if (Notification.permission === 'denied') {
        notificationBtn.style.display = '';
        notificationBtn.classList.add('notifications-denied');
        notificationBtn.title = 'Notificaciones bloqueadas. Actívalas desde los permisos del navegador';
      } else {
        notificationBtn.title = 'Activar notificaciones';
      }
    }

    function openNotificationPermissionDialog() {
      if (!notificationsSupported()) {
        alert('Este navegador no permite notificaciones nativas.');
        return;
      }

      if (Notification.permission === 'granted') {
        updateNotificationUI();
        return;
      }

      if (Notification.permission === 'denied') {
        nativeNotificationText.textContent =
          'Las notificaciones están bloqueadas para esta página. Abre los permisos del sitio en tu navegador y permite las notificaciones.';
        nativeNotificationPermissionBtn.textContent = 'Volver a comprobar';
        nativeNotificationModal.style.display = 'flex';
        return;
      }

      nativeNotificationText.textContent =
        'Pulsa “Permitir notificaciones”. El navegador mostrará su ventana nativa para que confirmes el permiso.';
      nativeNotificationPermissionBtn.textContent = 'Permitir notificaciones';
      nativeNotificationModal.style.display = 'flex';
    }

    async function requestNativeNotifications() {
      // IMPORTANTE: esta función se ejecuta directamente desde el click del usuario.
      if (!notificationsSupported()) {
        alert('Este navegador no admite la API de notificaciones.');
        return;
      }

      if (!window.isSecureContext) {
        nativeNotificationText.textContent =
          'Para mostrar la ventana nativa de permisos, esta página debe abrirse desde HTTPS o desde localhost. Un archivo HTML abierto directamente como archivo local no puede solicitar este permiso de forma fiable.';
        nativeNotificationPermissionBtn.textContent = 'Entendido';
        nativeNotificationModal.style.display = 'flex';
        return;
      }

      try {
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
          nativeNotificationModal.style.display = 'none';
          updateNotificationUI(); // Oculta la campanita de forma inmediata.

          // Confirmación inmediata para comprobar que el permiso funciona.
          const testNotification = new Notification('Notificaciones activadas', {
            body: 'El chat ya puede mostrar notificaciones nativas.',
            tag: 'brandon-chat-permission-test'
          });

          testNotification.onclick = () => {
            window.focus();
            testNotification.close();
          };
        } else if (permission === 'denied') {
          nativeNotificationText.textContent =
            'El navegador bloqueó las notificaciones. Debes permitirlas desde los permisos de este sitio en la configuración del navegador.';
          nativeNotificationPermissionBtn.textContent = 'Reintentar';
          updateNotificationUI();
        } else {
          nativeNotificationText.textContent =
            'El permiso no fue concedido. Pulsa el botón nuevamente si quieres solicitarlo.';
          updateNotificationUI();
        }
      } catch (error) {
        console.error('Error solicitando notificaciones:', error);
        nativeNotificationText.textContent =
          'No fue posible solicitar el permiso en este momento. Comprueba que la página esté abierta mediante HTTPS.';
        nativeNotificationPermissionBtn.textContent = 'Cerrar';
      }
    }

    function showNativeMessageNotification(msg) {
      if (!notificationsSupported()) return;
      if (Notification.permission !== 'granted') return;
      if (!msg || msg.userId === user.id) return;

      // La notificación nativa se muestra SIEMPRE para cada mensaje
      // recibido de otro usuario, incluso si el chat está abierto y enfocado.
      let body = 'Tienes un mensaje nuevo.';
      if (msg.text && msg.text.trim()) body = msg.text.trim();
      else if (msg.imageUrl) body = '📷 Te enviaron una imagen';
      else if (msg.audioUrl) body = '🎤 Te enviaron un audio';
      else if (msg.videoUrl) body = '🎥 Te enviaron un video';

      const n = new Notification('Nuevo mensaje', {
        body: body.slice(0, 180),
        tag: 'brandon-chat-' + (msg.userId || 'mensaje') + '-' + Date.now(),
        renotify: true,
        silent: false
      });

      n.onclick = () => {
        window.focus();
        n.close();
      };
    }

    notificationBtn.addEventListener('click', openNotificationPermissionDialog);
    nativeNotificationPermissionBtn.addEventListener('click', requestNativeNotifications);
    nativeNotificationCloseBtn.addEventListener('click', () => {
      nativeNotificationModal.style.display = 'none';
    });
    nativeNotificationModal.addEventListener('click', (e) => {
      if (e.target === nativeNotificationModal) nativeNotificationModal.style.display = 'none';
    });

    // Si el permiso ya había sido aceptado anteriormente, la campanita
    // permanece oculta desde que se carga la página.
    updateNotificationUI();


    // ==================== CLOUDINARY ====================
    async function uploadToCloudinary(blob, type) {
      return new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append('file', blob);
        fd.append('upload_preset', 'chat_images');
        fd.append('cloud_name', 'dymmyqlfw');
        if (type === 'audio') fd.append('folder', 'chat-brandon-audio');
        else if (type === 'video') {
          fd.append('folder', 'chat-brandon-video');
          fd.append('resource_type', 'video');
        } else fd.append('folder', 'chat-brandon-camera');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.cloudinary.com/v1_1/dymmyqlfw/upload');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            updateUploadProgress(percent);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data.secure_url || data.url);
            } catch (e) { reject('Error parsing response'); }
          } else reject('Upload failed');
        };
        xhr.onerror = () => reject('Network error');
        xhr.send(fd);
      });
    }
    function showUploadOverlay() {
      document.getElementById('uploadOverlay').style.display = 'flex';
      updateUploadProgress(0);
    }
    function hideUploadOverlay() {
      document.getElementById('uploadOverlay').style.display = 'none';
    }
    function updateUploadProgress(p) {
      document.getElementById('uploadBar').style.width = p + '%';
      document.getElementById('uploadPercentage').textContent = p + '%';
    }

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

    // ==================== FUNCIÓN PARA CREAR MENSAJE ====================
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
      if (!displayedIds.has(snap.key)) {
        const msg = snap.val();
        handleNewMessage(snap.key, msg);
        showNativeMessageNotification(msg);
      }
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

    document.getElementById('closeReplyBtn').addEventListener('click', () => {
      replyingTo = null;
      replyPreview.classList.remove('active');
    });

    chatMessages.addEventListener('scroll', () => {
      userScrolling = true;
      clearTimeout(window.scrollTimer);
      window.scrollTimer = setTimeout(() => userScrolling = false, 800);
      const distanceFromBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
      shouldScroll = distanceFromBottom < 150;
    }, { passive: true });

    // ==================== AUDIO RECORDER ====================
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
      if (audio.recorder && audio.recorder.state !== 'inactive') audio.recorder.stop();
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

    // ==================== CÁMARA ====================
    const cam = { stream: null, isFront: false, flash: false, blob: null };
    const cOverlay = document.getElementById('cameraOverlay');
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

    // ==================== ESC ====================
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

    console.log('✅ App unificada - Brandon Chat multimedia');
