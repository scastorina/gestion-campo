// Ajusta estos valores con tu propio proyecto Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyAsjMYndgto8apKjasCtD7Hsblw5f6DV8c",
  authDomain: "stock-pomco.firebaseapp.com",
  projectId: "stock-pomco",
  storageBucket: "stock-pomco.appspot.com", // Corrige esto si hacía falta
  messagingSenderId: "414907870481",
  appId: "1:414907870481:web:44e87ec74ffb8ad86cb0b0",
  measurementId: "G-K1K1L47NG8"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
export { app };
