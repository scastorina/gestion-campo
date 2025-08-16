import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import UserDashboard from "./UserDashboard";
import Users from "./Users";
import Ganaderia from "../modules/ganaderia/Ganaderia";
import Ordenes from "./Ordenes";
import Notificaciones from "./Notificaciones";
import Dashboard from "./Dashboard";
import { AuthProvider, AuthContext } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import MainLayout from "../layouts/MainLayout";

function PrivateRoute({ children, rolesPermitidos, areasPermitidas }) {
  const { user, loading } = React.useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const manual = localStorage.getItem("usuarioManual");
    if (manual) {
      setUserData(JSON.parse(manual));
      setUserLoading(false);
    } else if (user && user.uid) {
      setUserLoading(true);
      getDoc(doc(db, "usuarios", user.uid))
        .then(snap => {
          if (snap.exists()) {
            setUserData({ ...user, ...snap.data() });
          } else {
            setUserData(null);
          }
          setUserLoading(false);
        });
    } else {
      setUserData(null);
      setUserLoading(false);
    }
  }, [user]);

  if (loading || userLoading) return <div>Cargando...</div>;
  if (!user && !userData) return <Navigate to="/login" />;
  if (
    (rolesPermitidos && !rolesPermitidos.includes(userData?.rol)) ||
    (areasPermitidas && !(userData?.areas || []).some(a => areasPermitidas.includes(a)))
  ) {
    return <div className="p-12 text-red-500 text-center">Acceso denegado</div>;
  }
  // Pasa el usuario como prop a los hijos
  return React.cloneElement(children, { usuario: userData });
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/panel"
          element={
            <PrivateRoute>
              <MainLayout>
                <UserDashboard />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <PrivateRoute rolesPermitidos={["admin"]} areasPermitidas={["Administración"]}>
              <MainLayout>
                <Users />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/ganaderia"
          element={
            <PrivateRoute areasPermitidas={["Ganadería"]}>
              <MainLayout>
                <Ganaderia />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/ordenes"
          element={
            <PrivateRoute areasPermitidas={["Administración", "Ganadería", "Frutales", "Riego", "Taller"]}>
              <MainLayout>
                <Ordenes />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/notificaciones"
          element={
            <PrivateRoute>
              <MainLayout>
                <Notificaciones />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
