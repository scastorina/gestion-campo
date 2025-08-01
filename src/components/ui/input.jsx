export const Input = ({ value, onChange, placeholder }) => {
  return (
    <input
      className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
};