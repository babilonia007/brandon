// Función para subir archivos a Cloudinary
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
    } else {
      fd.append('folder', 'chat-brandon-camera');
    }

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
        } catch (e) {
          reject('Error parsing response');
        }
      } else {
        reject('Upload failed');
      }
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