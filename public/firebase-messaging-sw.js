import dotenv from "dotenv";

dotenv.config();

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

const API = process.env.FIREBASE_API_KEY;

firebase.initializeApp({
  apiKey: API,
  authDomain: "hotelma-pms.firebaseapp.com",
  projectId: "hotelma-pms",
  messagingSenderId: "482844507448",
  appId: "1:482844507448:web:f3d1ff1aa0c6f34fe215cd",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  const link = payload.data?.link || "/";

  self.registration.showNotification(title || "Luis Pool", {
    body,
    data: { link },
  });
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const link = event.notification.data?.link || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(link)) return client.focus();
      }
      return clients.openWindow(link);
    })
  );
});
