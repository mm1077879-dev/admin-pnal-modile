import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Truck,
  User,
  X,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { buildNavigationTree, type NavMenuTreeNode } from '../../../shared/adminAnalytics.ts';
import { isStaffRole } from '../../../shared/rbac.ts';
import { sanitizeHref } from '../../../shared/security.ts';
import { useAppDispatch, useAppSelector } from '../../app/hooks.ts';
import { openAuthModal, logoutUser } from '../../features/auth/authSlice.ts';
import { restoreGuestCartOnLogout, setCartDrawerOpen } from '../../features/cart/cartSlice.ts';
import { pushToast } from '../../features/toast/toastSlice.ts';
import { apiRequest, formatBdt } from '../../lib/api.ts';
import type {
  Category,
  HomepageConfig,
  NavigationMenuItem,
  StoreSettings,
} from '../../types/domain.ts';
import { SafeImage } from '../ui/SafeImage.tsx';

interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  effectivePrice: number;
  originalPrice: number | null;
  discountPercent: number;
}

interface StorefrontHeaderProps {
  categories: Category[];
  homepage?: HomepageConfig | null;
  storeSettings?: StoreSettings | null;
}

const DEFAULT_NAV_ITEMS: NavMenuTreeNode[] = [
  { _id: 'def-home', label: 'Home', url: '/', displayOrder: 0, isVisible: true, children: [] },
  { _id: 'def-shop', label: 'Shop', url: '/shop', displayOrder: 1, isVisible: true, children: [] },
  { _id: 'def-deals', label: 'Deals', url: '/shop?onSale=true', displayOrder: 2, isVisible: true, children: [] },
  { _id: 'def-about', label: 'About Us', url: '/policies/about', displayOrder: 3, isVisible: true, children: [] },
  { _id: 'def-track', label: 'Track Order', url: '/track-order', displayOrder: 4, isVisible: true, children: [] },
  { _id: 'def-contact', label: 'Contact Us', url: '/contact', displayOrder: 5, isVisible: true, children: [] },
];

