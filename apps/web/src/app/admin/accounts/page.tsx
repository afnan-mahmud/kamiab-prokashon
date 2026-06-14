'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, Plus, Download,
  ChevronLeft, ChevronRight, Pencil, Trash2, Loader2,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Can } from '@/components/can';
import { accountsApi } from '@/features/accounts/accounts.api';
import type { Transaction } from '@shukhilife/types';

const EXPENSE_CATEGORIES = ['rent', 'salary', 'marketing', 'inventory', 'delivery', 'utility', 'other'] as const;
const PAYMENT_METHODS = ['cash', 'bkash', 'card', 'bank'] as const;

const PIE_COLORS = ['#8dc53d', '#6fa14a', '#0065b3', '#3a6324', '#a3c96e', '#f59e0b', '#94a3b8'];

// ── Expense form schema ───────────────────────────────────────────────────────

const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().default(''),
  paymentMethod: z.enum(PAYMENT_METHODS),
});
type ExpenseForm = z.infer<typeof expenseSchema>;

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color,
}: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${color === 'text-green-600' ? 'bg-green-50' : color === 'text-red-600' ? 'bg-red-50' : color === 'text-blue-600' ? 'bg-blue-50' : 'bg-muted'}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

// ── Expense modal ─────────────────────────────────────────────────────────────

