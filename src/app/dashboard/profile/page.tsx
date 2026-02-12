"use client";

import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone, MapPin, Shield, Calendar, UploadCloud } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { signOutAll } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { getFirebaseStorage } from "@/lib/firebase-client";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

type ProfileRole = 'patient' | 'doctor' | 'pharmacyOwner' | 'admin';

interface ProfileData {
  displayName: string;
  email: string;
  phone?: string;
  address?: string;
  photoURL?: string;
  role: ProfileRole;
  createdAt?: Date;
}

type FormState = {
  displayName: string;
  phone: string;
  address: string;
  photoURL: string;
  gender: string;
  bloodGroup: string;
  dateOfBirth: string;
  allergies: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  registrationNumber: string;
  specialization: string;
  experienceYears: string;
  consultationFee: string;
  languages: string;
  pharmacyName: string;
  licenseNumber: string;
  gstNumber: string;
  contactNumber: string;
};

function coerceToDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value === 'object') {
    if (typeof (value as any).toDate === 'function') {
      const date = (value as any).toDate();
      return isNaN(date.getTime()) ? undefined : date;
    }
    if (typeof (value as any).seconds === 'number') {
      const date = new Date((value as any).seconds * 1000);
      return isNaN(date.getTime()) ? undefined : date;
    }
    if (typeof (value as any)._seconds === 'number') {
      const date = new Date((value as any)._seconds * 1000);
      return isNaN(date.getTime()) ? undefined : date;
    }
  }
  return undefined;
}

function formatDateInput(value: any): string {
  const date = coerceToDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
}

