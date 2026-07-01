'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Truck, ShieldCheck, Loader2, Eye, EyeOff, CheckCircle2, XCircle, ShieldAlert, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { settingsApi } from '@/features/settings/settings.api';
import { useState } from 'react';

// ── Steadfast section ─────────────────────────────────────────────────────────

const steadfastSchema = z.object({
  apiKey: z.string().optional(),
  secretKey: z.string().optional(),
  baseUrl: z.string().url('Must be a valid URL'),
  isActive: z.boolean(),
});
type SteadfastForm = z.infer<typeof steadfastSchema>;

function SteadfastSection() {
  const queryClient = useQueryClient();
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; balance?: number } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-settings'],
    queryFn: settingsApi.getDelivery,
  });

  const form = useForm<SteadfastForm>({
    resolver: zodResolver(steadfastSchema),
    values: data
      ? {
          apiKey: '',
          secretKey: '',
          baseUrl: data.steadfast.baseUrl,
          isActive: data.steadfast.isActive,
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (values: SteadfastForm) =>
      settingsApi.updateDelivery({
        steadfast: {
          ...(values.apiKey ? { apiKey: values.apiKey } : {}),
          ...(values.secretKey ? { secretKey: values.secretKey } : {}),
          baseUrl: values.baseUrl,
          isActive: values.isActive,
        },
      }),
    onSuccess: () => {
      toast.success('Steadfast settings saved');
      form.setValue('apiKey', '');
      form.setValue('secretKey', '');
      void queryClient.invalidateQueries({ queryKey: ['delivery-settings'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testMutation = useMutation({
    mutationFn: settingsApi.testSteadfast,
    onSuccess: (res) => {
      setTestResult(res);
      toast.success(`Connected! Balance: ৳ ${res.balance}`);
    },
    onError: (err: Error) => {
      setTestResult({ connected: false });
      toast.error(`Connection failed: ${err.message}`);
    },
  });

  const isActive = form.watch('isActive');

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">Steadfast Courier</h2>
        {data && (
          <Badge variant={data.steadfast.isActive ? 'default' : 'secondary'} className="ml-auto text-xs">
            {data.steadfast.isActive ? 'Active' : 'Inactive'}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="p-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="p-5 space-y-4">
          {/* API key */}
          <div>
            <label className="text-sm font-medium">API Key</label>
            {data?.steadfast.hasApiKey && (
              <p className="text-xs text-muted-foreground mb-1">
                Current: <span className="font-mono">{data.steadfast.apiKeyMasked}</span>
              </p>
            )}
            <div className="relative mt-1">
              <Input
                {...form.register('apiKey')}
                type={showKey ? 'text' : 'password'}
                placeholder={data?.steadfast.hasApiKey ? 'Leave blank to keep current' : 'Enter API key'}
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

          {/* Secret key */}
          <div>
            <label className="text-sm font-medium">Secret Key</label>
            {data?.steadfast.hasSecretKey && (
              <p className="text-xs text-muted-foreground mb-1">
                Current: <span className="font-mono">{data.steadfast.secretKeyMasked}</span>
              </p>
            )}
            <Input
              {...form.register('secretKey')}
              type="password"
              className="mt-1"
              placeholder={data?.steadfast.hasSecretKey ? 'Leave blank to keep current' : 'Enter secret key'}
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="text-sm font-medium">Base URL</label>
            <Input {...form.register('baseUrl')} className="mt-1" />
            {form.formState.errors.baseUrl && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.baseUrl.message}</p>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => form.setValue('isActive', !isActive)}
              className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm">{isActive ? 'Integration active' : 'Integration disabled'}</span>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${testResult.connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {testResult.connected
                ? <><CheckCircle2 className="h-4 w-4" /> Connected — Balance: ৳ {testResult.balance?.toLocaleString()}</>
                : <><XCircle className="h-4 w-4" /> Connection failed</>}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save Settings
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !data?.steadfast.hasApiKey}
            >
              {testMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Test Connection
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Charges section ───────────────────────────────────────────────────────────

const chargesSchema = z.object({
  insideDhaka: z.coerce.number().min(0),
  outsideDhaka: z.coerce.number().min(0),
  baseWeightKg: z.coerce.number().min(0),
  extraPerKg: z.coerce.number().min(0),
});
type ChargesForm = z.infer<typeof chargesSchema>;

function ChargesSection() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-settings'],
    queryFn: settingsApi.getDelivery,
  });

  const form = useForm<ChargesForm>({
    resolver: zodResolver(chargesSchema),
    values: data?.charges,
  });

  const saveMutation = useMutation({
    mutationFn: (values: ChargesForm) =>
      settingsApi.updateDelivery({ charges: values }),
    onSuccess: () => {
      toast.success('Delivery charges saved');
      void queryClient.invalidateQueries({ queryKey: ['delivery-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['delivery-charges'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">Delivery Charges</h2>
      </div>

      {isLoading ? (
        <div className="p-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Inside Dhaka (৳)</label>
              <Input {...form.register('insideDhaka')} type="number" min={0} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Outside Dhaka (৳)</label>
              <Input {...form.register('outsideDhaka')} type="number" min={0} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Base Weight (kg)</label>
              <p className="text-xs text-muted-foreground">Weight included in base charge</p>
              <Input {...form.register('baseWeightKg')} type="number" min={0} step={0.1} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Extra per kg above base (৳)</label>
              <p className="text-xs text-muted-foreground">Charged on top for heavier orders</p>
              <Input {...form.register('extraPerKg')} type="number" min={0} className="mt-1" />
            </div>
          </div>

          {/* Formula preview */}
          <div className="rounded-lg bg-muted/40 p-3 text-xs font-mono text-muted-foreground">
            Charge = baseCharge + max(0, totalWeight − {form.watch('baseWeightKg')}kg) × ৳ {form.watch('extraPerKg')}/kg
          </div>

          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save Charges
          </Button>
        </form>
      )}
    </div>
  );
}

// ── Fraud Check section ─────────────────────────────────────────────────────────

const fraudSchema = z.object({
  provider: z.enum(['mock', 'bdcourier', 'fraudbd']),
  apiUrl: z.string().url('Must be a valid URL').or(z.literal('')),
  apiToken: z.string().optional(),
  isActive: z.boolean(),
});
type FraudForm = z.infer<typeof fraudSchema>;

// Per-provider guidance shown to the operator so they can self-configure.
const PROVIDER_GUIDE: Record<
  'bdcourier' | 'fraudbd',
  { name: string; signupUrl: string; apiUrl: string; tokenHint: string }
> = {
  bdcourier: {
    name: 'BDCourier',
    signupUrl: 'https://bdcourier.com',
    apiUrl: 'https://bdcourier.com/api/courier-check',
    tokenHint: 'BDCourier account er Dashboard → API/Developer section theke API token copy korun.',
  },
  fraudbd: {
    name: 'FraudBD',
    signupUrl: 'https://fraudbd.com',
    apiUrl: 'https://fraudbd.com/api/v1/check',
    tokenHint: 'FraudBD account er Settings → API Key page theke token copy korun.',
  },
};

function FraudCheckSection() {
  const queryClient = useQueryClient();
  const [showToken, setShowToken] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-settings'],
    queryFn: settingsApi.getDelivery,
  });

  const form = useForm<FraudForm>({
    resolver: zodResolver(fraudSchema),
    values: data
      ? {
          provider: data.fraud.provider,
          apiUrl: data.fraud.apiUrl,
          apiToken: '',
          isActive: data.fraud.isActive,
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (values: FraudForm) =>
      settingsApi.updateDelivery({
        fraud: {
          provider: values.provider,
          apiUrl: values.apiUrl,
          ...(values.apiToken ? { apiToken: values.apiToken } : {}),
          isActive: values.isActive,
        },
      }),
    onSuccess: () => {
      toast.success('Fraud check settings saved');
      form.setValue('apiToken', '');
      void queryClient.invalidateQueries({ queryKey: ['delivery-settings'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const provider = form.watch('provider');
  const isActive = form.watch('isActive');
  const isMock = provider === 'mock';
  const guide = !isMock ? PROVIDER_GUIDE[provider] : null;

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">Fraud Check (Courier History)</h2>
        {data && (
          <Badge
            variant={data.fraud.isActive && data.fraud.provider !== 'mock' ? 'default' : 'secondary'}
            className="ml-auto text-xs"
          >
            {data.fraud.provider === 'mock'
              ? 'Demo Mode'
              : data.fraud.isActive
                ? 'Active'
                : 'Inactive'}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="p-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="p-5 space-y-4">
          {/* Guideline */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-900">
            <div className="flex items-center gap-2 font-semibold">
              <Info className="h-4 w-4" /> কিভাবে সেট করবেন (Guideline)
            </div>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed">
              <li>
                <b>API Provider</b> — কোন কোম্পানির ফ্রড-চেক সার্ভিস ব্যবহার করবেন তা বাছুন।
                Steadfast-এর নিজস্ব ফ্রড API নেই, তাই BDCourier বা FraudBD-র মতো aggregator
                লাগে (এরা Steadfast + Pathao + RedX সব কুরিয়ারের ডেলিভারি রেকর্ড দেখায়)।
                পরীক্ষার জন্য <b>Demo (Mock)</b> রাখলে কোনো API ছাড়াই কাজ করবে।
              </li>
              <li>
                <b>API URL</b> — provider যে endpoint দেয় সেটি এখানে বসান। নিচের
                placeholder-এ সঠিক URL দেখানো আছে — সাধারণত এটিই বসবে।
              </li>
              <li>
                <b>API Token</b> — provider-এর ওয়েবসাইটে account খুলে Dashboard/Settings
                থেকে token কপি করে এখানে paste করুন। Token গোপন রাখা হয় (এনক্রিপ্টেড)।
              </li>
              <li>
                সব দিয়ে <b>Active</b> চালু করে <b>Save</b> চাপুন। এরপর order details
                পেজে &quot;Fraud Check&quot; বাটন কাজ করবে।
              </li>
            </ol>
            {guide && (
              <p className="mt-2 text-xs">
                {guide.name} account:{' '}
                <a
                  href={guide.signupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline"
                >
                  {guide.signupUrl}
                </a>
                {' · '}
                {guide.tokenHint}
              </p>
            )}
          </div>

          {/* Provider */}
          <div>
            <label className="text-sm font-medium">API Provider</label>
            <select
              {...form.register('provider')}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="mock">Demo / Mock (no API needed — testing only)</option>
              <option value="bdcourier">BDCourier</option>
              <option value="fraudbd">FraudBD</option>
            </select>
          </div>

          {/* API URL */}
          <div>
            <label className="text-sm font-medium">API URL</label>
            <Input
              {...form.register('apiUrl')}
              className="mt-1"
              placeholder={guide ? guide.apiUrl : 'Not required in Demo mode'}
              disabled={isMock}
            />
            {form.formState.errors.apiUrl && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.apiUrl.message}</p>
            )}
          </div>

          {/* API Token */}
          <div>
            <label className="text-sm font-medium">API Token</label>
            {data?.fraud.hasApiToken && (
              <p className="text-xs text-muted-foreground mb-1">
                Current: <span className="font-mono">{data.fraud.apiTokenMasked}</span>
              </p>
            )}
            <div className="relative mt-1">
              <Input
                {...form.register('apiToken')}
                type={showToken ? 'text' : 'password'}
                placeholder={
                  isMock
                    ? 'Not required in Demo mode'
                    : data?.fraud.hasApiToken
                      ? 'Leave blank to keep current'
                      : 'Paste API token'
                }
                disabled={isMock}
              />
              <button
                type="button"
                onClick={() => setShowToken((s) => !s)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => form.setValue('isActive', !isActive)}
              disabled={isMock}
              className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-muted-foreground/30'} ${isMock ? 'opacity-50' : ''}`}
            >
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm">
              {isMock
                ? 'Demo mode — always returns sample data'
                : isActive
                  ? 'Integration active'
                  : 'Integration disabled'}
            </span>
          </div>

          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save Fraud Settings
          </Button>
        </form>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeliveryPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Delivery Settings</h1>
      <SteadfastSection />
      <ChargesSection />
      <FraudCheckSection />
    </div>
  );
}
