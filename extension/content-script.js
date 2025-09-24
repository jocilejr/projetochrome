(() => {
  if (window.__waTranscriberButtonInjected) {
    return;
  }
  window.__waTranscriberButtonInjected = true;

  const button = document.createElement('button');
  button.textContent = 'Transcrever áudio';
  Object.assign(button.style, {
    position: 'fixed',
    right: '24px',
    bottom: '24px',
    zIndex: '2147483647',
    padding: '12px 16px',
    borderRadius: '999px',
    border: 'none',
    backgroundColor: '#25d366',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  });

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.05)';
    button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.25)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
  });

  const toast = document.createElement('div');
  Object.assign(toast.style, {
    position: 'fixed',
    right: '24px',
    bottom: '84px',
    maxWidth: '320px',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(11, 20, 26, 0.95)',
    color: '#ffffff',
    fontSize: '13px',
    lineHeight: '1.4',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    opacity: '0',
    transform: 'translateY(10px)',
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    zIndex: '2147483647',
  });
  toast.setAttribute('role', 'status');

  let toastTimeout;
  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.backgroundColor = isError ? 'rgba(217, 48, 37, 0.95)' : 'rgba(11, 20, 26, 0.95)';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 4000);
  }

  function getAudioSource(audio) {
    if (!audio) {
      return '';
    }

    return audio.src || audio.currentSrc || audio.querySelector('source')?.src || '';
  }

  function inferMimeTypeFromUrl(url) {
    if (!url) {
      return '';
    }

    try {
      const { pathname } = new URL(url, window.location.href);
      const extension = pathname.split('.').pop()?.toLowerCase();

      switch (extension) {
        case 'mp3':
          return 'audio/mpeg';
        case 'ogg':
        case 'oga':
          return 'audio/ogg';
        case 'wav':
          return 'audio/wav';
        case 'm4a':
        case 'mp4':
          return 'audio/mp4';
        default:
          return '';
      }
    } catch (error) {
      console.warn('Não foi possível inferir o MIME type a partir da URL:', error);
      return '';
    }
  }

  async function handleClick() {
    try {
      button.disabled = true;
      button.textContent = 'Buscando áudio…';

      const audios = Array.from(document.querySelectorAll('audio'))
        .filter((audio) => Boolean(getAudioSource(audio)));
      const lastAudio = audios[audios.length - 1];

      if (!lastAudio) {
        showToast('Nenhum áudio encontrado na conversa atual.', true);
        return;
      }

      const sourceUrl = getAudioSource(lastAudio);

      if (!sourceUrl) {
        showToast('Não foi possível determinar a origem do áudio selecionado.', true);
        return;
      }

      button.textContent = 'Baixando áudio…';
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error('Falha ao baixar o áudio.');
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('O áudio baixado está vazio.');
      }

      button.textContent = 'Enviando para transcrição…';
      const result = await sendMessage({
        action: 'transcribe-audio',
        mimeType: blob.type || lastAudio.type || inferMimeTypeFromUrl(sourceUrl) || 'audio/ogg',
        blob,
      });

      if (!result || !result.success) {
        const message = result && result.error ? result.error : 'Transcrição não disponível.';
        throw new Error(message);
      }

      const transcript = result.transcript || '';
      let clipboardMessage = '';
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(transcript);
          clipboardMessage = ' (copiada para a área de transferência)';
        } catch (error) {
          console.warn('Falha ao copiar transcrição:', error);
        }
      }

      showToast(`Transcrição pronta${clipboardMessage}: ${transcript}`, false);
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      showToast(error.message || 'Erro inesperado durante a transcrição.', true);
    } finally {
      button.disabled = false;
      button.textContent = 'Transcrever áudio';
    }
  }

  function sendMessage(payload) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(payload, (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }
          resolve(response);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  button.addEventListener('click', handleClick);

  document.body.appendChild(button);
  document.body.appendChild(toast);
})();
