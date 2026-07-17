import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { env } from "../config/env";

function chatUploadDir(threadId: string) {
  return path.join(process.cwd(), env.uploads.dir, "chat", threadId);
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = chatUploadDir(req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname).slice(0, 10);
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

export const uploadChatFile = multer({
  storage,
  limits: { fileSize: env.uploads.maxSizeMb * 1024 * 1024, files: 1 },
});

export function chatAttachmentPath(threadId: string, storedFilename: string) {
  return path.join(chatUploadDir(threadId), storedFilename);
}
