import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase/config";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { Plus, Edit2, Trash2 } from "lucide-react";

// Utilidad para normalizar strings eliminando acentos y pasando a minúsculas
const normalizeText = (str = "") =>
  str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// === Utiles ===
const ACTIVIDADES = [
  { value: "invernada", label: "Invernada" },
  { value: "cria", label: "Cría" },
];

const TABS = [
  { key: "entradas", label: "Entradas" },
  { key: "salidas", label: "Salidas" },
  { key: "mortalidad", label: "Mortalidad" },
  { key: "nacimientos", label: "Nacimientos" },
  { key: "recuentos", label: "Recuentos" },
  { key: "inventario", label: "Inventario Inicial" },
  { key: "resumen", label: "Resumen" }, // salida tipo EXISTENCIA MENSUAL
];

// Normalización de movimientos (para ENTRADAS/SALIDAS/etc.)
const emptyMovimiento = {
  fecha: "",
  tipo: "entrada", // entrada | salida | mortalidad | nacimiento | recuento | inventario
  actividad: "invernada", // invernada | cria
  categoriaId: "",
  categoriaNombre: "",
  operacion: "", // compra/cesion/traslado/venta/baja/...
  origen: "",
  destino: "",
  nCab: "",
  kgTotales: "",
  kgPorCab: "",
  precioTipo: "kg", // kg | cab
  precioUnitario: "", // $/kg o $/cab
  guias: "",
  flete: "",
  otros: "",
  importeTotal: "",
  observaciones: "",
};

// Campos mínimos por tipo (mapeo de tu planilla)
const FORM_LAYOUT = {
  entradas: ["fecha", "operacion", "categoriaId", "origen", "nCab", "kgTotales", "kgPorCab", "precioTipo", "precioUnitario", "guias", "flete", "otros", "importeTotal", "observaciones"],
  salidas:  ["fecha", "operacion", "categoriaId", "destino", "nCab", "kgTotales", "kgPorCab", "precioTipo", "precioUnitario", "guias", "flete", "otros", "importeTotal", "observaciones"],
  mortalidad: ["fecha", "categoriaId", "nCab", "observaciones"],
  nacimientos: ["fecha", "categoriaId", "nCab", "observaciones"],
  recuentos: ["fecha", "categoriaId", "nCab", "observaciones"],
  inventario: ["fecha", "categoriaId", "nCab", "kgTotales", "kgPorCab", "observaciones"],
};

function Field({ label, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function useCategorias(actividad) {
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    const actividadNormalizada = normalizeText(actividad);
    const qRef = actividad
      ? query(
          collection(db, "categorias"),
          where("actividad", "==", actividadNormalizada)
        )
      : collection(db, "categorias");
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        if (snap.empty) {
          setCategorias([]);
          console.log("Sin categorías registradas");
          setError(null);
          return;
        }
        const arr = snap.docs.map((d) => {
          const data = d.data();
          const actNorm = normalizeText(data.actividad);
          // Cualquier normalización necesaria debe realizarse en un script con permisos de escritura
          // evitando escrituras desde el cliente por restricciones de seguridad.
          return { id: d.id, ...data, actividad: actNorm };
        });
        // Ordenar alfabético por nombre
        arr.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        setCategorias(arr);
        setError(null);
      },
      (error) => {
        console.error(error);
        setError(error.message || "Error al cargar categorías");
      }
    );
    return () => unsub();
  }, [actividad]);
  return { categorias, error };
}

