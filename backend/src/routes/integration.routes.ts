import { Router } from "express";
import { slackCommand, teamsWebhook } from "../controllers/integration.controller";
import { asyncHandler } from "../utils/asyncHandler";

export const integrationRouter = Router();

integrationRouter.post("/slack/command", asyncHandler(slackCommand));
integrationRouter.post("/teams/webhook", asyncHandler(teamsWebhook));
