import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface WorkerRow {
  id: number;
  name: string;
  masterType: string;
  machineNo: string | null;
  totalPieces: number;
  qcReceived: number;
  qcRejected: number;
  defectRate: string | number;
}

const typeColor: Record<string, string> = {
  cutting: "bg-blue-100 text-blue-700 border-blue-200",
  stitching: "bg-indigo-100 text-indigo-700 border-indigo-200",
  overlock: "bg-purple-100 text-purple-700 border-purple-200",
  button: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  qc: "bg-amber-100 text-amber-700 border-amber-200",
  finishing: "bg-teal-100 text-teal-700 border-teal-200",
};

export function WorkerPerformanceWidget({ days = 30 }: { days?: number }) {
  const [rows, setRows] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<WorkerRow[]>(`/dashboard/workers?days=${days}`)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Workers</CardTitle>
        <CardDescription>Pieces completed and defect rate — last {days} days</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No production recorded in the last {days} days.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Pieces</TableHead>
                  <TableHead className="text-right">Defect %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(w => {
                  const dr = Number(w.defectRate);
                  const drColor = dr === 0 ? "text-muted-foreground" : dr < 3 ? "text-emerald-600" : dr < 8 ? "text-amber-600" : "text-red-600";
                  return (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="font-medium">{w.name}</div>
                        {w.machineNo && <div className="text-xs text-muted-foreground">M/C {w.machineNo}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeColor[w.masterType] || ""}>
                          {w.masterType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{w.totalPieces.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-medium ${drColor}`}>
                        {w.qcReceived > 0 ? `${dr}%` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
