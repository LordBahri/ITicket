import { Router } from "express";
import { listNews, refreshNews } from "../controllers/news.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const newsRouter = Router();

newsRouter.use(authenticate);

newsRouter.get("/", asyncHandler(listNews));
newsRouter.post("/refresh", authorize("ADMIN"), asyncHandler(refreshNews));
