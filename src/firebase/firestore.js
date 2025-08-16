
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { app } from "./config";

const db = getFirestore(app);

export async function getUserProfile(uid) {
  const docRef = doc(db, "usuarios", uid);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

// Generic helpers -----------------------------------------------------------

async function getCollectionItems(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function saveCollectionItem(name, data, id) {
  if (id) {
    await updateDoc(doc(db, name, id), data);
    return id;
  }
  const ref = await addDoc(collection(db, name), data);
  return ref.id;
}

// Domain specific helpers ---------------------------------------------------

export const getCostCenters = () => getCollectionItems("centros_costo");
export const getTasks = () => getCollectionItems("tareas");

export const saveCostCenter = (data, id) =>
  saveCollectionItem("centros_costo", data, id);
export const saveTask = (data, id) => saveCollectionItem("tareas", data, id);

