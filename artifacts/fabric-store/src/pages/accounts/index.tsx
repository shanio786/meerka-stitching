import { useState, useEffect } from "react";
import { Link } from "wouter";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Wallet, TrendingUp, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/api";

export default function AccountsList() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAccounts = async () => {
    setLoading(true);
    try { const data = await apiGet("/accounts"); setAccounts(data); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setLoading(false);
  };

  useEffect(() => { fetchAccounts(); }, []);

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalEarned = accounts.reduce((s, a) => s + (a.totalEarned || 0), 0);
  const totalPaid = accounts.reduce((s, a) => s + (a.totalPaid || 0), 0);

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
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !accounts.length ? (
            <div className="text-center py-12 text-muted-foreground"><p className="text-lg font-medium">No accounts</p><p className="text-sm mt-1">Add masters first, accounts are created automatically</p></div>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.masterName}</TableCell>
                    <TableCell><Badge variant="secondary">{a.masterType}</Badge></TableCell>
                    <TableCell>{a.machineNo || "-"}</TableCell>
                    <TableCell className="text-right font-mono text-green-600">Rs.{(a.totalEarned || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-blue-600">Rs.{(a.totalPaid || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{a.balance > 0 ? <span className="text-orange-600">Rs.{a.balance.toLocaleString()}</span> : <span className="text-green-600">Rs.0</span>}</TableCell>
                    <TableCell className="text-right"><Link href={`/accounts/${a.masterId}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link></TableCell>
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
