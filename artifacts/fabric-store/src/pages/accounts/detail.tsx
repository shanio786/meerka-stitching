import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, CreditCard, Plus, ArrowDown, ArrowUp, Printer, Search, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost } from "@/lib/api";
import { format } from "date-fns";

interface Transaction {
  id: number;
  date: string;
  description: string;
  type: string;
  amount: number;
}

interface Payment {
  id: number;
  date: string;
  amount: number;
  paymentMethod: string;
  notes: string | null;
}

interface AccountData {
  masterName: string;
  masterType: string;
  balance: number;
  totalEarned: number;
  totalPaid: number;
}

interface LedgerData {
  account: AccountData;
  transactions: Transaction[];
  payments: Payment[];
}

export default function AccountDetail() {
  const { masterId } = useParams<{ masterId: string }>();
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payDialog, setPayDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { toast } = useToast();

  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "cash", notes: "", date: new Date().toISOString().split("T")[0] });

  const fetchLedger = async () => {
    setLoading(true);
    try { const data = await apiGet<LedgerData>(`/accounts/${masterId}/ledger`); setLedger(data); } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchLedger(); }, [masterId]);

  const handlePay = async () => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { toast({ title: "Enter valid amount", variant: "destructive" }); return; }
    try {
      await apiPost(`/accounts/${masterId}/payment`, {
        amount: parseFloat(payForm.amount), paymentMethod: payForm.paymentMethod, notes: payForm.notes, date: payForm.date,
      });
      toast({ title: "Payment recorded" });
      setPayDialog(false);
      setPayForm({ amount: "", paymentMethod: "cash", notes: "", date: new Date().toISOString().split("T")[0] });
      fetchLedger();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to record";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!ledger?.account) return <div className="text-center py-12 text-muted-foreground">Account not found</div>;

  const { account, transactions, payments } = ledger;

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

      <PageHeader title={account.masterName} description={`${account.masterType} master ledger`} actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="gap-2 no-print">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Dialog open={payDialog} onOpenChange={setPayDialog}>
            <DialogTrigger asChild><Button className="no-print"><Plus className="mr-2 h-4 w-4" /> Make Payment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Amount (Rs.) *</Label><Input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} /></div>
                <div><Label>Payment Method</Label>
                  <Select value={payForm.paymentMethod} onValueChange={v => setPayForm({ ...payForm, paymentMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="easypaisa">Easypaisa</SelectItem>
                      <SelectItem value="jazzcash">JazzCash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} /></div>
                <div><Label>Notes</Label><Input value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} placeholder="e.g. Weekly payment" /></div>
                <Button className="w-full" onClick={handlePay}>Record Payment</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      } />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4 text-orange-500" /> Balance Due</div><div className="text-2xl font-bold text-orange-600">Rs.{(account.balance || 0).toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4 text-green-500" /> Total Earned</div><div className="text-2xl font-bold text-green-600">Rs.{(account.totalEarned || 0).toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><CreditCard className="h-4 w-4 text-blue-500" /> Total Paid</div><div className="text-2xl font-bold text-blue-600">Rs.{(account.totalPaid || 0).toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4 no-print">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="earning">Earnings</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[140px]" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[140px]" />
            </div>
          </div>
          {(() => {
            const filtered = transactions.filter(t => {
              if (typeFilter !== "all" && t.type !== typeFilter) return false;
              if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
              const d = t.date.split("T")[0];
              if (dateFrom && d < dateFrom) return false;
              if (dateTo && d > dateTo) return false;
              return true;
            });
            return !filtered.length ? (
              <div className="text-center py-8 text-muted-foreground">{transactions.length === 0 ? "No transactions yet" : "No transactions match your filters"}</div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{format(new Date(t.date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === "earning" ? "default" : t.type === "payment" ? "outline" : "secondary"}>
                        {t.type === "earning" ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono font-medium ${t.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {t.amount >= 0 ? "+" : ""}Rs.{Math.abs(t.amount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            );
          })()}
        </CardContent>
      </Card>

      {payments?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.date), "MMM d, yyyy")}</TableCell>
                    <TableCell><Badge variant="outline">{p.paymentMethod}</Badge></TableCell>
                    <TableCell>{p.notes || "-"}</TableCell>
                    <TableCell className="text-right font-mono font-medium text-blue-600">Rs.{p.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
