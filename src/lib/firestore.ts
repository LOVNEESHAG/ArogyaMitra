import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-client';
import type {
  UserRole,
  BaseUser,
  PatientProfile,
  DoctorProfile,
  PharmacyProfile,
  AdminProfile,
  Appointment,
  HealthRecord,
  HealthRecordComment,
  Medicine,
  InventoryItem,
  ChatMessage,
  ChatSession,
  Notification,
  ApiResponse,
  PaginationOptions,
  SearchFilters,
  AppointmentSlot,
  AppointmentAudit
} from '../types';

const db = getFirebaseFirestore();

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  APPOINTMENTS: 'appointments',
  APPOINTMENT_AUDITS: 'appointmentAudits',
  HEALTH_RECORDS: 'healthRecords',
  HEALTH_RECORD_COMMENTS: 'healthRecordComments',
  MEDICINES: 'medicines',
  INVENTORY: 'inventory',
  CHAT_SESSIONS: 'chatSessions',
  CHAT_MESSAGES: 'chatMessages',
  NOTIFICATIONS: 'notifications',
  SYSTEM_METRICS: 'systemMetrics'
} as const;

// Utility function to convert Firestore timestamp to Date
export function timestampToDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp._seconds !== undefined) {
    return new Date(timestamp._seconds * 1000);
  }
  return new Date(timestamp);
}

// Utility function to convert Date to Firestore timestamp
export function dateToTimestamp(date: Date | string) {
  return Timestamp.fromDate(new Date(date));
}
// Generic CRUD operations
export class FirestoreService<T extends { id?: string }> {
  constructor(private collectionName: string) {}

  async create(data: Omit<T, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  }

  async getById(id: string): Promise<T | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as T;
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }

  async getAll(
    filters?: SearchFilters,
    pagination?: PaginationOptions,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    let q = query(collection(db, this.collectionName), ...constraints);

    if (pagination) {
      if (pagination.sortBy) {
        q = query(q, orderBy(pagination.sortBy, pagination.sortOrder || 'asc'));
      }
      if (pagination.limit) {
        q = query(q, limit(pagination.limit));
      }
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as T);
  }

  subscribe(
    callback: (data: T[]) => void,
    constraints: QueryConstraint[] = []
  ): Unsubscribe {
    const q = query(collection(db, this.collectionName), ...constraints);
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as T);
      callback(data);
    });
  }
}

// Specialized services for each collection  
export class UserService extends FirestoreService<BaseUser> {
  constructor() {
    super(COLLECTIONS.USERS);
  }

  async getUserByRole(role: UserRole): Promise<(PatientProfile | DoctorProfile | PharmacyProfile | AdminProfile)[]> {
    // Keep it index-free for hackathon: avoid orderBy + where composite index
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('role', '==', role)
    );
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
    // Sort in-memory by createdAt desc when available to avoid Firestore index requirement
    return users.sort((a: any, b: any) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dbt = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dbt - da;
    });
  }

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    await this.update(userId, { role } as any);
  }

  async verifyUser(userId: string): Promise<void> {
    await this.update(userId, { isVerified: true } as any);
  }

  async suspendUser(userId: string): Promise<void> {
    await this.update(userId, { isActive: false } as any);
  }
}

export class AppointmentService extends FirestoreService<Appointment> {
  constructor() {
    super(COLLECTIONS.APPOINTMENTS);
  }

  async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    const q = query(
      collection(db, COLLECTIONS.APPOINTMENTS),
      where('patientId', '==', patientId)
    );

