import React from "react";

function Header({ usuario }) {
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
          <div className="flex items-center gap-2">
            <span className="font-medium">{usuario.nombre || usuario.email || usuario.usuario}</span>
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.nombre || usuario.email || usuario.usuario)}&background=random`}
              alt="Avatar"
              className="w-8 h-8 rounded-full"
            />
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
