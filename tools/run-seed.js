/**
 * Simple Node.js script to seed Firestore with dummy data
 * Run with: node tools/run-seed.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, Timestamp } = require('firebase/firestore');
const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration missing. Please check your .env.local file.');
  console.error('Required variables: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Firebase Admin (for creating Auth users)
let adminApp;
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  console.warn('WARNING: Firebase Admin SDK not configured. Skipping Auth user creation.');
  adminApp = null;
}

async function createAuthUser(user) {
  if (!adminApp) {
    console.log(`WARNING: Skipping Auth creation for ${user.email}`);
    return user.uid;
  }
  try {
    try {
      const existing = await admin.auth().getUserByEmail(user.email);
      console.log(`INFO: User ${user.email} already exists in Firebase Auth`);
      return existing.uid;
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
    }
    const userRecord = await admin.auth().createUser({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      password: 'password',
      emailVerified: true,
    });
    console.log(`Created Firebase Auth user: ${user.email}`);
    return userRecord.uid;
  } catch (err) {
    console.error(`Failed to create Auth user ${user.email}:`, err.message || err);
    return user.uid;
  }
}

// Users to seed (exactly four)
const users = [
  {
    id: 'admin',
    uid: 'admin',
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'admin',
    isActive: true,
    isVerified: true,
    createdAt: new Date(),
    lastLoginAt: new Date()
  },
  {
    id: 'patient1',
    uid: 'patient1',
    email: 'patient@example.com',
    displayName: 'Sunita Devi',
    role: 'patient',
    isActive: true,
    isVerified: true,
    createdAt: new Date(),
    lastLoginAt: new Date()
  },
  {
    id: 'doctor1',
    uid: 'doctor1',
    email: 'doctor@example.com',
    displayName: 'Dr. Rajesh Kumar',
    role: 'doctor',
    isActive: true,
    isVerified: true,
    createdAt: new Date(),
    lastLoginAt: new Date()
  },
  {
    id: 'pharmacy1',
    uid: 'pharmacy1',
    email: 'pharmacy@example.com',
    displayName: 'MedPlus Pharmacy',
    role: 'pharmacyOwner',
    isActive: true,
    isVerified: true,
    createdAt: new Date(),
    lastLoginAt: new Date()
  }
];

const medicines = [
  {
    id: 'medicine1',
    name: 'Paracetamol 500mg',
    category: 'Pain Relief',
    manufacturer: 'GSK Pharmaceuticals',
    requiresPrescription: false
  },
  {
    id: 'medicine2',
    name: 'Amoxicillin 250mg',
    category: 'Antibiotic',
    manufacturer: 'Cipla Ltd',
    requiresPrescription: true
  }
];

const appointments = [
  {
    id: 'appointment1',
    patientId: 'patient1',
    doctorId: 'doctor1',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    duration: 30,
    type: 'video',
    status: 'scheduled',
    reasonForVisit: 'Follow-up checkup',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const healthRecords = [
  {
    id: 'record1',
    patientId: 'patient1',
    type: 'lab-report',
    title: 'Blood Test Report',
    description: 'Complete Blood Count',
    uploadedAt: new Date(),
    recordDate: new Date(),
    isShared: false,
    sharedWith: [],
    tags: ['blood-test']
  }
];

async function seedData() {
  console.log('Starting data seeding...');

  try {
    // Seed users
    console.log('Seeding users...');
    for (const user of users) {
      const authUid = await createAuthUser(user);
      await setDoc(doc(db, 'users', authUid), {
        ...user,
        uid: authUid,
        createdAt: Timestamp.fromDate(user.createdAt),
        lastLoginAt: Timestamp.fromDate(user.lastLoginAt)
      });
      console.log(`Added user: ${user.displayName}`);
    }

    // Seed medicines
    console.log('Seeding medicines...');
    for (const medicine of medicines) {
      await setDoc(doc(db, 'medicines', medicine.id), medicine);
      console.log(`Added medicine: ${medicine.name}`);
    }

    // Seed appointments
    console.log('Seeding appointments...');
    for (const appointment of appointments) {
      await setDoc(doc(db, 'appointments', appointment.id), {
        ...appointment,
        scheduledAt: Timestamp.fromDate(appointment.scheduledAt),
        createdAt: Timestamp.fromDate(appointment.createdAt),
        updatedAt: Timestamp.fromDate(appointment.updatedAt)
      });
      console.log(`Added appointment: ${appointment.id}`);
    }

    // Seed health records
    console.log('Seeding health records...');
    for (const record of healthRecords) {
      await setDoc(doc(db, 'healthRecords', record.id), {
        ...record,
        uploadedAt: Timestamp.fromDate(record.uploadedAt),
        recordDate: Timestamp.fromDate(record.recordDate)
      });
      console.log(`Added health record: ${record.title}`);
    }

    console.log('Data seeding completed successfully!');
    console.log('Summary:');
    console.log(`  - ${users.length} users`);
    console.log(`  - ${medicines.length} medicines`);
    console.log(`  - ${appointments.length} appointments`);
    console.log(`  - ${healthRecords.length} health records`);

  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// Run the seeding
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('Seeding completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
