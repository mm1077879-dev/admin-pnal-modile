import { useEffect, useState } from 'react';
import { Mail, MapPin, Phone, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sanitizeHref } from '../../../shared/security.ts';
import { apiRequest } from '../../lib/api.ts';
import type { NavigationMenuItem, StaticPage, StoreSettings } from '../../types/domain.ts';
import { SafeImage } from '../ui/SafeImage.tsx';

function isExternalHref(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function StorefrontFooter({ storeSettings }: { storeSettings?: StoreSettings | null }) {
  const [footerPages, setFooterPages] = useState<Array<Pick<StaticPage, '_id' | 'title' | 'slug' | 'showInFooter'>>>([]);
  const [footerNavItems, setFooterNavItems] = useState<NavigationMenuItem[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<{ pages?: Array<Pick<StaticPage, '_id' | 'title' | 'slug' | 'showInFooter'>> }>(
        '/api/cms/public/pages'
      ).catch(() => ({ pages: [] })),
      apiRequest<{ items?: NavigationMenuItem[] }>(
        '/api/cms/public/navigation?location=footer'
      ).catch(() => ({ items: [] })),
    ]).then(([pagesRes, navRes]) => {
      if (!active) return;
      setFooterPages((pagesRes?.pages || []).filter((p) => p.showInFooter));
      setFooterNavItems((navRes?.items || []).filter((i) => i.isVisible));
    });
    return () => {
      active = false;
    };
  }, []);

  const storeName = storeSettings?.storeName || 'NOVARA COMMERCE';
  const tagline = storeSettings?.tagline || 'Shop Smart, Live Better';
  const phone = storeSettings?.supportPhone;
  const email = storeSettings?.supportEmail;
  const address = storeSettings?.businessAddress || 'Dhaka, Bangladesh';
  const social = storeSettings?.socialLinks || {};

  const footerSettings = storeSettings?.footerSettings;
  const footerLogoUrl = sanitizeHref(footerSettings?.footerLogoUrl);
  const footerDescription =
    footerSettings?.description?.trim() ||
    'Your trusted Bangladesh retail storefront for authentic electronics, fashion, books, beauty, and home essentials.';
  const copyrightText =
    footerSettings?.copyrightText?.trim() ||
    `© ${new Date().getFullYear()} ${storeName}. All Rights Reserved.`;
  const showPaymentLogos = footerSettings?.showPaymentLogos ?? true;

  const socialEntries = [
    { label: 'Facebook', url: sanitizeHref(social.facebook) },
    { label: 'Instagram', url: sanitizeHref(social.instagram) },
    { label: 'YouTube', url: sanitizeHref(social.youtube) },
    { label: 'LinkedIn', url: sanitizeHref(social.linkedin) },
    { label: 'TikTok', url: sanitizeHref(social.tiktok) },
    { label: 'WhatsApp', url: sanitizeHref(social.whatsapp) },
  ].filter((s): s is { label: string; url: string } => Boolean(s.url));

  return (
    <footer className="bg-[#0B1524] text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Brand Summary */}
        <div className="lg:col-span-1 space-y-4">
          <Link to="/" className="flex items-center gap-2.5">
            {footerLogoUrl ? (
              <SafeImage
                src={footerLogoUrl}
                alt={storeName}
                className="h-9 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-[#16A34A] flex items-center justify-center text-white shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-lg font-extrabold text-white leading-none">{storeName}</p>
                  <p className="text-[11px] text-emerald-400 mt-0.5">{tagline}</p>
                </div>
              </>
            )}
          </Link>
          <p className="text-xs text-slate-400 leading-relaxed">{footerDescription}</p>
          {socialEntries.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {socialEntries.map((item) => (
                <a
                  key={item.label}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600 text-xs text-slate-200 hover:text-white transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-bold text-white mb-4">Quick Links</h3>
          <ul className="space-y-2.5 text-xs">
            {footerNavItems.length > 0 ? (
              footerNavItems.map((item) => {
                const safeUrl = sanitizeHref(item.url) || '/';
                const openBlank = item.openInNewTab || isExternalHref(safeUrl);
                return (
                  <li key={item._id}>
                    {openBlank ? (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link to={safeUrl} className="hover:text-white transition-colors">
                        {item.label}
                      </Link>
                    )}
                  </li>
                );
              })
            ) : (
              <>
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/shop" className="hover:text-white transition-colors">Shop</Link></li>
                <li><Link to="/blog" className="hover:text-white transition-colors">Journal & Guides</Link></li>
                <li><Link to="/policies/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link to="/track-order" className="hover:text-white transition-colors">Track Order</Link></li>
              </>
            )}
            {footerPages.map((pg) => (
              <li key={pg._id}>
                <Link to={`/page/${pg.slug}`} className="hover:text-white transition-colors">
                  {pg.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Customer Service */}
        <div>
          <h3 className="text-sm font-bold text-white mb-4">Customer Service</h3>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/faq" className="hover:text-white transition-colors">FAQs</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Help Center</Link></li>
            <li><Link to="/policies/return" className="hover:text-white transition-colors">Return Policy</Link></li>
            <li><Link to="/policies/shipping" className="hover:text-white transition-colors">Shipping Info</Link></li>
            <li><Link to="/policies/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
            <li><Link to="/policies/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>

        {/* My Account */}
        <div>
          <h3 className="text-sm font-bold text-white mb-4">My Account</h3>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/account" className="hover:text-white transition-colors">My Account</Link></li>
            <li><Link to="/account/wishlist" className="hover:text-white transition-colors">Wishlist</Link></li>
            <li><Link to="/account/orders" className="hover:text-white transition-colors">Order History</Link></li>
            <li><Link to="/account/addresses" className="hover:text-white transition-colors">Saved Addresses</Link></li>
            <li><Link to="/cart" className="hover:text-white transition-colors">Shopping Cart</Link></li>
          </ul>
        </div>

        {/* Contact Us */}
        <div>
          <h3 className="text-sm font-bold text-white mb-4">Contact Us</h3>
          <ul className="space-y-3 text-xs text-slate-300">
            {phone && (
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="tabular-nums">{phone}</span>
              </li>
            )}
            {email && (
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{email}</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{address}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800/80 bg-[#08101C]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>{copyrightText}</p>
          {showPaymentLogos && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 mr-1">Payment Methods:</span>
              <span className="px-2 py-0.5 rounded bg-white text-blue-800 font-extrabold text-[10px]">VISA</span>
              <span className="px-2 py-0.5 rounded bg-white text-orange-600 font-extrabold text-[10px]">Mastercard</span>
              <span className="px-2 py-0.5 rounded bg-pink-600 text-white font-bold text-[10px]">bKash</span>
              <span className="px-2 py-0.5 rounded bg-orange-600 text-white font-bold text-[10px]">Nagad</span>
              <span className="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold text-[10px]">COD</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
