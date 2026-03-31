import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use a fallback for databaseId if not provided
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, databaseId === '(default)' ? undefined : databaseId);

export const auth = getAuth(app);

// Validate connection to Firestore
async function testConnection() {
  // Wait a bit for the SDK to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  try {
    console.log(`Testing connection to Firestore database: ${databaseId}`);
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error) {
    console.error("Firestore connection test failed:", error);
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.error("Please check your Firebase configuration and network connection. Long polling is enabled.");
    }
  }
}
testConnection();
