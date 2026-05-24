import { Router, type IRouter } from "express";
import healthRouter from "./health";
import streetviewRouter from "./streetview";
import translateRouter from "./translate";

const router: IRouter = Router();

router.use(healthRouter);
router.use(streetviewRouter);
router.use("/translate", translateRouter);

export default router;
