import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  getCostCenters,
  getTasks,
  saveCostCenter,
  saveTask,
} from "../firebase/firestore";


const opcionesGuardia = ["Si", "No"];

const Frutales = ({ usuario }) => {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    empleado: "",
    ceco: "",
    tarea: "",
    nota: "",
    horas: 0,
    horas_extra: 0,
    guardia: ""
  });
  const [empleados, setEmpleados] = useState([]);
  const [cecos, setCecos] = useState([]);
  const [tareas, setTareas] = useState([]);

  const canEdit =
    usuario?.rol === "admin" && (usuario?.areas || []).includes("Administración");

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const q = query(
          collection(db, "usuarios"),
          where("areas", "array-contains", "Frutales"),
          where("activo", "==", true)
        );
        const snapshot = await getDocs(q);
        setEmpleados(snapshot.docs.map(doc => doc.data().nombre));

        const [cecosData, tareasData] = await Promise.all([
          getCostCenters(),
          getTasks(),
        ]);
        setCecos(cecosData);
        setTareas(tareasData);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };
    cargarDatos();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    console.log("Formulario Frutales", formData);
  };

  const handleEditCeco = async () => {
    const actual = cecos.find(c => c.nombre === formData.ceco);
    const nombre = prompt("Centro de Costo", actual?.nombre || "");
    if (nombre) {
      const id = await saveCostCenter({ nombre }, actual?.id);
      if (actual) {
        setCecos(prev => prev.map(c => (c.id === id ? { ...c, nombre } : c)));
        setFormData(prev => ({ ...prev, ceco: nombre }));
      } else {
        setCecos(prev => [...prev, { id, nombre }]);
      }
    }
  };

  const handleEditTarea = async () => {
    const actual = tareas.find(t => t.nombre === formData.tarea);
    const nombre = prompt("Tarea", actual?.nombre || "");
    if (nombre) {
      const id = await saveTask({ nombre }, actual?.id);
      if (actual) {
        setTareas(prev => prev.map(t => (t.id === id ? { ...t, nombre } : t)));
        setFormData(prev => ({ ...prev, tarea: nombre }));
      } else {
        setTareas(prev => [...prev, { id, nombre }]);
      }
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Registro Diario de Tareas - Frutales
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <div>
          <label className="block font-medium">Fecha</label>
          <input
            type="date"
            name="fecha"
            value={formData.fecha}
            onChange={handleChange}
            className="mt-1 p-2 border rounded w-full"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Empleado</label>
          <select
            name="empleado"
            value={formData.empleado}
            onChange={handleChange}
            className="mt-1 p-2 border rounded w-full"
            required
          >
            <option value="">Seleccione</option>
            {empleados.map(e => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Centro de Costo</label>
          <div className="flex gap-2">
            <select
              name="ceco"
              value={formData.ceco}
              onChange={handleChange}
              className="mt-1 p-2 border rounded w-full"
              required
            >
              <option value="">Seleccione</option>
              {cecos.map(c => (
                <option key={c.id} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {canEdit && (
              <button
                type="button"
                onClick={handleEditCeco}
                className="bg-yellow-500 text-white px-2 rounded"
              >
                Editar
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block font-medium">Tarea</label>
          <div className="flex gap-2">
            <select
              name="tarea"
              value={formData.tarea}
              onChange={handleChange}
              className="mt-1 p-2 border rounded w-full"
              required
            >
              <option value="">Seleccione</option>
              {tareas.map(t => (
                <option key={t.id} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
            </select>
            {canEdit && (
              <button
                type="button"
                onClick={handleEditTarea}
                className="bg-yellow-500 text-white px-2 rounded"
              >
                Editar
              </button>
            )}
          </div>
        </div>

        {formData.tarea === "Falta con aviso" && (
          <div>
            <label className="block font-medium">Justificar Falta</label>
            <input
              type="text"
              name="nota"
              value={formData.nota}
              onChange={handleChange}
              className="mt-1 p-2 border rounded w-full"
            />
          </div>
        )}

        <div>
          <label className="block font-medium">Horas</label>
          <input
            type="number"
            name="horas"
            value={formData.horas}
            onChange={handleChange}
            className="mt-1 p-2 border rounded w-full"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Horas Extra</label>
          <input
            type="number"
            name="horas_extra"
            value={formData.horas_extra}
            onChange={handleChange}
            className="mt-1 p-2 border rounded w-full"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Guardia</label>
          <select
            name="guardia"
            value={formData.guardia}
            onChange={handleChange}
            className="mt-1 p-2 border rounded w-full"
            required
          >
            <option value="">Seleccione</option>
            {opcionesGuardia.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Guardar
        </button>
      </form>
    </div>
  );
};

export default Frutales;

