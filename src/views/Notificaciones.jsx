import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

function Notificaciones() {
  const usuario = JSON.parse(localStorage.getItem("usuarioManual"));
  const [notifs, setNotifs] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    const cargar = async () => {
      setCargando(true);
      const q = query(
        collection(db, "notificaciones"),
        where("para", "==", usuario.email || usuario.usuario)
      );
      const snap = await getDocs(q);
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      setNotifs(lista);
      setCargando(false);
    };
    cargar();
  }, [usuario]);

  // Marcar como leído
  const handleLeer = async (id) => {
    await updateDoc(doc(db, "notificaciones", id), { leido: true });
    setNotifs(notifs.map(n => n.id === id ? { ...n, leido: true } : n));
  };

  // Marcar todas
  const handleLeerTodas = async () => {
    const noLeidas = notifs.filter(n => !n.leido);
    for (let n of noLeidas) {
      await updateDoc(doc(db, "notificaciones", n.id), { leido: true });
    }
    setNotifs(notifs.map(n => ({ ...n, leido: true })));
  };

  return (
    <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Notificaciones</h1>
        {cargando && <div className="mb-4">Cargando notificaciones...</div>}
        {notifs.length > 0 && (
          <button
            className="mb-4 bg-blue-100 px-3 py-1 rounded text-blue-700 hover:bg-blue-200"
            onClick={handleLeerTodas}
            disabled={notifs.every(n => n.leido)}
          >
            Marcar todas como leídas
          </button>
        )}
        <div className="space-y-3">
          {notifs.length === 0 && !cargando && (
            <div className="text-gray-400">No tienes notificaciones.</div>
          )}
          {notifs.map(n => (
            <div
              key={n.id}
              className={`p-4 rounded-lg shadow border flex flex-col sm:flex-row sm:items-center gap-2 ${n.leido ? "bg-gray-50 text-gray-500" : "bg-white"}`}
            >
              <div className="flex-1">
                <div className="text-sm text-gray-700">
                  <b>{n.titulo}</b>
                  <span className="ml-2 text-xs text-gray-400">{n.fecha && n.fecha.replace("T", " ").slice(0, 16)}</span>
                </div>
                <div>{n.texto}</div>
                {n.link && (
                  <a
                    href={n.link}
                    className="text-blue-600 underline text-xs"
                  >
                    Ir a la orden
                  </a>
                )}
              </div>
              {!n.leido && (
                <button
                  className="text-xs px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                  onClick={() => handleLeer(n.id)}
                >
                  Marcar como leído
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
  );
}

export default Notificaciones;
