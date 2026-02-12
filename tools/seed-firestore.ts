import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import type {
  PatientProfile,
  DoctorProfile,
  PharmacyProfile,
  Appointment,
  Medicine,
  InventoryItem,
  HealthRecord,
  ChatSession,
  ChatMessage
} from '../src/types';

// Load environment variables (in Node.js environment)
if (typeof window === 'undefined') {
  require('dotenv').config({ path: '.env.local' });
}

// Initialize Firebase with environment config
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
  process.exit(1);
}

// Initialize Firebase client app
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Firebase Admin app for user creation
let adminApp;
if (getAdminApps().length === 0) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    adminApp = initializeAdminApp({
      credential: cert(serviceAccount)
    });
  } catch (error) {
    console.warn('WARNING: Firebase Admin SDK not configured. Will create Firestore profiles only.');
    console.warn('To create actual Firebase Auth users, set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local');
    adminApp = null;
  }
} else {
  adminApp = getAdminApps()[0];
}

const adminAuth = adminApp ? getAdminAuth(adminApp) : null;
const adminDb = adminApp ? getAdminFirestore(adminApp) : null;

// Helper function to create Firebase Auth user
async function createAuthUser(userData: any) {
  if (!adminAuth) {
    console.log(`  WARNING: Skipping Firebase Auth user creation for ${userData.email} (Admin SDK not configured)`);
    return userData.uid;
  }

  try {
    // Check if user already exists
    try {
      const existingUser = await adminAuth.getUserByEmail(userData.email);
      console.log(`INFO: User ${userData.email} already exists in Firebase Auth`);
      return existingUser.uid;
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create new user
    const userRecord = await adminAuth.createUser({
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      password: 'password', // Default password
      emailVerified: userData.isVerified || false,
    });

    console.log(`Created Firebase Auth user: ${userData.email}`);
    return userRecord.uid;
  } catch (error) {
    console.error(`Failed to create Firebase Auth user ${userData.email}:`, error);
    return userData.uid; // Continue with original UID even if Auth creation fails
  }
}

// Sample data
const samplePatients: Omit<PatientProfile, 'id'>[] = [
  {
    uid: 'patient1',
    email: 'patient@example.com',
    displayName: 'Sunita Devi',
    role: 'patient',
    createdAt: new Date('2024-01-14'),
    lastLoginAt: new Date('2024-01-20'),
    isActive: true,
    isVerified: true,
    dateOfBirth: new Date('1979-03-15'),
    gender: 'female',
    bloodGroup: 'O+',
    phone: '+91 9999900001', // Dummy phone number
    address: {
      street: '123 Main Street',
      city: 'Nabha',
      state: 'Punjab',
      pincode: '147201',
      country: 'India'
    },
    emergencyContact: {
      name: 'Rajesh Devi',
      phone: '+91 9999900002', // Dummy emergency contact
      relationship: 'Husband'
    },
    medicalHistory: ['Diabetes Type 2', 'Hypertension'],
    allergies: ['Penicillin'],
    abhaNumber: '12-3456-7890-1234'
  }
];

const sampleDoctors: Omit<DoctorProfile, 'id'>[] = [
  {
    uid: 'doctor1',
    email: 'doctor@example.com',
    displayName: 'Dr. Rajesh Kumar',
    role: 'doctor',
    createdAt: new Date('2024-01-15'),
    lastLoginAt: new Date('2024-01-20'),
    isActive: true,
    isVerified: true,
    registrationNumber: 'MCI-12345',
    specialization: ['General Medicine', 'Internal Medicine'],
    qualifications: ['MBBS', 'MD Internal Medicine'],
    experience: 15,
    consultationFee: 500,
    availableSlots: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDuration: 30 }
    ],
    rating: 4.8,
    totalConsultations: 234,
    languages: ['English', 'Hindi', 'Punjabi'],
    clinicAddress: {
      name: 'Kumar Medical Center',
      street: '101 Hospital Road',
      city: 'Nabha',
      state: 'Punjab',
      pincode: '147201'
    }
  }
];

