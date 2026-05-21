'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, startOfDay } from 'date-fns';
import { ShoppingCart, DollarSign, Clock, Users } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { dashboardApi } from '@/features/dashboard/dashboard.api';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Confirmed': 'bg-blue-100 text-blue-800',
  'Cancelled': 'bg-red-100 text-red-800',
  'Call not received': 'bg-orange-100 text-orange-800',
  'Fake order': 'bg-gray-100 text-gray-800',
  'Hand over to Courier': 'bg-green-100 text-green-800',
};

const PIE_COLORS = ['#4a7c2e', '#d97706', '#dc2626', '#6fa14a', '#f59e0b', '#94a3b8'];

type DateRange = 'today' | 'yesterday' | '7d' | 'month' | 'last_month';

function getRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (range) {
    case 'today': return { from: fmt(startOfDay(now)), to: fmt(now) };
    case 'yesterday': { const y = subDays(now, 1); return { from: fmt(startOfDay(y)), to: fmt(y) }; }
    case '7d': return { from: fmt(subDays(now, 6)), to: fmt(now) };
    case 'month': return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) };
    case 'last_month': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: fmt(startOfMonth(lm)), to: fmt(endOfMonth(lm)) };
    }
  }
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={cn('rounded-lg p-2.5', color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'This Month', value: 'month' },
  { label: 'Last Month', value: 'last_month' },
];

export default function AdminDashboardPage() {
  const [range, setRange] = useState<DateRange>('7d');
  const { from, to } = getRange(range);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard', range],
    queryFn: () => dashboardApi.get(from, to),
  });

  const stats = data?.stats;
  const revenueChart = data?.revenueChart ?? [];
  const topProducts = data?.topProducts ?? [];
  const ordersByStatus = data?.ordersByStatus ?? [];
  const recentOrders = data?.recentOrders ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1">
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                range === r.value ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))
          : [
              { label: 'Total Orders', value: String(stats?.totalOrders ?? 0), icon: ShoppingCart, color: 'bg-blue-500' },
              { label: 'Revenue', value: `৳${(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'bg-green-500' },
              { label: 'Pending Orders', value: String(stats?.pendingOrders ?? 0), icon: Clock, color: 'bg-orange-500' },
              { label: 'Total Customers', value: String(stats?.totalCustomers ?? 0), icon: Users, color: 'bg-purple-500' },
            ].map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Revenue + Orders line chart */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Revenue & Orders</h2>
        {isLoading ? (
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        ) : revenueChart.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No data for this period</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => format(new Date(v + 'T00:00:00'), 'dd MMM')} />
              <YAxis yAxisId="rev" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `৳${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number, name: string) => name === 'Revenue' ? `৳${v.toLocaleString()}` : v}
                labelFormatter={(l: string) => format(new Date(l + 'T00:00:00'), 'dd MMM yyyy')}
              />
              <Legend />
              <Line yAxisId="rev" type="monotone" dataKey="revenue" stroke="#4a7c2e" strokeWidth={2} dot={false} name="Revenue" />
              <Line yAxisId="ord" type="monotone" dataKey="orders" stroke="#d97706" strokeWidth={2} dot={false} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top products + Status donut */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Top Products</h2>
          {isLoading ? (
            <div className="h-52 animate-pulse rounded-lg bg-muted" />
          ) : topProducts.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="productName" tick={{ fontSize: 10 }} width={110} tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + '…' : v} />
                <Tooltip formatter={(v: number) => [v, 'Units sold']} />
                <Bar dataKey="totalSold" fill="#4a7c2e" radius={[0, 4, 4, 0]} name="Sold" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Orders by Status</h2>
          {isLoading ? (
            <div className="h-52 animate-pulse rounded-lg bg-muted" />
          ) : ordersByStatus.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ordersByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80}
                  label={({ status, percent }) => `${String(status).split(' ')[0]} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {ordersByStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent orders table */}
      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold">Recent Orders</h2>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/admin/orders">View all →</Link>
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><div className="h-3 w-full animate-pulse rounded bg-muted" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : recentOrders.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No orders in this period</TableCell>
                </TableRow>
              )
              : recentOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>
                      <Link href={`/admin/orders/${order._id}`} className="font-mono text-xs font-medium hover:underline">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">৳{order.total.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={cn('rounded px-2 py-0.5 text-xs font-medium', STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-800')}>
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(order.createdAt), 'dd MMM, hh:mm a')}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
