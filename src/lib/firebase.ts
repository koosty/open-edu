import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { env } from "$env/dynamic/public";

const firebaseConfig = {
  apiKey: env.PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: env.PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket:
    env.PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: env.PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
  measurementId: env.PUBLIC_FIREBASE_MEASUREMENT_ID || "G-ABCDEF1234",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
