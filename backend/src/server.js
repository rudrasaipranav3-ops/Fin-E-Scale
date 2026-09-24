import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import analyticsRoutes from "./routes/analytics.routes.js";
import prisma from "./lib/prisma.js";
import notificationRoutes from "./routes/notification.routes.js";
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import datasetRoutes from "./routes/dataset.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import { verifyEmailTransporter } from "./lib/email.js";

/* =========================================================
   APPLICATION
========================================================= */

const app = express();

const PORT =
  Number(process.env.PORT) || 5001;

const NODE_ENV =
  process.env.NODE_ENV || "development";

/* =========================================================
   CORS CONFIGURATION
========================================================= */

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    /*
     * Requests from tools such as:
     *
     * PowerShell
     * curl
     * Postman
     *
     * may not contain an Origin header.
     */

    if (!origin) {
      return callback(
        null,
        true
      );
    }

    if (
      allowedOrigins.includes(
        origin
      )
    ) {
      return callback(
        null,
        true
      );
    }

    console.error(
      `CORS blocked request from origin: ${origin}`
    );

    const error =
      new Error(
        `CORS policy does not allow origin: ${origin}`
      );

    error.statusCode = 403;

    return callback(error);
  },

  /*
   * Required because authentication
   * uses the auth_token HttpOnly cookie.
   */

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
};

/* =========================================================
   GLOBAL MIDDLEWARE
========================================================= */

app.use(
  cors(corsOptions)
);

/*
 * Parse JSON requests.
 *
 * CSV uploads are handled separately
 * by Multer.
 */

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

/*
 * Required for:
 *
 * req.cookies.auth_token
 */

app.use(
  cookieParser()
);

/* =========================================================
   HEALTH CHECK

   GET /api/health

   This performs a real PostgreSQL connectivity check.
========================================================= */

app.get(
  "/api/health",
  async (req, res) => {
    try {
      /*
       * Lightweight PostgreSQL query.
       */

      await prisma.$queryRaw`SELECT 1`;

      return res.status(200).json({
        success: true,

        status: "OK",

        server: "online",

        database:
          "PostgreSQL",

        databaseStatus:
          "connected",

        environment:
          NODE_ENV,

        timestamp:
          new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "Health check database error:",
        error
      );

      return res.status(503).json({
        success: false,

        status: "ERROR",

        server: "online",

        database:
          "PostgreSQL",

        databaseStatus:
          "disconnected",

        environment:
          NODE_ENV,

        timestamp:
          new Date().toISOString(),

        message:
          "Database connection unavailable.",
      });
    }
  }
);

/* =========================================================
   AUTHENTICATION ROUTES

   Base:
   /api/auth
========================================================= */

/*
 * POST /api/auth/register
 *
 * POST /api/auth/login
 *
 * GET  /api/auth/me
 *
 * POST /api/auth/logout
 */

app.use(
  "/api/auth",
  authRoutes
);

/* =========================================================
   DATASET ROUTES

   Base:
   /api/datasets
========================================================= */

/*
 * GET
 * /api/datasets
 *
 * POST
 * /api/datasets/upload
 */

app.use(
  "/api/datasets",
  datasetRoutes
);

/* =========================================================
   DASHBOARD ROUTES

   Base:
   /api/dashboard
========================================================= */

/*
 * GET
 * /api/dashboard/summary
 *
 * GET
 * /api/dashboard/revenue
 *
 * GET
 * /api/dashboard/revenue?year=2026
 *
 * GET
 * /api/dashboard/products
 *
 * GET
 * /api/dashboard/orders
 *
 * GET
 * /api/dashboard/orders?limit=10
 *
 * GET
 * /api/dashboard/customer-distribution
 *
 * GET
 * /api/dashboard/activity
 */

app.use(
  "/api/dashboard",
  dashboardRoutes
);
app.use(
  "/api/analytics",
  analyticsRoutes
 )
app.use(
  "/api/notifications",
  notificationRoutes
);
app.use(
  "/api/settings",
  settingsRoutes
);
/* =========================================================
   API ROOT

   GET /api
========================================================= */

app.get(
  "/api",
  (req, res) => {
    return res.status(200).json({
      success: true,

      name:
        "E-Commerce Customer Analytics API",

      version:
        "1.0.0",

      environment:
        NODE_ENV,

      endpoints: {
        health:
          "/api/health",

        authentication: {
          register:
            "POST /api/auth/register",

          login:
            "POST /api/auth/login",

          currentUser:
            "GET /api/auth/me",

          logout:
            "POST /api/auth/logout",
        },

        datasets: {
          list:
            "GET /api/datasets",

          upload:
            "POST /api/datasets/upload",
        },

        dashboard: {
          summary:
            "GET /api/dashboard/summary",

          revenue:
            "GET /api/dashboard/revenue",

          products:
            "GET /api/dashboard/products",

          orders:
            "GET /api/dashboard/orders",

          customerDistribution:
            "GET /api/dashboard/customer-distribution",

          activity:
            "GET /api/dashboard/activity",
        },
      },
    });
  }
);

/* =========================================================
   404 HANDLER
========================================================= */

app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,

      message:
        "API route not found.",

      method:
        req.method,

      path:
        req.originalUrl,
    });
  }
);

