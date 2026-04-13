import { useState } from "react";
import { Link } from "wouter";
import { useListArticles, getListArticlesQueryKey, useToggleArticleActive, useDeleteArticle } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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

export default function ArticlesList() {
  const [search, setSearch] = useState("");
  const [fabricType, setFabricType] = useState("");
  const [category, setCategory] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = {
    ...(search ? { search } : {}),
    ...(fabricType && fabricType !== "all" ? { fabricType } : {}),
    ...(category && category !== "all" ? { category } : {}),
  };

  const { data: articles, isLoading } = useListArticles(params, {
    query: { queryKey: getListArticlesQueryKey(params) }
  });

  const toggleActive = useToggleArticleActive();
  const deleteArticle = useDeleteArticle();

  const handleToggle = (id: number) => {
    toggleActive.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey(params) });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    deleteArticle.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey(params) });
        toast({ title: "Article deleted" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Articles"
        description="Manage fabric article definitions and components"
        newAction={{ label: "New Article", href: "/articles/new" }}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-articles"
              />
            </div>
            <Select value={fabricType} onValueChange={setFabricType}>
              <SelectTrigger className="w-[160px]" data-testid="select-fabric-type">
                <SelectValue placeholder="Fabric Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Lawn">Lawn</SelectItem>
                <SelectItem value="Cotton">Cotton</SelectItem>
                <SelectItem value="Khaddar">Khaddar</SelectItem>
                <SelectItem value="Chiffon">Chiffon</SelectItem>
                <SelectItem value="Denim">Denim</SelectItem>
                <SelectItem value="Silk">Silk</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[140px]" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="3PC">3PC</SelectItem>
                <SelectItem value="2PC">2PC</SelectItem>
                <SelectItem value="Kurti">Kurti</SelectItem>
                <SelectItem value="Suit">Suit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !articles?.length ? (
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
                    <TableHead>Fabric</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead className="text-right">Fabric/Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow key={article.id} data-testid={`row-article-${article.id}`}>
                      <TableCell className="font-mono text-sm font-medium">{article.articleCode}</TableCell>
                      <TableCell>
                        <Link href={`/articles/${article.id}`}>
                          <span className="font-medium hover:underline cursor-pointer text-primary" data-testid={`link-article-${article.id}`}>
                            {article.articleName}
                          </span>
                        </Link>
                        {article.collectionName && (
                          <span className="block text-xs text-muted-foreground">{article.collectionName}</span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{article.fabricType}</Badge></TableCell>
                      <TableCell>{article.category}</TableCell>
                      <TableCell>{article.season}</TableCell>
                      <TableCell className="text-right font-mono">
                        {article.totalFabricPerUnit ? `${article.totalFabricPerUnit}m` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={article.isActive ? "default" : "secondary"} data-testid={`badge-status-${article.id}`}>
                          {article.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/articles/${article.id}`}>
                            <Button variant="ghost" size="icon" data-testid={`button-view-${article.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggle(article.id)}
                            data-testid={`button-toggle-${article.id}`}
                          >
                            <Power className={`h-4 w-4 ${article.isActive ? "text-green-600" : "text-muted-foreground"}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(article.id)}
                            data-testid={`button-delete-${article.id}`}
                          >
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
