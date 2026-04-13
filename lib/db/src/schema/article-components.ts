import { pgTable, text, serial, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { articlesTable } from "./articles";

export const articleComponentsTable = pgTable("article_components", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  componentName: text("component_name").notNull(),
  componentType: text("component_type").notNull().default("Main"),
  fabricType: text("fabric_type"),
  color: text("color"),
  designPrint: text("design_print"),
  requiredMeters: doublePrecision("required_meters").notNull(),
  unitType: text("unit_type").notNull().default("Meter"),
  wastagePercent: doublePrecision("wastage_percent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertArticleComponentSchema = createInsertSchema(articleComponentsTable).omit({ id: true, createdAt: true });
export type InsertArticleComponent = z.infer<typeof insertArticleComponentSchema>;
export type ArticleComponent = typeof articleComponentsTable.$inferSelect;
