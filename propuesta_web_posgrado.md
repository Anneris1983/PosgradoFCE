# Propuesta funcional: Web de inscripción a posgrados

## 1. Objetivo
Construir una web para gestionar inscripciones de postulantes a carreras de posgrado, con carga progresiva de documentación, validación por coordinación y notificaciones automáticas por correo.

## 2. Roles
- **Postulante**: completa formulario, sube documentos, consulta estado.
- **Coordinador/a de carrera**: revisa documentación, acepta/rechaza, informa motivo de rechazo.
- **Administrador/a** (opcional en MVP): configura carreras, ve reportes globales.

## 3. Flujo principal
1. El postulante inicia inscripción y selecciona una carrera.
2. Completa datos personales, académicos y laborales.
3. Sube documentación (en una sola vez o de forma parcial en distintos momentos).
4. El sistema guarda estado de avance y envía un enlace único por email para retomar la inscripción.
5. Cuando completa toda la documentación obligatoria, el sistema notifica al coordinador de la carrera.
6. El coordinador revisa y decide:
   - **Aceptar**: se notifica por email al postulante.
   - **Rechazar**: se exige cargar motivo; se notifica por email al postulante con el motivo.

## 4. Documentación requerida
### 4.1 Postulantes argentinos
- DNI
- Partida de nacimiento
- Título/diploma
- Analítico de egreso

### 4.2 Postulantes extranjeros
- Pasaporte
- Partida de nacimiento con Apostilla de La Haya
- Título/diploma con Apostilla de La Haya
- Analítico de egreso con Apostilla de La Haya
- Si la documentación no está en español: traducción legal

## 5. Estados de inscripción
- `BORRADOR`: inició inscripción, aún sin documentación completa.
- `PENDIENTE_REVISION`: documentación completa, esperando revisión del coordinador.
- `APROBADA`: inscripción aceptada.
- `RECHAZADA`: inscripción rechazada con motivo.

## 6. Pantallas sugeridas
### 6.1 Postulante
- **Formulario de inscripción** (datos personales, académicos, laborales, elección de carrera).
- **Carga de documentos** con checklist de progreso.
- **Panel de estado** para ver:
  - porcentaje completado,
  - documentos aceptados/observados,
  - estado final (aprobada/rechazada).

### 6.2 Coordinación
- **Dashboard con tarjetas**:
  - Inscripciones parciales
  - Inscripciones completas pendientes
  - Personas inscriptas (aprobadas)
  - Personas rechazadas
- **Listado por carrera** con filtros.
- **Vista detalle de postulante** con documentos y acciones aprobar/rechazar.

## 7. Identificación única de postulantes
Para evitar confusiones por nombres repetidos, cada postulante debe tener:
- `postulante_id` interno (UUID)
- `codigo_publico` visible para soporte/seguimiento (por ejemplo `PG-2026-000123`)

## 8. Correos automáticos
1. **Al iniciar inscripción**: email con enlace único para retomar.
2. **Al completar documentación**: aviso al coordinador de la carrera.
3. **Al aceptar**: notificación al postulante.
4. **Al rechazar**: notificación al postulante + motivo.

## 9. Reglas de negocio clave
- La revisión sólo se habilita cuando todos los documentos obligatorios están cargados.
- Si se rechaza, el motivo es obligatorio.
- Un postulante puede retomar y completar la carga desde el enlace recibido.
- Todo cambio de estado debe quedar auditado (fecha, usuario, acción).

## 10. Modelo de datos (mínimo)
- **carreras**: id, nombre, coordinador_email, estado
- **postulantes**: id(UUID), codigo_publico, nombre, apellido, email, nacionalidad, documento_numero
- **inscripciones**: id, postulante_id, carrera_id, estado, fecha_inicio, fecha_envio_revision, fecha_resolucion, motivo_rechazo
- **documentos**: id, inscripcion_id, tipo_documento, archivo_url, estado_validacion, observaciones, fecha_carga
- **eventos_auditoria**: id, entidad, entidad_id, accion, actor, fecha, detalle

## 11. MVP recomendado
### Backend
- API REST (Node.js + NestJS o Python + Django)
- Base de datos PostgreSQL
- Almacenamiento de archivos (S3/MinIO)
- Envío de correo (SMTP o servicio transaccional)

### Frontend
- React/Next.js
- Formularios con validación
- Panel administrativo con métricas por estado

### Seguridad
- Enlaces firmados y con expiración para acceso del postulante
- Control de acceso por rol
- Registro de auditoría
- Cifrado en tránsito (HTTPS)

## 12. Roadmap sugerido
1. **Fase 1 (MVP)**: formulario + carga de documentos + estados + correos + panel de coordinación.
2. **Fase 2**: observaciones sobre documentos, reenvío de documentación corregida.
3. **Fase 3**: reportes avanzados, exportación CSV/PDF, integración con sistema académico.

## 13. Próximos pasos
- Validar este flujo con Secretaría/Coordinación.
- Definir campos exactos del formulario.
- Definir políticas de tamaño/formato de archivos.
- Priorizar MVP y armar cronograma técnico.
