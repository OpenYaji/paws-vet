"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { StatCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { BoringAvatar } from "@/components/ui/boring-avatar";
import { Sparkline } from "@/components/ui/sparkline";
import { TagInput } from "@/components/ui/tag-input";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { ShiftRoster } from "@/components/employees/shift-roster";
import { PerformanceTab } from "@/components/employees/performance-tab";
import { BulkActions } from "@/components/employees/bulk-actions";

const ROLE_OPTIONS = [
    { value: "", label: "All Roles" },
    { value: "admin", label: "Admin Staff" },
    { value: "veterinarian", label: "Veterinarian" },
];

const EMPLOYMENT_STATUS_OPTIONS = [
    { value: "full_time", label: "Full Time" },
    { value: "part_time", label: "Part Time" },
    { value: "contract", label: "Contract" },
    { value: "intern", label: "Intern" },
];

const SPECIALIZATION_OPTIONS = [
    "Surgery", "Dermatology", "Cardiology", "Dentistry", "Oncology",
    "Ophthalmology", "Neurology", "Orthopedics", "Avian", "Exotic Animals",
    "Internal Medicine", "Emergency Care", "Grooming", "Nutrition",
];

const INITIAL_FORM: Record<string, any> = {
    role: "admin",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    employee_id: "",
    hire_date: new Date().toISOString().split("T")[0],
    access_level: 1,
    license_number: "",
    license_expiry: "",
    specializations: [] as string[],
    certifications: [] as string[],
    years_of_experience: 0,
    biography: "",
    consultation_fee: 0,
    employment_status: "full_time",
    uploaded_files: [] as { name: string; size: number; type: string }[],
};

type ViewTab = "details" | "performance";

function isLicenseExpiringSoon(expiryDate: string, days = 30): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return diff > 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function isLicenseExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
}

function getSparklineData(emp: any): number[] {
    const hash = ((emp.first_name || "") + (emp.last_name || ""))
        .split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    return Array.from({ length: 7 }, (_, i) =>
        Math.max(0, Math.floor(2 + Math.sin(hash + i * 1.7) * 4 + (hash % 3)))
    );
}

