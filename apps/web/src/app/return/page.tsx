import { PublicLayout } from '@/components/layout/public-layout';
import { BRAND } from '@/lib/brand';

export const metadata = {
  title: 'রিটার্ন ও রিফান্ড নীতি — ' + BRAND.nameEn,
};

export default function ReturnPage() {
  return (
    <PublicLayout>
      <div className="container-page py-12">
        <h1 className="mb-8 text-3xl font-bold">রিটার্ন ও রিফান্ড নীতি</h1>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">রিটার্নের সময়সীমা</h2>
            <p>
              পণ্য ডেলিভারি পাওয়ার ৩ দিনের মধ্যে রিটার্নের আবেদন করতে হবে। নির্ধারিত
              সময়ের পরে রিটার্নের আবেদন গ্রহণযোগ্য হবে না।
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">রিটার্নযোগ্য পণ্যের শর্ত</h2>
            <p>
              নিচের যেকোনো পরিস্থিতিতে পণ্য রিটার্ন করা যাবে:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>ভুল বই পাঠানো হয়েছে (অর্ডার করা বইয়ের সাথে মিলছে না)।</li>
              <li>বই ক্ষতিগ্রস্ত বা ছেঁড়া-ফাটা অবস্থায় ডেলিভারি পাওয়া গেছে।</li>
              <li>বইয়ের পাতা মিসিং বা প্রিন্টিং ত্রুটি রয়েছে।</li>
            </ul>
            <p className="mt-2">
              বই পড়ে ফেলার পরে বা ব্যক্তিগত পছন্দ পরিবর্তনের কারণে রিটার্ন গ্রহণযোগ্য
              হবে না। রিটার্নের সময় বইটি অবশ্যই অক্ষত ও অব্যবহৃত অবস্থায় থাকতে হবে।
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">রিটার্নের প্রক্রিয়া</h2>
            <p>
              রিটার্ন করতে চাইলে প্রথমে আমাদের ফোনে যোগাযোগ করুন:{' '}
              <a href={`tel:${BRAND.phone.replace(/-/g, '')}`} className="text-primary hover:underline">
                {BRAND.phone}
              </a>
              ।{' '}
              আমাদের টিম আপনাকে পরবর্তী পদক্ষেপ জানাবে এবং রিটার্নের ঠিকানা প্রদান
              করবে। বিনা অনুমতিতে পাঠানো রিটার্ন গ্রহণ করা হবে না।
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">রিফান্ড পদ্ধতি</h2>
            <p>
              রিটার্ন যাচাই হওয়ার পরে রিফান্ড দেওয়া হবে। রিফান্ড সাধারণত ৩–৭ কার্যদিনের
              মধ্যে প্রক্রিয়া করা হয়। ক্যাশ অন ডেলিভারির ক্ষেত্রে রিফান্ড bKash বা
              ব্যাংক ট্রান্সফারের মাধ্যমে পাঠানো হবে।
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">যোগাযোগ</h2>
            <p>
              রিটার্ন ও রিফান্ড সংক্রান্ত যেকোনো প্রশ্নের জন্য আমাদের সাথে যোগাযোগ করুন:{' '}
              <a href={`mailto:${BRAND.email}`} className="text-primary hover:underline">
                {BRAND.email}
              </a>
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
