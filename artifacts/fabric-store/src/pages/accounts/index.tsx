import { useState, useEffect } from "react";
import { Link } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Wallet, TrendingUp, CreditCard, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/api";

interface AccountSummary {
  masterId: number;
  masterName: string;
  masterType: string;
  balance: number;
  totalEarned: number;
  totalPaid: number;
}

export default function AccountsList() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchAccounts = async () => {
    setLoading(true);
    try { const data = await apiGet<AccountSummary[]>("/accounts"); setAccounts(data); } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchAccounts(); }, []);

  const filtered = accounts.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.masterName.toLowerCase().includes(q) || a.masterType.toLowerCase().includes(q);
  });

  const totalBalance = filtered.reduce((s, a) => s + (a.balance || 0), 0);
  const totalEarned = filtered.reduce((s, a) => s + (a.totalEarned || 0), 0);
  const totalPaid = filtered.reduce((s, a) => s + (a.totalPaid || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Accounts / Ledger" description="Master accounts, earnings, payments, and balances" />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4 text-orange-500" /> Total Outstanding</div><div className="text-2xl font-bold text-orange-600">Rs.{totalBalance.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4 text-green-500" /> Total Earned</div><div className="text-2xl font-bold text-green-600">Rs.{totalEarned.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground flex items-center gap-1"><CreditCard className="h-4 w-4 text-blue-500" /> Total Paid</div><div className="text-2xl font-bold text-blue-600">Rs.{totalPaid.toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by master name or type..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !filtered.length ? (
            <div className="text-center py-12 text-muted-foreground"><p className="text-lg font-medium">No accounts</p><p className="text-sm mt-1">Add masters first, accounts are created automatically</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Master Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total Earned</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(a => (
                  <TableRow key={a.masterId}>
                    <TableCell className="font-medium">{a.masterName}</TableCell>
                    <TableCell><Badge variant="secondary">{a.masterType}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-green-600">Rs.{(a.totalEarned || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-blue-600">Rs.{(a.totalPaid || 0).toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${(a.balance || 0) > 0 ? "text-orange-600" : "text-green-600"}`}>Rs.{(a.balance || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/accounts/${a.masterId}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
