"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { userService } from "@/lib/firestore";
import type { UserRole, PatientProfile, DoctorProfile, PharmacyProfile, AdminProfile } from "@/types";

interface UserData {
  user: FirebaseUser | null;
  role: UserRole;
  appUser: PatientProfile | DoctorProfile | PharmacyProfile | AdminProfile | null;
  loading: boolean;
}

export function useUserRole(): UserData {
  const [userData, setUserData] = useState<UserData>({
    user: null,
    role: null,
    appUser: null,
    loading: true
  });

  useEffect(() => {
    const auth = getFirebaseAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user profile from Firestore
          const appUser = await userService.getById(firebaseUser.uid);
          
          setUserData({
            user: firebaseUser,
            role: appUser?.role || null,
            appUser: appUser as PatientProfile | DoctorProfile | PharmacyProfile | AdminProfile | null,
            loading: false
          });
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserData({
            user: firebaseUser,
            role: null,
            appUser: null,
            loading: false
          });
        }
      } else {
        setUserData({
          user: null,
          role: null,
          appUser: null,
          loading: false
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return userData;
}

export function useIsRole(targetRole: UserRole): boolean {
  const { role } = useUserRole();
  return role === targetRole;
}

export function useIsAnyRole(targetRoles: UserRole[]): boolean {
  const { role } = useUserRole();
  return targetRoles.includes(role);
}
