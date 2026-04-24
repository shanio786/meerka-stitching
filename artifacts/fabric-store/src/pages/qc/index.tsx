import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, CheckCircle, XCircle, Search, Printer, Recycle, Ban, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { format } from "date-fns";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PendingPoolCard, type PendingRow } from "@/components/PendingPoolCard";
import { printJobCard } from "@/components/JobCard";
import { SizeBreakdownRows, emptyBreakdownRow, validBreakdownRows, type BreakdownRow } from "@/components/SizeBreakdownRows";

interface ReworkRow {
  id: number;
  qcEntryId: number;
  qty: number;
  targetStage: string;
  targetMasterId: number | null;
  targetMasterName: string | null;
  status: string;
  date: string;
  notes: string | null;
}

interface QCEntry {
  id: number;
  articleId: number;
  articleName: string;
  articleCode: string;
  inspectorName: string;
  masterName: string | null;
  masterId: number | null;
  componentName: string | null;
  size: string | null;
  receivedFrom: string | null;
  receivedQty: number;
  passedQty: number;
  rejectedQty: number;
  rejectionReason: string | null;
  notes: string | null;
  date: string;
  reworks: ReworkRow[];
  reworkedQty: number;
  remainingRejected: number;
}

interface ArticleOption { id: number; articleCode: string; articleName: string; }
interface MasterOption { id: number; name: string; masterType: string; }

const emptyForm = { articleId: "", inspectorName: "", masterId: "", receivedFrom: "", rejectionReason: "", notes: "", date: new Date().toISOString().split("T")[0] };

