const SHEETS = {
  carreras: 'Carreras',
  personas: 'Personas',
  inscripciones: 'Inscripciones_Sistema',
  documentos: 'Documentos',
  historial: 'Historial',
  correos: 'Correos',
  configuracion: 'Configuracion',
};

const DOCUMENT_ORDER = [
  { campo: 'docIdentidad', tipo: 'DNI / PASAPORTE / DOCUMENTO', label: 'DNI' },
  { campo: 'docPartida', tipo: 'PARTIDA DE NACIMIENTO', label: 'Partida' },
  { campo: 'docTitulo', tipo: 'TITULO / DIPLOMA', label: 'Titulo' },
  { campo: 'docAnalitico', tipo: 'ANALITICO DE EGRESO', label: 'Analitico' },
];

const CARRERAS = [
  ['DOC_ECO', 'Doctorado en Ciencias Económicas', 'DOCTORADO', 'doctorado@fce.uncu.edu.ar', '1nVy01VanPslz9ytl9qi3MA6CLlNy21yM', '', '', '', '', 'SI', ''],
  ['MBA', 'Maestría en Administración de Negocios (MBA)', 'MAESTRIA', 'mba@fce.uncu.edu.ar', '1JW5XlFTIFQwzl3SqRr3mhDkOfsuIpUNg', '', '', '', '', 'SI', ''],
  ['MASS', 'Maestría en Administración de Servicios de Salud (MASS)', 'MAESTRIA', 'mass@fce.uncu.edu.ar', '1H06utnuUxh3knor2OK6O4GX5RcIfz12s', '', '', '', '', 'SI', ''],
  ['MAGNAGRO', 'Maestría en Gerenciamiento de Negocios Agroindustriales (MAGNAGRO)', 'MAESTRIA', 'magnagro@fce.uncu.edu.ar', '1uAxLEl1tnY56ZEgwtR5cADi7l4rgj8td', '', '', '', '', 'SI', ''],
  ['MGIRH', 'Maestría en Gestión Integrada de Recursos Hídricos (MGIRH)', 'MAESTRIA', 'mgirh@fce.uncu.edu.ar', '1Gqwe2UiN7-WTZ170hzE_f7YkjYns1XlG', '', '', '', '', 'SI', ''],
  ['MGFSP', 'Maestría en Gestión Financiera del Sector Público (MGFSP)', 'MAESTRIA', 'afinpublica@fce.uncu.edu.ar', '1Zxfd0Tr9jdUNu96DyyJfByKubDoPaP50', '', '', '', '', 'SI', ''],
  ['MRS', 'Maestría en Responsabilidad Social y Desarrollo Sostenible (MRS)', 'MAESTRIA', 'mrs@fce.uncu.edu.ar', '1LKjo-wXeQudnwayAlKNor5qaTRgyH40h', '', '', '', '', 'SI', ''],
  ['GTEC', 'Especialización en Gestión y Vinculación Tecnológica (Gtec)', 'ESPECIALIZACION', 'gtec@fce.uncu.edu.ar', '106ppkNfg2f8I2b05QNHD9CkVmh7AIcec', '', '', '', '', 'SI', ''],
  ['TRIBUTACION', 'Especialización en Tributación', 'ESPECIALIZACION', 'tributacion@fce.uncu.edu.ar', '1AQn3-drbKDY1xPquLcbCgmYNsdIKJdTJ', '', '', '', '', 'SI', ''],
  ['SINDICATURA', 'Especialización en Sindicatura Concursal y Entes en Insolvencia', 'ESPECIALIZACION', 'sindicatura@fce.uncu.edu.ar', '1mTsGZZHbww5v5eNgSIYmaDrGi0qkrAC7', '', '', '', '', 'SI', ''],
  ['COSTOS', 'Especialización en Costos y Gestión Empresarial', 'ESPECIALIZACION', 'costosygestion@fce.uncu.edu.ar', '1KlZ6MIZla9SDW0dIHorskS4P8K19peXl', '', '', '', '', 'SI', ''],
  ['MICRO_DATOS', 'Micro Maestría en Ciencias de Datos', 'MICRO_MAESTRIA', 'microciencia.datos@fce.uncu.edu.ar', '1TKhTlQQ5bU-P4L2jpiYkhVeWiGAus3j1', '', '', '', '', 'SI', ''],
  ['MICRO_PLANIF_SOST', 'Micro Maestría en Planificación de Gestión de la Sostenibilidad', 'MICRO_MAESTRIA', 'mrs@fce.uncu.edu.ar', '1LKjo-wXeQudnwayAlKNor5qaTRgyH40h', '', '', '', '', 'SI', ''],
  ['MICRO_AMBIENTAL_SOST', 'Micro Maestría en Gestión de las Variables Ambientales de la Sostenibilidad', 'MICRO_MAESTRIA', 'mrs@fce.uncu.edu.ar', '1LKjo-wXeQudnwayAlKNor5qaTRgyH40h', '', '', '', '', 'SI', ''],
  ['MICRO_SECTOR_PUBLICO', 'Micro Maestría en Planificación de Gestión de la Sostenibilidad en Organizaciones del Sector Público, Sociedad Civil, Empresas y Emprendedores', 'MICRO_MAESTRIA', 'mrs@fce.uncu.edu.ar', '1LKjo-wXeQudnwayAlKNor5qaTRgyH40h', '', '', '', '', 'SI', ''],
];

