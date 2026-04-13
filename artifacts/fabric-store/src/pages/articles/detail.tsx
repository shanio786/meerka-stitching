import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetArticle, getGetArticleQueryKey,
  useUpdateArticle,
  useDeleteArticle,
  useBulkUpdateComponents,
  useListTemplates, getListTemplatesQueryKey,
  useApplyTemplate,
  getListArticlesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save, BookTemplate } from "lucide-react";

interface ComponentRow {
  componentName: string;
  componentType: string;
  fabricType: string;
  color: string;
  designPrint: string;
  requiredMeters: number;
  unitType: string;
  wastagePercent: number;
}

export default function ArticleDetail() {
  const [, params] = useRoute("/articles/:id");
  const [, setLocation] = useLocation();
  const articleId = params?.id ? parseInt(params.id, 10) : 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: article, isLoading } = useGetArticle(articleId, {
    query: { enabled: !!articleId, queryKey: getGetArticleQueryKey(articleId) }
  });

  const { data: templates } = useListTemplates({
    query: { queryKey: getListTemplatesQueryKey() }
  });

  const updateArticle = useUpdateArticle();
  const deleteArticle = useDeleteArticle();
  const bulkUpdate = useBulkUpdateComponents();
  const applyTemplate = useApplyTemplate();

  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (article && !initialized) {
    setComponents(
      (article.components || []).map((c) => ({
        componentName: c.componentName,
        componentType: c.componentType,
        fabricType: c.fabricType || "",
        color: c.color || "",
        designPrint: c.designPrint || "",
        requiredMeters: c.requiredMeters,
        unitType: c.unitType,
        wastagePercent: c.wastagePercent || 0,
      }))
    );
    setInitialized(true);
  }

  const addComponent = () => {
    setComponents([...components, {
      componentName: "",
      componentType: "Main",
      fabricType: "",
      color: "",
      designPrint: "",
      requiredMeters: 0,
      unitType: "Meter",
      wastagePercent: 0,
    }]);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof ComponentRow, value: string | number) => {
    const updated = [...components];
    (updated[index] as any)[field] = value;
    setComponents(updated);
  };

  const saveComponents = () => {
    bulkUpdate.mutate(
      { articleId, data: { components: components.map(c => ({ ...c, fabricType: c.fabricType || null, color: c.color || null, designPrint: c.designPrint || null, wastagePercent: c.wastagePercent || null })) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetArticleQueryKey(articleId) });
          queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() });
          toast({ title: "Components saved" });
        },
      }
    );
  };

  const handleApplyTemplate = (templateId: number) => {
    applyTemplate.mutate(
      { id: templateId, articleId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetArticleQueryKey(articleId) });
          setInitialized(false);
          toast({ title: "Template applied" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!confirm("Are you sure? This will delete the article and all its components.")) return;
    deleteArticle.mutate({ id: articleId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() });
        toast({ title: "Article deleted" });
        setLocation("/articles");
      },
    });
  };

  const totalFabric = components.reduce((sum, c) => sum + (c.requiredMeters || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium text-muted-foreground">Article not found</p>
        <Link href="/articles"><Button variant="outline" className="mt-4">Back to Articles</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={article.articleName}
        description={`${article.articleCode} - ${article.fabricType} - ${article.category}`}
        actions={
          <div className="flex gap-2">
            <Link href="/articles">
              <Button variant="outline" data-testid="button-back">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </Link>
            <Button variant="destructive" onClick={handleDelete} data-testid="button-delete-article">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Article Code</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-bold font-mono" data-testid="text-article-code">{article.articleCode}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Collection</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-medium" data-testid="text-collection">{article.collectionName || "-"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Total Fabric/Unit</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-bold text-primary" data-testid="text-total-fabric">{totalFabric.toFixed(2)} meters</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Components</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Define what goes into each unit of this article</p>
          </div>
          <div className="flex items-center gap-2">
            {templates && templates.length > 0 && (
              <Select onValueChange={(v) => handleApplyTemplate(parseInt(v, 10))}>
                <SelectTrigger className="w-[180px]" data-testid="select-apply-template">
                  <BookTemplate className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Apply Template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.templateName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" onClick={addComponent} data-testid="button-add-component">
              <Plus className="mr-2 h-4 w-4" /> Add Component
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {components.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No components defined yet</p>
              <p className="text-sm mt-1">Add components like Shirt, Trouser, Dupatta etc.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {components.map((comp, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-lg" data-testid={`component-row-${index}`}>
                  <div className="col-span-12 sm:col-span-2">
                    <label className="text-xs text-muted-foreground">Name</label>
                    <Input
                      value={comp.componentName}
                      onChange={(e) => updateComponent(index, "componentName", e.target.value)}
                      placeholder="Shirt"
                      data-testid={`input-comp-name-${index}`}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-1">
                    <label className="text-xs text-muted-foreground">Type</label>
                    <Select value={comp.componentType} onValueChange={(v) => updateComponent(index, "componentType", v)}>
                      <SelectTrigger data-testid={`select-comp-type-${index}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Main">Main</SelectItem>
                        <SelectItem value="Optional">Optional</SelectItem>
                        <SelectItem value="Extra">Extra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="text-xs text-muted-foreground">Fabric</label>
                    <Input
                      value={comp.fabricType}
                      onChange={(e) => updateComponent(index, "fabricType", e.target.value)}
                      placeholder="Lawn"
                      data-testid={`input-comp-fabric-${index}`}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-1">
                    <label className="text-xs text-muted-foreground">Color</label>
                    <Input
                      value={comp.color}
                      onChange={(e) => updateComponent(index, "color", e.target.value)}
                      placeholder="Blue"
                      data-testid={`input-comp-color-${index}`}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="text-xs text-muted-foreground">Meters</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={comp.requiredMeters || ""}
                      onChange={(e) => updateComponent(index, "requiredMeters", parseFloat(e.target.value) || 0)}
                      data-testid={`input-comp-meters-${index}`}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-1">
                    <label className="text-xs text-muted-foreground">Unit</label>
                    <Select value={comp.unitType} onValueChange={(v) => updateComponent(index, "unitType", v)}>
                      <SelectTrigger data-testid={`select-comp-unit-${index}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Meter">Meter</SelectItem>
                        <SelectItem value="Piece">Piece</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-6 sm:col-span-1">
                    <label className="text-xs text-muted-foreground">Waste %</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={comp.wastagePercent || ""}
                      onChange={(e) => updateComponent(index, "wastagePercent", parseFloat(e.target.value) || 0)}
                      data-testid={`input-comp-waste-${index}`}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-2 flex items-end justify-between sm:justify-end gap-2">
                    <Badge variant="secondary" className="text-xs">{comp.componentType}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => removeComponent(index)} data-testid={`button-remove-comp-${index}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm font-medium">
                  Total: <span className="text-primary font-bold">{totalFabric.toFixed(2)} meters</span> per unit
                </div>
                <Button onClick={saveComponents} disabled={bulkUpdate.isPending} data-testid="button-save-components">
                  <Save className="mr-2 h-4 w-4" />
                  {bulkUpdate.isPending ? "Saving..." : "Save Components"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
