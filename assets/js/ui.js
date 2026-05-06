window.PosgradoUi = (() => {
  const config = window.POSGRADO_CONFIG;
  const elements = {
    apiInput: document.querySelector('#api-url'),
    configForm: document.querySelector('#config-form'),
    connectionStatus: document.querySelector('#connection-status'),
    inscriptionForm: document.querySelector('#inscription-form'),
    formMessage: document.querySelector('#form-message'),
    carreraSelect: document.querySelector('#carrera-select'),
    tableBody: document.querySelector('#inscriptions-body'),
    refreshButton: document.querySelector('#refresh-button'),
  };

  function setConnectionStatus(message, type = 'info') {
    elements.connectionStatus.textContent = message;
    elements.connectionStatus.dataset.type = type;
  }

  function setFormMessage(message, type = 'info') {
    elements.formMessage.textContent = message;
    elements.formMessage.dataset.type = type;
  }

  function fillCareers(carreras) {
    elements.carreraSelect.innerHTML = '';
    carreras.forEach((carrera) => {
      const option = document.createElement('option');
      option.value = carrera.nombre || carrera;
      option.textContent = carrera.nombre || carrera;
      elements.carreraSelect.appendChild(option);
    });
  }

  function renderCounts(inscripciones) {
    const counts = Object.fromEntries(config.ESTADOS.map((estado) => [estado, 0]));
    inscripciones.forEach((item) => {
      counts[item.estado] = (counts[item.estado] || 0) + 1;
    });
    document.querySelector('#count-pendiente').textContent = counts.Pendiente || 0;
    document.querySelector('#count-revision').textContent = counts['En revisión'] || 0;
    document.querySelector('#count-aprobada').textContent = counts.Aprobada || 0;
    document.querySelector('#count-rechazada').textContent = counts.Rechazada || 0;
  }

  function formatDocumentSummary(documentacion) {
    if (!documentacion) {
      return 'Sin archivos';
    }

    let docs = [];
    try {
      docs = Array.isArray(documentacion) ? documentacion : JSON.parse(documentacion || '[]');
    } catch (error) {
      return 'Documentación en Drive';
    }

    if (docs.length === 0) {
      return 'Sin archivos';
    }
    return `${docs.length} archivo(s) en Drive`;
  }

  function renderRows(inscripciones, onStatusChange) {
    elements.tableBody.innerHTML = '';
    if (inscripciones.length === 0) {
      elements.tableBody.innerHTML = '<tr><td colspan="8">No hay inscripciones registradas.</td></tr>';
      return;
    }

    inscripciones.forEach((item) => {
      const row = document.createElement('tr');
      const cells = [
        item.codigoPublico,
        item.nombre,
        item.dni,
        `${item.email}\n${item.telefono}`,
        item.carrera,
        '',
        formatDocumentSummary(item.documentacion),
        item.observaciones || '',
      ];

      cells.forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });

      const select = document.createElement('select');
      select.className = 'status-select';
      config.ESTADOS.forEach((estado) => {
        const option = document.createElement('option');
        option.value = estado;
        option.textContent = estado;
        option.selected = estado === item.estado;
        select.appendChild(option);
      });
      select.addEventListener('change', () => onStatusChange(item.codigoPublico, select.value));
      row.children[5].appendChild(select);
      elements.tableBody.appendChild(row);
    });
  }

  return {
    elements,
    setConnectionStatus,
    setFormMessage,
    fillCareers,
    renderCounts,
    renderRows,
  };
})();
