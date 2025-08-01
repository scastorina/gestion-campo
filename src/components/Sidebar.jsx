import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home, List, Bell, Users, Layers, Settings
} from "lucide-react";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: <Home size={20} /> },
  { label: "Órdenes", to: "/ordenes", icon: <List size={20} /> },
  { label: "Ganadería", to: "/ganaderia", icon: <Layers size={20} /> },
  { label: "Usuarios", to: "/usuarios", icon: <Users size={20} /> },
  { label: "Notificaciones", to: "/notificaciones", icon: <Bell size={20} /> },
  { label: "Ajustes", to: "/ajustes", icon: <Settings size={20} /> }
];

function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 h-full w-56 bg-gray-900 text-white flex flex-col z-40">
      <div className="h-16 flex items-center justify-center text-xl font-bold tracking-widest border-b border-gray-700 mb-4">
        GESTIÓN CAMPO
      </div>
      <nav className="flex-1">
        <ul className="space-y-2 mt-2">
          {navItems.map(item => (
            <li key={item.label}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  "flex items-center gap-3 px-6 py-2 rounded-lg transition " +
                  (isActive
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-700 hover:text-blue-400")
                }
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="py-4 text-center text-xs text-gray-400 border-t border-gray-700">
        &copy; {new Date().getFullYear()} Pomco
      </div>
    </aside>
  );
}

export default Sidebar;
