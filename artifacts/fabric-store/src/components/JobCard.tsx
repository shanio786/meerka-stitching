import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import QRCode from "qrcode";

export type JobCardSection = {
  heading: string;
  rows: { label: string; value: string | number }[];
};

export type JobCardTable = {
  heading: string;
  columns: string[];
  rows: (string | number)[][];
  footer?: (string | number)[];
};

export type JobCardData = {
  title: string;
  subtitle?: string;
  jobNumber?: string | number;
  date?: string;
  sections?: JobCardSection[];
  tables?: JobCardTable[];
  footerNote?: string;
  qrData?: string;
  qrLabel?: string;
};

async function buildQrDataUrl(data?: string): Promise<string | null> {
  if (!data) return null;
  try {
    return await QRCode.toDataURL(data, { margin: 1, width: 140, errorCorrectionLevel: "M" });
  } catch {
    return null;
  }
}

export async function printJobCard(data: JobCardData, opts: { autoPrint?: boolean } = { autoPrint: true }) {
  const w = window.open("", "_blank", "width=900,height=900");
  if (!w) return;
  const qrDataUrl = await buildQrDataUrl(data.qrData);
  const sectionsHtml = (data.sections || [])
    .map(
      (s) => `
      <div class="section">
        <h3>${escapeHtml(s.heading)}</h3>
        <table class="kv">
          ${s.rows.map((r) => `<tr><td class="lbl">${escapeHtml(r.label)}</td><td>${escapeHtml(String(r.value))}</td></tr>`).join("")}
        </table>
      </div>`,
    )
    .join("");
  const tablesHtml = (data.tables || [])
    .map(
      (t) => `
      <div class="section">
        <h3>${escapeHtml(t.heading)}</h3>
        <table class="data">
          <thead><tr>${t.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
          <tbody>
            ${t.rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${t.columns.length}" class="empty">No data</td></tr>`}
          </tbody>
          ${t.footer ? `<tfoot><tr>${t.footer.map((c) => `<td><b>${escapeHtml(String(c))}</b></td>`).join("")}</tr></tfoot>` : ""}
        </table>
      </div>`,
    )
    .join("");
  w.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(data.title)}</title>
    <style>
      *{box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}
      body{margin:0;padding:24px;color:#111;background:#fff;font-size:12px}
      .header{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start}
      .header h1{margin:0;font-size:20px;letter-spacing:0.5px}
      .header h2{margin:4px 0 0;font-size:13px;color:#444;font-weight:500}
      .qr{margin-left:16px;text-align:center}
      .qr img{display:block;width:90px;height:90px}
      .qrlbl{font-size:9px;color:#666;margin-top:2px}
      .meta{text-align:right;font-size:11px;color:#444}
      .meta div{margin:2px 0}
      .meta .num{font-size:14px;color:#111;font-weight:700}
      .section{margin-bottom:18px;page-break-inside:avoid}
      .section h3{font-size:13px;margin:0 0 6px;background:#111;color:#fff;padding:6px 10px;letter-spacing:0.4px}
      table{width:100%;border-collapse:collapse}
      table.kv td{border:1px solid #ddd;padding:6px 10px;vertical-align:top}
      table.kv td.lbl{background:#f6f6f6;font-weight:600;width:38%}
      table.data th, table.data td{border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:11px}
      table.data th{background:#eee;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:0.4px}
      table.data tfoot td{background:#f6f6f6}
      .empty{text-align:center;color:#888;font-style:italic}
      .footer{margin-top:24px;padding-top:12px;border-top:1px solid #ccc;font-size:10px;color:#666;display:flex;justify-content:space-between}
      .signs{margin-top:48px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;text-align:center;font-size:11px}
      .signs div{padding-top:8px;border-top:1px solid #444}
      @media print { body{padding:12px} .no-print{display:none} }
    </style></head><body>
    <div class="header">
      <div>
        <h1>${escapeHtml(data.title)}</h1>
        ${data.subtitle ? `<h2>${escapeHtml(data.subtitle)}</h2>` : ""}
      </div>
      <div class="meta">
        ${data.jobNumber !== undefined ? `<div class="num">Job # ${escapeHtml(String(data.jobNumber))}</div>` : ""}
        ${data.date ? `<div>Date: ${escapeHtml(data.date)}</div>` : ""}
        <div>Printed: ${new Date().toLocaleString()}</div>
      </div>
      ${qrDataUrl ? `<div class="qr"><img src="${qrDataUrl}" alt="QR" /><div class="qrlbl">${escapeHtml(data.qrLabel || "Scan to track")}</div></div>` : ""}
    </div>
    ${sectionsHtml}
    ${tablesHtml}
    <div class="signs">
      <div>Prepared By</div>
      <div>Checked By</div>
      <div>Authorised By</div>
    </div>
    <div class="footer">
      <div>${escapeHtml(data.footerNote || "")}</div>
      <div>Devoria Tech &middot; +92 311 7597815</div>
    </div>
    <script>setTimeout(function(){window.print()},150);</script>
    </body></html>`);
  w.document.close();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function PrintJobCardButton({ data, label = "Print Job Card" }: { data: JobCardData; label?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => { void printJobCard(data); }}>
      <Printer className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
