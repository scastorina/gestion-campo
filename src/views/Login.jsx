import React, { useState, useContext } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import bcrypt from "bcryptjs";

function isEmail(input) {
  return /\S+@\S+\.\S+/.test(input);
}

function Login() {
  const [input, setInput] = useState(""); // email o usuario
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isEmail(input)) {
      // Login con Firebase Auth
      try {
        await signInWithEmailAndPassword(auth, input, password);
      } catch (err) {
        setError("Error de autenticación: " + err.message);
      }
    } else {
      // Login por usuario y contraseña en Firestore (con hash)
      try {
        const q = query(
          collection(db, "usuarios"),
          where("usuario", "==", input)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          setError("Usuario no encontrado.");
          return;
        }
        const data = snap.docs[0].data();

        if (!data.passwordHash) {
          setError("El usuario no tiene contraseña configurada.");
          return;
        }

        const esValida = await bcrypt.compare(password, data.passwordHash);
        if (!esValida) {
          setError("Contraseña incorrecta.");
          return;
        }

        // Guarda en localStorage para simular sesión manual
        localStorage.setItem("usuarioManual", JSON.stringify({
          id: snap.docs[0].id,
          usuario: data.usuario,
          nombre: data.nombre,
          rol: data.rol,
          areas: data.areas || []
        }));

        navigate("/dashboard");
        window.location.reload();
      } catch (err) {
        setError("Error de autenticación: " + err.message);
      }
    }
  };

  React.useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div style={{ maxWidth: 320, margin: "80px auto", padding: 24, border: "1px solid #eee", borderRadius: 12, boxShadow: "0 2px 8px #eee" }}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Email o usuario"
          required
          style={{ width: "100%", marginBottom: 8, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          style={{ width: "100%", marginBottom: 8, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
        />
        <button type="submit" style={{ width: "100%", padding: 10, borderRadius: 4, background: "#1e88e5", color: "#fff", border: "none" }}>
          Ingresar
        </button>
      </form>
      {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}
    </div>
  );
}

export default Login;
