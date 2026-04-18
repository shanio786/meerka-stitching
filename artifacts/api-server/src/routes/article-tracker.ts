import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  articlesTable,
  articleComponentsTable,
  cuttingJobsTable,
  cuttingAssignmentsTable,
  cuttingSizeBreakdownTable,
  stitchingJobsTable,
  stitchingAssignmentsTable,
  qcEntriesTable,
  overlockButtonEntriesTable,
  finishingEntriesTable,
  finalStoreReceiptsTable,
  mastersTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/articles/:id/tracker", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [article] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const components = await db
    .select()
    .from(articleComponentsTable)
    .where(eq(articleComponentsTable.articleId, id));

  // Cutting jobs
  const cuttingJobs = await db
    .select()
    .from(cuttingJobsTable)
    .where(eq(cuttingJobsTable.articleId, id));
  const cuttingJobIds = cuttingJobs.map((j) => j.id);

  // Cutting assignments + sizes
  const cuttingAssignments = cuttingJobIds.length
    ? await db
        .select({
          id: cuttingAssignmentsTable.id,
          jobId: cuttingAssignmentsTable.jobId,
          masterId: cuttingAssignmentsTable.masterId,
          masterName: mastersTable.name,
          componentName: cuttingAssignmentsTable.componentName,
          piecesCut: cuttingAssignmentsTable.piecesCut,
          ratePerPiece: cuttingAssignmentsTable.ratePerPiece,
          ratePerSuit: cuttingAssignmentsTable.ratePerSuit,
          totalAmount: cuttingAssignmentsTable.totalAmount,
          status: cuttingAssignmentsTable.status,
          handoverStatus: cuttingAssignmentsTable.handoverStatus,
          receivedBy: cuttingAssignmentsTable.receivedBy,
          handoverDate: cuttingAssignmentsTable.handoverDate,
          fabricGivenMeters: cuttingAssignmentsTable.fabricGivenMeters,
        })
        .from(cuttingAssignmentsTable)
        .leftJoin(mastersTable, eq(mastersTable.id, cuttingAssignmentsTable.masterId))
        .where(sql`${cuttingAssignmentsTable.jobId} = ANY(ARRAY[${sql.join(cuttingJobIds, sql`, `)}]::int[])`)
    : [];

  const cuttingAssignmentIds = cuttingAssignments.map((a) => a.id);
  const cuttingSizes = cuttingAssignmentIds.length
    ? await db
        .select()
        .from(cuttingSizeBreakdownTable)
        .where(sql`${cuttingSizeBreakdownTable.assignmentId} = ANY(ARRAY[${sql.join(cuttingAssignmentIds, sql`, `)}]::int[])`)
    : [];

  // Stitching
  const stitchingJobs = await db
    .select()
    .from(stitchingJobsTable)
    .where(eq(stitchingJobsTable.articleId, id));
  const stitchingJobIds = stitchingJobs.map((j) => j.id);

  const stitchingAssignments = stitchingJobIds.length
    ? await db
        .select({
          id: stitchingAssignmentsTable.id,
          jobId: stitchingAssignmentsTable.jobId,
          masterId: stitchingAssignmentsTable.masterId,
          masterName: mastersTable.name,
          componentName: stitchingAssignmentsTable.componentName,
          size: stitchingAssignmentsTable.size,
          quantityGiven: stitchingAssignmentsTable.quantityGiven,
          quantityCompleted: stitchingAssignmentsTable.quantityCompleted,
          ratePerPiece: stitchingAssignmentsTable.ratePerPiece,
          totalAmount: stitchingAssignmentsTable.totalAmount,
          status: stitchingAssignmentsTable.status,
        })
        .from(stitchingAssignmentsTable)
        .leftJoin(mastersTable, eq(mastersTable.id, stitchingAssignmentsTable.masterId))
        .where(sql`${stitchingAssignmentsTable.jobId} = ANY(ARRAY[${sql.join(stitchingJobIds, sql`, `)}]::int[])`)
    : [];

  // QC
  const qcEntries = await db
    .select({
      id: qcEntriesTable.id,
      inspectorName: qcEntriesTable.inspectorName,
      masterName: mastersTable.name,
      componentName: qcEntriesTable.componentName,
      size: qcEntriesTable.size,
      receivedFrom: qcEntriesTable.receivedFrom,
      receivedQty: qcEntriesTable.receivedQty,
      passedQty: qcEntriesTable.passedQty,
      rejectedQty: qcEntriesTable.rejectedQty,
      date: qcEntriesTable.date,
    })
    .from(qcEntriesTable)
    .leftJoin(mastersTable, eq(mastersTable.id, qcEntriesTable.masterId))
    .where(eq(qcEntriesTable.articleId, id));

  // Overlock/Button
  const overlockEntries = await db
    .select({
      id: overlockButtonEntriesTable.id,
      taskType: overlockButtonEntriesTable.taskType,
      masterName: mastersTable.name,
      componentName: overlockButtonEntriesTable.componentName,
      size: overlockButtonEntriesTable.size,
      receivedFrom: overlockButtonEntriesTable.receivedFrom,
      receivedQty: overlockButtonEntriesTable.receivedQty,
      completedQty: overlockButtonEntriesTable.completedQty,
      ratePerPiece: overlockButtonEntriesTable.ratePerPiece,
      totalAmount: overlockButtonEntriesTable.totalAmount,
      status: overlockButtonEntriesTable.status,
      date: overlockButtonEntriesTable.date,
    })
    .from(overlockButtonEntriesTable)
    .leftJoin(mastersTable, eq(mastersTable.id, overlockButtonEntriesTable.masterId))
    .where(eq(overlockButtonEntriesTable.articleId, id));

  // Finishing
  const finishingEntries = await db
    .select({
      id: finishingEntriesTable.id,
      workerName: finishingEntriesTable.workerName,
      masterName: mastersTable.name,
      componentName: finishingEntriesTable.componentName,
      size: finishingEntriesTable.size,
      receivedFrom: finishingEntriesTable.receivedFrom,
      receivedQty: finishingEntriesTable.receivedQty,
      packedQty: finishingEntriesTable.packedQty,
      ratePerPiece: finishingEntriesTable.ratePerPiece,
      totalAmount: finishingEntriesTable.totalAmount,
      status: finishingEntriesTable.status,
      date: finishingEntriesTable.date,
    })
    .from(finishingEntriesTable)
    .leftJoin(mastersTable, eq(mastersTable.id, finishingEntriesTable.masterId))
    .where(eq(finishingEntriesTable.articleId, id));

  // Final Store
  const finalStore = await db
    .select()
    .from(finalStoreReceiptsTable)
    .where(eq(finalStoreReceiptsTable.articleId, id));

  // Aggregate sums
  const totalPiecesCut = cuttingAssignments.reduce((s, a) => s + (a.piecesCut || 0), 0);
  const totalPiecesStitched = stitchingAssignments.reduce((s, a) => s + (a.quantityCompleted || 0), 0);
  const totalPiecesPassedQc = qcEntries.reduce((s, e) => s + (e.passedQty || 0), 0);
  const totalPiecesPacked = finishingEntries.reduce((s, e) => s + (e.packedQty || 0), 0);
  const totalPiecesInFinalStore = finalStore.reduce((s, e) => s + (e.packedQty || 0), 0);

  // Cost
  const cuttingCost = cuttingAssignments.reduce((s, a) => s + (a.totalAmount || 0), 0);
  const stitchingCost = stitchingAssignments.reduce((s, a) => s + (a.totalAmount || 0), 0);
  const overlockCost = overlockEntries.reduce((s, e) => s + (e.totalAmount || 0), 0);
  const finishingCost = finishingEntries.reduce((s, e) => s + (e.totalAmount || 0), 0);
  const fabricCost = 0; // No fabric rate stored on components yet
  const totalCost = fabricCost + cuttingCost + stitchingCost + overlockCost + finishingCost;
  const costPerPiece = totalPiecesInFinalStore > 0 ? totalCost / totalPiecesInFinalStore : 0;

  // Per-size aggregation across pipeline
  const sizes = new Set<string>();
  cuttingSizes.forEach((s) => sizes.add(s.size));
  stitchingAssignments.forEach((a) => a.size && sizes.add(a.size));
  qcEntries.forEach((e) => e.size && sizes.add(e.size));
  overlockEntries.forEach((e) => e.size && sizes.add(e.size));
  finishingEntries.forEach((e) => e.size && sizes.add(e.size));
  finalStore.forEach((e) => e.size && sizes.add(e.size));

  const sizeBreakdown = Array.from(sizes).map((size) => {
    const cut = cuttingSizes
      .filter((s) => s.size === size)
      .reduce((sum, s) => sum + (s.completedQty && s.completedQty > 0 ? s.completedQty : s.quantity), 0);
    const stitched = stitchingAssignments
      .filter((a) => a.size === size)
      .reduce((sum, a) => sum + (a.quantityCompleted || 0), 0);
    const qcPassed = qcEntries
      .filter((e) => e.size === size)
      .reduce((sum, e) => sum + (e.passedQty || 0), 0);
    const overlocked = overlockEntries
      .filter((e) => e.size === size)
      .reduce((sum, e) => sum + (e.completedQty || 0), 0);
    const packed = finishingEntries
      .filter((e) => e.size === size)
      .reduce((sum, e) => sum + (e.packedQty || 0), 0);
    const inStore = finalStore
      .filter((e) => e.size === size)
      .reduce((sum, e) => sum + (e.packedQty || 0), 0);
    return { size, cut, stitched, qcPassed, overlocked, packed, inStore };
  });

  // Determine current stage (where the article is "active")
  let currentStage = "Not Started";
  if (totalPiecesInFinalStore > 0) currentStage = "Final Store";
  else if (totalPiecesPacked > 0) currentStage = "Finishing";
  else if (overlockEntries.length > 0) currentStage = "Overlock/Button";
  else if (totalPiecesPassedQc > 0) currentStage = "Quality Check";
  else if (totalPiecesStitched > 0 || stitchingAssignments.length > 0) currentStage = "Stitching";
  else if (totalPiecesCut > 0 || cuttingAssignments.length > 0) currentStage = "Cutting";

  res.json({
    article,
    components,
    currentStage,
    summary: {
      totalPiecesCut,
      totalPiecesStitched,
      totalPiecesPassedQc,
      totalPiecesPacked,
      totalPiecesInFinalStore,
      fabricCost,
      cuttingCost,
      stitchingCost,
      overlockCost,
      finishingCost,
      totalCost,
      costPerPiece,
    },
    sizeBreakdown,
    cuttingJobs: cuttingJobs.map((j) => ({
      ...j,
      assignments: cuttingAssignments
        .filter((a) => a.jobId === j.id)
        .map((a) => ({
          ...a,
          sizes: cuttingSizes.filter((s) => s.assignmentId === a.id),
        })),
    })),
    stitchingJobs: stitchingJobs.map((j) => ({
      ...j,
      assignments: stitchingAssignments.filter((a) => a.jobId === j.id),
    })),
    qcEntries,
    overlockEntries,
    finishingEntries,
    finalStore,
  });
});

export default router;
