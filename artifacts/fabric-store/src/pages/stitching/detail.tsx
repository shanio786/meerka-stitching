import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle, Trash2, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { ImageUpload } from "@/components/ImageUpload";
import { SearchableSelect } from "@/components/SearchableSelect";
import { format } from "date-fns";

interface Assignment {
  id: number;
  masterId: number;
  masterName: string;
  machineNo: string | null;
  cuttingAssignmentId: number | null;
  componentName: string;
  size: string | null;
  quantityGiven: number;
  piecesCompleted: number | null;
  piecesWaste: number | null;
  wasteReason: string | null;
  ratePerPiece: number | null;
  ratePerSuit: number | null;
  totalAmount: number | null;
  status: string;
  notes: string | null;
}

interface StitchingJobDetail {
  id: number;
  articleId: number;
  articleName: string;
  articleCode: string;
  cuttingJobId: number | null;
  supervisorName: string;
  jobDate: string;
  status: string;
  notes: string | null;
  assignments: Assignment[];
}

interface MasterOption { id: number; name: string; machineNo: string | null; }

interface PendingItem {
  cuttingAssignmentId: number;
  cuttingJobId: number;
  articleId: number;
  componentName: string;
  cutterMasterName: string;
  available: number;
  receivedBy: string | null;
  handoverDate: string | null;
}

interface ComponentRow {
  selected: boolean;
  cuttingAssignmentId: number;
  componentName: string;
  cutterMasterName: string;
  cuttingJobId: number;
  available: number;
  quantity: string;
  ratePerPiece: string;
}

