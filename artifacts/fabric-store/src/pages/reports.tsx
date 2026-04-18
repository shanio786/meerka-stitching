import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Search, Calendar } from "lucide-react";

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

interface QCEntry { id: number; articleName: string; articleCode: string; inspectorName: string; masterName: string | null; receivedQty: number; passedQty: number; rejectedQty: number; rejectionReason: string | null; date: string; }
interface OBEntry { id: number; articleName: string; articleCode: string; taskType: string; masterName: string; receivedQty: number; completedQty: number | null; wasteQty: number | null; totalAmount: number | null; status: string; date: string; }
interface FinEntry { id: number; articleName: string; articleCode: string; workerName: string; receivedQty: number; packedQty: number | null; wasteQty: number | null; totalAmount: number | null; status: string; date: string; }
interface FSEntry { id: number; articleName: string; articleCode: string; receivedBy: string; receivedFrom: string; packedQty: number; date: string; }

export default function Reports() {
  const [tab, setTab] = useState("articles");
  const [articles, setArticles] = useState<Article[]>([]);
  const [production, setProduction] = useState<ProductionReports | null>(null);
  const [qcEntries, setQcEntries] = useState<QCEntry[]>([]);
  const [obEntries, setObEntries] = useState<OBEntry[]>([]);
  const [finEntries, setFinEntries] = useState<FinEntry[]>([]);
  const [fsEntries, setFsEntries] = useState<FSEntry[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingProduction, setLoadingProduction] = useState(true);
  const [search, setSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    apiGet<Article[]>("/articles").then(setArticles).catch(() => {}).finally(() => setLoadingArticles(false));
    apiGet<ProductionReports>("/dashboard/production-reports").then(setProduction).catch(() => {}).finally(() => setLoadingProduction(false));
    apiGet<QCEntry[]>("/qc").then(setQcEntries).catch(() => {});
    apiGet<OBEntry[]>("/overlock-button").then(setObEntries).catch(() => {});
    apiGet<FinEntry[]>("/finishing").then(setFinEntries).catch(() => {});
    apiGet<FSEntry[]>("/final-store").then(setFsEntries).catch(() => {});
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat().format(n);
  const totalMeters = articles.reduce((s, a) => s + a.totalMetersReceived, 0);
  const collections = [...new Set(articles.map(a => a.collectionName).filter(Boolean))] as string[];

  const handlePrint = () => window.print();

  const inDateRange = (dateStr: string) => {
    if (!dateFrom && !dateTo) return true;
    const d = dateStr.split("T")[0];
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  };

  const matchSearch = (...fields: (string | null | undefined)[]) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return fields.some(f => f && f.toLowerCase().includes(q));
  };

  const filteredArticles = articles.filter(a => {
    if (collectionFilter !== "all" && a.collectionName !== collectionFilter) return false;
    return matchSearch(a.articleCode, a.articleName, a.collectionName, a.partType, a.category);
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { completed: "bg-green-100 text-green-800", in_progress: "bg-blue-100 text-blue-800", pending: "bg-gray-100 text-gray-800" };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || "bg-gray-100"}`}>{status.replace("_", " ")}</span>;
  };

  const filteredQC = qcEntries.filter(e => inDateRange(e.date) && matchSearch(e.articleName, e.articleCode, e.inspectorName, e.masterName));
  const filteredOB = obEntries.filter(e => inDateRange(e.date) && matchSearch(e.articleName, e.articleCode, e.masterName));
  const filteredFin = finEntries.filter(e => inDateRange(e.date) && matchSearch(e.articleName, e.articleCode, e.workerName));
  const filteredFS = fsEntries.filter(e => inDateRange(e.date) && matchSearch(e.articleName, e.articleCode, e.receivedBy, e.receivedFrom));

  const totalCost = (production?.cuttingOutput.reduce((s, j) => s + j.totalAmount, 0) || 0) +
    (production?.stitchingOutput.reduce((s, j) => s + j.totalAmount, 0) || 0) +
    filteredOB.reduce((s, e) => s + (e.totalAmount || 0), 0) +
    filteredFin.reduce((s, e) => s + (e.totalAmount || 0), 0);

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
          <p className="text-muted-foreground">Production, quality, performance and cost analysis</p>
        </div>
        <Button variant="outline" onClick={handlePrint} className="gap-2 no-print">
          <Printer className="h-4 w-4" /> Save as PDF / Print
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 no-print">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search across all reports..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={collectionFilter} onValueChange={setCollectionFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Collection" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Collections</SelectItem>
            {collections.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[140px]" placeholder="From" />
          <span className="text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[140px]" placeholder="To" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Articles</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{filteredArticles.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Fabric</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalMeters)} m</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Masters</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{production?.masterPerformance?.length || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Production Cost</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">Rs.{fmt(totalCost)}</p></CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="no-print flex-wrap h-auto">
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="cutting">Cutting</TabsTrigger>
          <TabsTrigger value="stitching">Stitching</TabsTrigger>
          <TabsTrigger value="qc">QC</TabsTrigger>
          <TabsTrigger value="overlock">Overlock/Button</TabsTrigger>
          <TabsTrigger value="finishing">Finishing</TabsTrigger>
          <TabsTrigger value="finalstore">Final Store</TabsTrigger>
          <TabsTrigger value="masters">Masters</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="articles">
          <Card><CardContent className="pt-6">
            {loadingArticles ? <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-14 w-full" />)}</div> : !filteredArticles.length ? <div className="text-center py-12 text-muted-foreground">No articles</div> : (
              <Table><TableHeader><TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Collection</TableHead><TableHead>Work Type</TableHead><TableHead>Category</TableHead><TableHead>Pieces</TableHead><TableHead className="text-right">Components</TableHead><TableHead className="text-right">Meters</TableHead>
              </TableRow></TableHeader><TableBody>
                {filteredArticles.map(a => <TableRow key={a.id}>
                  <TableCell className="font-mono font-medium">{a.articleCode}</TableCell><TableCell>{a.articleName}</TableCell><TableCell className="text-muted-foreground">{a.collectionName || "-"}</TableCell><TableCell><Badge variant="outline">{a.partType}</Badge></TableCell><TableCell>{a.category}</TableCell><TableCell><Badge variant="secondary">{a.piecesType}</Badge></TableCell><TableCell className="text-right">{a.componentCount}</TableCell><TableCell className="text-right font-mono">{a.totalMetersReceived}m</TableCell>
                </TableRow>)}
              </TableBody></Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="cutting">
          <Card><CardHeader><CardTitle className="text-base">Cutting Jobs Output</CardTitle></CardHeader><CardContent>
            {loadingProduction ? <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-14 w-full" />)}</div> : !production?.cuttingOutput?.length ? <div className="text-center py-12 text-muted-foreground">No cutting data</div> : (
              <Table><TableHeader><TableRow>
                <TableHead>Job #</TableHead><TableHead>Article</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Masters</TableHead><TableHead className="text-right">Pieces Cut</TableHead><TableHead className="text-right">Waste (m)</TableHead><TableHead className="text-right">Amount (Rs.)</TableHead>
              </TableRow></TableHeader><TableBody>
                {production.cuttingOutput.filter(j => matchSearch(j.articleName, j.articleCode)).map(j => <TableRow key={j.jobId}>
                  <TableCell className="font-mono font-medium">CUT-{String(j.jobId).padStart(4,"0")}</TableCell><TableCell><div>{j.articleName}</div><div className="text-xs text-muted-foreground">{j.articleCode}</div></TableCell><TableCell>{statusBadge(j.status)}</TableCell><TableCell className="text-right">{j.totalAssignments}</TableCell><TableCell className="text-right font-mono font-bold">{j.totalPiecesCut}</TableCell><TableCell className="text-right font-mono text-orange-600">{j.totalWaste}</TableCell><TableCell className="text-right font-mono">{fmt(j.totalAmount)}</TableCell>
                </TableRow>)}
                <TableRow className="bg-muted/50 font-bold"><TableCell colSpan={3}>Total</TableCell><TableCell className="text-right">{production.cuttingOutput.reduce((s,j)=>s+j.totalAssignments,0)}</TableCell><TableCell className="text-right font-mono">{production.cuttingOutput.reduce((s,j)=>s+j.totalPiecesCut,0)}</TableCell><TableCell className="text-right font-mono text-orange-600">{production.cuttingOutput.reduce((s,j)=>s+j.totalWaste,0)}</TableCell><TableCell className="text-right font-mono">{fmt(production.cuttingOutput.reduce((s,j)=>s+j.totalAmount,0))}</TableCell></TableRow>
              </TableBody></Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="stitching">
          <Card><CardHeader><CardTitle className="text-base">Stitching Jobs Output</CardTitle></CardHeader><CardContent>
            {loadingProduction ? <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-14 w-full" />)}</div> : !production?.stitchingOutput?.length ? <div className="text-center py-12 text-muted-foreground">No stitching data</div> : (
              <Table><TableHeader><TableRow>
                <TableHead>Job #</TableHead><TableHead>Article</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Masters</TableHead><TableHead className="text-right">Pieces Done</TableHead><TableHead className="text-right">Amount (Rs.)</TableHead>
              </TableRow></TableHeader><TableBody>
                {production.stitchingOutput.filter(j => matchSearch(j.articleName, j.articleCode)).map(j => <TableRow key={j.jobId}>
                  <TableCell className="font-mono font-medium">STJ-{String(j.jobId).padStart(4,"0")}</TableCell><TableCell><div>{j.articleName}</div><div className="text-xs text-muted-foreground">{j.articleCode}</div></TableCell><TableCell>{statusBadge(j.status)}</TableCell><TableCell className="text-right">{j.totalAssignments}</TableCell><TableCell className="text-right font-mono font-bold">{j.totalPieces}</TableCell><TableCell className="text-right font-mono">{fmt(j.totalAmount)}</TableCell>
                </TableRow>)}
                <TableRow className="bg-muted/50 font-bold"><TableCell colSpan={3}>Total</TableCell><TableCell className="text-right">{production.stitchingOutput.reduce((s,j)=>s+j.totalAssignments,0)}</TableCell><TableCell className="text-right font-mono">{production.stitchingOutput.reduce((s,j)=>s+j.totalPieces,0)}</TableCell><TableCell className="text-right font-mono">{fmt(production.stitchingOutput.reduce((s,j)=>s+j.totalAmount,0))}</TableCell></TableRow>
              </TableBody></Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="qc">
          <Card><CardHeader><CardTitle className="text-base">Quality Control Report</CardTitle></CardHeader><CardContent>
            {!filteredQC.length ? <div className="text-center py-12 text-muted-foreground">No QC data</div> : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-muted/50 rounded-lg"><div className="text-sm text-muted-foreground">Inspected</div><div className="text-xl font-bold">{filteredQC.reduce((s,e)=>s+e.receivedQty,0)}</div></div>
                  <div className="text-center p-3 bg-green-50 rounded-lg"><div className="text-sm text-green-700">Passed</div><div className="text-xl font-bold text-green-700">{filteredQC.reduce((s,e)=>s+e.passedQty,0)}</div></div>
                  <div className="text-center p-3 bg-red-50 rounded-lg"><div className="text-sm text-red-700">Rejected</div><div className="text-xl font-bold text-red-700">{filteredQC.reduce((s,e)=>s+e.rejectedQty,0)}</div></div>
                </div>
                <Table><TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Article</TableHead><TableHead>Inspector</TableHead><TableHead>Master</TableHead><TableHead className="text-center">Received</TableHead><TableHead className="text-center">Passed</TableHead><TableHead className="text-center">Rejected</TableHead><TableHead>Pass %</TableHead><TableHead>Reason</TableHead>
                </TableRow></TableHeader><TableBody>
                  {filteredQC.map(e => { const rate = e.receivedQty > 0 ? ((e.passedQty/e.receivedQty)*100).toFixed(1) : "0"; return <TableRow key={e.id}>
                    <TableCell>{e.date.split("T")[0]}</TableCell><TableCell className="font-medium">{e.articleName}</TableCell><TableCell>{e.inspectorName}</TableCell><TableCell>{e.masterName||"-"}</TableCell><TableCell className="text-center">{e.receivedQty}</TableCell><TableCell className="text-center text-green-600">{e.passedQty}</TableCell><TableCell className="text-center text-red-600">{e.rejectedQty}</TableCell><TableCell><Badge variant={parseFloat(rate)>=90?"default":"destructive"}>{rate}%</Badge></TableCell><TableCell className="max-w-[120px] truncate">{e.rejectionReason||"-"}</TableCell>
                  </TableRow>; })}
                </TableBody></Table>
              </>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="overlock">
          <Card><CardHeader><CardTitle className="text-base">Overlock / Button Report</CardTitle></CardHeader><CardContent>
            {!filteredOB.length ? <div className="text-center py-12 text-muted-foreground">No data</div> : (
              <Table><TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Article</TableHead><TableHead>Master</TableHead><TableHead className="text-center">Received</TableHead><TableHead className="text-center">Done</TableHead><TableHead className="text-center">Waste</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader><TableBody>
                {filteredOB.map(e => <TableRow key={e.id}>
                  <TableCell>{e.date.split("T")[0]}</TableCell><TableCell><Badge variant="outline">{e.taskType}</Badge></TableCell><TableCell className="font-medium">{e.articleName}</TableCell><TableCell>{e.masterName}</TableCell><TableCell className="text-center">{e.receivedQty}</TableCell><TableCell className="text-center">{e.completedQty||"-"}</TableCell><TableCell className="text-center">{e.wasteQty||"-"}</TableCell><TableCell className="font-mono">{e.totalAmount?`Rs.${fmt(e.totalAmount)}`:"-"}</TableCell><TableCell>{statusBadge(e.status)}</TableCell>
                </TableRow>)}
                <TableRow className="bg-muted/50 font-bold"><TableCell colSpan={4}>Total</TableCell><TableCell className="text-center">{filteredOB.reduce((s,e)=>s+e.receivedQty,0)}</TableCell><TableCell className="text-center">{filteredOB.reduce((s,e)=>s+(e.completedQty||0),0)}</TableCell><TableCell className="text-center">{filteredOB.reduce((s,e)=>s+(e.wasteQty||0),0)}</TableCell><TableCell className="font-mono">Rs.{fmt(filteredOB.reduce((s,e)=>s+(e.totalAmount||0),0))}</TableCell><TableCell /></TableRow>
              </TableBody></Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="finishing">
          <Card><CardHeader><CardTitle className="text-base">Finishing Report</CardTitle></CardHeader><CardContent>
            {!filteredFin.length ? <div className="text-center py-12 text-muted-foreground">No data</div> : (
              <Table><TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Article</TableHead><TableHead>Worker</TableHead><TableHead className="text-center">Received</TableHead><TableHead className="text-center">Packed</TableHead><TableHead className="text-center">Waste</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader><TableBody>
                {filteredFin.map(e => <TableRow key={e.id}>
                  <TableCell>{e.date.split("T")[0]}</TableCell><TableCell className="font-medium">{e.articleName}</TableCell><TableCell>{e.workerName}</TableCell><TableCell className="text-center">{e.receivedQty}</TableCell><TableCell className="text-center">{e.packedQty||"-"}</TableCell><TableCell className="text-center">{e.wasteQty||"-"}</TableCell><TableCell className="font-mono">{e.totalAmount?`Rs.${fmt(e.totalAmount)}`:"-"}</TableCell><TableCell>{statusBadge(e.status)}</TableCell>
                </TableRow>)}
                <TableRow className="bg-muted/50 font-bold"><TableCell colSpan={3}>Total</TableCell><TableCell className="text-center">{filteredFin.reduce((s,e)=>s+e.receivedQty,0)}</TableCell><TableCell className="text-center">{filteredFin.reduce((s,e)=>s+(e.packedQty||0),0)}</TableCell><TableCell className="text-center">{filteredFin.reduce((s,e)=>s+(e.wasteQty||0),0)}</TableCell><TableCell className="font-mono">Rs.{fmt(filteredFin.reduce((s,e)=>s+(e.totalAmount||0),0))}</TableCell><TableCell /></TableRow>
              </TableBody></Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="finalstore">
          <Card><CardHeader><CardTitle className="text-base">Final Store Report</CardTitle></CardHeader><CardContent>
            {!filteredFS.length ? <div className="text-center py-12 text-muted-foreground">No data</div> : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-muted/50 rounded-lg"><div className="text-sm text-muted-foreground">Total Receipts</div><div className="text-xl font-bold">{filteredFS.length}</div></div>
                  <div className="text-center p-3 bg-green-50 rounded-lg"><div className="text-sm text-green-700">Total Packed</div><div className="text-xl font-bold text-green-700">{fmt(filteredFS.reduce((s,e)=>s+e.packedQty,0))} pcs</div></div>
                </div>
                <Table><TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Article</TableHead><TableHead>Received By</TableHead><TableHead>From</TableHead><TableHead className="text-center">Packed Qty</TableHead>
                </TableRow></TableHeader><TableBody>
                  {filteredFS.map(e => <TableRow key={e.id}>
                    <TableCell>{e.date.split("T")[0]}</TableCell><TableCell className="font-medium">{e.articleName}</TableCell><TableCell>{e.receivedBy}</TableCell><TableCell>{e.receivedFrom}</TableCell><TableCell className="text-center font-mono font-bold">{e.packedQty}</TableCell>
                  </TableRow>)}
                </TableBody></Table>
              </>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="masters">
          <Card><CardHeader><CardTitle className="text-base">Master Performance & Payments</CardTitle></CardHeader><CardContent>
            {loadingProduction ? <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-14 w-full" />)}</div> : !production?.masterPerformance?.length ? <div className="text-center py-12 text-muted-foreground">No master data</div> : (
              <Table><TableHeader><TableRow>
                <TableHead>Master Name</TableHead><TableHead>Type</TableHead><TableHead>Machine</TableHead><TableHead className="text-right">Total Earned</TableHead><TableHead className="text-right">Total Paid</TableHead><TableHead className="text-right">Balance Due</TableHead>
              </TableRow></TableHeader><TableBody>
                {production.masterPerformance.filter(m => matchSearch(m.masterName, m.masterType)).map(m => <TableRow key={m.masterId}>
                  <TableCell className="font-medium">{m.masterName}</TableCell><TableCell><Badge variant="outline">{m.masterType}</Badge></TableCell><TableCell>{m.machineNo||"-"}</TableCell><TableCell className="text-right font-mono text-green-600">Rs.{fmt(m.totalEarned)}</TableCell><TableCell className="text-right font-mono text-blue-600">Rs.{fmt(m.totalPaid)}</TableCell><TableCell className={`text-right font-mono font-bold ${m.balance>0?"text-orange-600":"text-green-600"}`}>Rs.{fmt(m.balance)}</TableCell>
                </TableRow>)}
                <TableRow className="bg-muted/50 font-bold"><TableCell colSpan={3}>Total</TableCell><TableCell className="text-right font-mono text-green-600">Rs.{fmt(production.masterPerformance.reduce((s,m)=>s+m.totalEarned,0))}</TableCell><TableCell className="text-right font-mono text-blue-600">Rs.{fmt(production.masterPerformance.reduce((s,m)=>s+m.totalPaid,0))}</TableCell><TableCell className="text-right font-mono text-orange-600">Rs.{fmt(production.masterPerformance.reduce((s,m)=>s+m.balance,0))}</TableCell></TableRow>
              </TableBody></Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card><CardHeader><CardTitle className="text-base">Cost Analysis</CardTitle></CardHeader><CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-700">Cutting Cost</div>
                  <div className="text-xl font-bold text-blue-800">Rs.{fmt(production?.cuttingOutput.reduce((s,j)=>s+j.totalAmount,0)||0)}</div>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="text-sm text-indigo-700">Stitching Cost</div>
                  <div className="text-xl font-bold text-indigo-800">Rs.{fmt(production?.stitchingOutput.reduce((s,j)=>s+j.totalAmount,0)||0)}</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-sm text-purple-700">Overlock/Button Cost</div>
                  <div className="text-xl font-bold text-purple-800">Rs.{fmt(filteredOB.reduce((s,e)=>s+(e.totalAmount||0),0))}</div>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="text-sm text-teal-700">Finishing Cost</div>
                  <div className="text-xl font-bold text-teal-800">Rs.{fmt(filteredFin.reduce((s,e)=>s+(e.totalAmount||0),0))}</div>
                </div>
              </div>
              <div className="p-6 bg-primary/5 rounded-lg border border-primary/20 text-center">
                <div className="text-sm text-muted-foreground">Total Production Cost</div>
                <div className="text-3xl font-bold text-primary mt-1">Rs.{fmt(totalCost)}</div>
              </div>
              <Table><TableHeader><TableRow>
                <TableHead>Department</TableHead><TableHead className="text-right">Total Pieces</TableHead><TableHead className="text-right">Total Cost (Rs.)</TableHead><TableHead className="text-right">Cost per Piece</TableHead>
              </TableRow></TableHeader><TableBody>
                {(() => {
                  const cutPcs = production?.cuttingOutput.reduce((s,j)=>s+j.totalPiecesCut,0)||0;
                  const cutAmt = production?.cuttingOutput.reduce((s,j)=>s+j.totalAmount,0)||0;
                  const sthPcs = production?.stitchingOutput.reduce((s,j)=>s+j.totalPieces,0)||0;
                  const sthAmt = production?.stitchingOutput.reduce((s,j)=>s+j.totalAmount,0)||0;
                  const obPcs = filteredOB.reduce((s,e)=>s+(e.completedQty||0),0);
                  const obAmt = filteredOB.reduce((s,e)=>s+(e.totalAmount||0),0);
                  const finPcs = filteredFin.reduce((s,e)=>s+(e.packedQty||0),0);
                  const finAmt = filteredFin.reduce((s,e)=>s+(e.totalAmount||0),0);
                  const rows = [
                    { dept: "Cutting", pcs: cutPcs, amt: cutAmt },
                    { dept: "Stitching", pcs: sthPcs, amt: sthAmt },
                    { dept: "Overlock/Button", pcs: obPcs, amt: obAmt },
                    { dept: "Finishing", pcs: finPcs, amt: finAmt },
                  ];
                  return rows.map(r => <TableRow key={r.dept}>
                    <TableCell className="font-medium">{r.dept}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.pcs)}</TableCell>
                    <TableCell className="text-right font-mono">Rs.{fmt(r.amt)}</TableCell>
                    <TableCell className="text-right font-mono">{r.pcs>0?`Rs.${(r.amt/r.pcs).toFixed(2)}`:"-"}</TableCell>
                  </TableRow>);
                })()}
              </TableBody></Table>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
