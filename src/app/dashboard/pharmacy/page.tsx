"use client";

import { useEffect, useMemo, useState } from "react";

export default function PharmacyPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold">Pharmacy Inventory</h1>
      {/* Inventory Management UI */}
      <PharmacyInventory />
    </div>
  );
}

 function toDate(input: any): Date {
   if (!input) return new Date(NaN);
   if (typeof input === 'object') {
     const seconds = (input as any).seconds ?? (input as any)._seconds;
     if (typeof seconds === 'number') return new Date(seconds * 1000);
     if ((input as any).toDate && typeof (input as any).toDate === 'function') return (input as any).toDate();
   }
   return new Date(input as any);
 }

 type InventoryItem = {
   id: string;
   medicineId?: string;
   batchNumber?: string;
   expiryDate?: any;
   manufacturingDate?: any;
   quantity: number;
   costPrice?: number;
   sellingPrice?: number;
   lowStockThreshold?: number;
   supplierInfo?: string;
   lastUpdated?: any;
   isActive?: boolean;
   medicine?: { name?: string };
 };

 function PharmacyInventory() {
   const [items, setItems] = useState<InventoryItem[]>([]);
   const [loading, setLoading] = useState(false);
   const [lowOnly, setLowOnly] = useState(false);
   const [message, setMessage] = useState<string>("");

   // Add form state
   const [name, setName] = useState("");
   const [batch, setBatch] = useState("");
   const [expiry, setExpiry] = useState("");
   const [quantity, setQuantity] = useState<number>(0);
   const [cost, setCost] = useState<number>(0);
   const [price, setPrice] = useState<number>(0);
   const [threshold, setThreshold] = useState<number>(10);

   async function load() {
     setLoading(true);
     try {
       const qs = new URLSearchParams();
       if (lowOnly) qs.set('lowStock', 'true');
       const res = await fetch(`/api/pharmacy/inventory?${qs.toString()}`, { credentials: 'include' });
       if (res.ok) {
         const data = await res.json();
         setItems(Array.isArray(data.data) ? data.data : []);
       }
     } catch (e) {
       console.warn("Failed to load inventory", e);
     } finally {
       setLoading(false);
     }
   }

   useEffect(() => { void load(); }, [lowOnly]);

   const sortedItems = useMemo(() => {
     return [...items].sort((a, b) => {
       const ae = toDate(a.expiryDate).getTime();
       const be = toDate(b.expiryDate).getTime();
       return ae - be;
     });
   }, [items]);

   const isLow = (it: InventoryItem) => typeof it.lowStockThreshold === 'number' && (it.quantity || 0) <= (it.lowStockThreshold || 0);

   async function addItem(e: React.FormEvent) {
     e.preventDefault();
     setMessage("");
     try {
       const body = {
         medicine: { name },
         batchNumber: batch,
         expiryDate: expiry,
         quantity: Number(quantity) || 0,
         costPrice: Number(cost) || 0,
         sellingPrice: Number(price) || 0,
         lowStockThreshold: Number(threshold) || 0,
       };
       const res = await fetch('/api/pharmacy/inventory', {
         method: 'POST',
         credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(body)
       });
       if (!res.ok) {
         const err = await res.json().catch(() => ({}));
         throw new Error(err?.error || 'Failed to add item');
       }
       const data = await res.json();
       setItems((prev) => [data.data as InventoryItem, ...prev]);
       setName(""); setBatch(""); setExpiry(""); setQuantity(0); setCost(0); setPrice(0); setThreshold(10);
       setMessage('Item added');
     } catch (e: any) {
       setMessage(e.message || 'Failed to add item');
     }
   }

   async function updateStock(id: string, newQty: number) {
     try {
       const res = await fetch('/api/pharmacy/inventory', {
         method: 'PUT',
         credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id, quantity: newQty })
       });
       if (!res.ok) return;
       setItems((prev) => prev.map((it) => it.id === id ? { ...it, quantity: newQty, lastUpdated: new Date() } : it));
     } catch (e) { console.warn('Failed to update stock', e); }
   }

   function parseCsv(text: string) {
     const lines = text.split(/\r?\n/).filter(Boolean);
     if (lines.length < 2) return [] as any[];
     const headers = lines[0].split(',').map(h => h.trim());
     const rows = lines.slice(1).map(line => {
       const cols = line.split(',');
       const obj: any = {};
       headers.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
       return obj;
     });
     return rows;
   }

   async function onCsvSelected(file: File | null) {
     if (!file) return;
     const text = await file.text();
     const rows = parseCsv(text);
     if (!rows.length) { setMessage('CSV appears empty'); return; }
     const items = rows.map((r: any) => ({
       medicine: r.name ? { name: r.name } : undefined,
       medicineId: r.medicineId || undefined,
       batchNumber: r.batchNumber,
       expiryDate: r.expiryDate,
       quantity: Number(r.quantity) || 0,
       costPrice: Number(r.costPrice) || 0,
       sellingPrice: Number(r.sellingPrice) || 0,
       lowStockThreshold: Number(r.lowStockThreshold) || 0,
       supplierInfo: r.supplierInfo || undefined,
     }));
     try {
       const res = await fetch('/api/pharmacy/inventory', {
         method: 'PATCH',
         credentials: 'include',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ items })
       });
       if (!res.ok) {
         const err = await res.json().catch(() => ({}));
         throw new Error(err?.error || 'Bulk upload failed');
       }
       await load();
       setMessage('Bulk upload processed');
     } catch (e: any) {
       setMessage(e.message || 'Bulk upload failed');
     }
   }

   return (
     <div className="space-y-8">
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
         <div>
           <h2 className="text-xl font-semibold">Pharmacy Inventory</h2>
           <p className="text-sm text-muted-foreground">Manage medicines, upload CSV, and update stock levels.</p>
         </div>
         <div className="flex gap-2 items-center">
           <label className="flex items-center gap-2 text-sm">
             <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
             Show low stock only
           </label>
           <button className="h-9 px-3 rounded-md border text-sm" onClick={load}>Refresh</button>
         </div>
       </div>

       {/* Add item form */}
       <div className="border rounded-md p-4 space-y-4">
         <div>
           <div className="font-medium">Add Medicine</div>
           <div className="text-xs text-muted-foreground">Quickly add a single inventory item.</div>
         </div>
         <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={addItem}>
           <div>
             <label className="text-sm">Medicine Name</label>
             <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Paracetamol" className="mt-1 w-full h-9 px-3 rounded-md border-2 border-foreground/20 bg-white hover:border-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary" />
           </div>
           <div>
             <label className="text-sm">Batch</label>
             <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Batch no." className="mt-1 w-full h-9 px-3 rounded-md border-2 border-foreground/20 bg-white hover:border-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary" />
           </div>
           <div>
             <label className="text-sm">Expiry</label>
             <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border-2 border-foreground/20 bg-white hover:border-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary" />
           </div>
           <div>
             <label className="text-sm">Quantity</label>
             <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 w-full h-9 px-3 rounded-md border-2 border-foreground/20 bg-white hover:border-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary" />
           </div>
           <div>
             <label className="text-sm">Cost Price</label>
             <input type="number" step="0.01" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="mt-1 w-full h-9 px-3 rounded-md border-2 border-foreground/20 bg-white hover:border-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary" />
           </div>
           <div>
             <label className="text-sm">Selling Price</label>
             <input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-1 w-full h-9 px-3 rounded-md border-2 border-foreground/20 bg-white hover:border-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary" />
           </div>
           <div>
             <label className="text-sm">Low Stock Threshold</label>
             <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="mt-1 w-full h-9 px-3 rounded-md border-2 border-foreground/20 bg-white hover:border-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary" />
           </div>
           <div className="md:col-span-3 flex items-center gap-3">
             <button type="submit" className="h-9 px-3 rounded-md bg-foreground text-background text-sm">Add</button>
             {message && <span className="text-sm">{message}</span>}
           </div>
         </form>
       </div>

       {/* CSV upload */}
       <div className="border rounded-md p-4 space-y-3">
         <div className="font-medium">CSV Upload</div>
         <div className="text-xs text-muted-foreground">Headers: name,medicineId,batchNumber,expiryDate,quantity,costPrice,sellingPrice,lowStockThreshold,supplierInfo</div>
         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
           <input type="file" accept=".csv" onChange={(e) => onCsvSelected(e.target.files?.[0] || null)} className="w-full sm:w-auto h-9 px-3 rounded-md border-2 border-foreground/20 bg-white hover:border-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary" />
           <button className="h-9 px-3 rounded-md border text-sm" onClick={() => load()}>Reload Inventory</button>
         </div>
       </div>

       {/* Inventory list */}
       <div className="border rounded-md p-4">
         <div className="mb-3">
           <div className="font-medium">Inventory</div>
           <div className="text-xs text-muted-foreground">{lowOnly ? 'Showing low stock only' : 'All items'}</div>
         </div>
         {loading && (
           <div className="space-y-2">
             <div className="h-10 rounded-md bg-muted animate-pulse" />
             <div className="h-10 rounded-md bg-muted animate-pulse" />
             <div className="h-10 rounded-md bg-muted animate-pulse" />
           </div>
         )}
         {!loading && sortedItems.length === 0 && (
           <div className="flex flex-col items-center justify-center border border-dashed rounded-md py-8 text-center text-sm text-muted-foreground">
             <div className="text-3xl mb-2">💊</div>
             <div>No inventory yet. Add an item or upload CSV.</div>
           </div>
         )}
         <div className="space-y-3">
           {sortedItems.map((it) => {
             const exp = toDate(it.expiryDate);
             const expired = !isNaN(exp.getTime()) && exp < new Date();
             return (
               <div key={it.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md p-3">
                 <div className="space-y-1">
                   <div className="font-medium flex items-center gap-2">
                     {it.medicine?.name || 'Medicine'}
                     {isLow(it) && (
                       <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">Low</span>
                     )}
                     {expired && (
                       <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">Expired</span>
                     )}
                   </div>
                   <div className="text-xs text-muted-foreground">Batch: {it.batchNumber || '-'} • Exp: {isNaN(exp.getTime()) ? '-' : exp.toLocaleDateString()}</div>
                 </div>
                 <div className="mt-3 sm:mt-0 flex items-center gap-2">
                   <div className="flex items-center gap-1">
                     <button className="h-8 w-8 rounded-md border" onClick={() => updateStock(it.id, Math.max(0, (it.quantity || 0) - 1))}>-</button>
                     <input type="number" value={it.quantity} onChange={(e) => updateStock(it.id, Math.max(0, Number(e.target.value) || 0))} className="w-20 h-9 text-center rounded-md border-2 border-foreground/20 bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
                     <button className="h-8 w-8 rounded-md border" onClick={() => updateStock(it.id, (it.quantity || 0) + 1)}>+</button>
                   </div>
                   <div className="text-xs text-muted-foreground min-w-[120px] text-right">₹{(it.sellingPrice ?? 0).toFixed(2)}</div>
                 </div>
               </div>
             );
           })}
         </div>
       </div>
     </div>
   );
 }
