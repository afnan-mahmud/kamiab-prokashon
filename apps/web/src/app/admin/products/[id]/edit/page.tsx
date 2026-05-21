'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ProductForm, type ProductFormValues } from '@/features/products/product-form';
import { productsApi } from '@/features/products/products.api';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (values: ProductFormValues) => productsApi.update(id, values),
    onSuccess: () => {
      toast.success('Product updated');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['product', id] });
      router.push('/admin/products');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <p className="font-medium">Product not found</p>
        <p className="text-sm text-muted-foreground">
          The product may have been deleted or does not exist.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Product</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{product.name}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <ProductForm product={product} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}
