import { Router } from "express";
import {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
} from "../controllers/knowledgeArticle.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const knowledgeArticleRouter = Router();

knowledgeArticleRouter.use(authenticate);

knowledgeArticleRouter.get("/", asyncHandler(listArticles));
knowledgeArticleRouter.get("/:id", asyncHandler(getArticle));
knowledgeArticleRouter.post("/", authorize("AGENT", "ADMIN"), asyncHandler(createArticle));
knowledgeArticleRouter.patch("/:id", authorize("AGENT", "ADMIN"), asyncHandler(updateArticle));
knowledgeArticleRouter.delete("/:id", authorize("AGENT", "ADMIN"), asyncHandler(deleteArticle));