export default function StitchingDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<StitchingJobDetail | null>(null);
  const [masters, setMasters] = useState<MasterOption[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState<number | null>(null);
  const [transferDialog, setTransferDialog] = useState<number | null>(null);
  const { toast } = useToast();

  const [masterId, setMasterId] = useState("");
  const [rateMode, setRateMode] = useState<"per_component" | "per_suit">("per_component");
  const [ratePerSuit, setRatePerSuit] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [size, setSize] = useState("");
  const [rows, setRows] = useState<ComponentRow[]>([]);

  const [completeForm, setCompleteForm] = useState({ piecesCompleted: "", piecesWaste: "", wasteReason: "" });
  const [transferForm, setTransferForm] = useState({ newMasterId: "", quantityToTransfer: "" });

  const fetchJob = async () => {
    setLoading(true);
    try { setJob(await apiGet<StitchingJobDetail>(`/stitching/jobs/${id}`)); }
    catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" }); }
    setLoading(false);
  };
  const fetchMasters = async () => { try { setMasters(await apiGet<MasterOption[]>("/masters?type=stitching&active=true")); } catch {} };
  const fetchPending = async (articleId: number) => {
    try { setPending(await apiGet<PendingItem[]>(`/stitching/pending-from-cutting?articleId=${articleId}`)); } catch {}
  };

  useEffect(() => { fetchJob(); fetchMasters(); }, [id]);
  useEffect(() => { if (job?.articleId) fetchPending(job.articleId); }, [job?.articleId, job?.assignments?.length]);

  const openAssign = () => {
    setRows(pending.map((p) => ({
      selected: false,
      cuttingAssignmentId: p.cuttingAssignmentId,
      componentName: p.componentName,
      cutterMasterName: p.cutterMasterName,
      cuttingJobId: p.cuttingJobId,
      available: p.available,
      quantity: String(p.available),
      ratePerPiece: "",
    })));
    setMasterId("");
    setRateMode("per_component");
    setRatePerSuit("");
    setAssignNotes("");
    setSize("");
    setAssignDialog(true);
  };

  const updateRow = (i: number, patch: Partial<ComponentRow>) => {
    setRows((rs) => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  const validateRow = (r: ComponentRow): string | null => {
    if (!r.selected) return null;
    const q = parseInt(r.quantity);
    if (isNaN(q) || q <= 0) return "Invalid quantity";
    if (q > r.available) return `Only ${r.available} pcs available`;
    return null;
  };

  const warnRow = (r: ComponentRow): string | null => {
    if (!r.selected) return null;
    const q = parseInt(r.quantity);
    if (!isNaN(q) && q < r.available) return `Taking ${q} of ${r.available} — rest stays in pending pool.`;
    return null;
  };

  const handleAssign = async () => {
    if (!masterId) { toast({ title: "Select a master", variant: "destructive" }); return; }
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) { toast({ title: "Select at least one component", variant: "destructive" }); return; }
    for (const r of selected) {
      const err = validateRow(r);
      if (err) { toast({ title: `${r.componentName}: ${err}`, variant: "destructive" }); return; }
    }
    if (rateMode === "per_suit" && !ratePerSuit) { toast({ title: "Enter rate per suit", variant: "destructive" }); return; }

    try {
      const items = selected.map((r) => ({
        cuttingAssignmentId: r.cuttingAssignmentId,
        componentName: r.componentName,
        size: size || null,
        quantityGiven: parseInt(r.quantity),
        ratePerPiece: rateMode === "per_component" && r.ratePerPiece ? parseFloat(r.ratePerPiece) : null,
      }));
      await apiPost("/stitching/assignments", {
        jobId: parseInt(id!), masterId: parseInt(masterId), items,
        ratePerSuit: rateMode === "per_suit" ? parseFloat(ratePerSuit) : null,
        notes: assignNotes,
      });
      toast({ title: `${selected.length} component(s) assigned` });
      setAssignDialog(false);
      fetchJob();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleComplete = async (assignmentId: number) => {
    try {
      await apiPatch(`/stitching/assignments/${assignmentId}/complete`, {
        piecesCompleted: parseInt(completeForm.piecesCompleted),
        piecesWaste: completeForm.piecesWaste ? parseInt(completeForm.piecesWaste) : 0,
        wasteReason: completeForm.wasteReason,
      });
      toast({ title: "Assignment completed, amount credited" });
      setCompleteDialog(null);
      setCompleteForm({ piecesCompleted: "", piecesWaste: "", wasteReason: "" });
      fetchJob();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleTransfer = async (assignmentId: number) => {
    try {
      await apiPatch(`/stitching/assignments/${assignmentId}/transfer`, {
        newMasterId: parseInt(transferForm.newMasterId),
        quantityToTransfer: parseInt(transferForm.quantityToTransfer),
      });
      toast({ title: "Quantity transferred" });
      setTransferDialog(null);
      setTransferForm({ newMasterId: "", quantityToTransfer: "" });
      fetchJob();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try { await apiPatch(`/stitching/jobs/${id}`, { status }); fetchJob(); } catch {}
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!job) return <div className="text-center py-12 text-muted-foreground">Job not found</div>;

  const totalGiven = job.assignments.reduce((s, a) => s + a.quantityGiven, 0);
  const totalDone = job.assignments.reduce((s, a) => s + (a.piecesCompleted || 0), 0);
  const totalWaste = job.assignments.reduce((s, a) => s + (a.piecesWaste || 0), 0);
  const totalAmount = job.assignments.reduce((s, a) => s + (a.totalAmount || 0), 0);

  // Source cutting jobs (unique, from assignments)
  const sourceJobs = Array.from(new Set(job.assignments.map((a) => a.cuttingAssignmentId).filter((x): x is number => x !== null)));
  const sourceCutJobs = Array.from(new Set(
    job.assignments
      .filter((a) => a.cuttingAssignmentId !== null)
      .map((a) => {
        const p = pending.find((p) => p.cuttingAssignmentId === a.cuttingAssignmentId);
        return p?.cuttingJobId || job.cuttingJobId || null;
      })
      .filter((x): x is number => x !== null)
  ));

  const masterOptions = masters.map((m) => ({
    value: m.id.toString(),
    label: `${m.name}${m.machineNo ? ` (M: ${m.machineNo})` : ""}`,
    sublabel: m.machineNo ?? undefined,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`STH-${String(job.id).padStart(4, "0")}`}
        description={`${job.articleName} (${job.articleCode}) | Supervisor: ${job.supervisorName}${sourceCutJobs.length > 0 ? ` | From cutting: ${sourceCutJobs.map(j => `CUT-${String(j).padStart(4, "0")}`).join(", ")}` : (job.cuttingJobId ? ` | From cutting: CUT-${String(job.cuttingJobId).padStart(4, "0")}` : "")}`}
        actions={
          <div className="flex items-center gap-2">
            {job.cuttingJobId && (
              <Link href={`/cutting/${job.cuttingJobId}`}>
                <Button variant="outline" size="sm">View Cutting</Button>
              </Link>
            )}
            <Select value={job.status} onValueChange={handleUpdateStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Job Date</div><div className="text-lg font-medium">{format(new Date(job.jobDate), "MMM d, yyyy")}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Given / Done</div><div className="text-lg font-medium">{totalDone} / {totalGiven} pcs</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Waste</div><div className="text-lg font-medium text-orange-600">{totalWaste} pcs</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Amount</div><div className="text-lg font-medium text-green-700">Rs.{totalAmount.toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Master Assignments</CardTitle>
          {job.status !== "completed" && job.status !== "cancelled" && (
            <Dialog open={assignDialog} onOpenChange={(o) => { if (o) openAssign(); else setAssignDialog(false); }}>
              <DialogTrigger asChild><Button size="sm" onClick={openAssign}><Plus className="mr-2 h-4 w-4" /> Assign Master</Button></DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Assign Stitching Master</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Master *</Label>
                    <SearchableSelect
                      options={masterOptions}
                      value={masterId}
                      onValueChange={setMasterId}
                      placeholder="Search & select master"
                      searchPlaceholder="Type master name..."
                    />
                  </div>

                  <div>
                    <Label>Components from Cutting</Label>
                    {rows.length === 0 ? (
                      <div className="text-sm text-muted-foreground border rounded-md p-4 text-center">
                        No pieces pending from cutting for this article.
                        <br />
                        <span className="text-xs">Mark cutting assignments as "Received by Next" to make them appear here.</span>
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Component</TableHead>
                              <TableHead>From Cutter</TableHead>
                              <TableHead className="text-right">Available</TableHead>
                              <TableHead className="w-28">Take</TableHead>
                              <TableHead className="w-28">Rate/Pc</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((r, i) => {
                              const err = validateRow(r);
                              const warn = warnRow(r);
                              return (
                                <>
                                  <TableRow key={i}>
                                    <TableCell><input type="checkbox" checked={r.selected} onChange={(e) => updateRow(i, { selected: e.target.checked })} /></TableCell>
                                    <TableCell className="font-medium">
                                      <div>{r.componentName}</div>
                                      <div className="text-xs text-muted-foreground">CUT-{String(r.cuttingJobId).padStart(4, "0")}</div>
                                    </TableCell>
                                    <TableCell className="text-sm">{r.cutterMasterName}</TableCell>
                                    <TableCell className="text-right">{r.available}</TableCell>
                                    <TableCell><Input type="number" disabled={!r.selected} value={r.quantity} onChange={(e) => updateRow(i, { quantity: e.target.value })} className="h-8" /></TableCell>
                                    <TableCell><Input type="number" disabled={!r.selected || rateMode === "per_suit"} value={r.ratePerPiece} onChange={(e) => updateRow(i, { ratePerPiece: e.target.value })} placeholder={rateMode === "per_suit" ? "—" : "Rs."} className="h-8" /></TableCell>
                                  </TableRow>
                                  {(err || warn) && r.selected && (
                                    <TableRow>
                                      <TableCell colSpan={6} className={`py-1 text-xs ${err ? "text-destructive bg-destructive/5" : "text-orange-600 bg-orange-50"}`}>
                                        <AlertTriangle className="h-3 w-3 inline mr-1" /> {err || warn}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Rate Mode</Label>
                      <Select value={rateMode} onValueChange={(v) => setRateMode(v as "per_component" | "per_suit")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_component">Per Component (different rate each)</SelectItem>
                          <SelectItem value="per_suit">Per Suit (one rate, charged once)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {rateMode === "per_suit" ? (
                      <div><Label>Rate per Suit *</Label><Input type="number" value={ratePerSuit} onChange={(e) => setRatePerSuit(e.target.value)} placeholder="Rs." /></div>
                    ) : (
                      <div><Label>Size (optional)</Label>
                        <Select value={size} onValueChange={setSize}>
                          <SelectTrigger><SelectValue placeholder="All sizes" /></SelectTrigger>
                          <SelectContent>{["XS", "S", "M", "L", "XL", "XXL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {rateMode === "per_suit" && (
                    <div><Label>Size (optional)</Label>
                      <Select value={size} onValueChange={setSize}>
                        <SelectTrigger><SelectValue placeholder="All sizes" /></SelectTrigger>
                        <SelectContent>{["XS", "S", "M", "L", "XL", "XXL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}

                  <div><Label>Notes</Label><Input value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} /></div>

                  {rateMode === "per_suit" && rows.filter(r => r.selected).length > 0 && (
                    <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                      Suit rate Rs.{ratePerSuit || "—"} will be charged once on <b>{rows.filter(r => r.selected)[0].componentName}</b>. Other components marked as bundled.
                    </div>
                  )}

                  <Button className="w-full" onClick={handleAssign} disabled={rows.length === 0}>Assign Master</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {!job.assignments?.length ? (
            <div className="text-center py-8 text-muted-foreground">No assignments yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Master</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Given</TableHead>
                  <TableHead>Done</TableHead>
                  <TableHead>Waste</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {job.assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.masterName}</TableCell>
                    <TableCell>{a.machineNo || "-"}</TableCell>
                    <TableCell>{a.componentName}</TableCell>
                    <TableCell>{a.size || "All"}</TableCell>
                    <TableCell>{a.quantityGiven}</TableCell>
                    <TableCell>{a.piecesCompleted || "-"}</TableCell>
                    <TableCell>{a.piecesWaste || "-"}</TableCell>
                    <TableCell>{a.ratePerPiece ? `Rs.${a.ratePerPiece}/pc` : a.ratePerSuit ? `Rs.${a.ratePerSuit}/suit` : <span className="text-xs text-muted-foreground">bundled</span>}</TableCell>
                    <TableCell className="font-mono">{a.totalAmount ? `Rs.${a.totalAmount.toLocaleString()}` : "-"}</TableCell>
                    <TableCell><Badge variant={a.status === "completed" ? "default" : "secondary"}>{a.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {a.status !== "completed" && (
                          <>
                            <Dialog open={completeDialog === a.id} onOpenChange={o => { setCompleteDialog(o ? a.id : null); if (!o) setCompleteForm({ piecesCompleted: "", piecesWaste: "", wasteReason: "" }); }}>
                              <DialogTrigger asChild><Button variant="ghost" size="icon" title="Complete"><CheckCircle className="h-4 w-4 text-green-600" /></Button></DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Complete Assignment</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <div><Label>Pieces Completed *</Label><Input type="number" value={completeForm.piecesCompleted} onChange={e => setCompleteForm({ ...completeForm, piecesCompleted: e.target.value })} /></div>
                                  <div><Label>Waste Pieces</Label><Input type="number" value={completeForm.piecesWaste} onChange={e => setCompleteForm({ ...completeForm, piecesWaste: e.target.value })} /></div>
                                  <div><Label>Waste Reason</Label><Input value={completeForm.wasteReason} onChange={e => setCompleteForm({ ...completeForm, wasteReason: e.target.value })} /></div>
                                  <Button className="w-full" onClick={() => handleComplete(a.id)}>Mark Complete</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Dialog open={transferDialog === a.id} onOpenChange={o => { setTransferDialog(o ? a.id : null); if (!o) setTransferForm({ newMasterId: "", quantityToTransfer: "" }); }}>
                              <DialogTrigger asChild><Button variant="ghost" size="icon" title="Transfer"><ArrowRightLeft className="h-4 w-4 text-blue-600" /></Button></DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Transfer to Another Master</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <div><Label>New Master *</Label>
                                    <Select value={transferForm.newMasterId} onValueChange={v => setTransferForm({ ...transferForm, newMasterId: v })}>
                                      <SelectTrigger><SelectValue placeholder="Select master" /></SelectTrigger>
                                      <SelectContent>{masters.filter(m => m.id !== a.masterId).map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div><Label>Quantity to Transfer * (max: {a.quantityGiven})</Label><Input type="number" max={a.quantityGiven} value={transferForm.quantityToTransfer} onChange={e => setTransferForm({ ...transferForm, quantityToTransfer: e.target.value })} /></div>
                                  <Button className="w-full" onClick={() => handleTransfer(a.id)}>Transfer</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="icon" onClick={() => apiDelete(`/stitching/assignments/${a.id}`).then(fetchJob)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell>{totalGiven}</TableCell>
                  <TableCell>{totalDone}</TableCell>
                  <TableCell className="text-orange-600">{totalWaste}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="font-mono text-green-700">Rs.{totalAmount.toLocaleString()}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Images</CardTitle></CardHeader>
        <CardContent>
          <ImageUpload entityType="stitching_job" entityId={job.id} />
        </CardContent>
      </Card>
    </div>
  );
}
