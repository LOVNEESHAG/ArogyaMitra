"use client";

import { getFirebaseAuth, getFirebaseStorage } from "./firebase-client";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  UserCredential,
  updateProfile,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseFirestore } from "./firebase-client";
import { doc, getDoc, setDoc } from "firebase/firestore";

async function exchangeSession(idToken: string, role?: 'patient' | 'doctor' | 'pharmacyOwner') {
  const res = await fetch("/api/auth/simple-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(role ? { idToken, role } : { idToken }),
  });
  
  if (!res.ok) {
    try {
      const data = await res.json();
      throw new Error(data?.error || "Failed to create session");
    } catch {
      throw new Error("Failed to create session");
    }
  }
}

export async function signInEmailPassword(email: string, password: string) {
  const auth = getFirebaseAuth();
  const cred: UserCredential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();
  await exchangeSession(idToken);
  // Ensure users doc exists (hackathon-simple)
  try {
    const db = getFirebaseFirestore();
    const uref = doc(db, 'users', cred.user.uid);
    const snap = await getDoc(uref);
    if (!snap.exists()) {
      await setDoc(uref, {
        uid: cred.user.uid,
        role: 'patient',
        displayName: cred.user.displayName || '',
        email: cred.user.email || '',
        photoURL: cred.user.photoURL || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
    }
  } catch {}
  return cred.user;
}

export async function signUpEmailPassword(
  email: string,
  password: string,
  role: 'patient' | 'doctor' | 'pharmacyOwner',
  name?: string,
  photoFile?: File | null
) {
  const auth = getFirebaseAuth();
  const cred: UserCredential = await createUserWithEmailAndPassword(auth, email, password);

  try {
    let photoURL: string | undefined = undefined;
    if (photoFile) {
      const storage = getFirebaseStorage();
      const avatarRef = ref(storage, `avatars/${cred.user.uid}-${Date.now()}`);
      await uploadBytes(avatarRef, photoFile);
      photoURL = await getDownloadURL(avatarRef);
    } else {
      // Use bundled placeholder asset for prototype
      photoURL = "/images/patient1-100x100.jpg";
    }

    await updateProfile(cred.user, {
      displayName: name || undefined,
      photoURL,
    });
  } catch (e) {
    // Non-fatal: proceed even if profile update fails
    console.warn('Failed to update profile after signup', e);
  }

  const idToken = await cred.user.getIdToken();
  await exchangeSession(idToken, role);
  // Create/update users doc with selected role (hackathon-simple)
  try {
    const db = getFirebaseFirestore();
    const uref = doc(db, 'users', cred.user.uid);
    await setDoc(uref, {
      uid: cred.user.uid,
      role,
      displayName: cred.user.displayName || name || '',
      email: cred.user.email || email,
      photoURL: cred.user.photoURL || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }, { merge: true });
  } catch {}
  return cred.user;
}


export async function signOutAll() {
  // Clear server session cookie
  await fetch("/api/auth/simple-session", { method: "DELETE" });
  // Sign out Firebase client
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}
