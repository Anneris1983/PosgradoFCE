const SHEETS = {
  carreras: 'Carreras',
  personas: 'Personas',
  inscripciones: 'Inscripciones_Sistema',
  documentos: 'Documentos',
  historial: 'Historial',
  correos: 'Correos',
  usuarios: 'Usuarios',
};

const DOCUMENT_ORDER = [
  { campo: 'docIdentidad', tipo: 'DNI / PASAPORTE / DOCUMENTO', label: 'DNI' },
  { campo: 'docPartida', tipo: 'PARTIDA DE NACIMIENTO', label: 'Partida' },
  { campo: 'docTitulo', tipo: 'TITULO / DIPLOMA', label: 'Titulo' },
  { campo: 'docAnalitico', tipo: 'ANALITICO DE EGRESO', label: 'Analitico' },
];

const DEFAULT_USERS = [
  ['anneris.amarfil@fce.uncu.edu.ar', 'SECRETARIA', 'TODAS', 'SI', 'Anneris Amarfil', 'Acceso total al dashboard'],
  ['doctorado@fce.uncu.edu.ar', 'COORDINADOR', 'DOC_ECO', 'SI', 'Coordinación Doctorado', 'Ve Doctorado en Ciencias Económicas'],
  ['mba@fce.uncu.edu.ar', 'COORDINADOR', 'MBA', 'SI', 'Coordinación MBA', 'Ve MBA'],
  ['mass@fce.uncu.edu.ar', 'COORDINADOR', 'MASS', 'SI', 'Coordinación MASS', 'Ve MASS'],
  ['magnagro@fce.uncu.edu.ar', 'COORDINADOR', 'MAGNAGRO', 'SI', 'Coordinación MAGNAGRO', 'Ve MAGNAGRO'],
  ['mgirh@fce.uncu.edu.ar', 'COORDINADOR', 'MGIRH', 'SI', 'Coordinación MGIRH', 'Ve MGIRH'],
  ['afinpublica@fce.uncu.edu.ar', 'COORDINADOR', 'MGFSP', 'SI', 'Coordinación MGFSP', 'Ve MGFSP'],
  ['mrs@fce.uncu.edu.ar', 'COORDINADOR', 'MRS,MICRO_PLANIF_SOST,MICRO_AMBIENTAL_SOST,MICRO_SECTOR_PUBLICO', 'SI', 'Coordinación MRS', 'Ve MRS y micromaestrías asociadas'],
  ['gtec@fce.uncu.edu.ar', 'COORDINADOR', 'GTEC', 'SI', 'Coordinación GTEC', 'Ve GTEC'],
  ['tributacion@fce.uncu.edu.ar', 'COORDINADOR', 'TRIBUTACION', 'SI', 'Coordinación Tributación', 'Ve Tributación'],
  ['sindicatura@fce.uncu.edu.ar', 'COORDINADOR', 'SINDICATURA', 'SI', 'Coordinación Sindicatura', 'Ve Sindicatura'],
  ['costosygestion@fce.uncu.edu.ar', 'COORDINADOR', 'COSTOS', 'SI', 'Coordinación Costos', 'Ve Costos'],
  ['microciencia.datos@fce.uncu.edu.ar', 'COORDINADOR', 'MICRO_DATOS', 'SI', 'Coordinación Micro Ciencia de Datos', 'Ve Micro Maestría en Ciencias de Datos'],
];

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Admin')
    .setTitle('Dashboard interno · Posgrado FCE')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setup() {
  setupUsersSheet_();
  return { ok: true };
}

function adminPing() {
  const user = getAuthorizedUser_();
  return { ok: true, usuario: user };
}

function adminListInscriptions() {
  const usuario = getAuthorizedUser_();
  const all = listInscriptions_();
  const allowed = filterInscriptionsByUser_(all, usuario);
  return { usuario, inscripciones: allowed };
}

