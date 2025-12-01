
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from 'firebase/functions';

// Original and CORRECT Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDyxlPN9amk1Z1YLkATGB44KFERvKgHzws",
  authDomain: "turnos-rotativos-app.firebaseapp.com",
  projectId: "turnos-rotativos-app",
  storageBucket: "turnos-rotativos-app.firebasestorage.app",
  messagingSenderId: "833942827283",
  appId: "1:833942827283:web:91c3da37e96f7193dc6ae6",
  measurementId: "G-WK8DRGZHFS"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
