import { Router } from "express";
import { login, me, changePassword, updateProfile, uploadMyAvatar, deleteMyAvatar } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { uploadAvatar } from "../middleware/avatarUpload";
import { handleMulterUpload } from "../utils/handleMulterUpload";
import { asyncHandler } from "../utils/asyncHandler";

export const authRouter = Router();

const handleAvatarUpload = handleMulterUpload(uploadAvatar.single("avatar"), "Image trop volumineuse (2 Mo maximum)");

authRouter.post("/login", asyncHandler(login));
authRouter.get("/me", authenticate, asyncHandler(me));
authRouter.patch("/password", authenticate, asyncHandler(changePassword));
authRouter.patch("/profile", authenticate, asyncHandler(updateProfile));
authRouter.post("/avatar", authenticate, handleAvatarUpload, asyncHandler(uploadMyAvatar));
authRouter.delete("/avatar", authenticate, asyncHandler(deleteMyAvatar));