function adminUpdateDocumentStatus(documentoId, estado, observacionRechazo) {
  const usuario = getAuthorizedUser_();
  const nextEstado = String(estado || '').toUpperCase().trim();
  if (!['APROBADO', 'RECHAZADO'].includes(nextEstado)) throw new Error('Estado documental no permitido.');

  const data = readSheet_(SHEETS.documentos);
  const rowIndex = data.values.findIndex((row) => String(row[data.headers.indexOf('documento_id')]) === String(documentoId));
  if (rowIndex < 0) throw new Error('Documento no encontrado: ' + documentoId);

  const documento = objectFromRow_(data.headers, data.values[rowIndex]);
  const inscripcion = findInscription_(documento.inscripcion_id);
  if (!canUserAccessInscription_(usuario, inscripcion)) throw new Error('No tenés permiso para revisar esta inscripción.');

  const sheet = getSpreadsheet().getSheetByName(SHEETS.documentos);
  const rowNumber = rowIndex + 2;
  setCellByHeader_(sheet, data.headers, rowNumber, 'estado_documento', nextEstado);
  setCellByHeader_(sheet, data.headers, rowNumber, 'observacion_rechazo', observacionRechazo || '');
  setCellByHeader_(sheet, data.headers, rowNumber, 'fecha_revision', new Date());
  setCellByHeader_(sheet, data.headers, rowNumber, 'revisado_por', usuario.email);

  if (nextEstado === 'RECHAZADO') {
    setInscriptionStatus_(documento.inscripcion_id, 'OBSERVADA', 'Documento rechazado: ' + (observacionRechazo || 'Sin detalle.'));
    sendDocumentRejectedEmail_(documento.inscripcion_id, documento.tipo_documento, observacionRechazo || 'Sin detalle.');
  }

  logEvent_(documento.inscripcion_id, documento.persona_id, 'DOCUMENTO_' + nextEstado, documento.tipo_documento + ': ' + (observacionRechazo || nextEstado), usuario.email);
  return { ok: true, documentoId, estado: nextEstado };
}

function adminAdmitInscription(inscripcionId) {
  const usuario = getAuthorizedUser_();
  const inscripcion = findInscription_(inscripcionId);
  if (!canUserAccessInscription_(usuario, inscripcion)) throw new Error('No tenés permiso para admitir esta inscripción.');

  const docs = getDocumentsByInscriptionId_(inscripcionId);
  const requiredDocs = docs.filter((doc) => String(doc.obligatorio || '').toUpperCase() === 'SI');
  const missingDocs = requiredDocs.filter((doc) => !doc.file_id && !doc.file_url);
  const rejectedDocs = docs.filter((doc) => String(doc.estado_documento || '').toUpperCase() === 'RECHAZADO');

  if (missingDocs.length) throw new Error('No se puede admitir: faltan documentos obligatorios.');
  if (rejectedDocs.length) throw new Error('No se puede admitir: hay documentos rechazados.');

  let pdfUrl = inscripcion.pdf_unificado_url || '';
  if (!pdfUrl) {
    try {
      pdfUrl = createUnifiedAdmissionPdf_(inscripcionId).url;
    } catch (error) {
      throw new Error('No se pudo generar el PDF unificado. Revisá que existan los 4 PDF obligatorios y que PDFApp esté agregado. Detalle: ' + error.message);
    }
  }

  setInscriptionStatus_(inscripcionId, 'ADMITIDA', '');
  sendAdmissionEmail_(inscripcionId);
  logEvent_(inscripcionId, inscripcion.persona_id, 'INSCRIPCION_ADMITIDA', 'Inscripción admitida por ' + usuario.email, usuario.email);
  return { ok: true, inscripcionId, estado: 'ADMITIDA', pdfUnificadoUrl: pdfUrl };
}

