import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { printJobCard } from "@/components/JobCard";

type Tracker = {
  article: { id: number; articleCode: string; articleName: string; collectionName?: string | null; piecesType?: string | null; partType?: string | null; category?: string | null };
  components: { id: number; componentName: string; fabricName: string; totalMetersReceived: number }[];
  currentStage: string;
  summary: {
    totalPiecesCut: number;
    totalPiecesStitched: number;
    totalPiecesPassedQc: number;
    totalPiecesPacked: number;
    totalPiecesInFinalStore: number;
    fabricCost: number;
    cuttingCost: number;
    stitchingCost: number;
    overlockCost: number;
    finishingCost: number;
    totalCost: number;
    costPerPiece: number;
  };
  sizeBreakdown: { size: string; cut: number; stitched: number; qcPassed: number; overlocked: number; packed: number; inStore: number }[];
  cuttingJobs: { id: number; jobDate: string; demandPieces: number | null; status: string; assignments: { id: number; masterName: string | null; componentName: string; piecesCut: number | null; status: string; handoverStatus: string | null; receivedBy: string | null; totalAmount: number | null; sizes: { size: string; quantity: number; completedQty: number | null }[] }[] }[];
  stitchingJobs: { id: number; jobDate: string; supervisorName: string; status: string; assignments: { id: number; masterName: string | null; componentName: string; size: string | null; quantityGiven: number; quantityCompleted: number | null; ratePerPiece: number | null; totalAmount: number | null; status: string }[] }[];
  qcEntries: { id: number; inspectorName: string; masterName: string | null; componentName: string | null; size: string | null; receivedFrom: string | null; receivedQty: number; passedQty: number; rejectedQty: number; date: string }[];
  overlockEntries: { id: number; taskType: string; masterName: string | null; componentName: string | null; size: string | null; receivedFrom: string | null; receivedQty: number; completedQty: number | null; totalAmount: number | null; status: string; date: string }[];
  finishingEntries: { id: number; workerName: string; masterName: string | null; componentName: string | null; size: string | null; receivedFrom: string | null; receivedQty: number; packedQty: number | null; totalAmount: number | null; status: string; date: string }[];
  finalStore: { id: number; receivedBy: string; receivedFrom: string; size: string | null; packedQty: number; date: string }[];
};

