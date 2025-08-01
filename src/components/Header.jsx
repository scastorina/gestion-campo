import React from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";

function Header({ usuario }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Cierra la sesión de Firebase si la hay
    try {
      await signOut(auth);
    } catch (err) {
      // No hacemos nada si no estaba autenticado con Firebase
    }
    // Elimina la sesión manual en localStorage
    localStorage.removeItem("usuarioManual");
    navigate("/login");
  };

  return (
    <header className="fixed left-56 top-0 right-0 h-16 bg-white flex items-center shadow-sm px-8 z-30">
      <div className="flex-1 text-xl font-semibold tracking-wide">Dashboard</div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString("es-AR", {
            day: "2-digit", month: "short", year: "numeric"
          })}
        </span>
        {usuario && (
          <>
            <div className="flex items-center gap-2">
              <span className="font-medium">{usuario.nombre || usuario.email || usuario.usuario}</span>
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.nombre || usuario.email || usuario.usuario)}&background=random`}
                alt="Avatar"
                className="w-8 h-8 rounded-full"
              />
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-blue-600 hover:underline"
            >
              Cerrar sesión
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
