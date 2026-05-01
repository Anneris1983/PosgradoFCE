from datetime import datetime
from flask import Flask, redirect, render_template, request, url_for
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///posgrado.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

ESTADOS = ["Pendiente", "En revisión", "Aprobada", "Rechazada"]

CARRERAS = [
    ("Doctorado en Ciencias Económicas", "doctorado@fce.uncu.edu.ar"),
    ("Maestría en Administración de Negocios (MBA)", "mba@fce.uncu.edu.ar"),
    ("Maestría en Administración de Servicios de Salud (MASS)", "mass@fce.uncu.edu.ar"),
    ("Maestría en Gerenciamiento de Negocios Agroindustriales (MAGNAGRO)", "magnagro@fce.uncu.edu.ar"),
    ("Maestría en Gestión Integrada de Recursos Hídricos (MGIRH)", "mgirh@fce.uncu.edu.ar"),
    ("Maestría en Gestión Financiera del Sector Público (MGFSP)", "afinpublica@fce.uncu.edu.ar"),
    ("Maestría en Responsabilidad Social y Desarrollo Sostenible (MRS)", "mrs@fce.uncu.edu.ar"),
    ("Especialización en Gestión y Vinculación Tecnológica (Gtec)", "gtec@fce.uncu.edu.ar"),
    ("Especialización en Tributación", "tributacion@fce.uncu.edu.ar"),
    ("Especialización en Sindicatura Concursal y Entes en Insolvencia", "sindicatura@fce.uncu.edu.ar"),
    ("Especialización en Costos y Gestión Empresarial", "costosygestion@fce.uncu.edu.ar"),
    ("Micro Maestría en Ciencias de Datos", "microciencia.datos@fce.uncu.edu.ar"),
    ("Micro Maestría en Planificación de Gestión de la Sostenibilidad", "mrs@fce.uncu.edu.ar"),
    ("Micro Maestría en Gestión de las Variables Ambientales de la Sostenibilidad", "mrs@fce.uncu.edu.ar"),
    (
        "Micro Maestría en Planificación de Gestión de la Sostenibilidad en Organizaciones del Sector Público, "
        "Sociedad Civil, Empresas y Emprendedores",
        "mrs@fce.uncu.edu.ar",
    ),
]


class Carrera(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(255), unique=True, nullable=False)
    coordinador_email = db.Column(db.String(255), nullable=False)


class Inscripcion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    codigo_publico = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(120), nullable=False)
    dni = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    telefono = db.Column(db.String(40), nullable=False)
    nacionalidad = db.Column(db.String(60), nullable=False)
    observaciones = db.Column(db.Text, default="")
    estado = db.Column(db.String(20), default="Pendiente", nullable=False)
    carrera_id = db.Column(db.Integer, db.ForeignKey('carrera.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    carrera = db.relationship('Carrera')


def seed_carreras() -> None:
    if Carrera.query.count() == 0:
        for nombre, email in CARRERAS:
            db.session.add(Carrera(nombre=nombre, coordinador_email=email))
        db.session.commit()


def generar_codigo_publico() -> str:
    ultimo = Inscripcion.query.order_by(Inscripcion.id.desc()).first()
    nro = 1 if ultimo is None else ultimo.id + 1
    return f"PG-2026-{nro:05d}"


@app.route('/')
def dashboard():
    inscripciones = Inscripcion.query.order_by(Inscripcion.created_at.desc()).all()
    resumen = {estado: Inscripcion.query.filter_by(estado=estado).count() for estado in ESTADOS}
    return render_template('dashboard.html', inscripciones=inscripciones, resumen=resumen, estados=ESTADOS)


@app.route('/inscripciones/nueva', methods=['GET', 'POST'])
def nueva_inscripcion():
    if request.method == 'POST':
        estado = request.form.get('estado', 'Pendiente')
        if estado not in ESTADOS:
            estado = 'Pendiente'

        nueva = Inscripcion(
            codigo_publico=generar_codigo_publico(),
            nombre=request.form['nombre'].strip(),
            dni=request.form['dni'].strip(),
            email=request.form['email'].strip(),
            telefono=request.form['telefono'].strip(),
            nacionalidad=request.form['nacionalidad'].strip(),
            observaciones=request.form.get('observaciones', '').strip(),
            estado=estado,
            carrera_id=int(request.form['carrera_id']),
        )
        db.session.add(nueva)
        db.session.commit()
        return redirect(url_for('dashboard'))

    carreras = Carrera.query.order_by(Carrera.nombre).all()
    return render_template('nueva_inscripcion.html', carreras=carreras, estados=ESTADOS)


@app.route('/inscripciones/<int:inscripcion_id>')
def detalle(inscripcion_id: int):
    inscripcion = Inscripcion.query.get_or_404(inscripcion_id)
    return render_template('detalle.html', inscripcion=inscripcion, estados=ESTADOS)


@app.post('/inscripciones/<int:inscripcion_id>/estado')
def actualizar_estado(inscripcion_id: int):
    inscripcion = Inscripcion.query.get_or_404(inscripcion_id)
    nuevo_estado = request.form.get('estado', 'Pendiente')
    if nuevo_estado in ESTADOS:
        inscripcion.estado = nuevo_estado
        db.session.commit()
    return redirect(url_for('detalle', inscripcion_id=inscripcion.id))


with app.app_context():
    db.create_all()
    seed_carreras()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
