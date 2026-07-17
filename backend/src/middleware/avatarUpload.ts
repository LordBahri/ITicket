import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { env } from "../config/env";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function avatarUploadDir() {
  return path.join(process.cwd(), env.uploads.dir, "avatars");
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = avatarUploadDir();
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).slice(0, 10);
    cb(null, `${req.user!.id}-${crypto.randomUUID()}${safeExt}`);
  },
});

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Format d'image non supporté (JPEG, PNG, WEBP ou GIF requis)"));
      return;
    }
    cb(null, true);
  },
});

export function avatarPath(storedFilename: string) {
  return path.join(avatarUploadDir(), storedFilename);
}
