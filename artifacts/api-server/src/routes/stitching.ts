import { Router, type IRouter } from "express";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db, stitchingJobsTable, stitchingAssignmentsTable, mastersTable, articlesTable, masterAccountsTable, masterTransactionsTable, cuttingAssignmentsTable, cuttingJobsTable, cuttingSizeBreakdownTable } from "@workspace/db";

const router: IRouter = Router();

// Pending-from-cutting: cutting assignments completed + handed-over to next stage
// where pieces remain after subtracting what stitching has already consumed.
router.get("/stitching/pending-from-cutting", async (req, res): Promise<void> => {
  const { articleId } = req.query;
  const conditions = [
    eq(cuttingAssignmentsTable.status, "completed"),
    eq(cuttingAssignmentsTable.handoverStatus, "received_by_next"),
    sql`COALESCE(${cuttingAssignmentsTable.piecesCut}, 0) - COALESCE(${cuttingAssignmentsTable.piecesConsumed}, 0) > 0`,
  ];
  if (articleId) conditions.push(eq(cuttingJobsTable.articleId, Number(articleId)));

  const rows = await db
    .select({
      cuttingAssignmentId: cuttingAssignmentsTable.id,
      cuttingJobId: cuttingAssignmentsTable.jobId,
      articleId: cuttingJobsTable.articleId,
      articleCode: articlesTable.articleCode,
      articleName: articlesTable.articleName,
      componentName: cuttingAssignmentsTable.componentName,
      cutterMasterId: cuttingAssignmentsTable.masterId,
      cutterMasterName: mastersTable.name,
      piecesCut: cuttingAssignmentsTable.piecesCut,
      piecesConsumed: cuttingAssignmentsTable.piecesConsumed,
      receivedBy: cuttingAssignmentsTable.receivedBy,
      handoverDate: cuttingAssignmentsTable.handoverDate,
    })
    .from(cuttingAssignmentsTable)
    .innerJoin(cuttingJobsTable, eq(cuttingJobsTable.id, cuttingAssignmentsTable.jobId))
    .leftJoin(articlesTable, eq(articlesTable.id, cuttingJobsTable.articleId))
    .leftJoin(mastersTable, eq(mastersTable.id, cuttingAssignmentsTable.masterId))
    .where(and(...conditions))
    .orderBy(sql`${cuttingAssignmentsTable.handoverDate} DESC`);

  // Fetch size breakdown for each cutting assignment
  const assignmentIds = rows.map((r) => r.cuttingAssignmentId);
  const sizeRows = assignmentIds.length > 0
    ? await db.select().from(cuttingSizeBreakdownTable).where(inArray(cuttingSizeBreakdownTable.assignmentId, assignmentIds))
    : [];

  // Per-size: how much already consumed by stitching
  const consumedBySize = assignmentIds.length > 0
    ? await db
        .select({
          cuttingAssignmentId: stitchingAssignmentsTable.cuttingAssignmentId,
          size: stitchingAssignmentsTable.size,
          consumed: sql<number>`COALESCE(SUM(${stitchingAssignmentsTable.quantityGiven}), 0)`.as("consumed"),
        })
        .from(stitchingAssignmentsTable)
        .where(inArray(stitchingAssignmentsTable.cuttingAssignmentId, assignmentIds))
        .groupBy(stitchingAssignmentsTable.cuttingAssignmentId, stitchingAssignmentsTable.size)
    : [];

  res.json(rows.map((r) => {
    const sizes = sizeRows
      .filter((s) => s.assignmentId === r.cuttingAssignmentId)
      .map((s) => {
        const cutQty = (s.completedQty && s.completedQty > 0) ? s.completedQty : s.quantity;
        const usedRow = consumedBySize.find((c) => c.cuttingAssignmentId === r.cuttingAssignmentId && c.size === s.size);
        const used = Number(usedRow?.consumed ?? 0);
        return { size: s.size, cut: cutQty, available: Math.max(0, cutQty - used) };
      })
      .filter((s) => s.available > 0);
    return { ...r, available: (r.piecesCut || 0) - (r.piecesConsumed || 0), sizes };
  }));
});

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
  const { jobId, masterId, items, notes, ratePerSuit } = req.body;

  // Batch mode: items[] with cuttingAssignmentId per row, optional ratePerSuit
  if (Array.isArray(items) && items.length > 0) {
    if (!jobId || !masterId) { res.status(400).json({ error: "Job and master are required" }); return; }

    // Light pre-validation (atomic guarded update below is the source of truth)
    for (const it of items) {
      if (!it.componentName || !it.quantityGiven || it.quantityGiven <= 0) {
        res.status(400).json({ error: `Invalid quantity for ${it.componentName || "row"}` });
        return;
      }
    }

    const result = await db.transaction(async (tx) => {
      const created = [];
      let suitRateApplied = false;
      const componentNames = items.map((i: { componentName: string }) => i.componentName).join(", ");

      for (const it of items) {
        const qty = Number(it.quantityGiven);

        // Atomic, race-safe consumption: only succeeds if pieces still available
        // AND source is completed + handed over to next stage.
        if (it.cuttingAssignmentId) {
          const updated = await tx.update(cuttingAssignmentsTable).set({
            piecesConsumed: sql`${cuttingAssignmentsTable.piecesConsumed} + ${qty}`,
          }).where(and(
            eq(cuttingAssignmentsTable.id, it.cuttingAssignmentId),
            eq(cuttingAssignmentsTable.status, "completed"),
            eq(cuttingAssignmentsTable.handoverStatus, "received_by_next"),
            sql`COALESCE(${cuttingAssignmentsTable.piecesCut}, 0) - COALESCE(${cuttingAssignmentsTable.piecesConsumed}, 0) >= ${qty}`,
          )).returning({ id: cuttingAssignmentsTable.id });

          if (updated.length === 0) {
            throw new Error(`Cannot consume ${qty} pcs of "${it.componentName}" — source not available or not handed over (try refresh).`);
          }
        }

        const useSuitRate = ratePerSuit && !suitRateApplied;
        const [a] = await tx.insert(stitchingAssignmentsTable).values({
          jobId, masterId,
          cuttingAssignmentId: it.cuttingAssignmentId || null,
          componentName: it.componentName,
          size: it.size || null,
          quantityGiven: qty,
          ratePerPiece: ratePerSuit ? null : (it.ratePerPiece ? Number(it.ratePerPiece) : null),
          ratePerSuit: useSuitRate ? Number(ratePerSuit) : null,
          notes: useSuitRate
            ? `${notes || ""}${notes ? " | " : ""}Suit rate covers: ${componentNames}`
            : (ratePerSuit ? `Bundled with suit rate (paid via ${items[0].componentName})` : notes),
        }).returning();
        if (useSuitRate) suitRateApplied = true;
        created.push(a);
      }

      // Backfill cuttingJobId on stitching job from any source
      const sourceCuttingJobIds = items
        .filter((i: { cuttingAssignmentId?: number }) => i.cuttingAssignmentId)
        .map((i: { cuttingAssignmentId: number }) => i.cuttingAssignmentId);
      if (sourceCuttingJobIds.length > 0) {
        const sources = await tx.select({ jobId: cuttingAssignmentsTable.jobId })
          .from(cuttingAssignmentsTable)
          .where(sql`${cuttingAssignmentsTable.id} IN (${sql.join(sourceCuttingJobIds.map((id: number) => sql`${id}`), sql`, `)})`);
        if (sources.length > 0) {
          const [job] = await tx.select().from(stitchingJobsTable).where(eq(stitchingJobsTable.id, jobId));
          if (job && !job.cuttingJobId) {
            await tx.update(stitchingJobsTable).set({ cuttingJobId: sources[0].jobId }).where(eq(stitchingJobsTable.id, jobId));
          }
        }
      }

      await tx.update(stitchingJobsTable).set({ status: "in_progress" }).where(eq(stitchingJobsTable.id, jobId));
      return created;
    });

    res.status(201).json(result);
    return;
  }

  // Legacy single-row mode (backwards compatible)
  const { componentName, size, quantityGiven, ratePerPiece } = req.body;
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

  const rate = existing.ratePerPiece || existing.ratePerSuit || 0;
  const totalAmount = (piecesCompleted || 0) * rate;

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