function adminRejectInscription(inscripcionId, motivoRechazo) {
  const usuario = getAuthorizedUser_();
  const motivo = String(motivoRechazo || '').trim();
  if (!motivo) throw new Error('Para rechazar la inscripción se debe indicar el motivo.');

  const inscripcion = findInscription_(inscripcionId);
  if (!canUserAccessInscription_(usuario, inscripcion)) throw new Error('No tenés permiso para rechazar esta inscripción.');

  setInscriptionStatus_(inscripcionId, 'RECHAZADA', motivo);
  sendInscriptionRejectedEmail_(inscripcionId, motivo);
  logEvent_(inscripcionId, inscripcion.persona_id, 'INSCRIPCION_RECHAZADA', motivo, usuario.email);
  return { ok: true, inscripcionId, estado: 'RECHAZADA' };
}

function listInscriptions_() {
  const inscripciones = getRows(SHEETS.inscripciones);
  const personas = mapRowsByKey_(getRows(SHEETS.personas), 'persona_id');
  const documentos = groupRowsByKey_(getRows(SHEETS.documentos), 'inscripcion_id');

  return inscripciones.reverse().map((row) => {
    const persona = personas[String(row.persona_id)] || {};
    const docs = documentos[String(row.inscripcion_id)] || [];
    return {
      codigoPublico: row.inscripcion_id,
      inscripcionId: row.inscripcion_id,
      personaId: row.persona_id,
      carreraId: row.carrera_id,
      carrera_id: row.carrera_id,
      nombre: buildFullName_(persona.apellido, persona.nombre),
      dni: persona.numero_documento || '',
      email: row.email_postulante || persona.email || '',
      telefono: persona.celular || '',
      carrera: row.carrera_nombre || '',
      estado: normalizarEstadoParaFrontend_(row.estado_inscripcion),
      estadoSistema: row.estado_inscripcion || '',
      carpetaDriveUrl: row.carpeta_individual_url || '',
      pdfUnificadoUrl: row.pdf_unificado_url || '',
      documentacion: docs,
      observaciones: row.motivo_rechazo_inscripcion || '',
      fechaInicio: row.fecha_inicio || '',
      fechaUltimaActualizacion: row.fecha_ultima_actualizacion || '',
    };
  });
}

function getAuthorizedUser_() {
  setupUsersSheet_();
  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase().trim();
  if (!email) throw new Error('No se pudo detectar tu correo. La implementación debe estar configurada como: Ejecutar como Usuario que accede a la aplicación web.');

  const usuario = getRows(SHEETS.usuarios).find((row) =>
    String(row.email || '').toLowerCase().trim() === email &&
    String(row.activo || '').toUpperCase().trim() === 'SI'
  );

  if (!usuario) throw new Error('El correo ' + email + ' no está autorizado. Agregalo en la hoja Usuarios con activo = SI.');

  return {
    email,
    rol: String(usuario.rol || '').toUpperCase().trim(),
    carrera_ids: String(usuario.carrera_ids || '').trim(),
    nombre: usuario.nombre || '',
  };
}

function filterInscriptionsByUser_(inscripciones, usuario) {
  if (usuario.rol === 'SECRETARIA' || String(usuario.carrera_ids || '').toUpperCase() === 'TODAS') return inscripciones;

  const allowedIds = String(usuario.carrera_ids || '').split(',').map((item) => item.trim().toUpperCase()).filter(Boolean);
  if (!allowedIds.length) return [];
  return inscripciones.filter((item) => allowedIds.includes(String(item.carreraId || item.carrera_id || '').toUpperCase()));
}

function canUserAccessInscription_(usuario, inscripcion) {
  if (usuario.rol === 'SECRETARIA' || String(usuario.carrera_ids || '').toUpperCase() === 'TODAS') return true;
  const allowedIds = String(usuario.carrera_ids || '').split(',').map((item) => item.trim().toUpperCase()).filter(Boolean);
  return allowedIds.includes(String(inscripcion.carrera_id || '').toUpperCase());
}

function setupUsersSheet_() {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet_(ss, SHEETS.usuarios, ['email', 'rol', 'carrera_ids', 'activo', 'nombre', 'observaciones']);
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, DEFAULT_USERS.length, DEFAULT_USERS[0].length).setValues(DEFAULT_USERS);
  sheet.autoResizeColumns(1, 6);
}

