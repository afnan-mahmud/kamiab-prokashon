'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { landingPagesApi, type CreateLandingPageInput } from './landing-pages.api';
import { productsApi } from '@/features/products/products.api';
import type { LandingPage, ContentSection } from '@cholonbil/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type Template = 'template1' | 'template2' | 'template3' | 'template4';

interface BuilderState {
  name: string;
  slug: string;
  template: Template;
  product: string;
  selectedVariants: string[];
  content: {
    heroTitle: string;
    heroSubtitle: string;
    heroImage: { url: string; publicId: string };
    ctaText: string;
    colors: { primary: string; accent: string; background: string };
    sections: ContentSection[];
  };
  isActive: boolean;
}

const TEMPLATES: { id: Template; label: string; desc: string; color: string }[] = [
  { id: 'template1', label: 'Bold Hero', desc: 'Full-width hero with large CTA — best for high-impact campaigns', color: '#4a7c2e' },
  { id: 'template2', label: 'Minimal', desc: 'Clean, distraction-free layout — best for premium products', color: '#1f2937' },
  { id: 'template3', label: 'Story', desc: 'Long-form scroll with testimonials and FAQs', color: '#d97706' },
  { id: 'template4', label: 'Grid', desc: 'Product feature grid — best for showcasing multiple benefits', color: '#7c3aed' },
];

