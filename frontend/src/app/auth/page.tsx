"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { NeonParticlesCanvas } from "@/components/canvas/NeonParticles";

/* =========================================================
   TYPES
========================================================= */

type AuthMode = "login" | "signup";

type ApiResponse = {
  success?: boolean;
  authenticated?: boolean;
  message?: string;

  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
};

/* =========================================================
   EXPRESS BACKEND URL
========================================================= */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

/* =========================================================
   AUTH PAGE
========================================================= */

export default function AuthPage() {
  const router = useRouter();

  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const [showLoginPassword, setShowLoginPassword] =
    useState(false);

  const [showSignupPassword, setShowSignupPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] =
    useState<"success" | "error">("error");

  /* =========================================================
     PASSWORD RESET
  ========================================================= */

  type ResetStep = "email" | "otp" | "password";

  const [resetMode, setResetMode] = useState(false);
  const [resetStep, setResetStep] =
    useState<ResetStep>("email");

  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] =
    useState("");

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmNewPassword, setShowConfirmNewPassword] =
    useState(false);

  /* =======================================================
     LOGIN FORM DATA
  ======================================================= */

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  /* =======================================================
     SIGNUP FORM DATA
  ======================================================= */

  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  /* =======================================================
     CHANGE AUTH MODE
  ======================================================= */

  function changeAuthMode(mode: AuthMode) {
    if (loading) return;

    setAuthMode(mode);
    setMessage("");
    setMessageType("error");

    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setShowConfirmPassword(false);
  }

  /* =========================================================
     START PASSWORD RESET
  ========================================================= */

  function openForgotPassword() {
    if (loading) return;

    setResetMode(true);
    setResetStep("email");

    setResetEmail(loginData.email.trim().toLowerCase());
    setResetOtp("");
    setNewPassword("");
    setConfirmNewPassword("");

    setMessage("");
    setMessageType("error");

    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  }

  /* =========================================================
     SEND PASSWORD RESET OTP
  ========================================================= */

  async function handleForgotPassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const email = resetEmail.trim().toLowerCase();

    setMessage("");
    setMessageType("error");

    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }

    if (!email.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      let data: ApiResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The password reset server returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        setMessageType("error");

        setMessage(
          data.message ||
            "Unable to send password reset OTP."
        );

        return;
      }

      setResetEmail(email);
      setResetStep("otp");

      setMessageType("success");

      setMessage(
        "OTP sent successfully. Check your email."
      );
    } catch (error) {
      console.error(
        "Forgot password request failed:",
        error
      );

      setMessageType("error");

      setMessage(
        "Unable to connect to the backend. Make sure the Express server is running on port 5001."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     VERIFY PASSWORD RESET OTP
  ========================================================= */

  async function handleVerifyResetOtp(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const email = resetEmail.trim().toLowerCase();
    const otp = resetOtp.trim();

    setMessage("");
    setMessageType("error");

    if (!otp) {
      setMessage("Please enter the OTP.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setMessage("OTP must contain exactly 6 digits.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/verify-reset-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp,
          }),
        }
      );

      let data: ApiResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The OTP verification server returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        setMessageType("error");

        setMessage(
          data.message || "Invalid or expired OTP."
        );

        return;
      }

      setResetStep("password");

      setMessageType("success");

      setMessage(
        "OTP verified. Create your new password."
      );
    } catch (error) {
      console.error(
        "OTP verification failed:",
        error
      );

      setMessageType("error");

      setMessage(
        "Unable to connect to the backend. Make sure the Express server is running on port 5001."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     RESET PASSWORD
  ========================================================= */

  async function handleResetPassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const email = resetEmail.trim().toLowerCase();
    const otp = resetOtp.trim();

    setMessage("");
    setMessageType("error");

    if (!newPassword || !confirmNewPassword) {
      setMessage("Please complete both password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setMessage(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp,
            newPassword,
          }),
        }
      );

      let data: ApiResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The password reset server returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        setMessageType("error");

        setMessage(
          data.message ||
            "Unable to reset your password."
        );

        return;
      }

      setMessageType("success");

      setMessage(
        "Password reset successfully. You can now log in."
      );

      setLoginData({
        email,
        password: "",
      });

      setResetMode(false);
      setResetStep("email");

      setResetOtp("");
      setNewPassword("");
      setConfirmNewPassword("");

      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
    } catch (error) {
      console.error(
        "Password reset failed:",
        error
      );

      setMessageType("error");

      setMessage(
        "Unable to connect to the backend. Make sure the Express server is running on port 5001."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     CLOSE PASSWORD RESET
  ========================================================= */

  function closeForgotPassword() {
    if (loading) return;

    setResetMode(false);
    setResetStep("email");

    setResetOtp("");
    setNewPassword("");
    setConfirmNewPassword("");

    setMessage("");
    setMessageType("error");

    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  }

  /* =========================================================
     LOGIN
  ========================================================= */

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setMessageType("error");

    const email = loginData.email.trim().toLowerCase();
    const password = loginData.password;

    /* =====================================================
       FRONTEND VALIDATION
    ===================================================== */

    if (!email || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      /* ===================================================
         EXPRESS LOGIN API
      =================================================== */

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          /*
           * Required because Express stores
           * the JWT inside an HttpOnly cookie.
           */
          credentials: "include",

          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      let data: ApiResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The authentication server returned an invalid response."
        );
      }

      /* ===================================================
         LOGIN FAILED
      =================================================== */

      if (!response.ok) {
        setMessageType("error");

        setMessage(
          data.message || "Invalid email or password."
        );

        return;
      }

      if (!data.success) {
        setMessageType("error");

        setMessage(
          data.message || "Login failed."
        );

        return;
      }

      if (data.authenticated !== true) {
        setMessageType("error");

        setMessage(
          "Authentication could not be verified."
        );

        return;
      }

      /* ===================================================
         LOGIN SUCCESS
      =================================================== */

      setMessageType("success");

      setMessage(
        "Login successful. Opening dashboard..."
      );

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(
        "Login request failed:",
        error
      );

      setMessageType("error");

      setMessage(
        "Unable to connect to the backend. Make sure the Express server is running on port 5001."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     SIGN UP
  ========================================================= */

  async function handleSignup(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setMessageType("error");

    const name = signupData.name.trim();

    const email =
      signupData.email.trim().toLowerCase();

    const password =
      signupData.password;

    const confirmPassword =
      signupData.confirmPassword;

    /* =====================================================
       REQUIRED FIELDS
    ===================================================== */

    if (
      !name ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setMessage(
        "Please complete all fields."
      );

      return;
    }

    /* =====================================================
       PASSWORD MATCH
    ===================================================== */

    if (password !== confirmPassword) {
      setMessage(
        "Passwords do not match."
      );

      return;
    }

    /* =====================================================
       PASSWORD LENGTH
    ===================================================== */

    if (password.length < 8) {
      setMessage(
        "Password must contain at least 8 characters."
      );

      return;
    }

    try {
      setLoading(true);

      /* ===================================================
         EXPRESS REGISTER API
      =================================================== */

      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      let data: ApiResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The registration server returned an invalid response."
        );
      }

      /* ===================================================
         REGISTRATION FAILED
      =================================================== */

      if (!response.ok) {
        setMessageType("error");

        setMessage(
          data.message ||
            "Unable to create your account."
        );

        return;
      }

      if (!data.success) {
        setMessageType("error");

        setMessage(
          data.message ||
            "Account creation failed."
        );

        return;
      }

      /* ===================================================
         REGISTER API ALSO LOGGED USER IN
      =================================================== */

      if (data.authenticated === true) {
        setMessageType("success");

        setMessage(
          "Account created successfully. Opening dashboard..."
        );

        router.replace("/dashboard");
        router.refresh();

        return;
      }

      /* ===================================================
         REGISTRATION SUCCESS BUT LOGIN REQUIRED
      =================================================== */

      setLoginData({
        email,
        password: "",
      });

      setSignupData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setShowSignupPassword(false);
      setShowConfirmPassword(false);

      setAuthMode("login");

      setMessageType("success");

      setMessage(
        "Account created successfully. Please sign in."
      );
    } catch (error) {
      console.error(
        "Registration request failed:",
        error
      );

      setMessageType("error");

      setMessage(
        "Unable to connect to the backend. Make sure the Express server is running on port 5001."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      {/* =====================================================
          PARTICLE BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0 opacity-60">
        <NeonParticlesCanvas />
      </div>

      {/* =====================================================
          BACKGROUND GLOWS
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 z-[1]">
        {/* Violet Glow */}

        <div className="absolute -left-[10%] -top-[20%] h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[120px]" />

        {/* Blue Glow */}

        <div className="absolute -bottom-[20%] -right-[10%] h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]" />

        {/* Center Glow */}

        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-8">
        {/* LOGO */}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 shadow-[0_0_25px_rgba(139,92,246,0.2)]">
            <BrainCircuit className="h-5 w-5 text-violet-400" />
          </div>

          <div className="text-left">
            <p className="font-semibold">
              Fin E-Scale Business
            </p>

            <p className="text-xs text-gray-500">
              Secure Customer Intelligence
            </p>
          </div>
        </button>

        {/* BACK BUTTON */}

        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/")}
          className="rounded-full border-white/10 bg-white/5 text-gray-300 backdrop-blur-xl hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />

          <span className="hidden sm:inline">
            Back to Home
          </span>

          <span className="sm:hidden">
            Back
          </span>
        </Button>
      </nav>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-100px)] max-w-7xl items-center gap-16 px-6 pb-16 lg:grid-cols-2 lg:px-8">
        {/* ===================================================
            LEFT SECTION
        =================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            x: -40,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.7,
          }}
          className="hidden lg:block"
        >
          {/* BADGE */}

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300 backdrop-blur-xl">
            <ShieldCheck className="h-4 w-4" />

            Secure Authentication
          </div>

          {/* HEADING */}

          <h1 className="max-w-xl text-5xl font-bold leading-tight">
            Your intelligence.
            <br />

            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-500 bg-clip-text text-transparent">
              Securely accessible.
            </span>
          </h1>

          {/* DESCRIPTION */}

          <p className="mt-6 max-w-lg text-lg leading-8 text-gray-400">
            Sign in to access Fin E-Scale Business
            customer analytics, predictive models,
            recommendation engine, forecasting tools,
            and business intelligence dashboard.
          </p>

          {/* FEATURES */}

          <div className="mt-10 space-y-5">
            <AuthFeature text="Secure user authentication" />

            <AuthFeature text="Verified account access" />

            <AuthFeature text="Protected analytics dashboard" />

            <AuthFeature text="AI-powered customer intelligence" />
          </div>
        </motion.div>

        {/* ===================================================
            AUTH CARD
        =================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 30,
            scale: 0.97,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.7,
            delay: 0.15,
          }}
          className="mx-auto w-full max-w-md"
        >
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-[0_25px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
            {/* ICON */}

            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
              <ShieldCheck className="h-6 w-6 text-violet-400" />
            </div>

            {/* TITLE */}

            <AnimatePresence mode="wait">
              <motion.div
                key={authMode}
                initial={{
                  opacity: 0,
                  y: 5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -5,
                }}
              >
                <h2 className="text-3xl font-semibold">
                  {authMode === "login"
                    ? "Welcome back"
                    : "Create account"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {authMode === "login"
                    ? "Sign in to continue to your analytics dashboard."
                    : "Create your Fin E-Scale Business account to access the analytics platform."}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* =================================================
                LOGIN / SIGNUP SWITCH
            ================================================= */}

            <div className="mt-7 grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1">
              {/* LOGIN TAB */}

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  changeAuthMode("login")
                }
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  authMode === "login"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Login
              </button>

              {/* SIGNUP TAB */}

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  changeAuthMode("signup")
                }
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  authMode === "signup"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* =================================================
                AUTH FORMS
            ================================================= */}

            <AnimatePresence mode="wait">
              {resetMode ? (
                <motion.div
                  key="forgot-password"
                  initial={{
                    opacity: 0,
                    x: 20,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -20,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                  className="mt-7 space-y-6"
                >
                  {/* BACK */}
                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm text-gray-400 transition hover:text-white disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </button>

                  {/* HEADER */}
                  <div className="space-y-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                      {resetStep === "email" && (
                        <Mail className="h-6 w-6 text-violet-400" />
                      )}

                      {resetStep === "otp" && (
                        <ShieldCheck className="h-6 w-6 text-violet-400" />
                      )}

                      {resetStep === "password" && (
                        <LockKeyhole className="h-6 w-6 text-violet-400" />
                      )}
                    </div>

                    <h2 className="text-2xl font-semibold text-white">
                      {resetStep === "email" &&
                        "Forgot your password?"}

                      {resetStep === "otp" &&
                        "Verify your OTP"}

                      {resetStep === "password" &&
                        "Create new password"}
                    </h2>

                    <p className="text-sm leading-6 text-gray-400">
                      {resetStep === "email" &&
                        "Enter your registered email address and we'll send you a verification code."}

                      {resetStep === "otp" &&
                        `Enter the 6-digit OTP sent to ${resetEmail}.`}

                      {resetStep === "password" &&
                        "Your identity has been verified. Choose a new password for your account."}
                    </p>
                  </div>

                  {/* STEP 1 — EMAIL */}
                  {resetStep === "email" && (
                    <motion.form
                      key="reset-email"
                      onSubmit={handleForgotPassword}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-5"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                          Email address
                        </label>

                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />

                          <input
                            type="email"
                            value={resetEmail}
                            onChange={(event) =>
                              setResetEmail(event.target.value)
                            }
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={loading}
                            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500/60 focus:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="h-12 w-full rounded-xl bg-violet-600 text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition-all hover:bg-violet-500 hover:shadow-[0_0_35px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          <>
                            Send OTP
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </motion.form>
                  )}

                  {/* STEP 2 — OTP */}
                  {resetStep === "otp" && (
                    <motion.form
                      key="reset-otp"
                      onSubmit={handleVerifyResetOtp}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-5"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                          Verification code
                        </label>

                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={resetOtp}
                          onChange={(event) =>
                            setResetOtp(
                              event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6)
                            )
                          }
                          placeholder="000000"
                          disabled={loading}
                          className="h-14 w-full rounded-xl border border-white/10 bg-white/5 text-center text-2xl font-semibold tracking-[0.5em] text-white outline-none transition placeholder:text-gray-700 focus:border-violet-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={loading || resetOtp.length !== 6}
                        className="h-12 w-full rounded-xl bg-violet-600 text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition-all hover:bg-violet-500 hover:shadow-[0_0_35px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying OTP...
                          </>
                        ) : (
                          <>
                            Verify OTP
                            <ShieldCheck className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setResetStep("email");
                          setResetOtp("");
                          setMessage("");
                        }}
                        className="w-full text-center text-sm text-violet-400 transition hover:text-violet-300 disabled:opacity-50"
                      >
                        Use a different email
                      </button>
                    </motion.form>
                  )}

                  {/* STEP 3 — NEW PASSWORD */}
                  {resetStep === "password" && (
                    <motion.form
                      key="reset-password"
                      onSubmit={handleResetPassword}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-5"
                    >
                      {/* NEW PASSWORD */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                          New password
                        </label>

                        <div className="relative">
                          <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />

                          <input
                            type={
                              showNewPassword
                                ? "text"
                                : "password"
                            }
                            value={newPassword}
                            onChange={(event) =>
                              setNewPassword(event.target.value)
                            }
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                            disabled={loading}
                            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-12 text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowNewPassword(
                                (value) => !value
                              )
                            }
                            disabled={loading}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-300"
                            aria-label={
                              showNewPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* CONFIRM PASSWORD */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                          Confirm new password
                        </label>

                        <div className="relative">
                          <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />

                          <input
                            type={
                              showConfirmNewPassword
                                ? "text"
                                : "password"
                            }
                            value={confirmNewPassword}
                            onChange={(event) =>
                              setConfirmNewPassword(
                                event.target.value
                              )
                            }
                            placeholder="Re-enter your password"
                            autoComplete="new-password"
                            disabled={loading}
                            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-12 text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmNewPassword(
                                (value) => !value
                              )
                            }
                            disabled={loading}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-300"
                            aria-label={
                              showConfirmNewPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showConfirmNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={
                          loading ||
                          !newPassword ||
                          !confirmNewPassword
                        }
                        className="h-12 w-full rounded-xl bg-violet-600 text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition-all hover:bg-violet-500 hover:shadow-[0_0_35px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Resetting password...
                          </>
                        ) : (
                          <>
                            Reset Password
                            <Check className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </motion.form>
                  )}
                </motion.div>
              ) : authMode === "login" ? (
                /* =============================================
                   LOGIN FORM
                ============================================= */

                <motion.form
                  key="login"
                  initial={{
                    opacity: 0,
                    x: -15,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: 15,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                  onSubmit={handleLogin}
                  className="mt-7 space-y-5"
                >
                  {/* EMAIL */}

                  <AuthInput
                    label="Email Address"
                    icon={
                      <Mail className="h-4 w-4" />
                    }
                  >
                    <input
                      type="email"
                      required
                      disabled={loading}
                      value={loginData.email}
                      onChange={(event) =>
                        setLoginData({
                          ...loginData,
                          email:
                            event.target.value,
                        })
                      }
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={authInputClass}
                    />
                  </AuthInput>

                  {/* PASSWORD */}

                  <AuthInput
                    label="Password"
                    icon={
                      <LockKeyhole className="h-4 w-4" />
                    }
                  >
                    <input
                      type={
                        showLoginPassword
                          ? "text"
                          : "password"
                      }
                      required
                      disabled={loading}
                      value={loginData.password}
                      onChange={(event) =>
                        setLoginData({
                          ...loginData,
                          password:
                            event.target.value,
                        })
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className={`${authInputClass} pr-12`}
                    />

                    <PasswordToggle
                      visible={
                        showLoginPassword
                      }
                      disabled={loading}
                      onClick={() =>
                        setShowLoginPassword(
                          (current) => !current
                        )
                      }
                    />
                  </AuthInput>

                  {/* OPTIONS */}

                  <div className="flex items-center justify-between gap-4 text-sm">
                    <label className="flex cursor-pointer items-center gap-2 text-gray-400">
                      <input
                        type="checkbox"
                        disabled={loading}
                        className="accent-violet-500"
                      />

                      Remember me
                    </label>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={openForgotPassword}
                      className="text-violet-400 transition hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* LOGIN BUTTON */}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-xl bg-violet-600 text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition-all hover:bg-violet-500 hover:shadow-[0_0_35px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                        Verifying...
                      </>
                    ) : (
                      <>
                        Login

                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {/* CREATE ACCOUNT */}

                  <p className="text-center text-sm text-gray-500">
                    Don&apos;t have an account?{" "}

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        changeAuthMode("signup")
                      }
                      className="text-violet-400 transition hover:text-violet-300 disabled:opacity-50"
                    >
                      Create one
                    </button>
                  </p>
                </motion.form>
              ) : (
                /* =============================================
                   SIGNUP FORM
                ============================================= */

                <motion.form
                  key="signup"
                  initial={{
                    opacity: 0,
                    x: 15,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: -15,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                  onSubmit={handleSignup}
                  className="mt-7 space-y-4"
                >
                  {/* FULL NAME */}

                  <AuthInput
                    label="Full Name"
                    icon={
                      <User className="h-4 w-4" />
                    }
                  >
                    <input
                      type="text"
                      required
                      disabled={loading}
                      value={signupData.name}
                      onChange={(event) =>
                        setSignupData({
                          ...signupData,
                          name:
                            event.target.value,
                        })
                      }
                      placeholder="Enter your full name"
                      autoComplete="name"
                      className={authInputClass}
                    />
                  </AuthInput>

                  {/* EMAIL */}

                  <AuthInput
                    label="Email Address"
                    icon={
                      <Mail className="h-4 w-4" />
                    }
                  >
                    <input
                      type="email"
                      required
                      disabled={loading}
                      value={signupData.email}
                      onChange={(event) =>
                        setSignupData({
                          ...signupData,
                          email:
                            event.target.value,
                        })
                      }
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={authInputClass}
                    />
                  </AuthInput>

                  {/* PASSWORD */}

                  <AuthInput
                    label="Password"
                    icon={
                      <LockKeyhole className="h-4 w-4" />
                    }
                  >
                    <input
                      type={
                        showSignupPassword
                          ? "text"
                          : "password"
                      }
                      required
                      disabled={loading}
                      minLength={8}
                      value={signupData.password}
                      onChange={(event) =>
                        setSignupData({
                          ...signupData,
                          password:
                            event.target.value,
                        })
                      }
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                      className={`${authInputClass} pr-12`}
                    />

                    <PasswordToggle
                      visible={
                        showSignupPassword
                      }
                      disabled={loading}
                      onClick={() =>
                        setShowSignupPassword(
                          (current) => !current
                        )
                      }
                    />
                  </AuthInput>

                  {/* CONFIRM PASSWORD */}

                  <AuthInput
                    label="Confirm Password"
                    icon={
                      <LockKeyhole className="h-4 w-4" />
                    }
                  >
                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      required
                      disabled={loading}
                      minLength={8}
                      value={
                        signupData.confirmPassword
                      }
                      onChange={(event) =>
                        setSignupData({
                          ...signupData,
                          confirmPassword:
                            event.target.value,
                        })
                      }
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      className={`${authInputClass} pr-12`}
                    />

                    <PasswordToggle
                      visible={
                        showConfirmPassword
                      }
                      disabled={loading}
                      onClick={() =>
                        setShowConfirmPassword(
                          (current) => !current
                        )
                      }
                    />
                  </AuthInput>

                  {/* PASSWORD REQUIREMENT */}

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Check className="h-3.5 w-3.5 text-violet-400" />

                    Password must contain at least 8 characters.
                  </div>

                  {/* CREATE ACCOUNT */}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-xl bg-violet-600 text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] transition-all hover:bg-violet-500 hover:shadow-[0_0_35px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                        Creating account...
                      </>
                    ) : (
                      <>
                        Create Account

                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {/* LOGIN */}

                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{" "}

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        changeAuthMode("login")
                      }
                      className="text-violet-400 transition hover:text-violet-300 disabled:opacity-50"
                    >
                      Login
                    </button>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>

            {/* =================================================
                ERROR / SUCCESS MESSAGE
            ================================================= */}

            <AnimatePresence>
              {message && (
                <motion.div
                  key={`${messageType}-${message}`}
                  initial={{
                    opacity: 0,
                    y: 5,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -5,
                  }}
                  className={`mt-5 rounded-xl border p-3 text-sm leading-5 ${
                    messageType === "success"
                      ? "border-green-500/20 bg-green-500/[0.06] text-green-300"
                      : "border-red-500/20 bg-red-500/[0.06] text-red-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {messageType ===
                      "success" && (
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    )}

                    <span>{message}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* =================================================
                SECURITY MESSAGE
            ================================================= */}

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-green-500/10 bg-green-500/[0.04] p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />

              <p className="text-xs leading-5 text-gray-400">
                Secure authentication protects access to your
                analytics dashboard.
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

/* =========================================================
   AUTH FEATURE
========================================================= */

function AuthFeature({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 text-gray-300">
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10">
        <Check className="h-3.5 w-3.5 text-violet-400" />
      </div>

      <span>{text}</span>
    </div>
  );
}

/* =========================================================
   AUTH INPUT
========================================================= */

function AuthInput({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm text-gray-300">
        <span className="text-gray-500">
          {icon}
        </span>

        {label}
      </label>

      <div className="relative">
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   PASSWORD TOGGLE
========================================================= */

function PasswordToggle({
  visible,
  disabled,
  onClick,
}: {
  visible: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={
        visible
          ? "Hide password"
          : "Show password"
      }
      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {visible ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </button>
  );
}

/* =========================================================
   INPUT STYLE
========================================================= */

const authInputClass = `
  h-12
  w-full
  rounded-xl
  border
  border-white/10
  bg-black/20
  px-4
  text-sm
  text-white
  outline-none
  transition
  placeholder:text-gray-600
  focus:border-violet-500/50
  focus:ring-2
  focus:ring-violet-500/10
  disabled:cursor-not-allowed
  disabled:opacity-50
`;