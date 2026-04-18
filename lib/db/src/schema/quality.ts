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
