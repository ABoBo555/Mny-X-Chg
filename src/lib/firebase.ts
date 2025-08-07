// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Your web app's Firebase configuration

const firebaseConfig = {
  apiKey: "Your-Google-API-Key", //replace your api key here
  authDomain: "expense-tracker-732dd.firebaseapp.com",
  projectId: "expense-tracker-732dd",
  storageBucket: "expense-tracker-732dd.appspot.com",
  messagingSenderId: "593240539024",
  appId: "1:593240539024:web:7c64f48b5f234e3c6cfd15"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Check if we are running in the local development environment
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // Point to the local Firestore emulator
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to local Firestore emulator');
  } catch (error) {
    console.error('Error connecting to Firestore emulator:', error);
  }
}

export { db };
