import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, articlesTable, grnEntriesTable } from "@workspace/db";
import {
  GetInventorySummaryResponse,
  GetLowStockAlertsQueryParams,
  GetLowStockAlertsResponse,
  GetArticleStockParams,
  GetArticleStockResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/inventory/summary", async (_req, res): Promise<void> => {
  const summary = await db
    .select({
      articleId: articlesTable.id,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      fabricType: articlesTable.fabricType,
      totalMetersReceived: sql<number>`COALESCE(SUM(${grnEntriesTable.totalMeters}), 0)`,
      totalRolls: sql<number>`COALESCE(SUM(${grnEntriesTable.totalRolls}), 0)`,
      totalCost: sql<number>`COALESCE(SUM(${grnEntriesTable.totalCost}), 0)`,
      grnCount: sql<number>`COUNT(${grnEntriesTable.id})`,
    })
    .from(articlesTable)
    .leftJoin(grnEntriesTable, eq(articlesTable.id, grnEntriesTable.articleId))
    .groupBy(articlesTable.id, articlesTable.articleCode, articlesTable.articleName, articlesTable.fabricType)
    .orderBy(articlesTable.articleName);

  res.json(GetInventorySummaryResponse.parse(summary.map(s => ({
    ...s,
    totalMetersReceived: Number(s.totalMetersReceived),
    totalRolls: Number(s.totalRolls),
    totalCost: Number(s.totalCost),
    grnCount: Number(s.grnCount),
  }))));
});

router.get("/inventory/low-stock", async (req, res): Promise<void> => {
  const params = GetLowStockAlertsQueryParams.safeParse(req.query);
  const threshold = params.success && params.data.threshold !== undefined ? params.data.threshold : 50;

  const summary = await db
    .select({
      articleId: articlesTable.id,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      totalMetersReceived: sql<number>`COALESCE(SUM(${grnEntriesTable.totalMeters}), 0)`,
    })
    .from(articlesTable)
    .leftJoin(grnEntriesTable, eq(articlesTable.id, grnEntriesTable.articleId))
    .where(eq(articlesTable.isActive, true))
    .groupBy(articlesTable.id, articlesTable.articleCode, articlesTable.articleName)
    .having(sql`COALESCE(SUM(${grnEntriesTable.totalMeters}), 0) < ${threshold}`);

  res.json(GetLowStockAlertsResponse.parse(summary.map(s => ({
    ...s,
    totalMetersReceived: Number(s.totalMetersReceived),
    threshold,
  }))));
});

router.get("/inventory/article/:articleId", async (req, res): Promise<void> => {
  const params = GetArticleStockParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [article] = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.id, params.data.articleId));

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const entries = await db
    .select()
    .from(grnEntriesTable)
    .where(eq(grnEntriesTable.articleId, params.data.articleId))
    .orderBy(grnEntriesTable.date);

  const totalMeters = entries.reduce((sum, e) => sum + e.totalMeters, 0);
  const totalRolls = entries.reduce((sum, e) => sum + e.totalRolls, 0);
  const totalCost = entries.reduce((sum, e) => sum + e.totalCost, 0);

  res.json(GetArticleStockResponse.parse({
    articleId: article.id,
    articleCode: article.articleCode,
    articleName: article.articleName,
    fabricType: article.fabricType,
    totalMetersReceived: totalMeters,
    totalRolls,
    totalCost,
    grnEntries: entries.map(e => ({
      ...e,
      articleCode: article.articleCode,
      articleName: article.articleName,
    })),
  }));
});

export default router;
