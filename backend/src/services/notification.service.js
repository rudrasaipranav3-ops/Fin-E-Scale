import prisma from "../lib/prisma.js";

/**
 * Normalize a notification before returning it to the API.
 */
function normalizeNotification(notification) {
  if (!notification) {
    return null;
  }

  return {
    id: notification.id,
    type: notification.type,
    priority: notification.priority,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    relatedDate: notification.relatedDate
      ? notification.relatedDate.toISOString().slice(0, 10)
      : null,
    relatedMetric: notification.relatedMetric,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  };
}

/**
 * Get notifications belonging to the authenticated user.
 */
export async function getNotifications(userId, options = {}) {
  const limit = Math.min(
    Math.max(Number(options.limit) || 20, 1),
    100
  );

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });

  return {
    notifications: notifications.map(normalizeNotification),
    unreadCount,
  };
}

/**
 * Create a notification for an authenticated user.
 */
export async function createNotification({
  userId,
  type,
  priority = "medium",
  title,
  message,
  relatedDate = null,
  relatedMetric = null,
}) {
  if (!userId) {
    throw new Error("userId is required.");
  }

  if (!type) {
    throw new Error("Notification type is required.");
  }

  if (!title) {
    throw new Error("Notification title is required.");
  }

  if (!message) {
    throw new Error("Notification message is required.");
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      priority,
      title,
      message,
      relatedDate: relatedDate
        ? new Date(relatedDate)
        : null,
      relatedMetric,
    },
  });

  return normalizeNotification(notification);
}

/**
 * Mark one notification as read.
 */
export async function markNotificationAsRead(
  userId,
  notificationId
) {
  const existing = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!existing) {
    const error = new Error(
      "Notification not found."
    );

    error.statusCode = 404;

    throw error;
  }

  const notification =
    await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        read: true,
      },
    });

  return normalizeNotification(notification);
}

/**
 * Mark every notification for a user as read.
 */
export async function markAllNotificationsAsRead(
  userId
) {
  const result =
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

  return {
    updatedCount: result.count,
  };
}

/**
 * Delete one notification belonging to the user.
 */
export async function deleteNotification(
  userId,
  notificationId
) {
  const existing = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!existing) {
    const error = new Error(
      "Notification not found."
    );

    error.statusCode = 404;

    throw error;
  }

  await prisma.notification.delete({
    where: {
      id: notificationId,
    },
  });

  return {
    deleted: true,
    id: notificationId,
  };
}
/* =========================================================
   FORECAST NOTIFICATION DEDUPLICATION
========================================================= */

