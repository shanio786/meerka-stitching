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
import { Plus, CheckCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { format } from "date-fns";

export default function CuttingDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [masters, setMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState<any>(null);
  const { toast } = useToast();

  const [assignForm, setAssignForm] = useState({ masterId: "", componentName: "", fabricType: "", fabricGivenMeters: "", estimatedPieces: "", ratePerPiece: "", notes: "", sizes: [{ size: "M", quantity: "" }] });
  const [completeForm, setCompleteForm] = useState({ piecesCut: "", wasteMeters: "", fabricReturnedMeters: "" });

  const fetchJob = async () => {
    setLoading(true);
    try { const data = await apiGet(`/cutting/jobs/${id}`); setJob(data); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setLoading(false);
  };

  const fetchMasters = async () => {
    try { const data = await apiGet("/masters?type=cutting&active=true"); setMasters(data); } catch {}
  };

  useEffect(() => { fetchJob(); fetchMasters(); }, [id]);

  const handleAssign = async () => {
    try {
      const sizes = assignForm.sizes.filter(s => s.quantity).map(s => ({ size: s.size, quantity: parseInt(s.quantity) }));
      await apiPost("/cutting/assignments", {
        jobId: parseInt(id!), masterId: parseInt(assignForm.masterId),
        componentName: assignForm.componentName, fabricType: assignForm.fabricType,
        fabricGivenMeters: parseFloat(assignForm.fabricGivenMeters),
        estimatedPieces: assignForm.estimatedPieces ? parseInt(assignForm.estimatedPieces) : undefined,
        ratePerPiece: assignForm.ratePerPiece ? parseFloat(assignForm.ratePerPiece) : undefined,
        notes: assignForm.notes, sizes,
      });
      toast({ title: "Assignment created" });
      setAssignDialog(false);
      setAssignForm({ masterId: "", componentName: "", fabricType: "", fabricGivenMeters: "", estimatedPieces: "", ratePerPiece: "", notes: "", sizes: [{ size: "M", quantity: "" }] });
      fetchJob();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
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
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm("Delete this assignment?")) return;
    try { await apiDelete(`/cutting/assignments/${assignmentId}`); fetchJob(); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleUpdateStatus = async (status: string) => {
    try { await apiPatch(`/cutting/jobs/${id}`, { status }); fetchJob(); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const addSizeRow = () => setAssignForm({ ...assignForm, sizes: [...assignForm.sizes, { size: "M", quantity: "" }] });

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!job) return <div className="text-center py-12 text-muted-foreground">Job not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={`CUT-${String(job.id).padStart(4, "0")}`} description={`${job.articleName} (${job.articleCode})`} actions={
        <div className="flex gap-2">
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
      } />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Job Date</div><div className="text-lg font-medium">{format(new Date(job.jobDate), "MMM d, yyyy")}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Status</div><Badge variant={job.status === "completed" ? "default" : "secondary"} className="mt-1">{job.status.replace("_", " ")}</Badge></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Assignments</div><div className="text-lg font-medium">{job.assignments?.length || 0}</div></CardContent></Card>
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
                    <div><Label>Component *</Label><Input value={assignForm.componentName} onChange={e => setAssignForm({ ...assignForm, componentName: e.target.value })} placeholder="e.g. Kameez, Trouser" /></div>
                    <div><Label>Fabric Type</Label><Input value={assignForm.fabricType} onChange={e => setAssignForm({ ...assignForm, fabricType: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Fabric Given (m) *</Label><Input type="number" value={assignForm.fabricGivenMeters} onChange={e => setAssignForm({ ...assignForm, fabricGivenMeters: e.target.value })} /></div>
                    <div><Label>Est. Pieces</Label><Input type="number" value={assignForm.estimatedPieces} onChange={e => setAssignForm({ ...assignForm, estimatedPieces: e.target.value })} /></div>
                    <div><Label>Rate/Piece</Label><Input type="number" value={assignForm.ratePerPiece} onChange={e => setAssignForm({ ...assignForm, ratePerPiece: e.target.value })} /></div>
                  </div>
                  <div>
                    <Label>Size Breakdown</Label>
                    {assignForm.sizes.map((s, i) => (
                      <div key={i} className="flex gap-2 mt-2">
                        <Select value={s.size} onValueChange={v => { const sizes = [...assignForm.sizes]; sizes[i].size = v; setAssignForm({ ...assignForm, sizes }); }}>
                          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>{["XS", "S", "M", "L", "XL", "XXL"].map(sz => <SelectItem key={sz} value={sz}>{sz}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" placeholder="Qty" value={s.quantity} onChange={e => { const sizes = [...assignForm.sizes]; sizes[i].quantity = e.target.value; setAssignForm({ ...assignForm, sizes }); }} />
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addSizeRow}><Plus className="h-3 w-3 mr-1" /> Add Size</Button>
                  </div>
                  <div><Label>Notes</Label><Input value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} /></div>
                  <Button className="w-full" onClick={handleAssign}>Assign Master</Button>
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
                  <TableHead>Component</TableHead>
                  <TableHead>Fabric Given</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Pieces Cut</TableHead>
                  <TableHead>Waste</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {job.assignments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.masterName}</TableCell>
                    <TableCell>{a.componentName}</TableCell>
                    <TableCell>{a.fabricGivenMeters}m</TableCell>
                    <TableCell>Rs.{a.ratePerPiece || a.ratePerSuit || 0}</TableCell>
                    <TableCell>{a.piecesCut || "-"}</TableCell>
                    <TableCell>{a.wasteMeters ? `${a.wasteMeters}m` : "-"}</TableCell>
                    <TableCell className="font-mono">{a.totalAmount ? `Rs.${a.totalAmount.toLocaleString()}` : "-"}</TableCell>
                    <TableCell><Badge variant={a.status === "completed" ? "default" : "secondary"}>{a.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {a.status !== "completed" && (
                          <Dialog open={completeDialog === a.id} onOpenChange={o => { setCompleteDialog(o ? a.id : null); if (!o) setCompleteForm({ piecesCut: "", wasteMeters: "", fabricReturnedMeters: "" }); }}>
                            <DialogTrigger asChild><Button variant="ghost" size="icon" title="Complete"><CheckCircle className="h-4 w-4 text-green-600" /></Button></DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Complete Assignment</DialogTitle></DialogHeader>
                              <div className="space-y-4">
                                <div><Label>Pieces Cut *</Label><Input type="number" value={completeForm.piecesCut} onChange={e => setCompleteForm({ ...completeForm, piecesCut: e.target.value })} /></div>
                                <div><Label>Waste (meters)</Label><Input type="number" value={completeForm.wasteMeters} onChange={e => setCompleteForm({ ...completeForm, wasteMeters: e.target.value })} /></div>
                                <div><Label>Fabric Returned (meters)</Label><Input type="number" value={completeForm.fabricReturnedMeters} onChange={e => setCompleteForm({ ...completeForm, fabricReturnedMeters: e.target.value })} /></div>
                                <Button className="w-full" onClick={() => handleComplete(a.id)}>Mark Complete</Button>
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
