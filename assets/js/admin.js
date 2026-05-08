window.PosgradoAdmin = (() => {
  const api = window.PosgradoApi;

  const elements = {
    body: document.querySelector('#admin-inscriptions-body'),
    message: document.querySelector('#admin-message'),
    refreshButton: document.querySelector('#refresh-button'),
    searchInput: document.querySelector('#search-input'),
    statusFilter: document.querySelector('#status-filter'),
    dialog: document.querySelector('#review-dialog'),
    dialogTitle: document.querySelector('#dialog-title'),
    dialogContent: document.querySelector('#dialog-content'),
    admitButton: document.querySelector('#dialog-admit-button'),
    rejectButton: document.querySelector('#dialog-reject-button'),
    countTotal: document.querySelector('#count-total'),
    countPendiente: document.querySelector('#count-pendiente'),
    countRevision: document.querySelector('#count-revision'),
    countAprobada: document.querySelector('#count-aprobada'),
    countRechazada: document.querySelector('#count-rechazada'),
  };

  const params = new URLSearchParams(window.location.search);
  const carreraParam = params.get('carrera') || '';
  const PAGE_SIZE = 20;

  let inscriptions = [];
  let selectedInscription = null;
  let currentPage = 1;

  function setMessage(message, type = 'info') {
    if (!elements.message) return;
    elements.message.textContent = message;
    elements.message.dataset.type = type;
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function isVisibleByCareer(item) {
    if (!carreraParam) return true;
    const wanted = normalizeText(carreraParam);
    const carrera = normalizeText(item.carrera || '');
    const carreraId = normalizeText(item.carreraId || item.carrera_id || '');
    return carrera.includes(wanted) || carreraId === wanted;
  }

  function getVisibleInscriptions() {
    return inscriptions.filter(isVisibleByCareer);
  }

  function getFilteredInscriptions() {
    const query = normalizeText(elements.searchInput?.value || '');
    const status = elements.statusFilter?.value || '';

    return getVisibleInscriptions().filter((item) => {
      const text = normalizeText([
        item.codigoPublico,
        item.inscripcionId,
        item.nombre,
        item.dni,
        item.email,
        item.telefono,
        item.carrera,
        item.estado,
        item.estadoSistema,
      ].join(' '));

      const matchesText = !query || text.includes(query);
      const matchesStatus = !status || item.estado === status;
      return matchesText && matchesStatus;
    });
  }

  function getPaginatedRows(rows) {
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    const start = (currentPage - 1) * PAGE_SIZE;
    return { totalPages, start, rows: rows.slice(start, start + PAGE_SIZE) };
  }

  function ensurePaginationContainer() {
    let container = document.querySelector('#pagination-controls');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pagination-controls';
      container.className = 'pagination-controls';
      document.querySelector('.table-wrap')?.after(container);
    }
    return container;
  }

  function renderPagination(totalRows, totalPages) {
    const container = ensurePaginationContainer();
    if (totalRows <= PAGE_SIZE) {
      container.innerHTML = '';
      return;
    }

    const from = (currentPage - 1) * PAGE_SIZE + 1;
    const to = Math.min(currentPage * PAGE_SIZE, totalRows);
    container.innerHTML = `
      <button type="button" class="small-button" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
      <span>Página ${currentPage} de ${totalPages} · Mostrando ${from}-${to} de ${totalRows}</span>
      <button type="button" class="small-button" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>
    `;

    container.querySelector('#prev-page')?.addEventListener('click', () => {
      currentPage -= 1;
      renderTable();
    });
    container.querySelector('#next-page')?.addEventListener('click', () => {
      currentPage += 1;
      renderTable();
    });
  }

  function parseDocuments(item) {
    try {
      return Array.isArray(item.documentacion) ? item.documentacion : JSON.parse(item.documentacion || '[]');
    } catch (error) {
      return [];
    }
  }

  function documentSummary(item) {
    const docs = parseDocuments(item);
    if (!docs.length) return 'Sin documentación registrada';

    const required = docs.filter((doc) => doc.obligatorio !== 'CONDICIONAL');
    const uploaded = required.filter((doc) => doc.file_url || doc.url || doc.fileId).length;
    const rejected = docs.filter((doc) => doc.estado_documento === 'RECHAZADO').length;
    const approved = docs.filter((doc) => doc.estado_documento === 'APROBADO').length;

    return `${uploaded}/${required.length || docs.length} obligatorios · ${approved} aprobados · ${rejected} rechazados`;
  }

  function renderCounts() {
    const visible = getVisibleInscriptions();
    const counts = { total: visible.length, pendiente: 0, revision: 0, aprobada: 0, rechazada: 0 };

    visible.forEach((item) => {
      if (item.estado === 'Pendiente') counts.pendiente += 1;
      if (item.estado === 'En revisión') counts.revision += 1;
      if (item.estado === 'Aprobada') counts.aprobada += 1;
      if (item.estado === 'Rechazada') counts.rechazada += 1;
    });

    elements.countTotal.textContent = counts.total;
    elements.countPendiente.textContent = counts.pendiente;
    elements.countRevision.textContent = counts.revision;
    elements.countAprobada.textContent = counts.aprobada;
    elements.countRechazada.textContent = counts.rechazada;
  }

  function makeLink(url, text) {
    if (!url) return '<span class="muted-text">No disponible</span>';
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;
  }

  function renderTable() {
    const filtered = getFilteredInscriptions();
    const paginated = getPaginatedRows(filtered);
    const rows = paginated.rows;
    elements.body.innerHTML = '';

    if (!rows.length) {
      elements.body.innerHTML = '<tr><td colspan="8">No hay inscripciones para mostrar.</td></tr>';
      renderPagination(0, 1);
      return;
    }

    rows.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(item.codigoPublico || item.inscripcionId || '')}</strong></td>
        <td>${escapeHtml(item.nombre || '')}</td>
        <td>${escapeHtml(item.dni || '')}</td>
        <td>${escapeHtml(item.email || '')}<br><small>${escapeHtml(item.telefono || '')}</small></td>
        <td>${escapeHtml(item.carrera || '')}</td>
        <td><span class="status-pill">${escapeHtml(item.estado || '')}</span></td>
        <td>${escapeHtml(documentSummary(item))}</td>
        <td><button type="button" class="small-button" data-review="${escapeHtml(item.codigoPublico || item.inscripcionId || '')}">Revisar</button></td>
      `;
      elements.body.appendChild(tr);
    });

    elements.body.querySelectorAll('[data-review]').forEach((button) => {
      button.addEventListener('click', () => openReview(button.dataset.review));
    });

    renderPagination(filtered.length, paginated.totalPages);
  }

  function renderDocuments(item) {
    const docs = parseDocuments(item);
    if (!docs.length) return '<p>No hay documentos asociados a esta inscripción.</p>';

    return `
      <div class="documents-list">
        ${docs.map((doc) => {
          const docId = doc.documento_id || doc.documentoId || '';
          const status = doc.estado_documento || doc.estado || 'PENDIENTE';
          const url = doc.file_url || doc.url || '';
          const name = doc.tipo_documento || doc.tipo || doc.nombre || 'Documento';
          const obs = doc.observacion_rechazo || '';
          return `
            <article class="document-card">
              <div>
                <strong>${escapeHtml(name)}</strong>
                <p>Estado: <span class="status-pill">${escapeHtml(status)}</span></p>
                ${obs ? `<p class="error-text">Motivo: ${escapeHtml(obs)}</p>` : ''}
                ${makeLink(url, 'Abrir archivo')}
              </div>
              <div class="document-actions">
                <button type="button" class="small-button" data-doc-approve="${escapeHtml(docId)}">Aprobar</button>
                <button type="button" class="small-button danger-button" data-doc-reject="${escapeHtml(docId)}">Rechazar</button>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  function openReview(id) {
    selectedInscription = inscriptions.find((item) => (item.codigoPublico || item.inscripcionId) === id);
    if (!selectedInscription) return;

    elements.dialogTitle.textContent = `Revisión ${selectedInscription.codigoPublico || selectedInscription.inscripcionId}`;
    elements.dialogContent.innerHTML = `
      <div class="review-grid">
        <p><strong>Postulante:</strong> ${escapeHtml(selectedInscription.nombre || '')}</p>
        <p><strong>Documento:</strong> ${escapeHtml(selectedInscription.dni || '')}</p>
        <p><strong>Email:</strong> ${escapeHtml(selectedInscription.email || '')}</p>
        <p><strong>Celular:</strong> ${escapeHtml(selectedInscription.telefono || '')}</p>
        <p><strong>Carrera:</strong> ${escapeHtml(selectedInscription.carrera || '')}</p>
        <p><strong>Estado:</strong> ${escapeHtml(selectedInscription.estado || '')}</p>
        <p><strong>Carpeta Drive:</strong> ${makeLink(selectedInscription.carpetaDriveUrl, 'Abrir carpeta')}</p>
        <p><strong>PDF unificado:</strong> ${makeLink(selectedInscription.pdfUnificadoUrl, 'Abrir PDF')}</p>
      </div>
      <h3>Documentación</h3>
      ${renderDocuments(selectedInscription)}
    `;

    elements.dialogContent.querySelectorAll('[data-doc-approve]').forEach((button) => button.addEventListener('click', () => approveDocument(button.dataset.docApprove)));
    elements.dialogContent.querySelectorAll('[data-doc-reject]').forEach((button) => button.addEventListener('click', () => rejectDocument(button.dataset.docReject)));
    elements.dialog.showModal();
  }

  async function approveDocument(documentoId) {
    if (!documentoId) return;
    await api.updateDocumentStatus(documentoId, 'APROBADO', '');
    setMessage('Documento aprobado.', 'success');
    await loadDashboard();
    if (selectedInscription) openReview(selectedInscription.codigoPublico || selectedInscription.inscripcionId);
  }

  async function rejectDocument(documentoId) {
    if (!documentoId) return;
    const motivo = prompt('Motivo del rechazo del documento:');
    if (!motivo) return;
    await api.updateDocumentStatus(documentoId, 'RECHAZADO', motivo);
    setMessage('Documento rechazado y postulante notificado.', 'success');
    await loadDashboard();
    if (selectedInscription) openReview(selectedInscription.codigoPublico || selectedInscription.inscripcionId);
  }

  async function admitSelected() {
    if (!selectedInscription) return;
    const id = selectedInscription.codigoPublico || selectedInscription.inscripcionId;
    if (!confirm('¿Confirmás que querés admitir esta inscripción?')) return;
    await api.admitInscription(id);
    setMessage('Inscripción admitida. Se envió el correo al postulante.', 'success');
    elements.dialog.close();
    await loadDashboard();
  }

  async function rejectSelected() {
    if (!selectedInscription) return;
    const id = selectedInscription.codigoPublico || selectedInscription.inscripcionId;
    const motivo = prompt('Motivo del rechazo de la inscripción:');
    if (!motivo) return;
    await api.rejectInscription(id, motivo);
    setMessage('Inscripción rechazada. Se envió el correo al postulante.', 'success');
    elements.dialog.close();
    await loadDashboard();
  }

  async function loadDashboard() {
    setMessage('Cargando inscripciones...');
    try {
      const data = await api.listInscriptions();
      inscriptions = data.inscripciones || [];
      renderCounts();
      renderTable();
      const mode = carreraParam ? `Modo coordinador: ${carreraParam}` : 'Modo Secretaría: todas las carreras';
      setMessage(`${mode}. Inscripciones cargadas: ${getVisibleInscriptions().length}.`, 'success');
    } catch (error) {
      setMessage(error.message || 'No se pudo cargar el dashboard.', 'error');
      elements.body.innerHTML = '<tr><td colspan="8">Error al cargar inscripciones.</td></tr>';
    }
  }

  function resetPaginationAndRender() {
    currentPage = 1;
    renderTable();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function init() {
    elements.refreshButton.addEventListener('click', loadDashboard);
    elements.searchInput.addEventListener('input', resetPaginationAndRender);
    elements.statusFilter.addEventListener('change', resetPaginationAndRender);
    elements.admitButton.addEventListener('click', admitSelected);
    elements.rejectButton.addEventListener('click', rejectSelected);
    loadDashboard();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', window.PosgradoAdmin.init);
