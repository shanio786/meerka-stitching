import { useState } from "react";
import {
  useGetInventorySummary, getGetInventorySummaryQueryKey,
  useGetLowStockAlerts, getGetLowStockAlertsQueryKey,
  useGetFabricByType, getGetFabricByTypeQueryKey,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Reports() {
  const [tab, setTab] = useState("stock");

  const { data: inventory, isLoading: loadingInventory } = useGetInventorySummary({
    query: { queryKey: getGetInventorySummaryQueryKey() }
  });

  const { data: lowStock, isLoading: loadingLowStock } = useGetLowStockAlerts({}, {
    query: { queryKey: getGetLowStockAlertsQueryKey() }
  });

  const { data: fabricByType, isLoading: loadingFabric } = useGetFabricByType({
    query: { queryKey: getGetFabricByTypeQueryKey() }
  });

  const totalMeters = inventory?.reduce((sum, i) => sum + i.totalMetersReceived, 0) || 0;
  const totalCost = inventory?.reduce((sum, i) => sum + i.totalCost, 0) || 0;
  const totalRolls = inventory?.reduce((sum, i) => sum + i.totalRolls, 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Stock summary, fabric analysis, and low stock reports"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Stock</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-report-total-meters">{new Intl.NumberFormat().format(totalMeters)} m</p>
            <p className="text-xs text-muted-foreground">{totalRolls} rolls across {inventory?.length || 0} articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-report-total-value">Rs. {new Intl.NumberFormat().format(totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Items</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive" data-testid="text-report-low-stock">{lowStock?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList data-testid="tabs-reports">
          <TabsTrigger value="stock" data-testid="tab-stock">Stock Summary</TabsTrigger>
          <TabsTrigger value="fabric" data-testid="tab-fabric">By Fabric Type</TabsTrigger>
          <TabsTrigger value="lowstock" data-testid="tab-lowstock">Low Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardContent className="pt-6">
              {loadingInventory ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !inventory?.length ? (
                <div className="text-center py-12 text-muted-foreground">No stock data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article Code</TableHead>
                        <TableHead>Article Name</TableHead>
                        <TableHead>Fabric</TableHead>
                        <TableHead className="text-right">Meters</TableHead>
                        <TableHead className="text-right">Rolls</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">GRNs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.articleId} data-testid={`row-report-${item.articleId}`}>
                          <TableCell className="font-mono font-medium">{item.articleCode}</TableCell>
                          <TableCell>{item.articleName}</TableCell>
                          <TableCell><Badge variant="secondary">{item.fabricType}</Badge></TableCell>
                          <TableCell className="text-right font-mono">{item.totalMetersReceived}m</TableCell>
                          <TableCell className="text-right">{item.totalRolls}</TableCell>
                          <TableCell className="text-right font-mono">{new Intl.NumberFormat().format(item.totalCost)}</TableCell>
                          <TableCell className="text-right">{item.grnCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fabric">
          <Card>
            <CardContent className="pt-6">
              {loadingFabric ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !fabricByType?.length ? (
                <div className="text-center py-12 text-muted-foreground">No fabric data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fabric Type</TableHead>
                        <TableHead className="text-right">Total Meters</TableHead>
                        <TableHead className="text-right">Articles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fabricByType.map((item) => (
                        <TableRow key={item.fabricType} data-testid={`row-fabric-${item.fabricType}`}>
                          <TableCell className="font-medium">{item.fabricType}</TableCell>
                          <TableCell className="text-right font-mono">{item.totalMeters}m</TableCell>
                          <TableCell className="text-right">{item.articleCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lowstock">
          <Card>
            <CardContent className="pt-6">
              {loadingLowStock ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !lowStock?.length ? (
                <div className="text-center py-12 text-muted-foreground">All articles are above minimum stock threshold</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article Code</TableHead>
                        <TableHead>Article Name</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Threshold</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStock.map((item) => (
                        <TableRow key={item.articleId} data-testid={`row-lowstock-${item.articleId}`}>
                          <TableCell className="font-mono font-medium">{item.articleCode}</TableCell>
                          <TableCell>{item.articleName}</TableCell>
                          <TableCell className="text-right font-mono text-destructive font-bold">{item.totalMetersReceived}m</TableCell>
                          <TableCell className="text-right font-mono">{item.threshold}m</TableCell>
                          <TableCell><Badge variant="destructive">Low</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
