import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"
import { getAnalytics } from "firebase/firestore";

const firebaseConfig = {
  firebaseConfig = {
  apiKey: "AIzaSyA4tVBL8uT1TG6Ro6jxxXTEyk7i35thDd4",
  authDomain: "btc-predictor-6a9d9.firebaseapp.com",
  projectId: "btc-predictor-6a9d9",
  storageBucket: "btc-predictor-6a9d9.firebasestorage.app",
  messagingSenderId: "261649645889",
  appId: "1:261649645889:web:a24d3b38675fd924fd21c0",
  measurementId: "G-892EBKT0ZJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