function isExternalHref(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function StorefrontHeader({ categories, homepage, storeSettings }: StorefrontHeaderProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const cartItems = useAppSelector((s) => s.cart.items);
  const guestWishlistIds = useAppSelector((s) => s.wishlist.guestIds);
  const uniqueCartLines = cartItems.length;
  const wishlistCount = user ? user.wishlist?.length || 0 : guestWishlistIds.length;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchError, setSearchError] = useState(false);

  const [accountPopupOpen, setAccountPopupOpen] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openNavDropdownId, setOpenNavDropdownId] = useState<string | null>(null);
  const [dynamicNavItems, setDynamicNavItems] = useState<NavigationMenuItem[]>([]);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const catMenuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    apiRequest<{ items: NavigationMenuItem[] }>('/api/cms/public/navigation?location=header')
      .then((res) => {
        if (Array.isArray(res.items)) {
          setDynamicNavItems(res.items);
        }
      })
      .catch(() => {
        // Fallback to default links when DB is unavailable or empty
      });
  }, []);

  useEffect(() => {
    setAccountPopupOpen(false);
    setCatMenuOpen(false);
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    setOpenNavDropdownId(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountPopupOpen(false);
      }
      if (catMenuRef.current && !catMenuRef.current.contains(target)) {
        setCatMenuOpen(false);
      }
      if (navRef.current && !navRef.current.contains(target)) {
        setOpenNavDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Debounced bounded autocomplete search
  useEffect(() => {
    if (!dropdownOpen) return;
    const trimmed = query.trim();
    const timer = window.setTimeout(async () => {
      try {
        setSearchError(false);
        const res = await apiRequest<{ suggestions: SearchSuggestion[]; popularSearches?: string[] }>(
          `/api/catalog/search/suggestions?q=${encodeURIComponent(trimmed)}&limit=8`
        );
        setSuggestions(res.suggestions || []);
        if (res.popularSearches) setPopularSearches(res.popularSearches);
        setActiveIndex(-1);
      } catch {
        setSearchError(true);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query, dropdownOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      navigate('/shop');
      return;
    }
    setDropdownOpen(false);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setDropdownOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDropdownOpen(true);
      setActiveIndex((prev) => Math.min(suggestions.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(-1, prev - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      const target = suggestions[activeIndex];
      setDropdownOpen(false);
      navigate(`/product/${target.slug}`);
    }
  };

  const handleProtectedAccountNav = (dest: string) => {
    setAccountPopupOpen(false);
    if (!user) {
      dispatch(openAuthModal({ mode: 'login', returnTo: dest }));
      return;
    }
    navigate(dest);
  };

  const handleLogout = async () => {
    setAccountPopupOpen(false);
    await dispatch(logoutUser());
    dispatch(restoreGuestCartOnLogout());
    dispatch(pushToast({ variant: 'info', message: 'You have been signed out.' }));
    navigate('/');
  };

  const headerSettings = storeSettings?.headerSettings;
  const stickyHeader = headerSettings?.stickyHeader ?? true;
  const showSearch = headerSettings?.showSearch ?? true;
  const showWishlist = headerSettings?.showWishlist ?? true;
  const showCart = headerSettings?.showCart ?? true;
  const showAccount = headerSettings?.showAccount ?? true;
  const customLogoUrl = sanitizeHref(headerSettings?.logoUrl);

  const announcementBar = headerSettings?.announcementBar;
  const isAnnouncementActive = useMemo(() => {
    if (!announcementBar?.enabled || !announcementBar.text?.trim()) return false;
    const now = Date.now();
    if (announcementBar.startsAt) {
      const startMs = new Date(announcementBar.startsAt).getTime();
      if (!Number.isNaN(startMs) && now < startMs) return false;
    }
    if (announcementBar.endsAt) {
      const endMs = new Date(announcementBar.endsAt).getTime();
      if (!Number.isNaN(endMs) && now > endMs) return false;
    }
    return true;
  }, [announcementBar]);

  const announcementLink = sanitizeHref(announcementBar?.linkUrl);

  const announcementItems = homepage?.announcementItems?.length
    ? homepage.announcementItems
    : [
        { icon: 'truck', text: 'Free Shipping on Orders Over ৳999' },
        { icon: 'rotate', text: '7 Days Easy Return' },
        { icon: 'shield', text: 'Secure Payment' },
      ];

  const announcementPhone =
    homepage?.announcementPhone || storeSettings?.supportPhone || '+880 1700 000000';

  const navTree = useMemo(() => {
    const built = buildNavigationTree(dynamicNavItems);
    return built.length > 0 ? built : DEFAULT_NAV_ITEMS;
  }, [dynamicNavItems]);

  const parentCategories = categories.filter((c) => !c.parentId);

  const renderNavLink = (
    item: NavMenuTreeNode,
    className: string,
    onSelect?: () => void
  ) => {
    const safeUrl = sanitizeHref(item.url) || '/';
    if (isExternalHref(safeUrl)) {
      return (
        <a
          href={safeUrl}
          target={item.openInNewTab ? '_blank' : undefined}
          rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
          onClick={onSelect}
          className={className}
        >
          {item.label}
        </a>
      );
    }
    return (
      <Link
        to={safeUrl}
        target={item.openInNewTab ? '_blank' : undefined}
        rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
        onClick={onSelect}
        className={className}
      >
        {item.label}
      </Link>
    );
  };

  const storeName = storeSettings?.storeName?.trim() || 'NOVARA COMMERCE';
  const nameWords = storeName.split(/\s+/);
  const firstWord = nameWords[0] || 'NOVARA';
  const restWords = nameWords.slice(1).join(' ');

  return (
    <header className={`${stickyHeader ? 'sticky top-0' : 'relative'} z-40 bg-white border-b border-slate-200`}>
      {/* Dynamic Promotional Announcement Strip */}
      {isAnnouncementActive && announcementBar && (
        <div
          className="text-xs font-semibold text-center px-4 py-1.5"
          style={{
            backgroundColor: announcementBar.backgroundColor || '#16A34A',
            color: announcementBar.textColor || '#FFFFFF',
          }}
        >
          {announcementLink ? (
            isExternalHref(announcementLink) ? (
              <a
                href={announcementLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {announcementBar.text}
              </a>
            ) : (
              <Link to={announcementLink} className="underline-offset-2 hover:underline">
                {announcementBar.text}
              </Link>
            )
          ) : (
            <span>{announcementBar.text}</span>
          )}
        </div>
      )}

      {/* Top Dark Utility Bar */}
      <div className="bg-[#0B1A2B] text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 h-9 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar">
            {announcementItems.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  idx > 0 ? 'hidden sm:flex border-l border-slate-700 pl-4 md:pl-6' : ''
                }`}
              >
                {item.icon === 'truck' && <Truck className="w-3.5 h-3.5 text-emerald-400" />}
                {item.icon === 'rotate' && <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />}
                {item.icon === 'shield' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                <span className="text-slate-200 font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          {announcementPhone && (
            <Link
              to="/contact"
              className="flex items-center gap-1.5 text-slate-200 hover:text-white whitespace-nowrap shrink-0 font-medium"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="tabular-nums">{announcementPhone}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main White Header Row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-700 hover:bg-slate-100 shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink">
            {customLogoUrl ? (
              <SafeImage
                src={customLogoUrl}
                alt={storeName}
                className="h-9 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#16A34A] flex items-center justify-center text-white shadow-xs shrink-0">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] sm:text-xl font-extrabold tracking-tight leading-none whitespace-nowrap">
                    <span className="text-slate-900">{firstWord}</span>
                    {restWords && <span className="text-[#16A34A]"> {restWords}</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 hidden sm:block">
                    {storeSettings?.tagline || 'Shop Smart, Live Better'}
                  </p>
                </div>
              </>
            )}
          </Link>
        </div>

        {/* Bounded Cross-Lingual Search Bar */}
        {showSearch ? (
          <div ref={searchContainerRef} className="relative flex-1 max-w-2xl hidden md:block">
            <form onSubmit={handleSearchSubmit} className="flex items-center">
              <input
                type="search"
                value={query}
                onFocus={() => setDropdownOpen(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search products in English or বাংলা (e.g. মোটিভেশনাল বই, Smartphone)..."
                aria-label="Search for products"
                aria-expanded={dropdownOpen}
                aria-autocomplete="list"
                className="w-full h-10 pl-4 pr-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
              />
              <button
                type="submit"
                aria-label="Submit search"
                className="h-10 px-4 rounded-r-lg bg-[#16A34A] hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shrink-0"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {dropdownOpen && (
              <div
                role="listbox"
                aria-label="Search suggestions"
                className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto"
              >
                {searchError ? (
                  <div className="p-4 text-sm text-slate-500">
                    Live suggestions unavailable right now. Press Enter to search the catalog.
                  </div>
                ) : query.trim().length === 0 ? (
                  <div className="p-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                      Popular Searches
                    </p>
                    <div className="flex flex-wrap gap-2 px-2 pb-1">
                      {(popularSearches.length > 0
                        ? popularSearches
                        : ['Smartphone', 'মোটিভেশনাল বই', 'Earbuds', 'Backpack']
                      ).map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => {
                            setQuery(term);
                            setDropdownOpen(false);
                            navigate(`/search?q=${encodeURIComponent(term)}`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-medium text-slate-700 transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">
                    No quick matches for "{query}". Press Enter to run full search.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {suggestions.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === idx}
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate(`/product/${item.slug}`);
                        }}
                        className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${
                          activeIndex === idx ? 'bg-emerald-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                          <SafeImage
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-emerald-600 tabular-nums">
                              {formatBdt(item.effectivePrice)}
                            </span>
                            {item.originalPrice && item.originalPrice > item.effectivePrice && (
                              <span className="text-xs text-slate-400 line-through tabular-nums">
                                {formatBdt(item.originalPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                      }}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 text-center"
                    >
                      View all results for "{query}" →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 hidden md:block" />
        )}

        {/* Account Popup + Wishlist + Redux Cart */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          {showAccount && (
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountPopupOpen((v) => !v)}
                aria-expanded={accountPopupOpen}
                aria-label="Account menu"
                className="flex items-center gap-2 px-1 sm:px-2.5 py-1 sm:py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-700 border border-slate-200">
                  {user?.avatarUrl ? (
                    <SafeImage
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight max-w-[110px] truncate">
                    {user ? user.name : 'Account'}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {user ? user.role.replace('_', ' ') : 'Login / Register'}
                  </p>
                </div>
              </button>

              {accountPopupOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2"
                >
                  {user ? (
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  ) : (
                    <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountPopupOpen(false);
                          dispatch(openAuthModal({ mode: 'login' }));
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountPopupOpen(false);
                          dispatch(openAuthModal({ mode: 'register' }));
                        }}
                        className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        Create Customer Account
                      </button>
                    </div>
                  )}

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => handleProtectedAccountNav('/account')}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <LayoutDashboard className="w-4 h-4 text-slate-400" />
                      <span>My Dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProtectedAccountNav('/account/orders')}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <Package className="w-4 h-4 text-slate-400" />
                      <span>My Orders / History</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountPopupOpen(false);
                        navigate('/account/wishlist');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <Heart className="w-4 h-4 text-slate-400" />
                      <span>My Wishlist</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProtectedAccountNav('/account/addresses')}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>Saved Addresses</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProtectedAccountNav('/account/settings')}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Account Settings</span>
                    </button>

                    {user && isStaffRole(user.role) && (
                      <Link
                        to="/admin"
                        onClick={() => setAccountPopupOpen(false)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Admin Operations Panel</span>
                      </Link>
                    )}

                    {user && (
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left border-t border-slate-100 mt-1 pt-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {showWishlist && (
            <button
              type="button"
              onClick={() => navigate('/account/wishlist')}
              aria-label={`Wishlist (${wishlistCount} items)`}
              className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors"
            >
              <Heart className="w-4 h-4" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {wishlistCount}
                </span>
              )}
            </button>
          )}

          {showCart && (
            <button
              type="button"
              onClick={() => dispatch(setCartDrawerOpen(true))}
              aria-label={`Shopping cart (${uniqueCartLines} items)`}
              data-testid="header-cart-button"
              className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              {uniqueCartLines > 0 && (
                <span
                  data-testid="cart-badge-count"
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums"
                >
                  {uniqueCartLines}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Category Navigation Bar */}
      <div className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            <div ref={catMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setCatMenuOpen((v) => !v)}
                aria-expanded={catMenuOpen}
                className="h-9 px-4 rounded-lg bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Menu className="w-4 h-4" />
                <span>All Categories</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {catMenuOpen && (
                <div className="fixed left-4 sm:left-auto mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2">
                  {parentCategories.length === 0 ? (
                    <Link
                      to="/shop"
                      onClick={() => setCatMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Browse All Products
                    </Link>
                  ) : (
                    parentCategories.map((cat) => (
                      <Link
                        key={cat._id}
                        to={`/category/${cat.slug}`}
                        onClick={() => setCatMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <span>{cat.name}</span>
                        {cat.nameBn && <span className="text-xs text-slate-400">{cat.nameBn}</span>}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            <nav ref={navRef} aria-label="Primary" className="hidden lg:flex items-center gap-6 text-sm font-medium">
              {navTree.map((item) => {
                const isActive =
                  item.url === '/'
                    ? location.pathname === '/'
                    : location.pathname + location.search === item.url ||
                      (item.url !== '/' && location.pathname === item.url);

                if (item.children.length > 0) {
                  const isOpen = openNavDropdownId === item._id;
                  return (
                    <div key={item._id} className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setOpenNavDropdownId(isOpen ? null : item._id)}
                        aria-expanded={isOpen}
                        className={`flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded-md transition-colors ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 font-semibold'
                            : 'text-slate-700 hover:text-emerald-700'
                        }`}
                      >
                        <span>{item.label}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {isOpen && (
                        <div className="absolute left-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5">
                          {renderNavLink(
                            item,
                            'block px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-50 hover:text-emerald-700',
                            () => setOpenNavDropdownId(null)
                          )}
                          <div className="my-1 border-t border-slate-100" />
                          {item.children.map((child) => (
                            <div key={child._id}>
                              {renderNavLink(
                                child,
                                'block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700',
                                () => setOpenNavDropdownId(null)
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={item._id} className="shrink-0">
                    {renderNavLink(
                      item,
                      `whitespace-nowrap shrink-0 px-2.5 py-1 rounded-md transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : 'text-slate-700 hover:text-emerald-700'
                      }`
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {user && isStaffRole(user.role) && (
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Search */}
      {showSearch && (
        <div className="md:hidden px-4 pb-3 bg-white border-t border-slate-100">
          <form onSubmit={handleSearchSubmit} className="flex items-center pt-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              aria-label="Mobile search"
              className="w-full h-9 pl-3 pr-2 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 text-sm"
            />
            <button
              type="submit"
              aria-label="Search"
              className="h-9 px-3.5 rounded-r-lg bg-[#16A34A] text-white"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1.5">
          {navTree.map((item) => (
            <div key={item._id} className="space-y-1">
              {renderNavLink(
                item,
                'block py-2 text-sm font-medium text-slate-800 hover:text-emerald-700',
                () => setMobileMenuOpen(false)
              )}
              {item.children.map((child) => (
                <div key={child._id} className="pl-4">
                  {renderNavLink(
                    child,
                    'block py-1.5 text-xs font-medium text-slate-600 hover:text-emerald-700',
                    () => setMobileMenuOpen(false)
                  )}
                </div>
              ))}
            </div>
          ))}
          {user && isStaffRole(user.role) && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-emerald-700 border-t border-slate-100 mt-1 pt-2"
            >
              Admin Operations Panel
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
