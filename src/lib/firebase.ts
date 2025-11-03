
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseOptions, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBJBOcdho7vmYmRJL86ZlJatOK04q-depU",
  authDomain: "banai-tracker.firebaseapp.com",
  databaseURL: "https://banai-tracker-default-rtdb.firebaseio.com",
  projectId: "banai-tracker",
  storageBucket: "banai-tracker.appspot.com",
  messagingSenderId: "653013923294",
  appId: "1:653013923294:web:d91928fd17ff5f1c75594f"
};


// Initialize Firebase
let app: FirebaseApp;
let db: Database;


app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
db = getDatabase(app);


export { app, db };
