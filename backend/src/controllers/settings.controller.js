import {
  getUserSettings,
  updateUserSettings,
} from "../services/settings.service.js";

export async function getSettings(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const settings = await getUserSettings(userId);

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load settings.",
    });
  }
}

export async function updateSettings(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const settings = await updateUserSettings(
      userId,
      req.body || {}
    );

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully.",
      settings,
    });
  } catch (error) {
    console.error("Update settings error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to update settings.";

    if (
      message.includes("must be") ||
      message.includes("one of")
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update settings.",
    });
  }
}