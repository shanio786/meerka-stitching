import { useState } from "react";
import { useLocation } from "wouter";
import { apiPost } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function ArticleForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    articleCode: "",
    articleName: "",
    collectionName: "",
    partType: "",
    category: "",
    piecesType: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.articleCode || !form.articleName || !form.partType || !form.category || !form.piecesType) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const article = await apiPost("/articles", form);
      toast({ title: "Article created successfully" });
      navigate(`/articles/${article.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
              <div className="space-y-2">
                <Label>Part Type *</Label>
                <Select value={form.partType} onValueChange={v => setForm(f => ({ ...f, partType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Apna">Apna (Own)</SelectItem>
                    <SelectItem value="Bahir Ka">Bahir Ka (Outside)</SelectItem>
                    <SelectItem value="SMD">SMD</SelectItem>
                    <SelectItem value="Export">Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Summer">Summer</SelectItem>
                    <SelectItem value="Winter">Winter</SelectItem>
                    <SelectItem value="Spring">Spring</SelectItem>
                    <SelectItem value="Fall">Fall</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pieces Type *</Label>
                <Select value={form.piecesType} onValueChange={v => setForm(f => ({ ...f, piecesType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single Shirt">Single Shirt</SelectItem>
                    <SelectItem value="2PC">2PC</SelectItem>
                    <SelectItem value="3PC">3PC</SelectItem>
                    <SelectItem value="4PC">4PC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
    </div>
  );
}
