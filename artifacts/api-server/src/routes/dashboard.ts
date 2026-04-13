import { Router, type IRouter } from "express";
import { eq, sql, gte } from "drizzle-orm";
import { db, articlesTable, grnEntriesTable, cuttingJobsTable, cuttingAssignmentsTable, stitchingJobsTable, stitchingAssignmentsTable, qcEntriesTable, overlockButtonEntriesTable, finishingEntriesTable, finalStoreReceiptsTable, mastersTable, masterAccountsTable } from "@workspace/db";
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

router.get("/dashboard/pipeline", async (_req, res): Promise<void> => {
  const [cuttingStats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      pending: sql<number>`COUNT(*) FILTER (WHERE ${cuttingJobsTable.status} = 'pending')`,
      inProgress: sql<number>`COUNT(*) FILTER (WHERE ${cuttingJobsTable.status} = 'in_progress')`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${cuttingJobsTable.status} = 'completed')`,
      totalPieces: sql<number>`COALESCE((SELECT SUM(ca.pieces_cut) FROM cutting_assignments ca), 0)`,
    })
    .from(cuttingJobsTable);

  const [stitchingStats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      pending: sql<number>`COUNT(*) FILTER (WHERE ${stitchingJobsTable.status} = 'pending')`,
      inProgress: sql<number>`COUNT(*) FILTER (WHERE ${stitchingJobsTable.status} = 'in_progress')`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${stitchingJobsTable.status} = 'completed')`,
      totalPieces: sql<number>`COALESCE((SELECT SUM(sa.pieces_completed) FROM stitching_assignments sa), 0)`,
    })
    .from(stitchingJobsTable);

  const [qcStats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      totalReceived: sql<number>`COALESCE(SUM(${qcEntriesTable.receivedQty}), 0)`,
      totalPassed: sql<number>`COALESCE(SUM(${qcEntriesTable.passedQty}), 0)`,
      totalRejected: sql<number>`COALESCE(SUM(${qcEntriesTable.rejectedQty}), 0)`,
    })
    .from(qcEntriesTable);

  const [overlockStats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      pending: sql<number>`COUNT(*) FILTER (WHERE ${overlockButtonEntriesTable.status} = 'pending')`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${overlockButtonEntriesTable.status} = 'completed')`,
      totalPieces: sql<number>`COALESCE(SUM(${overlockButtonEntriesTable.completedQty}), 0)`,
    })
    .from(overlockButtonEntriesTable);

  const [finishingStats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      pending: sql<number>`COUNT(*) FILTER (WHERE ${finishingEntriesTable.status} = 'pending')`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${finishingEntriesTable.status} = 'completed')`,
      totalPacked: sql<number>`COALESCE(SUM(${finishingEntriesTable.packedQty}), 0)`,
    })
    .from(finishingEntriesTable);

  const [finalStoreStats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      totalPacked: sql<number>`COALESCE(SUM(${finalStoreReceiptsTable.packedQty}), 0)`,
    })
    .from(finalStoreReceiptsTable);

  res.json({
    cutting: {
      totalJobs: Number(cuttingStats.total),
      pending: Number(cuttingStats.pending),
      inProgress: Number(cuttingStats.inProgress),
      completed: Number(cuttingStats.completed),
      totalPieces: Number(cuttingStats.totalPieces),
    },
    stitching: {
      totalJobs: Number(stitchingStats.total),
      pending: Number(stitchingStats.pending),
      inProgress: Number(stitchingStats.inProgress),
      completed: Number(stitchingStats.completed),
      totalPieces: Number(stitchingStats.totalPieces),
    },
    qc: {
      totalEntries: Number(qcStats.total),
      totalReceived: Number(qcStats.totalReceived),
      totalPassed: Number(qcStats.totalPassed),
      totalRejected: Number(qcStats.totalRejected),
      passRate: Number(qcStats.totalReceived) > 0 ? Math.round((Number(qcStats.totalPassed) / Number(qcStats.totalReceived)) * 100) : 0,
    },
    overlockButton: {
      totalEntries: Number(overlockStats.total),
      pending: Number(overlockStats.pending),
      completed: Number(overlockStats.completed),
      totalPieces: Number(overlockStats.totalPieces),
    },
    finishing: {
      totalEntries: Number(finishingStats.total),
      pending: Number(finishingStats.pending),
      completed: Number(finishingStats.completed),
      totalPacked: Number(finishingStats.totalPacked),
    },
    finalStore: {
      totalReceipts: Number(finalStoreStats.total),
      totalPacked: Number(finalStoreStats.totalPacked),
    },
  });
});

