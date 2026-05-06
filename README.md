# Posgrado FCE - Gestión de Inscripciones

Aplicación web para gestionar inscripciones a carreras de posgrado con la arquitectura correcta:

- **GitHub Pages + HTML + CSS + JavaScript**: web visible publicada gratis.
- **Google Apps Script**: motor que procesa datos, archivos, permisos y correos.
- **Google Sheets**: base de datos de carreras e inscripciones.
- **Google Drive**: almacenamiento de la documentación subida por los postulantes.
- **Gmail / Apps Script**: envío de correos automáticos a postulantes y coordinadores.

No usa Flask ni servidor propio: el frontend vive en GitHub Pages y el backend es Apps Script.

## Estructura del repositorio

```text
Posgrado FCE
│
├── index.html
├── README.md
│
├── assets
│   ├── css
│   │   └── styles.css
│   └── js
│       ├── config.js
│       ├── api.js
│       ├── app.js
│       └── ui.js
│
└── apps-script
    └── Code.gs
```

## Qué hace cada archivo

- `index.html`: pantalla principal de GitHub Pages.
- `assets/css/styles.css`: diseño simple, claro y responsive.
- `assets/js/config.js`: configuración del frontend, incluida la URL del despliegue de Apps Script.
- `assets/js/api.js`: llamadas a Apps Script para leer/escribir datos en Google Sheets.
- `assets/js/ui.js`: renderizado de carreras, tarjetas, tabla, estados y mensajes.
- `assets/js/app.js`: flujo de inscripción, subida de archivos, carga de datos y cambio de estado.
- `apps-script/Code.gs`: respaldo del código que se pega en Google Apps Script.

## Funcionalidades

- Panel principal con conteos por estado.
- Listado de inscripciones leído desde Google Sheets.
- Alta de nueva inscripción desde GitHub Pages.
- Carreras de posgrado precargadas con email del coordinador.
- Datos del postulante: nombre, DNI/Pasaporte, email, teléfono, carrera, nacionalidad y observaciones.
- Subida de documentación digital: DNI/Pasaporte, partida, título/diploma, analítico y traducción/apostilla si corresponde.
- Guardado automático de documentación en Google Drive, en una carpeta por inscripción.
- Estados: `Pendiente`, `En revisión`, `Aprobada`, `Rechazada`.
- Cambio de estado desde el listado.
- Código público automático tipo `PG-2026-00001` generado por Apps Script.
- Correo automático al postulante al registrar la inscripción.
- Correo automático al coordinador de la carrera con el enlace a Drive.
- Correo automático al postulante cuando cambia el estado.

## Configurar Apps Script, Sheets, Drive y Gmail

1. Crear una hoja de cálculo en Google Sheets.
2. Copiar el ID del documento desde la URL.
3. Crear una carpeta en Google Drive para guardar documentación.
4. Copiar el ID de la carpeta desde la URL de Drive.
5. Crear un proyecto de Google Apps Script.
6. Copiar el contenido de `apps-script/Code.gs` en el editor de Apps Script.
7. En **Project Settings > Script Properties**, crear estas propiedades:
   - `SPREADSHEET_ID`: ID de la hoja de cálculo.
   - `DRIVE_FOLDER_ID`: ID de la carpeta de Drive donde se guardará la documentación.
8. Ejecutar manualmente la función `setup()` una vez para crear las pestañas `Carreras` e `Inscripciones`.
9. Aceptar los permisos solicitados por Google para Sheets, Drive y Gmail.
10. Ir a **Deploy > New deployment** y elegir tipo **Web app**.
11. Configurar:
    - **Execute as**: Me.
    - **Who has access**: Anyone.
12. Copiar la URL terminada en `/exec`.

## Configurar la URL de Apps Script en GitHub

Hay dos opciones:

1. Pegar la URL `/exec` en `assets/js/config.js`, en la propiedad `APPS_SCRIPT_URL`.
2. O pegarla desde la pantalla web, en el panel **Conexión con Apps Script**. Esa URL queda guardada en `localStorage` del navegador.

## Publicar con GitHub Pages

1. Subir este repositorio a GitHub.
2. Ir a **Settings > Pages**.
3. En **Build and deployment**, elegir:
   - **Source**: Deploy from a branch.
   - **Branch**: `main` o la rama que corresponda.
   - **Folder**: `/root`.
4. Guardar y abrir la URL generada por GitHub Pages.
5. Verificar que `index.html` cargue correctamente.
6. Configurar la URL de Apps Script si no quedó cargada en `assets/js/config.js`.

## Google Sites opcional

Google Sites puede usarse para enlazar la URL de GitHub Pages o insertar la web publicada como contenido embebido.
