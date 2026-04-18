import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

interface TrendPoint {
  day: string;
  cutting: number;
  stitching: number;
  finishing: number;
}

export function ProductionTrendChart({ days = 30 }: { days?: number }) {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<TrendPoint[]>(`/dashboard/trend?days=${days}`)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [days]);

  const chartData = data.map(d => ({
    ...d,
    label: format(parseISO(d.day), "MMM d"),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Trend</CardTitle>
        <CardDescription>Pieces completed per stage — last {days} days</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="cutting" stroke="#3b82f6" strokeWidth={2} dot={false} name="Cutting" />
                <Line type="monotone" dataKey="stitching" stroke="#6366f1" strokeWidth={2} dot={false} name="Stitching" />
                <Line type="monotone" dataKey="finishing" stroke="#14b8a6" strokeWidth={2} dot={false} name="Finishing" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
