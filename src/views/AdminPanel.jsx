import React from "react";
import { useAuth } from "../context/AuthContext";
import UsersAdmin from "./UsersAdmin";

export default function AdminPanel() {
  const { perfil } = useAuth();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Panel Administrativo</h1>
      {perfil?.perfil === "admin" ? (
        <UsersAdmin />
      ) : (
        <p>No tiene acceso a esta sección.</p>
      )}
    </div>
  );
}