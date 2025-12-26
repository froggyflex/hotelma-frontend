import dotenv from "dotenv";

dotenv.config();

import { initializeApp } from "firebase/app";
const API = process.env.FIREBASE_API_KEY;

const firebaseConfig = {
  apiKey: API,
  authDomain: "hotelma-pms.firebaseapp.com",
  projectId: "hotelma-pms",
  storageBucket: "hotelma-pms.firebasestorage.app",
  messagingSenderId: "482844507448",
  appId: "1:482844507448:web:f3d1ff1aa0c6f34fe215cd",
};

let app = null;

export function getFirebaseApp() {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}
