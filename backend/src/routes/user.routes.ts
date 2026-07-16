import { Router } from "express";
import {
  listUsers,
  listAgents,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  listRemoteAccess,
} from "../controllers/user.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get("/", authorize("ADMIN"), asyncHandler(listUsers));
userRouter.get("/agents", authorize("AGENT", "ADMIN"), asyncHandler(listAgents));
userRouter.get("/remote-access", authorize("AGENT", "ADMIN"), asyncHandler(listRemoteAccess));
userRouter.get("/:id", authorize("ADMIN"), asyncHandler(getUser));
userRouter.post("/", authorize("ADMIN"), asyncHandler(createUser));
userRouter.patch("/:id", authorize("ADMIN"), asyncHandler(updateUser));
userRouter.delete("/:id", authorize("ADMIN"), asyncHandler(deleteUser));
userRouter.post("/:id/reset-password", authorize("ADMIN"), asyncHandler(resetUserPassword));
