import { Router } from "express";
import { listPriorities, createPriority, updatePriority } from "../controllers/priority.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const priorityRouter = Router();

priorityRouter.use(authenticate);

priorityRouter.get("/", asyncHandler(listPriorities));
priorityRouter.post("/", authorize("ADMIN"), asyncHandler(createPriority));
priorityRouter.patch("/:id", authorize("ADMIN"), asyncHandler(updatePriority));
