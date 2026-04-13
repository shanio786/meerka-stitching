import { db, articlesTable, articleComponentsTable, componentTemplatesTable, templateItemsTable, grnEntriesTable, mastersTable, sizesTable, masterAccountsTable, cuttingJobsTable, cuttingAssignmentsTable, cuttingSizeBreakdownTable, stitchingJobsTable, stitchingAssignmentsTable, qcEntriesTable, overlockButtonEntriesTable, finishingEntriesTable, finalStoreReceiptsTable, masterTransactionsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const [art1] = await db.insert(articlesTable).values({
    articleCode: "LS-3PC-001",
    articleName: "Ladies Summer 3PC",
    collectionName: "Summer Collection 2026",
    brandCustomer: "Al-Karim Textiles",
    fabricType: "Lawn",
    season: "Summer",
    category: "3PC",
    isActive: true,
  }).returning();

  const [art2] = await db.insert(articlesTable).values({
    articleCode: "GS-SK-002",
    articleName: "Gents Shalwar Kameez",
    collectionName: "Premium Collection",
    brandCustomer: null,
    fabricType: "Cotton",
    season: "All Season",
    category: "2PC",
    isActive: true,
  }).returning();

  const [art3] = await db.insert(articlesTable).values({
    articleCode: "KD-2PC-003",
    articleName: "Kids 2PC Cotton",
    collectionName: "Kids Wear 2026",
    brandCustomer: "Junior Fashion",
    fabricType: "Cotton",
    season: "Summer",
    category: "2PC",
    isActive: true,
  }).returning();

  await db.insert(articleComponentsTable).values([
    { articleId: art1.id, componentName: "Shirt", componentType: "Main", fabricType: "Lawn", requiredMeters: 2.5, unitType: "Meter", wastagePercent: 5 },
    { articleId: art1.id, componentName: "Trouser", componentType: "Main", fabricType: "Cotton", requiredMeters: 2.0, unitType: "Meter", wastagePercent: 3 },
    { articleId: art1.id, componentName: "Dupatta", componentType: "Main", fabricType: "Chiffon", requiredMeters: 2.25, unitType: "Meter", wastagePercent: 2 },
    { articleId: art1.id, componentName: "Patch", componentType: "Extra", fabricType: "Lawn", requiredMeters: 0.5, unitType: "Meter" },
  ]);

  await db.insert(articleComponentsTable).values([
    { articleId: art2.id, componentName: "Kameez", componentType: "Main", fabricType: "Cotton", requiredMeters: 3.0, unitType: "Meter", wastagePercent: 4 },
    { articleId: art2.id, componentName: "Shalwar", componentType: "Main", fabricType: "Cotton", requiredMeters: 2.5, unitType: "Meter", wastagePercent: 3 },
  ]);

  await db.insert(articleComponentsTable).values([
    { articleId: art3.id, componentName: "Shirt", componentType: "Main", fabricType: "Cotton", requiredMeters: 1.5, unitType: "Meter", wastagePercent: 5 },
    { articleId: art3.id, componentName: "Trouser", componentType: "Main", fabricType: "Cotton", requiredMeters: 1.0, unitType: "Meter", wastagePercent: 3 },
  ]);

  const [tmpl1] = await db.insert(componentTemplatesTable).values({
    templateName: "Standard 3PC (Ladies)",
    description: "Shirt + Trouser + Dupatta template for ladies suits",
  }).returning();

  await db.insert(templateItemsTable).values([
    { templateId: tmpl1.id, componentName: "Shirt", componentType: "Main", fabricType: "Lawn", requiredMeters: 2.5, unitType: "Meter", wastagePercent: 5 },
    { templateId: tmpl1.id, componentName: "Trouser", componentType: "Main", fabricType: "Cotton", requiredMeters: 2.0, unitType: "Meter", wastagePercent: 3 },
    { templateId: tmpl1.id, componentName: "Dupatta", componentType: "Main", fabricType: "Chiffon", requiredMeters: 2.25, unitType: "Meter", wastagePercent: 2 },
  ]);

  const [tmpl2] = await db.insert(componentTemplatesTable).values({
    templateName: "Standard 2PC (Gents)",
    description: "Kameez + Shalwar for gents",
  }).returning();

  await db.insert(templateItemsTable).values([
    { templateId: tmpl2.id, componentName: "Kameez", componentType: "Main", fabricType: "Cotton", requiredMeters: 3.0, unitType: "Meter", wastagePercent: 4 },
    { templateId: tmpl2.id, componentName: "Shalwar", componentType: "Main", fabricType: "Cotton", requiredMeters: 2.5, unitType: "Meter", wastagePercent: 3 },
  ]);

  await db.insert(grnEntriesTable).values([
    { grnNumber: "GRN-2026-001", date: new Date("2026-04-01"), supplierName: "Al-Karim Textiles", articleId: art1.id, totalRolls: 5, totalMeters: 300, ratePerMeter: 450, totalCost: 135000, batchNumber: "B-001", colorLot: "CL-RED-01", qualityType: "A-Grade", rackLocation: "Rack A-1" },
    { grnNumber: "GRN-2026-002", date: new Date("2026-04-05"), supplierName: "Fateh Textiles", articleId: art1.id, totalRolls: 3, totalMeters: 180, ratePerMeter: 420, totalCost: 75600, batchNumber: "B-002", colorLot: "CL-BLU-01", qualityType: "A-Grade", rackLocation: "Rack A-2" },
    { grnNumber: "GRN-2026-003", date: new Date("2026-04-08"), supplierName: "Hassan Cotton Mills", articleId: art2.id, totalRolls: 8, totalMeters: 500, ratePerMeter: 350, totalCost: 175000, batchNumber: "B-003", colorLot: "CL-WHT-01", qualityType: "A-Grade", rackLocation: "Rack B-1" },
    { grnNumber: "GRN-2026-004", date: new Date("2026-04-10"), supplierName: "Junior Fabrics", articleId: art3.id, totalRolls: 2, totalMeters: 100, ratePerMeter: 280, totalCost: 28000, batchNumber: "B-004", colorLot: "CL-PNK-01", qualityType: "B-Grade", rackLocation: "Rack C-1" },
  ]);

  await db.insert(sizesTable).values([
    { name: "XS", sortOrder: 1 },
    { name: "S", sortOrder: 2 },
    { name: "M", sortOrder: 3 },
    { name: "L", sortOrder: 4 },
    { name: "XL", sortOrder: 5 },
    { name: "XXL", sortOrder: 6 },
  ]);

  const [m1] = await db.insert(mastersTable).values({ name: "Usman Tailor", phone: "0300-1234567", masterType: "cutting", machineNo: "C-01", defaultRate: 15, address: "Faisalabad" }).returning();
  const [m2] = await db.insert(mastersTable).values({ name: "Akram Cutter", phone: "0301-2345678", masterType: "cutting", machineNo: "C-02", defaultRate: 12, address: "Faisalabad" }).returning();
  const [m3] = await db.insert(mastersTable).values({ name: "Bilal Stitch", phone: "0302-3456789", masterType: "stitching", machineNo: "S-05", defaultRate: 25, address: "Lahore" }).returning();
  const [m4] = await db.insert(mastersTable).values({ name: "Kamran Stitch", phone: "0303-4567890", masterType: "stitching", machineNo: "S-08", defaultRate: 22, address: "Lahore" }).returning();
  const [m5] = await db.insert(mastersTable).values({ name: "Aslam Overlock", phone: "0304-5678901", masterType: "overlock", machineNo: "O-01", defaultRate: 8 }).returning();
  const [m6] = await db.insert(mastersTable).values({ name: "Zahid Button", phone: "0305-6789012", masterType: "button", machineNo: "B-01", defaultRate: 5 }).returning();
  const [m7] = await db.insert(mastersTable).values({ name: "Rashid Finish", phone: "0306-7890123", masterType: "finishing", defaultRate: 10 }).returning();

  for (const m of [m1, m2, m3, m4, m5, m6, m7]) {
    await db.insert(masterAccountsTable).values({ masterId: m.id, balance: 0, totalEarned: 0, totalPaid: 0 });
  }

  const [cutJob1] = await db.insert(cuttingJobsTable).values({
    articleId: art1.id, jobDate: new Date("2026-04-03"), status: "completed", notes: "Full lot cutting",
  }).returning();

  const [ca1] = await db.insert(cuttingAssignmentsTable).values({
    jobId: cutJob1.id, masterId: m1.id, componentName: "Shirt", fabricType: "Lawn",
    fabricGivenMeters: 150, estimatedPieces: 55, ratePerPiece: 15,
    status: "completed", piecesCut: 52, wasteMeters: 5.2, fabricReturnedMeters: 10,
    totalAmount: 52 * 15, completedDate: new Date("2026-04-05"),
  }).returning();

  await db.insert(cuttingSizeBreakdownTable).values([
    { assignmentId: ca1.id, size: "S", quantity: 10, completedQty: 10 },
    { assignmentId: ca1.id, size: "M", quantity: 20, completedQty: 19 },
    { assignmentId: ca1.id, size: "L", quantity: 15, completedQty: 14 },
    { assignmentId: ca1.id, size: "XL", quantity: 10, completedQty: 9 },
  ]);

  await db.insert(masterTransactionsTable).values({
    masterId: m1.id, type: "earning", amount: 52 * 15,
    referenceType: "cutting_assignment", referenceId: ca1.id,
    description: "Cutting job - Shirt - 52 pieces",
  });
  await db.update(masterAccountsTable).set({
    balance: sql`${masterAccountsTable.balance} + ${52 * 15}`,
    totalEarned: sql`${masterAccountsTable.totalEarned} + ${52 * 15}`,
  }).where(sql`${masterAccountsTable.masterId} = ${m1.id}`);

  const [cutJob2] = await db.insert(cuttingJobsTable).values({
    articleId: art1.id, jobDate: new Date("2026-04-04"), status: "in_progress", notes: "Trouser cutting",
  }).returning();

  await db.insert(cuttingAssignmentsTable).values({
    jobId: cutJob2.id, masterId: m2.id, componentName: "Trouser", fabricType: "Cotton",
    fabricGivenMeters: 100, estimatedPieces: 50, ratePerPiece: 12,
    status: "pending",
  });

  const [sthJob1] = await db.insert(stitchingJobsTable).values({
    articleId: art1.id, cuttingJobId: cutJob1.id, supervisorName: "Hasan Supervisor",
    jobDate: new Date("2026-04-06"), status: "in_progress",
  }).returning();

  const [sa1] = await db.insert(stitchingAssignmentsTable).values({
    jobId: sthJob1.id, masterId: m3.id, componentName: "Shirt", size: "M",
    quantityGiven: 19, ratePerPiece: 25, status: "completed",
    piecesCompleted: 18, piecesWaste: 1, wasteReason: "Fabric defect",
    totalAmount: 18 * 25, completedDate: new Date("2026-04-08"),
  }).returning();

  await db.insert(masterTransactionsTable).values({
    masterId: m3.id, type: "earning", amount: 18 * 25,
    referenceType: "stitching_assignment", referenceId: sa1.id,
    description: "Stitching - Shirt M - 18 pieces",
  });
  await db.update(masterAccountsTable).set({
    balance: sql`${masterAccountsTable.balance} + ${18 * 25}`,
    totalEarned: sql`${masterAccountsTable.totalEarned} + ${18 * 25}`,
  }).where(sql`${masterAccountsTable.masterId} = ${m3.id}`);

  await db.insert(stitchingAssignmentsTable).values({
    jobId: sthJob1.id, masterId: m4.id, componentName: "Shirt", size: "L",
    quantityGiven: 14, ratePerPiece: 22, status: "pending",
  });

  await db.insert(qcEntriesTable).values([
    { articleId: art1.id, stitchingJobId: sthJob1.id, inspectorName: "Ali Inspector", masterId: m3.id, componentName: "Shirt", size: "M", receivedQty: 18, passedQty: 16, rejectedQty: 2, rejectionReason: "Uneven stitch on collar", date: new Date("2026-04-09") },
  ]);

  await db.insert(overlockButtonEntriesTable).values([
    { articleId: art1.id, taskType: "overlock", masterId: m5.id, componentName: "Shirt", size: "M", receivedQty: 16, completedQty: 16, ratePerPiece: 8, totalAmount: 128, status: "completed", date: new Date("2026-04-10"), completedDate: new Date("2026-04-10") },
    { articleId: art1.id, taskType: "button", masterId: m6.id, componentName: "Shirt", size: "M", receivedQty: 16, ratePerPiece: 5, status: "pending", date: new Date("2026-04-11") },
  ]);

  await db.insert(masterTransactionsTable).values({
    masterId: m5.id, type: "earning", amount: 128,
    referenceType: "overlock_button", referenceId: 1,
    description: "overlock - 16 pieces",
  });
  await db.update(masterAccountsTable).set({
    balance: sql`${masterAccountsTable.balance} + ${128}`,
    totalEarned: sql`${masterAccountsTable.totalEarned} + ${128}`,
  }).where(sql`${masterAccountsTable.masterId} = ${m5.id}`);

  await db.insert(finishingEntriesTable).values({
    articleId: art2.id, masterId: m7.id, workerName: "Rashid Finish",
    receivedQty: 30, ratePerPiece: 10, status: "pending",
    date: new Date("2026-04-12"),
  });

  await db.insert(finalStoreReceiptsTable).values({
    articleId: art2.id, receivedBy: "Store Manager", receivedFrom: "Finishing Dept",
    size: "M", packedQty: 20, date: new Date("2026-04-11"),
    notes: "First batch ready for dispatch",
  });

  console.log("Seed complete!");
  console.log("Created: 3 articles, 7 masters, 6 sizes, 2 cutting jobs, 1 stitching job, 1 QC entry, 2 overlock/button entries, 1 finishing entry, 1 store receipt");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
