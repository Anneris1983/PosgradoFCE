import os
from typing import Any, Dict, List, Optional

import requests


class GoogleSheetsClientError(RuntimeError):
    pass


APPS_SCRIPT_WEB_APP_URL = os.environ.get("APPS_SCRIPT_WEB_APP_URL", "").strip()


def _request(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not APPS_SCRIPT_WEB_APP_URL:
        raise GoogleSheetsClientError(
            "Falta configurar la variable de entorno APPS_SCRIPT_WEB_APP_URL."
        )

    response = requests.post(APPS_SCRIPT_WEB_APP_URL, json=payload, timeout=30)
    response.raise_for_status()
    data = response.json()

    if not data.get("ok", False):
        raise GoogleSheetsClientError(data.get("error", "Error desconocido en Apps Script."))

    return data


def listar_inscripciones() -> List[Dict[str, Any]]:
    return _request({"action": "listar_inscripciones"}).get("inscripciones", [])


def obtener_inscripcion(codigo_publico: str) -> Optional[Dict[str, Any]]:
    data = _request({"action": "obtener_inscripcion", "codigo_publico": codigo_publico})
    return data.get("inscripcion")


def crear_inscripcion(data: Dict[str, Any]) -> Dict[str, Any]:
    return _request({"action": "crear_inscripcion", "data": data}).get("inscripcion", {})


def actualizar_estado(codigo_publico: str, estado: str, motivo_rechazo: Optional[str] = None) -> Dict[str, Any]:
    return _request(
        {
            "action": "actualizar_estado",
            "codigo_publico": codigo_publico,
            "estado": estado,
            "motivo_rechazo": motivo_rechazo,
        }
    ).get("inscripcion", {})


def listar_carreras() -> List[Dict[str, Any]]:
    return _request({"action": "listar_carreras"}).get("carreras", [])