    const querySnapshot = await getDocs(q);
    const appointments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }) as Appointment);

    // Sort in-memory for the hackathon - avoids needing a Firestore index
    return appointments.sort((a, b) => {
      const dateA = a.scheduledAt instanceof Timestamp ? a.scheduledAt.toMillis() : new Date(a.scheduledAt as any).getTime();
      const dateB = b.scheduledAt instanceof Timestamp ? b.scheduledAt.toMillis() : new Date(b.scheduledAt as any).getTime();
      return dateB - dateA;
    });
  }

  async getDoctorAppointments(doctorId: string, date?: Date): Promise<Appointment[]> {
    // Index-free approach: query by doctorId only, filter by date in memory, and sort in memory
    const q = query(collection(db, COLLECTIONS.APPOINTMENTS), where('doctorId', '==', doctorId));
    const querySnapshot = await getDocs(q);
    let items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Appointment);
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      items = items.filter(apt => {
        const s = timestampToDate((apt as any).scheduledAt);
        return s >= startOfDay && s <= endOfDay;
      });
    }
    // Sort by scheduledAt asc
    return items.sort((a, b) => timestampToDate((a as any).scheduledAt).getTime() - timestampToDate((b as any).scheduledAt).getTime());
  }

  async getDoctorPatientIds(doctorId: string): Promise<string[]> {
    const appointments = await this.getDoctorAppointments(doctorId);
    const patients = new Set<string>();
    appointments.forEach((apt) => {
      const pid = (apt as any).patientId;
      if (pid) patients.add(pid);
    });
    return Array.from(patients);
  }

  async bookAppointment(appointmentData: Omit<Appointment, 'id'>): Promise<string> {
    // Check for conflicts
    const conflicts = await this.getDoctorAppointments(appointmentData.doctorId, appointmentData.scheduledAt);
    const hasConflict = conflicts.some(apt => {
      const aptStart = timestampToDate(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
      const newStart = appointmentData.scheduledAt;
      const newEnd = new Date(newStart.getTime() + appointmentData.duration * 60000);
      
      return (newStart < aptEnd && newEnd > aptStart) && apt.status !== 'cancelled';
    });

    if (hasConflict) {
      throw new Error('Time slot not available');
    }

    const id = await this.create(appointmentData);
    // audit trail
    await appointmentAuditService.record({
      appointmentId: id,
      userId: appointmentData.patientId,
      action: 'book',
      details: {
        doctorId: appointmentData.doctorId,
        scheduledAt: appointmentData.scheduledAt,
        duration: appointmentData.duration,
      }
    });
    return id;
  }

  async updateAppointmentStatus(id: string, status: Appointment['status'], notes?: string): Promise<void> {
    const updateData: Partial<Appointment> = { status };
    if (notes) updateData.consultationNotes = notes;
    await this.update(id, updateData);
    await appointmentAuditService.record({
      appointmentId: id,
      userId: 'system',
      action: 'status_change',
      details: { status, notes }
    });
  }

  // Generate available slots for a given doctor and date
  async generateSlots(doctorId: string, date: Date): Promise<AppointmentSlot[]> {
    // get doctor profile
    const doctorDoc = await userService.getById(doctorId);
    if (!doctorDoc) return [];
    const doctor = doctorDoc as unknown as DoctorProfile;

    const dayOfWeek = date.getDay();
    let segments = (doctor.availableSlots || []).filter(s => s.dayOfWeek === dayOfWeek);
    if (!segments.length) {
      // Fallback to a simple default schedule for hackathon (10:00 - 17:00, 30-min slots)
      segments = [{ dayOfWeek, startTime: '10:00', endTime: '17:00', slotDuration: 30 }];
    }

    // existing appointments for that day
    const sameDayAppointments = await this.getDoctorAppointments(doctorId, date);

    const slots: AppointmentSlot[] = [];
    for (const seg of segments) {
      const [startHour, startMin] = seg.startTime.split(':').map(Number);
      const [endHour, endMin] = seg.endTime.split(':').map(Number);
      const segStart = new Date(date);
      segStart.setHours(startHour, startMin, 0, 0);
      const segEnd = new Date(date);
      segEnd.setHours(endHour, endMin, 0, 0);

      let cursor = new Date(segStart);
      while (cursor < segEnd) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(slotStart.getTime() + (seg.slotDuration || 30) * 60000);
        if (slotEnd > segEnd) break;

        const overlaps = sameDayAppointments.some(apt => {
          const aptStart = timestampToDate(apt.scheduledAt);
          const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
          return (slotStart < aptEnd && slotEnd > aptStart) && apt.status !== 'cancelled';
        });

        if (!overlaps) {
          slots.push({ start: slotStart, end: slotEnd });
        }

        cursor = new Date(cursor.getTime() + (seg.slotDuration || 30) * 60000);
      }
    }

    return slots;
  }

  // Reschedule with conflict prevention and audit
  async rescheduleAppointment(id: string, newStart: Date, duration: number, userId: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Appointment not found');

    const conflicts = await this.getDoctorAppointments(existing.doctorId, newStart);
    const hasConflict = conflicts.some(apt => {
      if (apt.id === id) return false; // ignore self
      const aptStart = timestampToDate(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
      const newEnd = new Date(newStart.getTime() + duration * 60000);
      return (newStart < aptEnd && newEnd > aptStart) && apt.status !== 'cancelled';
    });
    if (hasConflict) throw new Error('Time slot not available');

    const previous: Partial<Appointment> = { scheduledAt: existing.scheduledAt, duration: existing.duration };
    await this.update(id, { scheduledAt: newStart as any, duration });
    await appointmentAuditService.record({
      appointmentId: id,
      userId,
      action: 'reschedule',
      details: { newStart, duration },
      previous,
      next: { scheduledAt: newStart, duration }
    });
  }
  
  // Cancel with reason and audit
  async cancelAppointment(id: string, reason: string, userId: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Appointment not found');
    await this.update(id, { status: 'cancelled', cancelReason: reason });
    await appointmentAuditService.record({
      appointmentId: id,
      userId,
      action: 'cancel',
      details: { reason }
    });
  }
}

