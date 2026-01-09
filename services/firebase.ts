import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * Firebase configuration for ProfSummarizer.
 * Using provided credentials for project: gen-lang-client-0493936364
 */
const firebaseConfig = {
  apiKey: "AIzaSyDjLSC3OCZRTTqMdHsFu6vDntPB0pBcPm0",
  authDomain: "gen-lang-client-0493936364.firebaseapp.com",
  projectId: "gen-lang-client-0493936364",
  storageBucket: "gen-lang-client-0493936364.firebasestorage.app",
  messagingSenderId: "986740138980",
  appId: "1:986740138980:web:2459a956b885f201775df1",
  measurementId: "G-RPH97F1E6P"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Export service instances
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;