import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { Plus, Edit2, Trash2, X } from "lucide-react";

const initialForm = {
  nombre: "",
  categoria: "",
  cantidad: "",
  observaciones: "",
};

const categoriasGanaderas = [
  "Vacas de cría",
  "Vaquillonas",
  "Toros",
  "Novillos",
  "Terneros",
  "Otros",
];

function Ganaderia() {
  const [ganado, setGanado] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Cargar datos al iniciar
  useEffect(() => {
    fetchGanado();
  }, []);

  const fetchGanado = async () => {
    setLoading(true);
    const ref = collection(db, "ganaderia");
    const q = query(ref, orderBy("nombre"));
    const snap = await getDocs(q);
    setGanado(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.categoria || !form.cantidad) return;
    if (editId) {
      // Editar
      await updateDoc(doc(db, "ganaderia", editId), { ...form });
    } else {
      // Crear
      await addDoc(collection(db, "ganaderia"), { ...form });
    }
    setForm(initialForm);
    setEditId(null);
    setShowModal(false);
    fetchGanado();
  };

  const handleEdit = (item) => {
    setForm(item);
    setEditId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar este registro?")) {
      await deleteDoc(doc(db, "ganaderia", id));
      fetchGanado();
    }
  };

  const handleNew = () => {
    setForm(initialForm);
    setEditId(null);
    setShowModal(true);
  };

  const filtered = ganado.filter(
    (g) =>
      g.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      g.categoria?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Ganadería</h2>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow"
          onClick={handleNew}
        >
          <Plus size={20} /> Nuevo
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o categoría..."
          className="p-2 border rounded-xl w-full max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow p-2 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">Categoría</th>
              <th className="p-2 text-right">Cantidad</th>
              <th className="p-2 text-left">Observaciones</th>
              <th className="p-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center p-8">
                  Cargando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-8">
                  Sin registros
                </td>
              </tr>
            ) : (
              filtered.map((g) => (
                <tr
                  key={g.id}
                  className="hover:bg-blue-50 transition"
                >
                  <td className="p-2">{g.nombre}</td>
                  <td className="p-2">{g.categoria}</td>
                  <td className="p-2 text-right">{g.cantidad}</td>
                  <td className="p-2">{g.observaciones}</td>
                  <td className="p-2 flex gap-2 justify-center">
                    <button
                      className="bg-amber-200 hover:bg-amber-300 rounded-xl p-1"
                      onClick={() => handleEdit(g)}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      className="bg-red-200 hover:bg-red-400 rounded-xl p-1"
                      onClick={() => handleDelete(g.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl p-6 min-w-[320px] max-w-[95vw] shadow-2xl relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setShowModal(false)}
            >
              <X />
            </button>
            <h3 className="text-lg font-bold mb-4">
              {editId ? "Editar Registro" : "Nuevo Registro"}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm mb-1">Nombre</label>
                <input
                  name="nombre"
                  className="p-2 border rounded-xl w-full"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Categoría</label>
                <select
                  name="categoria"
                  className="p-2 border rounded-xl w-full"
                  value={form.categoria}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {categoriasGanaderas.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Cantidad</label>
                <input
                  name="cantidad"
                  type="number"
                  className="p-2 border rounded-xl w-full"
                  value={form.cantidad}
                  onChange={handleChange}
                  min={0}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Observaciones</label>
                <input
                  name="observaciones"
                  className="p-2 border rounded-xl w-full"
                  value={form.observaciones}
                  onChange={handleChange}
                  maxLength={120}
                />
              </div>
              <button
                type="submit"
                className="mt-2 bg-blue-700 hover:bg-blue-900 text-white rounded-2xl p-2 font-bold"
              >
                {editId ? "Guardar Cambios" : "Agregar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ganaderia;
