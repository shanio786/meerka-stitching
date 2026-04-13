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
import { Plus, Eye, Scissors } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost } from "@/lib/api";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  pending: "secondary", in_progress: "default", completed: "outline", cancelled: "destructive"
};

export default function CuttingJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({ articleId: "", jobDate: new Date().toISOString().split("T")[0], notes: "" });

  const fetchJobs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    try {
      const data = await apiGet(`/cutting/jobs?${params}`);
      setJobs(data);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setLoading(false);
  };

  const fetchArticles = async () => {
    try { const data = await apiGet("/articles"); setArticles(data); } catch {}
  };

  useEffect(() => { fetchJobs(); fetchArticles(); }, [statusFilter]);

  const handleCreate = async () => {
    if (!form.articleId) { toast({ title: "Select an article", variant: "destructive" }); return; }
    try {
      await apiPost("/cutting/jobs", { articleId: parseInt(form.articleId), jobDate: form.jobDate, notes: form.notes });
      toast({ title: "Cutting job created" });
      setDialogOpen(false);
      setForm({ articleId: "", jobDate: new Date().toISOString().split("T")[0], notes: "" });
      fetchJobs();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Cutting Jobs" description="Manage fabric cutting jobs and master assignments" actions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Job</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Cutting Job</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Article *</Label>
                <Select value={form.articleId} onValueChange={v => setForm({ ...form, articleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select article" /></SelectTrigger>
                  <SelectContent>{articles.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.articleCode} - {a.articleName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Job Date *</Label><Input type="date" value={form.jobDate} onChange={e => setForm({ ...form, jobDate: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate}>Create Job</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 mb-6">
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
          ) : !jobs.length ? (
            <div className="text-center py-12 text-muted-foreground"><Scissors className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-lg font-medium">No cutting jobs</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono font-medium">CUT-{String(j.id).padStart(4, "0")}</TableCell>
                    <TableCell>
                      <div className="font-medium">{j.articleName}</div>
                      <div className="text-xs text-muted-foreground">{j.articleCode}</div>
                    </TableCell>
                    <TableCell>{format(new Date(j.jobDate), "MMM d, yyyy")}</TableCell>
                    <TableCell><Badge variant={STATUS_COLORS[j.status] as any}>{j.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Link href={`/cutting/${j.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
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
