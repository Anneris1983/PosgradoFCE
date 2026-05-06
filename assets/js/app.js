window.PosgradoApp = (() => {
  const config = window.POSGRADO_CONFIG;
  const api = window.PosgradoApi;
  const ui = window.PosgradoUi;

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function collectFiles(form) {
    const files = [];
    for (const field of config.FILE_FIELDS) {
      const input = form.elements[field];
      if (input?.files?.length) {
        const file = input.files[0];
        files.push({
          campo: field,
          nombre: file.name,
          mimeType: file.type || 'application/octet-stream',
          contenidoBase64: await fileToBase64(file),
        });
      }
    }
    return files;
  }

  function getInscriptionPayload(form) {
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    config.FILE_FIELDS.forEach((field) => delete payload[field]);
    return payload;
  }

  async function loadCareers() {
    try {
      const data = await api.listCareers();
      ui.fillCareers(data.carreras);
    } catch (error) {
      ui.fillCareers(config.CARRERAS_FALLBACK);
    }
  }

  async function loadInscriptions() {
    try {
      const data = await api.listInscriptions();
      ui.renderCounts(data.inscripciones);
      ui.renderRows(data.inscripciones, updateStatus);
      ui.setConnectionStatus('Conectado a Apps Script, Google Sheets, Drive y Gmail.', 'success');
    } catch (error) {
      ui.setConnectionStatus(error.message, 'error');
    }
  }

  async function updateStatus(codigoPublico, estado) {
    await api.updateStatus(codigoPublico, estado);
    await loadInscriptions();
  }

  async function handleConfigSubmit(event) {
    event.preventDefault();
    api.saveConfiguredUrl(ui.elements.apiInput.value);
    await loadCareers();
    await loadInscriptions();
  }

  async function handleInscriptionSubmit(event) {
    event.preventDefault();
    ui.setFormMessage('Guardando inscripción y documentación...');
    try {
      const payload = getInscriptionPayload(ui.elements.inscriptionForm);
      const archivos = await collectFiles(ui.elements.inscriptionForm);
      const data = await api.createInscription(payload, archivos);
      ui.elements.inscriptionForm.reset();
      ui.setFormMessage(`Inscripción guardada con código ${data.codigoPublico}.`, 'success');
      await loadInscriptions();
    } catch (error) {
      ui.setFormMessage(error.message, 'error');
    }
  }

  function init() {
    ui.elements.apiInput.value = api.getConfiguredUrl();
    ui.fillCareers(config.CARRERAS_FALLBACK);
    ui.elements.configForm.addEventListener('submit', handleConfigSubmit);
    ui.elements.inscriptionForm.addEventListener('submit', handleInscriptionSubmit);
    ui.elements.refreshButton.addEventListener('click', loadInscriptions);

    if (ui.elements.apiInput.value) {
      loadCareers();
      loadInscriptions();
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', window.PosgradoApp.init);
