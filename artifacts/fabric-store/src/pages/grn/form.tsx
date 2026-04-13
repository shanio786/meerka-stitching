import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateGrnEntry, getListGrnEntriesQueryKey, useListArticles, getListArticlesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  grnNumber: z.string().min(1, "Required"),
  date: z.string().min(1, "Required"),
  supplierName: z.string().min(1, "Required"),
  articleId: z.string().min(1, "Required"),
  totalRolls: z.coerce.number().min(1, "At least 1"),
  totalMeters: z.coerce.number().min(0.01, "Required"),
  ratePerMeter: z.coerce.number().min(0.01, "Required"),
  batchNumber: z.string().optional(),
  colorLot: z.string().optional(),
  qualityType: z.string().optional(),
  rackLocation: z.string().optional(),
});

export default function GrnForm() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createGrn = useCreateGrnEntry();

  const { data: articles } = useListArticles({}, {
    query: { queryKey: getListArticlesQueryKey() }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      grnNumber: `GRN-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toISOString().split("T")[0],
      supplierName: "",
      articleId: "",
      totalRolls: 1,
      totalMeters: 0,
      ratePerMeter: 0,
      batchNumber: "",
      colorLot: "",
      qualityType: "",
      rackLocation: "",
    },
  });

  const totalMeters = form.watch("totalMeters");
  const ratePerMeter = form.watch("ratePerMeter");
  const totalCost = (totalMeters || 0) * (ratePerMeter || 0);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createGrn.mutate(
      {
        data: {
          ...values,
          articleId: parseInt(values.articleId, 10),
          date: new Date(values.date).toISOString(),
          batchNumber: values.batchNumber || null,
          colorLot: values.colorLot || null,
          qualityType: values.qualityType || null,
          rackLocation: values.rackLocation || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGrnEntriesQueryKey() });
          toast({ title: "GRN entry created" });
          setLocation("/grn");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.error || "Failed to create GRN", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New GRN Entry"
        description="Record fabric receipt from supplier"
        actions={
          <Link href="/grn">
            <Button variant="outline" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Receipt Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="grnNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GRN Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-grn-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-grn-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Al-Karim Textiles" {...field} data-testid="input-supplier" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="articleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Article</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-article">
                            <SelectValue placeholder="Select article" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {articles?.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>
                              {a.articleCode} - {a.articleName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="totalRolls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Rolls</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-rolls" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalMeters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Meters</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-meters" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ratePerMeter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate per Meter</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-rate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Calculated Total Cost</div>
                <div className="text-2xl font-bold text-primary" data-testid="text-total-cost">
                  Rs. {new Intl.NumberFormat().format(totalCost)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="batchNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} data-testid="input-batch" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="colorLot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color Lot</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} data-testid="input-color-lot" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="qualityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quality Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. A-Grade" {...field} data-testid="input-quality" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rackLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rack / Shelf Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Rack A-3" {...field} data-testid="input-rack" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createGrn.isPending} data-testid="button-submit">
                  <Save className="mr-2 h-4 w-4" />
                  {createGrn.isPending ? "Saving..." : "Save GRN Entry"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