function doGet() {
  return jsonResponse({ ok: true, app: 'Posgrado FCE - API pública', status: 'active' });
}

function doPost(e) {
  try {
    const request = JSON.parse((e.postData && e.postData.contents) || '{}');
    const actions = {
      listCareers: () => listCareers(),
      createInscription: () => createInscription(request.inscripcion || {}, request.archivos || []),
      uploadDocuments: () => uploadDocuments(request.inscripcionId, request.tokenAcceso, request.archivos || []),
      getInscription: () => getInscriptionForApplicant(request.inscripcionId, request.tokenAcceso),
    };

    if (!actions[request.action]) {
      return jsonResponse({ ok: false, error: 'Acción pública no válida.' });
    }

    return jsonResponse({ ok: true, ...actions[request.action]() });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function setup() {
  const ss = getSpreadsheet();

  const carreras = getOrCreateSheet(ss, SHEETS.carreras, [
    'carrera_id', 'nombre_carrera', 'tipo', 'email_coordinador', 'carpeta_drive_id',
    'dias_cursado', 'tramites_varios', 'procedimiento_pago', 'url_web_pagos', 'activa', 'observaciones'
  ]);
  if (carreras.getLastRow() <= 1) {
    carreras.getRange(2, 1, CARRERAS.length, CARRERAS[0].length).setValues(CARRERAS);
  }

  getOrCreateSheet(ss, SHEETS.personas, [
    'persona_id', 'tipo_documento', 'numero_documento', 'apellido', 'nombre', 'email', 'celular',
    'nacionalidad', 'fecha_nacimiento', 'genero', 'cuil', 'domicilio', 'localidad_provincia',
    'codigo_postal', 'created_at', 'updated_at', 'datos_personales_json'
  ]);

  getOrCreateSheet(ss, SHEETS.inscripciones, [
    'inscripcion_id', 'persona_id', 'carrera_id', 'carrera_nombre', 'estado_inscripcion',
    'documentacion_completa', 'fecha_inicio', 'fecha_ultima_actualizacion', 'email_postulante',
    'token_acceso', 'link_acceso_postulante', 'motivo_rechazo_inscripcion', 'fecha_resultado',
    'carpeta_individual_url', 'pdf_unificado_url', 'source', 'datos_formulario_json'
  ]);

  getOrCreateSheet(ss, SHEETS.documentos, [
    'documento_id', 'inscripcion_id', 'persona_id', 'tipo_documento', 'requerido_para', 'obligatorio',
    'file_id', 'file_url', 'nombre_archivo', 'estado_documento', 'observacion_rechazo',
    'fecha_subida', 'fecha_revision', 'revisado_por'
  ]);

  getOrCreateSheet(ss, SHEETS.historial, ['evento_id', 'fecha', 'inscripcion_id', 'persona_id', 'tipo_evento', 'detalle', 'usuario', 'origen']);
  getOrCreateSheet(ss, SHEETS.correos, ['correo_id', 'fecha', 'inscripcion_id', 'persona_id', 'destinatario', 'tipo_correo', 'asunto', 'estado_envio', 'error', 'enlace']);
  getOrCreateSheet(ss, SHEETS.configuracion, ['clave', 'valor', 'descripcion', 'activo', 'updated_at']);
  autoResizeKnownSheets_();
}

function listCareers() {
  setup();
  const carreras = getRows(SHEETS.carreras)
    .filter((row) => String(row.activa || '').toUpperCase() !== 'NO')
    .map((row) => ({
      id: row.carrera_id,
      carreraId: row.carrera_id,
      nombre: row.nombre_carrera,
      nombre_carrera: row.nombre_carrera,
      tipo: row.tipo,
      coordinadorEmail: row.email_coordinador,
      carpetaDriveId: row.carpeta_drive_id,
    }));
  return { carreras };
}

function createInscription(inscripcion, archivos) {
  setup();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const carrera = findCareer_(inscripcion.carrera || inscripcion.carrera_nombre || inscripcion.carreraId);
    const persona = upsertPersona_(inscripcion);
    const inscripcionId = nextId_(SHEETS.inscripciones, 'ADM');
    const token = Utilities.getUuid();
    const applicantUrl = buildApplicantUrl_(inscripcionId, token);
    const carreraFolder = DriveApp.getFolderById(carrera.carpeta_drive_id);
    const individualFolder = carreraFolder.createFolder(`${inscripcionId} - ${buildApplicantFileName_(persona.apellido, persona.nombre)}`);

    appendObject_(SHEETS.inscripciones, {
      inscripcion_id: inscripcionId,
      persona_id: persona.persona_id,
      carrera_id: carrera.carrera_id,
      carrera_nombre: carrera.nombre_carrera,
      estado_inscripcion: 'PENDIENTE',
      documentacion_completa: 'NO',
      fecha_inicio: new Date(),
      fecha_ultima_actualizacion: new Date(),
      email_postulante: persona.email,
      token_acceso: token,
      link_acceso_postulante: applicantUrl,
      motivo_rechazo_inscripcion: '',
      fecha_resultado: '',
      carpeta_individual_url: individualFolder.getUrl(),
      pdf_unificado_url: '',
      source: 'WEB_PUBLICA',
      datos_formulario_json: JSON.stringify(inscripcion || {}),
    });

    createPendingDocumentRows_(inscripcionId, persona.persona_id);

    if (archivos && archivos.length) {
      saveUploadedDocuments_(inscripcionId, persona.persona_id, individualFolder, archivos);
      const status = refreshInscriptionCompleteness_(inscripcionId);
      if (status.documentacionCompleta) {
        const unified = createUnifiedAdmissionPdf_(inscripcionId);
        notifyCoordinatorIfComplete_(inscripcionId, unified.url);
      }
    }

    sendApplicantStartEmail_(persona.email, inscripcionId, carrera.nombre_carrera, applicantUrl);
    logEvent_(inscripcionId, persona.persona_id, 'INSCRIPCION_INICIADA', `Inscripción iniciada en ${carrera.nombre_carrera}.`);

    return { codigoPublico: inscripcionId, inscripcionId, tokenAcceso: token, linkAccesoPostulante: applicantUrl };
  } finally {
    lock.releaseLock();
  }
}

function uploadDocuments(inscripcionId, tokenAcceso, archivos) {
  setup();
  const inscription = findInscription_(inscripcionId);
  if (!inscription) throw new Error('Inscripción no encontrada.');
  if (inscription.token_acceso !== tokenAcceso) throw new Error('Token de acceso inválido.');

  const folder = getFolderFromUrlOrCreate_(inscription.carpeta_individual_url, inscription);
  const saved = saveUploadedDocuments_(inscripcionId, inscription.persona_id, folder, archivos || []);
  const status = refreshInscriptionCompleteness_(inscripcionId);

  logEvent_(inscripcionId, inscription.persona_id, 'DOCUMENTOS_SUBIDOS', `Se subieron ${saved.length} documento(s).`);

  if (status.documentacionCompleta) {
    const unified = createUnifiedAdmissionPdf_(inscripcionId);
    notifyCoordinatorIfComplete_(inscripcionId, unified.url);
  }

  return { inscripcionId, documentos: saved, documentacionCompleta: status.documentacionCompleta };
}

function getInscriptionForApplicant(inscripcionId, tokenAcceso) {
  const inscription = findInscription_(inscripcionId);
  if (!inscription) throw new Error('Inscripción no encontrada.');
  if (inscription.token_acceso !== tokenAcceso) throw new Error('Token de acceso inválido.');
  return { inscripcion: inscription, documentos: getDocumentsByInscriptionId_(inscripcionId) };
}

function refreshInscriptionCompleteness_(inscripcionId) {
  const docs = getDocumentsByInscriptionId_(inscripcionId);
  const complete = DOCUMENT_ORDER.every((required) => docs.some((doc) => doc.tipo_documento === required.tipo && doc.file_id));
  updateInscriptionField_(inscripcionId, 'documentacion_completa', complete ? 'SI' : 'NO');
  updateInscriptionField_(inscripcionId, 'estado_inscripcion', complete ? 'DOCUMENTACION_COMPLETA' : 'PENDIENTE');
  updateInscriptionField_(inscripcionId, 'fecha_ultima_actualizacion', new Date());
  return { documentacionCompleta: complete };
}

function createUnifiedAdmissionPdf_(inscripcionId) {
  const inscription = findInscription_(inscripcionId);
  const persona = findPersona_(inscription.persona_id);
  const carrera = findCareer_(inscription.carrera_id);
  const docs = getDocumentsByInscriptionId_(inscripcionId);
  const pdfBlobs = [];

  DOCUMENT_ORDER.forEach((required) => {
    const doc = docs.find((item) => item.tipo_documento === required.tipo && item.file_id);
    if (doc) pdfBlobs.push(convertFileToPdfBlob_(DriveApp.getFileById(doc.file_id), required.label));
  });

  if (pdfBlobs.length < DOCUMENT_ORDER.length) {
    throw new Error('No se puede unir la documentación: faltan documentos obligatorios.');
  }

  const mergedBlob = mergePdfBlobs_(pdfBlobs);
  const finalName = `${buildApplicantFileName_(persona.apellido, persona.nombre)}.pdf`;
  mergedBlob.setName(finalName);
  const finalFile = DriveApp.getFolderById(carrera.carpeta_drive_id).createFile(mergedBlob);
  updateInscriptionField_(inscripcionId, 'pdf_unificado_url', finalFile.getUrl());
  logEvent_(inscripcionId, inscription.persona_id, 'PDF_UNIFICADO_CREADO', finalFile.getUrl());
  return { id: finalFile.getId(), url: finalFile.getUrl(), nombre: finalName };
}

function mergePdfBlobs_(pdfBlobs) {
  if (typeof PDFApp !== 'undefined') {
    if (typeof PDFApp.mergePDFs === 'function') return PDFApp.mergePDFs(pdfBlobs);
    if (typeof PDFApp.merge === 'function') return PDFApp.merge(pdfBlobs);
    if (typeof PDFApp.combinePDFs === 'function') return PDFApp.combinePDFs(pdfBlobs);
    if (typeof PDFApp.combine === 'function') return PDFApp.combine(pdfBlobs);
  }
  throw new Error('Falta configurar la biblioteca PDFApp para unir PDFs.');
}

function convertFileToPdfBlob_(file, fallbackName) {
  const mime = file.getMimeType();
  if (mime === MimeType.PDF || mime === 'application/pdf') return file.getBlob().setName(`${fallbackName}.pdf`);
  if (mime.startsWith('image/')) return imageFileToPdfBlob_(file, fallbackName);
  return file.getBlob().getAs(MimeType.PDF).setName(`${fallbackName}.pdf`);
}

function imageFileToPdfBlob_(file, fallbackName) {
  const tempDoc = DocumentApp.create(`TEMP_${fallbackName}_${Date.now()}`);
  const body = tempDoc.getBody();
  body.clear();
  const image = body.appendImage(file.getBlob());
  const maxWidth = 500;
  if (image.getWidth() > maxWidth) {
    const ratio = maxWidth / image.getWidth();
    image.setWidth(maxWidth).setHeight(Math.round(image.getHeight() * ratio));
  }
  tempDoc.saveAndClose();
  const pdfBlob = DriveApp.getFileById(tempDoc.getId()).getBlob().getAs(MimeType.PDF).setName(`${fallbackName}.pdf`);
  DriveApp.getFileById(tempDoc.getId()).setTrashed(true);
  return pdfBlob;
}

function saveUploadedDocuments_(inscripcionId, personaId, folder, archivos) {
  const saved = [];
  archivos.forEach((archivo) => {
    const meta = DOCUMENT_ORDER.find((item) => item.campo === archivo.campo);
    if (!meta || !archivo.contenidoBase64) return;

    const bytes = Utilities.base64Decode(archivo.contenidoBase64);
    const blob = Utilities.newBlob(bytes, archivo.mimeType || MimeType.PDF, archivo.nombre || `${meta.label}.pdf`);
    const file = folder.createFile(blob);
    const documentoId = findOrCreateDocumentoRow_(inscripcionId, personaId, meta.tipo);

    updateDocumentoFields_(documentoId, {
      file_id: file.getId(),
      file_url: file.getUrl(),
      nombre_archivo: file.getName(),
      estado_documento: 'SUBIDO',
      observacion_rechazo: '',
      fecha_subida: new Date(),
    });

    saved.push({ documentoId, tipo: meta.tipo, fileId: file.getId(), url: file.getUrl(), nombre: file.getName() });
  });
  return saved;
}

function createPendingDocumentRows_(inscripcionId, personaId) {
  DOCUMENT_ORDER.forEach((doc, index) => {
    appendObject_(SHEETS.documentos, {
      documento_id: `${inscripcionId}-DOC-${String(index + 1).padStart(2, '0')}`,
      inscripcion_id: inscripcionId,
      persona_id: personaId,
      tipo_documento: doc.tipo,
      requerido_para: 'ARGENTINO / EXTRANJERO',
      obligatorio: 'SI',
      file_id: '',
      file_url: '',
      nombre_archivo: '',
      estado_documento: 'PENDIENTE',
      observacion_rechazo: '',
      fecha_subida: '',
      fecha_revision: '',
      revisado_por: '',
    });
  });
}

function findOrCreateDocumentoRow_(inscripcionId, personaId, tipoDocumento) {
  const docs = getDocumentsByInscriptionId_(inscripcionId);
  const found = docs.find((doc) => doc.tipo_documento === tipoDocumento);
  if (found) return found.documento_id;
  const documentoId = `${inscripcionId}-DOC-${Utilities.getUuid().slice(0, 8)}`;
  appendObject_(SHEETS.documentos, { documento_id: documentoId, inscripcion_id: inscripcionId, persona_id: personaId, tipo_documento: tipoDocumento, obligatorio: 'SI', estado_documento: 'PENDIENTE' });
  return documentoId;
}

function upsertPersona_(data) {
  const apellidoNombre = splitApplicantName_(data);
  const numeroDocumento = String(data.dni || data.numero_documento || data.documento || '').trim();
  if (!numeroDocumento) throw new Error('Falta DNI/Pasaporte del postulante.');

  const existing = findPersonaByDocumento_(numeroDocumento);
  if (existing) return existing;

  const persona = {
    persona_id: nextId_(SHEETS.personas, 'PER'),
    tipo_documento: data.tipo_documento || 'Documento',
    numero_documento: numeroDocumento,
    apellido: apellidoNombre.apellido,
    nombre: apellidoNombre.nombre,
    email: String(data.email || '').trim(),
    celular: String(data.celular || data.telefono || '').trim(),
    nacionalidad: String(data.nacionalidad || '').trim(),
    fecha_nacimiento: data.fecha_nacimiento || '',
    genero: data.genero || '',
    cuil: data.cuil || '',
    domicilio: [data.calle, data.numero_calle, data.piso_departamento_barrio].filter(Boolean).join(' '),
    localidad_provincia: data.localidad_provincia || '',
    codigo_postal: data.codigo_postal || '',
    created_at: new Date(),
    updated_at: new Date(),
    datos_personales_json: JSON.stringify(data || {}),
  };
  appendObject_(SHEETS.personas, persona);
  return persona;
}

function notifyCoordinatorIfComplete_(inscripcionId, pdfUnificadoUrl) {
  const inscription = findInscription_(inscripcionId);
  const persona = findPersona_(inscription.persona_id);
  const carrera = findCareer_(inscription.carrera_id);
  const dashboardUrl = getConfigValue_('INTERNAL_DASHBOARD_URL');
  const subject = `Documentación completa para revisar - ${inscripcionId}`;
  const body = `Hola.\n\n${persona.apellido}, ${persona.nombre} completó la documentación para ${carrera.nombre_carrera}.\n\nPDF unificado: ${pdfUnificadoUrl}\nCarpeta individual: ${inscription.carpeta_individual_url}\n${dashboardUrl ? '\nDashboard interno: ' + dashboardUrl + '\n' : ''}\nPor favor revisá la documentación para aprobar u observar la inscripción.`;
  sendEmail_(carrera.email_coordinador, subject, body, inscripcionId, persona.persona_id, 'COORDINADOR_DOCUMENTACION_COMPLETA', pdfUnificadoUrl);
  updateInscriptionField_(inscripcionId, 'estado_inscripcion', 'EN_REVISION');
}

function sendApplicantStartEmail_(email, inscripcionId, carreraNombre, applicantUrl) {
  const subject = `Inscripción iniciada - ${inscripcionId}`;
  const body = `Hola.\n\nTu inscripción a ${carreraNombre} fue iniciada correctamente.\n\nPodés volver cuando quieras para completar o revisar tu documentación desde este enlace:\n${applicantUrl}\n\nEstado actual: PENDIENTE.`;
  sendEmail_(email, subject, body, inscripcionId, '', 'POSTULANTE_ENLACE_CONTINUAR', applicantUrl);
}

function sendEmail_(to, subject, body, inscripcionId, personaId, tipoCorreo, enlace) {
  if (!to) return;
  try {
    GmailApp.sendEmail(to, subject, body);
    appendObject_(SHEETS.correos, { correo_id: `MAIL-${Date.now()}`, fecha: new Date(), inscripcion_id: inscripcionId || '', persona_id: personaId || '', destinatario: to, tipo_correo: tipoCorreo, asunto: subject, estado_envio: 'ENVIADO', error: '', enlace: enlace || '' });
  } catch (error) {
    appendObject_(SHEETS.correos, { correo_id: `MAIL-${Date.now()}`, fecha: new Date(), inscripcion_id: inscripcionId || '', persona_id: personaId || '', destinatario: to, tipo_correo: tipoCorreo, asunto: subject, estado_envio: 'ERROR', error: error.message, enlace: enlace || '' });
    throw error;
  }
}

function splitApplicantName_(data) {
  const apellido = String(data.apellido || data.apellidos || '').trim();
  const nombre = String(data.nombre || data.nombres || '').trim();
  return { apellido: apellido || 'SIN APELLIDO', nombre: nombre || 'sin nombre' };
}

function buildApplicantFileName_(apellido, nombre) {
  return `${sanitizeFileName_(String(apellido || 'SIN_APELLIDO').toUpperCase())} ${sanitizeFileName_(String(nombre || 'sin nombre').toLowerCase())}`.trim();
}

function sanitizeFileName_(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
}

function buildApplicantUrl_(inscripcionId, token) {
  const configured = getConfigValue_('GITHUB_PAGES_URL') || 'https://anneris1983.github.io/PosgradoFCE/';
  return `${configured.replace(/\/$/, '')}/?inscripcion=${encodeURIComponent(inscripcionId)}&token=${encodeURIComponent(token)}`;
}

function findCareer_(identifier) {
  const id = String(identifier || '').trim();
  const carrera = getRows(SHEETS.carreras).find((row) => row.carrera_id === id || row.nombre_carrera === id || row.nombre === id);
  if (!carrera) throw new Error('Carrera no encontrada: ' + id);
  return carrera;
}

function findPersonaByDocumento_(numeroDocumento) {
  return getRows(SHEETS.personas).find((row) => String(row.numero_documento) === String(numeroDocumento));
}

function findPersona_(personaId) {
  const persona = getRows(SHEETS.personas).find((row) => row.persona_id === personaId);
  if (!persona) throw new Error('Persona no encontrada: ' + personaId);
  return persona;
}

function findInscription_(inscripcionId) {
  const inscription = getRows(SHEETS.inscripciones).find((row) => row.inscripcion_id === inscripcionId);
  if (!inscription) throw new Error('Inscripción no encontrada: ' + inscripcionId);
  return inscription;
}

function getDocumentsByInscriptionId_(inscripcionId) {
  return getRows(SHEETS.documentos).filter((row) => row.inscripcion_id === inscripcionId);
}

function getFolderFromUrlOrCreate_(url, inscription) {
  if (url) {
    const match = String(url).match(/[-\w]{25,}/);
    if (match) return DriveApp.getFolderById(match[0]);
  }
  const carrera = findCareer_(inscription.carrera_id);
  const persona = findPersona_(inscription.persona_id);
  return DriveApp.getFolderById(carrera.carpeta_drive_id).createFolder(`${inscription.inscripcion_id} - ${buildApplicantFileName_(persona.apellido, persona.nombre)}`);
}

function updateInscriptionField_(inscripcionId, fieldName, value) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.inscripciones);
  const { headers, values } = readSheet_(SHEETS.inscripciones);
  const rowIndex = values.findIndex((row) => row[headers.indexOf('inscripcion_id')] === inscripcionId);
  if (rowIndex < 0) throw new Error('Inscripción no encontrada: ' + inscripcionId);
  setCellByHeader_(sheet, headers, rowIndex + 2, fieldName, value);
}