export class HealthRecordService extends FirestoreService<HealthRecord> {
  constructor() {
    super(COLLECTIONS.HEALTH_RECORDS);
  }

  async getPatientRecords(patientId: string): Promise<HealthRecord[]> {
    // Index-free approach: avoid orderBy, sort in memory
    const q = query(
      collection(db, COLLECTIONS.HEALTH_RECORDS),
      where('patientId', '==', patientId)
    );
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as HealthRecord);
    return records.sort((a: any, b: any) => {
      const da = a.recordDate?.toDate ? a.recordDate.toDate().getTime() : (a.recordDate ? new Date(a.recordDate).getTime() : 0);
      const dbt = b.recordDate?.toDate ? b.recordDate.toDate().getTime() : (b.recordDate ? new Date(b.recordDate).getTime() : 0);
      return dbt - da;
    });
  }

  async getRecordsForPatients(patientIds: string[]): Promise<HealthRecord[]> {
    if (!patientIds.length) return [];
    const combined: HealthRecord[] = [];
    for (const pid of patientIds) {
      const records = await this.getPatientRecords(pid);
      combined.push(...records);
    }
    return combined.sort((a: any, b: any) => {
      const da = a.recordDate?.toDate ? a.recordDate.toDate().getTime() : (a.recordDate ? new Date(a.recordDate).getTime() : 0);
      const dbt = b.recordDate?.toDate ? b.recordDate.toDate().getTime() : (b.recordDate ? new Date(b.recordDate).getTime() : 0);
      return dbt - da;
    });
  }

  async getSharedRecords(doctorId: string): Promise<HealthRecord[]> {
    // Index-free approach: avoid orderBy, sort in memory
    const q = query(
      collection(db, COLLECTIONS.HEALTH_RECORDS),
      where('sharedWith', 'array-contains', doctorId)
    );
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as HealthRecord);
    return records.sort((a: any, b: any) => {
      const da = a.recordDate?.toDate ? a.recordDate.toDate().getTime() : (a.recordDate ? new Date(a.recordDate).getTime() : 0);
      const dbt = b.recordDate?.toDate ? b.recordDate.toDate().getTime() : (b.recordDate ? new Date(b.recordDate).getTime() : 0);
      return dbt - da;
    });
  }

  async shareRecord(recordId: string, doctorIds: string[]): Promise<void> {
    const record = await this.getById(recordId);
    if (!record) throw new Error('Record not found');

    const updatedSharedWith = [...new Set([...record.sharedWith, ...doctorIds])];
    await this.update(recordId, { sharedWith: updatedSharedWith, isShared: true });
  }
}

export class HealthRecordCommentService extends FirestoreService<HealthRecordComment> {
  constructor() {
    super(COLLECTIONS.HEALTH_RECORD_COMMENTS);
  }

  async getCommentsForRecord(recordId: string): Promise<HealthRecordComment[]> {
    const q = query(
      collection(db, COLLECTIONS.HEALTH_RECORD_COMMENTS),
      where('recordId', '==', recordId)
    );
    const snapshot = await getDocs(q);
    const comments = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as HealthRecordComment);
    return comments.sort((a: any, b: any) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dbt = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return da - dbt;
    });
  }
}

export class MedicineService extends FirestoreService<Medicine> {
  constructor() {
    super(COLLECTIONS.MEDICINES);
  }

  async searchMedicines(term: string): Promise<Medicine[]> {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation - in production, you'd use Algolia or similar
    const q1 = query(
      collection(db, COLLECTIONS.MEDICINES),
      where('name', '>=', term),
      where('name', '<=', term + '\uf8ff'),
      limit(20)
    );
    
    const querySnapshot = await getDocs(q1);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as Medicine);
  }

  async getMedicinesByCategory(category: string): Promise<Medicine[]> {
    const q = query(
      collection(db, COLLECTIONS.MEDICINES),
      where('category', '==', category),
      orderBy('name', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as Medicine);
  }
}

export class InventoryService extends FirestoreService<InventoryItem> {
  constructor() {
    super(COLLECTIONS.INVENTORY);
  }

