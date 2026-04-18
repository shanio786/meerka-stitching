import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Layers, Scissors, Shirt, ClipboardCheck, CircleDot, Sparkles, Warehouse, ChevronRight, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ProductionTrendChart } from "@/components/ProductionTrendChart";
import { WorkerPerformanceWidget } from "@/components/WorkerPerformanceWidget";

interface DashboardSummary {
  totalArticles: number;
  activeArticles: number;
  totalFabricMeters: number;
  totalComponents: number;
  topCategories: { category: string; count: number }[];
}

interface Activity {
  id: number;
  type: string;
  description: string;
  timestamp: string;
}

interface PipelineData {
  cutting: { totalJobs: number; pending: number; inProgress: number; completed: number; totalPieces: number };
  stitching: { totalJobs: number; pending: number; inProgress: number; completed: number; totalPieces: number };
  qc: { totalEntries: number; totalReceived: number; totalPassed: number; totalRejected: number; passRate: number };
  overlockButton: { totalEntries: number; pending: number; completed: number; totalPieces: number };
  finishing: { totalEntries: number; pending: number; completed: number; totalPacked: number };
  finalStore: { totalReceipts: number; totalPacked: number };
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<DashboardSummary>("/dashboard/summary").then(setSummary).catch(() => {}),
      apiGet<Activity[]>("/dashboard/recent-activity?limit=5").then(setActivity).catch(() => {}),
      apiGet<PipelineData>("/dashboard/pipeline").then(setPipeline).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat().format(n);

  const pipelineStages = pipeline ? [
    {
      name: "Cutting", icon: Scissors, href: "/cutting",
      color: "bg-blue-500", lightColor: "bg-blue-50 text-blue-700 border-blue-200",
      total: pipeline.cutting.totalJobs, active: pipeline.cutting.inProgress, completed: pipeline.cutting.completed,
      metric: `${pipeline.cutting.totalPieces} pcs cut`,
    },
    {
      name: "Stitching", icon: Shirt, href: "/stitching",
      color: "bg-indigo-500", lightColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      total: pipeline.stitching.totalJobs, active: pipeline.stitching.inProgress, completed: pipeline.stitching.completed,
      metric: `${pipeline.stitching.totalPieces} pcs done`,
    },
    {
      name: "QC", icon: ClipboardCheck, href: "/qc",
      color: "bg-amber-500", lightColor: "bg-amber-50 text-amber-700 border-amber-200",
      total: pipeline.qc.totalEntries, active: 0, completed: pipeline.qc.totalPassed,
      metric: `${pipeline.qc.passRate}% pass rate`,
    },
    {
      name: "Overlock/Btn", icon: CircleDot, href: "/overlock-button",
      color: "bg-purple-500", lightColor: "bg-purple-50 text-purple-700 border-purple-200",
      total: pipeline.overlockButton.totalEntries, active: pipeline.overlockButton.pending, completed: pipeline.overlockButton.completed,
      metric: `${pipeline.overlockButton.totalPieces} pcs`,
    },
    {
      name: "Finishing", icon: Sparkles, href: "/finishing",
      color: "bg-teal-500", lightColor: "bg-teal-50 text-teal-700 border-teal-200",
      total: pipeline.finishing.totalEntries, active: pipeline.finishing.pending, completed: pipeline.finishing.completed,
      metric: `${pipeline.finishing.totalPacked} packed`,
    },
    {
      name: "Final Store", icon: Warehouse, href: "/final-store",
      color: "bg-emerald-500", lightColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      total: pipeline.finalStore.totalReceipts, active: 0, completed: pipeline.finalStore.totalReceipts,
      metric: `${pipeline.finalStore.totalPacked} pcs stored`,
    },
  ] : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        description="Overview of production, inventory, and alerts"
        newAction={{ label: "New Article", href: "/articles/new" }}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Articles</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{fmt(summary?.activeArticles || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Out of {fmt(summary?.totalArticles || 0)} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fabric Received</CardTitle>
            <Layers className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{fmt(summary?.totalFabricMeters || 0)} m</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{fmt(summary?.totalComponents || 0)} components tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cutting Jobs</CardTitle>
            <Scissors className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{pipeline?.cutting.inProgress || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Final Store</CardTitle>
            <Warehouse className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{fmt(pipeline?.finalStore.totalPacked || 0)} pcs</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ready for dispatch</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Pipeline</CardTitle>
          <CardDescription>Real-time status across all production stages</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-4">{[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 flex-1" />)}</div>
          ) : (
            <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
              {pipelineStages.map((stage, idx) => {
                const Icon = stage.icon;
                const pct = stage.total > 0 ? Math.round((stage.completed / stage.total) * 100) : 0;
                return (
                  <div key={stage.name} className="flex items-center">
                    <Link href={stage.href}>
                      <div className={`rounded-lg border p-4 min-w-[150px] cursor-pointer hover:shadow-md transition-shadow ${stage.lightColor}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`p-1.5 rounded ${stage.color} text-white`}><Icon className="h-3.5 w-3.5" /></div>
                          <span className="font-semibold text-sm">{stage.name}</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs"><span>Active</span><span className="font-bold">{stage.active}</span></div>
                          <div className="flex justify-between text-xs"><span>Done</span><span className="font-bold">{stage.completed}</span></div>
                          <div className="w-full bg-white/50 rounded-full h-1.5 mt-2">
                            <div className={`${stage.color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs font-medium mt-1">{stage.metric}</div>
                        </div>
                      </div>
                    </Link>
                    {idx < pipelineStages.length - 1 && <ChevronRight className="h-5 w-5 text-muted-foreground/40 mx-1 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductionTrendChart days={30} />
        </div>
        <WorkerPerformanceWidget days={30} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest articles and updates</CardDescription>
          </div>
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="gap-1">View all <ArrowRight className="h-3 w-3" /></Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !activity.length ? (
            <div className="text-center py-6 text-muted-foreground text-sm">No recent activity</div>
          ) : (
            <div className="space-y-4">
              {activity.map(a => (
                <div key={a.id} className="flex items-start gap-4 border-b last:border-0 pb-4 last:pb-0">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium leading-none">{a.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(a.timestamp), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
