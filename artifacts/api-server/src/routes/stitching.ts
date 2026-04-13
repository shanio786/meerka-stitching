import { Router, type IRouter } from "express";
import { eq, and, sql, type SQL } from "drizzle-orm";
import { db, stitchingJobsTable, stitchingAssignmentsTable, mastersTable, articlesTable, masterAccountsTable, masterTransactionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stitching/jobs", async (req, res): Promise<void> => {
  const { articleId, status } = req.query;
  const conditions = [];
  if (articleId) conditions.push(eq(stitchingJobsTable.articleId, Number(articleId)));
  if (status && status !== "all") conditions.push(sql`${stitchingJobsTable.status} = ${String(status)}`);

  const jobs = await db
    .select({
      id: stitchingJobsTable.id,
      articleId: stitchingJobsTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      cuttingJobId: stitchingJobsTable.cuttingJobId,
      supervisorName: stitchingJobsTable.supervisorName,
      jobDate: stitchingJobsTable.jobDate,
      status: stitchingJobsTable.status,
      notes: stitchingJobsTable.notes,
      createdAt: stitchingJobsTable.createdAt,
    })
    .from(stitchingJobsTable)
    .leftJoin(articlesTable, eq(stitchingJobsTable.articleId, articlesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${stitchingJobsTable.jobDate} DESC`);

  res.json(jobs);
});

router.post("/stitching/jobs", async (req, res): Promise<void> => {
  const { articleId, cuttingJobId, supervisorName, jobDate, notes } = req.body;
  if (!articleId || !supervisorName || !jobDate) {
    res.status(400).json({ error: "Article, supervisor, and date are required" });
    return;
  }
  const [job] = await db.insert(stitchingJobsTable).values({
    articleId, cuttingJobId, supervisorName, jobDate: new Date(jobDate), notes,
  }).returning();
  res.status(201).json(job);
});

router.get("/stitching/jobs/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [job] = await db
    .select({
      id: stitchingJobsTable.id,
      articleId: stitchingJobsTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      cuttingJobId: stitchingJobsTable.cuttingJobId,
      supervisorName: stitchingJobsTable.supervisorName,
      jobDate: stitchingJobsTable.jobDate,
      status: stitchingJobsTable.status,
      notes: stitchingJobsTable.notes,
      createdAt: stitchingJobsTable.createdAt,
    })
    .from(stitchingJobsTable)
    .leftJoin(articlesTable, eq(stitchingJobsTable.articleId, articlesTable.id))
    .where(eq(stitchingJobsTable.id, id));

  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const assignments = await db
    .select({
      id: stitchingAssignmentsTable.id,
      masterId: stitchingAssignmentsTable.masterId,
      masterName: mastersTable.name,
      machineNo: mastersTable.machineNo,
      componentName: stitchingAssignmentsTable.componentName,
      size: stitchingAssignmentsTable.size,
      quantityGiven: stitchingAssignmentsTable.quantityGiven,
      ratePerPiece: stitchingAssignmentsTable.ratePerPiece,
      status: stitchingAssignmentsTable.status,
      notes: stitchingAssignmentsTable.notes,
      assignedDate: stitchingAssignmentsTable.assignedDate,
      completedDate: stitchingAssignmentsTable.completedDate,
      piecesCompleted: stitchingAssignmentsTable.piecesCompleted,
      piecesWaste: stitchingAssignmentsTable.piecesWaste,
      wasteReason: stitchingAssignmentsTable.wasteReason,
      totalAmount: stitchingAssignmentsTable.totalAmount,
    })
    .from(stitchingAssignmentsTable)
    .leftJoin(mastersTable, eq(stitchingAssignmentsTable.masterId, mastersTable.id))
    .where(eq(stitchingAssignmentsTable.jobId, id));

  res.json({ ...job, assignments });
});

router.patch("/stitching/jobs/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { status, notes } = req.body;
  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;
  const [job] = await db.update(stitchingJobsTable).set(updateData).where(eq(stitchingJobsTable.id, id)).returning();
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(job);
});

router.post("/stitching/assignments", async (req, res): Promise<void> => {
  const { jobId, masterId, componentName, size, quantityGiven, ratePerPiece, notes } = req.body;
  if (!jobId || !masterId || !componentName || !quantityGiven || !ratePerPiece) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [assignment] = await db.insert(stitchingAssignmentsTable).values({
    jobId, masterId, componentName, size, quantityGiven, ratePerPiece, notes,
  }).returning();

  await db.update(stitchingJobsTable).set({ status: "in_progress" }).where(eq(stitchingJobsTable.id, jobId));
  res.status(201).json(assignment);
});

router.patch("/stitching/assignments/:id/complete", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { piecesCompleted, piecesWaste, wasteReason } = req.body;

  const [existing] = await db.select().from(stitchingAssignmentsTable).where(eq(stitchingAssignmentsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Assignment not found" }); return; }
  if (existing.status === "completed") { res.status(400).json({ error: "Assignment already completed" }); return; }

  const totalAmount = (piecesCompleted || 0) * existing.ratePerPiece;

  const result = await db.transaction(async (tx) => {
    const [assignment] = await tx.update(stitchingAssignmentsTable).set({
      status: "completed", piecesCompleted, piecesWaste, wasteReason, totalAmount, completedDate: new Date(),
    }).where(eq(stitchingAssignmentsTable.id, id)).returning();

    if (totalAmount > 0) {
      await tx.insert(masterTransactionsTable).values({
        masterId: existing.masterId, type: "earning", amount: totalAmount,
        referenceType: "stitching_assignment", referenceId: id,
        description: `Stitching - ${existing.componentName} ${existing.size || ""} - ${piecesCompleted} pieces`,
      });
      await tx.update(masterAccountsTable).set({
        balance: sql`${masterAccountsTable.balance} + ${totalAmount}`,
        totalEarned: sql`${masterAccountsTable.totalEarned} + ${totalAmount}`,
      }).where(eq(masterAccountsTable.masterId, existing.masterId));
    }
    return assignment;
  });

  res.json(result);
});

router.patch("/stitching/assignments/:id/transfer", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { newMasterId, quantityToTransfer } = req.body;

  const [existing] = await db.select().from(stitchingAssignmentsTable).where(eq(stitchingAssignmentsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Assignment not found" }); return; }
  if (!quantityToTransfer || quantityToTransfer <= 0 || quantityToTransfer > existing.quantityGiven) {
    res.status(400).json({ error: "Invalid transfer quantity" }); return;
  }
  if (!newMasterId) { res.status(400).json({ error: "New master is required" }); return; }

  const result = await db.transaction(async (tx) => {
    await tx.update(stitchingAssignmentsTable).set({
      quantityGiven: existing.quantityGiven - quantityToTransfer,
    }).where(eq(stitchingAssignmentsTable.id, id));

    const [newAssignment] = await tx.insert(stitchingAssignmentsTable).values({
      jobId: existing.jobId, masterId: newMasterId, componentName: existing.componentName,
      size: existing.size, quantityGiven: quantityToTransfer, ratePerPiece: existing.ratePerPiece,
      notes: `Transferred from assignment #${id}`,
    }).returning();

    return newAssignment;
  });

  res.json(result);
});

router.delete("/stitching/assignments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [a] = await db.delete(stitchingAssignmentsTable).where(eq(stitchingAssignmentsTable.id, id)).returning();
  if (!a) { res.status(404).json({ error: "Assignment not found" }); return; }
  res.sendStatus(204);
});

export default router;
