import { Router } from "express";
import { listChangelog, createChangelogEntry } from "../controllers/changelog.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const changelogRouter = Router();

changelogRouter.use(authenticate);

changelogRouter.get("/", asyncHandler(listChangelog));
changelogRouter.post("/", authorize("ADMIN"), asyncHandler(createChangelogEntry));
