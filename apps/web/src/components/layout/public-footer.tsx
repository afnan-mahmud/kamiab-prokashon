import Image from 'next/image';
import Link from 'next/link';
import { Phone, Mail, MapPin, Facebook } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-[#111111] text-gray-300">
      <div className="container-page py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <Image src="/logo-white.png" alt="Sodai Kini" width={160} height={48} className="object-contain" />
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              The finest natural and organic food products straight from the heart of Bangladesh.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-4 font-semibold text-white">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/', label: 'Home' },
                { href: '/shop', label: 'Shop' },
                { href: '/cart', label: 'Cart' },
                { href: '/privacy', label: 'Privacy Policy' },
                { href: '/return', label: 'Return Policy' },
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
            <h3 className="mb-4 font-semibold text-white">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                <span>880 1346-990556</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                <span>contact@sodaikini.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                <span>House 37, Road 07, Sector 03, Uttara, Dhaka</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="mb-4 font-semibold text-white">Follow Us</h3>
            <a
              href="https://web.facebook.com/sodaikini"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary-light transition-colors"
            >
              <Facebook className="h-5 w-5" />
              Facebook
            </a>
            <div className="mt-6">
              <p className="mb-2 text-xs text-gray-500">We Accept</p>
              <div className="flex gap-2">
                <span className="rounded border border-gray-700 px-2 py-1 text-xs">Cash</span>
                <span className="rounded border border-gray-700 px-2 py-1 text-xs">bKash</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-6 flex flex-col items-center gap-1.5 text-center text-xs text-gray-500">
          <span>© {new Date().getFullYear()} Sodai Kini — All rights reserved.</span>
          <span>
            Developed by{' '}
            <a
              href="https://cholobohudur.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-primary-light transition-colors underline underline-offset-2"
            >
              Cholo Bohudur
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
