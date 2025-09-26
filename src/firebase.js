import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDaV7FKGp-PoIsozEYkiWouK9V9ydKdC60",
  authDomain: "crypto-price-predictor-67398.firebaseapp.com",
  projectId: "crypto-price-predictor-67398",
  storageBucket: "crypto-price-predictor-67398.firebasestorage.app",
  messagingSenderId: "671452740913",
  appId: "1:671452740913:web:4c3ac6467c395f7f1f4410"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
