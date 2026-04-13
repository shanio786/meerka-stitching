import { db, articlesTable, articleComponentsTable, componentTemplatesTable, templateItemsTable, grnEntriesTable } from "@workspace/db";

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
    {
      grnNumber: "GRN-2026-001",
      date: new Date("2026-04-01"),
      supplierName: "Al-Karim Textiles",
      articleId: art1.id,
      totalRolls: 5,
      totalMeters: 300,
      ratePerMeter: 450,
      totalCost: 300 * 450,
      batchNumber: "B-001",
      colorLot: "CL-RED-01",
      qualityType: "A-Grade",
      rackLocation: "Rack A-1",
    },
    {
      grnNumber: "GRN-2026-002",
      date: new Date("2026-04-05"),
      supplierName: "Fateh Textiles",
      articleId: art1.id,
      totalRolls: 3,
      totalMeters: 180,
      ratePerMeter: 420,
      totalCost: 180 * 420,
      batchNumber: "B-002",
      colorLot: "CL-BLU-01",
      qualityType: "A-Grade",
      rackLocation: "Rack A-2",
    },
    {
      grnNumber: "GRN-2026-003",
      date: new Date("2026-04-08"),
      supplierName: "Hassan Cotton Mills",
      articleId: art2.id,
      totalRolls: 8,
      totalMeters: 500,
      ratePerMeter: 350,
      totalCost: 500 * 350,
      batchNumber: "B-003",
      colorLot: "CL-WHT-01",
      qualityType: "A-Grade",
      rackLocation: "Rack B-1",
    },
    {
      grnNumber: "GRN-2026-004",
      date: new Date("2026-04-10"),
      supplierName: "Junior Fabrics",
      articleId: art3.id,
      totalRolls: 2,
      totalMeters: 100,
      ratePerMeter: 280,
      totalCost: 100 * 280,
      batchNumber: "B-004",
      colorLot: "CL-PNK-01",
      qualityType: "B-Grade",
      rackLocation: "Rack C-1",
    },
  ]);

  console.log("Seed complete!");
  console.log(`Created: 3 articles, components, 2 templates, 4 GRN entries`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