function findInscription_(inscripcionId) {
  const found = getRows(SHEETS.inscripciones).find((row) => String(row.inscripcion_id) === String(inscripcionId));
  if (!found) throw new Error('Inscripción no encontrada: ' + inscripcionId);
  return found;
}

function findPersona_(personaId) {
  const found = getRows(SHEETS.personas).find((row) => String(row.persona_id) === String(personaId));
  if (!found) throw new Error('Persona no encontrada: ' + personaId);
  return found;
}

function findCareer_(carreraId) {
  const found = getRows(SHEETS.carreras).find((row) => String(row.carrera_id) === String(carreraId) || String(row.nombre_carrera) === String(carreraId));
  if (!found) throw new Error('Carrera no encontrada: ' + carreraId);
  return found;
}

function getDocumentsByInscriptionId_(inscripcionId) {
  return getRows(SHEETS.documentos).filter((row) => String(row.inscripcion_id) === String(inscripcionId));
}

function setInscriptionStatus_(inscripcionId, estado, motivo) {
  const data = readSheet_(SHEETS.inscripciones);
  const rowIndex = data.values.findIndex((row) => String(row[data.headers.indexOf('inscripcion_id')]) === String(inscripcionId));
  if (rowIndex < 0) throw new Error('Inscripción no encontrada: ' + inscripcionId);

  const sheet = getSpreadsheet().getSheetByName(SHEETS.inscripciones);
  const rowNumber = rowIndex + 2;
  setCellByHeader_(sheet, data.headers, rowNumber, 'estado_inscripcion', estado);
  setCellByHeader_(sheet, data.headers, rowNumber, 'fecha_ultima_actualizacion', new Date());
  if (data.headers.includes('motivo_rechazo_inscripcion')) setCellByHeader_(sheet, data.headers, rowNumber, 'motivo_rechazo_inscripcion', motivo || '');
  if (['ADMITIDA', 'RECHAZADA'].includes(estado) && data.headers.includes('fecha_resultado')) setCellByHeader_(sheet, data.headers, rowNumber, 'fecha_resultado', new Date());
}

function createUnifiedAdmissionPdf_(inscripcionId) {
  const inscripcion = findInscription_(inscripcionId);
  const persona = findPersona_(inscripcion.persona_id);
  const carrera = findCareer_(inscripcion.carrera_id);
  const docs = getDocumentsByInscriptionId_(inscripcionId);
  const pdfBlobs = [];

  DOCUMENT_ORDER.forEach((required) => {
    const doc = docs.find((item) => String(item.tipo_documento) === required.tipo && item.file_id);
    if (doc) pdfBlobs.push(DriveApp.getFileById(doc.file_id).getBlob().setName(required.label + '.pdf'));
  });

  if (pdfBlobs.length < DOCUMENT_ORDER.length) throw new Error('Faltan documentos obligatorios para unir.');

  const mergedBlob = mergePdfBlobs_(pdfBlobs);
  const fileName = buildApplicantFileName_(persona.apellido, persona.nombre) + '.pdf';
  mergedBlob.setName(fileName);
  const finalFile = DriveApp.getFolderById(carrera.carpeta_drive_id).createFile(mergedBlob);

  updateInscriptionField_(inscripcionId, 'pdf_unificado_url', finalFile.getUrl());
  logEvent_(inscripcionId, inscripcion.persona_id, 'PDF_UNIFICADO_CREADO', finalFile.getUrl(), 'SISTEMA');
  return { id: finalFile.getId(), url: finalFile.getUrl(), nombre: fileName };
}