  async getPharmacyInventory(pharmacyId: string): Promise<InventoryItem[]> {
    // Index-free approach: only one where, filter + sort in memory
    const q = query(
      collection(db, COLLECTIONS.INVENTORY),
      where('pharmacyId', '==', pharmacyId)
    );
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as InventoryItem);
    const active = items.filter(i => (i as any).isActive === true);
    return active.sort((a: any, b: any) => {
      const da = a.lastUpdated?.toDate ? a.lastUpdated.toDate().getTime() : (a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0);
      const dbt = b.lastUpdated?.toDate ? b.lastUpdated.toDate().getTime() : (b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0);
      return dbt - da;
    });
  }

  async getLowStockItems(pharmacyId: string): Promise<InventoryItem[]> {
    const allItems = await this.getPharmacyInventory(pharmacyId);
    return allItems.filter(item => item.quantity <= item.lowStockThreshold);
  }

  async updateStock(itemId: string, quantity: number): Promise<void> {
    await this.update(itemId, { quantity, lastUpdated: new Date() });
  }

  async bulkUpdateInventory(items: Partial<InventoryItem>[]): Promise<void> {
    const batch = writeBatch(db);
    
    items.forEach((item) => {
      if (item.id) {
        const docRef = doc(db, COLLECTIONS.INVENTORY, item.id);
        batch.update(docRef, { ...item, lastUpdated: Timestamp.now() });
      }
    });

    await batch.commit();
  }
}

// Audit service for appointments
export class AppointmentAuditService {
  async record(event: {
    appointmentId: string;
    userId: string;
    action: 'book' | 'reschedule' | 'cancel' | 'status_change';
    timestamp?: Date;
    details?: Record<string, any>;
    previous?: Partial<Appointment>;
    next?: Partial<Appointment>;
  }): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.APPOINTMENT_AUDITS), {
      appointmentId: event.appointmentId,
      userId: event.userId,
      action: event.action,
      timestamp: Timestamp.now(),
      details: event.details || null,
      previous: event.previous || null,
      next: event.next || null,
    });
    return docRef.id;
  }
}

export class ChatService {
  async getChatSession(userId: string): Promise<ChatSession | null> {
    // Index-free approach: single where, filter + sort in memory
    const q = query(
      collection(db, COLLECTIONS.CHAT_SESSIONS),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const sessions = querySnapshot.docs
      .map(d => ({ id: d.id, ...d.data() }) as any)
      .filter(s => s.isActive === true)
      .sort((a: any, b: any) => {
        const da = a.startedAt?.toDate ? a.startedAt.toDate().getTime() : (a.startedAt ? new Date(a.startedAt).getTime() : 0);
        const dbt = b.startedAt?.toDate ? b.startedAt.toDate().getTime() : (b.startedAt ? new Date(b.startedAt).getTime() : 0);
        return dbt - da;
      });
    return sessions[0] ? (sessions[0] as ChatSession) : null;
  }

  async createChatSession(userId: string): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.CHAT_SESSIONS), {
      userId,
      startedAt: Timestamp.now(),
      isActive: true,
      urgencyLevel: 'low'
    });
    return docRef.id;
  }

  async addMessage(sessionId: string, message: Omit<ChatMessage, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.CHAT_MESSAGES), {
      ...message,
      sessionId,
      timestamp: Timestamp.now()
    });
    return docRef.id;
  }

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    // Index-free approach: avoid orderBy, sort in memory
    const q = query(
      collection(db, COLLECTIONS.CHAT_MESSAGES),
      where('sessionId', '==', sessionId)
    );
    const querySnapshot = await getDocs(q);
    const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
    return msgs
      .sort((a: any, b: any) => {
        const da = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const dbt = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return da - dbt; // asc
      }) as ChatMessage[];
  }

  async clearSession(sessionId: string, options: { userId?: string } = {}): Promise<void> {
    const { userId } = options;

    const messagesQuery = query(
      collection(db, COLLECTIONS.CHAT_MESSAGES),
      where('sessionId', '==', sessionId)
    );
    const snapshot = await getDocs(messagesQuery);

    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }

    const sessionRef = doc(db, COLLECTIONS.CHAT_SESSIONS, sessionId);
    const updateData: Record<string, any> = {
      isActive: false,
      endedAt: Timestamp.now(),
      urgencyLevel: 'low',
    };

    if (userId) {
      updateData.lastClearedBy = userId;
    }

    try {
      await updateDoc(sessionRef, updateData);
    } catch (error) {
      console.warn('Failed to update chat session status after clearing:', error);
    }
  }

  subscribeToMessages(sessionId: string, callback: (messages: ChatMessage[]) => void): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.CHAT_MESSAGES),
      where('sessionId', '==', sessionId)
    );
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as any)
        .sort((a: any, b: any) => {
          const da = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
          const dbt = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
          return da - dbt;
        }) as ChatMessage[];
      callback(messages);
    });
  }
}

// Export service instances
export const userService = new UserService();
export const appointmentService = new AppointmentService();
export const healthRecordService = new HealthRecordService();
export const medicineService = new MedicineService();
export const inventoryService = new InventoryService();
export const healthRecordCommentService = new HealthRecordCommentService();
export const chatService = new ChatService();
export const appointmentAuditService = new AppointmentAuditService();
