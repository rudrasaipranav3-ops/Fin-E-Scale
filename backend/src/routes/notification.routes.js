import express from "express";

import {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/* =========================================================
   AUTHENTICATION
========================================================= */

router.use(authenticate);

/* =========================================================
   GET NOTIFICATIONS
   GET /api/notifications
========================================================= */

router.get(
  "/",
  async (req, res, next) => {
    try {
      const result =
        await getNotifications(
          req.user.id,
          {
            limit:
              req.query.limit,
          }
        );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   CREATE NOTIFICATION
   POST /api/notifications
========================================================= */

router.post(
  "/",
  async (req, res, next) => {
    try {
      const {
        type,
        priority,
        title,
        message,
        relatedDate,
        relatedMetric,
      } = req.body;

      const notification =
        await createNotification({
          userId: req.user.id,
          type,
          priority,
          title,
          message,
          relatedDate,
          relatedMetric,
        });

      return res.status(201).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   MARK ALL AS READ
   PATCH /api/notifications/read-all
========================================================= */

router.patch(
  "/read-all",
  async (req, res, next) => {
    try {
      const result =
        await markAllNotificationsAsRead(
          req.user.id
        );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   MARK ONE AS READ
   PATCH /api/notifications/:id/read
========================================================= */

router.patch(
  "/:id/read",
  async (req, res, next) => {
    try {
      const notification =
        await markNotificationAsRead(
          req.user.id,
          req.params.id
        );

      return res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   DELETE NOTIFICATION
   DELETE /api/notifications/:id
========================================================= */

router.delete(
  "/:id",
  async (req, res, next) => {
    try {
      const result =
        await deleteNotification(
          req.user.id,
          req.params.id
        );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;