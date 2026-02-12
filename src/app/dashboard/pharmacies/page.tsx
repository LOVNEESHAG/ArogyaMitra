"use client";

import { useEffect, useMemo, useState } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Search, Package } from "lucide-react";

interface PharmacyAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

interface PharmacyItem {
  id: string;
  displayName: string;
  address: PharmacyAddress | null;
  phone: string | null;
}

interface InventoryEntry {
  id: string;
  quantity: number;
  sellingPrice: number | null;
  batchNumber: string | null;
  expiryDate: string | null;
  lastUpdated: string | null;
  medicine: {
    id: string | null;
    name: string;
    form: string | null;
    strength: string | null;
    manufacturer: string | null;
    requiresPrescription: boolean | null;
  };
}

export default function PatientPharmaciesPage() {
  const { role, loading: roleLoading } = useUserRole();
  const [pharmacies, setPharmacies] = useState<PharmacyItem[]>([]);
  const [filtered, setFiltered] = useState<PharmacyItem[]>([]);
  const [search, setSearch] = useState("");
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const isPatient = role === "patient";

  useEffect(() => {
    if (roleLoading || !isPatient) return;

    let aborted = false;
    setPharmacyLoading(true);
    setPharmacyError(null);
    fetch("/api/pharmacies", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to load pharmacies");
        }
        return response.json();
      })
      .then((data) => {
        if (aborted) return;
        const list: PharmacyItem[] = Array.isArray(data?.data) ? data.data : [];
        setPharmacies(list);
        setFiltered(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
        }
      })
      .catch((err) => {
        if (aborted) return;
        setPharmacyError(err?.message || "Unable to load pharmacies right now");
      })
      .finally(() => {
        if (aborted) return;
        setPharmacyLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [roleLoading, isPatient]);

  useEffect(() => {
    if (!isPatient || !selectedId) return;
    let aborted = false;
    setInventoryLoading(true);
    setInventoryError(null);

    fetch(`/api/pharmacies/${selectedId}/inventory`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error || "Failed to load medicines");
        }
        return response.json();
      })
      .then((data) => {
        if (aborted) return;
        const items: InventoryEntry[] = Array.isArray(data?.data) ? data.data : [];
        setInventory(items);
      })
      .catch((err) => {
        if (aborted) return;
        setInventoryError(err?.message || "Unable to load medicines for this pharmacy");
        setInventory([]);
      })
      .finally(() => {
        if (aborted) return;
        setInventoryLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [isPatient, selectedId]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(pharmacies);
      return;
    }

    const query = search.trim().toLowerCase();
    setFiltered(
      pharmacies.filter((pharmacy) => {
        const fields = [
          pharmacy.displayName,
          pharmacy.address?.street,
          pharmacy.address?.city,
          pharmacy.address?.state,
          pharmacy.address?.pincode,
          pharmacy.address?.country,
          pharmacy.phone ?? undefined,
        ]
          .filter(Boolean)
          .map((value) => value!.toLowerCase());

        return fields.some((field) => field.includes(query));
      })
    );
  }, [search, pharmacies]);

  const selectedPharmacy = useMemo(
    () => filtered.find((pharmacy) => pharmacy.id === selectedId) ?? pharmacies.find((pharmacy) => pharmacy.id === selectedId) ?? null,
    [filtered, pharmacies, selectedId]
  );

  if (roleLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isPatient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pharmacies</CardTitle>
          <CardDescription>Only patients can browse pharmacies.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Switch to a patient account to view nearby pharmacies and their inventories.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-primary">Pharmacies</h1>
        <p className="text-muted-foreground">Browse pharmacies in the ArogyaMitra network and review their available medicines.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px,1fr]">
        <Card className="h-full">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">All Pharmacies</CardTitle>
              <Badge variant="secondary" className="text-xs font-medium">
                {pharmacies.length} listed
              </Badge>
            </div>
            <div className="relative">
              <Input
                placeholder="Search by name, city, or PIN code"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9 bg-white border-2 border-foreground/20 hover:border-foreground/50 focus-visible:ring-2 focus-visible:ring-primary"
              />
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {pharmacyLoading && (
              <div className="space-y-2">
                <div className="h-14 rounded-md bg-muted animate-pulse" />
                <div className="h-14 rounded-md bg-muted animate-pulse" />
                <div className="h-14 rounded-md bg-muted animate-pulse" />
              </div>
            )}

            {pharmacyError && !pharmacyLoading && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {pharmacyError}
              </div>
            )}

            {!pharmacyLoading && filtered.length === 0 && !pharmacyError && (
              <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No pharmacies match your search.
              </div>
            )}

            <div className="space-y-3">
              {filtered.map((pharmacy) => {
                const active = pharmacy.id === selectedId;
                const addressParts = [
                  pharmacy.address?.street,
                  pharmacy.address?.city,
                  pharmacy.address?.state,
                  pharmacy.address?.pincode,
                  pharmacy.address?.country,
                ].filter(Boolean);

                return (
                  <button
                    key={pharmacy.id}
                    type="button"
                    onClick={() => setSelectedId(pharmacy.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      active ? "border-primary bg-accent/10" : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-foreground">{pharmacy.displayName}</span>
                        {active && <Badge className="bg-primary text-background">Selected</Badge>}
                      </div>
                      {addressParts.length > 0 && (
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <MapPin className="mt-0.5 h-3.5 w-3.5" />
                          <span>{addressParts.join(", ")}</span>
                        </div>
                      )}
                      {pharmacy.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{pharmacy.phone}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[320px]">
          <CardHeader>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Available Medicines</CardTitle>
                <CardDescription>
                  {selectedPharmacy
                    ? `Showing medicines stocked by ${selectedPharmacy.displayName}.`
                    : "Select a pharmacy to view medicine availability."}
                </CardDescription>
              </div>
              {selectedPharmacy && (
                <Button variant="outline" size="sm" onClick={() => setSelectedId(selectedPharmacy.id)}>
                  Refresh
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {inventoryLoading && (
              <div className="space-y-2">
                <div className="h-16 rounded-md bg-muted animate-pulse" />
                <div className="h-16 rounded-md bg-muted animate-pulse" />
                <div className="h-16 rounded-md bg-muted animate-pulse" />
              </div>
            )}

            {inventoryError && !inventoryLoading && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {inventoryError}
              </div>
            )}

            {!inventoryLoading && !inventoryError && selectedPharmacy && inventory.length === 0 && (
              <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                This pharmacy hasn&apos;t shared their inventory yet.
              </div>
            )}

            {!inventoryLoading && !inventoryError && inventory.length > 0 && (
              <div className="space-y-3">
                {inventory.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-accent" />
                          <span className="font-semibold text-foreground">{item.medicine.name}</span>
                          {item.medicine.requiresPrescription ? (
                            <Badge variant="secondary" className="text-xs">Rx Only</Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {item.medicine.form && <div>Form: {item.medicine.form}</div>}
                          {item.medicine.strength && <div>Strength: {item.medicine.strength}</div>}
                          {item.medicine.manufacturer && <div>Manufacturer: {item.medicine.manufacturer}</div>}
                        </div>
                        {item.batchNumber && (
                          <div className="text-xs text-muted-foreground">Batch: {item.batchNumber}</div>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-2 text-right">
                        <div className="text-sm font-semibold text-primary">Stock: {item.quantity}</div>
                        {item.sellingPrice !== null && (
                          <div className="text-xs text-muted-foreground">₹{item.sellingPrice.toFixed(2)}</div>
                        )}
                        {item.expiryDate && (
                          <div className="text-xs text-muted-foreground">Expires: {new Date(item.expiryDate).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
