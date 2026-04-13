import { Router, type IRouter } from "express";
import { eq, sql, gte } from "drizzle-orm";
import { db, articlesTable, grnEntriesTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentActivityQueryParams,
  GetRecentActivityResponse,
  GetFabricByTypeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [articleStats] = await db
    .select({
      totalArticles: sql<number>`COUNT(*)`,
      activeArticles: sql<number>`COUNT(*) FILTER (WHERE ${articlesTable.isActive} = true)`,
    })
    .from(articlesTable);

  const [fabricStats] = await db
    .select({
      totalFabricMeters: sql<number>`COALESCE(SUM(${grnEntriesTable.totalMeters}), 0)`,
      totalGrnEntries: sql<number>`COUNT(*)`,
      totalStockValue: sql<number>`COALESCE(SUM(${grnEntriesTable.totalCost}), 0)`,
    })
    .from(grnEntriesTable);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recentStats] = await db
    .select({
      recentGrnCount: sql<number>`COUNT(*)`,
    })
    .from(grnEntriesTable)
    .where(gte(grnEntriesTable.createdAt, thirtyDaysAgo));

  const lowStockThreshold = 50;
  const lowStockArticles = await db
    .select({
      articleId: articlesTable.id,
      total: sql<number>`COALESCE(SUM(${grnEntriesTable.totalMeters}), 0)`,
    })
    .from(articlesTable)
    .leftJoin(grnEntriesTable, eq(articlesTable.id, grnEntriesTable.articleId))
    .where(eq(articlesTable.isActive, true))
    .groupBy(articlesTable.id)
    .having(sql`COALESCE(SUM(${grnEntriesTable.totalMeters}), 0) < ${lowStockThreshold}`);

  const topCategories = await db
    .select({
      category: articlesTable.category,
      count: sql<number>`COUNT(*)`,
    })
    .from(articlesTable)
    .groupBy(articlesTable.category)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(5);

  res.json(GetDashboardSummaryResponse.parse({
    totalArticles: Number(articleStats.totalArticles),
    activeArticles: Number(articleStats.activeArticles),
    totalFabricMeters: Number(fabricStats.totalFabricMeters),
    totalGrnEntries: Number(fabricStats.totalGrnEntries),
    totalStockValue: Number(fabricStats.totalStockValue),
    lowStockCount: lowStockArticles.length,
    recentGrnCount: Number(recentStats.recentGrnCount),
    topCategories: topCategories.map(c => ({
      category: c.category,
      count: Number(c.count),
    })),
  }));
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const params = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = params.success && params.data.limit ? params.data.limit : 10;

  const recentGrn = await db
    .select({
      id: grnEntriesTable.id,
      grnNumber: grnEntriesTable.grnNumber,
      supplierName: grnEntriesTable.supplierName,
      totalMeters: grnEntriesTable.totalMeters,
      articleName: articlesTable.articleName,
      createdAt: grnEntriesTable.createdAt,
    })
    .from(grnEntriesTable)
    .leftJoin(articlesTable, eq(grnEntriesTable.articleId, articlesTable.id))
    .orderBy(sql`${grnEntriesTable.createdAt} DESC`)
    .limit(limit);

  const activities = recentGrn.map((grn) => ({
    id: grn.id,
    type: "GRN_RECEIVED",
    description: `${grn.grnNumber}: ${grn.totalMeters}m of ${grn.articleName || "Unknown"} from ${grn.supplierName}`,
    timestamp: grn.createdAt,
    metadata: {},
  }));

  res.json(GetRecentActivityResponse.parse(activities));
});

router.get("/dashboard/fabric-by-type", async (_req, res): Promise<void> => {
  const result = await db
    .select({
      fabricType: articlesTable.fabricType,
      totalMeters: sql<number>`COALESCE(SUM(${grnEntriesTable.totalMeters}), 0)`,
      articleCount: sql<number>`COUNT(DISTINCT ${articlesTable.id})`,
    })
    .from(articlesTable)
    .leftJoin(grnEntriesTable, eq(articlesTable.id, grnEntriesTable.articleId))
    .groupBy(articlesTable.fabricType);

  res.json(GetFabricByTypeResponse.parse(result.map(r => ({
    fabricType: r.fabricType,
    totalMeters: Number(r.totalMeters),
    articleCount: Number(r.articleCount),
  }))));
});

export default router;
