from flask import Flask, abort, redirect, render_template, request, url_for

from services.google_sheets_client import (
    GoogleSheetsClientError,
    actualizar_estado as gs_actualizar_estado,
    crear_inscripcion as gs_crear_inscripcion,
    listar_carreras as gs_listar_carreras,
    listar_inscripciones as gs_listar_inscripciones,
    obtener_inscripcion as gs_obtener_inscripcion,
)

app = Flask(__name__)

ESTADOS = ["Pendiente", "En revisión", "Aprobada", "Rechazada"]


def _resumen_por_estado(inscripciones):
    return {estado: sum(1 for i in inscripciones if i.get("estado") == estado) for estado in ESTADOS}


@app.route("/")
def dashboard():
    try:
        inscripciones = gs_listar_inscripciones()
    except GoogleSheetsClientError as error:
        inscripciones = []
        return render_template(
            "dashboard.html",
            inscripciones=inscripciones,
            resumen=_resumen_por_estado(inscripciones),
            estados=ESTADOS,
            error=str(error),
        )

    return render_template(
        "dashboard.html",
        inscripciones=inscripciones,
        resumen=_resumen_por_estado(inscripciones),
        estados=ESTADOS,
    )


@app.route("/inscripciones/nueva", methods=["GET", "POST"])
def nueva_inscripcion():
    try:
        carreras = gs_listar_carreras()
    except GoogleSheetsClientError as error:
        carreras = []
        return render_template(
            "nueva_inscripcion.html",
            carreras=carreras,
            estados=ESTADOS,
            error=str(error),
        )

    if request.method == "POST":
        estado = request.form.get("estado", "Pendiente")
        if estado not in ESTADOS:
            estado = "Pendiente"

        payload = {
            "nombre": request.form["nombre"].strip(),
            "dni": request.form["dni"].strip(),
            "email": request.form["email"].strip(),
            "telefono": request.form.get("telefono", "").strip(),
            "nacionalidad": request.form["nacionalidad"].strip(),
            "carrera": request.form["carrera"].strip(),
            "estado": estado,
            "observaciones": request.form.get("observaciones", "").strip(),
        }
        try:
            gs_crear_inscripcion(payload)
        except GoogleSheetsClientError as error:
            return render_template(
                "nueva_inscripcion.html",
                carreras=carreras,
                estados=ESTADOS,
                error=str(error),
                form=request.form,
            )
        return redirect(url_for("dashboard"))

    return render_template("nueva_inscripcion.html", carreras=carreras, estados=ESTADOS)


@app.route("/inscripciones/<codigo_publico>")
def detalle(codigo_publico: str):
    try:
        inscripcion = gs_obtener_inscripcion(codigo_publico)
    except GoogleSheetsClientError as error:
        return render_template("detalle.html", inscripcion=None, estados=ESTADOS, error=str(error))

    if not inscripcion:
        abort(404)

    return render_template("detalle.html", inscripcion=inscripcion, estados=ESTADOS)


@app.post("/inscripciones/<codigo_publico>/estado")
def actualizar_estado(codigo_publico: str):
    nuevo_estado = request.form.get("estado", "Pendiente")
    motivo_rechazo = request.form.get("motivo_rechazo") or None

    if nuevo_estado in ESTADOS:
        try:
            gs_actualizar_estado(codigo_publico, nuevo_estado, motivo_rechazo)
        except GoogleSheetsClientError as error:
            inscripcion = gs_obtener_inscripcion(codigo_publico)
            return render_template(
                "detalle.html",
                inscripcion=inscripcion,
                estados=ESTADOS,
                error=str(error),
            )

    return redirect(url_for("detalle", codigo_publico=codigo_publico))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
