import { Router } from "express";
import {
  listProcesses,
  getProcess,
  createProcess,
  updateProcess,
  createProcessStep,
  updateProcessStep,
} from "../controllers/process.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const processRouter = Router();

processRouter.use(authenticate);

processRouter.get("/", asyncHandler(listProcesses));
processRouter.get("/:id", asyncHandler(getProcess));
processRouter.post("/", authorize("ADMIN"), asyncHandler(createProcess));
processRouter.patch("/:id", authorize("ADMIN"), asyncHandler(updateProcess));
processRouter.post("/:id/steps", authorize("ADMIN"), asyncHandler(createProcessStep));
processRouter.patch("/steps/:stepId", authorize("ADMIN"), asyncHandler(updateProcessStep));
