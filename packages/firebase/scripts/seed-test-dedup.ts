import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

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

const email = "test-cc-dedup-2026@commandcenter.ph";
const password = "TestCC2026!";

async function seed() {
  console.log(`Ensuring test Command Center account (${email}) exists...`);
  let user;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    user = userCredential.user;
    console.log("Created auth user credential. Creating Firestore commandCenter profile...");
    
    await setDoc(doc(db, 'commandCenters', user.uid), {
      email,
      name: 'Test Command Center',
      location: 'Tuguegarao City',
      createdAt: serverTimestamp(),
    });
    console.log("Firestore profile created successfully!");
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("Account already exists. Signing in instead...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      console.log("Successfully signed in!");
    } else {
      throw error;
    }
  }

  console.log("Seeding test active incident...");
  
  // 1. Add active master incident (Medical Emergency)
  const incidentRef = await addDoc(collection(db, "incidents"), {
    referenceNumber: "INC-TEST-001",
    status: "awaiting_resources",
    resolutionStatus: "open",
    source: "call",
    incidentSubtypeId: "medical_emergency",
    incidentSubtypeLabel: "Medical Emergency",
    description: "Citizen reported cardiac arrest on Taft Street.",
    locationText: "Taft St, Tuguegarao, Cagayan",
    landmark: "Near City High School",
    quadrant: "NW",
    latitude: 17.613000,
    longitude: 121.730000,
    callerName: "Juan Dela Cruz",
    callerContact: "09171234567",
    teamOnDuty: "Whiskey",
    incidentDate: "2026-05-19",
    incidentTime: "08:30 AM",
    associatedReportIds: [],
    createdByUserId: user.uid,
    commandCenterAdminId: user.uid,
    createdAt: Timestamp.now()
  });
  console.log("Created master incident with ID:", incidentRef.id);

  // 2. Add pending emergency report (within 80 meters, same time)
  const reportRef = await addDoc(collection(db, "emergencies"), {
    userId: user.uid,
    incidentType: "medical",
    locationText: "Taft Street close to high school",
    landmark: "High School Entrance",
    description: "Elderly man collapsed, chest pain, conscious but weak.",
    latitude: 17.613500, // ~55m away
    longitude: 121.730300,
    status: "pending",
    imageUrl: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=400&q=80", // Real sample picture
    createdAt: Timestamp.now(),
    viewedByName: null,
    incidentId: null
  });
  console.log("Created citizen report with ID:", reportRef.id);
  console.log("Seed successful! Master Incident ID:", incidentRef.id, "Emergency Report ID:", reportRef.id);
  
  console.log("\n*** TESTING INSTRUCTIONS ***");
  console.log("1. Open the Dispatcher Web App (http://localhost:3000)");
  console.log(`2. Log in with the account we just created:`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log("3. Click on 'Intake' or go to the Triage Triage list");
  console.log(`4. Select the citizen report APP-${reportRef.id.slice(-6).toUpperCase()}`);
  console.log("5. You will see the beautiful 'Potential Duplicate Detected' warning banner suggesting INC-TEST-001");
  console.log("6. Click the 'Link' button to connect it!");
}

seed().catch(console.error);
