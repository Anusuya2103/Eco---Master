import { Router, type IRouter } from "express";
import { ANIMALS } from "../lib/gameData";

const router: IRouter = Router();

router.get("/animals", (_req, res): void => {
  res.json(ANIMALS);
});

export default router;
