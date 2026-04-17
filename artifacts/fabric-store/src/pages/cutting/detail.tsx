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
import { Plus, CheckCircle, Trash2, ArrowLeft, AlertTriangle, Send } from "lucide-react";
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
  const { toast } = useToast();

  const [masterId, setMasterId] = useState("");
  const [rateMode, setRateMode] = useState<"per_component" | "per_suit">("per_component");
  const [ratePerSuit, setRatePerSuit] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [rows, setRows] = useState<ComponentRow[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([{ size: "M", quantity: "" }]);

  const [completeForm, setCompleteForm] = useState({ piecesCut: "", wasteMeters: "", fabricReturnedMeters: "" });
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
    const est = calcEstimated(r);
    if (job?.demandPieces && est !== null && est < job.demandPieces) {
      return `Only ${est} pcs possible — demand is ${job.demandPieces}`;
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

  const handleComplete = async (assignmentId: number) => {
    try {
      await apiPatch(`/cutting/assignments/${assignmentId}/complete`, {
        piecesCut: parseInt(completeForm.piecesCut),
        wasteMeters: completeForm.wasteMeters ? parseFloat(completeForm.wasteMeters) : 0,
        fabricReturnedMeters: completeForm.fabricReturnedMeters ? parseFloat(completeForm.fabricReturnedMeters) : 0,
      });
      toast({ title: "Completed, master credited" });
      setCompleteDialog(null);
      setCompleteForm({ piecesCut: "", wasteMeters: "", fabricReturnedMeters: "" });
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
                          return (
                            <div key={i} className={`border rounded-lg p-3 ${r.selected ? "bg-blue-50/50 border-blue-200" : ""} ${err ? "border-red-300 bg-red-50/30" : ""}`}>
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
                    <Label>Size Breakdown (applied to each component)</Label>
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
        </CardHeader>
        <CardContent>
          {!job.assignments?.length ? (
            <div className="text-center py-8 text-muted-foreground">No assignments yet — click "Assign Master" to start</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Master</TableHead>
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
                {job.assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.masterName}</TableCell>
                    <TableCell><div>{a.componentName}</div>{a.fabricType && <div className="text-xs text-muted-foreground">{a.fabricType}</div>}</TableCell>
                    <TableCell className="text-right font-mono">{a.fabricGivenMeters}m</TableCell>
                    <TableCell className="text-right font-mono">{a.fabricPerPiece ? `${a.fabricPerPiece}m` : "-"}</TableCell>
                    <TableCell className="text-right">{a.estimatedPieces ? <span className="font-mono font-bold text-blue-600">{a.estimatedPieces}</span> : "-"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {a.ratePerPiece ? `Rs.${a.ratePerPiece}/pc` : a.ratePerSuit ? <span className="text-purple-700">Rs.{a.ratePerSuit}/suit</span> : a.notes?.startsWith("Bundled with suit") ? <span className="text-muted-foreground italic">bundled</span> : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">{a.piecesCut || "-"}</TableCell>
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
                          <Dialog open={completeDialog === a.id} onOpenChange={(o) => { setCompleteDialog(o ? a.id : null); if (!o) setCompleteForm({ piecesCut: "", wasteMeters: "", fabricReturnedMeters: "" }); }}>
                            <DialogTrigger asChild><Button variant="ghost" size="icon" title="Complete"><CheckCircle className="h-4 w-4 text-green-600" /></Button></DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Complete — {a.masterName} / {a.componentName}</DialogTitle></DialogHeader>
                              <div className="space-y-4">
                                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                                  <div>Fabric Given: <strong>{a.fabricGivenMeters}m</strong></div>
                                  {a.estimatedPieces && <div>Estimated: <strong>{a.estimatedPieces} pieces</strong></div>}
                                </div>
                                <div><Label>Pieces Actually Cut *</Label><Input type="number" value={completeForm.piecesCut} onChange={(e) => setCompleteForm({ ...completeForm, piecesCut: e.target.value })} /></div>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
