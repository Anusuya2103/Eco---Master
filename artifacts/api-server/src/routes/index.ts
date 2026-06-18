import { Router, type IRouter } from "express";
import healthRouter from "./health";
import animalsRouter from "./animals";
import questionsRouter from "./questions";
import roomsRouter from "./rooms";

const router: IRouter = Router();

router.use(healthRouter);
router.use(animalsRouter);
router.use(questionsRouter);
router.use(roomsRouter);

export default router;
