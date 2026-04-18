import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

export interface BreakdownRow {
  component: string;
  size: string;
  qty: string;
  rate: string;
  passed?: string;
  rejected?: string;
}

export const emptyBreakdownRow = (overrides: Partial<BreakdownRow> = {}): BreakdownRow => ({
  component: "", size: "", qty: "", rate: "", ...overrides,
});

interface Props {
  rows: BreakdownRow[];
  onChange: (rows: BreakdownRow[]) => void;
  showRate?: boolean;
  showPassedRejected?: boolean;
  qtyLabel?: string;
}

export function SizeBreakdownRows({
  rows,
  onChange,
  showRate = true,
  showPassedRejected = false,
  qtyLabel = "Qty",
}: Props) {
  const update = (idx: number, patch: Partial<BreakdownRow>) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const remove = (idx: number) => {
    onChange(rows.length === 1 ? [emptyBreakdownRow()] : rows.filter((_, i) => i !== idx));
  };
  const add = () => onChange([...rows, emptyBreakdownRow()]);

  const totalQty = rows.reduce((s, r) => s + (parseInt(r.qty) || 0), 0);
  const totalAmt = rows.reduce(
    (s, r) => s + (parseInt(r.qty) || 0) * (parseFloat(r.rate) || 0),
    0,
  );

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Size Breakdown</Label>
        <span className="text-xs text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{totalQty}</span> pcs
          {showRate && totalAmt > 0 && (
            <> · <span className="font-semibold text-foreground">Rs.{totalAmt.toLocaleString()}</span></>
          )}
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((r, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-1.5 items-end">
            <div className="col-span-3">
              {idx === 0 && <Label className="text-[10px] uppercase text-muted-foreground">Component</Label>}
              <Input
                className="h-8 text-sm"
                placeholder="e.g. Front"
                value={r.component}
                onChange={e => update(idx, { component: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              {idx === 0 && <Label className="text-[10px] uppercase text-muted-foreground">Size</Label>}
              <Select value={r.size || "_none"} onValueChange={v => update(idx, { size: v === "_none" ? "" : v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className={showPassedRejected ? "col-span-2" : "col-span-3"}>
              {idx === 0 && <Label className="text-[10px] uppercase text-muted-foreground">{qtyLabel} *</Label>}
              <Input
                className="h-8 text-sm"
                type="number"
                inputMode="numeric"
                min="0"
                value={r.qty}
                onChange={e => update(idx, { qty: e.target.value })}
              />
            </div>
            {showPassedRejected && (
              <>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-[10px] uppercase text-muted-foreground">Passed</Label>}
                  <Input className="h-8 text-sm" type="number" min="0" value={r.passed || ""} onChange={e => update(idx, { passed: e.target.value })} />
                </div>
                <div className="col-span-2">
                  {idx === 0 && <Label className="text-[10px] uppercase text-muted-foreground">Rejected</Label>}
                  <Input className="h-8 text-sm" type="number" min="0" value={r.rejected || ""} onChange={e => update(idx, { rejected: e.target.value })} />
                </div>
              </>
            )}
            {showRate && !showPassedRejected && (
              <div className="col-span-3">
                {idx === 0 && <Label className="text-[10px] uppercase text-muted-foreground">Rate/Piece</Label>}
                <Input
                  className="h-8 text-sm"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="optional"
                  value={r.rate}
                  onChange={e => update(idx, { rate: e.target.value })}
                />
              </div>
            )}
            <div className={showPassedRejected ? "col-span-1" : "col-span-1"}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => remove(idx)}
                title="Remove row"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full h-8 mt-1">
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Size Row
      </Button>
    </div>
  );
}

export function validBreakdownRows(rows: BreakdownRow[]): BreakdownRow[] {
  return rows.filter(r => (parseInt(r.qty) || 0) > 0);
}