async function createForecastNotificationIfNew({
  userId,
  type,
  priority,
  title,
  message,
  relatedDate = null,
  relatedMetric = null,
}) {
  /*
   * PostgreSQL transaction-level advisory lock.
   *
   * The lock key is deterministic for the notification identity, so
   * concurrent forecast runs for the same user/notification cannot
   * both pass the existence check and create duplicates.
   *
   * The lock is released automatically when the transaction commits
   * or rolls back.
   */
  const normalizedDate = relatedDate
    ? new Date(relatedDate).toISOString().slice(0, 10)
    : null;

  const dedupeKey = JSON.stringify({
    userId: String(userId),
    type: type ?? null,
    title: title ?? null,
    relatedMetric: relatedMetric ?? null,
    relatedDate: normalizedDate,
  });

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${dedupeKey}, 0)
      )
    `;

    const existing = await tx.notification.findFirst({
      where: {
        userId,
        type,
        title,
        relatedMetric,
        relatedDate: relatedDate
          ? new Date(relatedDate)
          : null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existing) {
      return {
        created: false,
        notification: normalizeNotification(existing),
      };
    }

    const notification = await tx.notification.create({
      data: {
        userId,
        type,
        priority,
        title,
        message,
        relatedDate: relatedDate
          ? new Date(relatedDate)
          : null,
        relatedMetric,
      },
    });

    return {
      created: true,
      notification: normalizeNotification(notification),
    };
  });
}

/* =========================================================
   FORECAST NOTIFICATION GENERATION
========================================================= */

export async function generateForecastNotifications({
  userId,
  businessInsights,
  forecastExplainability = [],
}) {
  if (!userId) {
    throw new Error("userId is required.");
  }

  if (!businessInsights) {
    return {
      created: [],
      skipped: [],
    };
  }

  const created = [];
  const skipped = [];

  /* -------------------------------------------------------
     RISK ALERTS
  ------------------------------------------------------- */

  const riskAlerts =
    Array.isArray(businessInsights.riskAlerts)
      ? businessInsights.riskAlerts
      : [];

  for (const risk of riskAlerts) {
    if (!risk) {
      continue;
    }

    const result =
      await createForecastNotificationIfNew({
        userId,
        type: "risk",
        priority: risk.level || "medium",
        title:
          risk.title ||
          "Forecast Risk Alert",
        message:
          risk.message ||
          "A forecast risk condition was detected.",
        relatedMetric: risk.type || null,
      });

    if (result.created) {
      created.push(result.notification);
    } else {
      skipped.push(result.notification);
    }
  }

  /* -------------------------------------------------------
     BUSINESS RECOMMENDATIONS
  ------------------------------------------------------- */

  const recommendations =
    Array.isArray(
      businessInsights.recommendations
    )
      ? businessInsights.recommendations
      : [];

  for (const recommendation of recommendations) {
    if (!recommendation) {
      continue;
    }

    // Generic planning advice does not need
    // to appear as a notification.
    if (
      recommendation.category ===
      "planning"
    ) {
      continue;
    }

    const supportingDates =
      Array.isArray(
        recommendation.supportingDates
      )
        ? recommendation.supportingDates
        : [];

    const relatedDate =
      supportingDates.length > 0
        ? supportingDates[0]
        : null;

    const result =
      await createForecastNotificationIfNew({
        userId,

        type:
          recommendation.category ===
          "revenue-opportunity"
            ? "forecast"
            : "recommendation",

        priority:
          recommendation.priority ||
          "medium",

        title:
          recommendation.title ||
          "Forecast Recommendation",

        message:
          recommendation.recommendation ||
          "A forecast-based recommendation is available.",

        relatedDate,

        relatedMetric:
          recommendation.metric ||
          null,
      });

    if (result.created) {
      created.push(result.notification);
    } else {
      skipped.push(result.notification);
    }
  }

  /* -------------------------------------------------------
     IMPORTANT FORECAST DAYS
  ------------------------------------------------------- */

  const explanations =
    Array.isArray(
      forecastExplainability
    )
      ? forecastExplainability
      : [];

  for (const explanation of explanations) {
    if (!explanation) {
      continue;
    }

    const position =
      explanation.revenuePosition;

    if (
      position !== "high" &&
      position !== "low"
    ) {
      continue;
    }

    const predictedRevenue =
      Number(
        explanation.predictedRevenue
      );

    if (
      !Number.isFinite(
        predictedRevenue
      )
    ) {
      continue;
    }

    const date =
      explanation.date || null;

    if (!date) {
      continue;
    }

    const formattedRevenue =
      predictedRevenue.toLocaleString(
        "en-IN",
        {
          maximumFractionDigits: 0,
        }
      );

    let title;
    let message;
    let priority;

    if (position === "high") {
      title = "Strong Forecast Day";
      priority = "low";

      message =
        `${date} is forecast at ?${formattedRevenue} revenue. ` +
        `Expected orders: ${Number(
          explanation.expectedOrders || 0
        ).toFixed(2)} and predicted AOV: ?${Number(
          explanation.predictedAOV || 0
        ).toLocaleString("en-IN", {
          maximumFractionDigits: 0,
        })}.`;
    } else {
      title = "Weak Forecast Day";
      priority = "medium";

      message =
        `${date} is forecast at ?${formattedRevenue} revenue. ` +
        `Consider targeted promotional or retention activity.`;
    }

    const result =
      await createForecastNotificationIfNew({
        userId,
        type: "forecast",
        priority,
        title,
        message,
        relatedDate: date,
        relatedMetric:
          "predictedRevenue",
      });

    if (result.created) {
      created.push(result.notification);
    } else {
      skipped.push(result.notification);
    }
  }

  return {
    created,
    skipped,
  };
}

