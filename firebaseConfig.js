// 初始化 Firebase
var firebaseConfig = {
  apiKey: "AIzaSyCC4xyp4HniwI46YFJoWf-BgjyhtDia18o",
  authDomain: "interactive-poster-dad2f.firebaseapp.com",
  projectId: "interactive-poster-dad2f",
  storageBucket: "interactive-poster-dad2f.appspot.com",
  messagingSenderId: "759472690939",
  appId: "1:759472690939:web:c837fba2dbad00a208025e"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
