import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle, Trash2, ArrowLeft, AlertTriangle, Send, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { format } from "date-fns";
import { Link } from "wouter";
import { SearchableSelect } from "@/components/SearchableSelect";

interface SizeRow { size: string; quantity: string; }

interface Assignment {
  id: number;
  masterName: string;
  componentName: string;
  fabricType: string;
  fabricGivenMeters: number;
  fabricPerPiece: number | null;
  estimatedPieces: number | null;
  ratePerPiece: number | null;
  ratePerSuit: number | null;
  piecesCut: number | null;
  wasteMeters: number | null;
  fabricReturnedMeters: number | null;
  totalAmount: number | null;
  status: string;
  notes: string | null;
  handoverStatus: "with_cutter" | "returned_to_store" | "received_by_next";
  receivedBy: string | null;
  handoverDate: string | null;
  sizes: { size: string; quantity: number; completedQty: number | null }[];
}

interface CuttingJob {
  id: number;
  articleId: number;
  articleName: string;
  articleCode: string;
  jobDate: string;
  demandPieces: number | null;
  status: string;
  notes: string | null;
  assignments: Assignment[];
}

interface Master { id: number; name: string; machineNo: string | null; }

interface ComponentStock {
  componentName: string;
  fabricName: string;
  totalReceived: number;
  totalGiven: number;
  available: number;
}

interface ComponentRow {
  selected: boolean;
  componentName: string;
  fabricName: string;
  available: number;
  fabricGiven: string;
  fabricPerPiece: string;
  ratePerPiece: string;
}

const HANDOVER_LABEL: Record<string, string> = {
  with_cutter: "With Cutter",
  returned_to_store: "Returned to Store",
  received_by_next: "Received by Next",
};
const HANDOVER_VARIANT: Record<string, "secondary" | "default" | "outline"> = {
  with_cutter: "secondary", returned_to_store: "outline", received_by_next: "default",
};