function mergePdfBlobs_(pdfBlobs) {
  if (typeof PDFApp !== 'undefined') {
    if (typeof PDFApp.mergePDFs === 'function') return PDFApp.mergePDFs(pdfBlobs);
    if (typeof PDFApp.merge === 'function') return PDFApp.merge(pdfBlobs);
    if (typeof PDFApp.combinePDFs === 'function') return PDFApp.combinePDFs(pdfBlobs);
    if (typeof PDFApp.combine === 'function') return PDFApp.combine(pdfBlobs);
  }
  throw new Error('No se encontró PDFApp. Agregá la biblioteca PDFApp con identificador PDFApp.');
}

function sendAdmissionEmail_(inscripcionId) {
  const inscripcion = findInscription_(inscripcionId);
  const persona = findPersona_(inscripcion.persona_id);
  const carrera = findCareer_(inscripcion.carrera_id);
  const subject = 'Admisión aprobada - ' + inscripcionId;
  const body = 'Hola ' + (persona.nombre || '') + '.\n\n' +
    'Tu inscripción a ' + carrera.nombre_carrera + ' fue admitida.\n\n' +
    buildCareerInfoText_(carrera) + '\n\n' +
    'Saludos.\nSecretaría de Posgrado FCE.';
  sendEmail_(persona.email || inscripcion.email_postulante, subject, body, inscripcionId, persona.persona_id, 'POSTULANTE_ADMITIDO', carrera.url_web_pagos || '');
}

function sendInscriptionRejectedEmail_(inscripcionId, motivo) {
  const inscripcion = findInscription_(inscripcionId);
  const persona = findPersona_(inscripcion.persona_id);
  const subject = 'Inscripción rechazada - ' + inscripcionId;
  const body = 'Hola ' + (persona.nombre || '') + '.\n\n' +
    'Tu inscripción a ' + inscripcion.carrera_nombre + ' fue rechazada.\n\n' +
    'Motivo:\n' + motivo + '\n\n' +
    'Saludos.\nSecretaría de Posgrado FCE.';
  sendEmail_(persona.email || inscripcion.email_postulante, subject, body, inscripcionId, persona.persona_id, 'POSTULANTE_INSCRIPCION_RECHAZADA', '');
}

function sendDocumentRejectedEmail_(inscripcionId, tipoDocumento, motivo) {
  const inscripcion = findInscription_(inscripcionId);
  const persona = findPersona_(inscripcion.persona_id);
  const subject = 'Documentación observada - ' + inscripcionId;
  const body = 'Hola ' + (persona.nombre || '') + '.\n\n' +
    'El documento "' + tipoDocumento + '" fue observado/rechazado.\n\n' +
    'Motivo:\n' + motivo + '\n\n' +
    'Ingresá nuevamente a tu inscripción para cargar la documentación correcta:\n' +
    (inscripcion.link_acceso_postulante || '') + '\n\n' +
    'Saludos.\nSecretaría de Posgrado FCE.';
  sendEmail_(persona.email || inscripcion.email_postulante, subject, body, inscripcionId, persona.persona_id, 'POSTULANTE_DOCUMENTO_RECHAZADO', inscripcion.link_acceso_postulante || '');
}

function buildCareerInfoText_(carrera) {
  const parts = [];
  if (carrera.dias_cursado) parts.push('Días de cursado: ' + carrera.dias_cursado);
  if (carrera.tramites_varios) parts.push('Trámites varios: ' + carrera.tramites_varios);
  if (carrera.procedimiento_pago) parts.push('Procedimiento de pago: ' + carrera.procedimiento_pago);
  if (carrera.url_web_pagos) parts.push('Web de pagos: ' + carrera.url_web_pagos);
  return parts.length ? parts.join('\n') : 'Próximamente recibirás información específica de cursado, trámites y pagos.';
}

