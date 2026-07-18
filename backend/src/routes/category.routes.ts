import { Router } from "express";
import { listCategories, getCategory, createCategory, updateCategory } from "../controllers/category.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const categoryRouter = Router();

categoryRouter.use(authenticate);

categoryRouter.get("/", asyncHandler(listCategories));
categoryRouter.get("/:id", asyncHandler(getCategory));
categoryRouter.post("/", authorize("ADMIN"), asyncHandler(createCategory));
categoryRouter.patch("/:id", authorize("ADMIN"), asyncHandler(updateCategory));
