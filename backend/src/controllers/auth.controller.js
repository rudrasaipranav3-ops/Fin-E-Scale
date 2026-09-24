import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendPasswordResetOtp } from "../lib/email.js";
import prisma from "../lib/prisma.js";

/* =========================================================
   CONFIGURATION
========================================================= */

const COOKIE_NAME = "auth_token";

const COOKIE_MAX_AGE =
  24 * 60 * 60 * 1000; // 24 hours

const JWT_EXPIRES_IN = "24h";

/* =========================================================
   COOKIE OPTIONS
========================================================= */

/**
 * Cookie configuration used when creating
 * the authentication session.
 */
function getCookieOptions() {
  const isProduction =
    process.env.NODE_ENV === "production";

  return {
    /*
     * Prevent JavaScript running in the browser
     * from accessing the authentication token.
     */
    httpOnly: true,

    /*
     * Production cookies require HTTPS.
     *
     * Development:
     * http://localhost:3000
     * http://localhost:5000
     */
    secure: isProduction,

    /*
     * Development:
     * SameSite=Lax works for localhost.
     *
     * Production:
     * SameSite=None allows frontend/backend
     * deployments on different sites.
     */
    sameSite: isProduction
      ? "none"
      : "lax",

    /*
     * Session lifetime: 24 hours.
     */
    maxAge: COOKIE_MAX_AGE,

    /*
     * Cookie is available across all
     * backend API routes.
     */
    path: "/",
  };
}

/* =========================================================
   COOKIE CLEAR OPTIONS
========================================================= */

/**
 * clearCookie should use the same cookie
 * scope/security configuration used when
 * creating the cookie.
 *
 * maxAge is intentionally omitted.
 */
function getClearCookieOptions() {
  const {
    maxAge,
    ...options
  } = getCookieOptions();

  return options;
}

/* =========================================================
   JWT SECRET
========================================================= */

function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not configured."
    );
  }

  return secret;
}

/* =========================================================
   CREATE JWT
========================================================= */

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },

    getJwtSecret(),

    {
      expiresIn:
        JWT_EXPIRES_IN,
    }
  );
}

/* =========================================================
   PUBLIC USER OBJECT
========================================================= */

/**
 * Never expose passwordHash to the frontend.
 */
function sanitizeUser(user) {
  return {
    id: user.id,

    name: user.name,

    email: user.email,

    role: user.role,

    isVerified:
      user.isVerified,

    createdAt:
      user.createdAt,
  };
}

/* =========================================================
   EMAIL NORMALIZATION
========================================================= */

function normalizeEmail(email) {
  return email
    .trim()
    .toLowerCase();
}

/* =========================================================
   EMAIL VALIDATION
========================================================= */

function isValidEmail(email) {
  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailPattern.test(
    email
  );
}

/* =========================================================
   REGISTER

   POST /api/auth/register
========================================================= */