const SECTION_TYPES = [
  { type: 'text', label: 'Text Block' },
  { type: 'image', label: 'Image' },
  { type: 'video', label: 'Video (embed)' },
  { type: 'features', label: 'Feature List' },
  { type: 'testimonial', label: 'Testimonials' },
  { type: 'faq', label: 'FAQ' },
  { type: 'why_product', label: 'কেন খাবেন আমাদের পণ্য?' },
  { type: 'why_us', label: 'কেন আমাদের থেকে কিনবেন?' },
] as const;

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  const labels = ['Template', 'Product', 'Content', 'Settings'];
  return (
    <div className="flex items-center gap-0">
      {labels.slice(0, total).map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${i < step ? 'bg-primary text-white' : i === step ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-muted text-muted-foreground'}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="mt-1 text-xs text-muted-foreground whitespace-nowrap">{label}</span>
          </div>
          {i < total - 1 && (
            <div className={`mx-2 h-0.5 w-8 mb-4 transition-colors ${i < step ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Template picker ────────────────────────────────────────────────────

function TemplateStep({ value, onChange }: { value: Template; onChange: (t: Template) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Choose a Template</h2>
        <p className="text-sm text-muted-foreground">Pick the layout that best fits your campaign</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${value === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
          >
            <div className="mb-3 h-24 rounded-lg" style={{ backgroundColor: t.color + '20', border: `2px solid ${t.color}30` }}>
              <div className="flex h-full items-center justify-center">
                <div className="space-y-1.5 text-center">
                  <div className="mx-auto h-2 w-20 rounded" style={{ backgroundColor: t.color + '60' }} />
                  <div className="mx-auto h-1.5 w-14 rounded" style={{ backgroundColor: t.color + '40' }} />
                  <div className="mx-auto h-6 w-16 rounded" style={{ backgroundColor: t.color }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{t.label}</p>
              {value === t.id && <Check className="h-4 w-4 text-primary" />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Product + variants ─────────────────────────────────────────────────

function ProductStep({
  productId,
  selectedVariants,
  onProductChange,
  onVariantsChange,
}: {
  productId: string;
  selectedVariants: string[];
  onProductChange: (id: string) => void;
  onVariantsChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');

  const { data } = useQuery({
    queryKey: ['products-for-lp', search],
    queryFn: () => productsApi.list({ search: search || undefined, isActive: true, limit: 50 }),
  });

  const products = data?.data ?? [];
  const selectedProduct = products.find((p) => p._id === productId);

  const toggleVariant = (id: string) => {
    if (selectedVariants.includes(id)) {
      onVariantsChange(selectedVariants.filter((v) => v !== id));
    } else {
      onVariantsChange([...selectedVariants, id]);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Select Product</h2>
        <p className="text-sm text-muted-foreground">Choose the product and which variants to show</p>
      </div>

      <div>
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
          {products.map((p) => (
            <button
              key={p._id}
              type="button"
              onClick={() => { onProductChange(p._id); onVariantsChange([]); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${productId === p._id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
            >
              {p.images?.[0] && (
                <img src={p.images[0].url} alt={p.name} className="h-8 w-8 rounded object-cover shrink-0" />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.variants.length} variants</p>
              </div>
              {productId === p._id && <Check className="ml-auto h-4 w-4 shrink-0" />}
            </button>
          ))}
          {products.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No products found</p>
          )}
        </div>
      </div>

      {selectedProduct && (
        <div>
          <p className="mb-2 text-sm font-medium">Select variants to show on landing page</p>
          <div className="space-y-2">
            {selectedProduct.variants.map((v) => (
              <button
                key={String(v._id)}
                type="button"
                onClick={() => toggleVariant(String(v._id))}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${selectedVariants.includes(String(v._id)) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${selectedVariants.includes(String(v._id)) ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                    {selectedVariants.includes(String(v._id)) && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className="font-medium">{v.label}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">৳{v.price.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Weight: {v.weight} kg</p>
                </div>
              </button>
            ))}
          </div>
          {selectedVariants.length === 0 && (
            <p className="mt-2 text-xs text-orange-600">Select at least one variant</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 3: Content editor ─────────────────────────────────────────────────────

function ContentStep({
  content,
  onChange,
}: {
  content: BuilderState['content'];
  onChange: (c: BuilderState['content']) => void;
}) {
  const addSection = (type: ContentSection['type']) => {
    let newSection: ContentSection;
    switch (type) {
      case 'text': newSection = { type: 'text', content: '' }; break;
      case 'image': newSection = { type: 'image', url: '', alt: '' }; break;
      case 'video': newSection = { type: 'video', embedUrl: '' }; break;
      case 'features': newSection = { type: 'features', items: [{ icon: '✅', title: '', desc: '' }] }; break;
      case 'testimonial': newSection = { type: 'testimonial', items: [{ name: '', text: '', rating: 5 }] }; break;
      case 'faq': newSection = { type: 'faq', items: [{ q: '', a: '' }] }; break;
      case 'why_product': newSection = { type: 'why_product', items: [''] }; break;
      case 'why_us': newSection = { type: 'why_us', items: [''] }; break;
    }
    onChange({ ...content, sections: [...content.sections, newSection] });
  };

  const removeSection = (i: number) => {
    onChange({ ...content, sections: content.sections.filter((_, idx) => idx !== i) });
  };

  const updateSection = (i: number, updated: ContentSection) => {
    const sections = [...content.sections];
    sections[i] = updated;
    onChange({ ...content, sections });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Page Content</h2>
        <p className="text-sm text-muted-foreground">Configure hero, colors, and content sections</p>
      </div>

      {/* Hero */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <p className="font-medium text-sm">Hero Section</p>
        <div>
          <label className="text-xs text-muted-foreground">Hero Title</label>
          <Input value={content.heroTitle} onChange={(e) => onChange({ ...content, heroTitle: e.target.value })} className="mt-1" placeholder="আমাদের সেরা পণ্য..." />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hero Subtitle</label>
          <Input value={content.heroSubtitle} onChange={(e) => onChange({ ...content, heroSubtitle: e.target.value })} className="mt-1" placeholder="১০০% অর্গানিক, সরাসরি কৃষক থেকে" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">CTA Button Text</label>
          <Input value={content.ctaText} onChange={(e) => onChange({ ...content, ctaText: e.target.value })} className="mt-1" placeholder="অর্ডার করুন" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hero Image URL</label>
          <Input value={content.heroImage.url} onChange={(e) => onChange({ ...content, heroImage: { ...content.heroImage, url: e.target.value } })} className="mt-1" placeholder="https://..." />
        </div>
      </div>

      {/* Colors */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <p className="font-medium text-sm">Color Scheme</p>
        <div className="flex gap-4">
          {(['primary', 'accent', 'background'] as const).map((key) => (
            <div key={key} className="flex-1">
              <label className="text-xs capitalize text-muted-foreground">{key}</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={content.colors[key]}
                  onChange={(e) => onChange({ ...content, colors: { ...content.colors, [key]: e.target.value } })}
                  className="h-8 w-10 cursor-pointer rounded border border-border"
                />
                <Input value={content.colors[key]} onChange={(e) => onChange({ ...content, colors: { ...content.colors, [key]: e.target.value } })} className="text-xs font-mono" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">Content Sections</p>
          <Select onValueChange={(v) => addSection(v as ContentSection['type'])}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Add section..." />
            </SelectTrigger>
            <SelectContent>
              {SECTION_TYPES.map((s) => (
                <SelectItem key={s.type} value={s.type}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {content.sections.length === 0 && (
          <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No sections yet — add content blocks above
          </p>
        )}

        {content.sections.map((section, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary" className="capitalize text-xs">{section.type}</Badge>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => removeSection(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {section.type === 'text' && (
              <textarea
                value={section.content}
                onChange={(e) => updateSection(i, { ...section, content: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={4}
                placeholder="Enter text content..."
              />
            )}

            {section.type === 'image' && (
              <div className="space-y-2">
                <Input value={section.url} onChange={(e) => updateSection(i, { ...section, url: e.target.value })} placeholder="Image URL" />
                <Input value={section.alt} onChange={(e) => updateSection(i, { ...section, alt: e.target.value })} placeholder="Alt text" />
              </div>
            )}

            {section.type === 'video' && (
              <Input value={section.embedUrl} onChange={(e) => updateSection(i, { ...section, embedUrl: e.target.value })} placeholder="YouTube/Vimeo embed URL" />
            )}

            {section.type === 'features' && (
              <div className="space-y-3">
                {section.items.map((item, j) => (
                  <div key={j} className="flex gap-2 items-start">
                    <Input value={item.icon} onChange={(e) => {
                      const items = [...section.items];
                      items[j] = { ...item, icon: e.target.value };
                      updateSection(i, { ...section, items });
                    }} className="w-16 text-center" placeholder="🌿" />
                    <Input value={item.title} onChange={(e) => {
                      const items = [...section.items];
                      items[j] = { ...item, title: e.target.value };
                      updateSection(i, { ...section, items });
                    }} placeholder="Feature title" />
                    <Input value={item.desc} onChange={(e) => {
                      const items = [...section.items];
                      items[j] = { ...item, desc: e.target.value };
                      updateSection(i, { ...section, items });
                    }} placeholder="Description" />
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0" onClick={() => {
                      updateSection(i, { ...section, items: section.items.filter((_, k) => k !== j) });
                    }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => updateSection(i, { ...section, items: [...section.items, { icon: '✅', title: '', desc: '' }] })}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Feature
                </Button>
              </div>
            )}

            {section.type === 'testimonial' && (
              <div className="space-y-3">
                {section.items.map((item, j) => (
                  <div key={j} className="space-y-2 rounded-lg bg-muted/30 p-3">
                    <div className="flex gap-2">
                      <Input value={item.name} onChange={(e) => {
                        const items = [...section.items];
                        items[j] = { ...item, name: e.target.value };
                        updateSection(i, { ...section, items });
                      }} placeholder="Customer name" />
                      <Input type="number" min={1} max={5} value={item.rating ?? 5} onChange={(e) => {
                        const items = [...section.items];
                        items[j] = { ...item, rating: Number(e.target.value) };
                        updateSection(i, { ...section, items });
                      }} className="w-20" placeholder="Rating" />
                      <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => {
                        updateSection(i, { ...section, items: section.items.filter((_, k) => k !== j) });
                      }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <textarea
                      value={item.text}
                      onChange={(e) => {
                        const items = [...section.items];
                        items[j] = { ...item, text: e.target.value };
                        updateSection(i, { ...section, items });
                      }}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      rows={2}
                      placeholder="Customer review text..."
                    />
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => updateSection(i, { ...section, items: [...section.items, { name: '', text: '', rating: 5 }] })}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Testimonial
                </Button>
              </div>
            )}

            {section.type === 'faq' && (
              <div className="space-y-3">
                {section.items.map((item, j) => (
                  <div key={j} className="space-y-2 rounded-lg bg-muted/30 p-3">
                    <div className="flex gap-2">
                      <Input value={item.q} onChange={(e) => {
                        const items = [...section.items];
                        items[j] = { ...item, q: e.target.value };
                        updateSection(i, { ...section, items });
                      }} placeholder="Question" className="flex-1" />
                      <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => {
                        updateSection(i, { ...section, items: section.items.filter((_, k) => k !== j) });
                      }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <textarea
                      value={item.a}
                      onChange={(e) => {
                        const items = [...section.items];
                        items[j] = { ...item, a: e.target.value };
                        updateSection(i, { ...section, items });
                      }}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      rows={2}
                      placeholder="Answer..."
                    />
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => updateSection(i, { ...section, items: [...section.items, { q: '', a: '' }] })}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add FAQ
                </Button>
              </div>
            )}

            {section.type === 'why_product' && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Title: কেন খাবেন আমাদের পণ্য? <span className="italic">(hardcoded)</span></p>
                {section.items.map((item, j) => (
                  <div key={j} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const items = [...section.items];
                        items[j] = e.target.value;
                        updateSection(i, { ...section, items });
                      }}
                      placeholder="একটি পয়েন্ট লিখুন..."
                    />
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0" onClick={() => {
                      updateSection(i, { ...section, items: section.items.filter((_, k) => k !== j) });
                    }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => updateSection(i, { ...section, items: [...section.items, ''] })}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> পয়েন্ট যোগ করুন
                </Button>
              </div>
            )}

            {section.type === 'why_us' && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Title: কেন আমাদের থেকে কিনবেন? <span className="italic">(hardcoded)</span></p>
                {section.items.map((item, j) => (
                  <div key={j} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const items = [...section.items];
                        items[j] = e.target.value;
                        updateSection(i, { ...section, items });
                      }}
                      placeholder="একটি কারণ লিখুন..."
                    />
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0" onClick={() => {
                      updateSection(i, { ...section, items: section.items.filter((_, k) => k !== j) });
                    }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => updateSection(i, { ...section, items: [...section.items, ''] })}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> কারণ যোগ করুন
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 4: Settings ───────────────────────────────────────────────────────────

const settingsSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Lowercase, numbers and hyphens only'),
  isActive: z.boolean(),
});
type SettingsForm = z.infer<typeof settingsSchema>;

function SettingsStep({
  values,
  onChange,
}: {
  values: { name: string; slug: string; isActive: boolean };
  onChange: (v: { name: string; slug: string; isActive: boolean }) => void;
}) {
  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: values,
  });

  const name = form.watch('name');
  const slug = form.watch('slug');
  const isActive = form.watch('isActive');

  const autoSlug = (n: string) =>
    n.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Page Settings</h2>
        <p className="text-sm text-muted-foreground">Name your page and set the public URL slug</p>
      </div>

      <div className="rounded-xl border border-border p-5 space-y-4">
        <div>
          <label className="text-sm font-medium">Page Name</label>
          <Input
            {...form.register('name', {
              onChange: (e) => {
                const n = e.target.value;
                if (!form.getValues('slug') || form.getValues('slug') === autoSlug(name)) {
                  form.setValue('slug', autoSlug(n));
                  onChange({ name: n, slug: autoSlug(n), isActive });
                } else {
                  onChange({ name: n, slug, isActive });
                }
              },
            })}
            className="mt-1"
            placeholder="Summer Rice Campaign"
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">URL Slug</label>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">yoursite.com/step/</span>
            <Input
              {...form.register('slug', { onChange: (e) => onChange({ name, slug: e.target.value, isActive }) })}
              placeholder="summer-rice"
            />
          </div>
          {form.formState.errors.slug && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.slug.message}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Active</label>
          <button
            type="button"
            onClick={() => { form.setValue('isActive', !isActive); onChange({ name, slug, isActive: !isActive }); }}
            className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-muted-foreground">{isActive ? 'Public — visible on /step/' + slug : 'Draft — not publicly accessible'}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main builder ───────────────────────────────────────────────────────────────

interface LandingPageBuilderProps {
  initial?: LandingPage;
}

export function LandingPageBuilder({ initial }: LandingPageBuilderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!initial;

  const [step, setStep] = useState(0);

  // The GET endpoint populates `product` as a full object; extract the _id string for state
  const resolveProductId = (product: unknown): string => {
    if (!product) return '';
    if (typeof product === 'string') return product;
    if (typeof product === 'object' && '_id' in (product as object)) {
      return String((product as { _id: unknown })._id);
    }
    return '';
  };

  const [state, setState] = useState<BuilderState>({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    template: initial?.template ?? 'template1',
    product: resolveProductId(initial?.product),
    selectedVariants: (initial?.selectedVariants ?? []).map(String),
    content: {
      heroTitle: initial?.content.heroTitle ?? '',
      heroSubtitle: initial?.content.heroSubtitle ?? '',
      heroImage: initial?.content.heroImage ?? { url: '', publicId: '' },
      ctaText: initial?.content.ctaText ?? 'অর্ডার করুন',
      colors: initial?.content.colors ?? { primary: '#4a7c2e', accent: '#d97706', background: '#fefcf7' },
      sections: initial?.content.sections ?? [],
    },
    isActive: initial?.isActive ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLandingPageInput) => landingPagesApi.create(data),
    onSuccess: () => {
      toast.success('Landing page created!');
      void queryClient.invalidateQueries({ queryKey: ['admin-landing-pages'] });
      router.push('/admin/landing-pages');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateLandingPageInput>) => landingPagesApi.update(initial!._id, data),
    onSuccess: () => {
      toast.success('Landing page updated!');
      void queryClient.invalidateQueries({ queryKey: ['admin-landing-pages'] });
      // Remove individual page cache so next edit visit fetches fresh data (prevents stale template/product/icons)
      queryClient.removeQueries({ queryKey: ['admin-landing-page', initial!._id] });
      router.push('/admin/landing-pages');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canProceed = () => {
    if (step === 1 && (!state.product || state.selectedVariants.length === 0)) return false;
    if (step === 3 && (!state.name || !state.slug)) return false;
    return true;
  };

  const handleSubmit = () => {
    const payload: CreateLandingPageInput = {
      name: state.name,
      slug: state.slug,
      template: state.template,
      product: state.product,
      selectedVariants: state.selectedVariants,
      content: state.content,
      isActive: state.isActive,
    };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-center pt-2">
        <StepIndicator step={step} total={4} />
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        {step === 0 && (
          <TemplateStep value={state.template} onChange={(t) => setState((s) => ({ ...s, template: t }))} />
        )}
        {step === 1 && (
          <ProductStep
            productId={state.product}
            selectedVariants={state.selectedVariants}
            onProductChange={(id) => setState((s) => ({ ...s, product: id }))}
            onVariantsChange={(ids) => setState((s) => ({ ...s, selectedVariants: ids }))}
          />
        )}
        {step === 2 && (
          <ContentStep
            content={state.content}
            onChange={(c) => setState((s) => ({ ...s, content: c }))}
          />
        )}
        {step === 3 && (
          <SettingsStep
            values={{ name: state.name, slug: state.slug, isActive: state.isActive }}
            onChange={(v) => setState((s) => ({ ...s, ...v }))}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? router.push('/admin/landing-pages') : setStep((s) => s - 1))}
          disabled={isPending}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isPending || !canProceed()}>
            {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
            {isEdit ? 'Save Changes' : 'Publish'}
          </Button>
        )}
      </div>
    </div>
  );
}
