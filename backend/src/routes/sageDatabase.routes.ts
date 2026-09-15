import { Router } from "express";
import {
  listSageDatabases,
  createSageDatabase,
  updateSageDatabase,
  deleteSageDatabase,
} from "../controllers/sageDatabase.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const sageDatabaseRouter = Router();

sageDatabaseRouter.use(authenticate);

sageDatabaseRouter.get("/", asyncHandler(listSageDatabases));
sageDatabaseRouter.post("/", authorize("ADMIN"), asyncHandler(createSageDatabase));
sageDatabaseRouter.patch("/:id", authorize("ADMIN"), asyncHandler(updateSageDatabase));
sageDatabaseRouter.delete("/:id", authorize("ADMIN"), asyncHandler(deleteSageDatabase));
