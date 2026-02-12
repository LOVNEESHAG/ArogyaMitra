"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, PhoneCall, Video, CheckCircle2, Stethoscope } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function AppointmentsPage() {
  return <AppointmentsView />;
}

// Tolerant date converter for values coming from Firestore via API JSON
function toDate(input: any): Date {
  if (!input) return new Date(NaN);
  // Firestore Timestamp-like
  if (typeof input === 'object') {
    // { toDate: fn }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((input as any).toDate && typeof (input as any).toDate === 'function') {
      return (input as any).toDate();
    }
    // { seconds, nanoseconds } or { _seconds, _nanoseconds }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const seconds = (input as any).seconds ?? (input as any)._seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000);
    }
  }
  // ISO string or date-compatible value
  return new Date(input as any);
}

type Doctor = { id: string; displayName?: string; name?: string; specialization?: string[] | string };
type Slot = { start: string | Date; end: string | Date };

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toLocalTimeLabel(date: Date) {
  return `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function formatTemplateString(template: string, values: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

function formatRelativeTime(date: Date, t: (key: string, fallback?: string) => string): string {
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);
  const hours = Math.round(absMs / 3600000);
  const days = Math.round(absMs / 86400000);

  if (diffMs >= 0) {
    if (minutes < 1) return t('appointments.relative.now', 'now');
    if (minutes < 60) {
      const tpl = t('appointments.relative.inMinutes', 'in {count} min');
      return tpl.replace('{count}', minutes.toString());
    }
    if (hours < 24) {
      const tpl = t('appointments.relative.inHours', 'in {count} hr');
      return tpl.replace('{count}', hours.toString());
    }
    const tpl = t('appointments.relative.inDays', 'in {count} day');
    return tpl.replace('{count}', days.toString());
  } else {
    if (minutes < 1) return t('appointments.relative.justNow', 'just now');
    if (minutes < 60) {
      const tpl = t('appointments.relative.minutesAgo', '{count} min ago');
      return tpl.replace('{count}', minutes.toString());
    }
    if (hours < 24) {
      const tpl = t('appointments.relative.hoursAgo', '{count} hr ago');
      return tpl.replace('{count}', hours.toString());
    }
    const tpl = t('appointments.relative.daysAgo', '{count} day ago');
    return tpl.replace('{count}', days.toString());
  }
}

function withinJoinWindow(scheduledAt: Date, durationMin = 30) {
  const startBufferMs = 10 * 60 * 1000; // 10 minutes before
  const endBufferMs = 10 * 60 * 1000; // 10 minutes after
  const start = new Date(new Date(scheduledAt).getTime() - startBufferMs);
  const end = new Date(new Date(scheduledAt).getTime() + durationMin * 60000 + endBufferMs);
  const now = new Date();
  return now >= start && now <= end;
}

function AppointmentsView() {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role === "doctor") {
    return <DoctorAppointmentsManager />;
  }

  return <PatientAppointmentBooking />;
}

function PatientAppointmentBooking() {
  const { t } = useTranslation();
  const today = useMemo(() => formatDate(new Date()), []);
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsMap, setDoctorsMap] = useState<Record<string, Doctor>>({});
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [booking, setBooking] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/doctors", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const list: Doctor[] = (data.data || data || []);
          setDoctors(list);
          const map: Record<string, Doctor> = {};
          for (const d of list) map[d.id] = d;
          setDoctorsMap(map);
        }
      } catch (e) {
        console.warn("Failed to load doctors", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setSlots([]);
      setSelectedSlotKey("");
      if (!selectedDoctor || !selectedDate) return;
      try {
        const params = new URLSearchParams({ doctorId: selectedDoctor, date: selectedDate });
        const res = await fetch(`/api/appointments/slots?${params.toString()}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const arr: Slot[] = (data.data || data || []).map((s: any) => ({ start: s.start, end: s.end }));
          setSlots(arr);
        }
      } catch (e) {
        console.warn("Failed to load slots", e);
      }
    })();
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/appointments?role=patient`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const now = new Date();
          const allowedUpcoming = new Set(["scheduled","confirmed","in-progress"]);
          // de-duplicate by id in case server returns duplicates
          const itemsRaw = (data.data || []).map((apt: any) => ({ ...apt, __when: toDate(apt.scheduledAt) }));
          const byId = new Map<string, any>();
          for (const apt of itemsRaw) {
            if (apt && apt.id) byId.set(apt.id, apt);
          }
          const items = Array.from(byId.values());

          const nextList = items
            .filter((apt: any) => apt.__when instanceof Date && !isNaN(apt.__when) && allowedUpcoming.has(apt.status) && apt.__when >= now)
            .sort((a: any, b: any) => a.__when.getTime() - b.__when.getTime());
          const pastList = items
            .filter((apt: any) => apt.__when instanceof Date && !isNaN(apt.__when) && (apt.__when < now || ["completed","cancelled","no-show"].includes(apt.status)))
            .sort((a: any, b: any) => b.__when.getTime() - a.__when.getTime());
          setUpcoming(nextList);
          setPast(pastList);
        }
      } catch (e) {
        console.warn("Failed to load upcoming appointments", e);
      }
    })();
  }, [booking]);

  async function book(slot: Slot) {
    if (!selectedDoctor) return;
    setBooking(true);
    setMessage("");
    try {
      const scheduledAt = new Date(typeof slot.start === 'string' ? slot.start : slot.start);
      const body = {
        doctorId: selectedDoctor,
        scheduledAt: scheduledAt.toISOString(),
        duration: 30,
        type: 'video',
        reasonForVisit: reason || t('appointments.common.consultation'),
        urgency: 'medium'
      };
      const res = await fetch('/api/appointments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || t('appointments.feedback.failure'));
      }
      setMessage(t('appointments.feedback.success'));
      setReason("");
      const data = await res.json();
      setUpcoming((prev) => {
        const map = new Map<string, any>();
        for (const p of prev) { if (p && p.id) map.set(p.id, p); }
        if (data?.data?.id) map.set(data.data.id, data.data);
        return Array.from(map.values()).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      });
    } catch (e: any) {
      setMessage(e.message || t('appointments.feedback.failure'));
    } finally {
      setBooking(false);
    }
  }

  function joinCall(apt: any, demo = false) {
    const qs = new URLSearchParams({ call: 'video' });
    if (demo) qs.set('demo', 'true');
    router.push(`/dashboard/call/${apt.id}?${qs.toString()}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t('appointments.title', 'Book Appointment')}</h1>
        <p className="text-muted-foreground">{t('appointments.subtitle', 'Select a doctor and time slot to schedule a video consultation.')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('appointments.form.title', 'Select Doctor and Date')}</CardTitle>
          <CardDescription>{t('appointments.form.description', 'Choose a doctor and pick a date to see available slots')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t('appointments.form.doctorLabel', 'Doctor')}</Label>
              <Select onValueChange={setSelectedDoctor} value={selectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder={t('appointments.form.doctorPlaceholder', 'Select a doctor')} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => {
                    const shortId = d.id.slice(0, 6);
                    const fallback = formatTemplateString(t('appointments.form.doctorFallback', 'Doctor {id}'), { id: shortId });
                    const label = d.displayName || d.name || fallback;
                    const specialization = Array.isArray(d.specialization) ? d.specialization[0] : d.specialization;
                    return (
                      <SelectItem key={d.id} value={d.id}>
                        {label}{specialization ? ` • ${specialization}` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('appointments.form.dateLabel', 'Date')}</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <div>
              <Label>{t('appointments.form.reasonLabel', 'Reason (optional)')}</Label>
              <Input placeholder={t('appointments.form.reasonPlaceholder', 'Reason for visit')} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            <Label className="mb-2 block">{t('appointments.form.slotsLabel', 'Available Slots')}</Label>
            {selectedDoctor && slots.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('appointments.form.noSlots', 'No slots available for selected date.')}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {slots.map((s, idx) => {
                const start = new Date(typeof s.start === 'string' ? s.start : s.start);
                const key = start.toISOString();
                const isSelected = selectedSlotKey === key;
                return (
                  <Button key={idx} variant={isSelected ? "default" : "outline"} disabled={booking} onClick={() => setSelectedSlotKey(key)} className="justify-start">
                    <Clock className="h-4 w-4 mr-2" /> {toLocalTimeLabel(start)}
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Button
                onClick={() => {
                  const match = slots.find((s) => {
                    const start = new Date(typeof s.start === 'string' ? s.start : s.start);
                    return start.toISOString() === selectedSlotKey;
                  });
                  if (match) void book(match);
                }}
                disabled={!selectedDoctor || !selectedSlotKey || booking}
              >
                {t('appointments.form.bookButton')}
              </Button>
              {selectedSlotKey && (
                <span className="text-sm text-muted-foreground">
                  {t('appointments.form.selectedSlot', { time: toLocalTimeLabel(new Date(selectedSlotKey)) })}
                </span>
              )}
            </div>
            {message && <p className="text-sm mt-3">{message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('appointments.section.upcoming.title', 'Upcoming Appointments')}</CardTitle>
          <CardDescription>{t('appointments.section.upcoming.description', 'Your scheduled and upcoming consultations')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 && (
            <div className="text-sm text-muted-foreground">{t('appointments.section.upcoming.empty', 'No upcoming appointments.')}</div>
          )}
          {upcoming.map((apt) => {
            const when = toDate(apt.scheduledAt) || apt.__when || new Date(NaN);
            const d = doctorsMap[apt.doctorId as string];
            const shortId = apt.doctorId?.slice?.(0,6) || '';
            const fallback = formatTemplateString(t('appointments.form.doctorFallback', 'Doctor {id}'), { id: shortId });
            const doctorName = d?.displayName || d?.name || fallback;
            const canJoin = apt.status === 'in-progress' || withinJoinWindow(when, apt.duration || 30);
            const doctorPhoto: string | null = (d as any)?.photoURL || null;
            const initials = (doctorName || 'D').split(/\s+/).map((s: string) => s[0]).join('').slice(0,2).toUpperCase();
            const meta = formatTemplateString(t('appointments.patient.meta', '{relative} • {date} {time}'), {
              relative: formatRelativeTime(when, t),
              date: when.toLocaleDateString(),
              time: toLocalTimeLabel(when)
            });
            const details = formatTemplateString(t('appointments.patient.details', 'Doctor: {doctor} • Status: {status}'), {
              doctor: doctorName,
              status: apt.status
            });
            return (
              <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md p-3">
                <div className="flex items-center gap-3">
                  {doctorPhoto ? (
                    <img src={doctorPhoto} alt={doctorName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {initials}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{meta}</div>
                    <div className="text-xs text-muted-foreground">{details}</div>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Button size="sm" className="w-full sm:w-auto" onClick={() => joinCall(apt, false)} disabled={!canJoin}>
                    <Video className="h-4 w-4 mr-1" /> {apt.status === 'in-progress' ? t('appointments.section.upcoming.rejoin', 'Rejoin') : t('appointments.section.upcoming.joinCall', 'Join Call')}
                  </Button>
                  <Button size="sm" className="w-full sm:w-auto" variant="outline" onClick={() => joinCall(apt, true)}>
                    <PhoneCall className="h-4 w-4 mr-1" /> {t('appointments.section.upcoming.joinNow', 'Join Now')}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('appointments.section.past.title')}</CardTitle>
          <CardDescription>{t('appointments.section.past.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {past.length === 0 && (
            <div className="text-sm text-muted-foreground">{t('appointments.section.past.empty')}</div>
          )}
          {past.map((apt) => {
            const when = toDate(apt.scheduledAt) || apt.__when || new Date(NaN);
            const d = doctorsMap[apt.doctorId as string];
            const shortId = apt.doctorId?.slice?.(0,6) || '';
            const fallback = formatTemplateString(t('appointments.form.doctorFallback', 'Doctor {id}'), { id: shortId });
            const doctorName = d?.displayName || d?.name || fallback;
            const doctorPhoto: string | null = (d as any)?.photoURL || null;
            const initials = (doctorName || 'D').split(/\s+/).map((s: string) => s[0]).join('').slice(0,2).toUpperCase();
            const meta = formatTemplateString(t('appointments.patient.meta', '{relative} • {date} {time}'), {
              relative: formatRelativeTime(when, t),
              date: when.toLocaleDateString(),
              time: toLocalTimeLabel(when)
            });
            const details = formatTemplateString(t('appointments.patient.details', 'Doctor: {doctor} • Status: {status}'), {
              doctor: doctorName,
              status: apt.status
            });
            return (
              <div key={apt.id} className="flex items-center justify-between border rounded-md p-3">
                <div className="flex items-center gap-3">
                  {doctorPhoto ? (
                    <img src={doctorPhoto} alt={doctorName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {initials}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{meta}</div>
                    <div className="text-xs text-muted-foreground">{details}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function DoctorAppointmentsManager() {
  const today = useMemo(() => formatDate(new Date()), []);
  const router = useRouter();
  const [date, setDate] = useState<string>(today);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);

  async function load() {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ role: 'doctor', date });
      const res = await fetch(`/api/appointments?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const itemsRaw = (data.data || [])
          .map((apt: any) => ({ ...apt, __when: toDate(apt.scheduledAt) }));
        const byId = new Map<string, any>();
        for (const apt of itemsRaw) { if (apt && apt.id) byId.set(apt.id, apt); }
        const list = Array.from(byId.values())
          .sort((a: any, b: any) => a.__when.getTime() - b.__when.getTime());
        setAppointments(list);
      }
    } catch (e) {
      console.warn('Failed to load doctor appointments', e);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => { load(); }, [date]);

  function startCall(apt: any, voice = false) {
    const qs = new URLSearchParams({ call: voice ? 'voice' : 'video' });
    router.push(`/dashboard/call/${apt.id}?${qs.toString()}`);
  }

  async function endCall(apt: any) {
    try {
      const res = await fetch(`/api/appointments/${apt.id}/end-call`, { method: 'POST', credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setAppointments((prev) => prev.map((p) => p.id === apt.id ? { ...p, status: 'completed', callEndTime: data.callEndTime, callDuration: data.callDurationMinutes } : p));
    } catch (e) {
      console.warn('Failed to end call', e);
    }
  }

  async function markCompleted(apt: any) {
    try {
      const res = await fetch(`/api/appointments`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: apt.id, status: 'completed', notes: 'Completed via dashboard' })
      });
      if (!res.ok) return;
      setAppointments((prev) => prev.map((p) => p.id === apt.id ? { ...p, status: 'completed' } : p));
    } catch (e) {
      console.warn('Failed to update status', e);
    }
  }

  // Doctor: View patient health records (metadata-only)
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);

  async function viewRecords(apt: any) {
    setRecordsOpen(true);
    setRecords([]);
    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/patients/${apt.patientId}/records`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data.records) ? data.records : []);
      }
    } catch (e) {
      console.warn('Failed to load patient records', e);
    } finally {
      setRecordsLoading(false);
    }
  }

  // Split into upcoming and past blocks for clarity (desktop and mobile)
  const now = new Date();
  const allowedUpcoming = new Set(["scheduled","confirmed","in-progress"]);
  const upcomingApts = appointments
    .filter((apt: any) => apt.__when instanceof Date && !isNaN(apt.__when) && allowedUpcoming.has(apt.status) && apt.__when >= now)
    .sort((a: any, b: any) => a.__when.getTime() - b.__when.getTime());
  const pastApts = appointments
    .filter((apt: any) => apt.__when instanceof Date && !isNaN(apt.__when) && (apt.__when < now || ["completed","cancelled","no-show"].includes(apt.status)))
    .sort((a: any, b: any) => b.__when.getTime() - a.__when.getTime());

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4">
        <div className="grow">
          <h1 className="text-2xl font-bold">Today's Appointments</h1>
          <p className="text-muted-foreground">Manage and start your consultations.</p>
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:items-end bg-muted/50 border rounded-md p-3">
          <div className="w-full sm:w-auto">
            <Label className="text-sm font-medium">Date</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 bg-white border-2 border-foreground/20 hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>
          </div>
          <div className="w-full sm:w-auto sm:self-end">
            <Button className="w-full sm:w-auto" variant="default" onClick={load} disabled={loadingList}>Refresh</Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>For {date}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingApts.length === 0 && (
            <div className="text-sm text-muted-foreground">No upcoming appointments for selected date.</div>
          )}
          {upcomingApts.map((apt) => {
            const when = toDate(apt.scheduledAt) || apt.__when || new Date(NaN);
            const patientName: string = (apt as any).patientName || (apt.patientId?.slice?.(0, 8) || 'Unknown');
            const patientPhoto: string | null = (apt as any).patientPhoto || null;
            const initials = (patientName || 'U').split(/\s+/).map((s: string) => s[0]).join('').slice(0,2).toUpperCase();
            return (
              <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md p-3">
                <div className="flex items-center gap-3">
                  {patientPhoto ? (
                    <img src={patientPhoto} alt={patientName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {initials}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{patientName}</div>
                    <div className="text-xs text-muted-foreground">{when.toLocaleDateString()} {toLocalTimeLabel(when)} • Status: {apt.status}</div>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  {apt.status !== 'in-progress' && (
                    <>
                      {/* Scheduled join: enabled only within join window */}
                      <Button
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => startCall(apt, false)}
                        disabled={!withinJoinWindow(when, apt.duration || 30)}
                      >
                        <Video className="h-4 w-4 mr-1" /> Join Call
                      </Button>
                      {/* Always-available join now */}
                      <Button
                        size="sm"
                        className="w-full sm:w-auto"
                        variant="outline"
                        onClick={() => startCall(apt, false)}
                      >
                        <PhoneCall className="h-4 w-4 mr-1" /> Join Now
                      </Button>
                    </>
                  )}
                  {apt.status === 'in-progress' && (
                    <>
                      <Button size="sm" className="w-full sm:w-auto" onClick={() => startCall(apt, (apt.callType || 'video') === 'voice')}>
                        <Video className="h-4 w-4 mr-1" /> Rejoin
                      </Button>
                      <Button size="sm" className="w-full sm:w-auto" variant="destructive" onClick={() => endCall(apt)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> End Call
                      </Button>
                    </>
                  )}
                  {apt.status !== 'completed' && apt.status !== 'in-progress' && (
                    <Button size="sm" className="w-full sm:w-auto" variant="outline" onClick={() => markCompleted(apt)}>
                      Mark Completed
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past Appointments</CardTitle>
          <CardDescription>For {date}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pastApts.length === 0 && (
            <div className="text-sm text-muted-foreground">No past appointments for selected date.</div>
          )}
          {pastApts.map((apt) => {
            const when = toDate(apt.scheduledAt) || apt.__when || new Date(NaN);
            const patientName: string = (apt as any).patientName || (apt.patientId?.slice?.(0, 8) || 'Unknown');
            const patientPhoto: string | null = (apt as any).patientPhoto || null;
            const initials = (patientName || 'U').split(/\s+/).map((s: string) => s[0]).join('').slice(0,2).toUpperCase();
            return (
              <div key={apt.id} className="flex items-center justify-between border rounded-md p-3">
                <div className="flex items-center gap-3">
                  {patientPhoto ? (
                    <img src={patientPhoto} alt={patientName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {initials}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{patientName}</div>
                    <div className="text-xs text-muted-foreground">{when.toLocaleDateString()} {toLocalTimeLabel(when)} • Status: {apt.status}</div>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0">
                  <Button size="sm" variant="outline" onClick={() => viewRecords(apt)}>View Records</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {recordsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-md shadow-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Patient Records</div>
              <Button size="sm" variant="outline" onClick={() => setRecordsOpen(false)}>Close</Button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-auto">
              {recordsLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
              {!recordsLoading && records.length === 0 && (
                <div className="text-sm text-muted-foreground">No records available.</div>
              )}
              {records.map((r) => {
                const dateVal = r.recordDate || r.uploadedAt;
                const when = dateVal && (dateVal.seconds || dateVal._seconds) ? new Date((dateVal.seconds || dateVal._seconds) * 1000) : new Date(dateVal || '');
                return (
                  <div key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md p-3">
                    <div className="space-y-1">
                      <div className="font-medium">{r.title || 'Untitled'} <span className="text-xs text-muted-foreground">• {r.type || 'record'}</span></div>
                      <div className="text-xs text-muted-foreground">{isNaN(when.getTime()) ? '' : `${when.toLocaleDateString()}`}{r.fileSize ? ` • ${(r.fileSize / 1024).toFixed(0)} KB` : ''}</div>
                    </div>
                    <div className="mt-3 sm:mt-0 text-xs text-muted-foreground">
                      {r.hasFile ? 'File available (downloads restricted for doctors)' : 'No file attached'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
