import express from "express";

import { authenticate } from "../middleware/auth.middleware.js";

import {
  getSettings,
  updateSettings,
} from "../controllers/settings.controller.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getSettings);
router.patch("/", updateSettings);

export default router;