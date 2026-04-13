import { useState, useEffect } from "react";
import { Link } from "wouter";
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
import { Plus, Eye, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost } from "@/lib/api";
import { format } from "date-fns";

interface StitchingJob {
  id: number;
  articleId: number;
  articleName: string;
  articleCode: string;
  supervisorName: string;
  jobDate: string;
  status: string;
  notes: string | null;
}

interface ArticleOption {
  id: number;
  articleCode: string;
  articleName: string;
}

export default function StitchingJobs() {
  const [jobs, setJobs] = useState<StitchingJob[]>([]);
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({ articleId: "", supervisorName: "", jobDate: new Date().toISOString().split("T")[0], notes: "" });

  const fetchJobs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    try { const data = await apiGet<StitchingJob[]>(`/stitching/jobs?${params}`); setJobs(data); } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
    setLoading(false);
  };

  const fetchArticles = async () => { try { const data = await apiGet<ArticleOption[]>("/articles"); setArticles(data); } catch {} };

  useEffect(() => { fetchJobs(); fetchArticles(); }, [statusFilter]);

  const handleCreate = async () => {
    if (!form.articleId || !form.supervisorName) { toast({ title: "Fill required fields", variant: "destructive" }); return; }
    try {
      await apiPost("/stitching/jobs", { articleId: parseInt(form.articleId), supervisorName: form.supervisorName, jobDate: form.jobDate, notes: form.notes });
      toast({ title: "Stitching job created" });
      setDialogOpen(false);
      setForm({ articleId: "", supervisorName: "", jobDate: new Date().toISOString().split("T")[0], notes: "" });
      fetchJobs();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const filtered = jobs.filter(j => {
    if (!search) return true;
    const q = search.toLowerCase();
    return j.articleName.toLowerCase().includes(q) || j.articleCode.toLowerCase().includes(q) || j.supervisorName.toLowerCase().includes(q) || `STH-${String(j.id).padStart(4, "0")}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Stitching Jobs" description="Manage stitching jobs and master assignments" actions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Job</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Stitching Job</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Article *</Label>
                <Select value={form.articleId} onValueChange={v => setForm({ ...form, articleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select article" /></SelectTrigger>
                  <SelectContent>{articles.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.articleCode} - {a.articleName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Supervisor Name *</Label><Input value={form.supervisorName} onChange={e => setForm({ ...form, supervisorName: e.target.value })} /></div>
              <div><Label>Job Date *</Label><Input type="date" value={form.jobDate} onChange={e => setForm({ ...form, jobDate: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate}>Create Job</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !filtered.length ? (
            <div className="text-center py-12 text-muted-foreground"><p className="text-lg font-medium">No stitching jobs</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(j => (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono font-medium">STH-{String(j.id).padStart(4, "0")}</TableCell>
                    <TableCell><div className="font-medium">{j.articleName}</div><div className="text-xs text-muted-foreground">{j.articleCode}</div></TableCell>
                    <TableCell>{j.supervisorName}</TableCell>
                    <TableCell>{format(new Date(j.jobDate), "MMM d, yyyy")}</TableCell>
                    <TableCell><Badge variant={j.status === "completed" ? "default" : "secondary"}>{j.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-right"><Link href={`/stitching/${j.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link></TableCell>
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
