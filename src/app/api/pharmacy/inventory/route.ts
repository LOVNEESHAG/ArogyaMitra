import { NextRequest, NextResponse } from 'next/server';
import { inventoryService, medicineService } from '@/lib/firestore';
import type { InventoryItem, Medicine } from '@/types';

// Hackathon-simple auth: decode UID from raw ID token stored in session cookie (no verification)
function getUidFromCookie(req: NextRequest): string | null {
  const token = req.cookies.get('session')?.value;
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    return payload.user_id || payload.uid || payload.sub || null;
  } catch {
    return null;
  }
}

// GET /api/pharmacy/inventory - Get inventory for current pharmacy
export async function GET(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    let inventory: InventoryItem[] = [];

    if (lowStockOnly) {
      inventory = await inventoryService.getLowStockItems(uid);
    } else {
      inventory = await inventoryService.getPharmacyInventory(uid);
    }

    return NextResponse.json({ success: true, data: inventory });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

// POST /api/pharmacy/inventory - Add new inventory item
export async function POST(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    
    // First, check if medicine exists or create it
    let medicineId = body.medicineId;
    
    if (!medicineId && body.medicine?.name) {
      const raw = body.medicine as Record<string, any>;
      const medicine: Record<string, any> = {
        name: raw.name,
        genericName: raw.genericName,
        brand: raw.brand,
        category: raw.category ?? "general",
        strength: raw.strength ?? "N/A",
        form: raw.form ?? "other",
        manufacturer: raw.manufacturer ?? "Unknown",
        description: raw.description,
        sideEffects: Array.isArray(raw.sideEffects) ? raw.sideEffects : [],
        dosageInstructions: raw.dosageInstructions,
        contraindications: Array.isArray(raw.contraindications) ? raw.contraindications : [],
        requiresPrescription: Boolean(raw.requiresPrescription),
      };

      const cleaned = Object.fromEntries(
        Object.entries(medicine).filter(([, value]) => value !== undefined)
      ) as Omit<Medicine, "id">;

      medicineId = await medicineService.create(cleaned);
    }

    const inventoryPayload: Record<string, any> = {
      pharmacyId: uid,
      medicineId,
      batchNumber: body.batchNumber ?? null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : new Date(),
      quantity: Number(body.quantity) || 0,
      costPrice: body.costPrice !== undefined ? Number(body.costPrice) : 0,
      sellingPrice: body.sellingPrice !== undefined ? Number(body.sellingPrice) : 0,
      lowStockThreshold: body.lowStockThreshold !== undefined ? Number(body.lowStockThreshold) : 0,
      supplierInfo: body.supplierInfo ?? null,
      lastUpdated: new Date(),
      isActive: true
    };

    if (body.manufacturingDate) {
      inventoryPayload.manufacturingDate = new Date(body.manufacturingDate);
    }

    const cleanedInventory = Object.fromEntries(
      Object.entries(inventoryPayload).filter(([, value]) => value !== undefined)
    ) as Omit<InventoryItem, 'id'>;

    const itemId = await inventoryService.create(cleanedInventory);

    return NextResponse.json({
      success: true,
      data: { id: itemId, ...cleanedInventory }
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}

// PUT /api/pharmacy/inventory - Update inventory item
export async function PUT(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, quantity, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    if (quantity !== undefined) {
      await inventoryService.updateStock(id, quantity);
    } else {
      await inventoryService.update(id, updateData);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}

// POST /api/pharmacy/inventory/bulk - Bulk upload inventory (CSV processing)
export async function PATCH(request: NextRequest) {
  try {
    const uid = getUidFromCookie(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items array required' }, { status: 400 });
    }

    // Process items in batches
    const processedItems = items.map(item => ({
      ...item,
      pharmacyId: uid,
      lastUpdated: new Date()
    }));

    await inventoryService.bulkUpdateInventory(processedItems);
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed ${items.length} items` 
    });
  } catch (error) {
    console.error('Error bulk updating inventory:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update inventory' },
      { status: 500 }
    );
  }
}
