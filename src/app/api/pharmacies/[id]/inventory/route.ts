import { NextRequest, NextResponse } from "next/server";
import { inventoryService, medicineService, timestampToDate } from "@/lib/firestore";

function decodeUid(session: string | undefined): string | null {
  if (!session) return null;
  const parts = session.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as any;
    return payload.user_id || payload.uid || payload.sub || null;
  } catch {
    return null;
  }
}

function toIsoString(value: any): string | null {
  if (!value) return null;
  try {
    const date = timestampToDate(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: { id?: string } } | { params: Promise<{ id?: string }> }
) {
  try {
    const session = request.cookies.get("session")?.value;
    const uid = decodeUid(session);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await ("params" in context
      ? (context.params instanceof Promise ? context.params : Promise.resolve(context.params))
      : Promise.resolve<{ id?: string }>({}));

    const pharmacyId = resolvedParams.id;
    if (!pharmacyId) {
      return NextResponse.json({ error: "Pharmacy ID required" }, { status: 400 });
    }

    const inventory = await inventoryService.getPharmacyInventory(pharmacyId);
    const medicineCache = new Map<string, any>();

    const data = await Promise.all(
      inventory.map(async (item: any) => {
        let medicine = item.medicine ?? null;
        const medicineId = item.medicineId ?? medicine?.id ?? null;

        if (!medicine && medicineId) {
          if (!medicineCache.has(medicineId)) {
            const fetched = await medicineService.getById(medicineId).catch(() => null);
            medicineCache.set(medicineId, fetched);
          }
          medicine = medicineCache.get(medicineId);
        }

        return {
          id: item.id,
          quantity: item.quantity ?? 0,
          sellingPrice: item.sellingPrice ?? null,
          batchNumber: item.batchNumber ?? null,
          expiryDate: toIsoString(item.expiryDate),
          lastUpdated: toIsoString(item.lastUpdated),
          medicine: {
            id: medicineId,
            name:
              medicine?.name ??
              item.medicine?.name ??
              "Medicine",
            form: medicine?.form ?? item.medicine?.form ?? null,
            strength: medicine?.strength ?? item.medicine?.strength ?? null,
            manufacturer: medicine?.manufacturer ?? item.medicine?.manufacturer ?? null,
            requiresPrescription:
              medicine?.requiresPrescription ?? item.medicine?.requiresPrescription ?? null,
          },
        };
      })
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching pharmacy inventory:", error);
    return NextResponse.json({ error: "Failed to fetch pharmacy inventory" }, { status: 500 });
  }
}
