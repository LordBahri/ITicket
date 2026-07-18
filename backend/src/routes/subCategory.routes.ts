import { Router } from "express";
import { listSubCategories, getSubCategory, createSubCategory, updateSubCategory } from "../controllers/subCategory.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const subCategoryRouter = Router();

subCategoryRouter.use(authenticate);

subCategoryRouter.get("/", asyncHandler(listSubCategories));
subCategoryRouter.get("/:id", asyncHandler(getSubCategory));
subCategoryRouter.post("/", authorize("ADMIN"), asyncHandler(createSubCategory));
subCategoryRouter.patch("/:id", authorize("ADMIN"), asyncHandler(updateSubCategory));
