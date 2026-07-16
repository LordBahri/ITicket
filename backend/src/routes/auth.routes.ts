import { Router } from "express";
import { login, me, changePassword } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(login));
authRouter.get("/me", authenticate, asyncHandler(me));
authRouter.patch("/password", authenticate, asyncHandler(changePassword));
