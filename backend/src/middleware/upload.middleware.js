import multer from "multer";
import path from "path";
import fs from "fs";

/* =========================================================
   FILE / DIRECTORY CONFIGURATION
========================================================= */

const uploadDirectory = "/tmp/fin-e-scale-uploads";

/* =========================================================
   UPLOAD LIMITS
========================================================= */

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/* =========================================================
   SAFE FILE NAME
========================================================= */

function createSafeFileName(originalName) {
  const baseName = path.basename(originalName);

  const extension = path.extname(baseName).toLowerCase();

  const nameWithoutExtension = path.basename(
    baseName,
    extension
  );

  let safeName = nameWithoutExtension
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "");

  if (!safeName) {
    safeName = "dataset";
  }

  safeName = safeName.slice(0, 100);

  const timestamp = Date.now();

  const randomSuffix = Math.random()
    .toString(36)
    .slice(2, 10);

  return `${timestamp}-${randomSuffix}-${safeName}.csv`;
}

/* =========================================================
   MULTER STORAGE
========================================================= */

const storage = multer.diskStorage({

  destination(req, file, callback) {
    try {
      /*
       * IMPORTANT:
       * Create the directory only when the upload request
       * actually arrives.
       */

      fs.mkdirSync(uploadDirectory, {
        recursive: true,
      });

      console.log(
        "CSV upload directory:",
        uploadDirectory
      );

      callback(null, uploadDirectory);

    } catch (error) {

      console.error(
        "Unable to create CSV upload directory:",
        error
      );

      callback(error);
    }
  },

  filename(req, file, callback) {
    try {

      const fileName =
        createSafeFileName(
          file.originalname
        );

      console.log(
        "CSV upload filename:",
        fileName
      );

      callback(null, fileName);

    } catch (error) {

      console.error(
        "Unable to generate CSV filename:",
        error
      );

      callback(error);
    }
  },
});

/* =========================================================
   CSV FILE FILTER
========================================================= */

function fileFilter(req, file, callback) {

  const extension =
    path
      .extname(file.originalname)
      .toLowerCase();

  if (extension !== ".csv") {

    const error =
      new Error(
        "Only CSV files are allowed."
      );

    error.statusCode = 400;

    return callback(error);
  }

  const allowedMimeTypes =
    new Set([
      "text/csv",
      "application/csv",
      "text/plain",
      "application/vnd.ms-excel",
      "application/octet-stream",
    ]);

  if (
    file.mimetype &&
    !allowedMimeTypes.has(
      file.mimetype
    )
  ) {

    const error =
      new Error(
        "Invalid CSV file type."
      );

    error.statusCode = 400;

    return callback(error);
  }

  return callback(null, true);
}

/* =========================================================
   MULTER CONFIGURATION
========================================================= */

const upload =
  multer({

    storage,

    fileFilter,

    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
    },

  });

/* =========================================================
   EXPORTS
========================================================= */

export {
  uploadDirectory,
  MAX_FILE_SIZE,
};

export default upload;