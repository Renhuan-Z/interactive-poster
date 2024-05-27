import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCC4xyp4HniwI46YFJoWf-BgjyhtDia18o",
  authDomain: "interactive-poster-dad2f.firebaseapp.com",
  projectId: "interactive-poster-dad2f",
  storageBucket: "interactive-poster-dad2f.appspot.com",
  messagingSenderId: "759472690939",
  appId: "1:759472690939:web:ad38fb62a9f1908a08025e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