export default function QCEntries() {
  const [entries, setEntries] = useState<QCEntry[]>([]);
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [masters, setMasters] = useState<MasterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [poolKey, setPoolKey] = useState(0);
  const { toast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([emptyBreakdownRow()]);

  const [reworkDialog, setReworkDialog] = useState<QCEntry | null>(null);
  const [reworkForm, setReworkForm] = useState({ targetStage: "stitching", targetMasterId: "", qty: "", notes: "" });

  const fetchEntries = async () => {
    setLoading(true);
    try { const data = await apiGet<QCEntry[]>("/qc"); setEntries(data); } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
    apiGet<ArticleOption[]>("/articles").then(setArticles).catch(() => {});
    apiGet<MasterOption[]>("/masters?active=true").then(setMasters).catch(() => {});
  }, []);

  const handlePoolReceive = (row: PendingRow) => {
    setForm({
      ...emptyForm,
      articleId: String(row.articleId),
      receivedFrom: row.masterName ? `Overlock/Button - ${row.masterName}` : "Overlock/Button Dept",
    });
    setBreakdown([emptyBreakdownRow({
      component: row.componentName || "",
      size: row.size || "",
      qty: String(row.available),
      passed: String(row.available),
      rejected: "0",
    })]);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    const rows = validBreakdownRows(breakdown);
    if (!form.articleId || !form.inspectorName) { toast({ title: "Article and Inspector required", variant: "destructive" }); return; }
    if (rows.length === 0) { toast({ title: "Add at least one size with quantity", variant: "destructive" }); return; }

    const normalized = rows.map(r => {
      const recv = parseInt(r.qty) || 0;
      const rejected = parseInt(r.rejected || "0") || 0;
      const passedRaw = (r.passed ?? "").trim();
      const passed = passedRaw === "" ? Math.max(0, recv - rejected) : (parseInt(passedRaw) || 0);
      return { r, recv, passed, rejected };
    });
    const invalid = normalized.find(({ recv, passed, rejected }) => passed + rejected > recv || passed < 0 || rejected < 0);
    if (invalid) {
      toast({ title: "Invalid QC counts", description: "Passed + Rejected cannot exceed Received in any row.", variant: "destructive" });
      return;
    }

    const results = await Promise.allSettled(normalized.map(({ r, recv, passed, rejected }) =>
      apiPost("/qc", {
        articleId: parseInt(form.articleId), inspectorName: form.inspectorName,
        masterId: form.masterId ? parseInt(form.masterId) : undefined,
        componentName: r.component || undefined, size: r.size || undefined,
        receivedFrom: form.receivedFrom || undefined,
        receivedQty: recv, passedQty: passed, rejectedQty: rejected,
        rejectionReason: form.rejectionReason, notes: form.notes, date: form.date,
      })
    ));
    const ok = results.filter(x => x.status === "fulfilled").length;
    const failed = results.length - ok;
    fetchEntries();
    setPoolKey(k => k + 1);
    if (failed === 0) {
      toast({ title: `${ok} QC ${ok === 1 ? "entry" : "entries"} added` });
      setDialogOpen(false);
      setForm(emptyForm);
      setBreakdown([emptyBreakdownRow()]);
    } else {
      const firstErr = results.find(x => x.status === "rejected") as PromiseRejectedResult | undefined;
      const msg = firstErr && firstErr.reason instanceof Error ? firstErr.reason.message : "Some entries failed";
      toast({ title: `${ok} added, ${failed} failed`, description: msg, variant: "destructive" });
      setBreakdown(rows.filter((_, i) => results[i].status === "rejected").map(r => ({ ...r })));
    }
  };

  const openRework = (e: QCEntry) => {
    setReworkForm({ targetStage: "stitching", targetMasterId: "", qty: String(e.remainingRejected || 0), notes: "" });
    setReworkDialog(e);
  };

  const handleRework = async () => {
    if (!reworkDialog) return;
    const qty = parseInt(reworkForm.qty);
    if (!qty || qty <= 0) { toast({ title: "Enter quantity", variant: "destructive" }); return; }
    if (qty > reworkDialog.remainingRejected) {
      toast({ title: `Only ${reworkDialog.remainingRejected} rejected piece(s) remain`, variant: "destructive" });
      return;
    }
    try {
      await apiPost(`/qc/${reworkDialog.id}/rework`, {
        targetStage: reworkForm.targetStage,
        targetMasterId: reworkForm.targetStage === "discarded" || !reworkForm.targetMasterId ? null : parseInt(reworkForm.targetMasterId),
        qty,
        notes: reworkForm.notes || undefined,
        date: new Date().toISOString(),
      });
      toast({ title: reworkForm.targetStage === "discarded" ? `${qty} piece(s) discarded` : `${qty} piece(s) sent to ${reworkForm.targetStage}` });
      setReworkDialog(null);
      fetchEntries();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to record rework";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const completeRework = async (rework: ReworkRow) => {
    try {
      await apiPatch(`/qc/reworks/${rework.id}/complete`, {});
      toast({ title: "Marked complete" });
      fetchEntries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const deleteRework = async (rework: ReworkRow) => {
    if (!confirm("Remove this rework decision?")) return;
    try {
      await apiDelete(`/qc/reworks/${rework.id}`);
      fetchEntries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handlePrintJobCard = (e: QCEntry) => {
    void printJobCard({
      title: "Quality Control Card",
      subtitle: `${e.articleName} (${e.articleCode})`,
      jobNumber: `QC-${e.id}`,
      date: format(new Date(e.date), "PPP"),
      sections: [
        {
          heading: "Inspection",
          rows: [
            { label: "Inspector", value: e.inspectorName },
            { label: "Stitching Master", value: e.masterName || "-" },
            { label: "Component", value: e.componentName || "-" },
            { label: "Size", value: e.size || "-" },
            { label: "Received From", value: e.receivedFrom || "-" },
          ],
        },
        {
          heading: "Result",
          rows: [
            { label: "Received Qty", value: e.receivedQty },
            { label: "Passed", value: e.passedQty },
            { label: "Rejected", value: e.rejectedQty },
            { label: "Pass %", value: passRate(e) + "%" },
            { label: "Rejection Reason", value: e.rejectionReason || "-" },
          ],
        },
      ],
      footerNote: e.notes || undefined,
    });
  };

  const passRate = (e: QCEntry) => e.receivedQty > 0 ? ((e.passedQty / e.receivedQty) * 100).toFixed(1) : "0";

  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.articleName.toLowerCase().includes(q) || e.articleCode.toLowerCase().includes(q) || e.inspectorName.toLowerCase().includes(q) || (e.masterName || "").toLowerCase().includes(q);
  });

  const articleOptions = articles.map(a => ({ value: a.id.toString(), label: `${a.articleCode} - ${a.articleName}`, sublabel: a.articleCode }));
  const masterOptions = masters.filter(m => m.masterType === "stitching" || m.masterType === "overlock" || m.masterType === "button").map(m => ({ value: m.id.toString(), label: `${m.name} (${m.masterType})` }));

  return (
    <div className="space-y-6">
      <PageHeader title="Quality Control" description="Inspect pieces after Overlock/Button — record passed and rejected, then send rejects for rework or discard." actions={
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setForm(emptyForm); setBreakdown([emptyBreakdownRow()]); } }}>
          <DialogTrigger asChild><Button data-testid="button-new-qc"><Plus className="mr-2 h-4 w-4" /> New QC Entry</Button></DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Add QC Entry</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Article *</Label>
                  <SearchableSelect options={articleOptions} value={form.articleId} onValueChange={v => setForm({ ...form, articleId: v })} placeholder="Search & select article" searchPlaceholder="Type article name or code..." />
                </div>
                <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Inspector Name *</Label><Input value={form.inspectorName} onChange={e => setForm({ ...form, inspectorName: e.target.value })} /></div>
                <div><Label>Linked Master</Label>
                  <SearchableSelect options={masterOptions} value={form.masterId} onValueChange={v => setForm({ ...form, masterId: v })} placeholder="Select master" searchPlaceholder="Search master..." />
                </div>
              </div>

              <SizeBreakdownRows rows={breakdown} onChange={setBreakdown} qtyLabel="Received" showRate={false} showPassedRejected={true} />

              <div><Label>Received From</Label><Input value={form.receivedFrom} onChange={e => setForm({ ...form, receivedFrom: e.target.value })} placeholder="e.g. Overlock - Master name" /></div>
              <div><Label>Rejection Reason</Label><Input value={form.rejectionReason} onChange={e => setForm({ ...form, rejectionReason: e.target.value })} placeholder="e.g. Uneven stitch, thread loose" /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate}>Add QC Entries</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <PendingPoolCard
        title="Pending from Overlock/Button"
        description="Pieces completed in overlock/button — click to receive and inspect them here."
        endpoint="/qc/pending-from-overlock"
        fromLabel="OB Master"
        onReceive={handlePoolReceive}
        refreshKey={poolKey}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Inspected</div><div className="text-2xl font-bold">{entries.reduce((s, e) => s + e.receivedQty, 0)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-600" /> Passed</div><div className="text-2xl font-bold text-green-600">{entries.reduce((s, e) => s + e.passedQty, 0)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><XCircle className="h-4 w-4 text-destructive" /> Rejected</div><div className="text-2xl font-bold text-destructive">{entries.reduce((s, e) => s + e.rejectedQty, 0)}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by article, inspector, master..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !filtered.length ? (
            <div className="text-center py-12 text-muted-foreground"><p className="text-lg font-medium">No QC entries</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Master</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead className="text-center">Recvd</TableHead>
                    <TableHead className="text-center">Pass</TableHead>
                    <TableHead className="text-center">Rej</TableHead>
                    <TableHead>Pass %</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{format(new Date(e.date), "MMM d")}</TableCell>
                      <TableCell><div className="font-medium">{e.articleName}</div><div className="text-xs text-muted-foreground">{e.articleCode}</div></TableCell>
                      <TableCell>{e.inspectorName}</TableCell>
                      <TableCell>{e.masterName || "-"}</TableCell>
                      <TableCell>{e.componentName || "-"}</TableCell>
                      <TableCell>{e.size ? <Badge variant="secondary">{e.size}</Badge> : "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate" title={e.receivedFrom || ""}>{e.receivedFrom || "-"}</TableCell>
                      <TableCell className="text-center font-mono">{e.receivedQty}</TableCell>
                      <TableCell className="text-center font-mono text-green-600">{e.passedQty}</TableCell>
                      <TableCell className="text-center font-mono text-destructive">
                        <div>{e.rejectedQty}</div>
                        {e.reworkedQty > 0 && (
                          <div className="text-[10px] font-normal text-muted-foreground" title="Already routed for rework or discard">
                            {e.reworkedQty} routed
                          </div>
                        )}
                      </TableCell>
                      <TableCell><Badge variant={parseFloat(passRate(e)) >= 90 ? "default" : "destructive"}>{passRate(e)}%</Badge></TableCell>
                      <TableCell className="max-w-[160px]">
                        <div className="truncate" title={e.rejectionReason || ""}>{e.rejectionReason || "-"}</div>
                        {e.reworks && e.reworks.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {e.reworks.map((r) => (
                              <Badge
                                key={r.id}
                                variant={r.targetStage === "discarded" ? "destructive" : r.status === "completed" ? "default" : "secondary"}
                                className="text-[10px] gap-1"
                                title={r.notes || ""}
                              >
                                {r.targetStage === "discarded" ? <Ban className="h-3 w-3" /> : <Recycle className="h-3 w-3" />}
                                {r.qty} → {r.targetStage}{r.targetMasterName ? ` (${r.targetMasterName})` : ""}
                                {r.targetStage !== "discarded" && r.status === "pending" && (
                                  <button
                                    type="button"
                                    onClick={() => completeRework(r)}
                                    className="ml-1 hover:text-foreground"
                                    title="Mark complete"
                                    data-testid={`button-complete-rework-${r.id}`}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => deleteRework(r)}
                                  className="ml-0.5 hover:text-foreground"
                                  title="Remove"
                                  data-testid={`button-remove-rework-${r.id}`}
                                >
                                  <XCircle className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {e.remainingRejected > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openRework(e)}
                              title={`Rework ${e.remainingRejected} rejected piece(s)`}
                              data-testid={`button-rework-${e.id}`}
                            >
                              <RotateCcw className="h-4 w-4 text-orange-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handlePrintJobCard(e)} title="Print Job Card" data-testid={`button-jobcard-${e.id}`}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) apiDelete(`/qc/${e.id}`).then(() => { fetchEntries(); setPoolKey(k => k + 1); }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reworkDialog} onOpenChange={(o) => { if (!o) setReworkDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Rejected Pieces for Rework</DialogTitle>
            <DialogDescription>Route rejected pieces back to a production stage or discard them as scrap.</DialogDescription>
          </DialogHeader>
          {reworkDialog && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm">
                <div><span className="text-muted-foreground">Article:</span> <span className="font-medium">{reworkDialog.articleName}</span> ({reworkDialog.articleCode})</div>
                {reworkDialog.componentName && <div><span className="text-muted-foreground">Component:</span> {reworkDialog.componentName}{reworkDialog.size ? ` · ${reworkDialog.size}` : ""}</div>}
                <div className="mt-1">
                  <span className="text-muted-foreground">Rejected:</span> <span className="font-mono text-destructive">{reworkDialog.rejectedQty}</span>
                  <span className="text-muted-foreground"> · Already routed:</span> <span className="font-mono">{reworkDialog.reworkedQty}</span>
                  <span className="text-muted-foreground"> · Remaining:</span> <span className="font-mono font-semibold">{reworkDialog.remainingRejected}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Send To *</Label>
                  <Select value={reworkForm.targetStage} onValueChange={(v) => setReworkForm({ ...reworkForm, targetStage: v, targetMasterId: "" })}>
                    <SelectTrigger data-testid="select-rework-stage"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stitching">Back to Stitching</SelectItem>
                      <SelectItem value="overlock">Back to Overlock</SelectItem>
                      <SelectItem value="button">Back to Button</SelectItem>
                      <SelectItem value="discarded">Discard (scrap)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    min={1}
                    max={reworkDialog.remainingRejected}
                    value={reworkForm.qty}
                    onChange={(e) => setReworkForm({ ...reworkForm, qty: e.target.value })}
                    data-testid="input-rework-qty"
                  />
                </div>
              </div>

              {reworkForm.targetStage !== "discarded" && (
                <div>
                  <Label>Assign to Master (optional)</Label>
                  <SearchableSelect
                    value={reworkForm.targetMasterId}
                    onChange={(v) => setReworkForm({ ...reworkForm, targetMasterId: v })}
                    options={masters.filter(m => m.masterType === reworkForm.targetStage).map(m => ({ value: m.id.toString(), label: m.name }))}
                    placeholder="Select master (or leave blank)"
                  />
                </div>
              )}

              <div>
                <Label>Notes</Label>
                <Input
                  value={reworkForm.notes}
                  onChange={(e) => setReworkForm({ ...reworkForm, notes: e.target.value })}
                  placeholder="Reason / instruction (optional)"
                  data-testid="input-rework-notes"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setReworkDialog(null)}>Cancel</Button>
                <Button onClick={handleRework} data-testid="button-submit-rework">
                  {reworkForm.targetStage === "discarded" ? <><Ban className="mr-2 h-4 w-4" /> Discard</> : <><Recycle className="mr-2 h-4 w-4" /> Send for Rework</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
