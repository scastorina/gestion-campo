import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "./config";

const messaging = getMessaging(app);

// Pide permiso, obtiene token y lo devuelve (o null si usuario no acepta)
export const solicitarPermisoPush = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey: "BILH9P_ca-dz-NRl35rUGRAYq35cZQR6ldUIeOjZGVfIqhTIzXaJiZmEtHt5vYRz9Ziox6r-4xbSLsudESoeIKQ"
    });
    if (token) {
      return token;
    }
    return null;
  } catch (error) {
    console.error("Error obteniendo token FCM:", error);
    return null;
  }
};

// Listener para notificaciones en primer plano
export const onMensaje = (callback) => {
  onMessage(messaging, callback);
};
