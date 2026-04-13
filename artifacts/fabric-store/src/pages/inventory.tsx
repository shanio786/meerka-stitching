import { useGetInventorySummary, getGetInventorySummaryQueryKey, useGetLowStockAlerts, getGetLowStockAlertsQueryKey } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function Inventory() {
  const { data: summary, isLoading } = useGetInventorySummary({
    query: { queryKey: getGetInventorySummaryQueryKey() }
  });

  const { data: lowStock } = useGetLowStockAlerts({}, {
    query: { queryKey: getGetLowStockAlertsQueryKey() }
  });

  const lowStockIds = new Set(lowStock?.map(l => l.articleId) || []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Real-time fabric stock overview per article"
      />

      {lowStock && lowStock.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts ({lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((alert) => (
                <Link key={alert.articleId} href={`/articles/${alert.articleId}`}>
                  <Badge variant="destructive" className="cursor-pointer" data-testid={`badge-low-stock-${alert.articleId}`}>
                    {alert.articleCode}: {alert.totalMetersReceived}m
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !summary?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No inventory data</p>
              <p className="text-sm mt-1">Add articles and GRN entries to see inventory</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article Code</TableHead>
                    <TableHead>Article Name</TableHead>
                    <TableHead>Fabric Type</TableHead>
                    <TableHead className="text-right">Total Meters</TableHead>
                    <TableHead className="text-right">Total Rolls</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">GRN Count</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((item) => (
                    <TableRow key={item.articleId} data-testid={`row-inventory-${item.articleId}`} className={lowStockIds.has(item.articleId) ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono font-medium">
                        <Link href={`/articles/${item.articleId}`}>
                          <span className="hover:underline cursor-pointer text-primary">{item.articleCode}</span>
                        </Link>
                      </TableCell>
                      <TableCell>{item.articleName}</TableCell>
                      <TableCell><Badge variant="secondary">{item.fabricType}</Badge></TableCell>
                      <TableCell className="text-right font-mono font-medium">{item.totalMetersReceived}m</TableCell>
                      <TableCell className="text-right">{item.totalRolls}</TableCell>
                      <TableCell className="text-right font-mono">{new Intl.NumberFormat().format(item.totalCost)}</TableCell>
                      <TableCell className="text-right">{item.grnCount}</TableCell>
                      <TableCell>
                        {lowStockIds.has(item.articleId) ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge variant="default">OK</Badge>
                        )}
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