router.get("/dashboard/production-reports", async (_req, res): Promise<void> => {
  const masterPerformance = await db
    .select({
      masterId: mastersTable.id,
      masterName: mastersTable.name,
      masterType: mastersTable.masterType,
      machineNo: mastersTable.machineNo,
      totalEarned: masterAccountsTable.totalEarned,
      totalPaid: masterAccountsTable.totalPaid,
      balance: masterAccountsTable.balance,
    })
    .from(mastersTable)
    .leftJoin(masterAccountsTable, eq(mastersTable.id, masterAccountsTable.masterId))
    .orderBy(sql`${masterAccountsTable.totalEarned} DESC NULLS LAST`);

  const cuttingOutput = await db
    .select({
      jobId: cuttingJobsTable.id,
      articleName: articlesTable.articleName,
      articleCode: articlesTable.articleCode,
      status: cuttingJobsTable.status,
      totalAssignments: sql<number>`(SELECT COUNT(*) FROM cutting_assignments ca WHERE ca.job_id = ${cuttingJobsTable.id})`,
      totalPiecesCut: sql<number>`COALESCE((SELECT SUM(ca.pieces_cut) FROM cutting_assignments ca WHERE ca.job_id = ${cuttingJobsTable.id}), 0)`,
      totalWaste: sql<string>`COALESCE((SELECT SUM(ca.waste_meters) FROM cutting_assignments ca WHERE ca.job_id = ${cuttingJobsTable.id}), 0)`,
      totalAmount: sql<string>`COALESCE((SELECT SUM(ca.total_amount) FROM cutting_assignments ca WHERE ca.job_id = ${cuttingJobsTable.id}), 0)`,
    })
    .from(cuttingJobsTable)
    .leftJoin(articlesTable, eq(cuttingJobsTable.articleId, articlesTable.id))
    .orderBy(sql`${cuttingJobsTable.createdAt} DESC`);

  const stitchingOutput = await db
    .select({
      jobId: stitchingJobsTable.id,
      articleName: articlesTable.articleName,
      articleCode: articlesTable.articleCode,
      status: stitchingJobsTable.status,
      totalAssignments: sql<number>`(SELECT COUNT(*) FROM stitching_assignments sa WHERE sa.job_id = ${stitchingJobsTable.id})`,
      totalPieces: sql<number>`COALESCE((SELECT SUM(sa.pieces_completed) FROM stitching_assignments sa WHERE sa.job_id = ${stitchingJobsTable.id}), 0)`,
      totalAmount: sql<string>`COALESCE((SELECT SUM(sa.total_amount) FROM stitching_assignments sa WHERE sa.job_id = ${stitchingJobsTable.id}), 0)`,
    })
    .from(stitchingJobsTable)
    .leftJoin(articlesTable, eq(stitchingJobsTable.articleId, articlesTable.id))
    .orderBy(sql`${stitchingJobsTable.createdAt} DESC`);

  res.json({
    masterPerformance: masterPerformance.map(m => ({
      ...m,
      totalEarned: Number(m.totalEarned || 0),
      totalPaid: Number(m.totalPaid || 0),
      balance: Number(m.balance || 0),
    })),
    cuttingOutput: cuttingOutput.map(c => ({
      ...c,
      totalAssignments: Number(c.totalAssignments),
      totalPiecesCut: Number(c.totalPiecesCut),
      totalWaste: Number(c.totalWaste),
      totalAmount: Number(c.totalAmount),
    })),
    stitchingOutput: stitchingOutput.map(s => ({
      ...s,
      totalAssignments: Number(s.totalAssignments),
      totalPieces: Number(s.totalPieces),
      totalAmount: Number(s.totalAmount),
    })),
  });
});

export default router;
