'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { MessageSquare, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { settingsApi } from '@/features/settings/settings.api';
import { useState } from 'react';

const smsSchema = z.object({
  apiKey: z.string().optional(),
  senderId: z.string().optional(),
  isActive: z.boolean(),
  orderConfirmed: z.string().min(1, 'Required'),
  orderShipped: z.string().min(1, 'Required'),
  orderCancelled: z.string().min(1, 'Required'),
});
type SmsForm = z.infer<typeof smsSchema>;

const TEMPLATE_VARS = ['{orderNumber}', '{trackingCode}', '{customerName}'];

export default function SmsSettingsPage() {
  const queryClient = useQueryClient();
  const [showKey, setShowKey] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sms-settings'],
    queryFn: settingsApi.getSms,
  });

  const form = useForm<SmsForm>({
    resolver: zodResolver(smsSchema),
    values: data
      ? {
          apiKey: '',
          senderId: data.bulksmsbd.senderId,
          isActive: data.bulksmsbd.isActive,
          orderConfirmed: data.templates.orderConfirmed,
          orderShipped: data.templates.orderShipped,
          orderCancelled: data.templates.orderCancelled,
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (values: SmsForm) =>
      settingsApi.updateSms({
        bulksmsbd: {
          ...(values.apiKey ? { apiKey: values.apiKey } : {}),
          senderId: values.senderId,
          isActive: values.isActive,
        },
        templates: {
          orderConfirmed: values.orderConfirmed,
          orderShipped: values.orderShipped,
          orderCancelled: values.orderCancelled,
        },
      }),
    onSuccess: () => {
      toast.success('SMS settings saved');
      form.setValue('apiKey', '');
      void queryClient.invalidateQueries({ queryKey: ['sms-settings'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isActive = form.watch('isActive');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">SMS Settings</h1>
        <Badge variant="secondary" className="gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Feature disabled in v1
        </Badge>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
        <p className="font-semibold mb-1">SMS notifications are feature-flagged off for v1.</p>
        <p>Configure the settings here now — activate by toggling &ldquo;Active&rdquo; when ready for v2. All order hooks are already wired up in the backend.</p>
      </div>

      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">BulkSMSBD Configuration</h2>
          {data && (
            <Badge variant={data.bulksmsbd.isActive ? 'default' : 'secondary'} className="ml-auto text-xs">
              {data.bulksmsbd.isActive ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="p-5 space-y-5">
            {/* Credentials */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Credentials</p>

              <div>
                <label className="text-sm font-medium">API Key</label>
                {data?.bulksmsbd.hasApiKey && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Current: <span className="font-mono">{data.bulksmsbd.apiKeyMasked}</span>
                  </p>
                )}
                <div className="relative mt-1">
                  <Input
                    {...form.register('apiKey')}
                    type={showKey ? 'text' : 'password'}
                    placeholder={data?.bulksmsbd.hasApiKey ? 'Leave blank to keep current' : 'Enter API key'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Sender ID</label>
                <Input {...form.register('senderId')} className="mt-1" placeholder="e.g. SODAIKINI" />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => form.setValue('isActive', !isActive)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                >
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm">{isActive ? 'SMS notifications active' : 'SMS disabled (v1 default)'}</span>
              </div>
            </div>

            {/* Templates */}
            <div className="space-y-4 border-t border-border pt-5">
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Message Templates</p>
                <div className="text-xs text-muted-foreground text-right">
                  <p className="font-medium mb-1">Available variables:</p>
                  {TEMPLATE_VARS.map((v) => (
                    <code key={v} className="mr-1 rounded bg-muted px-1 py-0.5">{v}</code>
                  ))}
                </div>
              </div>

              {[
                { field: 'orderConfirmed' as const, label: 'Order Confirmed' },
                { field: 'orderShipped' as const, label: 'Order Shipped (Hand over to Courier)' },
                { field: 'orderCancelled' as const, label: 'Order Cancelled' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="text-sm font-medium">{label}</label>
                  <textarea
                    {...form.register(field)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {form.formState.errors[field] && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors[field]?.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.watch(field)?.length ?? 0} characters
                  </p>
                </div>
              ))}
            </div>

            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save SMS Settings
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
