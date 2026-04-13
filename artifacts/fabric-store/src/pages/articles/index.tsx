import { useState, useEffect } from "react";
import { Link } from "wouter";
import { apiGet, apiDelete, apiPatch } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Eye, Trash2, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: number;
  articleCode: string;
  articleName: string;
  collectionName: string | null;
  partType: string;
  category: string;
  piecesType: string;
  isActive: boolean;
  componentCount: number;
  totalMetersReceived: number;
  accessoryCount: number;
}

export default function ArticlesList() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [partTypeFilter, setPartTypeFilter] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadArticles = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category && category !== "all") params.set("category", category);
    const qs = params.toString();
    apiGet<Article[]>(`/articles${qs ? `?${qs}` : ""}`)
      .then(setArticles)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadArticles(); }, [search, category]);

  const handleToggle = async (id: number) => {
    await apiPatch(`/articles/${id}/toggle-active`, {});
    loadArticles();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    await apiDelete(`/articles/${id}`);
    toast({ title: "Article deleted" });
    loadArticles();
  };

  const collections = [...new Set(articles.map(a => a.collectionName).filter(Boolean))] as string[];
  const categories = [...new Set(articles.map(a => a.category))];
  const partTypes = [...new Set(articles.map(a => a.partType))];

  const filtered = articles.filter(a => {
    if (partTypeFilter && partTypeFilter !== "all" && a.partType !== partTypeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fabric Store - Articles"
        description="Manage articles with fabric components and accessories"
        newAction={{ label: "New Article", href: "/articles/new" }}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or collection..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={partTypeFilter} onValueChange={setPartTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Part Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {partTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !filtered?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No articles found</p>
              <p className="text-sm mt-1">Create your first article to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Part Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Pieces</TableHead>
                    <TableHead className="text-right">Components</TableHead>
                    <TableHead className="text-right">Total Meters</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-mono text-sm font-medium">{article.articleCode}</TableCell>
                      <TableCell>
                        <Link href={`/articles/${article.id}`}>
                          <span className="font-medium hover:underline cursor-pointer text-primary">
                            {article.articleName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{article.collectionName || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{article.partType}</Badge></TableCell>
                      <TableCell>{article.category}</TableCell>
                      <TableCell><Badge variant="secondary">{article.piecesType}</Badge></TableCell>
                      <TableCell className="text-right">{article.componentCount}</TableCell>
                      <TableCell className="text-right font-mono">
                        {article.totalMetersReceived > 0 ? `${article.totalMetersReceived}m` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={article.isActive ? "default" : "secondary"}>
                          {article.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/articles/${article.id}`}>
                            <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => handleToggle(article.id)}>
                            <Power className={`h-4 w-4 ${article.isActive ? "text-green-600" : "text-muted-foreground"}`} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(article.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
