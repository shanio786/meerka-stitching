import { Router, type IRouter } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import authRouter from "./auth";
import healthRouter from "./health";
import articlesRouter from "./articles";
import componentsRouter from "./components";
import accessoriesRouter from "./accessories";
import dashboardRouter from "./dashboard";
import storageRouter, { publicStorageRouter } from "./storage";
import mastersRouter from "./masters";
import sizesRouter from "./sizes";
import cuttingRouter from "./cutting";
import stitchingRouter from "./stitching";
import qualityRouter from "./quality";
import overlockButtonRouter from "./overlock-button";
import finishingRouter from "./finishing";
import finalStoreRouter from "./final-store";
import accountsRouter from "./accounts";
import imagesRouter from "./images";
import customOptionsRouter from "./custom-options";
import articleTrackerRouter from "./article-tracker";

const router: IRouter = Router();

// Public
router.use(healthRouter);
router.use(authRouter);
router.use(publicStorageRouter);

// Authenticated routes
router.use(requireAuth);

router.use(articlesRouter);
router.use(componentsRouter);
router.use(accessoriesRouter);
router.use(dashboardRouter);
router.use(storageRouter);
router.use(mastersRouter);
router.use(sizesRouter);
router.use(cuttingRouter);
router.use(stitchingRouter);
router.use(qualityRouter);
router.use(overlockButtonRouter);
router.use(finishingRouter);
router.use(finalStoreRouter);
router.use(imagesRouter);
router.use(customOptionsRouter);
router.use(articleTrackerRouter);

// Admin-only (payments / accounts / ledger)
router.use(requireAdmin, accountsRouter);

export default router;
