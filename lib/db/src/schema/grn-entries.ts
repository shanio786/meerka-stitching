import { pgTable, text, serial, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { articlesTable } from "./articles";

export const grnEntriesTable = pgTable("grn_entries", {
  id: serial("id").primaryKey(),
  grnNumber: text("grn_number").notNull().unique(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  supplierName: text("supplier_name").notNull(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  totalRolls: integer("total_rolls").notNull(),
  totalMeters: doublePrecision("total_meters").notNull(),
  ratePerMeter: doublePrecision("rate_per_meter").notNull(),
  totalCost: doublePrecision("total_cost").notNull(),
  batchNumber: text("batch_number"),
  colorLot: text("color_lot"),
  qualityType: text("quality_type"),
  rackLocation: text("rack_location"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGrnEntrySchema = createInsertSchema(grnEntriesTable).omit({ id: true, createdAt: true, totalCost: true });
export type InsertGrnEntry = z.infer<typeof insertGrnEntrySchema>;
export type GrnEntry = typeof grnEntriesTable.$inferSelect;
