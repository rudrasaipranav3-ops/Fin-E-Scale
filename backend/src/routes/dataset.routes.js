import express from "express";

import upload from "../middleware/upload.middleware.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  uploadDataset,
  validateDataset,
  getDatasets,
} from "../controllers/dataset.controller.js";

/* =========================================================
   DATASET ROUTER
========================================================= */

const router = express.Router();

/* =========================================================
   AUTHENTICATION

   Every dataset route requires a valid authenticated
   session through the auth_token HttpOnly cookie.
========================================================= */

router.use(authenticate);

/* =========================================================
   GET DATASETS

   GET /api/datasets

   Returns all datasets belonging to the
   currently authenticated user.
========================================================= */

router.get(
  "/",
  getDatasets
);

/* =========================================================
   UPLOAD DATASET

   POST /api/datasets/upload

   Content-Type:
   multipart/form-data

   Expected form fields:

   file        -> CSV file (required)
   name        -> Dataset name (optional)
   description -> Dataset description (optional)

   The Multer middleware processes the file before
   passing control to uploadDataset.
========================================================= */

router.post(
  "/validate",
  upload.single("file"),
  validateDataset
);

router.post(
  "/upload",
  upload.single("file"),
  uploadDataset
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

export default router;