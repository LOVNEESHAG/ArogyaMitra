#!/usr/bin/env node
/*
 Seed example users in Firebase Auth and Firestore.

 Prereqs:
 - Set environment variable FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON, single var)
   OR set FIREBASE_SERVICE_ACCOUNT_JSON_PATH to a file containing the JSON.

 Run:
   npm run seed:users

 Notes:
 - This script will create/update Auth users with passwords so you can log in.
 - It will also upsert corresponding Firestore docs under users/{uid} with roles.
*/

const fs = require('fs');
const path = require('path');
const dotenv = require("dotenv");
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

function loadServiceAccount() {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const fromPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_PATH || process.env.FIREBASE_SERVICE_ACCOUNT_JSON_FILE;
  if (fromEnv) {
    try {
      return JSON.parse(fromEnv);
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON is set but not valid JSON.');
      process.exit(1);
    }
  }
  if (fromPath) {
    try {
      const raw = fs.readFileSync(path.resolve(fromPath), 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to read FIREBASE_SERVICE_ACCOUNT_JSON_PATH file:', e.message);
      process.exit(1);
    }
  }
  console.error('Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_JSON_PATH.');
  process.exit(1);
}

(async () => {
  const sa = loadServiceAccount();
  initializeApp({ credential: cert(sa) });
  const auth = getAuth();
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });

  /** @type {{email:string,password:string,displayName:string,role:'patient'|'doctor'|'pharmacyOwner'|'admin',photoURL?:string}[]} */
  const users = [
    {
      email: 'patient@example.com',
      password: 'password',
      displayName: 'Priya',
      role: 'patient',
      photoURL: 'https://i.pravatar.cc/100?img=1',
    },
    {
      email: 'doctor@example.com',
      password: 'password',
      displayName: 'Dr. Dev',
      role: 'doctor',
      photoURL: 'https://i.pravatar.cc/100?img=2',
    },
    {
      email: 'pharmacy@example.com',
      password: 'password',
      displayName: 'Pooja Medical Store',
      role: 'pharmacyOwner',
      photoURL: 'https://i.pravatar.cc/100?img=3',
    },
    {
      email: 'admin@example.com',
      password: 'password',
      displayName: 'Arun',
      role: 'admin',
      photoURL: 'https://i.pravatar.cc/100?img=4',
    },
  ];

  async function upsertUser(u) {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(u.email);
      console.log(`Found existing auth user: ${u.email}`);
      // Ensure password and profile are up to date for demo consistency
      await auth.updateUser(userRecord.uid, {
        password: u.password,
        displayName: u.displayName,
        photoURL: u.photoURL,
        emailVerified: true,
      });
      userRecord = await auth.getUser(userRecord.uid);
    } catch (e) {
      if (e && e.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: u.email,
          password: u.password,
          displayName: u.displayName,
          photoURL: u.photoURL,
          emailVerified: true,
        });
        console.log(`Created auth user: ${u.email}`);
      } else {
        console.error(`Error looking up/creating user ${u.email}:`, e);
        throw e;
      }
    }

    const ref = db.collection('users').doc(userRecord.uid);
    const now = Date.now();
    await ref.set(
      {
        uid: userRecord.uid,
        role: u.role,
        name: u.displayName,
        email: u.email,
        phoneNumber: userRecord.phoneNumber || null,
        photoURL: u.photoURL || userRecord.photoURL || null,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
    console.log(`Upserted Firestore doc for ${u.email} with role=${u.role}`);
  }

  try {
    for (const u of users) {
      // eslint-disable-next-line no-await-in-loop
      await upsertUser(u);
    }
    console.log('\nSeed complete. Example logins:');
    for (const u of users) {
      console.log(` - ${u.displayName} (${u.role}): ${u.email} / ${u.password}`);
    }
  } catch (e) {
    console.error('Seeding failed:', e);
    process.exit(1);
  }
})();
