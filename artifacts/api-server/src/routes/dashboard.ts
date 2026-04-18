import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, articlesTable, articleComponentsTable, cuttingJobsTable, stitchingJobsTable, qcEntriesTable, overlockButtonEntriesTable, finishingEntriesTable, finalStoreReceiptsTable, mastersTable, masterAccountsTable } from "@workspace/db";

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
      totalMeters: sql<number>`COALESCE(SUM(${articleComponentsTable.totalMetersReceived}), 0)`,
      totalComponents: sql<number>`COUNT(*)`,
    })
    .from(articleComponentsTable);

  const topCategories = await db
    .select({
      category: articlesTable.category,
      count: sql<number>`COUNT(*)`,
    })
    .from(articlesTable)
    .groupBy(articlesTable.category)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(5);

  res.json({
    totalArticles: Number(articleStats.totalArticles),
    activeArticles: Number(articleStats.activeArticles),
    totalFabricMeters: Number(fabricStats.totalMeters),
    totalComponents: Number(fabricStats.totalComponents),
    topCategories: topCategories.map(c => ({
      category: c.category,
      count: Number(c.count),
    })),
  });
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 10;

  const recentArticles = await db
    .select({
      id: articlesTable.id,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      category: articlesTable.category,
      piecesType: articlesTable.piecesType,
      createdAt: articlesTable.createdAt,
    })
    .from(articlesTable)
    .orderBy(sql`${articlesTable.createdAt} DESC`)
    .limit(limit);

  const activities = recentArticles.map((a) => ({
    id: a.id,
    type: "ARTICLE_ADDED",
    description: `${a.articleCode}: ${a.articleName} (${a.piecesType} - ${a.category})`,
    timestamp: a.createdAt,
  }));

  res.json(activities);
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

router.get("/dashboard/trend", async (req, res): Promise<void> => {
  const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 7), 90);

  // Build a row per day for the last N days, summing pieces completed per stage
  const rows = await db.execute(sql`
    WITH days AS (
      SELECT generate_series(
        (CURRENT_DATE - (${days - 1}::int))::date,
        CURRENT_DATE::date,
        INTERVAL '1 day'
      )::date AS day
    ),
    cutting AS (
      SELECT completed_date::date AS day, COALESCE(SUM(pieces_cut), 0) AS pcs
      FROM cutting_assignments
      WHERE completed_date IS NOT NULL
        AND completed_date::date >= CURRENT_DATE - (${days - 1}::int)
      GROUP BY 1
    ),
    stitching AS (
      SELECT completed_date::date AS day, COALESCE(SUM(pieces_completed), 0) AS pcs
      FROM stitching_assignments
      WHERE completed_date IS NOT NULL
        AND completed_date::date >= CURRENT_DATE - (${days - 1}::int)
      GROUP BY 1
    ),
    finishing AS (
      SELECT date::date AS day, COALESCE(SUM(packed_qty), 0) AS pcs
      FROM finishing_entries
      WHERE date IS NOT NULL
        AND date::date >= CURRENT_DATE - (${days - 1}::int)
      GROUP BY 1
    )
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS day,
      COALESCE(c.pcs, 0)::int AS cutting,
      COALESCE(s.pcs, 0)::int AS stitching,
      COALESCE(f.pcs, 0)::int AS finishing
    FROM days d
    LEFT JOIN cutting c ON c.day = d.day
    LEFT JOIN stitching s ON s.day = d.day
    LEFT JOIN finishing f ON f.day = d.day
    ORDER BY d.day ASC
  `);

  res.json(rows.rows);
});

router.get("/dashboard/workers", async (req, res): Promise<void> => {
  const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 7), 90);

  const masters = await db.execute(sql`
    WITH cutting AS (
      SELECT master_id, COALESCE(SUM(pieces_cut), 0) AS pcs
      FROM cutting_assignments
      WHERE completed_date IS NOT NULL
        AND completed_date::date >= CURRENT_DATE - (${days - 1}::int)
      GROUP BY master_id
    ),
    stitching AS (
      SELECT master_id, COALESCE(SUM(pieces_completed), 0) AS pcs
      FROM stitching_assignments
      WHERE completed_date IS NOT NULL
        AND completed_date::date >= CURRENT_DATE - (${days - 1}::int)
      GROUP BY master_id
    ),
    overlock AS (
      SELECT master_id, COALESCE(SUM(completed_qty), 0) AS pcs
      FROM overlock_button_entries
      WHERE date IS NOT NULL
        AND date::date >= CURRENT_DATE - (${days - 1}::int)
      GROUP BY master_id
    ),
    finishing AS (
      SELECT master_id, COALESCE(SUM(packed_qty), 0) AS pcs
      FROM finishing_entries
      WHERE date IS NOT NULL
        AND date::date >= CURRENT_DATE - (${days - 1}::int)
      GROUP BY master_id
    ),
    qc_master AS (
      SELECT master_id,
        COALESCE(SUM(received_qty), 0) AS received,
        COALESCE(SUM(rejected_qty), 0) AS rejected
      FROM qc_entries
      WHERE date IS NOT NULL
        AND date::date >= CURRENT_DATE - (${days - 1}::int)
        AND master_id IS NOT NULL
      GROUP BY master_id
    )
    SELECT
      m.id,
      m.name,
      m.master_type AS "masterType",
      m.machine_no AS "machineNo",
      COALESCE(c.pcs, 0)::int +
      COALESCE(s.pcs, 0)::int +
      COALESCE(o.pcs, 0)::int +
      COALESCE(f.pcs, 0)::int AS "totalPieces",
      COALESCE(c.pcs, 0)::int AS "cuttingPieces",
      COALESCE(s.pcs, 0)::int AS "stitchingPieces",
      COALESCE(o.pcs, 0)::int AS "overlockPieces",
      COALESCE(f.pcs, 0)::int AS "finishingPieces",
      COALESCE(qc.received, 0)::int AS "qcReceived",
      COALESCE(qc.rejected, 0)::int AS "qcRejected",
      CASE WHEN COALESCE(qc.received, 0) > 0
           THEN ROUND((qc.rejected::numeric / qc.received::numeric) * 100, 1)
           ELSE 0 END AS "defectRate"
    FROM masters m
    LEFT JOIN cutting c ON c.master_id = m.id
    LEFT JOIN stitching s ON s.master_id = m.id
    LEFT JOIN overlock o ON o.master_id = m.id
    LEFT JOIN finishing f ON f.master_id = m.id
    LEFT JOIN qc_master qc ON qc.master_id = m.id
    WHERE COALESCE(c.pcs, 0) + COALESCE(s.pcs, 0) + COALESCE(o.pcs, 0) + COALESCE(f.pcs, 0) > 0
    ORDER BY "totalPieces" DESC
    LIMIT 10
  `);

  res.json(masters.rows);
});

export default router;
