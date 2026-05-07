window.PosgradoApi = (() => {
  const config = window.POSGRADO_CONFIG;

  function getConfiguredUrl() {
    return localStorage.getItem(config.STORAGE_KEY) || config.APPS_SCRIPT_URL || '';
  }

  function saveConfiguredUrl(url) {
    localStorage.setItem(config.STORAGE_KEY, url.trim());
  }

  async function call(action, payload = {}) {
    const apiUrl = getConfiguredUrl();
    if (!apiUrl) {
      throw new Error('Primero configurá la URL del despliegue de Apps Script.');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'No se pudo completar la operación.');
    }
    return data;
  }

  return {
    call,
    getConfiguredUrl,
    saveConfiguredUrl,
    listCareers: () => call('listCareers'),
    listInscriptions: () => call('listInscriptions'),
    createInscription: (inscripcion, archivos) => call('createInscription', { inscripcion, archivos }),
    updateStatus: (codigoPublico, estado, motivoRechazo = '') => call('updateStatus', { codigoPublico, estado, motivoRechazo }),
    updateDocumentStatus: (documentoId, estado, observacionRechazo = '') => call('updateDocumentStatus', { documentoId, estado, observacionRechazo }),
    admitInscription: (inscripcionId) => call('admitInscription', { inscripcionId }),
    rejectInscription: (inscripcionId, motivoRechazo) => call('rejectInscription', { inscripcionId, motivoRechazo }),
  };
})();
