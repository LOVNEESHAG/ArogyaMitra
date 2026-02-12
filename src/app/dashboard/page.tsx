"use client";

import { useUserRole } from "@/hooks/use-user-role";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, FileText, MessageCircle, Video, Users, Pill, BarChart, Plus, Clock, ArrowRight, Stethoscope, UserCheck, ClipboardList, Activity, RefreshCcw, Shield, UserCog } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";

interface DashboardStats {
  upcomingAppointments: number;
  totalRecords: number;
  completedConsultations: number;
}

interface RecentActivity {
  id: string;
  type: 'appointment' | 'record' | 'consultation';
  title: string;
  description: string;
  date: Date;
}

type AdminDashboardUser = {
  id: string;
  uid?: string;
  displayName?: string;
  email?: string;
  role: string;
  createdAt?: string | number | Date;
  isActive?: boolean;
  isVerified?: boolean;
  lastLoginAt?: string | number | Date;
};

type AdminUserStats = {
  total: number;
  patients: number;
  doctors: number;
  pharmacies: number;
  admins: number;
  verified: number;
  pending: number;
  active: number;
  suspended: number;
  newThisMonth: number;
};

type AdminUserAction = "verify" | "suspend" | "activate" | "changeRole";

function safeToDate(input: any): Date {
  if (!input) return new Date(NaN);
  if (typeof input === 'object') {
    if ((input as any).toDate && typeof (input as any).toDate === 'function') {
      return (input as any).toDate();
    }
    const seconds = (input as any).seconds ?? (input as any)._seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000);
    }
  }
  return new Date(input as any);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function withinDoctorJoinWindow(scheduledAt: Date, durationMin = 30) {
  const startBufferMs = 10 * 60 * 1000;
  const endBufferMs = 10 * 60 * 1000;
  const start = new Date(new Date(scheduledAt).getTime() - startBufferMs);
  const end = new Date(new Date(scheduledAt).getTime() + durationMin * 60000 + endBufferMs);
  const now = new Date();
  return now >= start && now <= end;
}

function getInitials(value?: string | null) {
  if (!value) return "";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || value.slice(0, 2).toUpperCase();
}

function formatDate(value?: string | number | Date) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatTemplateString(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((acc, [key, val]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val)), template);
}

