// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyCC4xyp4HniwI46YFJoWf-BgjyhtDia18o",
    authDomain: "interactive-poster-dad2f.firebaseapp.com",
    projectId: "interactive-poster-dad2f",
    storageBucket: "interactive-poster-dad2f.appspot.com",
    messagingSenderId: "759472690939",
    appId: "1:759472690939:web:c837fba2dbad00a208025e"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
