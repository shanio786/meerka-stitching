import { Router, type IRouter } from "express";
import healthRouter from "./health";
import articlesRouter from "./articles";
import componentsRouter from "./components";
import templatesRouter from "./templates";
import grnRouter from "./grn";
import inventoryRouter from "./inventory";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(articlesRouter);
router.use(componentsRouter);
router.use(templatesRouter);
router.use(grnRouter);
router.use(inventoryRouter);
router.use(dashboardRouter);

export default router;
