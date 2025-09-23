async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['openaiApiKey'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Erro ao acessar chrome.storage:', chrome.runtime.lastError);
        resolve(null);
        return;
      }
      resolve(result.openaiApiKey || null);
    });
  });
}

async function callTranscriptionApi(blob, mimeType) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: 'Configure a chave da API da OpenAI nas opções da extensão.',
    };
  }

  const fileName = `audio-${Date.now()}.webm`;
  const file = new File([blob], fileName, { type: mimeType || 'audio/webm' });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', 'whisper-1');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `Erro ${response.status} na API de transcrição.`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.error && errorData.error.message) {
          errorMessage = errorData.error.message;
        }
      } catch (error) {
        console.warn('Não foi possível interpretar erro da API:', error);
      }
      return { success: false, error: errorMessage };
    }

    const data = await response.json();
    return {
      success: true,
      transcript: data.text || '',
    };
  } catch (error) {
    console.error('Erro ao chamar a API de transcrição:', error);
    return {
      success: false,
      error: error.message || 'Falha de rede ao contatar a API de transcrição.',
    };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    return;
  }

  if (message.action === 'open-options') {
    chrome.runtime.openOptionsPage(() => {
      if (chrome.runtime.lastError) {
        console.error('Não foi possível abrir a página de opções:', chrome.runtime.lastError);
        sendResponse({ success: false, error: 'Não foi possível abrir as opções da extensão.' });
        return;
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action !== 'transcribe-audio') {
    return;
  }

  const { blob, mimeType } = message;
  if (!blob) {
    sendResponse({ success: false, error: 'Nenhum áudio recebido para transcrição.' });
    return;
  }

  callTranscriptionApi(blob, mimeType)
    .then((result) => {
      sendResponse(result);
    })
    .catch((error) => {
      console.error('Erro inesperado ao processar transcrição:', error);
      sendResponse({ success: false, error: error.message || 'Erro inesperado.' });
    });

  return true;
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage(() => {
    if (chrome.runtime.lastError) {
      console.error('Erro ao abrir opções ao clicar no ícone:', chrome.runtime.lastError);
    }
  });
});
