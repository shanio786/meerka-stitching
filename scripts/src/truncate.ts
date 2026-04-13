import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function truncate() {
  console.log("Truncating all tables...");
  await db.execute(sql`TRUNCATE TABLE final_store_receipts, finishing_entries, overlock_button_entries, qc_entries, cutting_size_breakdown, cutting_assignments, cutting_jobs, stitching_assignments, stitching_jobs, master_transactions, master_payments, master_accounts, masters, sizes, images, grn_entries, template_items, component_templates, article_components, articles CASCADE`);
  console.log("All tables truncated!");
  process.exit(0);
}

truncate().catch((err) => { console.error(err); process.exit(1); });
