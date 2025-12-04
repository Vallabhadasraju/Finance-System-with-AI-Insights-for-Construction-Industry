// Firebase configuration template
// Replace these placeholder values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services and make them globally available
const auth = firebase.auth();
const db = firebase.firestore();

console.log('Firebase initialized successfully');
console.log('Auth object:', auth);
console.log('Firestore object:', db);
