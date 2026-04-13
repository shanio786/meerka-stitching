import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Package, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { format } from "date-fns";

interface StoreEntry {
  id: number;
  articleId: number;
  articleName: string;
  articleCode: string;
  receivedBy: string;
  receivedFrom: string;
  size: string | null;
  packedQty: number;
  notes: string | null;
  date: string;
}

interface ArticleOption { id: number; articleCode: string; articleName: string; }

export default function FinalStore() {
  const [entries, setEntries] = useState<StoreEntry[]>([]);
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({ articleId: "", receivedBy: "", receivedFrom: "", size: "", packedQty: "", notes: "", date: new Date().toISOString().split("T")[0] });

  const fetchEntries = async () => {
    setLoading(true);
    try { const data = await apiGet<StoreEntry[]>("/final-store"); setEntries(data); } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
    apiGet<ArticleOption[]>("/articles").then(setArticles).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.articleId || !form.receivedBy || !form.receivedFrom || !form.packedQty) { toast({ title: "Fill required fields", variant: "destructive" }); return; }
    try {
      await apiPost("/final-store", {
        articleId: parseInt(form.articleId), receivedBy: form.receivedBy, receivedFrom: form.receivedFrom,
        size: form.size || undefined, packedQty: parseInt(form.packedQty), notes: form.notes, date: form.date,
      });
      toast({ title: "Receipt added to final store" });
      setDialogOpen(false);
      setForm({ articleId: "", receivedBy: "", receivedFrom: "", size: "", packedQty: "", notes: "", date: new Date().toISOString().split("T")[0] });
      fetchEntries();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.articleName.toLowerCase().includes(q) || e.articleCode.toLowerCase().includes(q) || e.receivedBy.toLowerCase().includes(q) || e.receivedFrom.toLowerCase().includes(q);
  });

  const totalPacked = filtered.reduce((s, e) => s + e.packedQty, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Final Store" description="Finished goods received and stored - ready for dispatch" actions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Receive Stock</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Receive in Final Store</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Article *</Label>
                <Select value={form.articleId} onValueChange={v => setForm({ ...form, articleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select article" /></SelectTrigger>
                  <SelectContent>{articles.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.articleCode} - {a.articleName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Received By *</Label><Input value={form.receivedBy} onChange={e => setForm({ ...form, receivedBy: e.target.value })} /></div>
                <div><Label>Received From *</Label><Input value={form.receivedFrom} onChange={e => setForm({ ...form, receivedFrom: e.target.value })} placeholder="e.g. Finishing Dept" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Size</Label>
                  <Select value={form.size} onValueChange={v => setForm({ ...form, size: v })}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>{["XS", "S", "M", "L", "XL", "XXL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Packed Qty *</Label><Input type="number" value={form.packedQty} onChange={e => setForm({ ...form, packedQty: e.target.value })} /></div>
              </div>
              <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate}>Receive Stock</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><Package className="h-4 w-4" /> Total Packed in Store</div><div className="text-2xl font-bold">{totalPacked.toLocaleString()} pcs</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Receipts</div><div className="text-2xl font-bold">{filtered.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by article, receiver..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !filtered.length ? (
            <div className="text-center py-12 text-muted-foreground"><Package className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-lg font-medium">No stock in final store</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-center">Packed Qty</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{format(new Date(e.date), "MMM d, yyyy")}</TableCell>
                    <TableCell><div className="font-medium">{e.articleName}</div><div className="text-xs text-muted-foreground">{e.articleCode}</div></TableCell>
                    <TableCell>{e.receivedBy}</TableCell>
                    <TableCell>{e.receivedFrom}</TableCell>
                    <TableCell>{e.size || "All"}</TableCell>
                    <TableCell className="text-center font-mono font-medium">{e.packedQty}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{e.notes || "-"}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) apiDelete(`/final-store/${e.id}`).then(fetchEntries); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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
