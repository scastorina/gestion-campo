export const Switch = ({ checked, onChange }) => {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <span className="mr-2 text-sm">{checked ? "Activo" : "Inactivo"}</span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
      <div className="w-11 h-6 bg-gray-300 rounded-full shadow-inner">
        <div
          className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
            checked ? "translate-x-full" : "translate-x-0"
          }`}
        />
      </div>
    </label>
  );
};