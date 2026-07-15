import { Router } from "express";
import { listAssets, getAsset, createAsset, updateAsset } from "../controllers/asset.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const assetRouter = Router();

assetRouter.use(authenticate, authorize("ADMIN"));

assetRouter.get("/", asyncHandler(listAssets));
assetRouter.get("/:id", asyncHandler(getAsset));
assetRouter.post("/", asyncHandler(createAsset));
assetRouter.patch("/:id", asyncHandler(updateAsset));
