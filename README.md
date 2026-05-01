# Gestión de Inscripciones de Posgrado (Flask)

Aplicación web Flask lista para desplegar y gestionar inscripciones a carreras de posgrado.

## Funcionalidades
- Panel principal con listado de inscripciones.
- Alta de nueva inscripción.
- Carreras precargadas.
- Datos de postulante: nombre, DNI, email, teléfono, carrera, nacionalidad y observaciones.
- Estados: Pendiente, En revisión, Aprobada, Rechazada.
- Cambio de estado desde la vista detalle.
- Código público automático (`PG-2026-00001`).
- Base de datos SQLite.

## Despliegue web (Render)
1. Subir este repositorio a GitHub.
2. Crear un servicio **Web Service** en Render conectado al repo.
3. Configurar:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Deploy.

Render detecta el `Procfile` incluido (`web: gunicorn app:app`).

## Estructura
- `app.py`
- `requirements.txt`
- `Procfile`
- `templates/`
- `static/`
