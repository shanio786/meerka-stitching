import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, customOptionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/custom-options", async (req, res): Promise<void> => {
  const { type } = req.query;
  const conditions = [];
  if (type) conditions.push(eq(customOptionsTable.optionType, String(type)));

  const options = await db.select().from(customOptionsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(customOptionsTable.optionValue);

  res.json(options);
});

router.post("/custom-options", async (req, res): Promise<void> => {
  const { optionType, optionValue } = req.body;
  if (!optionType || !optionValue) {
    res.status(400).json({ error: "optionType and optionValue required" });
    return;
  }
  const [existing] = await db.select().from(customOptionsTable)
    .where(and(eq(customOptionsTable.optionType, optionType), eq(customOptionsTable.optionValue, optionValue)));
  if (existing) {
    res.status(409).json({ error: "Option already exists" });
    return;
  }
  const [option] = await db.insert(customOptionsTable).values({ optionType, optionValue }).returning();
  res.status(201).json(option);
});

router.delete("/custom-options/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [opt] = await db.delete(customOptionsTable).where(eq(customOptionsTable.id, id)).returning();
  if (!opt) { res.status(404).json({ error: "Option not found" }); return; }
  res.sendStatus(204);
});

export default router;
