import React, { useEffect } from "react";
import { solicitarPermisoPush } from "../firebase/fcm";
import { db } from "../firebase/config";
import { doc, updateDoc } from "firebase/firestore";

function UserDashboard({ usuario }) {
  // Registra el token FCM automáticamente al ingresar
  useEffect(() => {
    if (usuario?.uid) {
      activarPush(usuario);
    }
  }, [usuario]);

  // Función auxiliar para pedir permiso y guardar token
  async function activarPush(usuario) {
    try {
      const token = await solicitarPermisoPush();
      if (token && usuario?.uid) {
        await updateDoc(doc(db, "usuarios", usuario.uid), {
          fcmToken: token
        });
        // alert("¡Notificaciones push activadas!");
      }
    } catch (e) {
      // alert("No se pudo activar el push.");
    }
  }

  return (
    <div className="p-8">
      <button
        className="bg-blue-600 text-white px-4 py-1 rounded mb-4"
        onClick={() => activarPush(usuario)}
      >
        Activar notificaciones push
      </button>
      <h1 className="text-2xl font-bold mb-4">Panel Principal</h1>
      <p className="text-gray-600">¡Bienvenido, {usuario?.nombre || usuario?.email || usuario?.usuario}!</p>
      {/* Aquí tu panel de áreas de gestión, etc. */}
    </div>
  );
}

export default UserDashboard;
