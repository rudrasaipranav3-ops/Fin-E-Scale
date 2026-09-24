"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Bell,
  LayoutDashboard,
  Shield,
  Mail,
  ChevronRight,
  Save,
  Lock,
} from "lucide-react";

type AuthUser = {
  id: string | number;
  name: string;
  email: string;
  role?: string;
};

type UserSettings = {
  forecastAlerts: boolean;
  riskAlerts: boolean;
  recommendationAlerts: boolean;
  emailNotifications: boolean;
  theme: string;
  dashboardDensity: "comfortable" | "compact";
  defaultForecastHorizon: number;
  defaultDateRange: "7d" | "30d" | "90d" | "180d";
};

export default function SettingsPage() {
  const router = useRouter();

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:5001";

  const [user, setUser] = useState<AuthUser | null>(null);

  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          window.location.href = "/auth";
          return;
        }

        const userData = await response.json();

        if (!userData?.user) {
          window.location.href = "/auth";
          return;
        }

        setUser(userData.user);

        const settingsResponse = await fetch(
          `${API_URL}/api/settings`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (!settingsResponse.ok) {
          throw new Error("Failed to load settings");
        }

        const settingsData = await settingsResponse.json();

        if (!settingsData?.success || !settingsData?.settings) {
          throw new Error("Invalid settings response");
        }

        setSettings(settingsData.settings);
      } catch (err) {
        console.error("Failed to load settings:", err);
        setError("Unable to load your settings. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [API_URL]);

  const handleSave = async () => {
    if (!settings || saving) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/api/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          forecastAlerts: settings.forecastAlerts,
          riskAlerts: settings.riskAlerts,
          recommendationAlerts: settings.recommendationAlerts,
          emailNotifications: settings.emailNotifications,
          theme: settings.theme,
          dashboardDensity: settings.dashboardDensity,
          defaultForecastHorizon: settings.defaultForecastHorizon,
          defaultDateRange: settings.defaultDateRange,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Failed to save settings"
        );
      }

      setSettings(data.settings);
      setSuccess("Settings saved successfully.");

      window.setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save settings. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (changingPassword) return;

    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "New password must be at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "New password and confirmation do not match."
      );
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "New password must be different from your current password."
      );
      return;
    }

    try {
      setChangingPassword(true);

      const response = await fetch(
        `${API_URL}/api/auth/change-password`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Unable to change password."
        );
      }

      setPasswordSuccess(
        data.message || "Password changed successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Change password error:", err);

      setPasswordError(
        err instanceof Error
          ? err.message
          : "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading || !settings) {
    return (
      <main className="min-h-screen bg-[#07070a] text-white flex items-center justify-center">
        <div className="text-sm text-white/60">
          Loading settings...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07070a] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-3">
            <span>Account</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white/80">Settings</span>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Settings
              </h1>

              <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/60">
                Manage your account, notifications, dashboard preferences, and
                security settings.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {success && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
          >
            {success}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <div className="space-y-6">

          {/* Account */}
          <SettingsCard
            icon={<User className="h-5 w-5" />}
            title="Account"
            description="Your SmartSales AI account information."
          >
            <div className="grid gap-5 sm:grid-cols-2">

              <InfoField
                label="Name"
                value={user?.name || "—"}
              />

              <InfoField
                label="Email"
                value={user?.email || "—"}
              />

              <InfoField
                label="Role"
                value={user?.role || "User"}
              />

              <InfoField
                label="Account status"
                value="Active"
              />

            </div>
          </SettingsCard>

          {/* Notifications */}
          <SettingsCard
            icon={<Bell className="h-5 w-5" />}
            title="Notifications"
            description="Choose which SmartSales AI alerts you want to receive."
          >
            <div className="divide-y divide-white/10">

              <ToggleRow
                title="Forecast alerts"
                description="Receive alerts about important sales forecast changes."
                checked={settings?.forecastAlerts ?? false}
                onChange={(value) =>
                  setSettings((current) =>
                    current
                      ? { ...current, forecastAlerts: value }
                      : current
                  )
                }
              />

              <ToggleRow
                title="Risk alerts"
                description="Receive notifications when business risks are detected."
                checked={settings?.riskAlerts ?? false}
                onChange={(value) =>
                  setSettings((current) =>
                    current
                      ? { ...current, riskAlerts: value }
                      : current
                  )
                }
              />

              <ToggleRow
                title="Recommendation alerts"
                description="Receive actionable business recommendations."
                checked={settings?.recommendationAlerts ?? false}
                onChange={(value) =>
                  setSettings((current) =>
                    current
                      ? { ...current, recommendationAlerts: value }
                      : current
                  )
                }
              />

              <ToggleRow
                title="Email notifications"
                description="Allow important SmartSales AI notifications to be sent by email."
                checked={settings?.emailNotifications ?? false}
                onChange={(value) =>
                  setSettings((current) =>
                    current
                      ? { ...current, emailNotifications: value }
                      : current
                  )
                }
              />

            </div>
          </SettingsCard>

          {/* Dashboard Preferences */}
          <SettingsCard
            icon={<LayoutDashboard className="h-5 w-5" />}
            title="Dashboard Preferences"
            description="Customize the default behavior of your analytics dashboard."
          >
            <div className="grid gap-6 sm:grid-cols-2">

              <SelectField
                label="Default forecast horizon"
                description="Forecast period used when starting a forecast."
                value={String(settings?.defaultForecastHorizon ?? 30)}
                onChange={(value) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          defaultForecastHorizon: Number(value),
                        }
                      : current
                  )
                }
                options={[
                  { value: "7", label: "7 days" },
                  { value: "14", label: "14 days" },
                  { value: "30", label: "30 days" },
                  { value: "60", label: "60 days" },
                  { value: "90", label: "90 days" },
                ]}
              />

              <SelectField
                label="Default date range"
                description="Default historical period displayed in analytics."
                value={settings?.defaultDateRange ?? "30d"}
                onChange={(value) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          defaultDateRange:
                            value as UserSettings["defaultDateRange"],
                        }
                      : current
                  )
                }
                options={[
                  { value: "7d", label: "Last 7 days" },
                  { value: "30d", label: "Last 30 days" },
                  { value: "90d", label: "Last 90 days" },
                  { value: "180d", label: "Last 180 days" },
                ]}
              />

              <SelectField
                label="Dashboard density"
                description="Control the amount of spacing between dashboard elements."
                value={settings?.dashboardDensity ?? "comfortable"}
                onChange={(value) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          dashboardDensity:
                            value as UserSettings["dashboardDensity"],
                        }
                      : current
                  )
                }
                options={[
                  { value: "comfortable", label: "Comfortable" },
                  { value: "compact", label: "Compact" },
                ]}
              />

            </div>
          </SettingsCard>

          {/* Security */}
          <SettingsCard
            icon={<Shield className="h-5 w-5" />}
            title="Security"
            description="Manage your account security."
          >
            <div className="space-y-4">

              <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-white/5 p-2">
                    <Lock className="h-4 w-4 text-white/70" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white">
                      Password
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-white/55">
                      Change your account password.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPasswordError("");
                    setPasswordSuccess("");
                    setShowPasswordModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  Change Password
                </button>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-white/60" />

                <div>
                  <p className="text-sm font-medium text-white">
                    Account email
                  </p>

                  <p className="mt-1 text-xs sm:text-sm text-white/55">
                    Your account email is currently used for authentication
                    and password recovery.
                  </p>
                </div>
              </div>

            </div>
          </SettingsCard>

          {/* Save */}
          <div className="flex justify-end pt-2 pb-8">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <Save className="h-4 w-4" />

              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>

        </div>
      </div>

      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowPasswordModal(false);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101014] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
          >
            <div className="mb-6">
              <h2
                id="change-password-title"
                className="text-lg font-semibold text-white"
              >
                Change Password
              </h2>

              <p className="mt-1 text-sm text-white/55">
                Enter your current password and choose a new password.
              </p>
            </div>

            {passwordError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
              >
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div
                role="status"
                className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"
              >
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Current password
                </label>

                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  New password
                </label>

                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Confirm new password
                </label>

                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20"
                  placeholder="Re-enter new password"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError("");
                  setPasswordSuccess("");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                {changingPassword
                  ? "Changing..."
                  : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                  */
/* -------------------------------------------------------------------------- */

function SettingsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
            {icon}
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-semibold text-white">
              {title}
            </h2>

            <p className="mt-1 text-xs sm:text-sm text-white/55">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        {children}
      </div>
    </section>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-white/45">
        {label}
      </label>

      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white">
        {value}
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">
          {title}
        </p>

        <p className="mt-1 text-xs sm:text-sm text-white/50">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${title}: ${checked ? "enabled" : "disabled"}`}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
          checked ? "bg-violet-600" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SelectField({
  label,
  description,
  value,
  onChange,
  options,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-white">
        {label}
      </label>

      <p className="mb-2 text-xs sm:text-sm text-white/50">
        {description}
      </p>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#101014] text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}