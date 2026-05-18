import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCWLfP5vbHiFTiDQCG3YVxKu8iehstmo0g",
  authDomain: "city-rescue-dispatch.firebaseapp.com",
  projectId: "city-rescue-dispatch",
  storageBucket: "city-rescue-dispatch.firebasestorage.app",
  messagingSenderId: "665229808010",
  appId: "1:665229808010:web:4f51791af88672b027f873"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const email = "command@rescue.ph";
const password = "command123";

async function clearDatabase() {
  console.log(`Authenticating as Command Center (${email})...`);
  await signInWithEmailAndPassword(auth, email, password);
  console.log("Successfully authenticated!");

  // 1. Clear incidents
  console.log("Fetching all master incidents...");
  const incidentsSnapshot = await getDocs(collection(db, "incidents"));
  console.log(`Found ${incidentsSnapshot.size} incidents. Deleting...`);
  
  const incidentDeletes = incidentsSnapshot.docs.map(docSnap => {
    console.log(`Deleting incident: ${docSnap.id} (${docSnap.data().referenceNumber})`);
    return deleteDoc(doc(db, "incidents", docSnap.id));
  });
  await Promise.all(incidentDeletes);
  console.log("All incidents deleted successfully!");

  // 2. Clear emergencies
  console.log("\nFetching all emergencies...");
  const emergenciesSnapshot = await getDocs(collection(db, "emergencies"));
  console.log(`Found ${emergenciesSnapshot.size} emergencies. Deleting...`);

  const emergencyDeletes = emergenciesSnapshot.docs.map(docSnap => {
    console.log(`Deleting emergency report: ${docSnap.id}`);
    return deleteDoc(doc(db, "emergencies", docSnap.id));
  });
  await Promise.all(emergencyDeletes);
  console.log("All emergencies deleted successfully!");

  console.log("\n✨ Clean slate! All master incidents and civilian reports cleared. All user/dispatcher profiles were kept untouched.");
}

clearDatabase().catch(console.error);
