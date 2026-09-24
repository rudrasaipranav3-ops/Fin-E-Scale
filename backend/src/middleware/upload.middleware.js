import multer from "multer";
import path from "path";
import fs from "fs";
import {
  fileURLToPath,
} from "url";

/* =========================================================
   FILE / DIRECTORY CONFIGURATION
========================================================= */

const __filename =
  fileURLToPath(
    import.meta.url
  );

const __dirname =
  path.dirname(
    __filename
  );

/*
 * Current file:
 *
 * backend/src/middleware/upload.middleware.js
 *
 * Upload directory:
 *
 * backend/uploads/
 */

const uploadDirectory =
  path.resolve(
    __dirname,
    "../../uploads"
  );

/* =========================================================
   UPLOAD LIMITS
========================================================= */

const MAX_FILE_SIZE =
  20 * 1024 * 1024; // 20 MB

/* =========================================================
   ENSURE UPLOAD DIRECTORY EXISTS
========================================================= */

if (
  !fs.existsSync(
    uploadDirectory
  )
) {
  fs.mkdirSync(
    uploadDirectory,
    {
      recursive: true,
    }
  );
}

/* =========================================================
   SAFE FILE NAME
========================================================= */

function createSafeFileName(
  originalName
) {
  /*
   * Extract filename only.
   *
   * This prevents directory components from
   * becoming part of the stored filename.
   */

  const baseName =
    path.basename(
      originalName
    );

  /*
   * Remove extension temporarily.
   */

  const extension =
    path
      .extname(baseName)
      .toLowerCase();

  const nameWithoutExtension =
    path.basename(
      baseName,
      extension
    );

  /*
   * Sanitize filename.
   */

  let safeName =
    nameWithoutExtension
      .trim()
      .replace(
        /\s+/g,
        "_"
      )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        ""
      )
      .replace(
        /_+/g,
        "_"
      )
      .replace(
        /^[_-]+|[_-]+$/g,
        ""
      );

  /*
   * Handle unusual filenames such as:
   *
   * @#$%.csv
   */

  if (!safeName) {
    safeName =
      "dataset";
  }

  /*
   * Limit filename length.
   */

  safeName =
    safeName.slice(
      0,
      100
    );

  /*
   * Add timestamp + random suffix
   * to prevent filename collisions.
   */

  const timestamp =
    Date.now();

  const randomSuffix =
    Math.random()
      .toString(36)
      .slice(2, 10);

  return (
    `${timestamp}-` +
    `${randomSuffix}-` +
    `${safeName}.csv`
  );
}

/* =========================================================
   MULTER STORAGE
========================================================= */

const storage =
  multer.diskStorage({
    destination(
      req,
      file,
      callback
    ) {
      callback(
        null,
        uploadDirectory
      );
    },

    filename(
      req,
      file,
      callback
    ) {
      try {
        const fileName =
          createSafeFileName(
            file.originalname
          );

        callback(
          null,
          fileName
        );
      } catch (error) {
        callback(
          error
        );
      }
    },
  });

/* =========================================================
   CSV FILE FILTER
========================================================= */

function fileFilter(
  req,
  file,
  callback
) {
  const extension =
    path
      .extname(
        file.originalname
      )
      .toLowerCase();

  /* -------------------------------------------------------
     EXTENSION CHECK
  ------------------------------------------------------- */

  if (
    extension !== ".csv"
  ) {
    const error =
      new Error(
        "Only CSV files are allowed."
      );

    error.statusCode = 400;

    return callback(
      error
    );
  }

  /* -------------------------------------------------------
     MIME TYPE CHECK
  ------------------------------------------------------- */

  /*
   * Browsers and operating systems can report CSV
   * files using different MIME types.
   */

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

    return callback(
      error
    );
  }

  return callback(
    null,
    true
  );
}

/* =========================================================
   MULTER CONFIGURATION
========================================================= */

const upload =
  multer({
    storage,

    fileFilter,

    limits: {
      /*
       * Maximum CSV dataset size:
       *
       * 20 MB
       */

      fileSize:
        MAX_FILE_SIZE,

      /*
       * Only one uploaded file is expected
       * by the dataset endpoint.
       */

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