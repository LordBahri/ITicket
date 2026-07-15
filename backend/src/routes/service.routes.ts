import { Router } from "express";
import { listServices, createService, updateService } from "../controllers/service.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const serviceRouter = Router();

serviceRouter.use(authenticate);

serviceRouter.get("/", asyncHandler(listServices));
serviceRouter.post("/", authorize("ADMIN"), asyncHandler(createService));
serviceRouter.patch("/:id", authorize("ADMIN"), asyncHandler(updateService));
