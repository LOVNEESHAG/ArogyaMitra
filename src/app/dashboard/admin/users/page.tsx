"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUserRole } from "@/hooks/use-user-role";
import { Users, UserCheck, Shield, UserCog, RefreshCcw } from "lucide-react";

type DashboardUser = {
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

type UserStats = {
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

const roleLabels: Record<string, string> = {
  patient: "Patient",
  doctor: "Doctor",
  pharmacyOwner: "Pharmacy Owner",
  admin: "Administrator"
};

const statusFilters = [
  { value: "", label: "All statuses" },
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending Verification" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" }
];

const roleFilters = [
  { value: "", label: "All roles" },
  { value: "patient", label: "Patients" },
  { value: "doctor", label: "Doctors" },
  { value: "pharmacyOwner", label: "Pharmacies" },
  { value: "admin", label: "Admins" }
];

type UserAction = "verify" | "suspend" | "activate" | "changeRole";

function formatDate(value?: string | number | Date) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function statusBadge(user: DashboardUser) {
  if (user?.isActive === false) return "Suspended";
  if (user?.isVerified === false) return "Pending";
  return "Active";
}

export default function AdminUsersPage() {
  const { role, loading } = useUserRole();
  const [statsLoading, setStatsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAdmin = role === "admin";

  async function fetchStats() {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/users", { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error("Failed to load user stats");
      const data = await res.json();
      setStats(data?.data ?? null);
    } catch (err: any) {
      console.error(err);
      setStats(null);
      setActionMessage({ type: "error", text: err?.message || "Failed to load stats" });
    } finally {
      setStatsLoading(false);
    }
  }

  async function fetchUsers() {
    setUsersLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterRole) params.set("role", filterRole);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/users?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to load users");
      }
      const data = await res.json();
      setUsers(Array.isArray(data?.data) ? data.data : []);
    } catch (err: any) {
      console.error(err);
      setUsers([]);
      setError(err?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin || loading) return;
    void fetchStats();
    void fetchUsers();
  }, [isAdmin, loading]);

  useEffect(() => {
    if (!isAdmin || loading) return;
    void fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRole, filterStatus]);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const term = search.trim().toLowerCase();
    return users.filter((user: DashboardUser) => {
      const fields: string[] = [user.displayName ?? "", user.email ?? "", user.role ?? ""];
      return fields.some((field: string) => field.toLowerCase().includes(term));
    });
  }, [search, users]);

  const handleUserAction = async (
    userId: string,
    action: UserAction,
    payload: Record<string, any> = {},
    successMessage?: string
  ) => {
    setActionMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, ...payload })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Action failed");
      }
      const data = await res.json();
      setActionMessage({ type: "success", text: successMessage || data?.message || "User updated successfully" });
      await Promise.all([fetchStats(), fetchUsers()]);
    } catch (err: any) {
      console.error(err);
      setActionMessage({ type: "error", text: err?.message || "Failed to update user" });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!newRole) return;
    const label = roleLabels[newRole] || newRole;
    await handleUserAction(userId, "changeRole", { role: newRole }, `User role updated to ${label}`);
  };

  if (!isAdmin && !loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Access Required</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage platform users, verify accounts, and monitor role distribution.</p>
      </div>

      {actionMessage && (
        <div
          className={`rounded-md border p-3 text-sm ${
            actionMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? "—"}</div>
            <p className="text-xs text-muted-foreground">Across all roles</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <UserCheck className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.verified ?? "—"}</div>
            <p className="text-xs text-muted-foreground">Ready for full access</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Shield className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active ?? "—"}</div>
            <p className="text-xs text-muted-foreground">Currently allowed to login</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserCog className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.newThisMonth ?? "—"}</div>
            <p className="text-xs text-muted-foreground">New registrations in the last 30 days</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Filter users by role or status, search, and manage their access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</label>
                <select
                  value={filterRole}
                  onChange={(event) => setFilterRole(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {roleFilters.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</label>
                <select
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {statusFilters.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</label>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email, or role"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" onClick={() => { setFilterRole(""); setFilterStatus(""); setSearch(""); }}>
                Clear Filters
              </Button>
              <Button onClick={() => { void fetchStats(); void fetchUsers(); }} disabled={statsLoading || usersLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="hidden rounded-md border md:block">
            <div className="grid grid-cols-[2fr,2fr,1.5fr,1fr,1.5fr] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {usersLoading && (
              <div className="px-4 py-6 text-sm text-muted-foreground">Loading users…</div>
            )}
            {!usersLoading && filteredUsers.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">No users found for the selected filters.</div>
            )}
            {!usersLoading && filteredUsers.map((user) => (
              <div key={user.id} className="grid grid-cols-[2fr,2fr,1.5fr,1fr,1.5fr] items-center gap-4 border-b px-4 py-4 text-sm last:border-0">
                <div className="font-medium">{user.displayName || "Unnamed"}</div>
                <div className="truncate text-muted-foreground">{user.email || "—"}</div>
                <div>
                  <select
                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={user.role}
                    onChange={(event) => void handleRoleChange(user.id || user.uid || "", event.target.value)}
                  >
                    {['patient','doctor','pharmacyOwner','admin'].map((value) => (
                      <option key={value} value={value}>{roleLabels[value] ?? value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${
                    statusBadge(user) === "Active" ? "bg-emerald-100 text-emerald-700" :
                    statusBadge(user) === "Suspended" ? "bg-rose-100 text-rose-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {statusBadge(user)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleUserAction(user.id || user.uid || "", "verify")}
                    disabled={user.isVerified}
                  >
                    Verify
                  </Button>
                  {user.isActive ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleUserAction(user.id || user.uid || "", "suspend")}
                    >
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleUserAction(user.id || user.uid || "", "activate")}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 md:hidden">
            {usersLoading && <div className="text-sm text-muted-foreground">Loading users…</div>}
            {!usersLoading && filteredUsers.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No users found for the selected filters.
              </div>
            )}
            {!usersLoading && filteredUsers.map((user) => (
              <div key={user.id} className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{user.displayName || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{user.email || "—"}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${
                    statusBadge(user) === "Active" ? "bg-emerald-100 text-emerald-700" :
                    statusBadge(user) === "Suspended" ? "bg-rose-100 text-rose-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {statusBadge(user)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={user.role}
                      onChange={(event) => void handleRoleChange(user.id || user.uid || "", event.target.value)}
                    >
                      {['patient','doctor','pharmacyOwner','admin'].map((value) => (
                        <option key={value} value={value}>{roleLabels[value] ?? value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-muted-foreground">Joined {formatDate(user.createdAt)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleUserAction(user.id || user.uid || "", "verify")}
                    disabled={user.isVerified}
                  >
                    Verify
                  </Button>
                  {user.isActive ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleUserAction(user.id || user.uid || "", "suspend")}
                    >
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleUserAction(user.id || user.uid || "", "activate")}
                    >
                      Activate
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
