import { db } from "./config";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { auth } from "./config";
import { sendPasswordResetEmail } from "firebase/auth";

export const getUsers = async () => {
  const usersRef = collection(db, "usuarios");
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const toggleUserStatus = async (uid, newStatus) => {
  const userRef = doc(db, "usuarios", uid);
  await updateDoc(userRef, { activo: newStatus });
};

export const updateUserRoles = async (uid, roles) => {
  const userRef = doc(db, "usuarios", uid);
  await updateDoc(userRef, { roles });
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};