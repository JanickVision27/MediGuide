import multer from "multer";

const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROFILE_PHOTO_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return callback(new Error("Choose a JPG, PNG, or WebP profile photo."));
    }
    return callback(null, true);
  },
});

export function profilePhotoUpload(req, res, next) {
  upload.single("photo")(req, res, (error) => {
    if (error) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      return res.status(tooLarge ? 413 : 400).json({
        message: tooLarge
          ? "Profile photos must be 2 MB or smaller."
          : error.message || "Could not read the profile photo.",
      });
    }
    return next();
  });
}
