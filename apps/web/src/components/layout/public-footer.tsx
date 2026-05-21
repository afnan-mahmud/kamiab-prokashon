import Link from 'next/link';
import { Leaf, Phone, Mail, MapPin, Facebook } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-[#111111] text-gray-300">
      <div className="container-page py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2 text-white">
              <Leaf className="h-5 w-5 text-primary-light" />
              <span className="font-bold">চলন বিল অর্গানিক</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              বাংলাদেশের প্রকৃতির সেরা উপহার — সম্পূর্ণ প্রাকৃতিক ও অর্গানিক খাদ্যপণ্য।
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-4 font-semibold text-white">দ্রুত লিংক</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/', label: 'হোম' },
                { href: '/shop', label: 'পণ্যসমূহ' },
                { href: '/cart', label: 'কার্ট' },
                { href: '/privacy', label: 'গোপনীয়তা নীতি' },
                { href: '/return', label: 'রিটার্ন নীতি' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-primary-light transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 font-semibold text-white">যোগাযোগ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                <span>+৮৮০ ১৭০০ ০০০০০০</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                <span>info@cholonbilorganic.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                <span>চলন বিল, নাটোর, বাংলাদেশ</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="mb-4 font-semibold text-white">আমাদের অনুসরণ করুন</h3>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary-light transition-colors"
            >
              <Facebook className="h-5 w-5" />
              Facebook
            </a>
            <div className="mt-6">
              <p className="mb-2 text-xs text-gray-500">আমরা গ্রহণ করি</p>
              <div className="flex gap-2">
                <span className="rounded border border-gray-700 px-2 py-1 text-xs">Cash</span>
                <span className="rounded border border-gray-700 px-2 py-1 text-xs">bKash</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} চলন বিল অর্গানিক — সর্বস্বত্ব সংরক্ষিত
        </div>
      </div>
    </footer>
  );
}