export default function CuttingDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<CuttingJob | null>(null);
  const [masters, setMasters] = useState<Master[]>([]);
  const [stock, setStock] = useState<ComponentStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState<number | null>(null);
  const [handoverDialog, setHandoverDialog] = useState<number | null>(null);
  const [bulkHandoverDialog, setBulkHandoverDialog] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Record<number, boolean>>({});
  const [bulkHandover, setBulkHandover] = useState<{ status: "with_cutter" | "returned_to_store" | "received_by_next"; receivedBy: string }>({ status: "received_by_next", receivedBy: "" });
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const { toast } = useToast();

  const [masterId, setMasterId] = useState("");
  const [rateMode, setRateMode] = useState<"per_component" | "per_suit">("per_component");
  const [ratePerSuit, setRatePerSuit] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [rows, setRows] = useState<ComponentRow[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([{ size: "M", quantity: "" }]);

  const [completeForm, setCompleteForm] = useState<{ piecesCut: string; wasteMeters: string; fabricReturnedMeters: string; sizeResults: { size: string; completedQty: string }[] }>({ piecesCut: "", wasteMeters: "", fabricReturnedMeters: "", sizeResults: [] });
  const [handoverForm, setHandoverForm] = useState<{ status: "with_cutter" | "returned_to_store" | "received_by_next"; receivedBy: string }>({ status: "received_by_next", receivedBy: "" });

  const fetchJob = async () => {
    setLoading(true);
    try { setJob(await apiGet<CuttingJob>(`/cutting/jobs/${id}`)); }
    catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" }); }
    setLoading(false);
  };
  const fetchMasters = async () => { try { setMasters(await apiGet<Master[]>("/masters?type=cutting&active=true")); } catch {} };
  const fetchStock = async (articleId: number) => {
    try { setStock(await apiGet<ComponentStock[]>(`/articles/${articleId}/cutting-stock`)); } catch {}
  };

  useEffect(() => { fetchJob(); fetchMasters(); }, [id]);
  useEffect(() => { if (job?.articleId) fetchStock(job.articleId); }, [job?.articleId, job?.assignments?.length]);

  const openAssign = () => {
    setRows(stock.map((s) => ({
      selected: false,
      componentName: s.componentName,
      fabricName: s.fabricName,
      available: s.available,
      fabricGiven: "",
      fabricPerPiece: "",
      ratePerPiece: "",
    })));
    setMasterId("");
    setRateMode("per_component");
    setRatePerSuit("");
    setAssignNotes("");
    setSizes([{ size: "M", quantity: "" }]);
    setAssignDialog(true);
  };

  const updateRow = (i: number, patch: Partial<ComponentRow>) => {
    setRows((rs) => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  const calcEstimated = (r: ComponentRow): number | null => {
    const g = parseFloat(r.fabricGiven), p = parseFloat(r.fabricPerPiece);
    if (g > 0 && p > 0) return Math.floor(g / p);
    return null;
  };

  const validateRow = (r: ComponentRow): string | null => {
    const g = parseFloat(r.fabricGiven);
    if (!r.fabricGiven) return null;
    if (isNaN(g) || g <= 0) return "Invalid fabric amount";
    if (g > r.available + 0.001) return `Only ${r.available.toFixed(2)}m available`;
    return null;
  };

  const warnRow = (r: ComponentRow): string | null => {
    if (!r.fabricGiven) return null;
    const est = calcEstimated(r);
    if (job?.demandPieces && est !== null && est < job.demandPieces) {
      return `Only ${est} pcs possible — demand is ${job.demandPieces}. OK if splitting across masters.`;
    }
    return null;
  };

  const handleAssign = async () => {
    if (!masterId) { toast({ title: "Select a master", variant: "destructive" }); return; }
    const selectedRows = rows.filter((r) => r.selected);
    if (selectedRows.length === 0) { toast({ title: "Select at least one component", variant: "destructive" }); return; }

    for (const r of selectedRows) {
      if (!r.fabricGiven) { toast({ title: `Enter fabric for ${r.componentName}`, variant: "destructive" }); return; }
      const err = validateRow(r);
      if (err) { toast({ title: `${r.componentName}: ${err}`, variant: "destructive" }); return; }
    }
    if (rateMode === "per_suit" && !ratePerSuit) { toast({ title: "Enter rate per suit", variant: "destructive" }); return; }

    const sizeTotal = sizes.reduce((s, x) => s + (parseInt(x.quantity) || 0), 0);
    if (sizeTotal > 0) {
      const estimates = selectedRows.map((r) => calcEstimated(r)).filter((x): x is number => x !== null);
      if (estimates.length > 0) {
        const minEst = Math.min(...estimates);
        if (sizeTotal > minEst) {
          toast({ title: `Size total ${sizeTotal} exceeds estimated ${minEst} pieces`, description: "Reduce size quantities or adjust fabric per piece.", variant: "destructive" });
          return;
        }
      }
      const sizeKeys = sizes.filter((s) => parseInt(s.quantity) > 0).map((s) => s.size);
      const dupes = sizeKeys.filter((s, i) => sizeKeys.indexOf(s) !== i);
      if (dupes.length > 0) { toast({ title: `Duplicate size: ${dupes[0]}`, variant: "destructive" }); return; }
    }

    try {
      const items = selectedRows.map((r) => ({
        componentName: r.componentName,
        fabricType: r.fabricName,
        fabricGivenMeters: parseFloat(r.fabricGiven),
        fabricPerPiece: r.fabricPerPiece ? parseFloat(r.fabricPerPiece) : null,
        estimatedPieces: calcEstimated(r),
        ratePerPiece: rateMode === "per_component" && r.ratePerPiece ? parseFloat(r.ratePerPiece) : null,
      }));
      const sizeList = sizes.filter((s) => s.quantity).map((s) => ({ size: s.size, quantity: parseInt(s.quantity) }));
      await apiPost("/cutting/assignments", {
        jobId: parseInt(id!), masterId: parseInt(masterId), items,
        ratePerSuit: rateMode === "per_suit" ? parseFloat(ratePerSuit) : null,
        notes: assignNotes, sizes: sizeList,
      } as Record<string, unknown>);
      toast({ title: `${selectedRows.length} component(s) assigned` });
      setAssignDialog(false);
      fetchJob();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const openComplete = (a: CuttingJob["assignments"][number]) => {
    const initialSizes = (a.sizes || []).map((s) => ({ size: s.size, completedQty: String(s.quantity) }));
    const totalFromSizes = initialSizes.reduce((sum, s) => sum + (parseInt(s.completedQty) || 0), 0);
    setCompleteForm({
      piecesCut: totalFromSizes > 0 ? String(totalFromSizes) : String(a.estimatedPieces ?? ""),
      wasteMeters: "",
      fabricReturnedMeters: "",
      sizeResults: initialSizes,
    });
    setCompleteDialog(a.id);
  };

  const handleComplete = async (assignmentId: number) => {
    try {
      const validSizes = completeForm.sizeResults.filter((s) => parseInt(s.completedQty) > 0);
      const sizeTotal = validSizes.reduce((sum, s) => sum + parseInt(s.completedQty), 0);
      const piecesCut = parseInt(completeForm.piecesCut);
      if (validSizes.length > 0 && sizeTotal !== piecesCut) {
        toast({ title: `Size total (${sizeTotal}) ≠ Pieces Cut (${piecesCut})`, variant: "destructive" });
        return;
      }
      await apiPatch(`/cutting/assignments/${assignmentId}/complete`, {
        piecesCut,
        wasteMeters: completeForm.wasteMeters ? parseFloat(completeForm.wasteMeters) : 0,
        fabricReturnedMeters: completeForm.fabricReturnedMeters ? parseFloat(completeForm.fabricReturnedMeters) : 0,
        sizeResults: validSizes.map((s) => ({ size: s.size, completedQty: parseInt(s.completedQty) })),
      });
      toast({ title: "Completed, master credited" });
      setCompleteDialog(null);
      setCompleteForm({ piecesCut: "", wasteMeters: "", fabricReturnedMeters: "", sizeResults: [] });
      fetchJob();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleHandover = async (assignmentId: number) => {
    try {
      await apiPatch(`/cutting/assignments/${assignmentId}/handover`, {
        handoverStatus: handoverForm.status,
        receivedBy: handoverForm.status === "received_by_next" ? handoverForm.receivedBy : null,
      });
      toast({ title: "Handover updated" });
      setHandoverDialog(null);
      fetchJob();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const [bulkCompleteSubmitting, setBulkCompleteSubmitting] = useState<string | null>(null);
  const handleQuickCompleteAll = async (masterName: string, items: typeof job.assignments) => {
    const pending = items.filter((a) => a.status !== "completed");
    if (pending.length === 0) { toast({ title: "Nothing to complete" }); return; }
    if (!confirm(`Mark ${pending.length} component(s) for ${masterName} as complete?\n\nWill use estimated/size pieces, no waste, no fabric returned.\nAdjust individually later if needed.`)) return;
    setBulkCompleteSubmitting(masterName);
    let ok = 0, fail = 0;
    for (const a of pending) {
      try {
        const sizeResults = (a.sizes && a.sizes.length > 0)
          ? a.sizes.map((s) => ({ size: s.size, completedQty: s.quantity }))
          : [];
        const piecesCut = sizeResults.length > 0
          ? sizeResults.reduce((s, x) => s + x.completedQty, 0)
          : (a.estimatedPieces || 0);
        if (piecesCut <= 0) { fail++; continue; }
        await apiPatch(`/cutting/assignments/${a.id}/complete`, {
          piecesCut,
          wasteMeters: 0,
          fabricReturnedMeters: 0,
          sizeResults,
        });
        ok++;
      } catch { fail++; }
    }
    setBulkCompleteSubmitting(null);
    toast({ title: `${ok} completed${fail > 0 ? `, ${fail} skipped` : ""}` });
    fetchJob();
  };

  const openBulkHandover = () => {
    if (!job) return;
    const sel: Record<number, boolean> = {};
    for (const a of job.assignments) {
      if (a.status === "completed" && a.handoverStatus !== "received_by_next") sel[a.id] = true;
    }
    setBulkSelected(sel);
    setBulkHandover({ status: "received_by_next", receivedBy: "" });
    setBulkHandoverDialog(true);
  };

  const handleBulkHandover = async () => {
    const ids = Object.entries(bulkSelected).filter(([, v]) => v).map(([k]) => Number(k));
    if (ids.length === 0) { toast({ title: "Select at least one component", variant: "destructive" }); return; }
    if (bulkHandover.status === "received_by_next" && !bulkHandover.receivedBy.trim()) {
      toast({ title: "Enter receiver name", variant: "destructive" }); return;
    }
    setBulkSubmitting(true);
    let ok = 0, fail = 0;
    for (const id of ids) {
      try {
        await apiPatch(`/cutting/assignments/${id}/handover`, {
          handoverStatus: bulkHandover.status,
          receivedBy: bulkHandover.status === "received_by_next" ? bulkHandover.receivedBy : null,
        });
        ok++;
      } catch { fail++; }
    }
    setBulkSubmitting(false);
    setBulkHandoverDialog(false);
    toast({ title: `Handover updated: ${ok} done${fail ? `, ${fail} failed` : ""}` });
    fetchJob();
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm("Delete this assignment?")) return;
    try { await apiDelete(`/cutting/assignments/${assignmentId}`); fetchJob(); }
    catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" }); }
  };

  const handleUpdateStatus = async (status: string) => {
    try { await apiPatch(`/cutting/jobs/${id}`, { status }); fetchJob(); } catch {}
  };

  const addSizeRow = () => setSizes([...sizes, { size: "M", quantity: "" }]);
  const removeSizeRow = (idx: number) => setSizes(sizes.filter((_, i) => i !== idx));

  const handlePrintJobCard = () => {
    if (!job) return;
    const totalFabric = job.assignments.reduce((s, a) => s + a.fabricGivenMeters, 0);
    const totalEst = job.assignments.reduce((s, a) => s + (a.estimatedPieces || 0), 0);
    const totalCut2 = job.assignments.reduce((s, a) => s + (a.piecesCut || 0), 0);
    const totalAmt = job.assignments.reduce((s, a) => s + (a.totalAmount || 0), 0);
    const masterGroups: Record<string, Assignment[]> = {};
    for (const a of job.assignments) {
      if (!masterGroups[a.masterName]) masterGroups[a.masterName] = [];
      masterGroups[a.masterName].push(a);
    }
    const componentSizes: Record<string, Record<string, number>> = {};
    for (const a of job.assignments) {
      if (!componentSizes[a.componentName]) componentSizes[a.componentName] = {};
      for (const s of a.sizes || []) {
        componentSizes[a.componentName][s.size] = (componentSizes[a.componentName][s.size] || 0) + s.quantity;
      }
    }
    const allSizesSet = new Set<string>();
    Object.values(componentSizes).forEach((cs) => Object.keys(cs).forEach((sz) => allSizesSet.add(sz)));
    const componentNames = Object.keys(componentSizes);
    const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
    const allSizes = Array.from(allSizesSet).sort((a, b) => {
      const ai = sizeOrder.indexOf(a); const bi = sizeOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });
    const suitsPerSize: Record<string, number> = {};
    const piecesPerSize: Record<string, number> = {};
    for (const size of allSizes) {
      suitsPerSize[size] = componentNames.length > 0
        ? Math.min(...componentNames.map((c) => componentSizes[c][size] || 0))
        : 0;
      piecesPerSize[size] = componentNames.reduce((s, c) => s + (componentSizes[c][size] || 0), 0);
    }
    const hasMultipleComponents = componentNames.length > 1;
    const html = `<!DOCTYPE html><html><head><title>Cutting Job Card CUT-${String(job.id).padStart(4, "0")}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111; font-size: 12px; }
  .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { margin: 0; font-size: 22px; letter-spacing: 1px; }
  .header .sub { font-size: 11px; color: #555; margin-top: 4px; }
  .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; padding: 10px; background: #f5f5f5; border: 1px solid #ddd; }
  .meta div { font-size: 12px; }
  .meta strong { display: block; font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
  h2 { font-size: 14px; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #999; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; font-size: 11px; }
  th { background: #eee; font-weight: bold; }
  .right { text-align: right; }
  .center { text-align: center; }
  .totals-row { background: #f0f0f0; font-weight: bold; }
  .signatures { margin-top: 32px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .sig-box { border-top: 1px solid #000; padding-top: 4px; text-align: center; font-size: 11px; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #ccc; text-align: center; font-size: 10px; color: #666; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; background: #ddd; }
  @media print { body { padding: 12px; } .no-print { display: none !important; } }
</style></head><body>
<div class="header">
  <h1>CUTTING JOB CARD</h1>
  <div class="sub">Stitching ERP — Production Slip</div>
</div>
<div class="meta">
  <div><strong>Job No.</strong>CUT-${String(job.id).padStart(4, "0")}</div>
  <div><strong>Date</strong>${format(new Date(job.jobDate), "dd MMM yyyy")}</div>
  <div><strong>Status</strong><span class="badge">${job.status.replace("_", " ").toUpperCase()}</span></div>
  <div><strong>Article Code</strong>${job.articleCode}</div>
  <div><strong>Article Name</strong>${job.articleName}</div>
  <div><strong>Demand</strong>${job.demandPieces || "-"} ${job.demandPieces ? "pcs/suits" : ""}</div>
</div>
${job.notes ? `<div style="margin-bottom:12px;padding:8px;background:#fffbe5;border:1px solid #f0e3a0;font-size:11px"><strong>Notes:</strong> ${job.notes}</div>` : ""}

<h2>Master Assignments &amp; Cutting Details</h2>
<table>
  <thead><tr>
    <th>Master</th><th>Component</th><th>Fabric</th>
    <th class="right">Given (m)</th><th class="right">Per Pc</th><th class="right">Est.</th>
    <th class="right">Rate</th><th class="right">Cut</th><th class="right">Waste</th>
    <th class="right">Returned</th><th class="right">Amount</th><th>Handover</th>
  </tr></thead>
  <tbody>
    ${job.assignments.map((a) => `<tr>
      <td>${a.masterName}</td>
      <td>${a.componentName}</td>
      <td>${a.fabricType || "-"}</td>
      <td class="right">${a.fabricGivenMeters}</td>
      <td class="right">${a.fabricPerPiece || "-"}</td>
      <td class="right">${a.estimatedPieces || "-"}</td>
      <td class="right">${a.ratePerPiece ? `Rs.${a.ratePerPiece}/pc` : a.ratePerSuit ? `Rs.${a.ratePerSuit}/suit` : "bundled"}</td>
      <td class="right">${a.piecesCut || "-"}</td>
      <td class="right">${a.wasteMeters || "-"}</td>
      <td class="right">${a.fabricReturnedMeters || "-"}</td>
      <td class="right">${a.totalAmount ? `Rs.${a.totalAmount.toLocaleString()}` : "-"}</td>
      <td>${a.status === "completed" ? `${HANDOVER_LABEL[a.handoverStatus]}${a.receivedBy ? ` → ${a.receivedBy}` : ""}` : "-"}</td>
    </tr>`).join("")}
    <tr class="totals-row">
      <td colspan="3">TOTAL</td>
      <td class="right">${totalFabric}</td>
      <td></td>
      <td class="right">${totalEst}</td>
      <td></td>
      <td class="right">${totalCut2}</td>
      <td></td>
      <td></td>
      <td class="right">Rs.${totalAmt.toLocaleString()}</td>
      <td></td>
    </tr>
  </tbody>
</table>

${allSizes.length > 0 ? `
<h2>Size Breakdown — Suits Made${hasMultipleComponents ? " (MIN across components)" : ""}</h2>
<table>
  <thead>
    <tr>
      <th>Type</th>
      ${allSizes.map((s) => `<th class="center">${s}</th>`).join("")}
      <th class="center">TOTAL</th>
    </tr>
  </thead>
  <tbody>
    ${hasMultipleComponents ? componentNames.map((c) => `
      <tr>
        <td><strong>${c}</strong></td>
        ${allSizes.map((s) => `<td class="center">${componentSizes[c][s] || "-"}</td>`).join("")}
        <td class="center"><strong>${Object.values(componentSizes[c]).reduce((a, b) => a + b, 0)}</strong></td>
      </tr>
    `).join("") : ""}
    <tr style="background:#e8f5e9;font-weight:bold">
      <td>${hasMultipleComponents ? "✓ COMPLETE SUITS" : "Pieces"}</td>
      ${allSizes.map((s) => `<td class="center">${hasMultipleComponents ? suitsPerSize[s] : piecesPerSize[s]}</td>`).join("")}
      <td class="center">${hasMultipleComponents ? Object.values(suitsPerSize).reduce((a, b) => a + b, 0) : Object.values(piecesPerSize).reduce((a, b) => a + b, 0)}</td>
    </tr>
  </tbody>
</table>
${hasMultipleComponents ? `<div style="font-size:10px;color:#666;margin-top:4px">Each suit = 1 of every component (${componentNames.join(" + ")}). Suits per size = MIN of all component counts for that size.</div>` : ""}` : ""}

<div class="signatures">
  <div class="sig-box">Cutting Master Signature</div>
  <div class="sig-box">Store Keeper Signature</div>
  <div class="sig-box">Authorized By</div>
</div>

<div class="footer">
  Powered by Devoria Tech &nbsp;|&nbsp; +923117597815 &nbsp;|&nbsp; Printed on ${format(new Date(), "dd MMM yyyy, HH:mm")}
</div>

<div class="no-print" style="text-align:center;margin-top:20px"><button onclick="window.print()" style="padding:8px 16px;font-size:13px;cursor:pointer">Print</button></div>
<script>setTimeout(() => window.print(), 300);</script>
</body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (w) { w.document.write(html); w.document.close(); }
    else { toast({ title: "Pop-up blocked", description: "Please allow pop-ups to print", variant: "destructive" }); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!job) return <div className="text-center py-12 text-muted-foreground">Job not found</div>;

  const totalFabricGiven = job.assignments.reduce((s, a) => s + a.fabricGivenMeters, 0);
  const totalEstimated = job.assignments.reduce((s, a) => s + (a.estimatedPieces || 0), 0);
  const totalCut = job.assignments.reduce((s, a) => s + (a.piecesCut || 0), 0);
  const totalWaste = job.assignments.reduce((s, a) => s + (a.wasteMeters || 0), 0);
  const totalAmount = job.assignments.reduce((s, a) => s + (a.totalAmount || 0), 0);

  const masterOptions = masters.map((m) => ({
    value: m.id.toString(),
    label: m.name,
    sublabel: m.machineNo ? `Machine ${m.machineNo}` : undefined,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cutting"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">CUT-{String(job.id).padStart(4, "0")}</h1>
          <p className="text-muted-foreground">{job.articleName} ({job.articleCode}){job.demandPieces ? ` — Demand: ${job.demandPieces} pcs` : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrintJobCard}>
          <Printer className="h-4 w-4 mr-2" /> Print Job Card
        </Button>
        {job.status !== "completed" && (
          <Select value={job.status} onValueChange={handleUpdateStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">Job Date</div><div className="text-lg font-medium">{format(new Date(job.jobDate), "MMM d, yyyy")}</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">Total Fabric Given</div><div className="text-lg font-bold">{totalFabricGiven}m</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">Estimated / Cut</div><div className="text-lg font-bold">{totalEstimated > 0 ? `${totalCut} / ${totalEstimated}` : totalCut || "-"} <span className="text-sm font-normal">pcs</span></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">Waste</div><div className="text-lg font-bold text-orange-600">{totalWaste}m</div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><div className="text-xs text-muted-foreground">Total Amount</div><div className="text-lg font-bold text-green-600">Rs.{totalAmount.toLocaleString()}</div></CardContent></Card>
      </div>

      {stock.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Article Components — Available Fabric Stock</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Fabric</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Already Given</TableHead><TableHead className="text-right">Available</TableHead></TableRow></TableHeader>
              <TableBody>
                {stock.map((s) => (
                  <TableRow key={s.componentName}>
                    <TableCell className="font-medium">{s.componentName}</TableCell>
                    <TableCell>{s.fabricName}</TableCell>
                    <TableCell className="text-right font-mono">{s.totalReceived}m</TableCell>
                    <TableCell className="text-right font-mono">{s.totalGiven.toFixed(2)}m</TableCell>
                    <TableCell className="text-right font-mono font-bold text-blue-600">{s.available.toFixed(2)}m</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Master Assignments</CardTitle>
          <div className="flex gap-2">
            {job.assignments.some(a => a.status === "completed" && a.handoverStatus !== "received_by_next") && (
              <Button size="sm" variant="outline" onClick={openBulkHandover}>
                <Send className="mr-2 h-4 w-4 text-blue-600" /> Handover Pending ({job.assignments.filter(a => a.status === "completed" && a.handoverStatus !== "received_by_next").length})
              </Button>
            )}
          {job.status !== "completed" && job.status !== "cancelled" && (
            <Dialog open={assignDialog} onOpenChange={(o) => o ? openAssign() : setAssignDialog(false)}>
              <DialogTrigger asChild><Button size="sm" onClick={openAssign}><Plus className="mr-2 h-4 w-4" /> Assign Master</Button></DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Assign Cutting Master</DialogTitle></DialogHeader>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  <div>
                    <Label>Master *</Label>
                    <SearchableSelect options={masterOptions} value={masterId} onValueChange={setMasterId} placeholder="Search & select master" searchPlaceholder="Type master name..." />
                  </div>

                  {rows.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                      <AlertTriangle className="h-4 w-4 inline mr-1" /> No components defined for this article. Add components in the article first.
                    </div>
                  ) : (
                    <div>
                      <Label>Components to Cut *</Label>
                      <p className="text-xs text-muted-foreground mb-2">Select components, enter fabric to give & per-piece consumption. Pieces are auto-calculated.</p>
                      <div className="space-y-2">
                        {rows.map((r, i) => {
                          const est = calcEstimated(r);
                          const err = validateRow(r);
                          const warn = !err ? warnRow(r) : null;
                          return (
                            <div key={i} className={`border rounded-lg p-3 ${r.selected ? "bg-blue-50/50 border-blue-200" : ""} ${err ? "border-red-300 bg-red-50/30" : ""} ${warn ? "border-yellow-300 bg-yellow-50/30" : ""}`}>
                              <div className="flex items-center gap-3">
                                <input type="checkbox" checked={r.selected} onChange={(e) => updateRow(i, { selected: e.target.checked })} className="h-4 w-4" />
                                <div className="flex-1">
                                  <div className="font-medium">{r.componentName}</div>
                                  <div className="text-xs text-muted-foreground">{r.fabricName} — Available: <strong className="text-blue-600">{r.available.toFixed(2)}m</strong></div>
                                </div>
                              </div>
                              {r.selected && (
                                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <div>
                                    <Label className="text-xs">Fabric Given (m)</Label>
                                    <Input type="number" step="0.1" value={r.fabricGiven} onChange={(e) => updateRow(i, { fabricGiven: e.target.value })} placeholder="e.g. 300" />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Per Piece (m)</Label>
                                    <Input type="number" step="0.1" value={r.fabricPerPiece} onChange={(e) => updateRow(i, { fabricPerPiece: e.target.value })} placeholder="e.g. 2.5" />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Estimated Pieces</Label>
                                    <Input value={est ?? ""} readOnly className="bg-muted/50 font-mono font-bold" />
                                  </div>
                                  {rateMode === "per_component" && (
                                    <div>
                                      <Label className="text-xs">Rate / Piece (Rs.)</Label>
                                      <Input type="number" step="0.5" value={r.ratePerPiece} onChange={(e) => updateRow(i, { ratePerPiece: e.target.value })} placeholder="e.g. 40" />
                                    </div>
                                  )}
                                  {err && (
                                    <div className="col-span-full text-xs text-red-600 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" /> {err}
                                    </div>
                                  )}
                                  {warn && (
                                    <div className="col-span-full text-xs text-yellow-700 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" /> {warn}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Rate Mode *</Label>
                    <div className="flex gap-2 mt-1">
                      <Button type="button" variant={rateMode === "per_component" ? "default" : "outline"} size="sm" onClick={() => setRateMode("per_component")}>Per Component</Button>
                      <Button type="button" variant={rateMode === "per_suit" ? "default" : "outline"} size="sm" onClick={() => setRateMode("per_suit")}>Per Suit (whole article)</Button>
                    </div>
                    {rateMode === "per_suit" && (
                      <div className="mt-2">
                        <Label className="text-xs">Rate per Suit (Rs.)</Label>
                        <Input type="number" step="0.5" value={ratePerSuit} onChange={(e) => setRatePerSuit(e.target.value)} placeholder="e.g. 120" />
                      </div>
                    )}
                  </div>

                  <div>
                    {(() => {
                      const sizeTotal = sizes.reduce((s, x) => s + (parseInt(x.quantity) || 0), 0);
                      const ests = rows.filter((r) => r.selected).map(calcEstimated).filter((x): x is number => x !== null);
                      const minEst = ests.length > 0 ? Math.min(...ests) : null;
                      const over = minEst !== null && sizeTotal > minEst;
                      return (
                        <div className="flex items-center justify-between mb-1">
                          <Label>Size Breakdown (applied to each component)</Label>
                          {minEst !== null && (
                            <div className={`text-xs font-mono ${over ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                              Total: {sizeTotal} / {minEst} estimated{over ? " — exceeds!" : ""}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {sizes.map((s, i) => (
                      <div key={i} className="flex gap-2 mt-2 items-center">
                        <Select value={s.size} onValueChange={(v) => { const ns = [...sizes]; ns[i].size = v; setSizes(ns); }}>
                          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>{["XS", "S", "M", "L", "XL", "XXL"].map((sz) => <SelectItem key={sz} value={sz}>{sz}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" placeholder="Qty" value={s.quantity} onChange={(e) => { const ns = [...sizes]; ns[i].quantity = e.target.value; setSizes(ns); }} />
                        {sizes.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeSizeRow(i)}><Trash2 className="h-3 w-3 text-muted-foreground" /></Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addSizeRow} className="mt-2"><Plus className="h-3 w-3 mr-1" /> Add Size</Button>
                  </div>

                  <div><Label>Notes</Label><Input value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="Special instructions" /></div>
                  <Button className="w-full" onClick={handleAssign}>Assign Master</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          </div>
        </CardHeader>
        <CardContent>
          {!job.assignments?.length ? (
            <div className="text-center py-8 text-muted-foreground">No assignments yet — click "Assign Master" to start</div>
          ) : (
            <div className="space-y-6">
              {(() => {
                type Asn = typeof job.assignments[number];
                const groups = new Map<string, { masterName: string; items: Asn[] }>();
                for (const a of job.assignments) {
                  const key = `${a.masterName}__${a.id < 0 ? a.id : ""}`;
                  const existing = Array.from(groups.entries()).find(([, g]) => g.masterName === a.masterName);
                  if (existing) existing[1].items.push(a);
                  else groups.set(key, { masterName: a.masterName, items: [a] });
                }
                return Array.from(groups.values()).map((g) => {
                  const mFabric = g.items.reduce((s, x) => s + (x.fabricGivenMeters || 0), 0);
                  const mEst = g.items.reduce((s, x) => s + (x.estimatedPieces || 0), 0);
                  const mCut = g.items.reduce((s, x) => s + (x.piecesCut || 0), 0);
                  const mAmount = g.items.reduce((s, x) => s + (x.totalAmount || 0), 0);
                  const allDone = g.items.every((x) => x.status === "completed");
                  return (
                    <div key={g.masterName} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between border-b">
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-base">{g.masterName}</div>
                          <Badge variant={allDone ? "default" : "secondary"} className="text-xs">
                            {g.items.length} component{g.items.length > 1 ? "s" : ""} · {allDone ? "all done" : `${g.items.filter(x => x.status === "completed").length}/${g.items.length} done`}
                          </Badge>
                          {!allDone && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 ml-2"
                              disabled={bulkCompleteSubmitting === g.masterName}
                              onClick={() => handleQuickCompleteAll(g.masterName, g.items)}
                              title="Mark all pending components for this master as complete (uses estimated/size pieces, no waste)"
                            >
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                              {bulkCompleteSubmitting === g.masterName ? "Completing..." : `Quick Complete (${g.items.filter(x => x.status !== "completed").length})`}
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span>Fabric: <strong>{mFabric.toFixed(1)}m</strong></span>
                          {mEst > 0 && <span className="text-blue-600">Est: <strong>{mEst}</strong></span>}
                          <span className="text-green-700">Cut: <strong>{mCut}</strong></span>
                          <span className="text-green-700">Rs.<strong>{mAmount.toLocaleString()}</strong></span>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead className="text-right">Fabric</TableHead>
                            <TableHead className="text-right">Per Pc</TableHead>
                            <TableHead className="text-right">Est.</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Cut</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Handover</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.items.map((a) => (
                            <TableRow key={a.id}>
                    <TableCell><div className="font-medium">{a.componentName}</div>{a.fabricType && <div className="text-xs text-muted-foreground">{a.fabricType}</div>}</TableCell>
                    <TableCell className="text-right font-mono">{a.fabricGivenMeters}m</TableCell>
                    <TableCell className="text-right font-mono">{a.fabricPerPiece ? `${a.fabricPerPiece}m` : "-"}</TableCell>
                    <TableCell className="text-right">{a.estimatedPieces ? <span className="font-mono font-bold text-blue-600">{a.estimatedPieces}</span> : "-"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {a.ratePerPiece ? `Rs.${a.ratePerPiece}/pc` : a.ratePerSuit ? <span className="text-purple-700">Rs.{a.ratePerSuit}/suit</span> : a.notes?.startsWith("Bundled with suit") ? <span className="text-muted-foreground italic">bundled</span> : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      <div>{a.piecesCut || "-"}</div>
                      {a.sizes && a.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-end mt-1">
                          {a.sizes.map((s, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] font-mono px-1 py-0 h-4">
                              {s.size}: {a.status === "completed" ? (s.completedQty ?? s.quantity) : s.quantity}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-green-600">{a.totalAmount ? `Rs.${a.totalAmount.toLocaleString()}` : "-"}</TableCell>
                    <TableCell><Badge variant={a.status === "completed" ? "default" : "secondary"}>{a.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      {a.status === "completed" ? (
                        <div>
                          <Badge variant={HANDOVER_VARIANT[a.handoverStatus]} className="text-xs">{HANDOVER_LABEL[a.handoverStatus]}</Badge>
                          {a.receivedBy && <div className="text-xs text-muted-foreground mt-1">→ {a.receivedBy}</div>}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {a.status !== "completed" && (
                          <Dialog open={completeDialog === a.id} onOpenChange={(o) => { if (o) openComplete(a); else { setCompleteDialog(null); setCompleteForm({ piecesCut: "", wasteMeters: "", fabricReturnedMeters: "", sizeResults: [] }); } }}>
                            <DialogTrigger asChild><Button variant="ghost" size="icon" title="Complete" onClick={() => openComplete(a)}><CheckCircle className="h-4 w-4 text-green-600" /></Button></DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader><DialogTitle>Complete — {a.masterName} / {a.componentName}</DialogTitle></DialogHeader>
                              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                                  <div>Fabric Given: <strong>{a.fabricGivenMeters}m</strong></div>
                                  {a.estimatedPieces && <div>Estimated: <strong>{a.estimatedPieces} pieces</strong></div>}
                                </div>

                                {completeForm.sizeResults.length > 0 && (
                                  <div className="space-y-2 border rounded-lg p-3">
                                    <Label className="text-xs font-semibold">Pieces Cut per Size</Label>
                                    {completeForm.sizeResults.map((sr, si) => (
                                      <div key={si} className="flex items-center gap-2">
                                        <div className="w-16 text-sm font-mono">{sr.size}</div>
                                        <Input
                                          type="number"
                                          value={sr.completedQty}
                                          onChange={(e) => {
                                            const next = [...completeForm.sizeResults];
                                            next[si] = { ...next[si], completedQty: e.target.value };
                                            const total = next.reduce((s, x) => s + (parseInt(x.completedQty) || 0), 0);
                                            setCompleteForm({ ...completeForm, sizeResults: next, piecesCut: String(total) });
                                          }}
                                          className="h-8"
                                          placeholder="Pieces"
                                        />
                                      </div>
                                    ))}
                                    <div className="text-xs text-muted-foreground pt-1">Total auto-syncs to Pieces Cut below.</div>
                                  </div>
                                )}

                                <div><Label>Pieces Actually Cut (Total) *</Label><Input type="number" value={completeForm.piecesCut} onChange={(e) => setCompleteForm({ ...completeForm, piecesCut: e.target.value })} /></div>
                                <div><Label>Waste Fabric (m)</Label><Input type="number" step="0.1" value={completeForm.wasteMeters} onChange={(e) => setCompleteForm({ ...completeForm, wasteMeters: e.target.value })} /></div>
                                <div><Label>Fabric Returned (m)</Label><Input type="number" step="0.1" value={completeForm.fabricReturnedMeters} onChange={(e) => setCompleteForm({ ...completeForm, fabricReturnedMeters: e.target.value })} /></div>
                                <Button className="w-full" onClick={() => handleComplete(a.id)}>Mark Complete & Credit Master</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {a.status === "completed" && (
                          <Dialog open={handoverDialog === a.id} onOpenChange={(o) => { setHandoverDialog(o ? a.id : null); if (o) setHandoverForm({ status: a.handoverStatus, receivedBy: a.receivedBy || "" }); }}>
                            <DialogTrigger asChild><Button variant="ghost" size="icon" title="Handover"><Send className="h-4 w-4 text-blue-600" /></Button></DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Handover Cut Pieces — {a.componentName}</DialogTitle></DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Where are the cut pieces?</Label>
                                  <Select value={handoverForm.status} onValueChange={(v: typeof handoverForm.status) => setHandoverForm({ ...handoverForm, status: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="with_cutter">Still with Cutter</SelectItem>
                                      <SelectItem value="returned_to_store">Returned to Store</SelectItem>
                                      <SelectItem value="received_by_next">Received by Next Stage (Stitching)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {handoverForm.status === "received_by_next" && (
                                  <div><Label>Received By (Stitching Master / Person)</Label><Input value={handoverForm.receivedBy} onChange={(e) => setHandoverForm({ ...handoverForm, receivedBy: e.target.value })} placeholder="e.g. Aslam Master" /></div>
                                )}
                                <Button className="w-full" onClick={() => handleHandover(a.id)}>Update Handover</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {a.status !== "completed" && <Button variant="ghost" size="icon" onClick={() => handleDeleteAssignment(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                });
              })()}
              {(() => {
                const tFabric = job.assignments.reduce((s, x) => s + (x.fabricGivenMeters || 0), 0);
                const tEst = job.assignments.reduce((s, x) => s + (x.estimatedPieces || 0), 0);
                const tCut = job.assignments.reduce((s, x) => s + (x.piecesCut || 0), 0);
                const tAmount = job.assignments.reduce((s, x) => s + (x.totalAmount || 0), 0);
                return (
                  <div className="flex items-center justify-end gap-6 pt-3 border-t text-sm font-mono">
                    <span>Total Fabric: <strong>{tFabric.toFixed(1)}m</strong></span>
                    {tEst > 0 && <span className="text-blue-600">Est: <strong>{tEst}</strong></span>}
                    <span className="text-green-700">Cut: <strong>{tCut}</strong></span>
                    <span className="text-green-700">Amount: <strong>Rs.{tAmount.toLocaleString()}</strong></span>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={bulkHandoverDialog} onOpenChange={setBulkHandoverDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Handover Cut Pieces — All Components</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <p className="text-sm text-muted-foreground">
              Select which components to hand over together. All selected will get the same status & receiver.
            </p>

            <div className="space-y-2 border rounded-lg p-3">
              {job.assignments
                .filter(a => a.status === "completed" && a.handoverStatus !== "received_by_next")
                .map(a => (
                  <label key={a.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!!bulkSelected[a.id]}
                      onChange={(e) => setBulkSelected({ ...bulkSelected, [a.id]: e.target.checked })}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{a.componentName}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.masterName} · <span className="font-mono">{a.piecesCut || 0} pcs cut</span> · {HANDOVER_LABEL[a.handoverStatus]}
                      </div>
                    </div>
                  </label>
                ))}
            </div>

            <div>
              <Label>Where are the cut pieces?</Label>
              <Select
                value={bulkHandover.status}
                onValueChange={(v: typeof bulkHandover.status) => setBulkHandover({ ...bulkHandover, status: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="with_cutter">Still with Cutter</SelectItem>
                  <SelectItem value="returned_to_store">Returned to Store</SelectItem>
                  <SelectItem value="received_by_next">Received by Next Stage (Stitching)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkHandover.status === "received_by_next" && (
              <div>
                <Label>Received By *</Label>
                <Input
                  placeholder="Receiver name (e.g. Stitching Master / Storekeeper)"
                  value={bulkHandover.receivedBy}
                  onChange={(e) => setBulkHandover({ ...bulkHandover, receivedBy: e.target.value })}
                />
              </div>
            )}

            <Button className="w-full" onClick={handleBulkHandover} disabled={bulkSubmitting}>
              {bulkSubmitting ? "Updating..." : `Handover ${Object.values(bulkSelected).filter(Boolean).length} Component(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
