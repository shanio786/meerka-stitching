import { pgTable, text, serial, timestamp, boolean, doublePrecision, pgEnum } from "drizzle-orm/pg-core";

export const masterTypeEnum = pgEnum("master_type", [
  "cutting",
  "stitching",
  "overlock",
  "button",
  "finishing",
]);

export const mastersTable = pgTable("masters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  masterType: masterTypeEnum("master_type").notNull(),
  machineNo: text("machine_no"),
  defaultRate: doublePrecision("default_rate"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
