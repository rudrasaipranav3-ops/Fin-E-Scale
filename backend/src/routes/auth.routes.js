import express from "express";

import {
  register,
  login,
  me,
  logout,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
} from "../controllers/auth.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/* =========================================================
   PUBLIC AUTHENTICATION ROUTES
========================================================= */

router.post(
  "/register",
  register
);

router.post(
  "/login",
  login
);

/* =========================================================
   PASSWORD RESET ROUTES
========================================================= */

router.post(
  "/forgot-password",
  forgotPassword
);

router.post(
  "/verify-reset-otp",
  verifyResetOtp
);

router.post(
  "/reset-password",
  resetPassword
);

/* =========================================================
   PROTECTED AUTHENTICATION ROUTES
========================================================= */

router.get(
  "/me",
  authenticate,
  me
);

router.post(
  "/change-password",
  authenticate,
  changePassword
);

/* =========================================================
   LOGOUT
========================================================= */

router.post(
  "/logout",
  logout
);

export default router;