/* =========================================================
   GLOBAL ERROR HANDLER

   Express requires all four arguments for
   error-handling middleware.
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Unhandled server error:",
      error
    );

    /* =====================================================
       CORS ERROR
    ===================================================== */

    if (
      error.statusCode === 403 ||
      error.message?.includes(
        "CORS policy"
      )
    ) {
      return res.status(403).json({
        success: false,

        message:
          error.message ||
          "Request blocked by CORS policy.",
      });
    }

    /* =====================================================
       MULTER FILE SIZE ERROR
    ===================================================== */

    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {
      return res.status(413).json({
        success: false,

        message:
          "Uploaded file exceeds the allowed size limit.",
      });
    }

    /* =====================================================
       MULTER UNEXPECTED FILE
    ===================================================== */

    if (
      error.code ===
      "LIMIT_UNEXPECTED_FILE"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Unexpected upload field. Use 'file' for CSV uploads.",
      });
    }

    /* =====================================================
       INVALID JSON
    ===================================================== */

    if (
      error instanceof SyntaxError &&
      error.status === 400 &&
      "body" in error
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid JSON request body.",
      });
    }

    /* =====================================================
       DEFAULT ERROR
    ===================================================== */

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,

      message:
        NODE_ENV ===
        "production"
          ? "Internal server error."
          : error.message ||
            "Internal server error.",
    });
  }
);

/* =========================================================
   START SERVER
========================================================= */

const server =
  app.listen(
    PORT,
    () => {
      console.log(
        "=========================================="
      );

      console.log(
        "E-Commerce Analytics Backend"
      );

      console.log(
        "=========================================="
      );

      console.log(
        `Server: http://localhost:${PORT}`
      );

      console.log(
        `API: http://localhost:${PORT}/api`
      );

      console.log(
        `Health: http://localhost:${PORT}/api/health`
      );

      console.log(
        `Auth: http://localhost:${PORT}/api/auth`
      );

      console.log(
        `Datasets: http://localhost:${PORT}/api/datasets`
      );

      console.log(
        `Dashboard: http://localhost:${PORT}/api/dashboard`
      );

      console.log(
        `Environment: ${NODE_ENV}`
      );

      console.log(
        "=========================================="
      );

      verifyEmailTransporter();
    }
  );

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

async function shutdown(
  signal
) {
  console.log(
    `\n${signal} received. Shutting down...`
  );

  server.close(
    async () => {
      try {
        await prisma.$disconnect();

        console.log(
          "PostgreSQL connection closed."
        );

        console.log(
          "Server stopped successfully."
        );

        process.exit(0);
      } catch (error) {
        console.error(
          "Shutdown error:",
          error
        );

        process.exit(1);
      }
    }
  );
}

process.on(
  "SIGINT",
  () =>
    shutdown(
      "SIGINT"
    )
);

process.on(
  "SIGTERM",
  () =>
    shutdown(
      "SIGTERM"
    )
);