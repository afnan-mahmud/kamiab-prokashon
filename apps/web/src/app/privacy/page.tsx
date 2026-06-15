import { PublicLayout } from '@/components/layout/public-layout';
import { BRAND } from '@/lib/brand';

export const metadata = {
  title: 'গোপনীয়তা নীতি — ' + BRAND.nameEn,
};

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <div className="container-page py-12">
        <h1 className="mb-8 text-3xl font-bold">গোপনীয়তা নীতি</h1>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              কী তথ্য সংগ্রহ করা হয়
            </h2>
            <p>
              অর্ডার সম্পন্ন করার সময় আমরা আপনার নাম, ফোন নম্বর এবং ডেলিভারি ঠিকানা
              সংগ্রহ করি। এই তথ্যগুলো শুধুমাত্র আপনার অর্ডার প্রক্রিয়া ও ডেলিভারির
              জন্য ব্যবহার করা হয়।
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">তথ্য কীভাবে ব্যবহার হয়</h2>
            <p>
              আপনার প্রদত্ত তথ্য ব্যবহার করে আমরা অর্ডার নিশ্চিত করি এবং কুরিয়ার
              সেবার মাধ্যমে পণ্য পৌঁছে দিই। ক্যাশ অন ডেলিভারি (COD) পদ্ধতিতে পেমেন্ট
              নেওয়া হয়, তাই কোনো ব্যাংকিং বা কার্ডের তথ্য সংগ্রহ করা হয় না।
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">তৃতীয় পক্ষের সাথে তথ্য ভাগ</h2>
            <p>
              আপনার ব্যক্তিগত তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রি বা হস্তান্তর করা
              হয় না। ডেলিভারি নিশ্চিত করতে শুধুমাত্র কুরিয়ার পার্টনারের সাথে প্রয়োজনীয়
              তথ্য (নাম, ঠিকানা, ফোন) শেয়ার করা হয়।
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">তথ্যের নিরাপত্তা</h2>
            <p>
              আমরা আপনার তথ্য নিরাপদ রাখতে সর্বদা সচেষ্ট। আমাদের সার্ভার এনক্রিপ্টেড
              সংযোগের মাধ্যমে সুরক্ষিত। তবে ইন্টারনেটে কোনো পদ্ধতি সম্পূর্ণ নিরাপদ
              নয় বলে আমরা সবসময় সতর্কতা অবলম্বন করি।
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">যোগাযোগ</h2>
            <p>
              গোপনীয়তা নীতি সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন:{' '}
              <a href={`mailto:${BRAND.email}`} className="text-primary hover:underline">
                {BRAND.email}
              </a>{' '}
              অথবা ফোনে:{' '}
              <a href={`tel:${BRAND.phone.replace(/-/g, '')}`} className="text-primary hover:underline">
                {BRAND.phone}
              </a>
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
