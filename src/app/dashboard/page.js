"use client";
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Dashboard;
var use_user_role_1 = require("@/hooks/use-user-role");
var link_1 = require("next/link");
var button_1 = require("@/components/ui/button");
var card_1 = require("@/components/ui/card");
var input_1 = require("@/components/ui/input");
var lucide_react_1 = require("lucide-react");
var i18n_1 = require("@/lib/i18n");
var react_1 = require("react");
function safeToDate(input) {
    var _a;
    if (!input)
        return new Date(NaN);
    if (typeof input === 'object') {
        if (input.toDate && typeof input.toDate === 'function') {
            return input.toDate();
        }
        var seconds = (_a = input.seconds) !== null && _a !== void 0 ? _a : input._seconds;
        if (typeof seconds === 'number') {
            return new Date(seconds * 1000);
        }
    }
    return new Date(input);
}
function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function withinDoctorJoinWindow(scheduledAt, durationMin) {
    if (durationMin === void 0) { durationMin = 30; }
    var startBufferMs = 10 * 60 * 1000;
    var endBufferMs = 10 * 60 * 1000;
    var start = new Date(new Date(scheduledAt).getTime() - startBufferMs);
    var end = new Date(new Date(scheduledAt).getTime() + durationMin * 60000 + endBufferMs);
    return (new Date) >= start && (new Date) <= end;
}
function getInitials(value) {
    if (!value)
        return "";
    var parts = value.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return "";
    var initials = parts.slice(0, 2).map(function (part) { var _a, _b; return (_b = (_a = part[0]) === null || _a === void 0 ? void 0 : _a.toUpperCase()) !== null && _b !== void 0 ? _b : ""; }).join("");
    return initials || value.slice(0, 2).toUpperCase();
}
function Dashboard() {
    var _this = this;
    var _a, _b, _c, _d;
    var _e = (0, use_user_role_1.useUserRole)(), role = _e.role, loading = _e.loading, user = _e.user;
    var t = (0, i18n_1.useTranslation)().t;
    var _f = (0, react_1.useState)([]), recentActivity = _f[0], setRecentActivity = _f[1];
    var _g = (0, react_1.useState)([]), doctorAppointments = _g[0], setDoctorAppointments = _g[1];
    var _h = (0, react_1.useState)([]), doctorRecords = _h[0], setDoctorRecords = _h[1];
    var _j = (0, react_1.useState)(false), doctorLoading = _j[0], setDoctorLoading = _j[1];
    var _k = (0, react_1.useState)(null), adminStats = _k[0], setAdminStats = _k[1];
    var _l = (0, react_1.useState)([]), adminUsers = _l[0], setAdminUsers = _l[1];
    var _m = (0, react_1.useState)(false), adminUsersLoading = _m[0], setAdminUsersLoading = _m[1];
    var _o = (0, react_1.useState)(false), adminStatsLoading = _o[0], setAdminStatsLoading = _o[1];
    var _p = (0, react_1.useState)(null), adminError = _p[0], setAdminError = _p[1];
    var _q = (0, react_1.useState)(""), adminFilterRole = _q[0], setAdminFilterRole = _q[1];
    var _r = (0, react_1.useState)(""), adminFilterStatus = _r[0], setAdminFilterStatus = _r[1];
    var _s = (0, react_1.useState)(""), adminSearch = _s[0], setAdminSearch = _s[1];
    var _t = (0, react_1.useState)(null), adminActionMessage = _t[0], setAdminActionMessage = _t[1];
    var adminRoleFilters = [
        { value: "", label: t("dashboard.admin.filter.roleAll") },
        { value: "patient", label: t("dashboard.admin.filter.rolePatients") },
        { value: "doctor", label: t("dashboard.admin.filter.roleDoctors") },
        { value: "pharmacyOwner", label: t("dashboard.admin.filter.rolePharmacies") },
        { value: "admin", label: t("dashboard.admin.filter.roleAdmins") },
    ];
    var adminStatusFilters = [
        { value: "", label: t("dashboard.admin.filter.statusAll") },
        { value: "verified", label: t("dashboard.admin.filter.statusVerified") },
        { value: "pending", label: t("dashboard.admin.filter.statusPending") },
        { value: "active", label: t("dashboard.admin.filter.statusActive") },
        { value: "suspended", label: t("dashboard.admin.filter.statusSuspended") },
    ];
    var adminRoleLabels = {
        patient: t("roles.patient"),
        doctor: t("roles.doctor"),
        pharmacyOwner: t("roles.pharmacyOwner"),
        admin: t("roles.admin"),
    };
    (0, react_1.useEffect)(function () {
        function fetchStats() {
            return __awaiter(this, void 0, void 0, function () {
                var appointmentsRes, appointmentsData, appointments, upcoming_1, completed_1, activity, recordsRes, recordsData, records_1, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(user === null || user === void 0 ? void 0 : user.uid) || role !== 'patient')
                                return [2 /*return*/];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 8, , 9]);
                            return [4 /*yield*/, fetch("/api/appointments?role=patient", {
                                    credentials: 'include'
                                })];
                        case 2:
                            appointmentsRes = _a.sent();
                            if (!appointmentsRes.ok) return [3 /*break*/, 4];
                            return [4 /*yield*/, appointmentsRes.json()];
                        case 3:
                            appointmentsData = _a.sent();
                            appointments = appointmentsData.data || [];
                            upcoming_1 = appointments.filter(function (apt) {
                                return apt.status === 'scheduled' && new Date(apt.scheduledAt) > new Date();
                            }).length;
                            completed_1 = appointments.filter(function (apt) {
                                return apt.status === 'completed';
                            }).length;
                            setStats(function (prev) { return (__assign(__assign({}, prev), { upcomingAppointments: upcoming_1, completedConsultations: completed_1 })); });
                            activity = appointments
                                .slice(0, 3) // Only show latest 3
                                .map(function (apt) { return ({
                                id: apt.id,
                                type: 'appointment',
                                title: "Appointment with Dr. ".concat(apt.doctorName || 'Doctor'),
                                description: new Date(apt.scheduledAt) > new Date() ?
                                    "".concat(new Date(apt.scheduledAt).toLocaleDateString(), " at ").concat(new Date(apt.scheduledAt).toLocaleTimeString()) :
                                    "".concat(apt.status === 'completed' ? 'Completed' : 'Status: ' + apt.status),
                                date: new Date(apt.scheduledAt)
                            }); });
                            setRecentActivity(activity);
                            _a.label = 4;
                        case 4: return [4 /*yield*/, fetch('/api/health-records', {
                                credentials: 'include'
                            })];
                        case 5:
                            recordsRes = _a.sent();
                            if (!recordsRes.ok) return [3 /*break*/, 7];
                            return [4 /*yield*/, recordsRes.json()];
                        case 6:
                            recordsData = _a.sent();
                            records_1 = recordsData.data || [];
                            setStats(function (prev) { return (__assign(__assign({}, prev), { totalRecords: records_1.length })); });
                            _a.label = 7;
                        case 7: return [3 /*break*/, 9];
                        case 8:
                            error_1 = _a.sent();
                            console.error('Failed to fetch dashboard stats:', error_1);
                            return [3 /*break*/, 9];
                        case 9: return [2 /*return*/];
                    }
                });
            });
        }
        fetchStats();
    }, [user === null || user === void 0 ? void 0 : user.uid, role]);
    (0, react_1.useEffect)(function () {
        if (!(user === null || user === void 0 ? void 0 : user.uid) || role !== 'doctor')
            return;
        var isMounted = true;
        var fetchDoctorData = function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, appointmentsRes, recordsRes, appointmentData, itemsRaw, byId, _i, itemsRaw_1, apt, recordsData, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        setDoctorLoading(true);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 9, 10, 11]);
                        return [4 /*yield*/, Promise.all([
                                fetch('/api/appointments?role=doctor', { credentials: 'include' }),
                                fetch('/api/health-records?role=doctor', { credentials: 'include' })
                            ])];
                    case 2:
                        _a = _b.sent(), appointmentsRes = _a[0], recordsRes = _a[1];
                        if (!appointmentsRes.ok) return [3 /*break*/, 4];
                        return [4 /*yield*/, appointmentsRes.json()];
                    case 3:
                        appointmentData = _b.sent();
                        itemsRaw = (appointmentData.data || [])
                            .map(function (apt) { return (__assign(__assign({}, apt), { __when: safeToDate(apt.scheduledAt) })); });
                        byId = new Map();
                        for (_i = 0, itemsRaw_1 = itemsRaw; _i < itemsRaw_1.length; _i++) {
                            apt = itemsRaw_1[_i];
                            if (apt && apt.id)
                                byId.set(apt.id, apt);
                        }
                        if (isMounted) {
                            setDoctorAppointments(Array.from(byId.values()));
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        if (isMounted) {
                            setDoctorAppointments([]);
                        }
                        _b.label = 5;
                    case 5:
                        if (!recordsRes.ok) return [3 /*break*/, 7];
                        return [4 /*yield*/, recordsRes.json()];
                    case 6:
                        recordsData = _b.sent();
                        if (isMounted) {
                            setDoctorRecords(Array.isArray(recordsData.data) ? recordsData.data : []);
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        if (isMounted) {
                            setDoctorRecords([]);
                        }
                        _b.label = 8;
                    case 8: return [3 /*break*/, 11];
                    case 9:
                        error_2 = _b.sent();
                        console.warn('Failed to load doctor dashboard data', error_2);
                        if (isMounted) {
                            setDoctorAppointments([]);
                            setDoctorRecords([]);
                        }
                        return [3 /*break*/, 11];
                    case 10:
                        if (isMounted)
                            setDoctorLoading(false);
                        return [7 /*endfinally*/];
                    case 11: return [2 /*return*/];
                }
            });
        }); };
        void fetchDoctorData();
        return function () { isMounted = false; };
    }, [user === null || user === void 0 ? void 0 : user.uid, role]);
    var doctorUpcoming = (0, react_1.useMemo)(function () {
        if (role !== 'doctor')
            return [];
        return doctorAppointments
            .filter(function (apt) { return apt.__when instanceof Date && !isNaN(apt.__when) && ['scheduled', 'confirmed', 'in-progress'].includes(apt.status); })
            .sort(function (a, b) { return a.__when.getTime() - b.__when.getTime(); });
    }, [role, doctorAppointments]);
    var doctorToday = (0, react_1.useMemo)(function () {
        if (role !== 'doctor')
            return [];
        var today = new Date();
        return doctorUpcoming.filter(function (apt) { return isSameDay(apt.__when, today); });
    }, [role, doctorUpcoming]);
    var nextAppointment = doctorUpcoming.length > 0 ? doctorUpcoming[0] : null;
    var doctorUniquePatients = (0, react_1.useMemo)(function () {
        if (role !== 'doctor')
            return 0;
        var ids = new Set();
        doctorAppointments.forEach(function (apt) {
            if (apt === null || apt === void 0 ? void 0 : apt.patientId)
                ids.add(apt.patientId);
        });
        return ids.size;
    }, [role, doctorAppointments]);
    var recentDoctorRecords = (0, react_1.useMemo)(function () {
        if (role !== 'doctor')
            return [];
        var sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return doctorRecords
            .map(function (record) { return (__assign(__assign({}, record), { __when: safeToDate(record.recordDate || record.uploadedAt) })); })
            .filter(function (record) { return record.__when instanceof Date && !isNaN(record.__when) && record.__when >= sevenDaysAgo; })
            .sort(function (a, b) { return b.__when.getTime() - a.__when.getTime(); });
    }, [role, doctorRecords]);
    var loadAdminStats = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var res, data, error_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    setAdminStatsLoading(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/users', { method: 'PATCH', credentials: 'include' })];
                case 2:
                    res = _b.sent();
                    if (!res.ok)
                        throw new Error('Failed to load user stats');
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = _b.sent();
                    setAdminStats((_a = data === null || data === void 0 ? void 0 : data.data) !== null && _a !== void 0 ? _a : null);
                    return [3 /*break*/, 6];
                case 4:
                    error_3 = _b.sent();
                    console.error('Failed to load admin stats', error_3);
                    setAdminActionMessage({ type: 'error', text: t('dashboard.admin.error.loadStats') });
                    setAdminStats(null);
                    return [3 /*break*/, 6];
                case 5:
                    setAdminStatsLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [t]);
    var loadAdminUsers = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var params, res, err, data, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setAdminUsersLoading(true);
                    setAdminError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, 7, 8]);
                    params = new URLSearchParams();
                    if (adminFilterRole)
                        params.set('role', adminFilterRole);
                    if (adminFilterStatus)
                        params.set('status', adminFilterStatus);
                    return [4 /*yield*/, fetch("/api/users?".concat(params.toString()), { credentials: 'include' })];
                case 2:
                    res = _a.sent();
                    if (!!res.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, res.json().catch(function () { return ({}); })];
                case 3:
                    err = _a.sent();
                    throw new Error((err === null || err === void 0 ? void 0 : err.error) || 'Failed to load users');
                case 4: return [4 /*yield*/, res.json()];
                case 5:
                    data = _a.sent();
                    setAdminUsers(Array.isArray(data === null || data === void 0 ? void 0 : data.data) ? data.data : []);
                    return [3 /*break*/, 8];
                case 6:
                    error_4 = _a.sent();
                    console.error('Failed to load admin users', error_4);
                    setAdminUsers([]);
                    setAdminError(t('dashboard.admin.error.loadUsers'));
                    return [3 /*break*/, 8];
                case 7:
                    setAdminUsersLoading(false);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); }, [adminFilterRole, adminFilterStatus, t]);
    (0, react_1.useEffect)(function () {
        if (loading || role !== 'admin')
            return;
        void loadAdminStats();
        void loadAdminUsers();
    }, [loading, role, loadAdminStats, loadAdminUsers]);
    (0, react_1.useEffect)(function () {
        if (loading || role !== 'admin')
            return;
        void loadAdminUsers();
    }, [loading, role, loadAdminUsers]);
    var filteredAdminUsers = (0, react_1.useMemo)(function () {
        if (!adminSearch)
            return adminUsers;
        var term = adminSearch.trim().toLowerCase();
        return adminUsers.filter(function (user) {
            var _a, _b, _c;
            var fields = [(_a = user.displayName) !== null && _a !== void 0 ? _a : '', (_b = user.email) !== null && _b !== void 0 ? _b : '', (_c = user.role) !== null && _c !== void 0 ? _c : ''];
            return fields.some(function (field) { return field.toLowerCase().includes(term); });
        });
    }, [adminUsers, adminSearch]);
    var handleAdminUserAction = (0, react_1.useCallback)(function (userId_1, action_1) {
        var args_1 = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args_1[_i - 2] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([userId_1, action_1], args_1, true), void 0, function (userId, action, payload, successMessage) {
            var res, err, data, error_5;
            if (payload === void 0) { payload = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setAdminActionMessage(null);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, fetch('/api/users', {
                                method: 'PUT',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(__assign({ userId: userId, action: action }, payload))
                            })];
                    case 2:
                        res = _a.sent();
                        if (!!res.ok) return [3 /*break*/, 4];
                        return [4 /*yield*/, res.json().catch(function () { return ({}); })];
                    case 3:
                        err = _a.sent();
                        throw new Error((err === null || err === void 0 ? void 0 : err.error) || 'Action failed');
                    case 4: return [4 /*yield*/, res.json()];
                    case 5:
                        data = _a.sent();
                        setAdminActionMessage({ type: 'success', text: successMessage || (data === null || data === void 0 ? void 0 : data.message) || t('dashboard.admin.filter.refresh') });
                        return [4 /*yield*/, Promise.all([loadAdminStats(), loadAdminUsers()])];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        error_5 = _a.sent();
                        console.error('Admin action failed', error_5);
                        setAdminActionMessage({ type: 'error', text: t('dashboard.admin.error.updateUser') });
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    }, [loadAdminStats, loadAdminUsers, t]);
    var handleAdminRoleChange = (0, react_1.useCallback)(function (userId, newRole) { return __awaiter(_this, void 0, void 0, function () {
        var label, formatted;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!newRole)
                        return [2 /*return*/];
                    label = adminRoleLabels[newRole] || newRole;
                    formatted = formatTemplateString(t('dashboard.admin.actions.roleUpdated', 'User role updated to {role}'), { role: label });
                    return [4 /*yield*/, handleAdminUserAction(userId, 'changeRole', { role: newRole }, formatted)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, [adminRoleLabels, handleAdminUserAction, t]);
    var groupedRecords = (0, react_1.useMemo)(function () {
        if (role !== 'doctor')
            return [];
        var groups = new Map();
        doctorRecords.forEach(function (record) {
            var _a;
            var patientId = record.patientId || 'unknown';
            var patientName = record.patientName || 'Patient';
            if (!groups.has(patientId)) {
                groups.set(patientId, { patientId: patientId, patientName: patientName, items: [] });
            }
            (_a = groups.get(patientId)) === null || _a === void 0 ? void 0 : _a.items.push(__assign(__assign({}, record), { __when: safeToDate(record.recordDate || record.uploadedAt) }));
        });
        return Array.from(groups.values())
            .map(function (group) { return (__assign(__assign({}, group), { items: group.items.sort(function (a, b) { return b.__when.getTime() - a.__when.getTime(); }) })); })
            .sort(function (a, b) { return a.patientName.localeCompare(b.patientName); });
    }, [role, doctorRecords]);
    if (loading) {
        return (React.createElement("div", { className: "flex h-screen items-center justify-center" },
            React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary" })));
    }
    var getUserGreeting = function () {
        var name = (user === null || user === void 0 ? void 0 : user.displayName) || (user === null || user === void 0 ? void 0 : user.email) || t('roles.user');
        var hour = new Date().getHours();
        if (hour < 12)
            return formatTemplateString(t('dashboard.greeting.morning', 'Good morning, {name}!'), { name: name });
        if (hour < 17)
            return formatTemplateString(t('dashboard.greeting.afternoon', 'Good afternoon, {name}!'), { name: name });
        return formatTemplateString(t('dashboard.greeting.evening', 'Good evening, {name}!'), { name: name });
    };
    var getRoleDisplayName = function () {
        switch (role) {
            case 'patient': return t('roles.patient');
            case 'doctor': return t('roles.doctor');
            case 'pharmacyOwner': return t('roles.pharmacyOwner');
            case 'admin': return t('roles.admin');
            default: return t('roles.user');
        }
    };
    if (role === 'doctor') {
        var greetingName = (user === null || user === void 0 ? void 0 : user.displayName) || (user === null || user === void 0 ? void 0 : user.email) || t('roles.doctor');
        var nextWhen = nextAppointment ? safeToDate(nextAppointment.__when || nextAppointment.scheduledAt) : null;
        var nextJoinEnabled = nextWhen ? withinDoctorJoinWindow(nextWhen, (nextAppointment === null || nextAppointment === void 0 ? void 0 : nextAppointment.duration) || 30) : false;
        var scheduleList = (doctorToday.length > 0 ? doctorToday : doctorUpcoming).slice(0, 6);
        var recentGroupedRecords = groupedRecords.slice(0, 4);
        return (React.createElement("div", { className: "space-y-8" },
            React.createElement("section", null,
                React.createElement("h1", { className: "text-3xl font-bold text-primary" }, formatTemplateString(t('dashboard.doctor.greeting', 'Hello, {name}!'), { name: greetingName })),
                React.createElement("p", { className: "text-muted-foreground mt-1" }, t('dashboard.doctor.subtitle'))),
            React.createElement("section", { className: "grid grid-cols-1 md:grid-cols-3 gap-6" },
                React.createElement(card_1.Card, null,
                    React.createElement(card_1.CardContent, { className: "flex items-center p-6" },
                        React.createElement(lucide_react_1.Stethoscope, { className: "h-8 w-8 text-accent mr-4" }),
                        React.createElement("div", null,
                            React.createElement("p", { className: "text-2xl font-bold" }, doctorToday.length),
                            React.createElement("p", { className: "text-sm text-muted-foreground" }, t('dashboard.doctor.stats.today'))))),
                React.createElement(card_1.Card, null,
                    React.createElement(card_1.CardContent, { className: "flex items-center p-6" },
                        React.createElement(lucide_react_1.UserCheck, { className: "h-8 w-8 text-accent mr-4" }),
                        React.createElement("div", null,
                            React.createElement("p", { className: "text-2xl font-bold" }, doctorUniquePatients),
                            React.createElement("p", { className: "text-sm text-muted-foreground" }, t('dashboard.doctor.stats.activePatients'))))),
                React.createElement(card_1.Card, null,
                    React.createElement(card_1.CardContent, { className: "flex items-center p-6" },
                        React.createElement(lucide_react_1.Activity, { className: "h-8 w-8 text-accent mr-4" }),
                        React.createElement("div", null,
                            React.createElement("p", { className: "text-2xl font-bold" }, recentDoctorRecords.length),
                            React.createElement("p", { className: "text-sm text-muted-foreground" }, t('dashboard.doctor.stats.newRecords')))))),
            React.createElement("section", null,
                React.createElement("h2", { className: "text-xl font-semibold mb-4" }, t('dashboard.doctor.quickActions')),
                React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" },
                    React.createElement(button_1.Button, { asChild: true, className: "h-auto p-4 flex-col space-y-2" },
                        React.createElement(link_1.default, { href: "/dashboard/appointments" },
                            React.createElement(lucide_react_1.Calendar, { className: "h-6 w-6" }),
                            React.createElement("span", null, t('dashboard.doctor.actions.manageAppointments')))),
                    React.createElement(button_1.Button, { asChild: true, variant: "outline", className: "h-auto p-4 flex-col space-y-2" },
                        React.createElement(link_1.default, { href: "/dashboard/health-records" },
                            React.createElement(lucide_react_1.FileText, { className: "h-6 w-6" }),
                            React.createElement("span", null, t('dashboard.doctor.actions.patientRecords')))),
                    React.createElement(button_1.Button, { asChild: true, variant: "outline", className: "h-auto p-4 flex-col space-y-2" },
                        React.createElement(link_1.default, { href: "/dashboard/profile" },
                            React.createElement(lucide_react_1.Users, { className: "h-6 w-6" }),
                            React.createElement("span", null, t('dashboard.doctor.actions.updateProfile')))))),
            React.createElement("section", { className: "grid grid-cols-1 xl:grid-cols-3 gap-6" },
                React.createElement(card_1.Card, { className: "xl:col-span-2" },
                    React.createElement(card_1.CardHeader, { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-3" },
                        React.createElement("div", null,
                            React.createElement(card_1.CardTitle, null, t('dashboard.doctor.schedule.title')),
                            React.createElement(card_1.CardDescription, null, doctorToday.length > 0 ? t('dashboard.doctor.schedule.today') : t('dashboard.doctor.schedule.upcoming'))),
                        React.createElement(button_1.Button, { asChild: true, size: "sm", variant: "outline" },
                            React.createElement(link_1.default, { href: "/dashboard/appointments" }, t('dashboard.doctor.schedule.viewAll')))),
                    React.createElement(card_1.CardContent, { className: "space-y-3" },
                        doctorLoading && (React.createElement("div", { className: "space-y-2" },
                            React.createElement("div", { className: "h-16 rounded-md bg-muted animate-pulse" }),
                            React.createElement("div", { className: "h-16 rounded-md bg-muted animate-pulse" }),
                            React.createElement("div", { className: "h-16 rounded-md bg-muted animate-pulse" }))),
                        !doctorLoading && scheduleList.length === 0 && (React.createElement("div", { className: "text-sm text-muted-foreground" }, t('dashboard.doctor.schedule.empty'))),
                        scheduleList.map(function (apt) {
                            var _a, _b;
                            var when = safeToDate(apt.__when || apt.scheduledAt);
                            var patientName = apt.patientName || (((_b = (_a = apt.patientId) === null || _a === void 0 ? void 0 : _a.slice) === null || _b === void 0 ? void 0 : _b.call(_a, 0, 8)) || t('roles.patient'));
                            var patientPhoto = apt.patientPhoto || null;
                            var initials = getInitials(patientName) || t('roles.patient').slice(0, 2).toUpperCase();
                            return (React.createElement("div", { key: apt.id, className: "flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md p-3" },
                                React.createElement("div", { className: "flex items-center gap-3" },
                                    patientPhoto ? (React.createElement("img", { src: patientPhoto, alt: patientName, className: "h-10 w-10 rounded-full object-cover" })) : (React.createElement("div", { className: "h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium" }, initials)),
                                    React.createElement("div", null,
                                        React.createElement("p", { className: "font-medium" }, patientName),
                                        React.createElement("p", { className: "text-xs text-muted-foreground" },
                                            when.toLocaleDateString(),
                                            " \u2022 ",
                                            when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                            " \u2022 ",
                                            apt.status))),
                                React.createElement("div", { className: "mt-3 sm:mt-0 flex items-center gap-2" },
                                    React.createElement(link_1.default, { href: "/dashboard/appointments?focus=".concat(apt.id), className: "text-xs text-primary hover:underline" }, t('dashboard.doctor.schedule.viewDetails')))));
                        }))),
                React.createElement(card_1.Card, null,
                    React.createElement(card_1.CardHeader, null,
                        React.createElement(card_1.CardTitle, null, t('dashboard.doctor.next.title')),
                        React.createElement(card_1.CardDescription, null, nextWhen ? nextWhen.toLocaleString() : t('dashboard.doctor.next.none'))),
                    React.createElement(card_1.CardContent, { className: "space-y-4" }, nextAppointment ? (React.createElement(React.Fragment, null,
                        React.createElement("div", { className: "flex items-center gap-3" },
                            React.createElement(lucide_react_1.Calendar, { className: "h-5 w-5 text-accent" }),
                            React.createElement("div", null,
                                React.createElement("p", { className: "font-semibold" }, nextAppointment.patientName || t('roles.patient')),
                                React.createElement("p", { className: "text-sm text-muted-foreground" },
                                    t('dashboard.doctor.next.statusLabel'),
                                    ": ",
                                    nextAppointment.status))),
                        React.createElement("div", { className: "flex items-center gap-3 text-sm text-muted-foreground" },
                            React.createElement(lucide_react_1.Clock, { className: "h-4 w-4" }),
                            React.createElement("span", null, nextWhen === null || nextWhen === void 0 ? void 0 : nextWhen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))),
                        React.createElement("div", { className: "flex items-center gap-3 text-sm text-muted-foreground" },
                            React.createElement(lucide_react_1.ClipboardList, { className: "h-4 w-4" }),
                            React.createElement("span", null, nextAppointment.reasonForVisit || t('dashboard.common.consultation'))),
                        React.createElement(button_1.Button, { asChild: true, className: "w-full", disabled: !nextJoinEnabled },
                            React.createElement(link_1.default, { href: "/dashboard/call/".concat(nextAppointment.id, "?call=").concat(nextAppointment.callType || 'video') }, nextJoinEnabled ? t('dashboard.doctor.next.join') : t('dashboard.doctor.next.joinDisabled'))),
                        React.createElement(button_1.Button, { asChild: true, variant: "outline", className: "w-full" },
                            React.createElement(link_1.default, { href: "/dashboard/appointments" }, t('dashboard.doctor.next.manage'))))) : (React.createElement("div", { className: "text-sm text-muted-foreground" }, t('dashboard.doctor.next.noAppointments')))))),
            React.createElement(card_1.Card, null,
                React.createElement(card_1.CardHeader, null,
                    React.createElement(card_1.CardTitle, null, t('dashboard.doctor.records.title')),
                    React.createElement(card_1.CardDescription, null, t('dashboard.doctor.records.subtitle'))),
                React.createElement(card_1.CardContent, { className: "space-y-4" },
                    doctorLoading && (React.createElement("div", { className: "space-y-2" },
                        React.createElement("div", { className: "h-14 rounded-md bg-muted animate-pulse" }),
                        React.createElement("div", { className: "h-14 rounded-md bg-muted animate-pulse" }),
                        React.createElement("div", { className: "h-14 rounded-md bg-muted animate-pulse" }))),
                    !doctorLoading && groupedRecords.length === 0 && (React.createElement("div", { className: "text-sm text-muted-foreground" }, t('dashboard.doctor.records.empty'))),
                    !doctorLoading && groupedRecords.length > 0 && (React.createElement("div", { className: "space-y-4" }, recentGroupedRecords.map(function (group) { return (React.createElement("div", { key: group.patientId, className: "border rounded-md p-3 space-y-2" },
                        React.createElement("div", { className: "flex items-center gap-3" },
                            React.createElement("div", { className: "h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium" }, getInitials(group.patientName) || t('roles.patient').slice(0, 2).toUpperCase()),
                            React.createElement("div", null,
                                React.createElement("p", { className: "font-semibold" }, group.patientName),
                                React.createElement("p", { className: "text-xs text-muted-foreground" }, group.items.length === 1
                                    ? t('dashboard.doctor.records.countSingular', { count: group.items.length })
                                    : t('dashboard.doctor.records.countPlural', { count: group.items.length })))),
                        React.createElement("div", { className: "space-y-2" }, group.items.slice(0, 3).map(function (record) {
                            var when = safeToDate(record.__when || record.recordDate || record.uploadedAt);
                            return (React.createElement("div", { key: record.id, className: "flex items-start justify-between text-sm border rounded-md px-3 py-2" },
                                React.createElement("div", null,
                                    React.createElement("p", { className: "font-medium" }, record.title || record.fileName || t('dashboard.common.unnamed')),
                                    React.createElement("p", { className: "text-xs text-muted-foreground" },
                                        record.type || 'record',
                                        " \u2022 ",
                                        when instanceof Date && !isNaN(when.getTime()) ? when.toLocaleDateString() : t('dashboard.common.unknownDate'))),
                                React.createElement("span", { className: "text-xs text-muted-foreground" }, record.fileSize ? "".concat(Math.round(record.fileSize / 1024), " KB") : '')));
                        })))); }))),
                    React.createElement("div", { className: "flex justify-end" },
                        React.createElement(button_1.Button, { asChild: true, variant: "ghost", size: "sm" },
                            React.createElement(link_1.default, { href: "/dashboard/health-records" }, t('dashboard.doctor.records.open'))))))));
    }
    // Patient Dashboard
    if (role === 'patient') {
        return (React.createElement("div", { className: "space-y-8" },
            React.createElement("div", null,
                React.createElement("h1", { className: "text-3xl font-bold text-primary" }, getUserGreeting()),
                React.createElement("p", { className: "text-muted-foreground mt-1" }, "Welcome to your ArogyaMitra dashboard")),
            React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6" },
                React.createElement(card_1.Card, null,
                    React.createElement(card_1.CardContent, { className: "flex items-center p-6" },
                        React.createElement(lucide_react_1.Calendar, { className: "h-8 w-8 text-accent mr-4" }),
                        React.createElement("div", null,
                            React.createElement("p", { className: "text-2xl font-bold" }, stats.upcomingAppointments),
                            React.createElement("p", { className: "text-sm text-muted-foreground" }, "Upcoming Appointments")))),
                React.createElement(card_1.Card, null,
                    React.createElement(card_1.CardContent, { className: "flex items-center p-6" },
                        React.createElement(lucide_react_1.FileText, { className: "h-8 w-8 text-accent mr-4" }),
                        React.createElement("div", null,
                            React.createElement("p", { className: "text-2xl font-bold" }, stats.totalRecords),
                            React.createElement("p", { className: "text-sm text-muted-foreground" }, "Health Records")))),
                React.createElement(card_1.Card, null,
                    React.createElement(card_1.CardContent, { className: "flex items-center p-6" },
                        React.createElement(lucide_react_1.Video, { className: "h-8 w-8 text-accent mr-4" }),
                        React.createElement("div", null,
                            React.createElement("p", { className: "text-2xl font-bold" }, stats.completedConsultations),
                            React.createElement("p", { className: "text-sm text-muted-foreground" }, "Consultations"))))),
            React.createElement("div", null,
                React.createElement("h2", { className: "text-xl font-semibold mb-4" }, "Quick Actions"),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" },
                    React.createElement(button_1.Button, { asChild: true, className: "h-auto p-4 flex-col space-y-2" },
                        React.createElement(link_1.default, { href: "/dashboard/appointments" },
                            React.createElement(lucide_react_1.Calendar, { className: "h-6 w-6" }),
                            React.createElement("span", null, "Book Appointment"))),
                    React.createElement(button_1.Button, { asChild: true, variant: "outline", className: "h-auto p-4 flex-col space-y-2" },
                        React.createElement(link_1.default, { href: "/dashboard/health-records" },
                            React.createElement(lucide_react_1.FileText, { className: "h-6 w-6" }),
                            React.createElement("span", null, "Health Records"))),
                    React.createElement(button_1.Button, { asChild: true, variant: "outline", className: "h-auto p-4 flex-col space-y-2" },
                        React.createElement(link_1.default, { href: "/dashboard/ai-chat" },
                            React.createElement(lucide_react_1.MessageCircle, { className: "h-6 w-6" }),
                            React.createElement("span", null, "AI Health Assistant"))),
                    React.createElement(button_1.Button, { asChild: true, variant: "outline", className: "h-auto p-4 flex-col space-y-2" },
                        React.createElement(link_1.default, { href: "/dashboard/profile" },
                            React.createElement(lucide_react_1.Users, { className: "h-6 w-6" }),
                            React.createElement("span", null, "My Profile"))))),
            React.createElement(card_1.Card, null,
                React.createElement(card_1.CardHeader, null,
                    React.createElement(card_1.CardTitle, null, t('dashboard.patient.recent.title')),
                    React.createElement(card_1.CardDescription, null, t('dashboard.patient.recent.subtitle'))),
                React.createElement(card_1.CardContent, null,
                    React.createElement("div", { className: "space-y-4" }, recentActivity.length > 0 ? (recentActivity.map(function (activity) { return (React.createElement("div", { key: activity.id, className: "flex items-center justify-between p-3 border rounded-lg" },
                        React.createElement("div", { className: "flex items-center space-x-3" },
                            activity.type === 'appointment' && React.createElement(lucide_react_1.Calendar, { className: "h-4 w-4 text-muted-foreground" }),
                            activity.type === 'record' && React.createElement(lucide_react_1.FileText, { className: "h-4 w-4 text-muted-foreground" }),
                            activity.type === 'consultation' && React.createElement(lucide_react_1.Video, { className: "h-4 w-4 text-muted-foreground" }),
                            React.createElement("div", null,
                                React.createElement("p", { className: "font-medium" }, activity.title),
                                React.createElement("p", { className: "text-sm text-muted-foreground" }, activity.description))),
                        React.createElement(lucide_react_1.ArrowRight, { className: "h-4 w-4 text-muted-foreground" }))); })) : (React.createElement("div", { className: "text-center py-8 text-muted-foreground" },
                        React.createElement(lucide_react_1.Calendar, { className: "h-8 w-8 mx-auto mb-2 opacity-50" }),
                        React.createElement("p", null, t('dashboard.patient.recent.empty.title')),
                        React.createElement("p", { className: "text-sm" }, t('dashboard.patient.recent.empty.subtitle')))))))));
    }
    // Generic dashboard for other roles
    if (role === 'admin') {
        return (React.createElement("div", { className: "space-y-8" },
            React.createElement("div", { className: "flex flex-col gap-2" },
                React.createElement("h1", { className: "text-3xl font-bold text-primary" }, t('dashboard.admin.title')),
                React.createElement("p", { className: "text-muted-foreground" }, t('dashboard.admin.subtitle'))),
            adminActionMessage && (React.createElement("div", { className: "rounded-md border p-3 text-sm ".concat(adminActionMessage.type === 'success'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700') }, adminActionMessage.text)),
            React.createElement("section", { className: "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" },
                React.createElement(card_1.Card, { className: "bg-card/60 backdrop-blur" },
                    React.createElement(card_1.CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2" },
                        React.createElement(card_1.CardTitle, { className: "text-sm font-medium" }, t('dashboard.admin.stats.total')),
                        React.createElement(lucide_react_1.Users, { className: "h-5 w-5 text-accent" })),
                    React.createElement(card_1.CardContent, null,
                        React.createElement("div", { className: "text-2xl font-bold" }, (_a = adminStats === null || adminStats === void 0 ? void 0 : adminStats.total) !== null && _a !== void 0 ? _a : '—'),
                        React.createElement("p", { className: "text-xs text-muted-foreground" }, t('dashboard.admin.stats.totalHint')))),
                React.createElement(card_1.Card, { className: "bg-card/60 backdrop-blur" },
                    React.createElement(card_1.CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2" },
                        React.createElement(card_1.CardTitle, { className: "text-sm font-medium" }, t('dashboard.admin.stats.verified')),
                        React.createElement(lucide_react_1.UserCheck, { className: "h-5 w-5 text-accent" })),
                    React.createElement(card_1.CardContent, null,
                        React.createElement("div", { className: "text-2xl font-bold" }, (_b = adminStats === null || adminStats === void 0 ? void 0 : adminStats.verified) !== null && _b !== void 0 ? _b : '—'),
                        React.createElement("p", { className: "text-xs text-muted-foreground" }, t('dashboard.admin.stats.verifiedHint')))),
                React.createElement(card_1.Card, { className: "bg-card/60 backdrop-blur" },
                    React.createElement(card_1.CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2" },
                        React.createElement(card_1.CardTitle, { className: "text-sm font-medium" }, t('dashboard.admin.stats.active')),
                        React.createElement(lucide_react_1.Shield, { className: "h-5 w-5 text-accent" })),
                    React.createElement(card_1.CardContent, null,
                        React.createElement("div", { className: "text-2xl font-bold" }, (_c = adminStats === null || adminStats === void 0 ? void 0 : adminStats.active) !== null && _c !== void 0 ? _c : '—'),
                        React.createElement("p", { className: "text-xs text-muted-foreground" }, t('dashboard.admin.stats.activeHint')))),
                React.createElement(card_1.Card, { className: "bg-card/60 backdrop-blur" },
                    React.createElement(card_1.CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2" },
                        React.createElement(card_1.CardTitle, { className: "text-sm font-medium" }, t('dashboard.admin.stats.new')),
                        React.createElement(lucide_react_1.UserCog, { className: "h-5 w-5 text-accent" })),
                    React.createElement(card_1.CardContent, null,
                        React.createElement("div", { className: "text-2xl font-bold" }, (_d = adminStats === null || adminStats === void 0 ? void 0 : adminStats.newThisMonth) !== null && _d !== void 0 ? _d : '—'),
                        React.createElement("p", { className: "text-xs text-muted-foreground" }, t('dashboard.admin.stats.newHint'))))),
            React.createElement(card_1.Card, null,
                React.createElement(card_1.CardHeader, { className: "space-y-2" },
                    React.createElement(card_1.CardTitle, null, t('dashboard.admin.directory.title')),
                    React.createElement(card_1.CardDescription, null, t('dashboard.admin.directory.subtitle'))),
                React.createElement(card_1.CardContent, { className: "space-y-4" },
                    React.createElement("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between" },
                        React.createElement("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-3" },
                            React.createElement("div", { className: "space-y-1" },
                                React.createElement("label", { className: "text-xs font-medium uppercase tracking-wide text-muted-foreground" }, t('dashboard.admin.filter.role')),
                                React.createElement("select", { value: adminFilterRole, onChange: function (event) { return setAdminFilterRole(event.target.value); }, className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" }, adminRoleFilters.map(function (option) { return (React.createElement("option", { key: option.value, value: option.value }, option.label)); }))),
                            React.createElement("div", { className: "space-y-1" },
                                React.createElement("label", { className: "text-xs font-medium uppercase tracking-wide text-muted-foreground" }, t('dashboard.admin.filter.status')),
                                React.createElement("select", { value: adminFilterStatus, onChange: function (event) { return setAdminFilterStatus(event.target.value); }, className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" }, adminStatusFilters.map(function (option) { return (React.createElement("option", { key: option.value, value: option.value }, option.label)); }))),
                            React.createElement("div", { className: "space-y-1" },
                                React.createElement("label", { className: "text-xs font-medium uppercase tracking-wide text-muted-foreground" }, t('dashboard.admin.filter.search')),
                                React.createElement(input_1.Input, { value: adminSearch, onChange: function (event) { return setAdminSearch(event.target.value); }, placeholder: t('dashboard.admin.filter.placeholder') }))),
                        React.createElement("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center" },
                            React.createElement(button_1.Button, { variant: "outline", onClick: function () {
                                    setAdminFilterRole('');
                                    setAdminFilterStatus('');
                                    setAdminSearch('');
                                } }, t('dashboard.admin.filter.clear')),
                            React.createElement(button_1.Button, { onClick: function () {
                                    void loadAdminStats();
                                    void loadAdminUsers();
                                }, disabled: adminStatsLoading || adminUsersLoading },
                                React.createElement(lucide_react_1.RefreshCcw, { className: "mr-2 h-4 w-4" }),
                                " ",
                                t('dashboard.admin.filter.refresh')))),
                    adminError && (React.createElement("div", { className: "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" }, adminError)),
                    React.createElement("div", { className: "hidden rounded-md border md:block" },
                        React.createElement("div", { className: "grid grid-cols-[2fr,2fr,1.5fr,1fr,1.5fr] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" },
                            React.createElement("span", null, t('dashboard.admin.table.header.name')),
                            React.createElement("span", null, t('dashboard.admin.table.header.email')),
                            React.createElement("span", null, t('dashboard.admin.table.header.role')),
                            React.createElement("span", null, t('dashboard.admin.table.header.status')),
                            React.createElement("span", null, t('dashboard.admin.table.header.actions'))),
                        adminUsersLoading && (React.createElement("div", { className: "px-4 py-6 text-sm text-muted-foreground" }, t('dashboard.admin.loading'))),
                        !adminUsersLoading && filteredAdminUsers.length === 0 && (React.createElement("div", { className: "px-4 py-6 text-sm text-muted-foreground" }, t('dashboard.admin.empty'))),
                        !adminUsersLoading && filteredAdminUsers.map(function (item) { return (React.createElement("div", { key: item.id, className: "grid grid-cols-[2fr,2fr,1.5fr,1fr,1.5fr] items-center gap-4 border-b px-4 py-4 text-sm last:border-0" },
                            React.createElement("div", { className: "font-medium" }, item.displayName || t('dashboard.common.unnamed')),
                            React.createElement("div", { className: "truncate text-muted-foreground" }, item.email || '—'),
                            React.createElement("div", null,
                                React.createElement("select", { className: "w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", value: item.role, onChange: function (event) { return void handleAdminRoleChange(item.id || item.uid || '', event.target.value); } }, Object.keys(adminRoleLabels).map(function (value) {
                                    var _a;
                                    return (React.createElement("option", { key: value, value: value }, (_a = adminRoleLabels[value]) !== null && _a !== void 0 ? _a : value));
                                }))),
                            React.createElement("div", null,
                                React.createElement("span", { className: "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ".concat(item.isActive === false
                                        ? 'bg-rose-100 text-rose-700'
                                        : item.isVerified === false
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-emerald-100 text-emerald-700') }, item.isActive === false
                                    ? t('dashboard.admin.status.suspended')
                                    : item.isVerified === false
                                        ? t('dashboard.admin.status.pending')
                                        : t('dashboard.admin.status.active'))),
                            React.createElement("div", { className: "flex items-center gap-2" },
                                React.createElement(button_1.Button, { size: "sm", variant: "outline", onClick: function () { return void handleAdminUserAction(item.id || item.uid || '', 'verify'); }, disabled: item.isVerified }, t('dashboard.admin.actions.verify')),
                                item.isActive ? (React.createElement(button_1.Button, { size: "sm", variant: "destructive", onClick: function () { return void handleAdminUserAction(item.id || item.uid || '', 'suspend'); } }, t('dashboard.admin.actions.suspend'))) : (React.createElement(button_1.Button, { size: "sm", variant: "outline", onClick: function () { return void handleAdminUserAction(item.id || item.uid || '', 'activate'); } }, t('dashboard.admin.actions.activate')))))); })),
                    React.createElement("div", { className: "space-y-3 md:hidden" },
                        adminUsersLoading && React.createElement("div", { className: "text-sm text-muted-foreground" }, t('dashboard.admin.loading')),
                        !adminUsersLoading && filteredAdminUsers.length === 0 && (React.createElement("div", { className: "rounded-md border border-dashed p-4 text-sm text-muted-foreground" }, t('dashboard.admin.empty'))),
                        !adminUsersLoading && filteredAdminUsers.map(function (item) { return (React.createElement("div", { key: item.id, className: "rounded-md border p-4 space-y-3" },
                            React.createElement("div", { className: "flex items-center justify-between" },
                                React.createElement("div", null,
                                    React.createElement("p", { className: "font-semibold" }, item.displayName || t('dashboard.common.unnamed')),
                                    React.createElement("p", { className: "text-xs text-muted-foreground" }, item.email || '—')),
                                React.createElement("span", { className: "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ".concat(item.isActive === false
                                        ? 'bg-rose-100 text-rose-700'
                                        : item.isVerified === false
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-emerald-100 text-emerald-700') }, item.isActive === false
                                    ? t('dashboard.admin.status.suspended')
                                    : item.isVerified === false
                                        ? t('dashboard.admin.status.pending')
                                        : t('dashboard.admin.status.active'))),
                            React.createElement("div", { className: "space-y-2" },
                                React.createElement("div", { className: "space-y-1" },
                                    React.createElement("label", { className: "text-xs font-medium uppercase tracking-wide text-muted-foreground" }, t('dashboard.admin.filter.role')),
                                    React.createElement("select", { className: "w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", value: item.role, onChange: function (event) { return void handleAdminRoleChange(item.id || item.uid || '', event.target.value); } }, Object.keys(adminRoleLabels).map(function (value) {
                                        var _a;
                                        return (React.createElement("option", { key: value, value: value }, (_a = adminRoleLabels[value]) !== null && _a !== void 0 ? _a : value));
                                    }))),
                                React.createElement("div", { className: "text-xs text-muted-foreground" }, t('dashboard.admin.joined', { date: formatDate(item.createdAt) }))),
                            React.createElement("div", { className: "flex flex-wrap gap-2" },
                                React.createElement(button_1.Button, { size: "sm", variant: "outline", onClick: function () { return void handleAdminUserAction(item.id || item.uid || '', 'verify'); }, disabled: item.isVerified }, t('dashboard.admin.actions.verify')),
                                item.isActive ? (React.createElement(button_1.Button, { size: "sm", variant: "destructive", onClick: function () { return void handleAdminUserAction(item.id || item.uid || '', 'suspend'); } }, t('dashboard.admin.actions.suspend'))) : (React.createElement(button_1.Button, { size: "sm", variant: "outline", onClick: function () { return void handleAdminUserAction(item.id || item.uid || '', 'activate'); } }, t('dashboard.admin.actions.activate')))))); }))))));
    }
    return (React.createElement("div", { className: "space-y-8" },
        React.createElement("div", null,
            React.createElement("h1", { className: "text-3xl font-bold text-primary" }, getUserGreeting()),
            React.createElement("p", { className: "text-muted-foreground mt-1" },
                t('dashboard.generic.roleLabel'),
                " ",
                getRoleDisplayName())),
        React.createElement(card_1.Card, null,
            React.createElement(card_1.CardContent, { className: "p-8 text-center" },
                React.createElement("h2", { className: "text-xl font-semibold mb-4" }, t('dashboard.generic.title')),
                React.createElement("p", { className: "text-muted-foreground mb-6" }, t('dashboard.generic.subtitle', { role: getRoleDisplayName().toLowerCase() })),
                React.createElement("div", { className: "flex justify-center gap-4" },
                    React.createElement(button_1.Button, { asChild: true },
                        React.createElement(link_1.default, { href: "/dashboard/profile" }, t('dashboard.generic.profile'))),
                    React.createElement(button_1.Button, { asChild: true, variant: "outline" },
                        React.createElement(link_1.default, { href: "/" }, t('dashboard.generic.home'))))))));
}
