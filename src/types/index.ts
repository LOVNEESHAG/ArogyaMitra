// User and Authentication Types
export type UserRole = 'patient' | 'doctor' | 'pharmacyOwner' | 'admin' | null;

export interface BaseUser {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: Exclude<UserRole, null>;
  createdAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
  isVerified: boolean;
}

export interface PatientProfile extends BaseUser {
  role: 'patient';
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  phone: string;
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalHistory?: string[];
  allergies?: string[];
  abhaNumber?: string;
}

export interface DoctorProfile extends BaseUser {
  role: 'doctor';
  registrationNumber: string;
  specialization: string[];
  qualifications: string[];
  experience: number;
  consultationFee: number;
  availableSlots: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    startTime: string; // "09:00"
    endTime: string; // "17:00"
    slotDuration: number; // in minutes
  }[];
  rating: number;
  totalConsultations: number;
  languages: string[];
  clinicAddress?: {
    name: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export interface PharmacyProfile extends BaseUser {
  role: 'pharmacyOwner';
  pharmacyName: string;
  licenseNumber: string;
  gstNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  operatingHours: {
    dayOfWeek: number;
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  }[];
  contactNumber: string;
  servicesOffered: string[];
}

export interface AdminProfile extends BaseUser {
  role: 'admin';
  permissions: string[];
  departmentAccess: string[];
}

// Appointment Types
export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  duration: number; // in minutes
  type: 'video' | 'in-person';
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  reasonForVisit: string;
  symptoms?: string[];
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  createdAt: Date;
  updatedAt: Date;
  consultationNotes?: string;
  prescription?: string;
  followUpRequired?: boolean;
  followUpDate?: Date;
  cancelReason?: string;
  videoCallId?: string;
  // Call fields for teleconsultation (MVP)
  callType?: 'video' | 'voice';
  callRoomId?: string;
  callStartTime?: Date;
  callEndTime?: Date;
  callDuration?: number; // minutes
}

// Appointment scheduling slot
export interface AppointmentSlot {
  start: Date;
  end: Date;
}

// Appointment audit trail
export interface AppointmentAudit {
  id: string;
  appointmentId: string;
  userId: string; // who performed the action
  action: 'book' | 'reschedule' | 'cancel' | 'status_change';
  timestamp: Date;
  details?: Record<string, any>;
  previous?: Partial<Appointment>;
  next?: Partial<Appointment>;
}

// Health Records Types
export interface HealthRecord {
  id: string;
  patientId: string;
  type: 'lab-report' | 'prescription' | 'imaging' | 'consultation-note' | 'medical-certificate' | 'other';
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: Date;
  recordDate: Date;
  doctorId?: string;
  labName?: string;
  isShared: boolean;
  sharedWith: string[]; // Array of user IDs
  tags: string[];
  metadata?: {
    testResults?: Record<string, any>;
    vitalSigns?: {
      bloodPressure?: string;
      heartRate?: number;
      temperature?: number;
      weight?: number;
      height?: number;
    };
  };
}

export interface HealthRecordComment {
  id: string;
  recordId: string;
  doctorId: string;
  doctorName?: string;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

// Pharmacy and Medicine Types
export interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  brand?: string;
  category: string;
  strength: string;
  form: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops' | 'other';
  manufacturer: string;
  description?: string;
  sideEffects?: string[];
  dosageInstructions?: string;
  contraindications?: string[];
  requiresPrescription: boolean;
}

export interface InventoryItem {
  id: string;
  pharmacyId: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: Date;
  manufacturingDate?: Date;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
  supplierInfo?: {
    name: string;
    contact: string;
  };
  lastUpdated: Date;
  isActive: boolean;
}

// Chat and AI Assistant Types
export interface ChatMessage {
  id: string;
  userId: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  category?: 'general' | 'symptom' | 'emergency' | 'wellness';
  confidence?: number;
  suggestedActions?: string[];
  relatedSymptoms?: string[];
}

export interface ChatSession {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  isActive: boolean;
  summary?: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  recommendedActions?: string[];
  followUpRequired?: boolean;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'appointment' | 'reminder' | 'prescription' | 'system' | 'emergency';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  scheduledFor?: Date;
  relatedEntityId?: string; // appointment ID, prescription ID, etc.
  action?: {
    type: 'navigate' | 'external' | 'modal';
    data: any;
  };
}

// System and Admin Types
export interface SystemMetrics {
  id: string;
  date: Date;
  totalUsers: number;
  activeUsers: number;
  totalAppointments: number;
  completedAppointments: number;
  totalConsultations: number;
  avgConsultationDuration: number;
  totalPrescriptions: number;
  systemUptime: number;
  errorRate: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Form and Input Types
export interface SearchFilters {
  query?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  category?: string;
  doctorId?: string;
  patientId?: string;
  pharmacyId?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
