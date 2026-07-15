import { Router } from "express";
import { listUsers, listAgents, getUser, createUser, updateUser } from "../controllers/user.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get("/", authorize("ADMIN"), asyncHandler(listUsers));
userRouter.get("/agents", authorize("AGENT", "ADMIN"), asyncHandler(listAgents));
userRouter.get("/:id", authorize("ADMIN"), asyncHandler(getUser));
userRouter.post("/", authorize("ADMIN"), asyncHandler(createUser));
userRouter.patch("/:id", authorize("ADMIN"), asyncHandler(updateUser));
