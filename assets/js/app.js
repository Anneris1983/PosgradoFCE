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
      ui.setFormMessage('No se pudieron cargar las carreras desde el sistema. Puede completar el formulario igual y reintentar.', 'error');
    }
  }

  async function handleInscriptionSubmit(event) {
    event.preventDefault();
    ui.setFormMessage('Enviando inscripción. Espere unos segundos...');

    try {
      const payload = getInscriptionPayload(ui.elements.inscriptionForm);
      const archivos = await collectFiles(ui.elements.inscriptionForm);
      const data = await api.createInscription(payload, archivos);
      ui.elements.inscriptionForm.reset();
      ui.showSuccess(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      ui.setFormMessage(error.message || 'No se pudo enviar la inscripción. Intente nuevamente.', 'error');
    }
  }

  function init() {
    ui.fillCareers(config.CARRERAS_FALLBACK);
    loadCareers();

    if (ui.elements.inscriptionForm) {
      ui.elements.inscriptionForm.addEventListener('submit', handleInscriptionSubmit);
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', window.PosgradoApp.init);
