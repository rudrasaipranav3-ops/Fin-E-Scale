import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

/* =========================================================
   AUTHENTICATION MIDDLEWARE

   Verifies:
   1. JWT secret exists
   2. auth_token cookie exists
   3. JWT signature is valid
   4. JWT contains userId
   5. User still exists in PostgreSQL
   6. User account is verified
========================================================= */

export async function authenticate(req, res, next) {
  try {
    /* =====================================================
       CHECK JWT CONFIGURATION
    ===================================================== */

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error(
        "JWT_SECRET is not configured in the environment."
      );

      return res.status(500).json({
        success: false,
        authenticated: false,
        message:
          "Authentication service is not configured correctly.",
      });
    }

    /* =====================================================
       READ JWT COOKIE
    ===================================================== */

    const token =
      req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message:
          "Authentication required.",
      });
    }

    /* =====================================================
       VERIFY JWT
    ===================================================== */

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        jwtSecret
      );
    } catch (error) {
      /*
       * Expired token.
       */

      if (
        error instanceof
        jwt.TokenExpiredError
      ) {
        return res.status(401).json({
          success: false,
          authenticated: false,
          message:
            "Your session has expired. Please log in again.",
        });
      }

      /*
       * Invalid token.
       */

      if (
        error instanceof
        jwt.JsonWebTokenError
      ) {
        return res.status(401).json({
          success: false,
          authenticated: false,
          message:
            "Invalid authentication session.",
        });
      }

      throw error;
    }

    /* =====================================================
       VALIDATE JWT PAYLOAD
    ===================================================== */

    /*
     * jsonwebtoken can theoretically return
     * either a string or an object.
     */

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !decoded.userId
    ) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message:
          "Invalid authentication token.",
      });
    }

    const userId =
      String(decoded.userId);

    /* =====================================================
       FIND USER IN POSTGRESQL
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
       USER DOES NOT EXIST
    ===================================================== */

    if (!user) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message:
          "User account not found.",
      });
    }

    /* =====================================================
       ACCOUNT VERIFICATION
    ===================================================== */

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        authenticated: false,
        message:
          "Please verify your account before continuing.",
      });
    }

    /* =====================================================
       ATTACH AUTHENTICATED USER TO REQUEST
    ===================================================== */

    req.user = {
      id: user.id,

      /*
       * Keep userId for compatibility with
       * controllers that expect req.user.userId.
       */

      userId: user.id,

      name: user.name,

      email: user.email,

      role: user.role,

      isVerified:
        user.isVerified,

      createdAt:
        user.createdAt,
    };

    /* =====================================================
       CONTINUE TO PROTECTED ROUTE
    ===================================================== */

    return next();
  } catch (error) {
    console.error(
      "Authentication middleware error:",
      error
    );

    return res.status(500).json({
      success: false,
      authenticated: false,
      message:
        "Authentication verification failed.",
    });
  }
}