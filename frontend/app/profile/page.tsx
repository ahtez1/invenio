"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await api.patch("/api/accounts/me/", form);
      await refreshUser();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");
    try {
      await api.post("/api/accounts/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setPasswordError("Could not update password. Check your current password.");
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-3">
        <p className="text-muted">Log in to view your profile.</p>
        <Link href="/login" className="text-brand font-medium">
          Log in
        </Link>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted">{user.email}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="font-semibold">Personal info</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">First name</label>
            <input
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last name</label>
            <input
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        {saved && <p className="text-sm text-emerald-600">Saved.</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand text-white font-medium px-6 py-2 hover:bg-brand-dark transition-colors disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <form onSubmit={handlePasswordChange} className="space-y-4">
        <h2 className="font-semibold">Change password</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Current password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        {passwordMsg && <p className="text-sm text-emerald-600">{passwordMsg}</p>}
        {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
        <button
          type="submit"
          className="rounded-full border border-border font-medium px-6 py-2 hover:bg-background transition-colors"
        >
          Update password
        </button>
      </form>
    </div>
  );
}
