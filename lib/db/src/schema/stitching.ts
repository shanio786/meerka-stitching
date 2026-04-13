import { pgTable, text, serial, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { articlesTable } from "./articles";
import { mastersTable } from "./masters";
import { cuttingJobsTable } from "./cutting";
import { jobStatusEnum } from "./cutting";

export const stitchingJobsTable = pgTable("stitching_jobs", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  cuttingJobId: integer("cutting_job_id").references(() => cuttingJobsTable.id),
  supervisorName: text("supervisor_name").notNull(),
  jobDate: timestamp("job_date", { withTimezone: true }).notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const stitchingAssignmentsTable = pgTable("stitching_assignments", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => stitchingJobsTable.id, { onDelete: "cascade" }),
  masterId: integer("master_id").notNull().references(() => mastersTable.id),
  componentName: text("component_name").notNull(),
  size: text("size"),
  quantityGiven: integer("quantity_given").notNull(),
  ratePerPiece: doublePrecision("rate_per_piece").notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  assignedDate: timestamp("assigned_date", { withTimezone: true }).notNull().defaultNow(),
  completedDate: timestamp("completed_date", { withTimezone: true }),
  piecesCompleted: integer("pieces_completed"),
  piecesWaste: integer("pieces_waste"),
  wasteReason: text("waste_reason"),
  totalAmount: doublePrecision("total_amount"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
