import { useState } from "react";
import {
  useListTemplates, getListTemplatesQueryKey,
  useCreateTemplate,
  useGetTemplate, getGetTemplateQueryKey,
  useDeleteTemplate,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Eye } from "lucide-react";

interface TemplateItemInput {
  componentName: string;
  componentType: string;
  fabricType: string;
  requiredMeters: number;
  unitType: string;
  wastagePercent: number;
}

export default function Templates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [viewTemplateId, setViewTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<TemplateItemInput[]>([]);

  const { data: templates, isLoading } = useListTemplates({
    query: { queryKey: getListTemplatesQueryKey() }
  });

  const { data: templateDetail } = useGetTemplate(viewTemplateId || 0, {
    query: { enabled: !!viewTemplateId, queryKey: getGetTemplateQueryKey(viewTemplateId || 0) }
  });

  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const addItem = () => {
    setItems([...items, {
      componentName: "",
      componentType: "Main",
      fabricType: "",
      requiredMeters: 0,
      unitType: "Meter",
      wastagePercent: 0,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TemplateItemInput, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleCreate = () => {
    if (!templateName || items.length === 0) {
      toast({ title: "Please fill template name and add at least one component", variant: "destructive" });
      return;
    }

    createTemplate.mutate(
      {
        data: {
          templateName,
          description: description || null,
          items: items.map(i => ({
            ...i,
            fabricType: i.fabricType || null,
            wastagePercent: i.wastagePercent || null,
          })),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
          toast({ title: "Template created" });
          setShowCreate(false);
          setTemplateName("");
          setDescription("");
          setItems([]);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this template?")) return;
    deleteTemplate.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        toast({ title: "Template deleted" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Component Templates"
        description="Save and reuse component sets across articles"
        actions={
          <Button onClick={() => setShowCreate(true)} data-testid="button-new-template">
            <Plus className="mr-2 h-4 w-4" /> New Template
          </Button>
        }
      />

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Standard 3PC"
                  data-testid="input-template-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                  data-testid="input-template-desc"
                />
              </div>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-lg" data-testid={`template-item-${index}`}>
                <div className="col-span-3">
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input value={item.componentName} onChange={(e) => updateItem(index, "componentName", e.target.value)} placeholder="Shirt" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Type</label>
                  <Select value={item.componentType} onValueChange={(v) => updateItem(index, "componentType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Main">Main</SelectItem>
                      <SelectItem value="Optional">Optional</SelectItem>
                      <SelectItem value="Extra">Extra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Fabric</label>
                  <Input value={item.fabricType} onChange={(e) => updateItem(index, "fabricType", e.target.value)} placeholder="Lawn" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Meters</label>
                  <Input type="number" step="0.01" value={item.requiredMeters || ""} onChange={(e) => updateItem(index, "requiredMeters", parseFloat(e.target.value) || 0)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Unit</label>
                  <Select value={item.unitType} onValueChange={(v) => updateItem(index, "unitType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Meter">Meter</SelectItem>
                      <SelectItem value="Piece">Piece</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-between">
              <Button variant="outline" onClick={addItem} data-testid="button-add-template-item">
                <Plus className="mr-2 h-4 w-4" /> Add Component
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowCreate(false); setItems([]); }}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createTemplate.isPending} data-testid="button-save-template">
                  <Save className="mr-2 h-4 w-4" /> Save Template
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)
        ) : !templates?.length ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-sm mt-1">Create templates to quickly add components to articles</p>
          </div>
        ) : (
          templates.map((template) => (
            <Card key={template.id} data-testid={`card-template-${template.id}`}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{template.templateName}</CardTitle>
                  {template.description && <p className="text-sm text-muted-foreground mt-1">{template.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setViewTemplateId(template.id)} data-testid={`button-view-template-${template.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{templateDetail?.templateName}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        {templateDetail?.items?.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <div>
                              <span className="font-medium">{item.componentName}</span>
                              <Badge variant="secondary" className="ml-2 text-xs">{item.componentType}</Badge>
                            </div>
                            <span className="font-mono text-sm">{item.requiredMeters}m</span>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} data-testid={`button-delete-template-${template.id}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
