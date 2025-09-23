(function () {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('save');
  const feedback = document.getElementById('feedback');

  function setFeedback(message, type) {
    feedback.textContent = message;
    feedback.classList.remove('success', 'error');
    if (type) {
      feedback.classList.add(type);
    }
  }

  function validateKey(key) {
    if (!key) {
      return 'Informe uma chave iniciando com sk-.';
    }
    const normalized = key.trim();
    if (!/^sk-[A-Za-z0-9-]{10,}$/.test(normalized)) {
      return 'Formato de chave inválido. Verifique se está correto (ex: sk-xxxx).';
    }
    return null;
  }

  function getStoredKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['openaiApiKey'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Erro ao carregar chave:', chrome.runtime.lastError);
          resolve(null);
          return;
        }
        resolve(result.openaiApiKey || null);
      });
    });
  }

  function storeKey(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ openaiApiKey: key }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  async function init() {
    setFeedback('Carregando…');
    const storedKey = await getStoredKey();
    if (storedKey) {
      apiKeyInput.value = storedKey;
      setFeedback('Chave carregada com sucesso.', 'success');
    } else {
      setFeedback('');
    }
  }

  saveButton.addEventListener('click', async () => {
    const value = apiKeyInput.value.trim();
    const validationError = validateKey(value);
    if (validationError) {
      setFeedback(validationError, 'error');
      return;
    }

    saveButton.disabled = true;
    setFeedback('Salvando…');

    try {
      await storeKey(value);
      setFeedback('Chave salva com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar chave:', error);
      setFeedback('Não foi possível salvar a chave. Tente novamente.', 'error');
    } finally {
      saveButton.disabled = false;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
