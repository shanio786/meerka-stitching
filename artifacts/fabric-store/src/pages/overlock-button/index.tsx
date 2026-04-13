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
import { Plus, CheckCircle, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { format } from "date-fns";
import { SearchableSelect } from "@/components/SearchableSelect";

interface OBEntry {
  id: number;
  articleId: number;
  articleName: string;
  articleCode: string;
  taskType: string;
  masterId: number;
  masterName: string;
  componentName: string | null;
  size: string | null;
  receivedQty: number;
  completedQty: number | null;
  wasteQty: number | null;
  wasteReason: string | null;
  ratePerPiece: number | null;
  totalAmount: number | null;
  receivedBy: string | null;
  status: string;
  date: string;
}

interface ArticleOption { id: number; articleCode: string; articleName: string; }
interface MasterOption { id: number; name: string; masterType: string; }

export default function OverlockButton() {
  const [entries, setEntries] = useState<OBEntry[]>([]);
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [masters, setMasters] = useState<MasterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskType, setTaskType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completeDialog, setCompleteDialog] = useState<number | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({ articleId: "", taskType: "overlock", masterId: "", componentName: "", size: "", receivedQty: "", ratePerPiece: "", receivedBy: "", notes: "", date: new Date().toISOString().split("T")[0] });
  const [completeForm, setCompleteForm] = useState({ completedQty: "", wasteQty: "", wasteReason: "" });

  const fetchEntries = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (taskType !== "all") params.set("taskType", taskType);
    if (statusFilter !== "all") params.set("status", statusFilter);
    try { const data = await apiGet<OBEntry[]>(`/overlock-button?${params}`); setEntries(data); } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
    apiGet<ArticleOption[]>("/articles").then(setArticles).catch(() => {});
    apiGet<MasterOption[]>("/masters?active=true").then(setMasters).catch(() => {});
  }, [taskType, statusFilter]);

  const handleCreate = async () => {
    if (!form.articleId || !form.masterId || !form.receivedQty) { toast({ title: "Fill required fields", variant: "destructive" }); return; }
    try {
      await apiPost("/overlock-button", {
        articleId: parseInt(form.articleId), taskType: form.taskType, masterId: parseInt(form.masterId),
        componentName: form.componentName || undefined, size: form.size || undefined,
        receivedQty: parseInt(form.receivedQty), ratePerPiece: form.ratePerPiece ? parseFloat(form.ratePerPiece) : undefined,
        receivedBy: form.receivedBy, notes: form.notes, date: form.date,
      });
      toast({ title: "Entry added" });
      setDialogOpen(false);
      setForm({ articleId: "", taskType: "overlock", masterId: "", componentName: "", size: "", receivedQty: "", ratePerPiece: "", receivedBy: "", notes: "", date: new Date().toISOString().split("T")[0] });
      fetchEntries();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleComplete = async (entryId: number) => {
    try {
      await apiPatch(`/overlock-button/${entryId}/complete`, {
        completedQty: parseInt(completeForm.completedQty),
        wasteQty: completeForm.wasteQty ? parseInt(completeForm.wasteQty) : 0,
        wasteReason: completeForm.wasteReason,
      });
      toast({ title: "Entry completed, amount credited" });
      setCompleteDialog(null);
      setCompleteForm({ completedQty: "", wasteQty: "", wasteReason: "" });
      fetchEntries();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to complete";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.articleName.toLowerCase().includes(q) || e.masterName.toLowerCase().includes(q) || e.articleCode.toLowerCase().includes(q);
  });

  const articleOptions = articles.map(a => ({ value: a.id.toString(), label: `${a.articleCode} - ${a.articleName}`, sublabel: a.articleCode }));
  const masterOptions = masters.filter(m => m.masterType === "overlock" || m.masterType === "button").map(m => ({ value: m.id.toString(), label: `${m.name} (${m.masterType})` }));

  return (
    <div className="space-y-6">
      <PageHeader title="Overlock / Button" description="Track overlock and button work assigned to masters" actions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Entry</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Overlock/Button Entry</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div><Label>Task Type *</Label>
                <Select value={form.taskType} onValueChange={v => setForm({ ...form, taskType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="overlock">Overlock</SelectItem><SelectItem value="button">Button</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Article *</Label>
                <SearchableSelect options={articleOptions} value={form.articleId} onValueChange={v => setForm({ ...form, articleId: v })} placeholder="Search & select article" searchPlaceholder="Type article name or code..." />
              </div>
              <div><Label>Master *</Label>
                <SearchableSelect options={masterOptions} value={form.masterId} onValueChange={v => setForm({ ...form, masterId: v })} placeholder="Search & select master" searchPlaceholder="Search master..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Received Qty *</Label><Input type="number" value={form.receivedQty} onChange={e => setForm({ ...form, receivedQty: e.target.value })} /></div>
                <div><Label>Rate/Piece</Label><Input type="number" value={form.ratePerPiece} onChange={e => setForm({ ...form, ratePerPiece: e.target.value })} /></div>
              </div>
              <div><Label>Size</Label>
                <Select value={form.size} onValueChange={v => setForm({ ...form, size: v })}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>{["XS", "S", "M", "L", "XL", "XXL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Received By</Label><Input value={form.receivedBy} onChange={e => setForm({ ...form, receivedBy: e.target.value })} placeholder="Person who received pieces" /></div>
              <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate}>Add Entry</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by article, master..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Tasks</SelectItem><SelectItem value="overlock">Overlock</SelectItem><SelectItem value="button">Button</SelectItem></SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !filtered.length ? (
            <div className="text-center py-12 text-muted-foreground"><p className="text-lg font-medium">No entries</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead>Master</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-center">Received</TableHead>
                    <TableHead className="text-center">Done</TableHead>
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
                      <TableCell><Badge variant="outline">{e.taskType}</Badge></TableCell>
                      <TableCell><div className="font-medium">{e.articleName}</div><div className="text-xs text-muted-foreground">{e.articleCode}</div></TableCell>
                      <TableCell>{e.masterName}</TableCell>
                      <TableCell>{e.size || "-"}</TableCell>
                      <TableCell className="text-center">{e.receivedQty}</TableCell>
                      <TableCell className="text-center">{e.completedQty || "-"}</TableCell>
                      <TableCell className="text-center">{e.wasteQty || "-"}</TableCell>
                      <TableCell>{e.ratePerPiece ? `Rs.${e.ratePerPiece}` : "-"}</TableCell>
                      <TableCell className="font-mono">{e.totalAmount ? `Rs.${e.totalAmount.toLocaleString()}` : "-"}</TableCell>
                      <TableCell><Badge variant={e.status === "completed" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {e.status !== "completed" && (
                            <Dialog open={completeDialog === e.id} onOpenChange={o => { setCompleteDialog(o ? e.id : null); if (!o) setCompleteForm({ completedQty: "", wasteQty: "", wasteReason: "" }); }}>
                              <DialogTrigger asChild><Button variant="ghost" size="icon"><CheckCircle className="h-4 w-4 text-green-600" /></Button></DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Complete Entry</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <div><Label>Completed Qty *</Label><Input type="number" value={completeForm.completedQty} onChange={ev => setCompleteForm({ ...completeForm, completedQty: ev.target.value })} /></div>
                                  <div><Label>Waste Qty</Label><Input type="number" value={completeForm.wasteQty} onChange={ev => setCompleteForm({ ...completeForm, wasteQty: ev.target.value })} /></div>
                                  <div><Label>Waste Reason</Label><Input value={completeForm.wasteReason} onChange={ev => setCompleteForm({ ...completeForm, wasteReason: ev.target.value })} /></div>
                                  <Button className="w-full" onClick={() => handleComplete(e.id)}>Mark Complete</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) apiDelete(`/overlock-button/${e.id}`).then(fetchEntries); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
