import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { articlesTable } from "./articles";
import { mastersTable } from "./masters";
import { stitchingJobsTable } from "./stitching";

export const qcEntriesTable = pgTable("qc_entries", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  stitchingJobId: integer("stitching_job_id").references(() => stitchingJobsTable.id),
  inspectorName: text("inspector_name").notNull(),
  masterId: integer("master_id").references(() => mastersTable.id),
  componentName: text("component_name"),
  size: text("size"),
  receivedFrom: text("received_from"),
  receivedQty: integer("received_qty").notNull(),
  passedQty: integer("passed_qty").notNull().default(0),
  rejectedQty: integer("rejected_qty").notNull().default(0),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const qcReworksTable = pgTable("qc_reworks", {
  id: serial("id").primaryKey(),
  qcEntryId: integer("qc_entry_id").notNull().references(() => qcEntriesTable.id, { onDelete: "cascade" }),
  targetStage: text("target_stage").notNull(),
  targetMasterId: integer("target_master_id").references(() => mastersTable.id),
  qty: integer("qty").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
