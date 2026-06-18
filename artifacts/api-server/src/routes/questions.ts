import { Router, type IRouter } from "express";
import { QUESTIONS } from "../lib/gameData";
import { ListQuestionsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/questions", (req, res): void => {
  const parsed = ListQuestionsQueryParams.safeParse(req.query);
  const count = parsed.success ? (parsed.data.count ?? QUESTIONS.length) : QUESTIONS.length;

  // Return a random shuffled slice
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  res.json(shuffled.slice(0, Math.min(count, shuffled.length)));
});

export default router;
