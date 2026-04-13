import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Article {
  id: number;
  articleCode: string;
  articleName: string;
  collectionName: string | null;
  partType: string;
  category: string;
  piecesType: string;
  componentCount: number;
  totalMetersReceived: number;
  accessoryCount: number;
}

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
  const [tab, setTab] = useState("articles");
  const [articles, setArticles] = useState<Article[]>([]);
  const [production, setProduction] = useState<ProductionReports | null>(null);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingProduction, setLoadingProduction] = useState(true);

  useEffect(() => {
    apiGet<Article[]>("/articles").then(setArticles).catch(() => {}).finally(() => setLoadingArticles(false));
    apiGet<ProductionReports>("/dashboard/production-reports").then(setProduction).catch(() => {}).finally(() => setLoadingProduction(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat().format(n);
  const totalMeters = articles.reduce((s, a) => s + a.totalMetersReceived, 0);

  const handlePrint = () => window.print();

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
          @page { margin: 1cm; }
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Articles, production output, and master performance</p>
        </div>
        <Button variant="outline" onClick={handlePrint} className="gap-2 no-print">
          <Printer className="h-4 w-4" /> Print Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Articles</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{articles.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Fabric Received</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalMeters)} m</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Masters</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{production?.masterPerformance?.length || 0}</p></CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="no-print">
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="cutting">Cutting Output</TabsTrigger>
          <TabsTrigger value="stitching">Stitching Output</TabsTrigger>
          <TabsTrigger value="masters">Master Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="articles">
          <Card>
            <CardContent className="pt-6">
              {loadingArticles ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !articles.length ? (
                <div className="text-center py-12 text-muted-foreground">No articles yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Part Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Pieces</TableHead>
                      <TableHead className="text-right">Components</TableHead>
                      <TableHead className="text-right">Meters</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono font-medium">{a.articleCode}</TableCell>
                        <TableCell>{a.articleName}</TableCell>
                        <TableCell><Badge variant="outline">{a.partType}</Badge></TableCell>
                        <TableCell>{a.category}</TableCell>
                        <TableCell><Badge variant="secondary">{a.piecesType}</Badge></TableCell>
                        <TableCell className="text-right">{a.componentCount}</TableCell>
                        <TableCell className="text-right font-mono">{a.totalMetersReceived}m</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cutting">
          <Card>
            <CardHeader><CardTitle className="text-base">Cutting Jobs Output</CardTitle></CardHeader>
            <CardContent>
              {loadingProduction ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !production?.cuttingOutput?.length ? (
                <div className="text-center py-12 text-muted-foreground">No cutting data</div>
              ) : (
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
                    {production.cuttingOutput.map(j => (
                      <TableRow key={j.jobId}>
                        <TableCell className="font-mono font-medium">CUT-{String(j.jobId).padStart(4, "0")}</TableCell>
                        <TableCell><div>{j.articleName}</div><div className="text-xs text-muted-foreground">{j.articleCode}</div></TableCell>
                        <TableCell>{statusBadge(j.status)}</TableCell>
                        <TableCell className="text-right">{j.totalAssignments}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{j.totalPiecesCut}</TableCell>
                        <TableCell className="text-right font-mono text-orange-600">{j.totalWaste}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(j.totalAmount)}</TableCell>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stitching">
          <Card>
            <CardHeader><CardTitle className="text-base">Stitching Jobs Output</CardTitle></CardHeader>
            <CardContent>
              {loadingProduction ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !production?.stitchingOutput?.length ? (
                <div className="text-center py-12 text-muted-foreground">No stitching data</div>
              ) : (
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
                    {production.stitchingOutput.map(j => (
                      <TableRow key={j.jobId}>
                        <TableCell className="font-mono font-medium">STJ-{String(j.jobId).padStart(4, "0")}</TableCell>
                        <TableCell><div>{j.articleName}</div><div className="text-xs text-muted-foreground">{j.articleCode}</div></TableCell>
                        <TableCell>{statusBadge(j.status)}</TableCell>
                        <TableCell className="text-right">{j.totalAssignments}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{j.totalPieces}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(j.totalAmount)}</TableCell>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="masters">
          <Card>
            <CardHeader><CardTitle className="text-base">Master Performance & Payments</CardTitle></CardHeader>
            <CardContent>
              {loadingProduction ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !production?.masterPerformance?.length ? (
                <div className="text-center py-12 text-muted-foreground">No master data</div>
              ) : (
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
                    {production.masterPerformance.map(m => (
                      <TableRow key={m.masterId}>
                        <TableCell className="font-medium">{m.masterName}</TableCell>
                        <TableCell><Badge variant="outline">{m.masterType}</Badge></TableCell>
                        <TableCell>{m.machineNo || "-"}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">Rs.{fmt(m.totalEarned)}</TableCell>
                        <TableCell className="text-right font-mono text-blue-600">Rs.{fmt(m.totalPaid)}</TableCell>
                        <TableCell className={`text-right font-mono font-bold ${m.balance > 0 ? "text-orange-600" : "text-green-600"}`}>Rs.{fmt(m.balance)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right font-mono text-green-600">Rs.{fmt(production.masterPerformance.reduce((s, m) => s + m.totalEarned, 0))}</TableCell>
                      <TableCell className="text-right font-mono text-blue-600">Rs.{fmt(production.masterPerformance.reduce((s, m) => s + m.totalPaid, 0))}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">Rs.{fmt(production.masterPerformance.reduce((s, m) => s + m.balance, 0))}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