function sendEmail_(to, subject, body, inscripcionId, personaId, tipoCorreo, enlace) {
  if (!to) return;
  try {
    GmailApp.sendEmail(to, subject, body);
    appendObject_(SHEETS.correos, {
      correo_id: 'MAIL-' + Date.now(),
      fecha: new Date(),
      inscripcion_id: inscripcionId || '',
      persona_id: personaId || '',
      destinatario: to,
      tipo_correo: tipoCorreo,
      asunto: subject,
      estado_envio: 'ENVIADO',
      error: '',
      enlace: enlace || '',
    });
  } catch (error) {
    appendObject_(SHEETS.correos, {
      correo_id: 'MAIL-' + Date.now(),
      fecha: new Date(),
      inscripcion_id: inscripcionId || '',
      persona_id: personaId || '',
      destinatario: to,
      tipo_correo: tipoCorreo,
      asunto: subject,
      estado_envio: 'ERROR',
      error: error.message,
      enlace: enlace || '',
    });
    throw error;
  }
}

function logEvent_(inscripcionId, personaId, tipoEvento, detalle, usuario) {
  appendObject_(SHEETS.historial, {
    evento_id: 'EVT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    fecha: new Date(),
    inscripcion_id: inscripcionId || '',
    persona_id: personaId || '',
    tipo_evento: tipoEvento,
    detalle: detalle || '',
    usuario: usuario || '',
    origen: 'DASHBOARD_INTERNO',
  });
}

function updateInscriptionField_(inscripcionId, fieldName, value) {
  const data = readSheet_(SHEETS.inscripciones);
  const rowIndex = data.values.findIndex((row) => String(row[data.headers.indexOf('inscripcion_id')]) === String(inscripcionId));
  if (rowIndex < 0) throw new Error('Inscripción no encontrada: ' + inscripcionId);
  setCellByHeader_(getSpreadsheet().getSheetByName(SHEETS.inscripciones), data.headers, rowIndex + 2, fieldName, value);
}

function appendObject_(sheetName, object) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map((header) => object[header] !== undefined ? object[header] : ''));
}

function getRows(sheetName) {
  const data = readSheet_(sheetName);
  return data.values.filter((row) => row.some((cell) => cell !== '' && cell !== null)).map((row) => objectFromRow_(data.headers, row));
}

function readSheet_(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('No existe la hoja: ' + sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map((header) => String(header).trim());
  return { sheet, headers, values };
}

function objectFromRow_(headers, row) {
  const object = {};
  headers.forEach((header, index) => object[header] = row[index]);
  return object;
}

function getOrCreateSheet_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return sheet;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(String);
  headers.forEach((header) => {
    if (!currentHeaders.includes(header)) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
  });
  return sheet;
}

function setCellByHeader_(sheet, headers, rowNumber, fieldName, value) {
  const columnIndex = headers.indexOf(fieldName);
  if (columnIndex < 0) return;
  sheet.getRange(rowNumber, columnIndex + 1).setValue(value);
}

function mapRowsByKey_(rows, key) {
  const map = {};
  rows.forEach((row) => map[String(row[key])] = row);
  return map;
}

function groupRowsByKey_(rows, key) {
  const map = {};
  rows.forEach((row) => {
    const value = String(row[key]);
    if (!map[value]) map[value] = [];
    map[value].push(row);
  });
  return map;
}

function normalizarEstadoParaFrontend_(estado) {
  const value = String(estado || '').toUpperCase().trim();
  const map = {
    PENDIENTE: 'Pendiente',
    DOCUMENTACION_COMPLETA: 'En revisión',
    EN_REVISION: 'En revisión',
    OBSERVADA: 'Pendiente',
    ADMITIDA: 'Aprobada',
    APROBADA: 'Aprobada',
    RECHAZADA: 'Rechazada',
  };
  return map[value] || value || 'Pendiente';
}

function buildFullName_(apellido, nombre) {
  return [apellido, nombre].filter(Boolean).join(', ');
}

function buildApplicantFileName_(apellido, nombre) {
  return sanitizeFileName_(String(apellido || 'SIN_APELLIDO').toUpperCase()) + ' ' + sanitizeFileName_(String(nombre || 'sin nombre').toLowerCase());
}

function sanitizeFileName_(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
}

function getSpreadsheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Configurá la propiedad SPREADSHEET_ID.');
  return SpreadsheetApp.openById(spreadsheetId);
}
