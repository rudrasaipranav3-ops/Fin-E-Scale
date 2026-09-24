import express from "express";

import {
  runCustomerSegmentation,
  runCustomerChurnPrediction,
  runCustomerCLVPrediction,
  runMarketBasketAnalysis,
  runProductRecommendations,
  runSalesForecast,
} from "../controllers/analytics.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

/* =========================================================
   ROUTER
========================================================= */

const router = express.Router();

/* =========================================================
   AUTHENTICATION

   Every analytics route declared below this middleware
   requires a valid authenticated user.

   Requests must contain a valid:
   auth_token cookie
========================================================= */

router.use(authenticate);

/* =========================================================
   CUSTOMER SEGMENTATION

   POST /api/analytics/segmentation/run

   Pipeline:
   PostgreSQL
      ↓
   Express / Prisma
      ↓
   Feature Engineering
      ↓
   FastAPI
      ↓
   K-Means
      ↓
   CustomerSegment
========================================================= */

router.post(
  "/segmentation/run",
  runCustomerSegmentation
);

/* =========================================================
   CUSTOMER CHURN PREDICTION

   POST /api/analytics/churn/run

   Pipeline:
   PostgreSQL
      ↓
   Express / Prisma
      ↓
   Churn Feature Engineering
      ↓
   FastAPI
      ↓
   Behavioral Churn Model
      ↓
   ChurnPrediction
========================================================= */

router.post(
  "/churn/run",
  runCustomerChurnPrediction
);

/* =========================================================
   CUSTOMER LIFETIME VALUE PREDICTION

   POST /api/analytics/clv/run

   Pipeline:
   PostgreSQL
      ↓
   Express / Prisma
      ↓
   CLV Feature Engineering
      ↓
   FastAPI
      ↓
   Behavioral CLV Model
      ↓
   CLVPrediction

   Features:
   - Recency
   - Frequency
   - Monetary Value
   - Average Order Value
   - Customer Tenure
   - Average Days Between Orders
========================================================= */

router.post(
  "/clv/run",
  runCustomerCLVPrediction
);

/* =========================================================
   MARKET BASKET ANALYSIS

   POST /api/analytics/market-basket/run

   Pipeline:
   PostgreSQL
      ↓
   Express / Prisma
      ↓
   Transaction Builder
      ↓
   FastAPI
      ↓
   Apriori Algorithm
      ↓
   Association Rules

   Output:
   - Transaction Count
   - Unique Products
   - Frequent Itemsets
   - Association Rules
   - Support
   - Confidence
   - Lift
   - Strongest Rule
========================================================= */

router.post(
  "/market-basket/run",
  runMarketBasketAnalysis
);

router.post(
    "/recommendations/run",
    runProductRecommendations
);

router.post(
    "/forecasting/run",
    runSalesForecast
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

export default router;