function isEmployeeOnline(emp: any): boolean {
    const hash = ((emp.first_name || "") + (emp.last_name || ""))
        .split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    return emp.account_status === "active" && hash % 3 !== 0;
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [specFilter, setSpecFilter] = useState<string[]>([]);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
    const [modalTab, setModalTab] = useState<ViewTab>("details");
    const [form, setForm] = useState<Record<string, any>>({ ...INITIAL_FORM });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showRoster, setShowRoster] = useState(false);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (roleFilter) params.set("role", roleFilter);
            if (search) params.set("search", search);
            const res = await fetch(`/api/admin/employees?${params.toString()}`);
            const data = await res.json();
            if (res.ok) setEmployees(data.employees || []);
            else console.error(data.error);
        } catch (err) {
            console.error("Failed to fetch employees:", err);
        } finally {
            setLoading(false);
        }
    }, [roleFilter, search]);

    useEffect(() => {
        const debounce = setTimeout(() => fetchEmployees(), 300);
        return () => clearTimeout(debounce);
    }, [fetchEmployees]);

    const filteredEmployees = useMemo(() => {
        let result = employees;
        if (statusFilter) result = result.filter((e) => e.account_status === statusFilter);
        if (specFilter.length > 0) {
            result = result.filter((e) => {
                const empSpecs = (e.specializations || []).map((s: string) => s.toLowerCase());
                return specFilter.some((sf) => empSpecs.includes(sf.toLowerCase()));
            });
        }
        return result;
    }, [employees, statusFilter, specFilter]);

    const totalPages = Math.ceil(filteredEmployees.length / pageSize);
    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    useEffect(() => setCurrentPage(1), [search, roleFilter, statusFilter, specFilter]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedEmployees.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedEmployees.map((e: any) => e.user_id || e.id)));
        }
    };

    const openAddModal = () => {
        setForm({ ...INITIAL_FORM });
        setModalMode("add"); setModalTab("details"); setFormError(""); setShowModal(true);
    };

    const openEditModal = (emp: any) => {
        setForm({
            id: emp.id, user_id: emp.user_id, role: emp.role,
            first_name: emp.first_name, last_name: emp.last_name,
            email: emp.email, phone: emp.phone,
            position: emp.position || "", department: emp.department || "",
            employee_id: emp.employee_id || "", hire_date: emp.hire_date || "",
            access_level: emp.access_level || 1, account_status: emp.account_status || "active",
            license_number: emp.license_number || "", license_expiry: emp.license_expiry || "",
            specializations: emp.specializations || [], certifications: emp.certifications || [],
            years_of_experience: emp.years_of_experience || 0,
            biography: emp.biography || "", consultation_fee: emp.consultation_fee || 0,
            employment_status: emp.employment_status || "full_time",
            termination_date: emp.termination_date || "",
            uploaded_files: emp.uploaded_files || [],
        });
        setModalMode("edit"); setModalTab("details"); setFormError(""); setShowModal(true);
    };

    const openViewModal = (emp: any) => { openEditModal(emp); setModalMode("view"); setModalTab("details"); };
    const closeModal = () => { setShowModal(false); setForm({ ...INITIAL_FORM }); setFormError(""); };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!form.first_name.trim()) return "First name is required.";
        if (!form.last_name.trim()) return "Last name is required.";
        if (!form.email.trim()) return "Email is required.";
        if (!form.phone.trim()) return "Phone is required.";
        if (!/^\+?[1-9]\d{1,14}$/.test(form.phone.replace(/[\s()-]/g, "")))
            return "Invalid phone format (e.g. +1234567890).";
        if (form.role === "admin" && !form.employee_id.trim()) return "Employee ID is required.";
        if (form.role === "admin" && !form.position.trim()) return "Position is required.";
        if (form.role === "veterinarian" && !form.license_number.trim()) return "License number is required.";
        if (!form.hire_date) return "Hire date is required.";
        return "";
    };

    const handleSave = async () => {
        const err = validateForm();
        if (err) { setFormError(err); return; }
        setSaving(true); setFormError("");
        try {
            const method = modalMode === "add" ? "POST" : "PUT";
            const res = await fetch("/api/admin/employees", {
                method, headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");
            closeModal(); fetchEmployees();
        } catch (err: any) { setFormError(err.message); }
        finally { setSaving(false); }
    };

    const confirmDelete = (emp: any) => { setDeleteTarget(emp); setShowDeleteModal(true); };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/employees?user_id=${deleteTarget.user_id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowDeleteModal(false); setDeleteTarget(null); fetchEmployees();
        } catch (err) { console.error("Delete failed:", err); }
        finally { setDeleting(false); }
    };

    const clearFilters = () => { setSearch(""); setRoleFilter(""); setStatusFilter(""); setSpecFilter([]); };

    const totalActive = employees.filter((e) => e.account_status === "active").length;
    const totalAdmins = employees.filter((e) => e.role === "admin").length;
    const totalVets = employees.filter((e) => e.role === "veterinarian").length;
    const totalSuspended = employees.filter((e) => e.account_status === "suspended").length;

    const adminPct = employees.length ? (totalAdmins / employees.length) * 100 : 0;
    const vetPct = employees.length ? (totalVets / employees.length) * 100 : 0;

    const hasActiveFilters = search || roleFilter || statusFilter || specFilter.length > 0;

    const getStatusBadge = (emp: any) => {
        const isVet = emp.role === "veterinarian";
        const licenseExpiring = isVet && isLicenseExpiringSoon(emp.license_expiry);
        const licenseExp = isVet && isLicenseExpired(emp.license_expiry);

        if (emp.account_status === "active" && licenseExpiring) {
            return { classes: "bg-orange-500/10 text-orange-700 dark:text-orange-300", dot: "bg-orange-500", label: "License Expiring", warning: true };
        }
        if (emp.account_status === "active" && licenseExp) {
            return { classes: "bg-destructive/10 text-destructive", dot: "bg-destructive", label: "License Expired", warning: true };
        }
        if (emp.account_status === "suspended") {
            return { classes: "bg-destructive/10 text-destructive", dot: "bg-destructive", label: "Suspended", warning: false };
        }
        if (emp.account_status === "inactive") {
            return { classes: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50", label: "Inactive", warning: false };
        }
        return { classes: "bg-primary/10 text-primary", dot: "bg-primary", label: "Active", warning: false };
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
            {/* Top bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-foreground" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Employees</h1>
                        <p className="text-sm text-muted-foreground">Staff &amp; veterinarian directory</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowRoster((p) => !p)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition border
                            ${showRoster ? "bg-primary/10 text-primary border-primary/30" : "bg-card text-muted-foreground border-border hover:bg-accent"}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Shift View
                    </button>
                    <button onClick={openAddModal}
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-medium text-sm shadow-sm hover:shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        New Employee
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {loading ? (
                    <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
                ) : (
                    <>
                        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-5 md:col-span-2 lg:col-span-1">
                            <div className="relative h-[72px] w-[72px] flex-shrink-0">
                                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                                    <circle cx="18" cy="18" r="14" fill="none" className="stroke-muted" strokeWidth="4" />
                                    <circle cx="18" cy="18" r="14" fill="none" className="stroke-primary" strokeWidth="4"
                                        strokeDasharray={`${adminPct * 0.88} ${88 - adminPct * 0.88}`} strokeDashoffset="0" strokeLinecap="round" />
                                    <circle cx="18" cy="18" r="14" fill="none" className="stroke-primary/50" strokeWidth="4"
                                        strokeDasharray={`${vetPct * 0.88} ${88 - vetPct * 0.88}`} strokeDashoffset={`-${adminPct * 0.88}`} strokeLinecap="round" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                                    {employees.length}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Team</p>
                                <div className="flex items-center gap-2 text-xs text-foreground">
                                    <span className="h-2 w-2 rounded-full bg-primary" /> Admin {totalAdmins}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-foreground mt-1">
                                    <span className="h-2 w-2 rounded-full bg-primary/50" /> Vets {totalVets}
                                </div>
                            </div>
                        </div>

                        <StatCard icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        } label="Active" value={totalActive} />

                        <StatCard icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        } label="Veterinarians" value={totalVets} />

                        <StatCard icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                            </svg>
                        } label="Suspended" value={totalSuspended} />
                    </>
                )}
            </div>

            {/* Shift Roster View */}
            {showRoster && (
                <div className="mb-6">
                    <ShiftRoster employees={employees} />
                </div>
            )}

            {/* Search & Filters */}
            <div className="bg-card rounded-2xl border border-border p-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search employees..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                        />
                    </div>
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                        className="border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none bg-background min-w-[140px]">
                        {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none bg-background min-w-[140px]">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    {hasActiveFilters && (
                        <button onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-destructive bg-destructive/10 rounded-xl hover:bg-destructive/20 transition border border-destructive/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Clear
                        </button>
                    )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Specializations:</span>
                    {SPECIALIZATION_OPTIONS.map((spec) => (
                        <button
                            key={spec}
                            onClick={() => setSpecFilter((prev) =>
                                prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
                            )}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition
                                ${specFilter.includes(spec)
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "bg-card text-muted-foreground border-border hover:border-muted-foreground/30"}`}>
                            {spec}
                        </button>
                    ))}
                </div>
            </div>

            <BulkActions selectedIds={selectedIds} employees={employees} onClearSelection={() => setSelectedIds(new Set())} />

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="px-3 py-3.5 text-left w-10">
                                    <input type="checkbox"
                                        checked={paginatedEmployees.length > 0 && selectedIds.size === paginatedEmployees.length}
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 rounded border-muted-foreground text-primary focus:ring-primary/30" />
                                </th>
                                {["Employee", "Role", "Position", "7-Day Load", "Contact", "Hired", "Status", ""].map((h) => (
                                    <th key={h} className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${h === "" ? "text-right" : "text-left"}`}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-border">
                                        <td className="px-3 py-4"><Skeleton className="h-4 w-4 rounded" /></td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-3.5 w-28 rounded-md" />
                                                    <Skeleton className="h-3 w-36 rounded-md" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4"><Skeleton className="h-6 w-16 rounded-lg" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-3.5 w-24 rounded-md" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-6 w-20 rounded-md" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-3.5 w-28 rounded-md" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-3.5 w-20 rounded-md" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-6 w-16 rounded-lg" /></td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-end gap-1">
                                                <Skeleton className="h-8 w-8 rounded-lg" />
                                                <Skeleton className="h-8 w-8 rounded-lg" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedEmployees.length === 0 ? (
                                <tr><td colSpan={9} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative">
                                            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </div>
                                            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-accent border-2 border-card flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-foreground">No employees found</p>
                                            <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                                                {hasActiveFilters
                                                    ? "No results match your current filters. Try broadening your search."
                                                    : "Get started by adding your first team member."}
                                            </p>
                                        </div>
                                        {hasActiveFilters ? (
                                            <button onClick={clearFilters}
                                                className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Clear All Filters
                                            </button>
                                        ) : (
                                            <button onClick={openAddModal}
                                                className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                                </svg>
                                                Add Employee
                                            </button>
                                        )}
                                    </div>
                                </td></tr>
                            ) : paginatedEmployees.map((emp: any, i: number) => {
                                const isVet = emp.role === "veterinarian";
                                const online = isEmployeeOnline(emp);
                                const sparkData = isVet ? getSparklineData(emp) : [];
                                const { classes, dot, label, warning } = getStatusBadge(emp);
                                const isSelected = selectedIds.has(emp.user_id || emp.id);

                                return (
                                    <tr key={emp.id}
                                        className={`border-b border-border hover:bg-accent/30 transition-colors ${i === paginatedEmployees.length - 1 ? "border-b-0" : ""} ${isSelected ? "bg-primary/5" : ""}`}>
                                        <td className="px-3 py-4">
                                            <input type="checkbox" checked={isSelected}
                                                onChange={() => toggleSelect(emp.user_id || emp.id)}
                                                className="h-4 w-4 rounded border-muted-foreground text-primary focus:ring-primary/30" />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative flex-shrink-0">
                                                    <BoringAvatar name={`${emp.first_name} ${emp.last_name}`} size={40} className="rounded-xl" />
                                                    <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${online ? "bg-green-500" : "bg-muted-foreground/40"}`}>
                                                        {online && <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-40" />}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">{emp.first_name} {emp.last_name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${isVet ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${isVet ? "bg-primary" : "bg-muted-foreground/50"}`} />
                                                {isVet ? "Vet" : "Admin"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-foreground">{emp.position || "—"}</td>
                                        <td className="px-4 py-4">
                                            {isVet ? <Sparkline data={sparkData} width={80} height={24} /> : <span className="text-xs text-muted-foreground">—</span>}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-muted-foreground">{emp.phone || "—"}</td>
                                        <td className="px-4 py-4 text-sm text-muted-foreground">
                                            {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg ${classes}`}>
                                                {warning ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                                                )}
                                                {label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <ActionBtn onClick={() => openViewModal(emp)} title="View" hoverColor="hover:bg-primary/10 hover:text-primary">
                                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                </ActionBtn>
                                                <ActionBtn onClick={() => openEditModal(emp)} title="Edit" hoverColor="hover:bg-accent hover:text-accent-foreground">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </ActionBtn>
                                                {emp.account_status !== "suspended" && (
                                                    <ActionBtn onClick={() => confirmDelete(emp)} title="Suspend" hoverColor="hover:bg-destructive/10 hover:text-destructive">
                                                        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                                                    </ActionBtn>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length}
                        </p>
                        <div className="flex gap-1">
                            <PaginationBtn disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            </PaginationBtn>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <PaginationBtn key={page} active={currentPage === page} onClick={() => setCurrentPage(page)}>{page}</PaginationBtn>
                            ))}
                            <PaginationBtn disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            </PaginationBtn>
                        </div>
                    </div>
                )}
            </div>

            {/* ========== MODAL ========== */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 border border-border">
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${modalMode === "add" ? "bg-primary text-primary-foreground" : modalMode === "edit" ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                                        {modalMode === "add" ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                        ) : modalMode === "edit" ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                        )}
                                    </div>
                                    <h2 className="text-lg font-bold text-foreground">
                                        {modalMode === "add" ? "New Employee" : modalMode === "edit" ? "Edit Employee" : "Employee Details"}
                                    </h2>
                                </div>
                                <button onClick={closeModal} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {modalMode === "view" && form.role === "veterinarian" && (
                                <div className="flex gap-1 mt-3 bg-muted rounded-lg p-1">
                                    {([{ key: "details" as ViewTab, label: "Details", icon: "📋" }, { key: "performance" as ViewTab, label: "Performance", icon: "📊" }]).map((tab) => (
                                        <button key={tab.key} onClick={() => setModalTab(tab.key)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition
                                                ${modalTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                                            <span>{tab.icon}</span> {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-5">
                            {formError && (
                                <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    {formError}
                                </div>
                            )}

                            {modalTab === "performance" && modalMode === "view" ? (
                                <PerformanceTab employee={form} />
                            ) : (
                                <>
                                    {modalMode === "add" && (
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Employee Type</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[{ v: "admin", l: "Admin Staff", icon: "🏢" }, { v: "veterinarian", l: "Veterinarian", icon: "🩺" }].map((o) => (
                                                    <button key={o.v} type="button" onClick={() => setForm((p) => ({ ...p, role: o.v }))}
                                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition ${form.role === o.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/30"}`}>
                                                        <span className="text-base">{o.icon}</span> {o.l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {modalMode === "view" && (
                                        <div className="flex items-center gap-3">
                                            <BoringAvatar name={`${form.first_name} ${form.last_name}`} size={48} className="rounded-xl" />
                                            <div>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${form.role === "veterinarian" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                                    {form.role === "veterinarian" ? "🩺 Veterinarian" : "🏢 Admin Staff"}
                                                </span>
                                                {form.account_status && (
                                                    <span className={`ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${getStatusBadge(form).classes}`}>
                                                        {getStatusBadge(form).label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <SectionLabel>Personal Information</SectionLabel>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormInput label="First Name" name="first_name" value={form.first_name} onChange={handleFormChange} disabled={modalMode === "view"} required />
                                        <FormInput label="Last Name" name="last_name" value={form.last_name} onChange={handleFormChange} disabled={modalMode === "view"} required />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormInput label="Email" name="email" type="email" value={form.email} onChange={handleFormChange} disabled={modalMode === "view"} required />
                                        <FormInput label="Phone" name="phone" value={form.phone} onChange={handleFormChange} disabled={modalMode === "view"} placeholder="+639XXXXXXXXX" required />
                                    </div>
                                    <FormInput label="Hire Date" name="hire_date" type="date" value={form.hire_date} onChange={handleFormChange} disabled={modalMode === "view"} required />

                                    {modalMode === "edit" && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Account Status</label>
                                                <select name="account_status" value={form.account_status || "active"} onChange={handleFormChange}
                                                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none bg-background">
                                                    <option value="active">Active</option>
                                                    <option value="suspended">Suspended</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </div>
                                            {form.account_status === "inactive" && (
                                                <FormInput label="Termination Date" name="termination_date" type="date" value={form.termination_date || ""} onChange={handleFormChange} />
                                            )}
                                        </>
                                    )}

                                    {form.role === "admin" && (
                                        <>
                                            <SectionLabel>Admin Details</SectionLabel>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormInput label="Employee ID" name="employee_id" value={form.employee_id} onChange={handleFormChange} disabled={modalMode === "view"} required />
                                                <FormInput label="Position" name="position" value={form.position} onChange={handleFormChange} disabled={modalMode === "view"} required />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormInput label="Department" name="department" value={form.department} onChange={handleFormChange} disabled={modalMode === "view"} />
                                                <FormInput label="Access Level (1-10)" name="access_level" type="number" value={form.access_level} onChange={handleFormChange} disabled={modalMode === "view"} />
                                            </div>
                                        </>
                                    )}

                                    {form.role === "veterinarian" && (
                                        <>
                                            <SectionLabel>Veterinarian Details</SectionLabel>

                                            {/* License Management Section */}
                                            <div className="bg-muted/50 rounded-xl p-4 border border-border space-y-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">License Management</span>
                                                    {isLicenseExpiringSoon(form.license_expiry) && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-300">
                                                            ⚠️ Expiring Soon
                                                        </span>
                                                    )}
                                                    {isLicenseExpired(form.license_expiry) && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-destructive/10 text-destructive">
                                                            ⚠️ Expired
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <FormInput label="PRC License Number" name="license_number" value={form.license_number} onChange={handleFormChange} disabled={modalMode === "view"} required />
                                                    <FormInput label="License Expiry" name="license_expiry" type="date" value={form.license_expiry} onChange={handleFormChange} disabled={modalMode === "view"} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Employment Status</label>
                                                    <select name="employment_status" value={form.employment_status} onChange={handleFormChange} disabled={modalMode === "view"}
                                                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none bg-background disabled:bg-muted disabled:text-muted-foreground">
                                                        {EMPLOYMENT_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                    </select>
                                                </div>
                                                <FormInput label="Position" name="position" value={form.position} onChange={handleFormChange} disabled={modalMode === "view"} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormInput label="Years of Experience" name="years_of_experience" type="number" value={form.years_of_experience} onChange={handleFormChange} disabled={modalMode === "view"} />
                                                <FormInput label="Consultation Fee (₱)" name="consultation_fee" type="number" value={form.consultation_fee} onChange={handleFormChange} disabled={modalMode === "view"} />
                                            </div>

                                            <TagInput label="Specializations" tags={form.specializations || []}
                                                onChange={(tags) => setForm((prev) => ({ ...prev, specializations: tags }))}
                                                disabled={modalMode === "view"} placeholder="Type specialty and press Enter..." />

                                            <TagInput label="Certifications" tags={form.certifications || []}
                                                onChange={(tags) => setForm((prev) => ({ ...prev, certifications: tags }))}
                                                disabled={modalMode === "view"}
                                                suggestions={["DVM", "DACVS", "DACVIM", "DACVO", "DACVD", "DACVR", "DAVDC", "Board Certified"]}
                                                placeholder="Type certification and press Enter..." />

                                            <FileDropzone label="Board Certifications & PRC Licenses"
                                                files={form.uploaded_files || []}
                                                onChange={(files) => setForm((prev) => ({ ...prev, uploaded_files: files }))}
                                                disabled={modalMode === "view"} />

                                            <div>
                                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Biography</label>
                                                <textarea name="biography" value={form.biography} onChange={handleFormChange} disabled={modalMode === "view"} rows={3}
                                                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none disabled:bg-muted disabled:text-muted-foreground" />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
                            <button onClick={closeModal}
                                className="px-5 py-2.5 text-sm font-medium text-muted-foreground bg-muted rounded-xl hover:bg-accent transition">
                                {modalMode === "view" ? "Close" : "Cancel"}
                            </button>
                            {modalMode !== "view" && (
                                <button onClick={handleSave} disabled={saving}
                                    className="px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2 shadow-sm">
                                    {saving && <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                                    {modalMode === "add" ? "Create Employee" : "Save Changes"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========== DELETE / SUSPEND MODAL ========== */}
            {showDeleteModal && deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                    <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-border overflow-hidden">
                        <div className="bg-destructive/10 px-6 py-5 flex items-center gap-4">
                            <div className="h-11 w-11 rounded-xl bg-card border border-destructive/20 flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-foreground">Suspend Employee</h3>
                                <p className="text-xs text-destructive mt-0.5">This action can be reversed later</p>
                            </div>
                        </div>
                        <div className="px-6 py-4">
                            <p className="text-sm text-foreground">
                                Are you sure you want to suspend <span className="font-bold">{deleteTarget.first_name} {deleteTarget.last_name}</span>? They will lose system access immediately.
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                            <button onClick={() => setShowDeleteModal(false)}
                                className="px-5 py-2.5 text-sm font-medium text-muted-foreground bg-muted rounded-xl hover:bg-accent transition">
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="px-5 py-2.5 text-sm font-medium text-destructive-foreground bg-destructive rounded-xl hover:bg-destructive/90 transition disabled:opacity-50 flex items-center gap-2">
                                {deleting && <div className="h-4 w-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />}
                                Suspend
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ==================== SUB-COMPONENTS ==================== */

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                {icon}
            </div>
            <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
            </div>
        </div>
    );
}

function ActionBtn({ onClick, title, hoverColor, children }: { onClick: () => void; title: string; hoverColor: string; children: React.ReactNode }) {
    return (
        <button onClick={onClick} title={title}
            className={`h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground transition ${hoverColor}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">{children}</svg>
        </button>
    );
}

function PaginationBtn({ children, onClick, disabled, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
    return (
        <button onClick={onClick} disabled={disabled}
            className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-medium transition flex items-center justify-center
        ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}
        ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}>
            {children}
        </button>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{children}</span>
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

function FormInput({ label, name, type = "text", value, onChange, disabled = false, placeholder = "", required = false }: {
    label: string; name: string; type?: string; value: any; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled?: boolean; placeholder?: string; required?: boolean;
}) {
    return (
        <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {label} {required && <span className="text-destructive">*</span>}
            </label>
            <input type={type} name={name} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition disabled:bg-muted disabled:text-muted-foreground" />
        </div>
    );
}