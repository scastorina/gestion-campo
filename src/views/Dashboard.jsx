import React from "react";

function Dashboard({ usuario }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm flex flex-col">
          <div className="text-lg font-semibold mb-3">Tendencias</div>
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="w-full h-28 bg-blue-50 rounded mb-2" />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-400 rounded-full inline-block" />
                <span>Phytón</span>
                <span className="ml-auto font-bold text-green-500">+517</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-pink-500 rounded-full inline-block" />
                <span>FlyThemes</span>
                <span className="ml-auto font-bold text-red-500">+5300</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                <span>AirApp</span>
                <span className="ml-auto font-bold text-red-500">+6700</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm flex flex-col">
          <div className="text-lg font-semibold mb-3">Actividad</div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="bg-blue-100 text-blue-800 rounded px-2 py-1 flex-1 text-center">
                Delivered <span className="font-semibold">5</span>
              </div>
              <div className="bg-pink-100 text-pink-800 rounded px-2 py-1 flex-1 text-center">
                Ordered <span className="font-semibold">7</span>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="bg-gray-100 text-gray-800 rounded px-2 py-1 flex-1 text-center">
                Reported <span className="font-semibold">2</span>
              </div>
              <div className="bg-green-100 text-green-800 rounded px-2 py-1 flex-1 text-center">
                Arrived <span className="font-semibold">3</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm flex flex-col">
          <div className="text-lg font-semibold mb-3">Novedades</div>
          <div className="flex items-center gap-4">
            <img
              src="https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=facearea&w=96&q=80"
              alt="VR"
              className="rounded-lg w-20 h-20 object-cover"
            />
            <div>
              <div className="font-bold mb-1">Nueva Funcionalidad</div>
              <div className="text-xs text-gray-500 mb-2">
                Ahora puedes gestionar tareas y notificaciones en tiempo real.
              </div>
              <button className="text-xs text-blue-600 hover:underline">
                Leer más
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
          <div className="text-sm text-gray-500 mb-2">Ingresos personales</div>
          <div className="text-2xl font-bold text-green-600">$21,500</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
          <div className="text-sm text-gray-500 mb-2">Órdenes semanales</div>
          <div className="text-2xl font-bold text-blue-600">+1,800</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
          <div className="text-sm text-gray-500 mb-2">Reportes</div>
          <div className="text-2xl font-bold text-pink-600">27,49%</div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