const samplePharmacies: Omit<PharmacyProfile, 'id'>[] = [
  {
    uid: 'pharmacy1',
    email: 'pharmacy@example.com',
    displayName: 'MedPlus Pharmacy',
    role: 'pharmacyOwner',
    createdAt: new Date('2024-01-13'),
    lastLoginAt: new Date('2024-01-19'),
    isActive: true,
    isVerified: true,
    pharmacyName: 'MedPlus Pharmacy',
    licenseNumber: 'PB-PHARM-2024-001',
    gstNumber: '03ABCDE1234F1Z5',
    address: {
      street: '123 Market Street',
      city: 'Nabha',
      state: 'Punjab',
      pincode: '147201',
      coordinates: {
        latitude: 30.3752,
        longitude: 76.1495
      }
    },
    operatingHours: [
      { dayOfWeek: 0, isOpen: true, openTime: '09:00', closeTime: '21:00' },
      { dayOfWeek: 1, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 2, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 3, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 4, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 5, isOpen: true, openTime: '08:00', closeTime: '22:00' },
      { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '21:00' }
    ],
    contactNumber: '+91 9999900010', // Dummy pharmacy contact
    servicesOffered: ['Prescription Dispensing', 'OTC Medicines', 'Health Checkup', 'Medicine Delivery']
  }
];

// Admin user (untyped to keep flexibility)
const sampleAdmins: any[] = [
  {
    uid: 'admin',
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'admin',
    isActive: true,
    isVerified: true,
    createdAt: new Date('2024-01-10'),
    lastLoginAt: new Date('2024-01-10')
  }
];

const sampleMedicines: Omit<Medicine, 'id'>[] = [
  {
    name: 'Paracetamol 500mg',
    genericName: 'Paracetamol',
    brand: 'Crocin',
    category: 'Pain Relief',
    strength: '500mg',
    form: 'tablet',
    manufacturer: 'GSK Pharmaceuticals',
    description: 'Fever and pain relief medication',
    sideEffects: ['Nausea', 'Vomiting', 'Stomach pain'],
    dosageInstructions: 'Take 1-2 tablets every 4-6 hours as needed. Maximum 8 tablets in 24 hours.',
    contraindications: ['Severe liver disease', 'Allergy to paracetamol'],
    requiresPrescription: false
  },
  {
    name: 'Amoxicillin 250mg',
    genericName: 'Amoxicillin',
    brand: 'Amoxil',
    category: 'Antibiotic',
    strength: '250mg',
    form: 'capsule',
    manufacturer: 'Cipla Ltd',
    description: 'Broad-spectrum antibiotic for bacterial infections',
    sideEffects: ['Diarrhea', 'Nausea', 'Skin rash'],
    dosageInstructions: 'Take as prescribed by doctor, usually every 8 hours',
    contraindications: ['Allergy to penicillin', 'History of liver problems'],
    requiresPrescription: true
  },
  {
    name: 'Insulin Injection',
    genericName: 'Human Insulin',
    brand: 'Humulin',
    category: 'Diabetes',
    strength: '100 units/mL',
    form: 'injection',
    manufacturer: 'Eli Lilly',
    description: 'Injectable insulin for diabetes management',
    sideEffects: ['Low blood sugar', 'Injection site reactions'],
    dosageInstructions: 'Inject subcutaneously as prescribed by doctor',
    contraindications: ['Hypoglycemia', 'Allergy to insulin'],
    requiresPrescription: true
  },
  {
    name: 'Cough Syrup',
    genericName: 'Dextromethorphan',
    brand: 'Benadryl',
    category: 'Respiratory',
    strength: '15mg/5ml',
    form: 'syrup',
    manufacturer: 'Johnson & Johnson',
    description: 'Cough suppressant and expectorant',
    sideEffects: ['Drowsiness', 'Dizziness', 'Nausea'],
    dosageInstructions: 'Take 10ml every 4-6 hours as needed',
    contraindications: ['MAO inhibitor use', 'Severe asthma'],
    requiresPrescription: false
  },
  {
    name: 'Metformin 500mg',
    genericName: 'Metformin HCl',
    brand: 'Glucophage',
    category: 'Diabetes',
    strength: '500mg',
    form: 'tablet',
    manufacturer: 'Sun Pharma',
    description: 'Diabetes medication to control blood sugar',
    sideEffects: ['Nausea', 'Diarrhea', 'Metallic taste'],
    dosageInstructions: 'Take with meals as prescribed by doctor',
    contraindications: ['Kidney disease', 'Liver disease', 'Alcohol abuse'],
    requiresPrescription: true
  }
];

