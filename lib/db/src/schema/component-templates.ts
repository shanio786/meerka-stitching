import { pgTable, text, serial, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const componentTemplatesTable = pgTable("component_templates", {
  id: serial("id").primaryKey(),
  templateName: text("template_name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const templateItemsTable = pgTable("template_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => componentTemplatesTable.id, { onDelete: "cascade" }),
  componentName: text("component_name").notNull(),
  componentType: text("component_type").notNull().default("Main"),
  fabricType: text("fabric_type"),
  requiredMeters: doublePrecision("required_meters").notNull(),
  unitType: text("unit_type").notNull().default("Meter"),
  wastagePercent: doublePrecision("wastage_percent"),
});

export const insertComponentTemplateSchema = createInsertSchema(componentTemplatesTable).omit({ id: true, createdAt: true });
export type InsertComponentTemplate = z.infer<typeof insertComponentTemplateSchema>;
export type ComponentTemplate = typeof componentTemplatesTable.$inferSelect;

export const insertTemplateItemSchema = createInsertSchema(templateItemsTable).omit({ id: true });
export type InsertTemplateItem = z.infer<typeof insertTemplateItemSchema>;
export type TemplateItem = typeof templateItemsTable.$inferSelect;
