import React, { useEffect, useState, useContext } from "react";
import { db, auth } from "../firebase/config";
import { collection, getDocs, updateDoc, doc, setDoc, query, where } from "firebase/firestore";
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { AuthContext } from "../context/AuthContext";
import bcrypt from "bcryptjs";

// Roles y áreas disponibles
const ROLES = [
  "admin",
  "capataz",
  "taller",
  "frutales",
  "riego",
  "ganaderia"
];

const AREAS = [
  "Ganadería",
  "Frutales",
  "Riego",
  "Taller",
  "Administración"
];

function Users() {
  const { user: usuarioActual } = useContext(AuthContext);

  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);
  const [editData, setEditData] = useState({});
  const [nuevo, setNuevo] = useState({
    nombre: "",
    email: "",
    usuario: "",
    password: "",
    rol: "",
    areas: []
  });
  const [crearError, setCrearError] = useState("");
  const [creando, setCreando] = useState(false);

  // Edición masiva
  const [seleccionados, setSeleccionados] = useState([]);
  const [accionRol, setAccionRol] = useState("");

  // Cargar usuarios
  useEffect(() => {
    const cargarUsuarios = async () => {
      const querySnapshot = await getDocs(collection(db, "usuarios"));
      setUsuarios(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    cargarUsuarios();
  }, []);

  // Cambiar estado activo/inactivo
  const handleCambiarEstado = async (uid, estado) => {
    const userRef = doc(db, "usuarios", uid);
    await updateDoc(userRef, { activo: estado });
    setUsuarios(usuarios.map(u => u.id === uid ? { ...u, activo: estado } : u));
  };

  // Iniciar edición
  const handleEditar = (user) => {
    setEditando(user.id);
    setEditData({
      nombre: user.nombre ?? "",
      rol: user.rol ?? "",
      areas: Array.isArray(user.areas) ? user.areas : (user.area ? [user.area] : []),
      usuario: user.usuario ?? "",
      nuevaPassword: ""
    });
  };

  // Guardar cambios
  const handleGuardar = async (uid) => {
    // Validar usuario único si lo cambió
    if (editData.usuario && editData.usuario !== usuarios.find(u => u.id === uid)?.usuario) {
      const q = query(collection(db, "usuarios"), where("usuario", "==", editData.usuario));
      const res = await getDocs(q);
      if (!res.empty) {
        alert("El nombre de usuario ya existe.");
        return;
      }
    }
    const updateFields = {
      nombre: editData.nombre,
      rol: editData.rol,
      areas: editData.areas,
      usuario: editData.usuario
    };
    if (editData.nuevaPassword) {
      const salt = await bcrypt.genSalt(10);
      updateFields.passwordHash = await bcrypt.hash(editData.nuevaPassword, salt);
    }
    const userRef = doc(db, "usuarios", uid);
    await updateDoc(userRef, updateFields);
    setUsuarios(usuarios.map(u => u.id === uid ? { ...u, ...updateFields } : u));
    setEditando(null);
  };

  // Cancelar edición
  const handleCancelar = () => {
    setEditando(null);
    setEditData({});
  };

  // Cambio en campos de edición
  const handleChange = (campo, valor) => {
    setEditData({ ...editData, [campo]: valor });
  };

  // Checkbox de áreas (multi)
  const handleAreaCheckbox = (area) => {
    let nuevasAreas = [...(editData.areas || [])];
    if (nuevasAreas.includes(area)) {
      nuevasAreas = nuevasAreas.filter(a => a !== area);
    } else {
      nuevasAreas.push(area);
    }
    setEditData({ ...editData, areas: nuevasAreas });
  };

  // --- NUEVO: Crear usuario ---
  const handleNuevoArea = (area) => {
    let nuevasAreas = [...(nuevo.areas || [])];
    if (nuevasAreas.includes(area)) {
      nuevasAreas = nuevasAreas.filter(a => a !== area);
    } else {
      nuevasAreas.push(area);
    }
    setNuevo({ ...nuevo, areas: nuevasAreas });
  };

  const handleNuevoChange = (campo, valor) => {
    setNuevo({ ...nuevo, [campo]: valor });
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setCrearError("");
    setCreando(true);

    if (!nuevo.email && (!nuevo.usuario || !nuevo.password)) {
      setCrearError("Completa los campos obligatorios.");
      setCreando(false);
      return;
    }
    if (!nuevo.nombre || !nuevo.rol) {
      setCrearError("Completa todos los campos obligatorios.");
      setCreando(false);
      return;
    }

    // 1. Validar usuario único
    if (nuevo.usuario) {
      const q = query(collection(db, "usuarios"), where("usuario", "==", nuevo.usuario));
      const res = await getDocs(q);
      if (!res.empty) {
        setCrearError("El nombre de usuario ya existe.");
        setCreando(false);
        return;
      }
    }

    try {
      let newUid = null;
      let userData = {
        nombre: nuevo.nombre,
        usuario: nuevo.usuario,
        rol: nuevo.rol,
        areas: nuevo.areas,
        activo: true
      };

      if (
        nuevo.rol === "admin" ||
        (nuevo.areas && nuevo.areas.includes("Administración"))
      ) {
        // Crea usuario con email en Firebase Auth y Firestore
        const cred = await createUserWithEmailAndPassword(auth, nuevo.email, nuevo.password);
        newUid = cred.user.uid;
        userData.email = nuevo.email;
      } else {
        // Usuario solo local: encripta password, guarda en Firestore
        const salt = await bcrypt.genSalt(10);
        userData.passwordHash = await bcrypt.hash(nuevo.password, salt);
      }

      // 3. Crear en Firestore
      const docRef = newUid ? doc(db, "usuarios", newUid) : doc(collection(db, "usuarios"));
      await setDoc(docRef, userData);

      setUsuarios([
        ...usuarios,
        {
          id: newUid ? newUid : docRef.id,
          ...userData
        }
      ]);
      setNuevo({ nombre: "", email: "", usuario: "", password: "", rol: "", areas: [] });
    } catch (err) {
      setCrearError("Error al crear usuario: " + (err.message || err.code));
    }
    setCreando(false);
  };

  // Edición masiva: asignar rol
  const handleSeleccionTodos = (checked) => {
    setSeleccionados(
      checked ? usuariosFiltrados.map(u => u.id) : []
    );
  };

  const handleSeleccionarUno = (id) => {
    setSeleccionados(sel =>
      sel.includes(id)
        ? sel.filter(uid => uid !== id)
        : [...sel, id]
    );
  };

  const handleAsignarRolMasivo = async () => {
    for (const uid of seleccionados) {
      const userRef = doc(db, "usuarios", uid);
      await updateDoc(userRef, { rol: accionRol });
    }
    setUsuarios(usuarios.map(u =>
      seleccionados.includes(u.id) ? { ...u, rol: accionRol } : u
    ));
    setSeleccionados([]);
    setAccionRol("");
  };

  // Filtrado de usuarios
  const usuariosFiltrados = usuarios.filter(u =>
    (u.email?.toLowerCase() ?? "").includes(busqueda.toLowerCase()) ||
    (u.nombre?.toLowerCase() ?? "").includes(busqueda.toLowerCase()) ||
    (u.usuario?.toLowerCase() ?? "").includes(busqueda.toLowerCase())
  );

  // Solo admin puede crear usuarios
  const esAdmin = usuarios.find(u => u.id === usuarioActual?.uid)?.rol === "admin";

  return (
    <div className="max-w-5xl mx-auto my-8 p-6 bg-white rounded-xl shadow">
        <h2 className="text-2xl font-bold mb-4">Gestión de Usuarios</h2>

        {/* FORMULARIO DE CREACIÓN */}
        {esAdmin && (
          <form
            onSubmit={handleCrearUsuario}
            className="mb-8 p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col gap-2"
          >
            <div className="font-semibold mb-2">Crear nuevo usuario</div>
            <div className="flex gap-2">
              <input
                className="border rounded p-2 w-full"
                placeholder="Nombre"
                value={nuevo.nombre}
                onChange={e => handleNuevoChange("nombre", e.target.value)}
                required
              />
              <input
                className="border rounded p-2 w-full"
                placeholder="Usuario"
                value={nuevo.usuario}
                onChange={e => handleNuevoChange("usuario", e.target.value)}
                required
              />
              <input
                className="border rounded p-2 w-full"
                placeholder="Email (sólo para admins)"
                type="email"
                value={nuevo.email}
                onChange={e => handleNuevoChange("email", e.target.value)}
                // required sólo si rol es admin o área administración
                required={nuevo.rol === "admin" || (nuevo.areas && nuevo.areas.includes("Administración"))}
              />
              <input
                className="border rounded p-2 w-full"
                placeholder="Contraseña"
                type="password"
                value={nuevo.password}
                onChange={e => handleNuevoChange("password", e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 items-center">
              <select
                className="border rounded p-2"
                value={nuevo.rol}
                onChange={e => handleNuevoChange("rol", e.target.value)}
                required
              >
                <option value="">Rol</option>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                {AREAS.map(area => (
                  <label key={area} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={nuevo.areas?.includes(area) || false}
                      onChange={() => handleNuevoArea(area)}
                    />
                    {area}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
                type="submit"
                disabled={creando}
              >
                {creando ? "Creando..." : "Crear usuario"}
              </button>
            </div>
            {crearError && <div className="text-red-500 mt-2">{crearError}</div>}
          </form>
        )}

        {/* ACCIÓN MASIVA */}
        {seleccionados.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-gray-700">Acción masiva para {seleccionados.length} usuarios:</span>
            <select
              className="border p-1 rounded"
              value={accionRol}
              onChange={e => setAccionRol(e.target.value)}
            >
              <option value="">Asignar rol</option>
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded"
              onClick={handleAsignarRolMasivo}
              disabled={!accionRol}
            >
              Aplicar
            </button>
            <button
              className="text-gray-600 underline ml-4"
              onClick={() => setSeleccionados([])}
            >
              Cancelar selección
            </button>
          </div>
        )}

        <input
          className="border rounded p-2 w-full mb-4"
          placeholder="Buscar por nombre, usuario o email"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">
                <input
                  type="checkbox"
                  checked={usuariosFiltrados.length > 0 && seleccionados.length === usuariosFiltrados.length}
                  onChange={e => handleSeleccionTodos(e.target.checked)}
                />
              </th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Usuario</th>
              <th className="p-2">Email</th>
              <th className="p-2">Rol</th>
              <th className="p-2">Áreas</th>
              <th className="p-2">Activo</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map(user => (
              <tr key={user.id} className="border-b">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(user.id)}
                    onChange={() => handleSeleccionarUno(user.id)}
                  />
                </td>
                <td className="p-2">
                  {editando === user.id ? (
                    <input
                      type="text"
                      className="border rounded px-1"
                      value={editData.nombre}
                      onChange={e => handleChange("nombre", e.target.value)}
                    />
                  ) : (
                    user.nombre
                  )}
                </td>
                <td className="p-2">
                  {editando === user.id ? (
                    <input
                      type="text"
                      className="border rounded px-1"
                      value={editData.usuario}
                      onChange={e => handleChange("usuario", e.target.value)}
                    />
                  ) : (
                    user.usuario
                  )}
                </td>
                <td className="p-2">{user.email}</td>
                <td className="p-2">
                  {editando === user.id ? (
                    <select
                      className="border rounded px-1"
                      value={editData.rol}
                      onChange={e => handleChange("rol", e.target.value)}
                    >
                      <option value="">--</option>
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    user.rol
                  )}
                </td>
                <td className="p-2">
                  {editando === user.id ? (
                    <div className="flex flex-wrap gap-2">
                      {AREAS.map(area => (
                        <label key={area} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={editData.areas?.includes(area) || false}
                            onChange={() => handleAreaCheckbox(area)}
                          />
                          {area}
                        </label>
                      ))}
                    </div>
                  ) : (
                    Array.isArray(user.areas)
                      ? user.areas.join(", ")
                      : (user.area ?? "")
                  )}
                  {/* Contraseña nueva solo para edición */}
                  {editando === user.id && (
                    <input
                      type="password"
                      className="border rounded px-1 mt-1"
                      placeholder="Nueva contraseña"
                      value={editData.nuevaPassword || ""}
                      onChange={e => handleChange("nuevaPassword", e.target.value)}
                    />
                  )}
                </td>
                <td className="p-2">
                  <span className={user.activo ? "text-green-600" : "text-gray-400"}>
                    {user.activo ? "Sí" : "No"}
                  </span>
                </td>
                <td className="p-2 flex flex-wrap gap-2">
                  {editando === user.id ? (
                    <>
                      <button
                        className="px-2 py-1 bg-blue-200 rounded"
                        onClick={() => handleGuardar(user.id)}
                      >
                        Guardar
                      </button>
                      <button
                        className="px-2 py-1 bg-gray-200 rounded"
                        onClick={handleCancelar}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="px-2 py-1 bg-yellow-100 rounded"
                        onClick={() => handleEditar(user)}
                      >
                        Editar
                      </button>
                      <button
                        className={`px-2 py-1 rounded ${user.activo ? "bg-red-200" : "bg-green-200"}`}
                        onClick={() => handleCambiarEstado(user.id, !user.activo)}
                      >
                        {user.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        className="px-2 py-1 bg-indigo-100 rounded"
                        onClick={async () => {
                          if (!user.email) return;
                          await sendPasswordResetEmail(auth, user.email);
                          alert("Se envió un mail para blanquear la contraseña a " + user.email);
                        }}
                        disabled={!user.email}
                      >
                        Blanquear contraseña
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usuariosFiltrados.length === 0 && (
          <div className="text-center text-gray-400 py-8">Sin usuarios encontrados</div>
        )}
      </div>
  );
}

export default Users;
