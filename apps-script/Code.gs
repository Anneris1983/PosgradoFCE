const SHEETS = {
  carreras: 'Carreras',
  inscripciones: 'Inscripciones',
};

const ESTADOS = ['Pendiente', 'En revisión', 'Aprobada', 'Rechazada'];

const CARRERAS = [
  ['Doctorado en Ciencias Económicas', 'doctorado@fce.uncu.edu.ar'],
  ['Maestría en Administración de Negocios (MBA)', 'mba@fce.uncu.edu.ar'],
  ['Maestría en Administración de Servicios de Salud (MASS)', 'mass@fce.uncu.edu.ar'],
  ['Maestría en Gerenciamiento de Negocios Agroindustriales (MAGNAGRO)', 'magnagro@fce.uncu.edu.ar'],
  ['Maestría en Gestión Integrada de Recursos Hídricos (MGIRH)', 'mgirh@fce.uncu.edu.ar'],
  ['Maestría en Gestión Financiera del Sector Público (MGFSP)', 'afinpublica@fce.uncu.edu.ar'],
  ['Maestría en Responsabilidad Social y Desarrollo Sostenible (MRS)', 'mrs@fce.uncu.edu.ar'],
  ['Especialización en Gestión y Vinculación Tecnológica (Gtec)', 'gtec@fce.uncu.edu.ar'],
  ['Especialización en Tributación', 'tributacion@fce.uncu.edu.ar'],
  ['Especialización en Sindicatura Concursal y Entes en Insolvencia', 'sindicatura@fce.uncu.edu.ar'],
  ['Especialización en Costos y Gestión Empresarial', 'costosygestion@fce.uncu.edu.ar'],
  ['Micro Maestría en Ciencias de Datos', 'microciencia.datos@fce.uncu.edu.ar'],
  ['Micro Maestría en Planificación de Gestión de la Sostenibilidad', 'mrs@fce.uncu.edu.ar'],
  ['Micro Maestría en Gestión de las Variables Ambientales de la Sostenibilidad', 'mrs@fce.uncu.edu.ar'],
  ['Micro Maestría en Planificación de Gestión de la Sostenibilidad en Organizaciones del Sector Público, Sociedad Civil, Empresas y Emprendedores', 'mrs@fce.uncu.edu.ar'],
];

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents || '{}');
    const actions = {
      listCareers,
      listInscriptions,
      createInscription: () => createInscription(request.inscripcion, request.archivos || []),
      updateStatus: () => updateStatus(request.codigoPublico, request.estado),
    };
    const action = actions[request.action];
    if (!action) {
      return jsonResponse({ ok: false, error: 'Acción no válida.' });
    }
    return jsonResponse({ ok: true, ...action() });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function setup() {
  const spreadsheet = getSpreadsheet();
  const carreras = getOrCreateSheet(spreadsheet, SHEETS.carreras, ['nombre', 'coordinadorEmail']);
  const inscripciones = getOrCreateSheet(spreadsheet, SHEETS.inscripciones, [
    'codigoPublico',
    'fechaAlta',
    'nombre',
    'dni',
    'email',
    'telefono',
    'carrera',
    'nacionalidad',
    'observaciones',
    'estado',
    'carpetaDriveUrl',
    'documentacion',
  ]);

  if (carreras.getLastRow() === 1) {
    carreras.getRange(2, 1, CARRERAS.length, 2).setValues(CARRERAS);
  }
  inscripciones.autoResizeColumns(1, 12);
  carreras.autoResizeColumns(1, 2);
}

function listCareers() {
  setup();
  const rows = getRows(SHEETS.carreras);
  return {
    carreras: rows.map((row) => ({ nombre: row.nombre, coordinadorEmail: row.coordinadorEmail })),
  };
}

function listInscriptions() {
  setup();
  return { inscripciones: getRows(SHEETS.inscripciones).reverse() };
}

