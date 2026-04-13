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
import { Plus, CheckCircle, Trash2, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { format } from "date-fns";

export default function StitchingDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [masters, setMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState<any>(null);
  const [transferDialog, setTransferDialog] = useState<any>(null);
  const { toast } = useToast();

  const [assignForm, setAssignForm] = useState({ masterId: "", componentName: "", size: "", quantityGiven: "", ratePerPiece: "", notes: "" });
  const [completeForm, setCompleteForm] = useState({ piecesCompleted: "", piecesWaste: "", wasteReason: "" });
  const [transferForm, setTransferForm] = useState({ newMasterId: "", quantityToTransfer: "" });

  const fetchJob = async () => {
    setLoading(true);
    try { const data = await apiGet(`/stitching/jobs/${id}`); setJob(data); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setLoading(false);
  };

  const fetchMasters = async () => { try { const data = await apiGet("/masters?type=stitching&active=true"); setMasters(data); } catch {} };

  useEffect(() => { fetchJob(); fetchMasters(); }, [id]);

  const handleAssign = async () => {
    try {
      await apiPost("/stitching/assignments", {
        jobId: parseInt(id!), masterId: parseInt(assignForm.masterId),
        componentName: assignForm.componentName, size: assignForm.size || undefined,
        quantityGiven: parseInt(assignForm.quantityGiven), ratePerPiece: parseFloat(assignForm.ratePerPiece), notes: assignForm.notes,
      });
      toast({ title: "Assignment created" });
      setAssignDialog(false);
      setAssignForm({ masterId: "", componentName: "", size: "", quantityGiven: "", ratePerPiece: "", notes: "" });
      fetchJob();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
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
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleTransfer = async (assignmentId: number) => {
    try {
      await apiPatch(`/stitching/assignments/${assignmentId}/transfer`, {
        newMasterId: parseInt(transferForm.newMasterId),
        quantityToTransfer: parseInt(transferForm.quantityToTransfer),
      });
      toast({ title: "Quantity transferred to new master" });
      setTransferDialog(null);
      setTransferForm({ newMasterId: "", quantityToTransfer: "" });
      fetchJob();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleUpdateStatus = async (status: string) => {
    try { await apiPatch(`/stitching/jobs/${id}`, { status }); fetchJob(); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!job) return <div className="text-center py-12 text-muted-foreground">Job not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={`STH-${String(job.id).padStart(4, "0")}`} description={`${job.articleName} (${job.articleCode}) | Supervisor: ${job.supervisorName}`} actions={
        <Select value={job.status} onValueChange={handleUpdateStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      } />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Job Date</div><div className="text-lg font-medium">{format(new Date(job.jobDate), "MMM d, yyyy")}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Status</div><Badge className="mt-1">{job.status.replace("_", " ")}</Badge></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Assignments</div><div className="text-lg font-medium">{job.assignments?.length || 0}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Master Assignments</CardTitle>
          {job.status !== "completed" && job.status !== "cancelled" && (
            <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Assign Master</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Assign Stitching Master</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Master *</Label>
                    <Select value={assignForm.masterId} onValueChange={v => setAssignForm({ ...assignForm, masterId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select master" /></SelectTrigger>
                      <SelectContent>{masters.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name} {m.machineNo ? `(M: ${m.machineNo})` : ""}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Component *</Label><Input value={assignForm.componentName} onChange={e => setAssignForm({ ...assignForm, componentName: e.target.value })} placeholder="e.g. Kameez" /></div>
                    <div><Label>Size</Label>
                      <Select value={assignForm.size} onValueChange={v => setAssignForm({ ...assignForm, size: v })}>
                        <SelectTrigger><SelectValue placeholder="All sizes" /></SelectTrigger>
                        <SelectContent>{["XS", "S", "M", "L", "XL", "XXL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Quantity *</Label><Input type="number" value={assignForm.quantityGiven} onChange={e => setAssignForm({ ...assignForm, quantityGiven: e.target.value })} /></div>
                    <div><Label>Rate/Piece *</Label><Input type="number" value={assignForm.ratePerPiece} onChange={e => setAssignForm({ ...assignForm, ratePerPiece: e.target.value })} /></div>
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
                {job.assignments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.masterName}</TableCell>
                    <TableCell>{a.machineNo || "-"}</TableCell>
                    <TableCell>{a.componentName}</TableCell>
                    <TableCell>{a.size || "All"}</TableCell>
                    <TableCell>{a.quantityGiven}</TableCell>
                    <TableCell>{a.piecesCompleted || "-"}</TableCell>
                    <TableCell>{a.piecesWaste || "-"}</TableCell>
                    <TableCell>Rs.{a.ratePerPiece}</TableCell>
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
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
