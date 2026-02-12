"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
// Cloudinary client-only upload (unsigned preset)
const CLD_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string | undefined;
const CLD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string | undefined;

function toDate(input: any): Date {
  if (!input) return new Date(NaN);
  if (typeof input === 'object') {
    const seconds = (input as any).seconds ?? (input as any)._seconds ?? (input as any).toDate?.();
    if (typeof seconds === 'number') return new Date(seconds * 1000);
    if ((input as any).toDate && typeof (input as any).toDate === 'function') {
      return (input as any).toDate();
    }
  }
  return new Date(input as any);
}

async function uploadToCloudinary(file: File, folder?: string): Promise<{ url: string; public_id: string; }> {
  if (!CLD_CLOUD || !CLD_PRESET) {
    throw new Error('Cloudinary env not configured');
  }
  const endpoint = `https://api.cloudinary.com/v1_1/${CLD_CLOUD}/auto/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLD_PRESET);
  if (folder) fd.append('folder', folder);
  const res = await fetch(endpoint, { method: 'POST', body: fd });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return { url: data.secure_url || data.url, public_id: data.public_id };
}

type RecordItem = {
  id: string;
  type: string;
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: any;
  recordDate?: any;
  doctorId?: string;
  labName?: string;
  patientId?: string;
  patientName?: string;
};

type RecordComment = {
  id: string;
  doctorId: string;
  doctorName?: string | null;
  comment: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type CommentState = {
  expanded: boolean;
  loading: boolean;
  submitting: boolean;
  comments: RecordComment[];
  error?: string | null;
  text: string;
  hasLoaded: boolean;
};

const HEALTH_RECORDS_DEFAULTS = {
  heading: "Health Records",
  subheading: "Upload and manage your medical documents.",
  doctorInfoTitle: "Patient records are shared automatically",
  doctorInfoBody: "These records include every patient who has had an appointment with you. Only patients can upload new documents.",
  readonlyInfoBody: "Only patients can upload health records. Other roles have read-only access.",
  uploadTitle: "Upload Health Record",
  uploadDesc: "PDF, JPG, PNG. Max 5MB recommended.",
  labelFile: "File",
  labelTitle: "Title",
  labelType: "Type",
  labelRecordDate: "Record Date",
  labelDescription: "Description",
  placeholderTitle: "e.g., CBC Report",
  placeholderDescription: "Optional notes",
  btnUpload: "Upload",
  btnUploading: "Uploading...",
  listTitle: "Your Records",
  listDesc: "Download or remove your documents",
  loading: "Loading... please wait",
  empty: "No records uploaded yet. Upload a record to get started.",
  btnDownload: "Download",
  btnDelete: "Delete",
  confirmTitle: "Delete record",
  confirmBody: "Are you sure you want to delete this record? This action cannot be undone.",
  btnCancel: "Cancel",
  btnConfirmDelete: "Confirm delete",
  messageUploadSuccess: "Uploaded successfully",
  messageUploadFail: "Failed to upload record",
  messageMissingFields: "Please select a file and enter a title",
  commentsTitle: "Doctor comments",
  commentsToggleShow: "View comments",
  commentsToggleHide: "Hide comments",
  commentsLoading: "Loading comments…",
  commentsNone: "No comments yet.",
  commentsPlaceholder: "Add a comment for this record",
  commentsVisibility: "Visible to doctors who can access this record.",
  commentsSaving: "Saving…",
  commentsSave: "Add comment",
  commentsViewerNote: "Doctors can leave notes here. You can review any updates below.",
  commentsErrorLoad: "Unable to load comments",
  commentsErrorSave: "Unable to add comment",
};

const formatTemplateString = (template: string, values: Record<string, string | number>) => {
  return Object.entries(values).reduce((acc, [key, val]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val)), template);
};

export default function HealthRecordsPage() {
  const { t } = useTranslation();
  const translate = (key: keyof typeof HEALTH_RECORDS_DEFAULTS) => t(`healthRecords.${key}`, HEALTH_RECORDS_DEFAULTS[key]);

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("report");
  const [recordDate, setRecordDate] = useState<string>("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string>("");
  const [role, setRole] = useState<'patient' | 'doctor' | 'pharmacyOwner' | 'admin' | null>(null);
  const [roleLoading, setRoleLoading] = useState<boolean>(true);
  const [commentStates, setCommentStates] = useState<Record<string, CommentState>>({});

  async function loadRecords(currentRole?: string) {
    setLoading(true);
    try {
      const url = currentRole ? `/api/health-records?role=${currentRole}` : '/api/health-records';
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data.data) ? data.data : []);
      }
    } catch (e) {
      console.warn('Failed to load records', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function fetchRole() {
      try {
        const res = await fetch('/api/profile/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setRole(data.role ?? 'patient');
        } else {
          setRole('patient');
        }
      } catch {
        setRole('patient');
      } finally {
        setRoleLoading(false);
      }
    }
    void fetchRole();
  }, []);

  useEffect(() => {
    if (!roleLoading && role) {
      void loadRecords(role);
    }
  }, [roleLoading, role]);

  const isPatient = role === 'patient';
  const isDoctor = role === 'doctor';

  const groupedRecords = useMemo(() => {
    if (!isDoctor) return [] as { patientId: string; patientName: string; records: RecordItem[] }[];
    const groups = new Map<string, { patientId: string; patientName: string; records: RecordItem[] }>();
    records.forEach((record) => {
      const patientId = record.patientId || 'unknown';
      const patientName = record.patientName || t('roles.patient');
      if (!groups.has(patientId)) {
        groups.set(patientId, {
          patientId,
          patientName,
          records: []
        });
      }
      groups.get(patientId)!.records.push(record);
    });
    const sorted = Array.from(groups.values()).sort((a, b) => a.patientName.localeCompare(b.patientName));
    sorted.forEach((group) => {
      group.records.sort((a, b) => {
        const aDate = toDate(a.recordDate || a.uploadedAt).getTime();
        const bDate = toDate(b.recordDate || b.uploadedAt).getTime();
        return bDate - aDate;
      });
    });
    return sorted;
  }, [records, isDoctor]);

  const ensureCommentState = (recordId: string): CommentState => {
    return commentStates[recordId] ?? {
      expanded: false,
      loading: false,
      submitting: false,
      comments: [],
      error: null,
      text: "",
      hasLoaded: false,
    };
  };

  const setCommentState = (recordId: string, updater: (prev: CommentState) => CommentState) => {
    setCommentStates((prev) => {
      const current = ensureCommentState(recordId);
      return {
        ...prev,
        [recordId]: updater(current),
      };
    });
  };

  const loadComments = async (recordId: string) => {
    setCommentState(recordId, (state) => ({ ...state, loading: true, error: null }));
    try {
      const res = await fetch(`/api/health-records/${recordId}/comments`, { credentials: "include" });
      if (!res.ok) {
        throw new Error(translate('commentsErrorLoad'));
      }
      const data = await res.json();
      const comments: RecordComment[] = Array.isArray(data?.data) ? data.data : [];
      setCommentState(recordId, (state) => ({
        ...state,
        comments,
        loading: false,
        hasLoaded: true,
      }));
    } catch (error: any) {
      setCommentState(recordId, (state) => ({
        ...state,
        loading: false,
        error: error?.message || translate('commentsErrorLoad'),
      }));
    }
  };

  const toggleComments = (recordId: string) => {
    setCommentState(recordId, (state) => {
      const nextExpanded = !state.expanded;
      return {
        ...state,
        expanded: nextExpanded,
      };
    });
    const existing = ensureCommentState(recordId);
    if (!existing.hasLoaded) {
      void loadComments(recordId);
    }
  };

  const submitComment = async (recordId: string) => {
    const current = ensureCommentState(recordId);
    if (!current.text.trim() || current.submitting) return;
    setCommentState(recordId, (state) => ({ ...state, submitting: true, error: null }));
    try {
      const res = await fetch(`/api/health-records/${recordId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: current.text.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || translate('commentsErrorSave'));
      }
      const data = await res.json();
      const created: RecordComment | null = data?.data ?? null;
      setCommentState(recordId, (state) => ({
        ...state,
        comments: created ? [...state.comments, created] : state.comments,
        submitting: false,
        text: "",
        hasLoaded: true,
      }));
    } catch (error: any) {
      setCommentState(recordId, (state) => ({
        ...state,
        submitting: false,
        error: error?.message || translate('commentsErrorSave'),
      }));
    }
  };

  const renderRecordItem = (r: RecordItem) => {
    const when = toDate(r.recordDate || r.uploadedAt);
    const commentState = commentStates[r.id] ?? ensureCommentState(r.id);
    const showCommentsEntry = isDoctor || isPatient;
    return (
      <div key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md p-3">
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="font-medium">
                {r.title || r.fileName || t('dashboard.common.unnamed')}{' '}
                <span className="text-xs text-muted-foreground">• {r.type}</span>
              </div>
              <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                <span>{isNaN(when.getTime()) ? '' : when.toLocaleDateString()}{r.fileSize ? ` • ${(r.fileSize / 1024).toFixed(0)} KB` : ''}</span>
                {isDoctor && r.patientName && (
                  <span>{r.patientName}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {r.fileUrl && (
                <a className="inline-flex items-center justify-center h-9 rounded-md border border-input bg-background px-3 text-sm" href={r.fileUrl} target="_blank" rel="noreferrer">{translate('btnDownload')}</a>
              )}
              {isPatient && (
                <Button variant="destructive" onClick={() => openConfirm(r.id)}>{translate('btnDelete')}</Button>
              )}
            </div>
          </div>

          {showCommentsEntry && (
            <div className="rounded-md border border-dashed border-border/70 bg-muted/40 p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold">{translate('commentsTitle')}</div>
                <Button variant="outline" size="sm" onClick={() => toggleComments(r.id)}>
                  {commentState.expanded ? translate('commentsToggleHide') : translate('commentsToggleShow')}
                </Button>
              </div>

              {commentState.expanded && (
                <div className="mt-3 space-y-4">
                  {commentState.loading && (
                    <div className="text-sm text-muted-foreground">{translate('commentsLoading')}</div>
                  )}

                  {commentState.error && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {commentState.error}
                    </div>
                  )}

                  {!commentState.loading && !commentState.error && commentState.comments.length === 0 && (
                    <div className="text-sm text-muted-foreground">{translate('commentsNone')}</div>
                  )}

                  {commentState.comments.length > 0 && (
                    <div className="space-y-3">
                      {commentState.comments.map((comment) => {
                        const createdAt = comment.createdAt ? new Date(comment.createdAt) : null;
                        return (
                          <div key={comment.id} className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{comment.doctorName || t('roles.doctor')}</span>
                                {createdAt && !isNaN(createdAt.getTime()) && (
                                  <span>• {createdAt.toLocaleString()}</span>
                                )}
                              </div>
                              <div className="whitespace-pre-wrap text-sm text-foreground">{comment.comment}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isDoctor ? (
                    <div className="space-y-2">
                      <textarea
                        value={commentState.text}
                        onChange={(e) => setCommentState(r.id, (state) => ({ ...state, text: e.target.value }))}
                        className="w-full min-h-[80px] rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder={translate('commentsPlaceholder')}
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs text-muted-foreground">{translate('commentsVisibility')}</span>
                        <Button size="sm" onClick={() => submitComment(r.id)} disabled={commentState.submitting || !commentState.text.trim()}>
                          {commentState.submitting ? translate('commentsSaving') : translate('commentsSave')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground">
                      {translate('commentsViewerNote')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!isPatient) { return; }
    if (!file || !title) { setMessage(translate('messageMissingFields')); return; }
    setUploading(true);
    setMessage("");
    try {
      console.log('[HR] onUpload start', { hasFile: !!file, title, cloud: CLD_CLOUD });
      // Upload to Cloudinary
      const patientId = records.find(r => r.patientId)?.patientId || 'self';
      const folder = `health-records/patients/${patientId}`;
      const { url } = await uploadToCloudinary(file, folder);
      console.log('[HR] cloudinary upload success', { url });

      // Send metadata to API only
      const fd = new FormData();
      fd.append('data', JSON.stringify({
        type,
        title,
        description,
        recordDate,
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }));
      console.log('[HR] POST /api/health-records (metadata only)');
      const res = await fetch('/api/health-records', { method: 'POST', body: fd, credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to upload record');
      }
      const data = await res.json();
      console.log('[HR] API response OK', data);
      setRecords((prev) => [data.data as RecordItem, ...prev]);
      setFile(null);
      setTitle("");
      setType("report");
      setRecordDate("");
      setMessage(translate('messageUploadSuccess'));
    } catch (e: any) {
      console.error('[HR] onUpload error', e);
      setMessage(e.message || translate('messageUploadFail'));
    } finally {
      setUploading(false);
    }
  }

  // Delete confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  function openConfirm(id: string) {
    if (!isPatient) return;
    setConfirmId(id);
    setConfirmOpen(true);
  }
  async function confirmDelete() {
    if (!confirmId || !isPatient) return;
    try {
      const res = await fetch(`/api/health-records/${confirmId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return;
      setRecords((prev) => prev.filter((r) => r.id !== confirmId));
    } catch (e) { console.warn('Failed to delete record', e); }
    finally { setConfirmOpen(false); setConfirmId(null); }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{translate('heading')}</h1>
        <p className="text-muted-foreground">{translate('subheading')}</p>
      </div>

      {isPatient && (
        <Card>
          <CardHeader>
            <CardTitle>{translate('uploadTitle')}</CardTitle>
            <CardDescription>{translate('uploadDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onUpload}>
            <div className="md:col-span-2">
              <Label>{translate('labelFile')}</Label>
              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="bg-white border-2 border-foreground/20 hover:border-foreground/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>
            <div>
              <Label>{translate('labelTitle')}</Label>
              <Input
                placeholder={translate('placeholderTitle')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white border-2 border-foreground/20 hover:border-foreground/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>
            <div>
              <Label>{translate('labelType')}</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-9 rounded-md border-2 border-foreground/20 bg-white px-3 py-1 text-sm hover:border-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="report">{t('healthRecords.type.report', 'Report')}</option>
                <option value="prescription">{t('healthRecords.type.prescription', 'Prescription')}</option>
                <option value="imaging">{t('healthRecords.type.imaging', 'Imaging')}</option>
                <option value="other">{t('healthRecords.type.other', 'Other')}</option>
              </select>
            </div>
            <div>
              <Label>{translate('labelRecordDate')}</Label>
              <Input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="bg-white border-2 border-foreground/20 hover:border-foreground/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>
            <div className="md:col-span-2">
              <Label>{translate('labelDescription')}</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] rounded-md border-2 border-foreground/20 bg-white px-3 py-2 text-sm hover:border-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                placeholder={translate('placeholderDescription')}
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={uploading}>{uploading ? translate('btnUploading') : translate('btnUpload')}</Button>
              {message && <span className="text-sm">{message}</span>}
            </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!isPatient && !roleLoading && (
        <Card>
          <CardHeader>
            <CardTitle>{isDoctor ? translate('doctorInfoTitle') : translate('heading')}</CardTitle>
            <CardDescription>{isDoctor ? translate('doctorInfoBody') : translate('readonlyInfoBody')}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{translate('listTitle')}</CardTitle>
          <CardDescription>{translate('listDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="space-y-2">
              <div className="h-10 rounded-md bg-muted animate-pulse" />
              <div className="h-10 rounded-md bg-muted animate-pulse" />
              <div className="h-10 rounded-md bg-muted animate-pulse" />
            </div>
          )}
          {!loading && records.length === 0 && (
            <div className="flex flex-col items-center justify-center border border-dashed rounded-md py-8 text-center text-sm">
              <div className="space-y-2">
                <div className="text-3xl mb-2">📄</div>
                <div>{translate('empty')}</div>
              </div>
            </div>
          )}
          {!loading && records.length > 0 && (
            isDoctor
              ? groupedRecords.map((group) => (
                  <div key={group.patientId} className="space-y-3">
                    <div className="font-semibold text-lg">{group.patientName}</div>
                    <div className="space-y-3">
                      {group.records.map((record) => renderRecordItem(record))}
                    </div>
                  </div>
                ))
              : records.map((record) => renderRecordItem(record))
          )}
        </CardContent>
      </Card>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-md shadow-lg">
            <div className="p-4 border-b font-semibold">{translate('confirmTitle')}</div>
            <div className="p-4 text-sm text-muted-foreground">{translate('confirmBody')}</div>
            <div className="p-4 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => { setConfirmOpen(false); setConfirmId(null); }}>{translate('btnCancel')}</Button>
              <Button variant="destructive" onClick={confirmDelete}>{translate('btnConfirmDelete')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
