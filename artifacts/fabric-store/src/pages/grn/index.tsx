import { useState } from "react";
import { Link } from "wouter";
import { useListGrnEntries, getListGrnEntriesQueryKey, useDeleteGrnEntry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function GrnList() {
  const [supplier, setSupplier] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = {
    ...(supplier ? { supplier } : {}),
  };

  const { data: entries, isLoading } = useListGrnEntries(params, {
    query: { queryKey: getListGrnEntriesQueryKey(params) }
  });

  const deleteGrn = useDeleteGrnEntry();

  const handleDelete = (id: number) => {
    if (!confirm("Delete this GRN entry?")) return;
    deleteGrn.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGrnEntriesQueryKey(params) });
        toast({ title: "GRN entry deleted" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="GRN - Goods Receipt"
        description="Track fabric stock receipts from suppliers"
        newAction={{ label: "New GRN", href: "/grn/new" }}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by supplier..."
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="pl-10"
                data-testid="input-search-grn"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !entries?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No GRN entries found</p>
              <p className="text-sm mt-1">Add a new goods receipt to track fabric stock</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead className="text-right">Rolls</TableHead>
                    <TableHead className="text-right">Meters</TableHead>
                    <TableHead className="text-right">Rate/m</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-grn-${entry.id}`}>
                      <TableCell className="font-mono font-medium">{entry.grnNumber}</TableCell>
                      <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{entry.supplierName}</TableCell>
                      <TableCell>
                        {entry.articleCode ? (
                          <Link href={`/articles/${entry.articleId}`}>
                            <span className="hover:underline cursor-pointer text-primary">{entry.articleCode}</span>
                          </Link>
                        ) : "-"}
                        {entry.articleName && <span className="block text-xs text-muted-foreground">{entry.articleName}</span>}
                      </TableCell>
                      <TableCell className="text-right">{entry.totalRolls}</TableCell>
                      <TableCell className="text-right font-mono">{entry.totalMeters}</TableCell>
                      <TableCell className="text-right font-mono">{entry.ratePerMeter}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{new Intl.NumberFormat().format(entry.totalCost)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)} data-testid={`button-delete-grn-${entry.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
