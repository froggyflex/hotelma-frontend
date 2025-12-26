import { getMessaging, getToken } from "firebase/messaging";
import { getFirebaseApp } from "./firebase";

export async function getFcmToken() {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const messaging = getMessaging(getFirebaseApp());

  return await getToken(messaging, {
    vapidKey: "BD7ZC3v4bY32ad20oPY9WP9mrIfGUvhiVv5ZwfrDXguDAIP3O-nZs4P0hK5rr2-hzTP8FCcjR2BKZbgaRGlL5CU",
  });
}
