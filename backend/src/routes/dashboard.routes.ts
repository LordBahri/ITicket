import { Router } from "express";
import { getDashboard } from "../controllers/dashboard.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get("/", authorize("ADMIN"), asyncHandler(getDashboard));
