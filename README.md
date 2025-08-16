# Gestion Campo

This repository now includes a simple irrigation (riegos) management demo alongside the original React front-end.

## Backend de Riegos (Flask)

1. Instalar dependencias de Python:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Ejecutar el servidor Flask:
   ```bash
   python backend/app.py
   ```
   El API queda disponible en `http://127.0.0.1:5000/api/riegos` y utiliza una base SQLite que se genera automáticamente en `backend/lotes.db`.

## Frontend simple

Servir la carpeta `frontend/` con cualquier servidor de archivos estáticos, por ejemplo:
```bash
python -m http.server --directory frontend
```
El mapa (Leaflet) permite seleccionar un lote, guardar un riego y listar el historial.

## Dash app original

La aplicación Dash previa se conserva en `backend/dash_app.py` y puede ejecutarse igual que antes:
```bash
python backend/dash_app.py
```
