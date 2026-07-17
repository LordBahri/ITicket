import { Router } from "express";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { login, me, changePassword, updateProfile, uploadMyAvatar, deleteMyAvatar } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { uploadAvatar } from "../middleware/avatarUpload";
import { HttpError } from "../middleware/errorHandler";
import { asyncHandler } from "../utils/asyncHandler";

export const authRouter = Router();

function handleAvatarUpload(req: Request, res: Response, next: NextFunction) {
  uploadAvatar.single("avatar")(req, res, (err: unknown) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Image trop volumineuse (2 Mo maximum)"
          : err instanceof Error
            ? err.message
            : "Impossible de traiter l'image";
      return next(new HttpError(400, message));
    }
    next();
  });
}

authRouter.post("/login", asyncHandler(login));
authRouter.get("/me", authenticate, asyncHandler(me));
authRouter.patch("/password", authenticate, asyncHandler(changePassword));
authRouter.patch("/profile", authenticate, asyncHandler(updateProfile));
authRouter.post("/avatar", authenticate, handleAvatarUpload, asyncHandler(uploadMyAvatar));
authRouter.delete("/avatar", authenticate, asyncHandler(deleteMyAvatar));