function useMovimientos(actividad) {
  const [movs, setMovs] = useState([]);
  useEffect(() => {
    const actividadNormalizada = normalizeText(actividad);
    const qRef = query(
      collection(db, "mov_ganaderia"),
      where("actividad", "==", actividadNormalizada),
      orderBy("fechaTs", "asc")
    );
    const unsub = onSnapshot(qRef, (snap) => {
      setMovs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [actividad]);
  return movs;
}

// Cálculo simple de EXISTENCIA MENSUAL a partir de inventario + movimientos
function useResumenMensual(movs) {
  // Resultado: por mes (YYYY-MM) => { cab: x, kg: y }
  return useMemo(() => {
    // Stock base por categoría (inventario más reciente anterior al mes)
    const byMonth = new Map(); // key: 'YYYY-MM' value: { cab, kg }
    const byCatStock = new Map(); // seguimiento por categoría

    const sorted = [...movs].sort((a, b) => (a.fechaTs?.toMillis?.() ?? 0) - (b.fechaTs?.toMillis?.() ?? 0));

    const applyChange = (catKey, cabDelta, kgDelta) => {
      const prev = byCatStock.get(catKey) || { cab: 0, kg: 0 };
      const next = { cab: prev.cab + cabDelta, kg: prev.kg + kgDelta };
      byCatStock.set(catKey, next);
      return next;
    };

    const monthKey = (d) => {
      const dt = d?.toDate?.() ?? new Date(d);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    };

    for (const m of sorted) {
      const key = monthKey(m.fechaTs);
      if (!byMonth.has(key)) byMonth.set(key, { cab: 0, kg: 0 });

      const catKey = m.categoriaId || m.categoriaNombre || "sin-cat";
      const nCab = Number(m.nCab || 0) || 0;
      const kgTot = Number(m.kgTotales || 0) || 0;

      if (m.tipo === "inventario") {
        // Setea estado base de esa categoría
        byCatStock.set(catKey, { cab: nCab, kg: kgTot });
      } else if (m.tipo === "entrada" || m.tipo === "nacimiento" || m.tipo === "recuento") {
        // entradas suman (en recuento tratamos como “corrección positiva”, si querés otra lógica se ajusta)
        applyChange(catKey, nCab, kgTot);
      } else if (m.tipo === "salida" || m.tipo === "mortalidad") {
        // salidas restan
        applyChange(catKey, -nCab, -kgTot);
      }

      // Acumular snapshot del mes (suma todas las categorías)
      // Para simplificar: sumamos las variaciones mes a mes sobre lo que venga
      const monthAgg = byMonth.get(key);
      // Para un EXISTENCIA estricta, habría que considerar saldo al cierre; aquí
      // generamos un agregado rápido por movimientos (se puede refinar si preferís stock fin de mes).
      if (m.tipo === "inventario") {
        monthAgg.cab += nCab;
        monthAgg.kg += kgTot;
      } else if (m.tipo === "entrada" || m.tipo === "nacimiento" || m.tipo === "recuento") {
        monthAgg.cab += nCab;
        monthAgg.kg += kgTot;
      } else if (m.tipo === "salida" || m.tipo === "mortalidad") {
        monthAgg.cab -= nCab;
        monthAgg.kg -= kgTot;
      }
      byMonth.set(key, monthAgg);
    }

    // Armar array ordenado
    const out = Array.from(byMonth.entries())
      .map(([mes, v]) => ({
        mes,
        cab: v.cab,
        kg: v.kg,
        kgPorCab: v.cab ? (v.kg / v.cab).toFixed(2) : "",
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
    return out;
  }, [movs]);
}

function MovimientoForm({ tipo, actividad, categorias, record, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...emptyMovimiento,
    actividad,
    tipo,
    ...(record || {}),
  }));

  useEffect(() => {
    setForm((f) => ({ ...f, actividad, tipo }));
  }, [actividad, tipo]);

  const catNombre = useMemo(() => {
    if (!form.categoriaId) return "";
    return categorias.find((c) => c.id === form.categoriaId)?.nombre || "";
  }, [form.categoriaId, categorias]);

  const save = async (e) => {
    e.preventDefault();
    const actividadNormalizada = normalizeText(form.actividad);
    const payload = {
      ...form,
      actividad: actividadNormalizada,
      nCab: Number(form.nCab || 0) || 0,
      kgTotales: Number(form.kgTotales || 0) || 0,
      kgPorCab: Number(form.kgPorCab || 0) || 0,
      precioUnitario: Number(form.precioUnitario || 0) || 0,
      flete: Number(form.flete || 0) || 0,
      otros: Number(form.otros || 0) || 0,
      importeTotal: Number(form.importeTotal || 0) || 0,
      categoriaNombre: catNombre,
      fechaTs: form.fecha ? new Date(form.fecha) : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (record?.id) {
      await updateDoc(doc(db, "mov_ganaderia", record.id), payload);
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, "mov_ganaderia"), payload);
    }
    onSaved?.();
  };

  const fields = FORM_LAYOUT[tipo];

  return (
    <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {fields.includes("fecha") && (
        <Field label="Fecha">
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            className="border rounded-xl p-2"
            required
          />
        </Field>
      )}

      {fields.includes("operacion") && (
        <Field label="Operación">
          <select
            value={form.operacion}
            onChange={(e) => setForm({ ...form, operacion: e.target.value })}
            className="border rounded-xl p-2"
            required
          >
            <option value="">Seleccionar...</option>
            {tipo === "entradas" && (
              <>
                <option value="compra">Compra</option>
                <option value="cesion">Cesión interna</option>
                <option value="traslado">Traslado</option>
              </>
            )}
            {tipo === "salidas" && (
              <>
                <option value="venta">Venta</option>
                <option value="baja">Baja</option>
                <option value="traslado">Traslado</option>
              </>
            )}
          </select>
        </Field>
      )}

      {fields.includes("categoriaId") && (
        <Field label="Categoría">
          <select
            value={form.categoriaId}
            onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
            className="border rounded-xl p-2"
            required
          >
            <option value="">Seleccionar...</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </Field>
      )}

      {fields.includes("origen") && (
        <Field label="Origen">
          <input className="border rounded-xl p-2" value={form.origen} onChange={(e)=>setForm({...form, origen: e.target.value})}/>
        </Field>
      )}
      {fields.includes("destino") && (
        <Field label="Destino">
          <input className="border rounded-xl p-2" value={form.destino} onChange={(e)=>setForm({...form, destino: e.target.value})}/>
        </Field>
      )}

      {fields.includes("nCab") && (
        <Field label="N° Cab">
          <input type="number" className="border rounded-xl p-2" value={form.nCab} onChange={(e)=>setForm({...form, nCab: e.target.value})} required/>
        </Field>
      )}

      {fields.includes("kgTotales") && (
        <Field label="Kgs Totales">
          <input type="number" className="border rounded-xl p-2" value={form.kgTotales} onChange={(e)=>setForm({...form, kgTotales: e.target.value})}/>
        </Field>
      )}

      {fields.includes("kgPorCab") && (
        <Field label="Kg/Cab">
          <input type="number" className="border rounded-xl p-2" value={form.kgPorCab} onChange={(e)=>setForm({...form, kgPorCab: e.target.value})}/>
        </Field>
      )}

      {fields.includes("precioTipo") && (
        <Field label="Precio como">
          <select
            className="border rounded-xl p-2"
            value={form.precioTipo}
            onChange={(e)=>setForm({...form, precioTipo: e.target.value})}
          >
            <option value="kg">$ / kg</option>
            <option value="cab">$ / Cab</option>
          </select>
        </Field>
      )}

      {fields.includes("precioUnitario") && (
        <Field label="Precio unitario">
          <input type="number" step="0.01" className="border rounded-xl p-2" value={form.precioUnitario} onChange={(e)=>setForm({...form, precioUnitario: e.target.value})}/>
        </Field>
      )}

      {fields.includes("guias") && (
        <Field label="Guías">
          <input className="border rounded-xl p-2" value={form.guias} onChange={(e)=>setForm({...form, guias: e.target.value})}/>
        </Field>
      )}

      {fields.includes("flete") && (
        <Field label="Flete">
          <input type="number" step="0.01" className="border rounded-xl p-2" value={form.flete} onChange={(e)=>setForm({...form, flete: e.target.value})}/>
        </Field>
      )}

      {fields.includes("otros") && (
        <Field label="Otros">
          <input type="number" step="0.01" className="border rounded-xl p-2" value={form.otros} onChange={(e)=>setForm({...form, otros: e.target.value})}/>
        </Field>
      )}

      {fields.includes("importeTotal") && (
        <Field label="Importe Total">
          <input type="number" step="0.01" className="border rounded-xl p-2" value={form.importeTotal} onChange={(e)=>setForm({...form, importeTotal: e.target.value})}/>
        </Field>
      )}

      {fields.includes("observaciones") && (
        <Field label="Observaciones" className="md:col-span-3">
          <input className="border rounded-xl p-2" value={form.observaciones} onChange={(e)=>setForm({...form, observaciones: e.target.value})}/>
        </Field>
      )}

      <div className="md:col-span-3 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-xl border">Cancelar</button>
        <button type="submit" className="px-4 py-2 rounded-xl bg-blue-700 text-white">Guardar</button>
      </div>
    </form>
  );
}

function MovimientosTabla({ rows, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl shadow p-2 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Fecha</th>
            <th className="p-2 text-left">Tipo</th>
            <th className="p-2 text-left">Categoría</th>
            <th className="p-2 text-right">N° Cab</th>
            <th className="p-2 text-right">Kg Totales</th>
            <th className="p-2 text-left">Operación</th>
            <th className="p-2 text-left">Origen/Dest.</th>
            <th className="p-2 text-right">$/Unit</th>
            <th className="p-2 text-right">Importe</th>
            <th className="p-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={10} className="text-center p-6">Sin registros</td></tr>
          ) : rows.map((r) => (
            <tr key={r.id} className="hover:bg-blue-50">
              <td className="p-2">{r.fecha?.slice?.(0,10) || (r.fechaTs?.toDate?.()?.toISOString?.()?.slice(0,10) ?? "")}</td>
              <td className="p-2 capitalize">{r.tipo}</td>
              <td className="p-2">{r.categoriaNombre || r.categoriaId}</td>
              <td className="p-2 text-right">{r.nCab ?? ""}</td>
              <td className="p-2 text-right">{r.kgTotales ?? ""}</td>
              <td className="p-2">{r.operacion || ""}</td>
              <td className="p-2">{r.destino || r.origen || ""}</td>
              <td className="p-2 text-right">{r.precioUnitario ? r.precioUnitario.toLocaleString() : ""}</td>
              <td className="p-2 text-right">{r.importeTotal ? r.importeTotal.toLocaleString() : ""}</td>
              <td className="p-2">
                <div className="flex gap-1 justify-center">
                  <button className="bg-amber-200 hover:bg-amber-300 rounded-xl p-1" onClick={()=>onEdit(r)}><Edit2 size={18}/></button>
                  <button className="bg-red-200 hover:bg-red-400 rounded-xl p-1" onClick={()=>onDelete(r)}><Trash2 size={18}/></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResumenMensualTabla({ resumen }) {
  return (
    <div className="bg-white rounded-2xl shadow p-2 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Mes</th>
            <th className="p-2 text-right">Cab.</th>
            <th className="p-2 text-right">Kg</th>
            <th className="p-2 text-right">Kg/Cab</th>
          </tr>
        </thead>
        <tbody>
          {resumen.length === 0 ? (
            <tr><td colSpan={4} className="text-center p-6">Sin datos</td></tr>
          ) : resumen.map((r)=>(
            <tr key={r.mes} className="hover:bg-blue-50">
              <td className="p-2">{r.mes}</td>
              <td className="p-2 text-right">{r.cab}</td>
              <td className="p-2 text-right">{r.kg}</td>
              <td className="p-2 text-right">{r.kgPorCab}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Ganaderia() {
  const [actividad, setActividad] = useState("invernada"); // invernada | cria
  const [tab, setTab] = useState("entradas");
  const { categorias, error: categoriasError } = useCategorias(actividad);
  const movimientos = useMovimientos(actividad);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const listado = useMemo(() => {
    // filtrar por tipo según tab
    const tipoMap = {
      entradas: "entrada",
      salidas: "salida",
      mortalidad: "mortalidad",
      nacimientos: "nacimiento",
      recuentos: "recuento",
      inventario: "inventario",
    };
    const t = tipoMap[tab] || "entrada";
    return movimientos.filter((m) => m.tipo === t);
  }, [movimientos, tab]);

  const resumen = useResumenMensual(movimientos);

  const abrirNuevo = () => {
    setEditing(null);
    setShowForm(true);
  };

  const editar = (r) => {
    // adaptar tipo tab->tipo mov
    setEditing({ ...r });
    setShowForm(true);
  };

  const eliminar = async (r) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    await deleteDoc(doc(db, "mov_ganaderia", r.id));
  };

  const tipoFromTab = (tabKey) => {
    const map = {
      entradas: "entradas",
      salidas: "salidas",
      mortalidad: "mortalidad",
      nacimientos: "nacimientos",
      recuentos: "recuentos",
      inventario: "inventario",
    };
    return map[tabKey] || "entradas";
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold">Ganadería</h2>
        <div className="flex gap-2">
          <select
            className="border rounded-xl p-2"
            value={actividad}
            onChange={(e) => setActividad(e.target.value)}
            title="Actividad"
          >
            {ACTIVIDADES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          {tab !== "resumen" && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow"
              onClick={abrirNuevo}
            >
              <Plus size={18} /> Nuevo
            </button>
          )}
        </div>
      </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`px-3 py-1 rounded-2xl border ${tab===t.key ? "bg-blue-600 text-white border-blue-600" : "bg-white"}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {categoriasError && (
          <div className="mb-4 p-2 rounded bg-red-100 text-red-800">
            Error cargando categorías: {categoriasError}
          </div>
        )}

        {categorias.length === 0 && !categoriasError && (
          <div className="mb-4 p-2 rounded bg-yellow-100 text-yellow-800">
            Sin categorías registradas
          </div>
        )}

        {tab === "resumen" ? (
          <ResumenMensualTabla resumen={resumen} />
        ) : (
        <>
          {showForm && (
            <div className="bg-white rounded-2xl shadow p-4 mb-4">
              <MovimientoForm
                tipo={tipoFromTab(tab)}
                actividad={actividad}
                categorias={categorias}
                record={editing}
                onCancel={() => { setShowForm(false); setEditing(null); }}
                onSaved={() => { setShowForm(false); setEditing(null); }}
              />
            </div>
          )}

          <MovimientosTabla rows={listado} onEdit={editar} onDelete={eliminar} />
        </>
      )}
    </div>
  );
}

