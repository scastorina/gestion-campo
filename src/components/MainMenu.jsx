import React, { useContext, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { AuthContext } from "../context/AuthContext";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

// Badge minimalista
function NotifBadge() {
  const [cuenta, setCuenta] = useState(0);
  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuarioManual"));
    if (!usuario) return;
    const cargar = async () => {
      const q = query(
        collection(db, "notificaciones"),
        where("para", "==", usuario.email || usuario.usuario),
        where("leido", "==", false)
      );
      const snap = await getDocs(q);
      setCuenta(snap.size);
    };
    cargar();
  }, []);
  if (cuenta === 0) return null;
  return (
    <span className="inline-block bg-red-500 text-white text-xs rounded-full px-2 ml-1">{cuenta}</span>
  );
}

const items = [
  { to: "/dashboard", label: "Panel", icon: "🏠" },
  { to: "/usuarios", label: "Usuarios", area: "Administración", icon: "👤" },
  { to: "/ganaderia", label: "Ganadería", area: "Ganadería", icon: "🐮" },
  { to: "/ordenes", label: "Órdenes de Trabajo", icon: "📝" },
  { to: "/notificaciones", label: "Notificaciones", icon: "🔔", always: true },
];

export default function MainMenu() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const manual = localStorage.getItem("usuarioManual");
    if (manual) {
      setUserData(JSON.parse(manual));
    } else if (user) {
      (async () => {
        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setUserData(snap.data());
        } else {
          setUserData(null);
        }
      })();
    } else {
      setUserData(null);
    }
  }, [user]);

  const esAdmin = userData?.rol === "admin";
  const areas = userData?.areas || [];
  const itemsVisibles = items.filter(
    i => i.always || !i.area || esAdmin || areas.includes(i.area)
  );

  const handleLogout = () => {
    if (localStorage.getItem("usuarioManual")) {
      localStorage.removeItem("usuarioManual");
      navigate("/login");
      window.location.reload();
    } else {
      auth.signOut().then(() => {
        navigate("/login");
        window.location.reload();
      });
    }
  };

  return (
    <aside className="h-screen fixed top-0 left-0 w-56 bg-white border-r shadow flex flex-col z-40">
      <div className="text-xl font-bold text-center mt-6 mb-4 select-none tracking-tight">Gestión de Campo</div>
      <nav className="flex-1 flex flex-col gap-2 px-2">
        {itemsVisibles.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              "flex items-center gap-3 px-4 py-2 rounded-lg text-base font-medium transition-all " +
              (isActive
                ? "bg-blue-500 text-white shadow"
                : "text-gray-700 hover:bg-gray-100")
            }
            end
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
            {item.label === "Notificaciones" && <NotifBadge />}
          </NavLink>
        ))}
      </nav>
      <div className="mb-8 px-2">
        <button
          className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition"
          onClick={handleLogout}
        >
          <span>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a2 2 0 01-2 2h-3a2 2 0 01-2-2V7a2 2 0 012-2h3a2 2 0 012 2v1"/></svg>
          </span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
