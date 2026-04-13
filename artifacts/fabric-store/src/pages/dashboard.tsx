import { useEffect, useState } from "react";
import { 
  useGetDashboardSummary, 
  getGetDashboardSummaryQueryKey,
  useGetRecentActivity,
  getGetRecentActivityQueryKey,
  useGetLowStockAlerts,
  getGetLowStockAlertsQueryKey
} from "@workspace/api-client-react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Activity, AlertTriangle, Layers, ArrowRight, Scissors, Shirt, ClipboardCheck, CircleDot, Sparkles, Warehouse, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface PipelineData {
  cutting: { totalJobs: number; pending: number; inProgress: number; completed: number; totalPieces: number };
  stitching: { totalJobs: number; pending: number; inProgress: number; completed: number; totalPieces: number };
  qc: { totalEntries: number; totalReceived: number; totalPassed: number; totalRejected: number; passRate: number };
  overlockButton: { totalEntries: number; pending: number; completed: number; totalPieces: number };
  finishing: { totalEntries: number; pending: number; completed: number; totalPacked: number };
  finalStore: { totalReceipts: number; totalPacked: number };
}

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: recentActivity, isLoading: isLoadingActivity } = useGetRecentActivity({ limit: 5 }, {
    query: { queryKey: getGetRecentActivityQueryKey({ limit: 5 }) }
  });

  const { data: lowStock, isLoading: isLoadingLowStock } = useGetLowStockAlerts({}, {
    query: { queryKey: getGetLowStockAlertsQueryKey() }
  });

  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [loadingPipeline, setLoadingPipeline] = useState(true);

  useEffect(() => {
    apiGet<PipelineData>("/dashboard/pipeline")
      .then(setPipeline)
      .catch(() => {})
      .finally(() => setLoadingPipeline(false));
  }, []);

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  const pipelineStages = pipeline ? [
    {
      name: "Cutting",
      icon: Scissors,
      href: "/cutting",
      color: "bg-blue-500",
      lightColor: "bg-blue-50 text-blue-700 border-blue-200",
      total: pipeline.cutting.totalJobs,
      active: pipeline.cutting.inProgress,
      completed: pipeline.cutting.completed,
      metric: `${pipeline.cutting.totalPieces} pcs cut`,
    },
    {
      name: "Stitching",
      icon: Shirt,
      href: "/stitching",
      color: "bg-indigo-500",
      lightColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      total: pipeline.stitching.totalJobs,
      active: pipeline.stitching.inProgress,
      completed: pipeline.stitching.completed,
      metric: `${pipeline.stitching.totalPieces} pcs done`,
    },
    {
      name: "QC",
      icon: ClipboardCheck,
      href: "/qc",
      color: "bg-amber-500",
      lightColor: "bg-amber-50 text-amber-700 border-amber-200",
      total: pipeline.qc.totalEntries,
      active: pipeline.qc.totalReceived - pipeline.qc.totalPassed - pipeline.qc.totalRejected,
      completed: pipeline.qc.totalPassed,
      metric: `${pipeline.qc.passRate}% pass rate`,
    },
    {
      name: "Overlock/Btn",
      icon: CircleDot,
      href: "/overlock-button",
      color: "bg-purple-500",
      lightColor: "bg-purple-50 text-purple-700 border-purple-200",
      total: pipeline.overlockButton.totalEntries,
      active: pipeline.overlockButton.pending,
      completed: pipeline.overlockButton.completed,
      metric: `${pipeline.overlockButton.totalPieces} pcs`,
    },
    {
      name: "Finishing",
      icon: Sparkles,
      href: "/finishing",
      color: "bg-teal-500",
      lightColor: "bg-teal-50 text-teal-700 border-teal-200",
      total: pipeline.finishing.totalEntries,
      active: pipeline.finishing.pending,
      completed: pipeline.finishing.completed,
      metric: `${pipeline.finishing.totalPacked} packed`,
    },
    {
      name: "Final Store",
      icon: Warehouse,
      href: "/final-store",
      color: "bg-emerald-500",
      lightColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      total: pipeline.finalStore.totalReceipts,
      active: 0,
      completed: pipeline.finalStore.totalReceipts,
      metric: `${pipeline.finalStore.totalPacked} pcs stored`,
    },
  ] : [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Command Center" 
        description="Overview of production, inventory, and alerts"
        newAction={{ label: "New GRN", href: "/grn/new" }}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-summary-articles">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Articles</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-active-articles">{formatNumber(summary?.activeArticles || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Out of {formatNumber(summary?.totalArticles || 0)} total</p>
          </CardContent>
        </Card>

        <Card data-testid="card-summary-fabric">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fabric Stock</CardTitle>
            <Layers className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-fabric">{formatNumber(summary?.totalFabricMeters || 0)} m</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Valued at Rs.{formatNumber(summary?.totalStockValue || 0)}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-summary-grn">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent GRNs</CardTitle>
            <Activity className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-recent-grn">{formatNumber(summary?.recentGrnCount || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card data-testid="card-summary-alerts" className={summary?.lowStockCount ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-destructive" data-testid="text-low-stock-count">{formatNumber(summary?.lowStockCount || 0)}</div>
            )}
            <p className="text-xs text-destructive/80 mt-1">Articles requiring attention</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-pipeline">
        <CardHeader>
          <CardTitle>Production Pipeline</CardTitle>
          <CardDescription>Real-time status across all production stages</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPipeline ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 flex-1" />)}
            </div>
          ) : (
            <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
              {pipelineStages.map((stage, idx) => {
                const Icon = stage.icon;
                const completionPct = stage.total > 0 ? Math.round((stage.completed / stage.total) * 100) : 0;
                return (
                  <div key={stage.name} className="flex items-center">
                    <Link href={stage.href}>
                      <div className={`rounded-lg border p-4 min-w-[150px] cursor-pointer hover:shadow-md transition-shadow ${stage.lightColor}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`p-1.5 rounded ${stage.color} text-white`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-semibold text-sm">{stage.name}</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span>Active</span>
                            <span className="font-bold">{stage.active}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Done</span>
                            <span className="font-bold">{stage.completed}</span>
                          </div>
                          <div className="w-full bg-white/50 rounded-full h-1.5 mt-2">
                            <div className={`${stage.color} h-1.5 rounded-full transition-all`} style={{ width: `${completionPct}%` }} />
                          </div>
                          <div className="text-xs font-medium mt-1">{stage.metric}</div>
                        </div>
                      </div>
                    </Link>
                    {idx < pipelineStages.length - 1 && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground/40 mx-1 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1" data-testid="card-recent-activity">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest GRNs and article updates</CardDescription>
            </div>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-all-activity">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !recentActivity?.length ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No recent activity</div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 border-b last:border-0 pb-4 last:pb-0" data-testid={`activity-item-${activity.id}`}>
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium leading-none">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')} &bull; {activity.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1" data-testid="card-low-stock">
          <CardHeader>
            <CardTitle className="text-destructive">Critical Low Stock</CardTitle>
            <CardDescription>Articles below minimum threshold</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLowStock ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !lowStock?.length ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No low stock alerts</div>
            ) : (
              <div className="space-y-4">
                {lowStock.slice(0, 5).map((alert) => (
                  <div key={alert.articleId} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0" data-testid={`low-stock-item-${alert.articleId}`}>
                    <div>
                      <Link href={`/articles/${alert.articleId}`}>
                        <div className="text-sm font-medium hover:underline cursor-pointer">
                          {alert.articleCode} - {alert.articleName}
                        </div>
                      </Link>
                      <div className="text-xs text-muted-foreground mt-1">
                        Threshold: {alert.threshold}m
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-destructive">{alert.totalMetersReceived}m</div>
                      <Link href={`/grn/new?articleId=${alert.articleId}`}>
                        <Button variant="link" className="h-auto p-0 text-xs text-primary" data-testid={`button-order-${alert.articleId}`}>
                          Receive GRN
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
