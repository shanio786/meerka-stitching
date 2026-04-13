import { 
  useGetDashboardSummary, 
  getGetDashboardSummaryQueryKey,
  useGetFabricByType,
  getGetFabricByTypeQueryKey,
  useGetRecentActivity,
  getGetRecentActivityQueryKey,
  useGetLowStockAlerts,
  getGetLowStockAlertsQueryKey
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Activity, AlertTriangle, Layers, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

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

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Command Center" 
        description="Overview of production, inventory, and alerts"
        newAction={{ label: "New GRN", href: "/grn/new" }}
      />

      {/* Summary Cards */}
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
            <p className="text-xs text-muted-foreground mt-1">Valued at ${formatNumber(summary?.totalStockValue || 0)}</p>
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
                        {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')} • {activity.type}
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
