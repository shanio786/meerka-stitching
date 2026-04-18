import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle, Trash2, Search, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { format } from "date-fns";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PendingPoolCard, type PendingRow } from "@/components/PendingPoolCard";
import { printJobCard } from "@/components/JobCard";

interface FinishingEntry {
  id: number;
  articleId: number;
  articleName: string;
  articleCode: string;
  masterId: number | null;
  masterName: string | null;
  workerName: string;
  componentName: string | null;
  size: string | null;
  receivedFrom: string | null;
  receivedQty: number;
  packedQty: number | null;
  wasteQty: number | null;
  wasteReason: string | null;
  ratePerPiece: number | null;
  totalAmount: number | null;
  receivedBy: string | null;
  status: string;
  date: string;
  notes: string | null;
}

interface ArticleOption { id: number; articleCode: string; articleName: string; }
interface MasterOption { id: number; name: string; masterType: string; }

const emptyForm = { articleId: "", masterId: "", workerName: "", componentName: "", size: "", receivedFrom: "", receivedQty: "", ratePerPiece: "", receivedBy: "", notes: "", date: new Date().toISOString().split("T")[0] };

export default function FinishingEntries() {
  const [entries, setEntries] = useState<FinishingEntry[]>([]);
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [masters, setMasters] = useState<MasterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completeDialog, setCompleteDialog] = useState<number | null>(null);
  const [poolKey, setPoolKey] = useState(0);
  const { toast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [completeForm, setCompleteForm] = useState({ packedQty: "", wasteQty: "", wasteReason: "" });

  const fetchEntries = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    try { const data = await apiGet<FinishingEntry[]>(`/finishing?${params}`); setEntries(data); } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
    apiGet<ArticleOption[]>("/articles").then(setArticles).catch(() => {});
    apiGet<MasterOption[]>("/masters?active=true").then(setMasters).catch(() => {});
  }, [statusFilter]);

  const handlePoolReceive = (row: PendingRow) => {
    setForm({
      ...emptyForm,
      articleId: String(row.articleId),
      componentName: row.componentName || "",
      size: row.size || "",
      receivedQty: String(row.available),
      receivedFrom: row.inspectorName ? `QC - ${row.inspectorName}` : "QC Dept",
    });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!form.articleId || !form.workerName || !form.receivedQty) { toast({ title: "Fill required fields", variant: "destructive" }); return; }
    try {
      await apiPost("/finishing", {
        articleId: parseInt(form.articleId), masterId: form.masterId ? parseInt(form.masterId) : undefined,
        workerName: form.workerName,
        componentName: form.componentName || undefined, size: form.size || undefined,
        receivedFrom: form.receivedFrom || undefined,
        receivedQty: parseInt(form.receivedQty),
        ratePerPiece: form.ratePerPiece ? parseFloat(form.ratePerPiece) : undefined,
        receivedBy: form.receivedBy, notes: form.notes, date: form.date,
      });
      toast({ title: "Finishing entry added" });
      setDialogOpen(false);
      setForm(emptyForm);
      fetchEntries();
      setPoolKey(k => k + 1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleComplete = async (entryId: number) => {
    try {
      await apiPatch(`/finishing/${entryId}/complete`, {
        packedQty: parseInt(completeForm.packedQty),
        wasteQty: completeForm.wasteQty ? parseInt(completeForm.wasteQty) : 0,
        wasteReason: completeForm.wasteReason,
      });
      toast({ title: "Finishing completed" });
      setCompleteDialog(null);
      setCompleteForm({ packedQty: "", wasteQty: "", wasteReason: "" });
      fetchEntries();
      setPoolKey(k => k + 1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to complete";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handlePrintJobCard = (e: FinishingEntry) => {
    void printJobCard({
      title: "Finishing Job Card",
      subtitle: `${e.articleName} (${e.articleCode})`,
      jobNumber: `FN-${e.id}`,
      date: format(new Date(e.date), "PPP"),
      sections: [
        {
          heading: "Assignment",
          rows: [
            { label: "Worker", value: e.workerName },
            { label: "Master (linked)", value: e.masterName || "-" },
            { label: "Component", value: e.componentName || "-" },
            { label: "Size", value: e.size || "-" },
            { label: "Received From", value: e.receivedFrom || "-" },
            { label: "Received By", value: e.receivedBy || "-" },
          ],
        },
        {
          heading: "Quantities",
          rows: [
            { label: "Received", value: e.receivedQty },
            { label: "Packed", value: e.packedQty ?? "-" },
            { label: "Waste", value: e.wasteQty ?? "-" },
            { label: "Rate/Piece", value: e.ratePerPiece ? `Rs.${e.ratePerPiece}` : "-" },
            { label: "Total Amount", value: e.totalAmount ? `Rs.${e.totalAmount.toLocaleString()}` : "-" },
            { label: "Status", value: e.status },
          ],
        },
      ],
      footerNote: e.notes || undefined,
    });
  };

  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.articleName.toLowerCase().includes(q) || e.workerName.toLowerCase().includes(q) || (e.masterName || "").toLowerCase().includes(q) || e.articleCode.toLowerCase().includes(q);
  });

  const articleOptions = articles.map(a => ({ value: a.id.toString(), label: `${a.articleCode} - ${a.articleName}`, sublabel: a.articleCode }));
  const masterOptions = masters.filter(m => m.masterType === "finishing").map(m => ({ value: m.id.toString(), label: m.name }));

  return (
    <div className="space-y-6">
      <PageHeader title="Finishing" description="QC ke baad pieces — pressing, folding, packing yahan track karein" actions={
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setForm(emptyForm); }}>
          <DialogTrigger asChild><Button data-testid="button-new-finishing"><Plus className="mr-2 h-4 w-4" /> New Entry</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Finishing Entry</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div><Label>Article *</Label>
                <SearchableSelect options={articleOptions} value={form.articleId} onValueChange={v => setForm({ ...form, articleId: v })} placeholder="Search & select article" searchPlaceholder="Type article name or code..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Worker Name *</Label><Input value={form.workerName} onChange={e => setForm({ ...form, workerName: e.target.value })} /></div>
                <div><Label>Master (optional)</Label>
                  <SearchableSelect options={masterOptions} value={form.masterId} onValueChange={v => setForm({ ...form, masterId: v })} placeholder="Select master" searchPlaceholder="Search master..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Component</Label><Input value={form.componentName} onChange={e => setForm({ ...form, componentName: e.target.value })} placeholder="e.g. shirt" /></div>
                <div><Label>Size</Label>
                  <Select value={form.size} onValueChange={v => setForm({ ...form, size: v })}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>{["XS", "S", "M", "L", "XL", "XXL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Received Qty *</Label><Input type="number" value={form.receivedQty} onChange={e => setForm({ ...form, receivedQty: e.target.value })} /></div>
                <div><Label>Rate/Piece</Label><Input type="number" value={form.ratePerPiece} onChange={e => setForm({ ...form, ratePerPiece: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Received By</Label><Input value={form.receivedBy} onChange={e => setForm({ ...form, receivedBy: e.target.value })} placeholder="Person who received pieces" /></div>
                <div><Label>Received From</Label><Input value={form.receivedFrom} onChange={e => setForm({ ...form, receivedFrom: e.target.value })} placeholder="e.g. QC - Inspector name" /></div>
              </div>
              <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate}>Add Entry</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <PendingPoolCard
        title="Pending from QC"
        description="QC pass ho chuke pieces — yahan finishing ke liye receive karein."
        endpoint="/finishing/pending-from-qc"
        fromLabel="Inspector"
        onReceive={handlePoolReceive}
        refreshKey={poolKey}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by article, worker, master..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !filtered.length ? (
            <div className="text-center py-12 text-muted-foreground"><p className="text-lg font-medium">No finishing entries</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead className="text-center">Recvd</TableHead>
                    <TableHead className="text-center">Packed</TableHead>
                    <TableHead className="text-center">Waste</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{format(new Date(e.date), "MMM d")}</TableCell>
                      <TableCell><div className="font-medium">{e.articleName}</div><div className="text-xs text-muted-foreground">{e.articleCode}</div></TableCell>
                      <TableCell>{e.workerName}{e.masterName ? <span className="text-xs text-muted-foreground block">{e.masterName}</span> : null}</TableCell>
                      <TableCell>{e.componentName || "-"}</TableCell>
                      <TableCell>{e.size ? <Badge variant="secondary">{e.size}</Badge> : "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate" title={e.receivedFrom || ""}>{e.receivedFrom || "-"}</TableCell>
                      <TableCell className="text-center">{e.receivedQty}</TableCell>
                      <TableCell className="text-center">{e.packedQty || "-"}</TableCell>
                      <TableCell className="text-center text-destructive">{e.wasteQty || "-"}</TableCell>
                      <TableCell>{e.ratePerPiece ? `Rs.${e.ratePerPiece}` : "-"}</TableCell>
                      <TableCell className="font-mono">{e.totalAmount ? `Rs.${e.totalAmount.toLocaleString()}` : "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={e.status === "completed" ? "default" : "secondary"}>{e.status}</Badge>
                          {e.status !== "completed" && e.status !== "cancelled" && (Date.now() - new Date(e.date).getTime()) > 86400000 && (
                            <Badge variant="destructive" className="text-[10px]" title="Pending more than 24 hours">⚠ Stuck</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handlePrintJobCard(e)} title="Print Job Card" data-testid={`button-jobcard-${e.id}`}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          {e.status !== "completed" && (
                            <Dialog open={completeDialog === e.id} onOpenChange={o => { setCompleteDialog(o ? e.id : null); if (!o) setCompleteForm({ packedQty: "", wasteQty: "", wasteReason: "" }); }}>
                              <DialogTrigger asChild><Button variant="ghost" size="icon" data-testid={`button-complete-${e.id}`}><CheckCircle className="h-4 w-4 text-green-600" /></Button></DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Complete Finishing</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <div className="text-sm bg-muted/50 p-3 rounded-md">
                                    <div><span className="text-muted-foreground">Article:</span> <span className="font-medium">{e.articleName}</span></div>
                                    <div><span className="text-muted-foreground">Worker:</span> <span className="font-medium">{e.workerName}</span></div>
                                    <div><span className="text-muted-foreground">Received:</span> <span className="font-medium">{e.receivedQty} pcs</span></div>
                                  </div>
                                  <div><Label>Packed Qty *</Label><Input type="number" max={e.receivedQty} value={completeForm.packedQty} onChange={ev => setCompleteForm({ ...completeForm, packedQty: ev.target.value })} /></div>
                                  <div><Label>Waste Qty</Label><Input type="number" value={completeForm.wasteQty} onChange={ev => setCompleteForm({ ...completeForm, wasteQty: ev.target.value })} /></div>
                                  <div><Label>Waste Reason</Label><Input value={completeForm.wasteReason} onChange={ev => setCompleteForm({ ...completeForm, wasteReason: ev.target.value })} /></div>
                                  <Button className="w-full" onClick={() => handleComplete(e.id)}>Mark Complete</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) apiDelete(`/finishing/${e.id}`).then(() => { fetchEntries(); setPoolKey(k => k + 1); }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
    </div>
  );
}
