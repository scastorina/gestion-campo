from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'lotes.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS riegos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lote TEXT NOT NULL,
            fecha TEXT NOT NULL,
            nota TEXT DEFAULT ''
        )
        """
    )
    conn.commit()
    conn.close()


@app.route('/api/riegos', methods=['GET'])
def list_riegos():
    conn = get_db()
    rows = conn.execute('SELECT id, lote, fecha, nota FROM riegos').fetchall()
    conn.close()
    riegos = [dict(row) for row in rows]
    return jsonify(riegos)


@app.route('/api/riegos', methods=['POST'])
def create_riego():
    data = request.get_json(force=True)
    lote = data.get('lote')
    fecha = data.get('fecha')
    nota = data.get('nota', '')
    if not lote or not fecha:
        return jsonify({'error': 'lote and fecha required'}), 400
    conn = get_db()
    cur = conn.execute('INSERT INTO riegos (lote, fecha, nota) VALUES (?, ?, ?)', (lote, fecha, nota))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'lote': lote, 'fecha': fecha, 'nota': nota}), 201


@app.route('/api/riegos/<int:riego_id>', methods=['PUT'])
def update_riego(riego_id):
    data = request.get_json(force=True)
    lote = data.get('lote')
    fecha = data.get('fecha')
    nota = data.get('nota', '')
    if not lote or not fecha:
        return jsonify({'error': 'lote and fecha required'}), 400
    conn = get_db()
    conn.execute('UPDATE riegos SET lote=?, fecha=?, nota=? WHERE id=?', (lote, fecha, nota, riego_id))
    conn.commit()
    conn.close()
    return jsonify({'id': riego_id, 'lote': lote, 'fecha': fecha, 'nota': nota})


@app.route('/api/riegos/<int:riego_id>', methods=['DELETE'])
def delete_riego(riego_id):
    conn = get_db()
    conn.execute('DELETE FROM riegos WHERE id=?', (riego_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'deleted'})


if __name__ == '__main__':
    init_db()
    app.run(debug=True)