export const register = async (
  req,
  res
) => {
  try {
    /* =====================================================
       READ REQUEST
    ===================================================== */

    const {
      name,
      email,
      password,
    } = req.body || {};

    /* =====================================================
       REQUIRED FIELDS
    ===================================================== */

    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,

        authenticated: false,

        message:
          "Name, email and password are required.",
      });
    }

    /* =====================================================
       TYPE VALIDATION
    ===================================================== */

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,

        authenticated: false,

        message:
          "Invalid registration data.",
      });
    }

    /* =====================================================
       NORMALIZE INPUT
    ===================================================== */

    const normalizedName =
      name.trim();

    const normalizedEmail =
      normalizeEmail(email);

    /* =====================================================
       NAME VALIDATION
    ===================================================== */

    if (
      normalizedName.length < 2
    ) {
      return res.status(400).json({
        success: false,

        authenticated: false,

        message:
          "Name must contain at least 2 characters.",
      });
    }

    /* =====================================================
       EMAIL VALIDATION
    ===================================================== */

    if (
      !isValidEmail(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,

        authenticated: false,

        message:
          "Please enter a valid email address.",
      });
    }

    /* =====================================================
       PASSWORD VALIDATION
    ===================================================== */

    if (
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,

        authenticated: false,

        message:
          "Password must contain at least 8 characters.",
      });
    }

    /* =====================================================
       CHECK EXISTING USER
    ===================================================== */

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email:
            normalizedEmail,
        },

        select: {
          id: true,
        },
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,

        authenticated: false,

        message:
          "An account with this email already exists.",
      });
    }

    /* =====================================================
       HASH PASSWORD
    ===================================================== */

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    /* =====================================================
       CREATE USER
    ===================================================== */

    const user =
      await prisma.user.create({
        data: {
          name:
            normalizedName,

          email:
            normalizedEmail,

          passwordHash,

          /*
           * Email/OTP verification has not
           * been implemented yet.
           *
           * Change this to false when
           * verification is added.
           */
          isVerified: true,

          role: "user",
        },

        select: {
          id: true,

          name: true,

          email: true,

          role: true,

          isVerified: true,

          createdAt: true,
        },
      });

    /* =====================================================
       CREATE SESSION TOKEN
    ===================================================== */

    const token =
      createToken(user);

    /* =====================================================
       SET HTTPONLY COOKIE
    ===================================================== */

    res.cookie(
      COOKIE_NAME,
      token,
      getCookieOptions()
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(201).json({
      success: true,

      authenticated: true,

      message:
        "Account created successfully.",

      user:
        sanitizeUser(user),
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    /* =====================================================
       PRISMA UNIQUE CONSTRAINT

       Handles simultaneous registration
       requests for the same email.
    ===================================================== */

    if (
      error?.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,

        authenticated: false,

        message:
          "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,

      authenticated: false,

      message:
        "Unable to create account.",
    });
  }
};

/* =========================================================
   LOGIN

   POST /api/auth/login
========================================================= */

export const login = async (
  req,
  res
) => {
  try {
    /* =====================================================
       READ REQUEST
    ===================================================== */

    const {
      email,
      password,
    } = req.body || {};

    /* =====================================================
       REQUIRED FIELDS
    ===================================================== */

    if (
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,

        authenticated: false,

        message:
          "Email and password are required.",
      });
    }

    /* =====================================================
       TYPE VALIDATION
    ===================================================== */

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,

        authenticated: false,

        message:
          "Invalid login data.",
      });
    }

    /* =====================================================
       NORMALIZE EMAIL
    ===================================================== */

    const normalizedEmail =
      normalizeEmail(email);

    /* =====================================================
       FIND USER
    ===================================================== */

    const user =
      await prisma.user.findUnique({
        where: {
          email:
            normalizedEmail,
        },
      });

    /*
     * Keep the same error message for
     * unknown email and wrong password.
     *
     * This reduces account enumeration.
     */

    if (!user) {
      return res.status(401).json({
        success: false,

        authenticated: false,

        message:
          "Invalid email or password.",
      });
    }

    /* =====================================================
       VERIFY PASSWORD
    ===================================================== */

    const validPassword =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!validPassword) {
      return res.status(401).json({
        success: false,

        authenticated: false,

        message:
          "Invalid email or password.",
      });
    }

    /* =====================================================
       VERIFY ACCOUNT
    ===================================================== */

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,

        authenticated: false,

        message:
          "Please verify your account before logging in.",
      });
    }

    /* =====================================================
       CREATE JWT
    ===================================================== */

    const token =
      createToken(user);

    /* =====================================================
       STORE JWT IN HTTPONLY COOKIE
    ===================================================== */

    res.cookie(
      COOKIE_NAME,
      token,
      getCookieOptions()
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({
      success: true,

      authenticated: true,

      message:
        "Login successful.",

      user:
        sanitizeUser(user),
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,

      authenticated: false,

      message:
        "Unable to login.",
    });
  }
};

/* =========================================================
   CURRENT AUTHENTICATED USER

   GET /api/auth/me
========================================================= */

