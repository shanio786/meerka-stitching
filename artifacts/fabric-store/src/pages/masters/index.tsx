import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Edit, Trash2, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

const MASTER_TYPES = ["cutting", "stitching", "overlock", "button", "finishing"];

interface Master {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  masterType: string;
  machineNo: string | null;
  defaultRate: number | null;
  isActive: boolean;
  notes: string | null;
}

export default function MastersList() {
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Master | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({ name: "", phone: "", address: "", masterType: "cutting", machineNo: "", defaultRate: "", notes: "" });

  const fetchMasters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("active", "true");
      const data = await apiGet<Master[]>(`/masters?${params}`);
      setMasters(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchMasters(); }, [search, typeFilter]);

  const handleSubmit = async () => {
    try {
      const body = { ...form, defaultRate: form.defaultRate ? parseFloat(form.defaultRate) : undefined };
      if (editing) {
        await apiPatch(`/masters/${editing.id}`, body);
        toast({ title: "Master updated" });
      } else {
        await apiPost("/masters", body);
        toast({ title: "Master added" });
      }
      setDialogOpen(false);
      setEditing(null);
      setForm({ name: "", phone: "", address: "", masterType: "cutting", machineNo: "", defaultRate: "", notes: "" });
      fetchMasters();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleEdit = (master: Master) => {
    setEditing(master);
    setForm({ name: master.name, phone: master.phone || "", address: master.address || "", masterType: master.masterType, machineNo: master.machineNo || "", defaultRate: master.defaultRate?.toString() || "", notes: master.notes || "" });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      await apiDelete(`/masters/${id}`);
      toast({ title: "Master deleted" });
      fetchMasters();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleToggle = async (master: Master) => {
    try {
      await apiPatch(`/masters/${master.id}`, { isActive: !master.isActive });
      fetchMasters();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Masters Registry" description="Manage cutting, stitching, overlock, button, and finishing masters" actions={
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm({ name: "", phone: "", address: "", masterType: "cutting", machineNo: "", defaultRate: "", notes: "" }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Master</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Master</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Type *</Label>
                <Select value={form.masterType} onValueChange={v => setForm({ ...form, masterType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MASTER_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Machine No</Label><Input value={form.machineNo} onChange={e => setForm({ ...form, machineNo: e.target.value })} /></div>
              </div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Default Rate (Rs/piece)</Label><Input type="number" value={form.defaultRate} onChange={e => setForm({ ...form, defaultRate: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleSubmit}>{editing ? "Update" : "Add"} Master</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search masters..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {MASTER_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !masters.length ? (
            <div className="text-center py-12 text-muted-foreground"><p className="text-lg font-medium">No masters found</p><p className="text-sm mt-1">Add your first master to get started</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {masters.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell><Badge variant="secondary">{m.masterType}</Badge></TableCell>
                      <TableCell>{m.phone || "-"}</TableCell>
                      <TableCell>{m.machineNo || "-"}</TableCell>
                      <TableCell className="text-right font-mono">{m.defaultRate ? `Rs.${m.defaultRate}` : "-"}</TableCell>
                      <TableCell><Badge variant={m.isActive ? "default" : "secondary"}>{m.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleToggle(m)}><Power className={`h-4 w-4 ${m.isActive ? "text-green-600" : "text-muted-foreground"}`} /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