export default function ProfilePage() {
  const { role, loading, user } = useUserRole();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [rawProfile, setRawProfile] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resolveRole = (value?: string | null): ProfileRole => {
    if (value === 'doctor' || value === 'pharmacyOwner' || value === 'admin' || value === 'patient') {
      return value;
    }
    return 'patient';
  };

  const buildFormState = (profile: Record<string, any>): FormState => ({
    displayName: (profile?.displayName ?? user?.displayName ?? 'User') as string,
    phone: (profile?.phone ?? '') as string,
    address: (profile?.address ?? '') as string,
    photoURL: (profile?.photoURL ?? user?.photoURL ?? '') as string,
    gender: (profile?.gender ?? '') as string,
    bloodGroup: (profile?.bloodGroup ?? '') as string,
    dateOfBirth: formatDateInput(profile?.dateOfBirth),
    allergies: Array.isArray(profile?.allergies) ? profile.allergies.join(', ') : (profile?.allergies ?? ''),
    emergencyContactName: profile?.emergencyContact?.name ?? '',
    emergencyContactPhone: profile?.emergencyContact?.phone ?? '',
    emergencyContactRelation: profile?.emergencyContact?.relationship ?? '',
    registrationNumber: (profile?.registrationNumber ?? '') as string,
    specialization: Array.isArray(profile?.specialization) ? profile.specialization.join(', ') : (profile?.specialization ?? ''),
    experienceYears: profile?.experience != null ? String(profile.experience) : '',
    consultationFee: profile?.consultationFee != null ? String(profile.consultationFee) : '',
    languages: Array.isArray(profile?.languages) ? profile.languages.join(', ') : (profile?.languages ?? ''),
    pharmacyName: (profile?.pharmacyName ?? '') as string,
    licenseNumber: (profile?.licenseNumber ?? '') as string,
    gstNumber: (profile?.gstNumber ?? '') as string,
    contactNumber: (profile?.contactNumber ?? profile?.phone ?? '') as string,
  });

  const buildProfileData = (profile: Record<string, any>, resolvedRole: ProfileRole): ProfileData => ({
    displayName: (profile?.displayName ?? user?.displayName ?? 'User') as string,
    email: user?.email || profile?.email || '',
    phone: (profile?.phone ?? '') as string,
    address: (profile?.address ?? '') as string,
    photoURL: (profile?.photoURL ?? user?.photoURL ?? '') as string,
    role: resolvedRole,
    createdAt: coerceToDate(profile?.createdAt),
  });

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/profile/me', {
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          const profile = (data?.profile ?? {}) as Record<string, any>;
          const resolvedRole = resolveRole(data?.role ?? role);
          setRawProfile(profile);
          setFormState(buildFormState(profile));
          setProfileData(buildProfileData(profile, resolvedRole));
        } else {
          setRawProfile({});
          setFormState(buildFormState({}));
          setProfileData(buildProfileData({}, resolveRole(role)));
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setRawProfile({});
        setFormState(buildFormState({}));
        setProfileData(buildProfileData({}, resolveRole(role)));
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, role]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleReset = () => {
    setStatus(null);
    setUploadError(null);
    setFormState(buildFormState(rawProfile));
  };

  const handlePhotoSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user?.uid) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Please upload an image smaller than 3 MB.');
      return;
    }

    setUploadError(null);
    setUploadingPhoto(true);
    try {
      const storage = getFirebaseStorage();
      const filePath = `avatars/${user.uid}-${Date.now()}`;
      const avatarRef = storageRef(storage, filePath);
      await uploadBytes(avatarRef, file);
      const url = await getDownloadURL(avatarRef);
      setFormState((prev) => (prev ? { ...prev, photoURL: url } : prev));
      setStatus({ type: 'success', message: 'Profile photo uploaded. Remember to save changes.' });
    } catch (error) {
      console.error('Photo upload failed', error);
      setUploadError('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState || !profileData) return;

    setIsSaving(true);
    setStatus(null);

    const payload: Record<string, any> = {
      displayName: formState.displayName.trim(),
      phone: formState.phone.trim(),
      address: formState.address.trim(),
      photoURL: formState.photoURL.trim(),
    };

    if (profileData.role === 'patient') {
      payload.gender = formState.gender;
      payload.bloodGroup = formState.bloodGroup;
      payload.dateOfBirth = formState.dateOfBirth;
      payload.allergies = formState.allergies
        ? formState.allergies.split(',').map((item) => item.trim()).filter(Boolean)
        : [];
      const emergencyContact = {
        name: formState.emergencyContactName.trim(),
        phone: formState.emergencyContactPhone.trim(),
        relationship: formState.emergencyContactRelation.trim(),
      };
      if (emergencyContact.name || emergencyContact.phone || emergencyContact.relationship) {
        payload.emergencyContact = emergencyContact;
      } else {
        payload.emergencyContact = null;
      }
    }

    if (profileData.role === 'doctor') {
      payload.registrationNumber = formState.registrationNumber.trim();
      payload.specialization = formState.specialization
        ? formState.specialization.split(',').map((item) => item.trim()).filter(Boolean)
        : [];
      payload.languages = formState.languages
        ? formState.languages.split(',').map((item) => item.trim()).filter(Boolean)
        : [];
      const experience = parseInt(formState.experienceYears, 10);
      if (!Number.isNaN(experience)) {
        payload.experience = experience;
      }
      const fee = parseFloat(formState.consultationFee);
      if (!Number.isNaN(fee)) {
        payload.consultationFee = fee;
      }
    }

    if (profileData.role === 'pharmacyOwner') {
      payload.pharmacyName = formState.pharmacyName.trim();
      payload.licenseNumber = formState.licenseNumber.trim();
      payload.gstNumber = formState.gstNumber.trim();
      payload.contactNumber = formState.contactNumber.trim();
    }

    try {
      const res = await fetch('/api/profile/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to update profile');
      }

      const data = await res.json();
      const updatedProfile = (data?.profile ?? payload) as Record<string, any>;
      const resolvedRole = resolveRole(data?.role ?? profileData.role);

      setRawProfile(updatedProfile);
      setFormState(buildFormState(updatedProfile));
      setProfileData(buildProfileData(updatedProfile, resolvedRole));
      setStatus({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error: any) {
      setStatus({ type: 'error', message: error?.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutAll();
      router.push('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profileData || !formState) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Failed to load profile data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'patient': return 'Patient';
      case 'doctor': return 'Doctor';
      case 'pharmacyOwner': return 'Pharmacy Owner';
      case 'admin': return 'Administrator';
      default: return 'User';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button variant="destructive" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                {formState.photoURL ? (
                  <img
                    src={formState.photoURL}
                    alt="Profile"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-accent" />
                )}
              </div>
              <button
                type="button"
                onClick={handlePhotoSelectClick}
                disabled={uploadingPhoto}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border bg-background px-2 py-1 text-[10px] font-medium shadow-sm hover:bg-muted disabled:opacity-60"
              >
                {uploadingPhoto ? 'Uploading…' : 'Change'}
              </button>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl">{formState.displayName || profileData.displayName}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {getRoleDisplayName(profileData.role)}
              </CardDescription>
              <p className="text-xs text-muted-foreground">Upload a square image for best results. Supported formats: JPG, PNG, WebP.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handlePhotoFileChange}
            />
            {status && (
              <div
                className={`rounded-md border p-3 text-sm ${
                  status.type === 'success'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {status.message}
              </div>
            )}
            {uploadError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {uploadError}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Display Name
                </label>
                <Input name="displayName" value={formState.displayName} onChange={handleInputChange} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </label>
                <Input value={profileData.email} readOnly />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </label>
                <Input
                  name="phone"
                  value={formState.phone}
                  onChange={handleInputChange}
                  placeholder="Add phone number"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <UploadCloud className="h-4 w-4" />
                  Profile Photo URL
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    name="photoURL"
                    value={formState.photoURL}
                    onChange={handleInputChange}
                    placeholder="https://"
                    className="sm:flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePhotoSelectClick}
                    disabled={uploadingPhoto}
                    className="sm:w-auto"
                  >
                    {uploadingPhoto ? 'Uploading…' : 'Upload Photo'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </label>
                <textarea
                  name="address"
                  value={formState.address}
                  onChange={handleInputChange}
                  placeholder="Add address"
                  className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                />
              </div>

              {profileData.createdAt && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Member Since
                  </label>
                  <Input value={profileData.createdAt.toLocaleDateString()} readOnly />
                </div>
              )}
            </div>

            {profileData.role === 'patient' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Patient Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gender</label>
                    <select
                      name="gender"
                      value={formState.gender}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <option value="">Select gender</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Blood Group</label>
                    <select
                      name="bloodGroup"
                      value={formState.bloodGroup}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <option value="">Select blood group</option>
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date of Birth</label>
                    <Input type="date" name="dateOfBirth" value={formState.dateOfBirth} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Allergies (comma separated)</label>
                    <Input
                      name="allergies"
                      value={formState.allergies}
                      onChange={handleInputChange}
                      placeholder="Peanuts, Penicillin"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Emergency Contact Name</label>
                    <Input name="emergencyContactName" value={formState.emergencyContactName} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Emergency Contact Phone</label>
                    <Input name="emergencyContactPhone" value={formState.emergencyContactPhone} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Relationship</label>
                    <Input name="emergencyContactRelation" value={formState.emergencyContactRelation} onChange={handleInputChange} />
                  </div>
                </div>
              </div>
            )}

            {profileData.role === 'doctor' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Doctor Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Registration Number</label>
                    <Input name="registrationNumber" value={formState.registrationNumber} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Specialization (comma separated)</label>
                    <Input name="specialization" value={formState.specialization} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Languages (comma separated)</label>
                    <Input name="languages" value={formState.languages} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Experience (years)</label>
                    <Input name="experienceYears" type="number" min="0" value={formState.experienceYears} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Consultation Fee (Rs.)</label>
                    <Input name="consultationFee" type="number" min="0" step="0.01" value={formState.consultationFee} onChange={handleInputChange} />
                  </div>
                </div>
              </div>
            )}

            {profileData.role === 'pharmacyOwner' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pharmacy Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pharmacy Name</label>
                    <Input name="pharmacyName" value={formState.pharmacyName} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">License Number</label>
                    <Input name="licenseNumber" value={formState.licenseNumber} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">GST Number</label>
                    <Input name="gstNumber" value={formState.gstNumber} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Contact Number</label>
                    <Input name="contactNumber" value={formState.contactNumber} onChange={handleInputChange} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving}>
                Reset
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your account preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Privacy & Security</h3>
              <p className="text-sm text-muted-foreground">Your data is protected by Firebase Auth</p>
            </div>
            <Shield className="h-5 w-5 text-accent" />
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Support & Help</h3>
              <p className="text-sm text-muted-foreground">Get help with your ArogyaMitra account</p>
            </div>
            <Button variant="outline" size="sm">
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
