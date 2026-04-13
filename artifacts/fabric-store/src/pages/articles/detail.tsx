import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";

interface Component {
  id: number;
  componentName: string;
  fabricName: string;
  totalMetersReceived: number;
}

interface Accessory {
  id: number;
  accessoryName: string;
  quantity: number;
  meters: number | null;
  ratePerUnit: number | null;
  totalAmount: number | null;
}

interface ArticleDetail {
  id: number;
  articleCode: string;
  articleName: string;
  collectionName: string | null;
  partType: string;
  category: string;
  piecesType: string;
  isActive: boolean;
  components: Component[];
  accessories: Accessory[];
}

export default function ArticleDetailPage() {
  const [, params] = useRoute("/articles/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const id = params?.id;

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [compOpen, setCompOpen] = useState(false);
  const [accOpen, setAccOpen] = useState(false);
  const [compForm, setCompForm] = useState({ componentName: "", fabricName: "", totalMetersReceived: 0 });
  const [accForm, setAccForm] = useState({ accessoryName: "", quantity: 0, meters: 0, ratePerUnit: 0 });

  const loadArticle = () => {
    if (!id) return;
    apiGet<ArticleDetail>(`/articles/${id}`)
      .then(setArticle)
      .catch(() => navigate("/articles"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadArticle(); }, [id]);

  const addComponent = async () => {
    if (!compForm.componentName || !compForm.fabricName) {
      toast({ title: "Error", description: "Component name and fabric are required", variant: "destructive" });
      return;
    }
    try {
      await apiPost(`/articles/${id}/components`, compForm);
      setCompForm({ componentName: "", fabricName: "", totalMetersReceived: 0 });
      setCompOpen(false);
      toast({ title: "Component added" });
      loadArticle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const deleteComponent = async (compId: number) => {
    if (!confirm("Delete this component?")) return;
    try {
      await apiDelete(`/components/${compId}`);
      toast({ title: "Component deleted" });
      loadArticle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const addAccessory = async () => {
    if (!accForm.accessoryName) {
      toast({ title: "Error", description: "Accessory name is required", variant: "destructive" });
      return;
    }
    try {
      await apiPost(`/articles/${id}/accessories`, accForm);
      setAccForm({ accessoryName: "", quantity: 0, meters: 0, ratePerUnit: 0 });
      setAccOpen(false);
      toast({ title: "Accessory added" });
      loadArticle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const deleteAccessory = async (accId: number) => {
    if (!confirm("Delete this accessory?")) return;
    try {
      await apiDelete(`/accessories/${accId}`);
      toast({ title: "Accessory deleted" });
      loadArticle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleDeleteArticle = async () => {
    if (!confirm("Delete this entire article? This cannot be undone.")) return;
    try {
      await apiDelete(`/articles/${id}`);
      toast({ title: "Article deleted" });
      navigate("/articles");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!article) return null;

  const totalMeters = article.components.reduce((s, c) => s + c.totalMetersReceived, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/articles")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{article.articleCode}</h1>
          <p className="text-muted-foreground">{article.articleName}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDeleteArticle}>Delete Article</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Part Type</CardTitle></CardHeader>
          <CardContent><Badge variant="outline" className="text-base">{article.partType}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Category</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-bold">{article.category}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pieces Type</CardTitle></CardHeader>
          <CardContent><Badge className="text-base">{article.piecesType}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Collection</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-bold">{article.collectionName || "-"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Meters</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-bold">{totalMeters}m</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fabric Components</CardTitle>
          <Dialog open={compOpen} onOpenChange={setCompOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Component</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Fabric Component</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Component Name *</Label>
                  <Input placeholder="e.g. Shirt, Trouser, Dupatta" value={compForm.componentName} onChange={e => setCompForm(f => ({ ...f, componentName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Fabric Name *</Label>
                  <Input placeholder="e.g. Lawn, Cotton, Chiffon" value={compForm.fabricName} onChange={e => setCompForm(f => ({ ...f, fabricName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Total Meters Received</Label>
                  <Input type="number" step="0.1" value={compForm.totalMetersReceived} onChange={e => setCompForm(f => ({ ...f, totalMetersReceived: parseFloat(e.target.value) || 0 }))} />
                </div>
                <Button onClick={addComponent} className="w-full">Add Component</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!article.components.length ? (
            <div className="text-center py-8 text-muted-foreground">No components added yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Fabric</TableHead>
                  <TableHead className="text-right">Meters Received</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {article.components.map(comp => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.componentName}</TableCell>
                    <TableCell><Badge variant="secondary">{comp.fabricName}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{comp.totalMetersReceived}m</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteComponent(comp.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Accessories / Extras</CardTitle>
          <Dialog open={accOpen} onOpenChange={setAccOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Accessory</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Accessory</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Accessory Name *</Label>
                  <Input placeholder="e.g. Patch, Lace, Button, Zipper" value={accForm.accessoryName} onChange={e => setAccForm(f => ({ ...f, accessoryName: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" step="0.1" value={accForm.quantity} onChange={e => setAccForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Meters</Label>
                    <Input type="number" step="0.1" value={accForm.meters} onChange={e => setAccForm(f => ({ ...f, meters: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate/Unit</Label>
                    <Input type="number" step="0.1" value={accForm.ratePerUnit} onChange={e => setAccForm(f => ({ ...f, ratePerUnit: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                <Button onClick={addAccessory} className="w-full">Add Accessory</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!article.accessories.length ? (
            <div className="text-center py-8 text-muted-foreground">No accessories added yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Accessory</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Meters</TableHead>
                  <TableHead className="text-right">Rate/Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {article.accessories.map(acc => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-medium">{acc.accessoryName}</TableCell>
                    <TableCell className="text-right">{acc.quantity}</TableCell>
                    <TableCell className="text-right font-mono">{acc.meters || "-"}</TableCell>
                    <TableCell className="text-right font-mono">Rs.{acc.ratePerUnit || 0}</TableCell>
                    <TableCell className="text-right font-mono font-bold">Rs.{acc.totalAmount || 0}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteAccessory(acc.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Images</CardTitle></CardHeader>
        <CardContent>
          <ImageUpload entityType="article" entityId={article.id} />
        </CardContent>
      </Card>
    </div>
  );
}