function ExpenseModal({
  initial,
  onClose,
  onSave,
  isPending,
}: {
  initial?: Transaction;
  onClose: () => void;
  onSave: (data: ExpenseForm) => void;
  isPending: boolean;
}) {
  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initial
      ? {
          category: initial.category as ExpenseForm['category'],
          amount: initial.amount,
          date: initial.date.slice(0, 10),
          description: initial.description,
          paymentMethod: initial.paymentMethod as ExpenseForm['paymentMethod'],
        }
      : {
          date: format(new Date(), 'yyyy-MM-dd'),
          description: '',
          paymentMethod: 'cash',
        },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">{initial ? 'Edit Expense' : 'Add Expense'}</h2>
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Category</label>
              <Select
                value={form.watch('category')}
                onValueChange={(v) => form.setValue('category', v as ExpenseForm['category'])}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.category.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Payment Method</label>
              <Select
                value={form.watch('paymentMethod')}
                onValueChange={(v) => form.setValue('paymentMethod', v as ExpenseForm['paymentMethod'])}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Amount (৳)</label>
              <Input {...form.register('amount')} type="number" step="0.01" className="mt-1" />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date</label>
              <Input {...form.register('date')} type="date" className="mt-1" />
              {form.formState.errors.date && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.date.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <Input {...form.register('description')} className="mt-1" placeholder="Optional note..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (initial ? 'Update' : 'Add Expense')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [txPage, setTxPage] = useState(1);
  const [txTypeFilter, setTxTypeFilter] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['accounts-summary'],
    queryFn: () => accountsApi.summary(),
  });

  const { data: monthly, isLoading: monthlyLoading } = useQuery({
    queryKey: ['accounts-monthly', currentYear],
    queryFn: () => accountsApi.monthly(currentYear),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['admin-transactions', { page: txPage, type: txTypeFilter }],
    queryFn: () =>
      accountsApi.transactions({
        page: txPage,
        limit: 20,
        type: txTypeFilter || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: ExpenseForm) =>
      accountsApi.createExpense({
        ...data,
        amount: Number(data.amount),
      }),
    onSuccess: () => {
      toast.success('Expense added');
      setShowExpenseModal(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts-monthly'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseForm }) =>
      accountsApi.updateExpense(id, { ...data, amount: Number(data.amount) }),
    onSuccess: () => {
      toast.success('Expense updated');
      setEditingTx(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts-summary'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsApi.deleteExpense(id),
    onSuccess: () => {
      toast.success('Expense deleted');
      void queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts-summary'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const transactions = txData?.data ?? [];
  const txPagination = txData?.pagination;

  const monthlyData = monthly ?? [];
  const pieIncomeData = (summary?.incomeByMethod ?? []).map((m) => ({
    name: m.method,
    value: m.total,
  }));
  const pieExpenseData = (summary?.expenseByCategory ?? []).map((e) => ({
    name: e.category,
    value: e.total,
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Accounts</h1>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
        </TabsList>

        {/* ── Summary Tab ── */}
        <TabsContent value="summary" className="space-y-5 pt-4">
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
                ))
              : [
                  {
                    label: 'Total Income',
                    value: `৳${(summary?.totalIncome ?? 0).toLocaleString()}`,
                    icon: TrendingUp,
                    color: 'text-green-600',
                  },
                  {
                    label: 'Total Expense',
                    value: `৳${(summary?.totalExpense ?? 0).toLocaleString()}`,
                    icon: TrendingDown,
                    color: 'text-red-600',
                  },
                  {
                    label: 'Net Profit',
                    value: `৳${(summary?.netProfit ?? 0).toLocaleString()}`,
                    icon: DollarSign,
                    color: (summary?.netProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600',
                  },
                  {
                    label: 'Cash in Hand',
                    value: `৳${(summary?.cashInHand ?? 0).toLocaleString()}`,
                    icon: Wallet,
                    color: 'text-blue-600',
                  },
                ].map((s) => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Monthly P&L chart */}
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Monthly P&L — {currentYear}</h2>
            {monthlyLoading ? (
              <div className="h-64 animate-pulse rounded-lg bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const [, m] = v.split('-');
                      return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m) - 1] ?? v;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `৳${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `৳${v.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#8dc53d" strokeWidth={2} dot={false} name="Income" />
                  <Line type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} dot={false} name="Expense" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie charts */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold">Income by Payment Method</h2>
              {pieIncomeData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No income data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieIncomeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {pieIncomeData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `৳${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold">Expense by Category</h2>
              {pieExpenseData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No expense data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={pieExpenseData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `৳${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip formatter={(v: number) => `৳${v.toLocaleString()}`} />
                    <Bar dataKey="value" fill="#0065b3" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Ledger Tab ── */}
        <TabsContent value="ledger" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select
                value={txTypeFilter}
                onValueChange={(v) => { setTxTypeFilter(v === 'all' ? '' : v); setTxPage(1); }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={accountsApi.exportCsv({ type: txTypeFilter || undefined })} download>
                <Download className="mr-1.5 h-4 w-4" />
                Export CSV
              </a>
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-3 w-full animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : transactions.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )
                  : transactions.map((tx) => (
                      <TableRow key={tx._id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(tx.date), 'dd MMM yy')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={tx.type === 'income' ? 'default' : 'destructive'}
                            className="capitalize text-xs"
                          >
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs capitalize">{tx.category}</TableCell>
                        <TableCell className="text-xs capitalize">{tx.paymentMethod}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {tx.description || '—'}
                        </TableCell>
                        <TableCell className={`text-right text-sm font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'income' ? '+' : '−'}৳{tx.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>

          {txPagination && txPagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setTxPage((p) => p - 1)} disabled={txPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {txPage} of {txPagination.totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setTxPage((p) => p + 1)} disabled={txPage === txPagination.totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Expense Tab ── */}
        <TabsContent value="expense" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manually logged expenses</p>
            <Can permission="accounts.expense.create">
              <Button onClick={() => setShowExpenseModal(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Expense
              </Button>
            </Can>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-3 w-full animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : transactions.filter((t) => t.type === 'expense').length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        No expenses recorded
                      </TableCell>
                    </TableRow>
                  )
                  : transactions
                      .filter((t) => t.type === 'expense')
                      .map((tx) => (
                        <TableRow key={tx._id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(tx.date), 'dd MMM yy')}
                          </TableCell>
                          <TableCell className="text-xs capitalize">{tx.category}</TableCell>
                          <TableCell className="text-xs capitalize">{tx.paymentMethod}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {tx.description || '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-red-600">
                            −৳{tx.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Can permission="accounts.expense.create">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setEditingTx(tx)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm('Delete this expense?')) {
                                      deleteMutation.mutate(tx._id);
                                    }
                                  }}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </Can>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSave={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
      )}
      {editingTx && (
        <ExpenseModal
          initial={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={(data) => updateMutation.mutate({ id: editingTx._id, data })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}
