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
import { Plus, Trash2, CheckCircle, XCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { format } from "date-fns";
import { SearchableSelect } from "@/components/SearchableSelect";

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
  receivedQty: number;
  passedQty: number;
  rejectedQty: number;
  rejectionReason: string | null;
  notes: string | null;
  date: string;
}

interface ArticleOption { id: number; articleCode: string; articleName: string; }
interface MasterOption { id: number; name: string; masterType: string; }

export default function QCEntries() {
  const [entries, setEntries] = useState<QCEntry[]>([]);
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [masters, setMasters] = useState<MasterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({ articleId: "", inspectorName: "", masterId: "", componentName: "", size: "", receivedFrom: "", receivedQty: "", passedQty: "", rejectedQty: "", rejectionReason: "", notes: "", date: new Date().toISOString().split("T")[0] });

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

  const handleCreate = async () => {
    if (!form.articleId || !form.inspectorName || !form.receivedQty) { toast({ title: "Fill required fields", variant: "destructive" }); return; }
    try {
      await apiPost("/qc", {
        articleId: parseInt(form.articleId), inspectorName: form.inspectorName,
        masterId: form.masterId ? parseInt(form.masterId) : undefined,
        componentName: form.componentName || undefined, size: form.size || undefined,
        receivedFrom: form.receivedFrom || undefined,
        receivedQty: parseInt(form.receivedQty), passedQty: parseInt(form.passedQty || "0"),
        rejectedQty: parseInt(form.rejectedQty || "0"), rejectionReason: form.rejectionReason, notes: form.notes, date: form.date,
      });
      toast({ title: "QC entry added" });
      setDialogOpen(false);
      setForm({ articleId: "", inspectorName: "", masterId: "", componentName: "", size: "", receivedFrom: "", receivedQty: "", passedQty: "", rejectedQty: "", rejectionReason: "", notes: "", date: new Date().toISOString().split("T")[0] });
      fetchEntries();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const passRate = (e: QCEntry) => e.receivedQty > 0 ? ((e.passedQty / e.receivedQty) * 100).toFixed(1) : "0";

  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.articleName.toLowerCase().includes(q) || e.articleCode.toLowerCase().includes(q) || e.inspectorName.toLowerCase().includes(q) || (e.masterName || "").toLowerCase().includes(q);
  });

  const articleOptions = articles.map(a => ({ value: a.id.toString(), label: `${a.articleCode} - ${a.articleName}`, sublabel: a.articleCode }));
  const masterOptions = masters.filter(m => m.masterType === "stitching").map(m => ({ value: m.id.toString(), label: m.name }));

  return (
    <div className="space-y-6">
      <PageHeader title="Quality Control" description="Inspect stitched pieces - track passed, rejected, and rejection reasons" actions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New QC Entry</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add QC Entry</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div><Label>Article *</Label>
                <SearchableSelect options={articleOptions} value={form.articleId} onValueChange={v => setForm({ ...form, articleId: v })} placeholder="Search & select article" searchPlaceholder="Type article name or code..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Inspector Name *</Label><Input value={form.inspectorName} onChange={e => setForm({ ...form, inspectorName: e.target.value })} /></div>
                <div><Label>Master (stitching)</Label>
                  <SearchableSelect options={masterOptions} value={form.masterId} onValueChange={v => setForm({ ...form, masterId: v })} placeholder="Select master" searchPlaceholder="Search master..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Component</Label><Input value={form.componentName} onChange={e => setForm({ ...form, componentName: e.target.value })} /></div>
                <div><Label>Size</Label>
                  <Select value={form.size} onValueChange={v => setForm({ ...form, size: v })}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>{["XS", "S", "M", "L", "XL", "XXL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Received *</Label><Input type="number" value={form.receivedQty} onChange={e => setForm({ ...form, receivedQty: e.target.value })} /></div>
                <div><Label>Passed</Label><Input type="number" value={form.passedQty} onChange={e => setForm({ ...form, passedQty: e.target.value })} /></div>
                <div><Label>Rejected</Label><Input type="number" value={form.rejectedQty} onChange={e => setForm({ ...form, rejectedQty: e.target.value })} /></div>
              </div>
              <div><Label>Received From</Label><Input value={form.receivedFrom} onChange={e => setForm({ ...form, receivedFrom: e.target.value })} placeholder="e.g. Stitching Dept / Master name" /></div>
              <div><Label>Rejection Reason</Label><Input value={form.rejectionReason} onChange={e => setForm({ ...form, rejectionReason: e.target.value })} placeholder="e.g. Uneven stitch, thread loose" /></div>
              <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate}>Add QC Entry</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

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
                    <TableHead className="text-center">Received</TableHead>
                    <TableHead className="text-center">Passed</TableHead>
                    <TableHead className="text-center">Rejected</TableHead>
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
                      <TableCell>{e.size || "-"}</TableCell>
                      <TableCell className="text-center font-mono">{e.receivedQty}</TableCell>
                      <TableCell className="text-center font-mono text-green-600">{e.passedQty}</TableCell>
                      <TableCell className="text-center font-mono text-destructive">{e.rejectedQty}</TableCell>
                      <TableCell><Badge variant={parseFloat(passRate(e)) >= 90 ? "default" : "destructive"}>{passRate(e)}%</Badge></TableCell>
                      <TableCell className="max-w-[120px] truncate">{e.rejectionReason || "-"}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) apiDelete(`/qc/${e.id}`).then(fetchEntries); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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
