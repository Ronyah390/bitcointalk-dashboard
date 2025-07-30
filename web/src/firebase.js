import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCv5xSMUSt5zu2MKS6AuA-fq2eP7wAXlcA",
  authDomain: "bitcointalk-dashboard-b657b.firebaseapp.com",
  projectId: "bitcointalk-dashboard-b657b",
  storageBucket: "bitcointalk-dashboard-b657b.firebasestorage.app",
  messagingSenderId: "1022590204810",
  appId: "1:1022590204810:web:7088772f9ece555e78a673"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
