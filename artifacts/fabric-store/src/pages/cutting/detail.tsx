import { useState, useEffect } from "react";
import { useParams } from "wouter";
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
import { Plus, CheckCircle, Trash2, Calculator, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { format } from "date-fns";
import { Link } from "wouter";

interface SizeRow {
  size: string;
  quantity: string;
}

interface Assignment {
  id: number;
  masterName: string;
  componentName: string;
  fabricType: string;
  fabricGivenMeters: number;
  fabricPerPiece: number | null;
  estimatedPieces: number | null;
  ratePerPiece: number | null;
  piecesCut: number | null;
  wasteMeters: number | null;
  fabricReturnedMeters: number | null;
  totalAmount: number | null;
  status: string;
  notes: string | null;
  sizes: { size: string; quantity: number; completedQty: number | null }[];
}

interface CuttingJob {
  id: number;
  articleName: string;
  articleCode: string;
  jobDate: string;
  status: string;
  notes: string | null;
  assignments: Assignment[];
}

interface Master {
  id: number;
  name: string;
  machineNo: string | null;
}

export default function CuttingDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<CuttingJob | null>(null);
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState<number | null>(null);
  const { toast } = useToast();

  const [assignForm, setAssignForm] = useState({
    masterId: "", componentName: "", fabricType: "",
    fabricGivenMeters: "", fabricPerPiece: "", estimatedPieces: "",
    ratePerPiece: "", notes: "", sizes: [{ size: "M", quantity: "" }] as SizeRow[],
  });
  const [completeForm, setCompleteForm] = useState({ piecesCut: "", wasteMeters: "", fabricReturnedMeters: "" });

  const fetchJob = async () => {
    setLoading(true);
    try {
      const data = await apiGet<CuttingJob>(`/cutting/jobs/${id}`);
      setJob(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
    setLoading(false);
  };

  const fetchMasters = async () => {
    try { const data = await apiGet<Master[]>("/masters?type=cutting&active=true"); setMasters(data); } catch {}
  };

  useEffect(() => { fetchJob(); fetchMasters(); }, [id]);

  const calcEstimate = (fabricGiven: string, fabricPerPiece: string) => {
    const given = parseFloat(fabricGiven);
    const perPiece = parseFloat(fabricPerPiece);
    if (given > 0 && perPiece > 0) {
      return Math.floor(given / perPiece).toString();
    }
    return "";
  };

  const handleFabricGivenChange = (value: string) => {
    const est = calcEstimate(value, assignForm.fabricPerPiece);
    setAssignForm({ ...assignForm, fabricGivenMeters: value, estimatedPieces: est || assignForm.estimatedPieces });
  };

  const handleFabricPerPieceChange = (value: string) => {
    const est = calcEstimate(assignForm.fabricGivenMeters, value);
    setAssignForm({ ...assignForm, fabricPerPiece: value, estimatedPieces: est || assignForm.estimatedPieces });
  };

  const handleAssign = async () => {
    if (!assignForm.masterId || !assignForm.componentName || !assignForm.fabricGivenMeters) {
      toast({ title: "Error", description: "Master, component, and fabric given are required", variant: "destructive" });
      return;
    }
    try {
      const sizes = assignForm.sizes.filter(s => s.quantity).map(s => ({ size: s.size, quantity: parseInt(s.quantity) }));
      await apiPost("/cutting/assignments", {
        jobId: parseInt(id!), masterId: parseInt(assignForm.masterId),
        componentName: assignForm.componentName, fabricType: assignForm.fabricType,
        fabricGivenMeters: parseFloat(assignForm.fabricGivenMeters),
        fabricPerPiece: assignForm.fabricPerPiece ? parseFloat(assignForm.fabricPerPiece) : undefined,
        estimatedPieces: assignForm.estimatedPieces ? parseInt(assignForm.estimatedPieces) : undefined,
        ratePerPiece: assignForm.ratePerPiece ? parseFloat(assignForm.ratePerPiece) : undefined,
        notes: assignForm.notes, sizes,
      } as Record<string, unknown>);
      toast({ title: "Assignment created" });
      setAssignDialog(false);
      setAssignForm({ masterId: "", componentName: "", fabricType: "", fabricGivenMeters: "", fabricPerPiece: "", estimatedPieces: "", ratePerPiece: "", notes: "", sizes: [{ size: "M", quantity: "" }] });
      fetchJob();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleComplete = async (assignmentId: number) => {
    try {
      await apiPatch(`/cutting/assignments/${assignmentId}/complete`, {
        piecesCut: parseInt(completeForm.piecesCut),
        wasteMeters: completeForm.wasteMeters ? parseFloat(completeForm.wasteMeters) : 0,
        fabricReturnedMeters: completeForm.fabricReturnedMeters ? parseFloat(completeForm.fabricReturnedMeters) : 0,
      });
      toast({ title: "Assignment completed, amount credited to master" });
      setCompleteDialog(null);
      setCompleteForm({ piecesCut: "", wasteMeters: "", fabricReturnedMeters: "" });
      fetchJob();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to complete";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm("Delete this assignment?")) return;
    try {
      await apiDelete(`/cutting/assignments/${assignmentId}`);
      fetchJob();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await apiPatch(`/cutting/jobs/${id}`, { status });
      fetchJob();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const addSizeRow = () => setAssignForm({ ...assignForm, sizes: [...assignForm.sizes, { size: "M", quantity: "" }] });
  const removeSizeRow = (idx: number) => setAssignForm({ ...assignForm, sizes: assignForm.sizes.filter((_, i) => i !== idx) });

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!job) return <div className="text-center py-12 text-muted-foreground">Job not found</div>;

  const totalFabricGiven = job.assignments.reduce((s, a) => s + a.fabricGivenMeters, 0);
  const totalEstimated = job.assignments.reduce((s, a) => s + (a.estimatedPieces || 0), 0);
  const totalCut = job.assignments.reduce((s, a) => s + (a.piecesCut || 0), 0);
  const totalWaste = job.assignments.reduce((s, a) => s + (a.wasteMeters || 0), 0);
  const totalAmount = job.assignments.reduce((s, a) => s + (a.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cutting">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">CUT-{String(job.id).padStart(4, "0")}</h1>
          <p className="text-muted-foreground">{job.articleName} ({job.articleCode})</p>
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
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Job Date</div>
            <div className="text-lg font-medium">{format(new Date(job.jobDate), "MMM d, yyyy")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Total Fabric Given</div>
            <div className="text-lg font-bold">{totalFabricGiven}m</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Estimated / Cut</div>
            <div className="text-lg font-bold">{totalEstimated > 0 ? `${totalCut} / ${totalEstimated}` : totalCut || "-"} <span className="text-sm font-normal">pcs</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Waste</div>
            <div className="text-lg font-bold text-orange-600">{totalWaste}m</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Total Amount</div>
            <div className="text-lg font-bold text-green-600">Rs.{totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Master Assignments</CardTitle>
          {job.status !== "completed" && job.status !== "cancelled" && (
            <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Assign Master</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Assign Cutting Master</DialogTitle></DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  <div><Label>Master *</Label>
                    <Select value={assignForm.masterId} onValueChange={v => setAssignForm({ ...assignForm, masterId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select master" /></SelectTrigger>
                      <SelectContent>{masters.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name} {m.machineNo ? `(${m.machineNo})` : ""}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Component *</Label><Input value={assignForm.componentName} onChange={e => setAssignForm({ ...assignForm, componentName: e.target.value })} placeholder="e.g. Shirt, Trouser, Dupatta" /></div>
                    <div><Label>Fabric Type</Label><Input value={assignForm.fabricType} onChange={e => setAssignForm({ ...assignForm, fabricType: e.target.value })} placeholder="e.g. Lawn, Cotton" /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Total Fabric Given (m) *</Label><Input type="number" step="0.1" value={assignForm.fabricGivenMeters} onChange={e => handleFabricGivenChange(e.target.value)} placeholder="e.g. 300" /></div>
                    <div><Label>Fabric Per Piece (m)</Label><Input type="number" step="0.1" value={assignForm.fabricPerPiece} onChange={e => handleFabricPerPieceChange(e.target.value)} placeholder="e.g. 3" /></div>
                  </div>

                  {assignForm.fabricGivenMeters && assignForm.fabricPerPiece && assignForm.estimatedPieces && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800">
                        <strong>{assignForm.fabricGivenMeters}m</strong> fabric / <strong>{assignForm.fabricPerPiece}m</strong> per piece = <strong className="text-lg">{assignForm.estimatedPieces} pieces</strong> estimated
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Estimated Pieces</Label>
                      <Input type="number" value={assignForm.estimatedPieces} onChange={e => setAssignForm({ ...assignForm, estimatedPieces: e.target.value })} placeholder="Auto or manual" />
                      <p className="text-xs text-muted-foreground mt-1">Auto-calculated or enter manually</p>
                    </div>
                    <div>
                      <Label>Rate / Piece (Rs.)</Label>
                      <Input type="number" step="0.5" value={assignForm.ratePerPiece} onChange={e => setAssignForm({ ...assignForm, ratePerPiece: e.target.value })} placeholder="e.g. 40" />
                      {assignForm.estimatedPieces && assignForm.ratePerPiece && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          Est. amount: Rs.{(parseInt(assignForm.estimatedPieces) * parseFloat(assignForm.ratePerPiece)).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Size Breakdown</Label>
                    <p className="text-xs text-muted-foreground mb-2">Kitne pieces kis size ke cutting karne hain</p>
                    {assignForm.sizes.map((s, i) => (
                      <div key={i} className="flex gap-2 mt-2 items-center">
                        <Select value={s.size} onValueChange={v => { const sizes = [...assignForm.sizes]; sizes[i].size = v; setAssignForm({ ...assignForm, sizes }); }}>
                          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>{["XS", "S", "M", "L", "XL", "XXL"].map(sz => <SelectItem key={sz} value={sz}>{sz}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" placeholder="Qty" value={s.quantity} onChange={e => { const sizes = [...assignForm.sizes]; sizes[i].quantity = e.target.value; setAssignForm({ ...assignForm, sizes }); }} />
                        {assignForm.sizes.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeSizeRow(i)} className="shrink-0"><Trash2 className="h-3 w-3 text-muted-foreground" /></Button>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-3 mt-2">
                      <Button type="button" variant="outline" size="sm" onClick={addSizeRow}><Plus className="h-3 w-3 mr-1" /> Add Size</Button>
                      {assignForm.sizes.filter(s => s.quantity).length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Total: {assignForm.sizes.reduce((s, r) => s + (parseInt(r.quantity) || 0), 0)} pieces
                        </span>
                      )}
                    </div>
                  </div>

                  <div><Label>Notes</Label><Input value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} placeholder="Any special instructions" /></div>
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
                  <TableHead className="text-right">Fabric Given</TableHead>
                  <TableHead className="text-right">Per Piece</TableHead>
                  <TableHead className="text-right">Estimated</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Pieces Cut</TableHead>
                  <TableHead className="text-right">Waste</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {job.assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.masterName}</TableCell>
                    <TableCell>
                      <div>{a.componentName}</div>
                      {a.fabricType && <div className="text-xs text-muted-foreground">{a.fabricType}</div>}
                    </TableCell>
                    <TableCell className="text-right font-mono">{a.fabricGivenMeters}m</TableCell>
                    <TableCell className="text-right font-mono">{a.fabricPerPiece ? `${a.fabricPerPiece}m` : "-"}</TableCell>
                    <TableCell className="text-right">
                      {a.estimatedPieces ? (
                        <span className="font-mono font-bold text-blue-600">{a.estimatedPieces} pcs</span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">Rs.{a.ratePerPiece || 0}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{a.piecesCut || "-"}</TableCell>
                    <TableCell className="text-right font-mono text-orange-600">{a.wasteMeters ? `${a.wasteMeters}m` : "-"}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-green-600">{a.totalAmount ? `Rs.${a.totalAmount.toLocaleString()}` : "-"}</TableCell>
                    <TableCell><Badge variant={a.status === "completed" ? "default" : "secondary"}>{a.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {a.status !== "completed" && (
                          <Dialog open={completeDialog === a.id} onOpenChange={o => { setCompleteDialog(o ? a.id : null); if (!o) setCompleteForm({ piecesCut: "", wasteMeters: "", fabricReturnedMeters: "" }); }}>
                            <DialogTrigger asChild><Button variant="ghost" size="icon" title="Complete"><CheckCircle className="h-4 w-4 text-green-600" /></Button></DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Complete Assignment — {a.masterName}</DialogTitle></DialogHeader>
                              <div className="space-y-4">
                                {a.estimatedPieces && (
                                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                                    <div>Component: <strong>{a.componentName}</strong></div>
                                    <div>Fabric Given: <strong>{a.fabricGivenMeters}m</strong></div>
                                    <div>Estimated: <strong>{a.estimatedPieces} pieces</strong></div>
                                  </div>
                                )}
                                <div><Label>Pieces Actually Cut *</Label><Input type="number" value={completeForm.piecesCut} onChange={e => setCompleteForm({ ...completeForm, piecesCut: e.target.value })} placeholder={a.estimatedPieces ? `Estimated: ${a.estimatedPieces}` : "Enter pieces cut"} /></div>
                                <div><Label>Waste Fabric (meters)</Label><Input type="number" step="0.1" value={completeForm.wasteMeters} onChange={e => setCompleteForm({ ...completeForm, wasteMeters: e.target.value })} /></div>
                                <div><Label>Fabric Returned (meters)</Label><Input type="number" step="0.1" value={completeForm.fabricReturnedMeters} onChange={e => setCompleteForm({ ...completeForm, fabricReturnedMeters: e.target.value })} /></div>
                                {completeForm.piecesCut && a.ratePerPiece && (
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                                    Payment: <strong>{completeForm.piecesCut} pieces x Rs.{a.ratePerPiece} = Rs.{(parseInt(completeForm.piecesCut) * a.ratePerPiece).toLocaleString()}</strong>
                                  </div>
                                )}
                                <Button className="w-full" onClick={() => handleComplete(a.id)}>Mark Complete & Credit Master</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {a.status !== "completed" && <Button variant="ghost" size="icon" onClick={() => handleDeleteAssignment(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {job.assignments.length > 1 && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right font-mono">{totalFabricGiven}m</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-mono text-blue-600">{totalEstimated > 0 ? `${totalEstimated} pcs` : "-"}</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-mono">{totalCut || "-"}</TableCell>
                    <TableCell className="text-right font-mono text-orange-600">{totalWaste > 0 ? `${totalWaste}m` : "-"}</TableCell>
                    <TableCell className="text-right font-mono text-green-600">{totalAmount > 0 ? `Rs.${totalAmount.toLocaleString()}` : "-"}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {job.assignments.some(a => a.sizes && a.sizes.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Size Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Master</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Target Qty</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {job.assignments.flatMap(a =>
                  (a.sizes || []).map((s, i) => (
                    <TableRow key={`${a.id}-${i}`}>
                      {i === 0 && <TableCell rowSpan={a.sizes.length} className="font-medium">{a.masterName}</TableCell>}
                      {i === 0 && <TableCell rowSpan={a.sizes.length}>{a.componentName}</TableCell>}
                      <TableCell><Badge variant="outline">{s.size}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{s.quantity}</TableCell>
                      <TableCell className="text-right font-mono">{s.completedQty ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
