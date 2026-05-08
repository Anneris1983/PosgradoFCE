window.PosgradoApp = (() => {
  const config = window.POSGRADO_CONFIG;
  const api = window.PosgradoApi;
  const ui = window.PosgradoUi;
  const PDF_MIME_TYPE = 'application/pdf';

  function isPdfFile(file) {
    const name = String(file?.name || '').toLowerCase();
    return file?.type === PDF_MIME_TYPE || name.endsWith('.pdf');
  }

  function validatePdfOnly(form) {
    for (const field of config.FILE_FIELDS) {
      const input = form.elements[field];
      if (input?.files?.length) {
        const file = input.files[0];
        if (!isPdfFile(file)) {
          const label = input.closest('label')?.childNodes?.[0]?.textContent?.trim() || 'Documento';
          throw new Error(`${label}: solo se permiten archivos PDF.`);
        }
      }
    }
  }

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
    validatePdfOnly(form);

    for (const field of config.FILE_FIELDS) {
      const input = form.elements[field];
      if (input?.files?.length) {
        const file = input.files[0];
        files.push({
          campo: field,
          nombre: file.name,
          mimeType: PDF_MIME_TYPE,
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