export const me = async (
  req,
  res
) => {
  try {
    /* =====================================================
       AUTH MIDDLEWARE CHECK
    ===================================================== */

    if (!req.user) {
      return res.status(401).json({
        success: false,

        authenticated: false,

        user: null,

        message:
          "Authentication required.",
      });
    }

    /*
     * Supports:
     *
     * req.user.userId
     *
     * and
     *
     * req.user.id
     */

    const userId =
      req.user.userId ||
      req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,

        authenticated: false,

        user: null,

        message:
          "Invalid authentication session.",
      });
    }

    /* =====================================================
       LOAD CURRENT USER
    ===================================================== */

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,

          name: true,

          email: true,

          role: true,

          isVerified: true,

          createdAt: true,
        },
      });

    /* =====================================================
       USER DELETED / SESSION STALE
    ===================================================== */

    if (!user) {
      res.clearCookie(
        COOKIE_NAME,
        getClearCookieOptions()
      );

      return res.status(401).json({
        success: false,

        authenticated: false,

        user: null,

        message:
          "User account no longer exists.",
      });
    }

    /* =====================================================
       ACCOUNT VERIFICATION
    ===================================================== */

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,

        authenticated: false,

        user: null,

        message:
          "Account verification required.",
      });
    }

    /* =====================================================
       SESSION VALID
    ===================================================== */

    return res.status(200).json({
      success: true,

      authenticated: true,

      user:
        sanitizeUser(user),
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    return res.status(500).json({
      success: false,

      authenticated: false,

      user: null,

      message:
        "Unable to retrieve authenticated user.",
    });
  }
};

/* =========================================================
   LOGOUT

   POST /api/auth/logout
========================================================= */

export const logout = async (
  req,
  res
) => {
  try {
    /* =====================================================
       CLEAR AUTHENTICATION COOKIE
    ===================================================== */

    res.clearCookie(
      COOKIE_NAME,
      getClearCookieOptions()
    );

    return res.status(200).json({
      success: true,

      authenticated: false,

      message:
        "Logged out successfully.",
    });
  } catch (error) {
    console.error(
      "Logout error:",
      error
    );

    return res.status(500).json({
      success: false,

      authenticated: false,

      message:
        "Unable to logout.",
    });
  }
};

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    // Do not reveal whether an account exists.
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, an OTP has been sent.",
      });
    }

    // Invalidate previous unused OTPs.
    await prisma.passwordResetOtp.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    });

    const otp = crypto
      .randomInt(100000, 1000000)
      .toString();

    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        verified: false,
        used: false,
      },
    });

    await sendPasswordResetOtp({
      email: normalizedEmail,
      otp,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send password reset OTP.",
    });
  }
}

export async function verifyResetOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    const resetOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!resetOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired or is invalid.",
      });
    }

    if (resetOtp.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP attempts. Request a new OTP.",
      });
    }

    const otpHash = crypto
      .createHash("sha256")
      .update(otp.toString())
      .digest("hex");

    if (otpHash !== resetOtp.otpHash) {
      await prisma.passwordResetOtp.update({
        where: {
          id: resetOtp.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    await prisma.passwordResetOtp.update({
      where: {
        id: resetOtp.id,
      },
      data: {
        verified: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    console.error("Verify reset OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP.",
    });
  }
}

export async function resetPassword(req, res) {
  try {
    const {
      email,
      otp,
      newPassword,
    } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset request.",
      });
    }

    const resetOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        used: false,
        verified: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!resetOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP verification is required.",
      });
    }

    const otpHash = crypto
      .createHash("sha256")
      .update(otp.toString())
      .digest("hex");

    if (otpHash !== resetOtp.otpHash) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset request.",
      });
    }

    const passwordHash = await bcrypt.hash(
      newPassword,
      12
    );

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash,
        },
      }),

      prisma.passwordResetOtp.update({
        where: {
          id: resetOtp.id,
        },
        data: {
          used: true,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password.",
    });
  }
}

/* =========================================================
   CHANGE PASSWORD

   POST /api/auth/change-password
========================================================= */

export async function changePassword(req, res) {
  try {
    /* =====================================================
       REQUIRE AUTHENTICATED USER
    ===================================================== */

    const userId =
      req.user.userId ||
      req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication session.",
      });
    }

    /* =====================================================
       READ REQUEST
    ===================================================== */

    const {
      currentPassword,
      newPassword,
    } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid password data.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters.",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from your current password.",
      });
    }

    /* =====================================================
       LOAD USER
    ===================================================== */

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    /* =====================================================
       VERIFY CURRENT PASSWORD
    ===================================================== */

    const currentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!currentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    /* =====================================================
       HASH AND SAVE NEW PASSWORD
    ===================================================== */

    const passwordHash = await bcrypt.hash(
      newPassword,
      12
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password.",
    });
  }
}