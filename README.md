# Gestion Campo

This project primarily contains a React front-end. A new **backend** folder has been added containing a Dash application for the Frutales section.

## Running the Dash app

1. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Run the application:
   ```bash
   python backend/app.py
   ```
   The server will start on `http://127.0.0.1:8050` by default.

The Dash app communicates with the ODK API defined in `backend/app.py` and mirrors the Frutales control interface.