const fmt = (n: number) => `Rs.${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function ArticleTracker() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    apiGet<Tracker>(`/articles/${params.id}/tracker`)
      .then((d) => { if (!cancel) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [params.id]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!data) return <div className="p-8 text-destructive">Article not found</div>;

  const { article, components, currentStage, summary, sizeBreakdown, cuttingJobs, stitchingJobs, qcEntries, overlockEntries, finishingEntries, finalStore } = data;

  const printFinal = () => printJobCard({
    title: `Final Job Card`,
    subtitle: `${article.articleCode} — ${article.articleName}`,
    jobNumber: article.id,
    date: new Date().toLocaleDateString(),
    qrData: `${window.location.origin}/articles/${article.id}/track`,
    qrLabel: "Scan to track production",
    sections: [
      {
        heading: "Article Info",
        rows: [
          { label: "Article Code", value: article.articleCode },
          { label: "Article Name", value: article.articleName },
          { label: "Collection", value: article.collectionName || "-" },
          { label: "Type", value: article.partType || "-" },
          { label: "Pieces Type", value: article.piecesType || "-" },
          { label: "Current Stage", value: currentStage },
        ],
      },
      {
        heading: "Production Summary",
        rows: [
          { label: "Pieces Cut", value: summary.totalPiecesCut },
          { label: "Pieces Stitched", value: summary.totalPiecesStitched },
          { label: "Pieces QC Passed", value: summary.totalPiecesPassedQc },
          { label: "Pieces Packed", value: summary.totalPiecesPacked },
          { label: "Pieces In Final Store", value: summary.totalPiecesInFinalStore },
        ],
      },
      {
        heading: "Cost Breakdown",
        rows: [
          { label: "Cutting Cost", value: fmt(summary.cuttingCost) },
          { label: "Stitching Cost", value: fmt(summary.stitchingCost) },
          { label: "Overlock/Button Cost", value: fmt(summary.overlockCost) },
          { label: "Finishing Cost", value: fmt(summary.finishingCost) },
          { label: "Total Production Cost", value: fmt(summary.totalCost) },
          { label: "Cost / Piece (in Final Store)", value: fmt(summary.costPerPiece) },
        ],
      },
    ],
    tables: [
      {
        heading: "Size Breakdown — All Stages",
        columns: ["Size", "Cut", "Stitched", "QC Pass", "Overlock", "Packed", "Final Store"],
        rows: sizeBreakdown.map((s) => [s.size, s.cut, s.stitched, s.qcPassed, s.overlocked, s.packed, s.inStore]),
      },
      {
        heading: "Components",
        columns: ["Component", "Fabric", "Meters Received"],
        rows: components.map((c) => [c.componentName, c.fabricName, `${c.totalMetersReceived}m`]),
      },
    ],
    footerNote: "Final Job Card — generated from Stitching ERP",
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/articles"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{article.articleCode} — {article.articleName}</h1>
            <p className="text-sm text-muted-foreground">{article.collectionName || ""} {article.partType ? `· ${article.partType}` : ""} {article.piecesType ? `· ${article.piecesType}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-sm" variant="secondary">Currently in: {currentStage}</Badge>
          <Button onClick={printFinal} size="sm"><Printer className="h-4 w-4 mr-2" /> Print Final Job Card</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Cut", value: summary.totalPiecesCut, color: "bg-blue-50 text-blue-700" },
          { label: "Stitched", value: summary.totalPiecesStitched, color: "bg-purple-50 text-purple-700" },
          { label: "QC Passed", value: summary.totalPiecesPassedQc, color: "bg-amber-50 text-amber-700" },
          { label: "Packed", value: summary.totalPiecesPacked, color: "bg-green-50 text-green-700" },
          { label: "Final Store", value: summary.totalPiecesInFinalStore, color: "bg-emerald-50 text-emerald-700" },
        ].map((s) => (
          <Card key={s.label} className={s.color + " border-0"}>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wide opacity-70">{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
              <div className="text-[10px] opacity-60 mt-1">pieces</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Cost Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
            <Row label="Cutting" value={fmt(summary.cuttingCost)} />
            <Row label="Stitching" value={fmt(summary.stitchingCost)} />
            <Row label="Overlock/Button" value={fmt(summary.overlockCost)} />
            <Row label="Finishing" value={fmt(summary.finishingCost)} />
            <Row label="Total Cost" value={fmt(summary.totalCost)} highlight />
            <Row label="Cost / Piece" value={fmt(summary.costPerPiece)} highlight />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Size Flow Across Stages</CardTitle></CardHeader>
        <CardContent>
          {sizeBreakdown.length === 0 ? (
            <div className="text-sm text-muted-foreground">No size data yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Cut</TableHead>
                  <TableHead className="text-right">Stitched</TableHead>
                  <TableHead className="text-right">QC Pass</TableHead>
                  <TableHead className="text-right">Overlock</TableHead>
                  <TableHead className="text-right">Packed</TableHead>
                  <TableHead className="text-right">Final Store</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sizeBreakdown.map((s) => (
                  <TableRow key={s.size}>
                    <TableCell><Badge variant="outline">{s.size}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{s.cut}</TableCell>
                    <TableCell className="text-right font-mono">{s.stitched}</TableCell>
                    <TableCell className="text-right font-mono">{s.qcPassed}</TableCell>
                    <TableCell className="text-right font-mono">{s.overlocked}</TableCell>
                    <TableCell className="text-right font-mono">{s.packed}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{s.inStore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cutting Jobs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {cuttingJobs.length === 0 ? <div className="text-sm text-muted-foreground">No cutting jobs.</div> : cuttingJobs.map((j) => (
            <div key={j.id} className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Job #{j.id} · {new Date(j.jobDate).toLocaleDateString()} · Demand: {j.demandPieces || "-"}</div>
                <div className="flex items-center gap-2">
                  <Badge variant={j.status === "completed" ? "default" : "secondary"}>{j.status}</Badge>
                  <Link href={`/cutting/${j.id}`}><Button variant="ghost" size="sm">Open →</Button></Link>
                </div>
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Master</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Sizes</TableHead>
                  <TableHead className="text-right">Pcs Cut</TableHead>
                  <TableHead>Handover</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {j.assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.masterName || "-"}</TableCell>
                      <TableCell>{a.componentName}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {a.sizes.map((s, i) => <Badge key={i} variant="outline" className="text-[10px]">{s.size}: {a.status === "completed" ? (s.completedQty ?? s.quantity) : s.quantity}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{a.piecesCut ?? "-"}</TableCell>
                      <TableCell className="text-xs">{a.handoverStatus ? `${a.handoverStatus}${a.receivedBy ? ` → ${a.receivedBy}` : ""}` : "-"}</TableCell>
                      <TableCell className="text-right font-mono">{a.totalAmount ? fmt(a.totalAmount) : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Stitching Jobs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {stitchingJobs.length === 0 ? <div className="text-sm text-muted-foreground">No stitching jobs.</div> : stitchingJobs.map((j) => (
            <div key={j.id} className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Job #{j.id} · {new Date(j.jobDate).toLocaleDateString()} · Supervisor: {j.supervisorName}</div>
                <div className="flex items-center gap-2">
                  <Badge variant={j.status === "completed" ? "default" : "secondary"}>{j.status}</Badge>
                  <Link href={`/stitching/${j.id}`}><Button variant="ghost" size="sm">Open →</Button></Link>
                </div>
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Master</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Given</TableHead>
                  <TableHead className="text-right">Done</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {j.assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.masterName || "-"}</TableCell>
                      <TableCell>{a.componentName}</TableCell>
                      <TableCell>{a.size ? <Badge variant="outline">{a.size}</Badge> : "-"}</TableCell>
                      <TableCell className="text-right font-mono">{a.quantityGiven}</TableCell>
                      <TableCell className="text-right font-mono">{a.quantityCompleted ?? "-"}</TableCell>
                      <TableCell className="text-right font-mono">{a.ratePerPiece ? `Rs.${a.ratePerPiece}` : "-"}</TableCell>
                      <TableCell className="text-right font-mono">{a.totalAmount ? fmt(a.totalAmount) : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>QC Entries ({qcEntries.length})</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>Comp/Size</TableHead><TableHead className="text-right">Recv</TableHead><TableHead className="text-right">Pass</TableHead><TableHead className="text-right">Rej</TableHead>
            </TableRow></TableHeader><TableBody>
              {qcEntries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No entries</TableCell></TableRow>}
              {qcEntries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs">{e.receivedFrom || "-"}</TableCell>
                  <TableCell className="text-xs">{e.componentName || "-"}{e.size ? ` / ${e.size}` : ""}</TableCell>
                  <TableCell className="text-right font-mono">{e.receivedQty}</TableCell>
                  <TableCell className="text-right font-mono text-green-700">{e.passedQty}</TableCell>
                  <TableCell className="text-right font-mono text-red-700">{e.rejectedQty}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Overlock/Button ({overlockEntries.length})</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Task</TableHead><TableHead>From</TableHead><TableHead>Comp/Size</TableHead><TableHead className="text-right">Done</TableHead><TableHead className="text-right">Cost</TableHead>
            </TableRow></TableHeader><TableBody>
              {overlockEntries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No entries</TableCell></TableRow>}
              {overlockEntries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs">{e.taskType}</TableCell>
                  <TableCell className="text-xs">{e.receivedFrom || "-"}</TableCell>
                  <TableCell className="text-xs">{e.componentName || "-"}{e.size ? ` / ${e.size}` : ""}</TableCell>
                  <TableCell className="text-right font-mono">{e.completedQty ?? "-"}</TableCell>
                  <TableCell className="text-right font-mono">{e.totalAmount ? fmt(e.totalAmount) : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Finishing ({finishingEntries.length})</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>Comp/Size</TableHead><TableHead className="text-right">Recv</TableHead><TableHead className="text-right">Packed</TableHead><TableHead className="text-right">Cost</TableHead>
            </TableRow></TableHeader><TableBody>
              {finishingEntries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No entries</TableCell></TableRow>}
              {finishingEntries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs">{e.receivedFrom || "-"}</TableCell>
                  <TableCell className="text-xs">{e.componentName || "-"}{e.size ? ` / ${e.size}` : ""}</TableCell>
                  <TableCell className="text-right font-mono">{e.receivedQty}</TableCell>
                  <TableCell className="text-right font-mono">{e.packedQty ?? "-"}</TableCell>
                  <TableCell className="text-right font-mono">{e.totalAmount ? fmt(e.totalAmount) : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Final Store ({finalStore.length})</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>Recv By</TableHead><TableHead>Size</TableHead><TableHead className="text-right">Packed</TableHead>
            </TableRow></TableHeader><TableBody>
              {finalStore.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No entries</TableCell></TableRow>}
              {finalStore.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs">{e.receivedFrom}</TableCell>
                  <TableCell className="text-xs">{e.receivedBy}</TableCell>
                  <TableCell>{e.size ? <Badge variant="outline">{e.size}</Badge> : "-"}</TableCell>
                  <TableCell className="text-right font-mono">{e.packedQty}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`border rounded p-3 ${highlight ? "bg-primary/5 border-primary/30" : ""}`}>
      <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className={`mt-1 font-mono font-bold ${highlight ? "text-lg text-primary" : "text-base"}`}>{value}</div>
    </div>
  );
}
