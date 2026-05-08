// Backend del dashboard interno con acceso por Gmail.
// Este archivo debe estar en el mismo proyecto de Apps Script que Code.gs.
// Usa la hoja Usuarios para definir quién puede ver todo y quién ve solo sus carreras.

const ADMIN_SHEET = 'Usuarios';

function adminListInscriptions() {
  const usuario = getAuthorizedUser_();
  const all = listInscriptions().inscripciones || [];
  const allowed = filterInscriptionsByUser_(all, usuario);
  return { usuario, inscripciones: allowed };
}

function adminUpdateDocumentStatus(documentoId, estado, observacionRechazo) {
  getAuthorizedUser_();
  return updateDocumentStatus(documentoId, estado, observacionRechazo || '');
}

function adminAdmitInscription(inscripcionId) {
  getAuthorizedUser_();
  return admitInscription(inscripcionId);
}

function adminRejectInscription(inscripcionId, motivoRechazo) {
  getAuthorizedUser_();
  return rejectInscription(inscripcionId, motivoRechazo || '');
}

function getAuthorizedUser_() {
  setupUsersSheet_();

  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase().trim();
  if (!email) {
    throw new Error('No se pudo detectar el correo de Google. Implementá el dashboard interno como Web App con acceso restringido a usuarios logueados de Google/FCE.');
  }

  const rows = getRows(ADMIN_SHEET);
  const user = rows.find((row) =>
    String(row.email || '').toLowerCase().trim() === email &&
    String(row.activo || '').toUpperCase().trim() === 'SI'
  );

  if (!user) {
    throw new Error('El correo ' + email + ' no está autorizado para acceder al dashboard. Agregalo en la hoja Usuarios.');
  }

  return {
    email,
    rol: String(user.rol || '').toUpperCase().trim(),
    carrera_ids: String(user.carrera_ids || '').trim(),
    nombre: user.nombre || '',
  };
}

function filterInscriptionsByUser_(inscripciones, usuario) {
  if (usuario.rol === 'SECRETARIA' || usuario.carrera_ids === 'TODAS') {
    return inscripciones;
  }

  const allowed = usuario.carrera_ids
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  if (!allowed.length) {
    return [];
  }

  const careers = getRows(SHEETS.carreras);
  const allowedNames = careers
    .filter((career) => allowed.includes(String(career.carrera_id || '').toUpperCase()))
    .map((career) => String(career.nombre_carrera || '').toUpperCase());

  return inscripciones.filter((item) => {
    const carreraNombre = String(item.carrera || '').toUpperCase();
    const carreraId = String(item.carreraId || item.carrera_id || '').toUpperCase();
    return allowed.includes(carreraId) || allowedNames.includes(carreraNombre);
  });
}

function setupUsersSheet_() {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, ADMIN_SHEET, ['email', 'rol', 'carrera_ids', 'activo', 'nombre', 'observaciones']);

  if (sheet.getLastRow() > 1) {
    return;
  }

  const users = [
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

  sheet.getRange(2, 1, users.length, users[0].length).setValues(users);
  sheet.autoResizeColumns(1, 6);
}

function doGetDashboard(e) {
  return HtmlService
    .createHtmlOutputFromFile('Admin')
    .setTitle('Dashboard interno · Posgrado FCE')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
