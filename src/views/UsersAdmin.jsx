
import React, { useEffect, useState } from "react";
import { getUsers, toggleUserStatus, updateUserRoles, resetPassword } from "../firebase/users";
import { Card, CardContent } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";

const UsersAdmin = () => {
  const [users, setUsers] = useState([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  const handleToggle = (uid, currentStatus) => {
    toggleUserStatus(uid, !currentStatus).then(() =>
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, activo: !currentStatus } : u
        )
      )
    );
  };

  const handleResetPassword = (email) => {
    resetPassword(email);
    alert("Se envió un correo para blanquear la contraseña.");
  };

  const handleRoleChange = (uid, newRole) => {
    updateUserRoles(uid, [newRole]).then(() =>
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, roles: [newRole] } : u
        )
      )
    );
  };

  return (
    <div className="p-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {users
        .filter((u) =>
          u.nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
          u.username?.toLowerCase().includes(filtro.toLowerCase())
        )
        .map((user) => (
          <Card key={user.uid} className="shadow border rounded-xl">
            <CardContent className="p-4 space-y-2">
              <div className="text-lg font-semibold">{user.nombre}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
              <div className="text-sm">Usuario: {user.username}</div>
              <div className="text-sm">Perfil: {user.perfil}</div>
              <div className="text-sm flex gap-2 flex-wrap">
                Áreas: {user.areas?.map((a, i) => <Badge key={i}>{a}</Badge>)}
              </div>
              <div className="text-sm flex gap-2 items-center">
                Activo:
                <Switch
                  checked={user.activo}
                  onCheckedChange={() => handleToggle(user.uid, user.activo)}
                />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <select
                  value={user.roles?.[0] || ""}
                  onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                  className="border px-2 py-1 rounded"
                >
                  <option value="">Seleccionar rol</option>
                  <option value="Admin">Admin</option>
                  <option value="Gerencia">Gerencia</option>
                  <option value="Capataz">Capataz</option>
                </select>
                <button
                  onClick={() => handleResetPassword(user.email)}
                  className="text-sm text-blue-600 underline"
                >
                  Blanquear contraseña
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
};

export default UsersAdmin;
