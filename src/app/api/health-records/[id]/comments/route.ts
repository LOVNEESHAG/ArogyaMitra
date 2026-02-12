import { NextRequest, NextResponse } from "next/server";
import {
  healthRecordService,
  healthRecordCommentService,
  userService,
  appointmentService,
} from "@/lib/firestore";

function getUidFromCookie(req: NextRequest): string | null {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf8");
    const payload = JSON.parse(json);
    return payload.user_id || payload.uid || payload.sub || null;
  } catch {
    return null;
  }
}

async function getUserRole(uid: string): Promise<string | null> {
  try {
    const user = await userService.getById(uid);
    if (!user) return null;
    return (user as any).role ?? null;
  } catch {
    return null;
  }
}

function normalizeComment(comment: any) {
  const createdAt = comment.createdAt?.toDate
    ? comment.createdAt.toDate()
    : comment.createdAt
    ? new Date(comment.createdAt)
    : null;
  const updatedAt = comment.updatedAt?.toDate
    ? comment.updatedAt.toDate()
    : comment.updatedAt
    ? new Date(comment.updatedAt)
    : null;

  return {
    id: comment.id,
    recordId: comment.recordId,
    doctorId: comment.doctorId,
    doctorName: comment.doctorName ?? null,
    comment: comment.comment,
    createdAt: createdAt ? createdAt.toISOString() : null,
    updatedAt: updatedAt ? updatedAt.toISOString() : null,
  };
}

async function doctorHasAccess(uid: string, record: any) {
  if (record?.doctorId === uid) return true;
  if (Array.isArray(record?.sharedWith) && record.sharedWith.includes(uid)) return true;

  const patientId = record?.patientId;
  if (!patientId) return false;

  try {
    const patientIds = await appointmentService.getDoctorPatientIds(uid);
    return patientIds.includes(patientId);
  } catch {
    return false;
  }
}

async function userCanRead(uid: string, role: string | null, record: any) {
  if (!record) return false;
  if (role === "admin") return true;
  if (role === "patient" && record.patientId === uid) return true;
  if (role === "doctor" && await doctorHasAccess(uid, record)) return true;
  return false;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: recordId } = await context.params;
    if (!recordId) {
      return NextResponse.json({ error: "Record ID required" }, { status: 400 });
    }

    const record = await healthRecordService.getById(recordId);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const role = await getUserRole(uid);
    if (!(await userCanRead(uid, role, record))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comments = await healthRecordCommentService.getCommentsForRecord(recordId);

    return NextResponse.json({
      success: true,
      data: comments.map(normalizeComment),
    });
  } catch (error) {
    console.error("Error fetching health record comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = await getUserRole(uid);
    if (role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can add comments" }, { status: 403 });
    }

    const { id: recordId } = await context.params;
    if (!recordId) {
      return NextResponse.json({ error: "Record ID required" }, { status: 400 });
    }

    const record = await healthRecordService.getById(recordId);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    if (!(await doctorHasAccess(uid, record))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const rawComment = body?.comment;
    if (!rawComment || typeof rawComment !== "string" || !rawComment.trim()) {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

    const user = await userService.getById(uid);
    const doctorName =
      (user as any)?.displayName || (user as any)?.name || (user as any)?.email || "Doctor";

    const commentId = await healthRecordCommentService.create({
      recordId,
      doctorId: uid,
      doctorName,
      comment: rawComment.trim(),
    } as any);

    const created = await healthRecordCommentService.getById(commentId);

    return NextResponse.json(
      {
        success: true,
        data: created ? normalizeComment(created) : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating health record comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