function updateDocumentoFields_(documentoId, fields) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.documentos);
  const { headers, values } = readSheet_(SHEETS.documentos);
  const rowIndex = values.findIndex((row) => row[headers.indexOf('documento_id')] === documentoId);
  if (rowIndex < 0) throw new Error('Documento no encontrado: ' + documentoId);
  Object.keys(fields).forEach((field) => setCellByHeader_(sheet, headers, rowIndex + 2, field, fields[field]));
}

function setCellByHeader_(sheet, headers, rowNumber, fieldName, value) {
  const columnIndex = headers.indexOf(fieldName);
  if (columnIndex < 0) throw new Error('No existe la columna: ' + fieldName);
  sheet.getRange(rowNumber, columnIndex + 1).setValue(value);
}

function nextId_(sheetName, prefix) {
  const year = new Date().getFullYear();
  const rows = getRows(sheetName);
  const numbers = rows.map((row) => String(Object.values(row)[0] || '').match(/(\d+)$/)).filter(Boolean).map((match) => Number(match[1]));
  const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${year}-${String(nextNumber).padStart(6, '0')}`;
}

function logEvent_(inscripcionId, personaId, tipoEvento, detalle) {
  appendObject_(SHEETS.historial, { evento_id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`, fecha: new Date(), inscripcion_id: inscripcionId || '', persona_id: personaId || '', tipo_evento: tipoEvento, detalle: detalle || '', usuario: 'WEB_PUBLICA', origen: 'APPS_SCRIPT_PUBLIC' });
}

function getConfigValue_(key) {
  try {
    const rows = getRows(SHEETS.configuracion);
    const found = rows.find((row) => row.clave === key && String(row.activo || 'SI').toUpperCase() !== 'NO');
    return found ? found.valor : '';
  } catch (error) {
    return '';
  }
}

function appendObject_(sheetName, object) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map((header) => object[header] !== undefined ? object[header] : ''));
}

function getRows(sheetName) {
  const { headers, values } = readSheet_(sheetName);
  return values.filter((row) => row.some((cell) => cell !== '' && cell !== null)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}

function readSheet_(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('No existe la hoja: ' + sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map((header) => String(header).trim());
  return { headers, values };
}

function getOrCreateSheet(spreadsheet, name, headers) {
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

function autoResizeKnownSheets_() {
  Object.values(SHEETS).forEach((sheetName) => {
    const sheet = getSpreadsheet().getSheetByName(sheetName);
    if (sheet && sheet.getLastColumn() > 0) sheet.autoResizeColumns(1, sheet.getLastColumn());
  });
}

function getSpreadsheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Configurá la propiedad SPREADSHEET_ID.');
  return SpreadsheetApp.openById(spreadsheetId);
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