async function seedFirestore() {
  console.log('Starting Firestore seeding...');

  try {
    // Seed Admins
    console.log('Seeding admins...');
    for (const adminUser of sampleAdmins) {
      const authUid = await createAuthUser(adminUser);
      await setDoc(doc(db, 'users', authUid), {
        ...adminUser,
        uid: authUid,
        createdAt: Timestamp.fromDate(adminUser.createdAt),
        lastLoginAt: Timestamp.fromDate(adminUser.lastLoginAt)
      });
      console.log(`Created admin profile: ${adminUser.displayName}`);
    }

    // Seed Patients
    console.log('Seeding patients...');
    for (const patient of samplePatients) {
      // Create Firebase Auth user first
      const authUid = await createAuthUser(patient);
      
      // Then create Firestore profile
      await setDoc(doc(db, 'users', authUid), {
        ...patient,
        uid: authUid, // Use the Auth UID
        createdAt: Timestamp.fromDate(patient.createdAt),
        lastLoginAt: Timestamp.fromDate(patient.lastLoginAt),
        dateOfBirth: patient.dateOfBirth ? Timestamp.fromDate(patient.dateOfBirth) : null
      });
      console.log(`Created patient profile: ${patient.displayName}`);
    }

    // Seed Doctors
    console.log('Seeding doctors...');
    for (const doctor of sampleDoctors) {
      // Create Firebase Auth user first
      const authUid = await createAuthUser(doctor);
      
      // Then create Firestore profile
      await setDoc(doc(db, 'users', authUid), {
        ...doctor,
        uid: authUid, // Use the Auth UID
        createdAt: Timestamp.fromDate(doctor.createdAt),
        lastLoginAt: Timestamp.fromDate(doctor.lastLoginAt)
      });
      console.log(`Created doctor profile: ${doctor.displayName}`);
    }

    // Seed Pharmacies
    console.log('Seeding pharmacies...');
    for (const pharmacy of samplePharmacies) {
      // Create Firebase Auth user first
      const authUid = await createAuthUser(pharmacy);
      
      // Then create Firestore profile
      await setDoc(doc(db, 'users', authUid), {
        ...pharmacy,
        uid: authUid, // Use the Auth UID
        createdAt: Timestamp.fromDate(pharmacy.createdAt),
        lastLoginAt: Timestamp.fromDate(pharmacy.lastLoginAt)
      });
      console.log(`Created pharmacy profile: ${pharmacy.displayName}`);
    }

    // Seed Medicines
    console.log('Seeding medicines...');
    for (let i = 0; i < sampleMedicines.length; i++) {
      await setDoc(doc(db, 'medicines', `medicine${i + 1}`), sampleMedicines[i]);
    }

    // Seed Inventory Items
    console.log('Seeding inventory...');
    const inventoryItems: Omit<InventoryItem, 'id'>[] = [
      {
        pharmacyId: 'pharmacy1',
        medicineId: 'medicine1',
        batchNumber: 'PCM2024001',
        expiryDate: new Date('2025-12-31'),
        manufacturingDate: new Date('2023-12-01'),
        quantity: 150,
        costPrice: 4.00,
        sellingPrice: 5.00,
        lowStockThreshold: 50,
        supplierInfo: {
          name: 'ABC Medical Suppliers',
          contact: '+91 9999900020' // Dummy supplier contact
        },
        lastUpdated: new Date(),
        isActive: true
      },
      {
        pharmacyId: 'pharmacy1',
        medicineId: 'medicine2',
        batchNumber: 'AMX2024002',
        expiryDate: new Date('2025-06-30'),
        manufacturingDate: new Date('2024-01-01'),
        quantity: 25,
        costPrice: 40.00,
        sellingPrice: 45.00,
        lowStockThreshold: 30,
        supplierInfo: {
          name: 'XYZ Pharma Distributors',
          contact: '+91 9999900021' // Dummy supplier contact
        },
        lastUpdated: new Date(),
        isActive: true
      },
      {
        pharmacyId: 'pharmacy1',
        medicineId: 'medicine3',
        batchNumber: 'INS2024003',
        expiryDate: new Date('2024-08-15'),
        manufacturingDate: new Date('2023-08-01'),
        quantity: 0,
        costPrice: 320.00,
        sellingPrice: 350.00,
        lowStockThreshold: 20,
        supplierInfo: {
          name: 'Insulin Direct',
          contact: '+91 9999900022' // Dummy supplier contact
        },
        lastUpdated: new Date(),
        isActive: true
      }
    ];

    for (let i = 0; i < inventoryItems.length; i++) {
      await setDoc(doc(db, 'inventory', `inventory${i + 1}`), {
        ...inventoryItems[i],
        expiryDate: Timestamp.fromDate(inventoryItems[i].expiryDate),
        manufacturingDate: inventoryItems[i].manufacturingDate ? Timestamp.fromDate(inventoryItems[i].manufacturingDate) : null,
        lastUpdated: Timestamp.fromDate(inventoryItems[i].lastUpdated)
      });
    }

    // Seed Sample Appointments
    console.log('Seeding appointments...');
    const appointments: Omit<Appointment, 'id'>[] = [
      {
        patientId: 'patient1',
        doctorId: 'doctor1',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        duration: 30,
        type: 'video',
        status: 'scheduled',
        reasonForVisit: 'Follow-up checkup for hypertension',
        symptoms: ['High blood pressure', 'Headache'],
        urgency: 'medium',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (let i = 0; i < appointments.length; i++) {
      await setDoc(doc(db, 'appointments', `appointment${i + 1}`), {
        ...appointments[i],
        scheduledAt: Timestamp.fromDate(appointments[i].scheduledAt),
        createdAt: Timestamp.fromDate(appointments[i].createdAt),
        updatedAt: Timestamp.fromDate(appointments[i].updatedAt)
      });
    }

    // Seed Sample Health Records
    console.log('Seeding health records...');
    const healthRecords: Omit<HealthRecord, 'id'>[] = [
      {
        patientId: 'patient1',
        type: 'lab-report',
        title: 'Blood Test Report',
        description: 'Complete Blood Count and Blood Sugar levels',
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        recordDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        doctorId: 'doctor1',
        labName: 'City Diagnostic Lab',
        isShared: false,
        sharedWith: [],
        tags: ['blood-test', 'diabetes', 'routine'],
        metadata: {
          testResults: {
            hemoglobin: '12.5 g/dL',
            glucoseFasting: '110 mg/dL',
            glucosePostMeal: '145 mg/dL'
          }
        }
      }
    ];

    for (let i = 0; i < healthRecords.length; i++) {
      await setDoc(doc(db, 'healthRecords', `record${i + 1}`), {
        ...healthRecords[i],
        uploadedAt: Timestamp.fromDate(healthRecords[i].uploadedAt),
        recordDate: Timestamp.fromDate(healthRecords[i].recordDate)
      });
    }

    console.log('Firestore seeding completed successfully!');
    console.log('Seeded:');
    console.log(`  - ${samplePatients.length} patients`);
    console.log(`  - ${sampleDoctors.length} doctors`);
    console.log(`  - ${samplePharmacies.length} pharmacies`);
    console.log(`  - ${sampleMedicines.length} medicines`);
    console.log(`  - ${inventoryItems.length} inventory items`);
    console.log(`  - ${appointments.length} appointments`);
    console.log(`  - ${healthRecords.length} health records`);

  } catch (error) {
    console.error('Error seeding Firestore:', error);
    throw error;
  }
}

// Run the seeding function
if (require.main === module) {
  seedFirestore()
    .then(() => {
      console.log('Seeding process completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedFirestore };
