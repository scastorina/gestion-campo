import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  where,
  query
} from "firebase/firestore";

async function enviarNotificacion({ para, titulo, texto, link = "", ordenId }) {
  await addDoc(collection(db, "notificaciones"), {
    para,
    titulo,
    texto,
    leido: false,
    link,
    ordenId,
    fecha: new Date().toISOString()
  });
}

const ESTADOS = ["pendiente", "en curso", "finalizada"];

function Ordenes({ usuario }) {
  const [ordenes, setOrdenes] = useState([]);
  const [usuariosSistema, setUsuariosSistema] = useState([]);
  const [nueva, setNueva] = useState({
    titulo: "",
    descripcion: "",
    estado: "pendiente",
    responsable: "",
    fecha: new Date().toISOString().slice(0, 10),
    asignadoA: "",
  });
  const [filtro, setFiltro] = useState({
    estado: "",
    responsable: ""
  });
  const [respuestas, setRespuestas] = useState({});

  useEffect(() => {
    const cargar = async () => {
      const ref = collection(db, "ordenes");
      const snap = await getDocs(ref);
      setOrdenes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    cargar();
  }, []);

  useEffect(() => {
    const cargarUsuarios = async () => {
      const snap = await getDocs(collection(db, "usuarios"));
      setUsuariosSistema(snap.docs.map(d => d.data()));
    };
    cargarUsuarios();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!nueva.titulo || !nueva.asignadoA) return;
    const orden = {
      ...nueva,
      creador: usuario.email || usuario.usuario,
      rolCreador: usuario.rol,
      fecha: new Date().toISOString().slice(0, 10),
      historialEstados: [
        {
          de: null,
          a: "pendiente",
          usuario: usuario.email || usuario.usuario,
          fecha: new Date().toISOString()
        }
      ]
    };
    const ref = await addDoc(collection(db, "ordenes"), orden);
    setOrdenes([...ordenes, { ...orden, id: ref.id }]);
    setNueva({
      titulo: "",
      descripcion: "",
      estado: "pendiente",
      responsable: "",
      fecha: new Date().toISOString().slice(0, 10),
      asignadoA: "",
    });

    await enviarNotificacion({
      para: orden.asignadoA,
      titulo: "Nueva Orden de Trabajo asignada",
      texto: `Te han asignado la orden "${orden.titulo}".`,
      link: `/ordenes`,
      ordenId: ref.id
    });
  };

  const handleUpdate = async (id, cambios) => {
    const orden = ordenes.find(o => o.id === id);
    if (!puedeEditar(orden)) return;

    let historial = orden.historialEstados || [];
    if (cambios.estado && cambios.estado !== orden.estado) {
      historial = [...historial, {
        de: orden.estado,
        a: cambios.estado,
        usuario: usuario.email || usuario.usuario,
        fecha: new Date().toISOString()
      }];
      const textoNotif = `La orden "${orden.titulo}" cambió de estado: ${orden.estado} ➔ ${cambios.estado}.`;

      if ((orden.creador !== (usuario.email || usuario.usuario))) {
        await enviarNotificacion({
          para: orden.creador,
          titulo: "Orden de trabajo actualizada",
          texto: textoNotif,
          link: "/ordenes",
          ordenId: id
        });
      }
      if (
        orden.asignadoA &&
        orden.asignadoA !== (usuario.email || usuario.usuario) &&
        orden.asignadoA !== orden.creador
      ) {
        await enviarNotificacion({
          para: orden.asignadoA,
          titulo: "Orden de trabajo actualizada",
          texto: textoNotif,
          link: "/ordenes",
          ordenId: id
        });
      }
    }
    const ref = doc(db, "ordenes", id);
    await updateDoc(ref, { ...cambios, historialEstados: historial });
    setOrdenes(ordenes.map(o => o.id === id ? { ...o, ...cambios, historialEstados: historial } : o));
  };

  const handleEliminar = async (id) => {
    const orden = ordenes.find(o => o.id === id);
    if (!puedeEditar(orden)) return;
    if (!window.confirm("¿Eliminar orden?")) return;
    await deleteDoc(doc(db, "ordenes", id));
    // Borrar notificaciones relacionadas
    const q = query(collection(db, "notificaciones"), where("ordenId", "==", id));
    const snap = await getDocs(q);
    snap.forEach(n => deleteDoc(doc(db, "notificaciones", n.id)));
    setOrdenes(ordenes.filter(o => o.id !== id));
  };

  const handleResponder = async (id, texto) => {
    if (!texto) return;
    const orden = ordenes.find(o => o.id === id);
    const nuevaResp = {
      autor: usuario.email || usuario.usuario,
      rolAutor: usuario.rol,
      fecha: new Date().toISOString().slice(0, 16).replace("T", " "),
      texto
    };
    const nuevasRespuestas = [...(orden.respuestas || []), nuevaResp];
    await updateDoc(doc(db, "ordenes", id), { respuestas: nuevasRespuestas });
    setOrdenes(ordenes.map(o => o.id === id ? { ...o, respuestas: nuevasRespuestas } : o));
    setRespuestas({ ...respuestas, [id]: "" });

    if ((orden.creador !== (usuario.email || usuario.usuario))) {
      await enviarNotificacion({
        para: orden.creador,
        titulo: "Nueva respuesta a tu Orden de Trabajo",
        texto: `El usuario ${nuevaResp.autor} respondió la orden "${orden.titulo}".`,
        link: `/ordenes`,
        ordenId: id
      });
    }
    if (
      orden.asignadoA &&
      orden.asignadoA !== (usuario.email || usuario.usuario) &&
      orden.asignadoA !== orden.creador
    ) {
      await enviarNotificacion({
        para: orden.asignadoA,
        titulo: "Nueva respuesta en Orden asignada",
        texto: `El usuario ${nuevaResp.autor} respondió la orden "${orden.titulo}".`,
        link: `/ordenes`,
        ordenId: id
      });
    }
  };

  function puedeEditar(orden) {
    if (!orden) return false;
    if (usuario.rol === "admin" && orden.rolCreador === "admin") return true;
    if (usuario.rol === "capataz" && orden.rolCreador === "capataz" && orden.creador === (usuario.email || usuario.usuario)) return true;
    return false;
  }
  function puedeEliminar(orden) {
    return puedeEditar(orden);
  }
  function puedeResponder(orden) {
    return (
      (orden.asignadoA === (usuario.email || usuario.usuario)) ||
      (orden.responsable === (usuario.email || usuario.usuario)) ||
      (usuario.rol === "capataz" && orden.rolCreador === "admin") ||
      (usuario.rol === "admin" && orden.rolCreador !== "admin")
    );
  }

  const ordenesFiltradas = ordenes.filter(o =>
    (!filtro.estado || o.estado === filtro.estado) &&
    (!filtro.responsable || (o.asignadoA || "").toLowerCase().includes(filtro.responsable.toLowerCase()))
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Órdenes de Trabajo</h1>
      {(usuario.rol === "admin" || usuario.rol === "capataz") && (
        <form onSubmit={handleCrear} className="mb-6 flex gap-2 items-end flex-wrap bg-gray-50 p-4 rounded-xl border">
          <input
            className="border rounded p-2 w-48"
            placeholder="Título"
            value={nueva.titulo}
            onChange={e => setNueva(n => ({ ...n, titulo: e.target.value }))}
            required
          />
          <input
            className="border rounded p-2 w-64"
            placeholder="Descripción"
            value={nueva.descripcion}
            onChange={e => setNueva(n => ({ ...n, descripcion: e.target.value }))}
          />
          <input
            className="border rounded p-2 w-48"
            list="usuarios-datalist"
            placeholder="Asignar a..."
            value={nueva.asignadoA}
            onChange={e => setNueva(n => ({ ...n, asignadoA: e.target.value }))}
            required
          />
          <datalist id="usuarios-datalist">
            {usuariosSistema.map(u =>
              <option
                key={u.email || u.usuario}
                value={u.email || u.usuario}
              >
                {u.nombre ? `${u.nombre} (${u.email || u.usuario})` : (u.email || u.usuario)}
              </option>
            )}
          </datalist>
          <input
            type="date"
            className="border rounded p-2 w-36"
            value={nueva.fecha}
            onChange={e => setNueva(n => ({ ...n, fecha: e.target.value }))}
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
            Crear
          </button>
        </form>
      )}
      <div className="mb-4 flex gap-2 flex-wrap">
        <select className="border rounded p-1"
          value={filtro.estado}
          onChange={e => setFiltro(f => ({ ...f, estado: e.target.value }))}
        >
          <option value="">Estado</option>
          {ESTADOS.map(e => <option key={e}>{e}</option>)}
        </select>
        <input
          className="border rounded p-1"
          placeholder="Buscar asignado"
          value={filtro.responsable}
          onChange={e => setFiltro(f => ({ ...f, responsable: e.target.value }))}
        />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Título</th>
              <th className="p-2">Descripción</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Creador</th>
              <th className="p-2">Asignado a</th>
              <th className="p-2">Fecha</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenesFiltradas.map(o => (
              <tr key={o.id} className="border-b">
                <td className="p-2">{o.titulo}</td>
                <td className="p-2">{o.descripcion}</td>
                <td className="p-2">
                  {puedeEditar(o) ? (
                    <select
                      className="border rounded p-1"
                      value={o.estado}
                      onChange={e => handleUpdate(o.id, { estado: e.target.value })}
                    >
                      {ESTADOS.map(e => <option key={e}>{e}</option>)}
                    </select>
                  ) : (
                    o.estado
                  )}
                </td>
                <td className="p-2">{o.creador}</td>
                <td className="p-2">{o.asignadoA}</td>
                <td className="p-2">{o.fecha}</td>
                <td className="p-2 flex gap-1">
                  {puedeEditar(o) && (
                    <button
                      className="text-red-500 hover:underline"
                      onClick={() => handleEliminar(o.id)}
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {ordenesFiltradas.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-8">Sin órdenes</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {ordenesFiltradas.map(o =>
        Array.isArray(o.historialEstados) && o.historialEstados.length > 0 && (
          <div key={o.id + "hist"} className="mb-2">
            <div className="text-xs font-bold text-gray-500 mb-1">
              Historial de estados de "{o.titulo}":
            </div>
            {o.historialEstados.map((h, i) => (
              <div key={i} className="text-xs text-gray-600 pl-2">
                {h.fecha.replace("T", " ").slice(0, 16)} – {h.usuario} cambió de <b>{h.de || "—"}</b> a <b>{h.a}</b>
              </div>
            ))}
          </div>
        )
      )}
      <h2 className="text-lg font-bold mt-8 mb-4">Respuestas / Avances</h2>
      {ordenesFiltradas.map(o =>
        puedeResponder(o) && (
          <div key={o.id} className="mb-6 bg-gray-50 p-4 rounded-xl border">
            <div className="font-semibold mb-1">
              Orden: {o.titulo} | Estado: <span className="text-sm">{o.estado}</span>
            </div>
            <div className="text-sm text-gray-700 mb-1">{o.descripcion}</div>
            {Array.isArray(o.respuestas) && o.respuestas.length > 0 && (
              <div className="mb-2">
                {o.respuestas.map((r, i) => (
                  <div key={i} className="border-l-4 border-blue-200 pl-2 py-1 mb-1">
                    <div className="text-xs text-gray-600">{r.fecha} - <b>{r.autor}</b> ({r.rolAutor})</div>
                    <div>{r.texto}</div>
                  </div>
                ))}
              </div>
            )}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleResponder(o.id, respuestas[o.id]);
              }}
              className="flex gap-2 mt-2"
            >
              <input
                className="border rounded p-2 w-96"
                placeholder="Agregar respuesta o avance..."
                value={respuestas[o.id] || ""}
                onChange={e => setRespuestas(r => ({ ...r, [o.id]: e.target.value }))}
              />
              <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
                Responder
              </button>
            </form>
          </div>
        )
      )}
    </div>
  );
}

export default Ordenes;
