import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiPost, apiGet } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface CustomOption { id: number; optionType: string; optionValue: string; }

const DEFAULT_PART_TYPES = ["Apna", "Bahir Ka", "CMD", "Export"];
const DEFAULT_CATEGORIES = ["Summer", "Winter", "Spring", "Fall"];
const DEFAULT_PIECES_TYPES = ["Single Shirt", "2PC", "3PC", "4PC"];

export default function ArticleForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customOptions, setCustomOptions] = useState<CustomOption[]>([]);
  const [addDialog, setAddDialog] = useState<{ type: string; label: string } | null>(null);
  const [newValue, setNewValue] = useState("");

  const [form, setForm] = useState({
    articleCode: "",
    articleName: "",
    collectionName: "",
    partType: "",
    category: "",
    piecesType: "",
  });

  useEffect(() => {
    apiGet<CustomOption[]>("/custom-options").then(setCustomOptions).catch(() => {});
  }, []);

  const getOptions = (type: string, defaults: string[]) => {
    const custom = customOptions.filter(o => o.optionType === type).map(o => o.optionValue);
    return [...new Set([...defaults, ...custom])];
  };

  const handleAddOption = async () => {
    if (!addDialog || !newValue.trim()) return;
    try {
      await apiPost("/custom-options", { optionType: addDialog.type, optionValue: newValue.trim() });
      const updated = await apiGet<CustomOption[]>("/custom-options");
      setCustomOptions(updated);
      toast({ title: `${addDialog.label} added` });
      setAddDialog(null);
      setNewValue("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.articleCode || !form.articleName || !form.partType || !form.category || !form.piecesType) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const article = await apiPost<{ id: number }>("/articles", form);
      toast({ title: "Article created successfully" });
      navigate(`/articles/${article.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderSelectWithAdd = (
    label: string,
    optionType: string,
    defaults: string[],
    value: string,
    onChange: (v: string) => void
  ) => {
    const options = getOptions(optionType, defaults);
    return (
      <div className="space-y-2">
        <Label>{label} *</Label>
        <div className="flex gap-1">
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setAddDialog({ type: optionType, label })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="New Article" description="Add a new article to the fabric store" />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Article Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Article Code *</Label>
                <Input
                  placeholder="e.g. LS-3PC-001"
                  value={form.articleCode}
                  onChange={e => setForm(f => ({ ...f, articleCode: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Article Name *</Label>
                <Input
                  placeholder="e.g. Ladies Summer 3PC"
                  value={form.articleName}
                  onChange={e => setForm(f => ({ ...f, articleName: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Collection Name</Label>
              <Input
                placeholder="e.g. Summer Collection 2026"
                value={form.collectionName}
                onChange={e => setForm(f => ({ ...f, collectionName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {renderSelectWithAdd("Part Type", "partType", DEFAULT_PART_TYPES, form.partType, v => setForm(f => ({ ...f, partType: v })))}
              {renderSelectWithAdd("Category", "category", DEFAULT_CATEGORIES, form.category, v => setForm(f => ({ ...f, category: v })))}
              {renderSelectWithAdd("Pieces Type", "piecesType", DEFAULT_PIECES_TYPES, form.piecesType, v => setForm(f => ({ ...f, piecesType: v })))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Article"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/articles")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={!!addDialog} onOpenChange={() => { setAddDialog(null); setNewValue(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New {addDialog?.label}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Value</Label>
              <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder={`Enter new ${addDialog?.label?.toLowerCase()}`} />
            </div>
            <Button className="w-full" onClick={handleAddOption}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
