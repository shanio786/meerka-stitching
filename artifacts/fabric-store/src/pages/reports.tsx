import { useState, useEffect } from "react";
import {
  useGetInventorySummary, getGetInventorySummaryQueryKey,
  useGetLowStockAlerts, getGetLowStockAlertsQueryKey,
  useGetFabricByType, getGetFabricByTypeQueryKey,
} from "@workspace/api-client-react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface ProductionReports {
  masterPerformance: {
    masterId: number;
    masterName: string;
    masterType: string;
    machineNo: string | null;
    totalEarned: number;
    totalPaid: number;
    balance: number;
  }[];
  cuttingOutput: {
    jobId: number;
    articleName: string;
    articleCode: string;
    status: string;
    totalAssignments: number;
    totalPiecesCut: number;
    totalWaste: number;
    totalAmount: number;
  }[];
  stitchingOutput: {
    jobId: number;
    articleName: string;
    articleCode: string;
    status: string;
    totalAssignments: number;
    totalPieces: number;
    totalAmount: number;
  }[];
}

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

  const [production, setProduction] = useState<ProductionReports | null>(null);
  const [loadingProduction, setLoadingProduction] = useState(true);

  useEffect(() => {
    apiGet<ProductionReports>("/dashboard/production-reports")
      .then(setProduction)
      .catch(() => {})
      .finally(() => setLoadingProduction(false));
  }, []);

  const totalMeters = inventory?.reduce((sum, i) => sum + i.totalMetersReceived, 0) || 0;
  const totalCost = inventory?.reduce((sum, i) => sum + i.totalCost, 0) || 0;
  const totalRolls = inventory?.reduce((sum, i) => sum + i.totalRolls, 0) || 0;
  const fmt = (n: number) => new Intl.NumberFormat().format(n);

  const handlePrint = () => {
    window.print();
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      in_progress: "bg-blue-100 text-blue-800",
      pending: "bg-gray-100 text-gray-800",
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || "bg-gray-100"}`}>{status}</span>;
  };

  return (
    <div className="space-y-6 print-area">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
          .print-area table { font-size: 11px; }
          .print-area .text-2xl { font-size: 18px; }
          @page { margin: 1cm; }
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Stock summary, production output, and master performance</p>
        </div>
        <Button variant="outline" onClick={handlePrint} className="gap-2 no-print">
          <Printer className="h-4 w-4" /> Print Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Stock</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-report-total-meters">{fmt(totalMeters)} m</p>
            <p className="text-xs text-muted-foreground">{totalRolls} rolls across {inventory?.length || 0} articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-report-total-value">Rs. {fmt(totalCost)}</p>
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
        <TabsList data-testid="tabs-reports" className="no-print">
          <TabsTrigger value="stock" data-testid="tab-stock">Stock Summary</TabsTrigger>
          <TabsTrigger value="fabric" data-testid="tab-fabric">By Fabric Type</TabsTrigger>
          <TabsTrigger value="lowstock" data-testid="tab-lowstock">Low Stock</TabsTrigger>
          <TabsTrigger value="cutting" data-testid="tab-cutting">Cutting Output</TabsTrigger>
          <TabsTrigger value="stitching" data-testid="tab-stitching">Stitching Output</TabsTrigger>
          <TabsTrigger value="masters" data-testid="tab-masters">Master Performance</TabsTrigger>
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
                          <TableCell className="text-right font-mono">{fmt(item.totalCost)}</TableCell>
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

        <TabsContent value="cutting">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cutting Jobs Output</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProduction ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !production?.cuttingOutput?.length ? (
                <div className="text-center py-12 text-muted-foreground">No cutting data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job #</TableHead>
                        <TableHead>Article</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Masters</TableHead>
                        <TableHead className="text-right">Pieces Cut</TableHead>
                        <TableHead className="text-right">Waste (m)</TableHead>
                        <TableHead className="text-right">Amount (Rs.)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {production.cuttingOutput.map((job) => (
                        <TableRow key={job.jobId}>
                          <TableCell className="font-mono font-medium">CUT-{String(job.jobId).padStart(4, "0")}</TableCell>
                          <TableCell>
                            <div>{job.articleName}</div>
                            <div className="text-xs text-muted-foreground">{job.articleCode}</div>
                          </TableCell>
                          <TableCell>{statusBadge(job.status)}</TableCell>
                          <TableCell className="text-right">{job.totalAssignments}</TableCell>
                          <TableCell className="text-right font-mono font-bold">{job.totalPiecesCut}</TableCell>
                          <TableCell className="text-right font-mono text-orange-600">{job.totalWaste}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(job.totalAmount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right">{production.cuttingOutput.reduce((s, j) => s + j.totalAssignments, 0)}</TableCell>
                        <TableCell className="text-right font-mono">{production.cuttingOutput.reduce((s, j) => s + j.totalPiecesCut, 0)}</TableCell>
                        <TableCell className="text-right font-mono text-orange-600">{production.cuttingOutput.reduce((s, j) => s + j.totalWaste, 0)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(production.cuttingOutput.reduce((s, j) => s + j.totalAmount, 0))}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stitching">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stitching Jobs Output</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProduction ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !production?.stitchingOutput?.length ? (
                <div className="text-center py-12 text-muted-foreground">No stitching data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job #</TableHead>
                        <TableHead>Article</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Masters</TableHead>
                        <TableHead className="text-right">Pieces Done</TableHead>
                        <TableHead className="text-right">Amount (Rs.)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {production.stitchingOutput.map((job) => (
                        <TableRow key={job.jobId}>
                          <TableCell className="font-mono font-medium">STJ-{String(job.jobId).padStart(4, "0")}</TableCell>
                          <TableCell>
                            <div>{job.articleName}</div>
                            <div className="text-xs text-muted-foreground">{job.articleCode}</div>
                          </TableCell>
                          <TableCell>{statusBadge(job.status)}</TableCell>
                          <TableCell className="text-right">{job.totalAssignments}</TableCell>
                          <TableCell className="text-right font-mono font-bold">{job.totalPieces}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(job.totalAmount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right">{production.stitchingOutput.reduce((s, j) => s + j.totalAssignments, 0)}</TableCell>
                        <TableCell className="text-right font-mono">{production.stitchingOutput.reduce((s, j) => s + j.totalPieces, 0)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(production.stitchingOutput.reduce((s, j) => s + j.totalAmount, 0))}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="masters">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Master Performance & Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProduction ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !production?.masterPerformance?.length ? (
                <div className="text-center py-12 text-muted-foreground">No master data available</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Master Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Machine</TableHead>
                        <TableHead className="text-right">Total Earned</TableHead>
                        <TableHead className="text-right">Total Paid</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {production.masterPerformance.map((m) => (
                        <TableRow key={m.masterId}>
                          <TableCell className="font-medium">{m.masterName}</TableCell>
                          <TableCell><Badge variant="outline">{m.masterType}</Badge></TableCell>
                          <TableCell>{m.machineNo || "-"}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">Rs.{fmt(m.totalEarned)}</TableCell>
                          <TableCell className="text-right font-mono text-blue-600">Rs.{fmt(m.totalPaid)}</TableCell>
                          <TableCell className={`text-right font-mono font-bold ${m.balance > 0 ? "text-orange-600" : "text-green-600"}`}>
                            Rs.{fmt(m.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          Rs.{fmt(production.masterPerformance.reduce((s, m) => s + m.totalEarned, 0))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-600">
                          Rs.{fmt(production.masterPerformance.reduce((s, m) => s + m.totalPaid, 0))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-orange-600">
                          Rs.{fmt(production.masterPerformance.reduce((s, m) => s + m.balance, 0))}
                        </TableCell>
                      </TableRow>
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
