import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, ArrowDownToLine, RefreshCw } from "lucide-react";
import { apiGet } from "@/lib/api";
import { format } from "date-fns";

export interface PendingRow {
  articleId: number;
  articleCode?: string;
  articleName?: string;
  componentName?: string | null;
  size?: string | null;
  masterId?: number | null;
  masterName?: string | null;
  workerName?: string | null;
  inspectorName?: string | null;
  taskType?: string | null;
  available: number;
  lastDate?: string | null;
}

interface Props {
  title: string;
  description?: string;
  endpoint: string;
  fromLabel: string;
  showComponent?: boolean;
  onReceive: (row: PendingRow) => void;
  refreshKey?: number;
}

export function PendingPoolCard({ title, description, endpoint, fromLabel, showComponent = true, onReceive, refreshKey = 0 }: Props) {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const data = await apiGet<PendingRow[]>(endpoint);
      setRows(data);
    } catch {
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, [endpoint, refreshKey]);

  const total = rows.reduce((s, r) => s + r.available, 0);

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="bg-amber-100 text-amber-700 p-2 rounded-md mt-0.5">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-base">{title}</div>
              {description && <div className="text-xs text-muted-foreground">{description}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white text-base font-semibold px-3" data-testid="badge-pool-total">{total} pcs ready</Badge>
            <Button variant="ghost" size="icon" onClick={fetchRows} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !rows.length ? (
          <div className="text-center py-6 text-sm text-muted-foreground bg-white rounded-md border border-dashed">
            All clear — no pieces pending from {fromLabel}.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  {showComponent && <TableHead>Component</TableHead>}
                  <TableHead>Size</TableHead>
                  <TableHead>From ({fromLabel})</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead>Last Done</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} data-testid={`pool-row-${i}`}>
                    <TableCell>
                      <div className="font-medium">{r.articleName}</div>
                      <div className="text-xs text-muted-foreground">{r.articleCode}</div>
                    </TableCell>
                    {showComponent && <TableCell>{r.componentName || "-"}</TableCell>}
                    <TableCell>{r.size ? <Badge variant="secondary">{r.size}</Badge> : "-"}</TableCell>
                    <TableCell className="text-sm">
                      {r.masterName || r.workerName || r.inspectorName || "-"}
                      {r.taskType && <Badge variant="outline" className="ml-1 text-[10px]">{r.taskType}</Badge>}
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold text-amber-700">{r.available}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.lastDate ? format(new Date(r.lastDate), "MMM d") : "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => onReceive(r)} data-testid={`button-receive-${i}`}>
                        <ArrowDownToLine className="h-3.5 w-3.5 mr-1" /> Receive
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
  );
}
