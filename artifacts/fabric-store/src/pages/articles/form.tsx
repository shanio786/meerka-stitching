import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateArticle, getListArticlesQueryKey } from "@workspace/api-client-react";
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
  articleCode: z.string().min(1, "Required"),
  articleName: z.string().min(1, "Required"),
  collectionName: z.string().optional().nullable(),
  brandCustomer: z.string().optional().nullable(),
  fabricType: z.string().min(1, "Required"),
  season: z.string().min(1, "Required"),
  category: z.string().min(1, "Required"),
});

export default function ArticleForm() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createArticle = useCreateArticle();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      articleCode: "",
      articleName: "",
      collectionName: "",
      brandCustomer: "",
      fabricType: "",
      season: "",
      category: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createArticle.mutate(
      { data: values },
      {
        onSuccess: (article) => {
          queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() });
          toast({ title: "Article created successfully" });
          setLocation(`/articles/${article.id}`);
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.error || "Failed to create article", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Article"
        description="Define a new fabric article"
        actions={
          <Link href="/articles">
            <Button variant="outline" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Article Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="articleCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Article Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. LS-3PC-24" {...field} data-testid="input-article-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="articleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Article Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Ladies Summer 3PC" {...field} data-testid="input-article-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="collectionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Summer 2026" {...field} value={field.value || ""} data-testid="input-collection" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brandCustomer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand / Customer</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} value={field.value || ""} data-testid="input-brand" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="fabricType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fabric Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-fabric-type">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Lawn">Lawn</SelectItem>
                          <SelectItem value="Cotton">Cotton</SelectItem>
                          <SelectItem value="Khaddar">Khaddar</SelectItem>
                          <SelectItem value="Chiffon">Chiffon</SelectItem>
                          <SelectItem value="Denim">Denim</SelectItem>
                          <SelectItem value="Silk">Silk</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="season"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Season</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-season">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Summer">Summer</SelectItem>
                          <SelectItem value="Winter">Winter</SelectItem>
                          <SelectItem value="All Season">All Season</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3PC">3PC</SelectItem>
                          <SelectItem value="2PC">2PC</SelectItem>
                          <SelectItem value="Kurti">Kurti</SelectItem>
                          <SelectItem value="Suit">Suit</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createArticle.isPending} data-testid="button-submit">
                  <Save className="mr-2 h-4 w-4" />
                  {createArticle.isPending ? "Creating..." : "Create Article"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