function createInscription(inscripcion, archivos) {
  setup();
  const sheet = getSpreadsheet().getSheetByName(SHEETS.inscripciones);
  const codigoPublico = nextPublicCode(sheet);
  const carrera = findCareer(inscripcion.carrera);
  const driveFolder = createDriveFolder(codigoPublico, inscripcion.nombre);
  const documentacion = saveFiles(driveFolder, archivos);

  sheet.appendRow([
    codigoPublico,
    new Date(),
    inscripcion.nombre,
    inscripcion.dni,
    inscripcion.email,
    inscripcion.telefono,
    inscripcion.carrera,
    inscripcion.nacionalidad,
    inscripcion.observaciones || '',
    'Pendiente',
    driveFolder.getUrl(),
    JSON.stringify(documentacion),
  ]);

  sendApplicantEmail(inscripcion.email, codigoPublico, inscripcion.carrera);
  sendCoordinatorEmail(carrera.coordinadorEmail, codigoPublico, inscripcion, driveFolder.getUrl());

  return { codigoPublico, carpetaDriveUrl: driveFolder.getUrl(), documentacion };
}

function updateStatus(codigoPublico, estado) {
  if (!ESTADOS.includes(estado)) {
    throw new Error('Estado no permitido.');
  }
  const sheet = getSpreadsheet().getSheetByName(SHEETS.inscripciones);
  const values = sheet.getDataRange().getValues();
  const rowIndex = values.findIndex((row) => row[0] === codigoPublico);
  if (rowIndex < 1) {
    throw new Error('Inscripción no encontrada.');
  }
  sheet.getRange(rowIndex + 1, 10).setValue(estado);
  const email = values[rowIndex][4];
  const carrera = values[rowIndex][6];
  sendStatusEmail(email, codigoPublico, carrera, estado);
  return { codigoPublico, estado };
}

function saveFiles(folder, archivos) {
  return archivos.map((archivo) => {
    const bytes = Utilities.base64Decode(archivo.contenidoBase64);
    const blob = Utilities.newBlob(bytes, archivo.mimeType, archivo.nombre);
    const file = folder.createFile(blob);
    return {
      campo: archivo.campo,
      nombre: archivo.nombre,
      url: file.getUrl(),
    };
  });
}

function createDriveFolder(codigoPublico, nombre) {
  const parentId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
  const parent = parentId ? DriveApp.getFolderById(parentId) : DriveApp.getRootFolder();
  const safeName = String(nombre || 'Postulante').replace(/[\\/:*?"<>|]/g, '-');
  return parent.createFolder(`${codigoPublico} - ${safeName}`);
}

function sendApplicantEmail(email, codigoPublico, carrera) {
  if (!email) {
    return;
  }
  GmailApp.sendEmail(
    email,
    `Inscripción recibida - ${codigoPublico}`,
    `Recibimos tu inscripción a ${carrera}.\n\nCódigo público: ${codigoPublico}\nEstado inicial: Pendiente.`
  );
}

function sendCoordinatorEmail(email, codigoPublico, inscripcion, carpetaDriveUrl) {
  if (!email) {
    return;
  }
  GmailApp.sendEmail(
    email,
    `Nueva inscripción de posgrado - ${codigoPublico}`,
    `Se registró una nueva inscripción.\n\nPostulante: ${inscripcion.nombre}\nDNI/Pasaporte: ${inscripcion.dni}\nCarrera: ${inscripcion.carrera}\nDocumentación en Drive: ${carpetaDriveUrl}`
  );
}

function sendStatusEmail(email, codigoPublico, carrera, estado) {
  if (!email) {
    return;
  }
  GmailApp.sendEmail(
    email,
    `Actualización de inscripción - ${codigoPublico}`,
    `Tu inscripción a ${carrera} cambió de estado.\n\nCódigo público: ${codigoPublico}\nNuevo estado: ${estado}`
  );
}

function findCareer(nombre) {
  const rows = getRows(SHEETS.carreras);
  const carrera = rows.find((row) => row.nombre === nombre);
  if (!carrera) {
    throw new Error('Carrera no encontrada.');
  }
  return carrera;
}

function nextPublicCode(sheet) {
  const year = new Date().getFullYear();
  const lastRow = sheet.getLastRow();
  const nextNumber = Math.max(lastRow, 1);
  return `PG-${year}-${String(nextNumber).padStart(5, '0')}`;
}

function getRows(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}

function getOrCreateSheet(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return sheet;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  headers.forEach((header) => {
    if (!currentHeaders.includes(header)) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });
  return sheet;
}

function getSpreadsheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('Configurá la propiedad SPREADSHEET_ID con el ID de Google Sheets.');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