export default function Dashboard() {
  const { role, loading, user } = useUserRole();
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({
    upcomingAppointments: 0,
    totalRecords: 0,
    completedConsultations: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [doctorAppointments, setDoctorAppointments] = useState<any[]>([]);
  const [doctorRecords, setDoctorRecords] = useState<any[]>([]);
  const [doctorLoading, setDoctorLoading] = useState<boolean>(false);
  const [adminStats, setAdminStats] = useState<AdminUserStats | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminDashboardUser[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminStatsLoading, setAdminStatsLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminFilterRole, setAdminFilterRole] = useState("");
  const [adminFilterStatus, setAdminFilterStatus] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminActionMessage, setAdminActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const adminRoleFilters = [
    { value: "", label: t("dashboard.admin.filter.roleAll") },
    { value: "patient", label: t("dashboard.admin.filter.rolePatients") },
    { value: "doctor", label: t("dashboard.admin.filter.roleDoctors") },
    { value: "pharmacyOwner", label: t("dashboard.admin.filter.rolePharmacies") },
    { value: "admin", label: t("dashboard.admin.filter.roleAdmins") },
  ];

  const adminStatusFilters = [
    { value: "", label: t("dashboard.admin.filter.statusAll") },
    { value: "verified", label: t("dashboard.admin.filter.statusVerified") },
    { value: "pending", label: t("dashboard.admin.filter.statusPending") },
    { value: "active", label: t("dashboard.admin.filter.statusActive") },
    { value: "suspended", label: t("dashboard.admin.filter.statusSuspended") },
  ];

  const adminRoleLabels: Record<string, string> = {
    patient: t("roles.patient"),
    doctor: t("roles.doctor"),
    pharmacyOwner: t("roles.pharmacyOwner"),
    admin: t("roles.admin"),
  };

  useEffect(() => {
    async function fetchStats() {
      if (!user?.uid || role !== 'patient') return;
      
      try {
        // Fetch real appointment statistics
        const appointmentsRes = await fetch(`/api/appointments?role=patient`, {
          credentials: 'include'
        });
        
        if (appointmentsRes.ok) {
          const appointmentsData = await appointmentsRes.json();
          const appointments = appointmentsData.data || [];
          
          const upcoming = appointments.filter((apt: any) => 
            apt.status === 'scheduled' && new Date(apt.scheduledAt) > new Date()
          ).length;
          
          const completed = appointments.filter((apt: any) => 
            apt.status === 'completed'
          ).length;
          
          setStats(prev => ({
            ...prev,
            upcomingAppointments: upcoming,
            completedConsultations: completed
          }));
          
          // Build recent activity from appointments
          const activity: RecentActivity[] = appointments
            .slice(0, 3) // Only show latest 3
            .map((apt: any) => ({
              id: apt.id,
              type: 'appointment' as const,
              title: `Appointment with Dr. ${apt.doctorName || 'Doctor'}`,
              description: new Date(apt.scheduledAt) > new Date() ? 
                `${new Date(apt.scheduledAt).toLocaleDateString()} at ${new Date(apt.scheduledAt).toLocaleTimeString()}` :
                `${apt.status === 'completed' ? 'Completed' : 'Status: ' + apt.status}`,
              date: new Date(apt.scheduledAt)
            }));
          
          setRecentActivity(activity);
        }
        
        // Fetch health records count
        const recordsRes = await fetch('/api/health-records', {
          credentials: 'include'
        });
        
        if (recordsRes.ok) {
          const recordsData = await recordsRes.json();
          const records = recordsData.data || [];
          
          setStats(prev => ({
            ...prev,
            totalRecords: records.length
          }));
        }
        
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    }
    
    fetchStats();
  }, [user?.uid, role]);

  useEffect(() => {
    if (!user?.uid || role !== 'doctor') return;

    let isMounted = true;
    const fetchDoctorData = async () => {
      setDoctorLoading(true);
      try {
        const [appointmentsRes, recordsRes] = await Promise.all([
          fetch('/api/appointments?role=doctor', { credentials: 'include' }),
          fetch('/api/health-records?role=doctor', { credentials: 'include' })
        ]);

        if (appointmentsRes.ok) {
          const appointmentData = await appointmentsRes.json();
          const itemsRaw = (appointmentData.data || [])
            .map((apt: any) => ({ ...apt, __when: safeToDate(apt.scheduledAt) }));
          const byId = new Map<string, any>();
          for (const apt of itemsRaw) {
            if (apt && apt.id) byId.set(apt.id, apt);
          }
          if (isMounted) {
            setDoctorAppointments(Array.from(byId.values()));
          }
        } else if (isMounted) {
          setDoctorAppointments([]);
        }

        if (recordsRes.ok) {
          const recordsData = await recordsRes.json();
          if (isMounted) {
            setDoctorRecords(Array.isArray(recordsData.data) ? recordsData.data : []);
          }
        } else if (isMounted) {
          setDoctorRecords([]);
        }
      } catch (error) {
        console.warn('Failed to load doctor dashboard data', error);
        if (isMounted) {
          setDoctorAppointments([]);
          setDoctorRecords([]);
        }
      } finally {
        if (isMounted) setDoctorLoading(false);
      }
    };

    void fetchDoctorData();
    return () => { isMounted = false; };
  }, [user?.uid, role]);

  const doctorUpcoming = useMemo(() => {
    if (role !== 'doctor') return [] as any[];
    return doctorAppointments
      .filter((apt) => apt.__when instanceof Date && !isNaN(apt.__when) && ['scheduled','confirmed','in-progress'].includes(apt.status))
      .sort((a, b) => (a.__when as Date).getTime() - (b.__when as Date).getTime());
  }, [role, doctorAppointments]);

  const doctorToday = useMemo(() => {
    if (role !== 'doctor') return [] as any[];
    const today = new Date();
    return doctorUpcoming.filter((apt) => isSameDay(apt.__when as Date, today));
  }, [role, doctorUpcoming]);

  const nextAppointment = doctorUpcoming.length > 0 ? doctorUpcoming[0] : null;

  const doctorUniquePatients = useMemo(() => {
    if (role !== 'doctor') return 0;
    const ids = new Set<string>();
    doctorAppointments.forEach((apt) => {
      if (apt?.patientId) ids.add(apt.patientId);
    });
    return ids.size;
  }, [role, doctorAppointments]);

  const recentDoctorRecords = useMemo(() => {
    if (role !== 'doctor') return [] as any[];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return doctorRecords
      .map((record) => ({ ...record, __when: safeToDate(record.recordDate || record.uploadedAt) }))
      .filter((record) => record.__when instanceof Date && !isNaN(record.__when) && record.__when >= sevenDaysAgo)
      .sort((a, b) => (b.__when as Date).getTime() - (a.__when as Date).getTime());
  }, [role, doctorRecords]);

  const loadAdminStats = useCallback(async () => {
    setAdminStatsLoading(true);
    try {
      const res = await fetch('/api/users', { method: 'PATCH', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load user stats');
      const data = await res.json();
      setAdminStats(data?.data ?? null);
    } catch (error: any) {
      console.error('Failed to load admin stats', error);
      setAdminActionMessage({ type: 'error', text: t('dashboard.admin.error.loadStats') });
      setAdminStats(null);
    } finally {
      setAdminStatsLoading(false);
    }
  }, [t]);

  const loadAdminUsers = useCallback(async () => {
    setAdminUsersLoading(true);
    setAdminError(null);
    try {
      const params = new URLSearchParams();
      if (adminFilterRole) params.set('role', adminFilterRole);
      if (adminFilterStatus) params.set('status', adminFilterStatus);
      const res = await fetch(`/api/users?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to load users');
      }
      const data = await res.json();
      setAdminUsers(Array.isArray(data?.data) ? data.data : []);
    } catch (error: any) {
      console.error('Failed to load admin users', error);
      setAdminUsers([]);
      setAdminError(t('dashboard.admin.error.loadUsers'));
    } finally {
      setAdminUsersLoading(false);
    }
  }, [adminFilterRole, adminFilterStatus, t]);

  useEffect(() => {
    if (loading || role !== 'admin') return;
    void loadAdminStats();
    void loadAdminUsers();
  }, [loading, role, loadAdminStats, loadAdminUsers]);

  useEffect(() => {
    if (loading || role !== 'admin') return;
    void loadAdminUsers();
  }, [loading, role, loadAdminUsers]);

  const filteredAdminUsers = useMemo(() => {
    if (!adminSearch) return adminUsers;
    const term = adminSearch.trim().toLowerCase();
    return adminUsers.filter((user) => {
      const fields = [user.displayName ?? '', user.email ?? '', user.role ?? ''];
      return fields.some((field) => field.toLowerCase().includes(term));
    });
  }, [adminUsers, adminSearch]);

  const handleAdminUserAction = useCallback(async (
    userId: string,
    action: AdminUserAction,
    payload: Record<string, any> = {},
    successMessage?: string
  ) => {
    setAdminActionMessage(null);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, ...payload })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Action failed');
      }
      const data = await res.json();
      setAdminActionMessage({ type: 'success', text: successMessage || data?.message || t('dashboard.admin.filter.refresh') });
      await Promise.all([loadAdminStats(), loadAdminUsers()]);
    } catch (error: any) {
      console.error('Admin action failed', error);
      setAdminActionMessage({ type: 'error', text: t('dashboard.admin.error.updateUser') });
    }
  }, [loadAdminStats, loadAdminUsers, t]);

  const handleAdminRoleChange = useCallback(async (userId: string, newRole: string) => {
    if (!newRole) return;
    const label = adminRoleLabels[newRole] || newRole;
    const formatted = formatTemplateString(t('dashboard.admin.actions.roleUpdated', 'User role updated to {role}'), { role: label });
    await handleAdminUserAction(userId, 'changeRole', { role: newRole }, formatted);
  }, [adminRoleLabels, handleAdminUserAction, t]);

  const groupedRecords = useMemo(() => {
    if (role !== 'doctor') return [] as { patientId: string; patientName: string; items: any[] }[];
    const groups = new Map<string, { patientId: string; patientName: string; items: any[] }>();
    doctorRecords.forEach((record: any) => {
      const patientId = record.patientId || 'unknown';
      const patientName = record.patientName || 'Patient';
      if (!groups.has(patientId)) {
        groups.set(patientId, { patientId, patientName, items: [] });
      }
      groups.get(patientId)?.items.push({ ...record, __when: safeToDate(record.recordDate || record.uploadedAt) });
    });
    return Array.from(groups.values())
      .map((group) => ({ ...group, items: group.items.sort((a, b) => (b.__when as Date).getTime() - (a.__when as Date).getTime()) }))
      .sort((a, b) => a.patientName.localeCompare(b.patientName));
  }, [role, doctorRecords]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getUserGreeting = () => {
    const name = user?.displayName || user?.email || t('roles.user');
    const hour = new Date().getHours();
    if (hour < 12) return formatTemplateString(t('dashboard.greeting.morning', 'Good morning, {name}!'), { name });
    if (hour < 17) return formatTemplateString(t('dashboard.greeting.afternoon', 'Good afternoon, {name}!'), { name });
    return formatTemplateString(t('dashboard.greeting.evening', 'Good evening, {name}!'), { name });
  };

  const getRoleDisplayName = () => {
    switch (role) {
      case 'patient': return t('roles.patient');
      case 'doctor': return t('roles.doctor');
      case 'pharmacyOwner': return t('roles.pharmacyOwner');
      case 'admin': return t('roles.admin');
      default: return t('roles.user');
    }
  };

  if (role === 'doctor') {
    const greetingName = user?.displayName || user?.email || t('roles.doctor');
    const nextWhen = nextAppointment ? safeToDate(nextAppointment.__when || nextAppointment.scheduledAt) : null;
    const nextJoinEnabled = nextWhen ? withinDoctorJoinWindow(nextWhen, nextAppointment?.duration || 30) : false;

    const scheduleList = (doctorToday.length > 0 ? doctorToday : doctorUpcoming).slice(0, 6);
    const recentGroupedRecords = groupedRecords.slice(0, 4);

    return (
      <div className="space-y-8">
        <section>
          <h1 className="text-3xl font-bold text-primary">{formatTemplateString(t('dashboard.doctor.greeting', 'Hello, {name}!'), { name: greetingName })}</h1>
          <p className="text-muted-foreground mt-1">{t('dashboard.doctor.subtitle')}</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="flex items-center p-6">
              <Stethoscope className="h-8 w-8 text-accent mr-4" />
              <div>
                <p className="text-2xl font-bold">{doctorToday.length}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.doctor.stats.today')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <UserCheck className="h-8 w-8 text-accent mr-4" />
              <div>
                <p className="text-2xl font-bold">{doctorUniquePatients}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.doctor.stats.activePatients')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <Activity className="h-8 w-8 text-accent mr-4" />
              <div>
                <p className="text-2xl font-bold">{recentDoctorRecords.length}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.doctor.stats.newRecords')}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.doctor.quickActions')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button asChild className="h-auto p-4 flex-col space-y-2">
              <Link href="/dashboard/appointments">
                <Calendar className="h-6 w-6" />
                <span>{t('dashboard.doctor.actions.manageAppointments')}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Link href="/dashboard/health-records">
                <FileText className="h-6 w-6" />
                <span>{t('dashboard.doctor.actions.patientRecords')}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Link href="/dashboard/profile">
                <Users className="h-6 w-6" />
                <span>{t('dashboard.doctor.actions.updateProfile')}</span>
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle>{t('dashboard.doctor.schedule.title')}</CardTitle>
                <CardDescription>{doctorToday.length > 0 ? t('dashboard.doctor.schedule.today') : t('dashboard.doctor.schedule.upcoming')}</CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/appointments">{t('dashboard.doctor.schedule.viewAll')}</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {doctorLoading && (
                <div className="space-y-2">
                  <div className="h-16 rounded-md bg-muted animate-pulse" />
                  <div className="h-16 rounded-md bg-muted animate-pulse" />
                  <div className="h-16 rounded-md bg-muted animate-pulse" />
                </div>
              )}
              {!doctorLoading && scheduleList.length === 0 && (
                <div className="text-sm text-muted-foreground">{t('dashboard.doctor.schedule.empty')}</div>
              )}
              {scheduleList.map((apt) => {
                const when = safeToDate(apt.__when || apt.scheduledAt);
                const patientName: string = apt.patientName || (apt.patientId?.slice?.(0, 8) || t('roles.patient'));
                const patientPhoto: string | null = apt.patientPhoto || null;
                const initials = getInitials(patientName) || t('roles.patient').slice(0, 2).toUpperCase();
                return (
                  <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md p-3">
                    <div className="flex items-center gap-3">
                      {patientPhoto ? (
                        <img src={patientPhoto} alt={patientName} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {initials}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{patientName}</p>
                        <p className="text-xs text-muted-foreground">{when.toLocaleDateString()} • {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {apt.status}</p>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-0 flex items-center gap-2">
                      <Link href={`/dashboard/appointments?focus=${apt.id}`} className="text-xs text-primary hover:underline">{t('dashboard.doctor.schedule.viewDetails')}</Link>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.doctor.next.title')}</CardTitle>
              <CardDescription>{nextWhen ? nextWhen.toLocaleString() : t('dashboard.doctor.next.none')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {nextAppointment ? (
                <>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-accent" />
                    <div>
                      <p className="font-semibold">{nextAppointment.patientName || t('roles.patient')}</p>
                      <p className="text-sm text-muted-foreground">{t('dashboard.doctor.next.statusLabel')}: {nextAppointment.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{nextWhen?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <ClipboardList className="h-4 w-4" />
                    <span>{nextAppointment.reasonForVisit || t('dashboard.common.consultation')}</span>
                  </div>
                  <Button asChild className="w-full" disabled={!nextJoinEnabled}>
                    <Link href={`/dashboard/call/${nextAppointment.id}?call=${nextAppointment.callType || 'video'}`}>
                      {nextJoinEnabled ? t('dashboard.doctor.next.join') : t('dashboard.doctor.next.joinDisabled')}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/appointments">{t('dashboard.doctor.next.manage')}</Link>
                  </Button>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">{t('dashboard.doctor.next.noAppointments')}</div>
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.doctor.records.title')}</CardTitle>
            <CardDescription>{t('dashboard.doctor.records.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {doctorLoading && (
              <div className="space-y-2">
                <div className="h-14 rounded-md bg-muted animate-pulse" />
                <div className="h-14 rounded-md bg-muted animate-pulse" />
                <div className="h-14 rounded-md bg-muted animate-pulse" />
              </div>
            )}
            {!doctorLoading && groupedRecords.length === 0 && (
              <div className="text-sm text-muted-foreground">{t('dashboard.doctor.records.empty')}</div>
            )}
            {!doctorLoading && groupedRecords.length > 0 && (
              <div className="space-y-4">
                {recentGroupedRecords.map((group) => (
                  <div key={group.patientId} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {getInitials(group.patientName) || t('roles.patient').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{group.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.items.length === 1
                            ? formatTemplateString(t('dashboard.doctor.records.countSingular', '{count} record'), { count: group.items.length })
                            : formatTemplateString(t('dashboard.doctor.records.countPlural', '{count} records'), { count: group.items.length })}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {group.items.slice(0, 3).map((record: any) => {
                        const when = safeToDate(record.__when || record.recordDate || record.uploadedAt);
                        return (
                          <div key={record.id} className="flex items-start justify-between text-sm border rounded-md px-3 py-2">
                            <div>
                              <p className="font-medium">{record.title || record.fileName || t('dashboard.common.unnamed')}</p>
                              <p className="text-xs text-muted-foreground">{record.type || 'record'} • {when instanceof Date && !isNaN(when.getTime()) ? when.toLocaleDateString() : t('dashboard.common.unknownDate')}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">{record.fileSize ? `${Math.round(record.fileSize / 1024)} KB` : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/health-records">{t('dashboard.doctor.records.open')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Patient Dashboard
  if (role === 'patient') {
    return (
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-primary">{getUserGreeting()}</h1>
          <p className="text-muted-foreground mt-1">Welcome to your ArogyaMitra dashboard</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="flex items-center p-6">
              <Calendar className="h-8 w-8 text-accent mr-4" />
              <div>
                <p className="text-2xl font-bold">{stats.upcomingAppointments}</p>
                <p className="text-sm text-muted-foreground">Upcoming Appointments</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <FileText className="h-8 w-8 text-accent mr-4" />
              <div>
                <p className="text-2xl font-bold">{stats.totalRecords}</p>
                <p className="text-sm text-muted-foreground">Health Records</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <Video className="h-8 w-8 text-accent mr-4" />
              <div>
                <p className="text-2xl font-bold">{stats.completedConsultations}</p>
                <p className="text-sm text-muted-foreground">Consultations</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild className="h-auto p-4 flex-col space-y-2">
              <Link href="/dashboard/appointments">
                <Calendar className="h-6 w-6" />
                <span>Book Appointment</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Link href="/dashboard/health-records">
                <FileText className="h-6 w-6" />
                <span>Health Records</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Link href="/dashboard/ai-chat">
                <MessageCircle className="h-6 w-6" />
                <span>AI Health Assistant</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Link href="/dashboard/profile">
                <Users className="h-6 w-6" />
                <span>My Profile</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.patient.recent.title')}</CardTitle>
            <CardDescription>{t('dashboard.patient.recent.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {activity.type === 'appointment' && <Calendar className="h-4 w-4 text-muted-foreground" />}
                      {activity.type === 'record' && <FileText className="h-4 w-4 text-muted-foreground" />}
                      {activity.type === 'consultation' && <Video className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t('dashboard.patient.recent.empty.title')}</p>
                  <p className="text-sm">{t('dashboard.patient.recent.empty.subtitle')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generic dashboard for other roles
  if (role === 'admin') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-primary">{t('dashboard.admin.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.admin.subtitle')}</p>
        </div>

        {adminActionMessage && (
          <div
            className={`rounded-md border p-3 text-sm ${
              adminActionMessage.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {adminActionMessage.text}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.admin.stats.total')}</CardTitle>
              <Users className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.total ?? '—'}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.admin.stats.totalHint')}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.admin.stats.verified')}</CardTitle>
              <UserCheck className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.verified ?? '—'}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.admin.stats.verifiedHint')}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.admin.stats.active')}</CardTitle>
              <Shield className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.active ?? '—'}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.admin.stats.activeHint')}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.admin.stats.new')}</CardTitle>
              <UserCog className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.newThisMonth ?? '—'}</div>
              <p className="text-xs text-muted-foreground">{t('dashboard.admin.stats.newHint')}</p>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>{t('dashboard.admin.directory.title')}</CardTitle>
            <CardDescription>{t('dashboard.admin.directory.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('dashboard.admin.filter.role')}</label>
                  <select
                    value={adminFilterRole}
                    onChange={(event) => setAdminFilterRole(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {adminRoleFilters.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('dashboard.admin.filter.status')}</label>
                  <select
                    value={adminFilterStatus}
                    onChange={(event) => setAdminFilterStatus(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {adminStatusFilters.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('dashboard.admin.filter.search')}</label>
                  <Input
                    value={adminSearch}
                    onChange={(event) => setAdminSearch(event.target.value)}
                    placeholder={t('dashboard.admin.filter.placeholder')}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAdminFilterRole('');
                    setAdminFilterStatus('');
                    setAdminSearch('');
                  }}
                >
                  {t('dashboard.admin.filter.clear')}
                </Button>
                <Button
                  onClick={() => {
                    void loadAdminStats();
                    void loadAdminUsers();
                  }}
                  disabled={adminStatsLoading || adminUsersLoading}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" /> {t('dashboard.admin.filter.refresh')}
                </Button>
              </div>
            </div>

            {adminError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {adminError}
              </div>
            )}

            <div className="hidden rounded-md border md:block">
              <div className="grid grid-cols-[2fr,2fr,1.5fr,1fr,1.5fr] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{t('dashboard.admin.table.header.name')}</span>
                <span>{t('dashboard.admin.table.header.email')}</span>
                <span>{t('dashboard.admin.table.header.role')}</span>
                <span>{t('dashboard.admin.table.header.status')}</span>
                <span>{t('dashboard.admin.table.header.actions')}</span>
              </div>
              {adminUsersLoading && (
                <div className="px-4 py-6 text-sm text-muted-foreground">{t('dashboard.admin.loading')}</div>
              )}
              {!adminUsersLoading && filteredAdminUsers.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground">{t('dashboard.admin.empty')}</div>
              )}
              {!adminUsersLoading && filteredAdminUsers.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr,2fr,1.5fr,1fr,1.5fr] items-center gap-4 border-b px-4 py-4 text-sm last:border-0"
                >
                  <div className="font-medium">{item.displayName || t('dashboard.common.unnamed')}</div>
                  <div className="truncate text-muted-foreground">{item.email || '—'}</div>
                  <div>
                    <select
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={item.role}
                      onChange={(event) => void handleAdminRoleChange(item.id || item.uid || '', event.target.value)}
                    >
                      {Object.keys(adminRoleLabels).map((value) => (
                        <option key={value} value={value}>
                          {adminRoleLabels[value] ?? value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${
                        item.isActive === false
                          ? 'bg-rose-100 text-rose-700'
                          : item.isVerified === false
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {item.isActive === false
                        ? t('dashboard.admin.status.suspended')
                        : item.isVerified === false
                        ? t('dashboard.admin.status.pending')
                        : t('dashboard.admin.status.active')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleAdminUserAction(item.id || item.uid || '', 'verify')}
                      disabled={item.isVerified}
                    >
                      {t('dashboard.admin.actions.verify')}
                    </Button>
                    {item.isActive ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleAdminUserAction(item.id || item.uid || '', 'suspend')}
                      >
                        {t('dashboard.admin.actions.suspend')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleAdminUserAction(item.id || item.uid || '', 'activate')}
                      >
                        {t('dashboard.admin.actions.activate')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 md:hidden">
              {adminUsersLoading && <div className="text-sm text-muted-foreground">{t('dashboard.admin.loading')}</div>}
              {!adminUsersLoading && filteredAdminUsers.length === 0 && (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  {t('dashboard.admin.empty')}
                </div>
              )}
              {!adminUsersLoading && filteredAdminUsers.map((item) => (
                <div key={item.id} className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{item.displayName || t('dashboard.common.unnamed')}</p>
                      <p className="text-xs text-muted-foreground">{item.email || '—'}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${
                        item.isActive === false
                          ? 'bg-rose-100 text-rose-700'
                          : item.isVerified === false
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {item.isActive === false
                        ? t('dashboard.admin.status.suspended')
                        : item.isVerified === false
                        ? t('dashboard.admin.status.pending')
                        : t('dashboard.admin.status.active')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('dashboard.admin.filter.role')}</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        value={item.role}
                        onChange={(event) => void handleAdminRoleChange(item.id || item.uid || '', event.target.value)}
                      >
                        {Object.keys(adminRoleLabels).map((value) => (
                          <option key={value} value={value}>
                            {adminRoleLabels[value] ?? value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatTemplateString(t('dashboard.admin.joined', 'Joined {date}'), { date: formatDate(item.createdAt) })}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleAdminUserAction(item.id || item.uid || '', 'verify')}
                      disabled={item.isVerified}
                    >
                      {t('dashboard.admin.actions.verify')}
                    </Button>
                    {item.isActive ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleAdminUserAction(item.id || item.uid || '', 'suspend')}
                      >
                        {t('dashboard.admin.actions.suspend')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleAdminUserAction(item.id || item.uid || '', 'activate')}
                      >
                        {t('dashboard.admin.actions.activate')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary">{getUserGreeting()}</h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.generic.roleLabel')} {getRoleDisplayName()}</p>
      </div>

      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.generic.title')}</h2>
          <p className="text-muted-foreground mb-6">
            {formatTemplateString(t('dashboard.generic.subtitle', 'The {role} dashboard is being built. Core features will be available soon.'), { role: getRoleDisplayName().toLowerCase() })}
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild>
              <Link href="/dashboard/profile">{t('dashboard.generic.profile')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">{t('dashboard.generic.home')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}