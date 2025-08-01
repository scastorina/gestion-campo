
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "./config";

const db = getFirestore(app);

export async function getUserProfile(uid) {
  const docRef = doc(db, "usuarios", uid);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}
