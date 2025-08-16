import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";

const cecos = [
  { value: "NOGA11", label: "Nogales Chacra Vieja" },
  { value: "NOGA12", label: "Nogales Pivot" },
  { value: "BAPRO", label: "Viña Barda" },
  { value: "VIEPRO", label: "Viña Chacra Vieja" },
  { value: "PIN22", label: "Viña 2022 Pinot" },
  { value: "AVE13", label: "Avellana 2013/2014" },
  { value: "RIGRA", label: "Riego Gravedad" },
  { value: "RIGOT", label: "Riego Goteo (Viña Barda)" },
  { value: "ASP11", label: "Riego Goteo (Chacra Vieja)" },
  { value: "ASP12", label: "Riego Goteo (Pivot)" },
  { value: "MAQUI", label: "Maquinarias (Tareas sobre tractor)" },
  { value: "Mantenimiento", label: "Mantenimiento" },
  { value: "Faltas", label: "Faltas" },
  { value: "Rivera Grande", label: "Rivera Grande" }
];

const tareas = [
  "Estirar Alambre",
  "Postes",
  "Poda",
  "Subsolador",
  "Corte de ramas",
  "Mantenimiento",
  "Motoguadaña",
  "Aplicación de herbicida",
  "Mantenimiento del riego",
  "Riego",
  "Limpieza Leñosas",
  "Azada",
  "Rastra de Disco",
  "Picadora",
  "Pulverizacion",
  "Desmalezar",
  "Sacar Ramas tractor",
  "Acordonar Ramas",
  "Pintar Cortes",
  "Quemar ramas",
  "Acomodar plantas",
  "Feriado",
  "Falta",
  "Falta con aviso",
  "Vacaciones",
  "Cocina",
  "Nivelador",
  "Fertilizacion",
  "Control de Heladas",
  "Control de Temperatura",
  "Cosecha",
  "Mantenimiento Cosecha",
  "Mugrones",
  "Control de Fuego"
];

const opcionesGuardia = ["Si", "No"];

const Frutales = () => {
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

  useEffect(() => {
    const cargarEmpleados = async () => {
      try {
        const q = query(
          collection(db, "usuarios"),
          where("areas", "array-contains", "Frutales"),
          where("activo", "==", true)
        );
        const snapshot = await getDocs(q);
        setEmpleados(snapshot.docs.map(doc => doc.data().nombre));
      } catch (error) {
        console.error("Error al cargar empleados:", error);
      }
    };
    cargarEmpleados();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    console.log("Formulario Frutales", formData);
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
          <select
            name="ceco"
            value={formData.ceco}
            onChange={handleChange}
            className="mt-1 p-2 border rounded w-full"
            required
          >
            <option value="">Seleccione</option>
            {cecos.map(c => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Tarea</label>
          <select
            name="tarea"
            value={formData.tarea}
            onChange={handleChange}
            className="mt-1 p-2 border rounded w-full"
            required
          >
            <option value="">Seleccione</option>
            {tareas.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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

