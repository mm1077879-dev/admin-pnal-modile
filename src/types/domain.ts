import type { Permission, StaffRole } from '../../shared/rbac.ts';
import type { OrderLifecycleStatus, PaymentState, FulfillmentState } from '../../shared/orderStateMachine.ts';

export interface MediaAsset {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  alt?: string;
}

export interface SavedAddress {
  _id: string;
  label: string;
  recipientName: string;
  phone: string;
  divisionCode: string;
  divisionName: string;
  districtCode: string;
  districtName: string;
  upazilaCode: string;
  upazilaName: string;
  areaCode: string;
  areaName: string;
  zone: 'dhaka_metro' | 'dhaka_suburb' | 'outside_dhaka';
  houseAddress: string;
  roadStreet?: string;
  landmark?: string;
  deliveryInstructions?: string;
  isDefault: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  role: StaffRole;
  permissions?: Permission[];
  emailVerified: boolean;
  authProvider: 'local' | 'google' | 'facebook';
  avatarUrl: string;
  avatarPublicId?: string;
  savedAddresses: SavedAddress[];
  wishlist: string[];
  notificationPreferences: {
    orderUpdates: boolean;
    promotions: boolean;
    backInStock: boolean;
  };
  membershipTier?: string;
  ordersCount?: number;
  reviewsCount?: number;
  createdAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  nameBn?: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  image?: MediaAsset;
  displayOrder: number;
  isActive: boolean;
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: MediaAsset;
  isActive: boolean;
}

export interface ProductVariant {
  _id: string;
  sku: string;
  title: string;
  options: Record<string, string>;
  price?: number | null;
  stockOnHand: number;
  reservedStock: number;
  lowStockThreshold: number;
  image?: MediaAsset;
  isActive: boolean;
}

export interface ProductSpecificationItem {
  label: string;
  value: string;
}

export interface ProductSpecificationGroup {
  groupTitle: string;
  items: ProductSpecificationItem[];
}

export interface Product {
  _id: string;
  name: string;
  nameBn?: string;
  slug: string;
  sku: string;
  barcode?: string;
  brandId?: Brand | null;
  categoryId: Category;
  subcategoryId?: Category | null;
  categoryDomain: 'electronics' | 'beauty' | 'books' | 'home_lifestyle' | 'fashion' | 'general';
  shortDescription?: string;
  description: string;
  features: string[];
  attributes: Record<string, string>;
  specificationGroups?: ProductSpecificationGroup[];
  bilingualKeywords: string[];
  basePrice: number;
  salePrice?: number | null;
  purchasePrice?: number | null;
  costPrice?: number | null;
  flashSalePrice?: number | null;
  flashSaleStart?: string | null;
  flashSaleEnd?: string | null;
  effectivePrice: number;
  originalPrice: number | null;
  discountPercent: number;
  isFlashSaleActive: boolean;
  stockOnHand: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  allowBackorders?: boolean;
  maxOrderQuantity?: number;
  variants: ProductVariant[];
  images: MediaAsset[];
  videoUrl?: string;
  videoThumbnail?: MediaAsset;
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  warrantyInfo?: string;
  returnPolicyInfo?: string;
  shippingInfo?: string;
  deliveryNotes?: string;
  codEligible: boolean;
  relatedProductIds?: string[];
  ratingAverage: number;
  ratingCount: number;
  salesCount: number;
  seoTitle?: string;
  seoDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  ogImage?: MediaAsset;
}

export interface AttributeGroup {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  attributes: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'color';
    options: string[];
    isFilterable: boolean;
    isRequired: boolean;
  }>;
  displayOrder?: number;
  isActive: boolean;
  createdAt?: string;
}

export interface CustomerGroup {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  discountPercent: number;
  badgeColor?: string;
  memberCount?: number;
  isActive: boolean;
  createdAt?: string;
}

export interface CustomerRecord {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: StaffRole;
  isActive: boolean;
  emailVerified: boolean;
  authProvider?: 'local' | 'google' | 'facebook';
  customerGroupId?: CustomerGroup | string | null;
  ordersCount?: number;
  totalSpent?: number;
  savedAddresses?: SavedAddress[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface RoleDefinitionItem {
  roleKey: StaffRole;
  label: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  staffCount?: number;
  updatedAt?: string | null;
}

export interface DiscountRule {
  _id: string;
  name: string;
  description?: string;
  ruleType: 'percentage' | 'fixed' | 'bulk_tier';
  value: number;
  maxDiscountCap?: number | null;
  minOrderAmount: number;
  minQuantity: number;
  targetScope: 'all' | 'category' | 'product' | 'customer_group';
  targetIds: string[];
  priority: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
}

export interface Campaign {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  bannerImageUrl?: string;
  bannerImagePublicId?: string;
  discountLabel?: string;
  discountPercent: number;
  productIds?: Array<{ _id: string; name: string; sku?: string; basePrice?: number } | string>;
  categoryIds?: Array<{ _id: string; name: string } | string>;
  status: 'draft' | 'scheduled' | 'active' | 'ended';
  startsAt?: string | null;
  endsAt?: string | null;
  clicks: number;
  conversions: number;
}

export interface Advertisement {
  _id: string;
  title: string;
  placement:
    | 'homepage_top'
    | 'homepage_mid'
    | 'sidebar'
    | 'category_top'
    | 'product_detail'
    | 'global_banner';
  desktopImageUrl: string;
  desktopImagePublicId?: string;
  mobileImageUrl?: string;
  mobileImagePublicId?: string;
  targetUrl: string;
  altText?: string;
  status: 'active' | 'paused' | 'scheduled';
  startsAt?: string | null;
  endsAt?: string | null;
  impressions: number;
  clicks: number;
}

export interface PromoPopup {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  imagePublicId?: string;
  ctaText: string;
  ctaUrl: string;
  couponCode?: string;
  displayFrequency: 'once_per_session' | 'once_per_day' | 'once_ever' | 'always';
  delaySeconds: number;
  targetPages: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  isEnabled: boolean;
}

export interface NavigationMenuItem {
  _id: string;
  label: string;
  url: string;
  parentId?: string | null;
  location: 'header' | 'footer';
  displayOrder: number;
  isVisible: boolean;
  openInNewTab: boolean;
}

export interface StaticPage {
  _id: string;
  title: string;
  slug: string;
  content: string;
  pageType: 'policy' | 'custom';
  seoTitle?: string;
  seoDescription?: string;
  isPublished: boolean;
  showInFooter: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FaqItem {
  _id: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  isPublished: boolean;
}

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  featuredImageUrl?: string;
  featuredImagePublicId?: string;
  authorName: string;
  seoTitle?: string;
  seoDescription?: string;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  productId: string;
  variantId: string | null;
  slug: string;
  sku: string;
  name: string;
  variantTitle: string | null;
  selectedOptions: Record<string, string>;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number | null;
  availableStock: number;
  lowStockThreshold?: number;
  allowBackorders?: boolean;
  maxOrderQuantity?: number;
  ratingAverage?: number;
  ratingCount?: number;
  categoryId?: string;
  codEligible?: boolean;
  staleWarning?: string;
}

export interface HomepageConfig {
  announcementItems: Array<{ icon: string; text: string }>;
  announcementPhone: string;
  heroSlides: Array<{
    badge: string;
    headlinePrefix: string;
    headlineHighlight: string;
    headlineSuffix: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    imageUrl: string;
    imagePublicId?: string;
    mobileImageUrl?: string;
    mobileImagePublicId?: string;
    displayOrder?: number;
    isActive: boolean;
  }>;
  trustPoints: Array<{ title: string; subtitle: string; icon: string }>;
  dualBanners: Array<{
    eyebrow: string;
    title: string;
    ctaText: string;
    ctaLink: string;
    imageUrl: string;
    theme: 'ice' | 'blush';
  }>;
  sections: Array<{
    id: string;
    label: string;
    enabled: boolean;
    order: number;
    title?: string;
    subtitle?: string;
    collectionType?:
      | 'hero'
      | 'categories'
      | 'dual_banners'
      | 'featured_products'
      | 'best_sellers'
      | 'new_arrivals'
      | 'top_rated'
      | 'on_sale'
      | 'promo_placement'
      | 'category_collection'
      | 'happy_clients'
      | 'newsletter';
    productLimit?: number;
    categorySlug?: string;
    ctaText?: string;
    ctaLink?: string;
  }>;
  status: 'draft' | 'published';
}

export interface PromotionalPlacement {
  _id: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  destinationUrl: string;
  altText: string;
  imageUrl: string;
  imagePublicId?: string;
  placementSlot:
    | 'homepage_mid_banner'
    | 'homepage_secondary_banner'
    | 'homepage_bottom_banner'
    | 'homepage_triple_banners'
    | 'homepage_sidebar'
    | 'top_strip'
    | 'wishlist_bottom_banner'
    | 'wishlist_sidebar'
    | 'product_sidebar';
  layoutStyle: 'dark_emerald_banner' | 'clean_card' | 'soft_sage_banner';
  displayOrder?: number;
  isEnabled: boolean;
  status: 'draft' | 'published';
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface WishlistSliderSettings {
  autoplay: boolean;
  transitionDurationMs: number;
}

export interface WishlistHeroSlide {
  _id: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaDestination?: string;
  desktopImageUrl: string;
  desktopImagePublicId?: string;
  mobileImageUrl?: string;
  mobileImagePublicId?: string;
  altText: string;
  displayOrder: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface CustomerDashboardSummary {
  summary: {
    ordersCount: number;
    deliveredOrdersCount: number;
    totalSpent: number;
    wishlistCount: number;
    addressesCount: number;
    reviewsCount: number;
    membershipTier: string;
  };
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
    totalAmount: number;
    items: Array<{ productName: string; quantity: number }>;
    createdAt: string;
  }>;
}

export interface CustomerCouponData {
  coupons: Array<{
    _id: string;
    code: string;
    description?: string;
    type: 'fixed' | 'percentage';
    value: number;
    maxDiscountCap?: number | null;
    minOrderAmount: number;
    expiresAt?: string | null;
    perCustomerLimit?: number | null;
    usageLimit?: number | null;
    usedCount: number;
  }>;
  redemptions: Array<{
    _id: string;
    code: string;
    discountAmount?: number;
    discountApplied?: number;
    createdAt: string;
    orderId?: { orderNumber?: string; totalAmount?: number } | null;
  }>;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  businessAddress: string;
  socialLinks: {
    whatsapp?: string;
    messenger?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  shipping: {
    dhakaMetroCharge: number;
    dhakaSuburbCharge: number;
    outsideDhakaCharge: number;
    freeShippingThreshold: number;
    expressSurcharge: number;
  };
  taxRate: number;
  taxSettings?: {
    enabled: boolean;
    taxInclusive: boolean;
    label: string;
    applyToShipping: boolean;
  };
  headerSettings?: {
    logoUrl?: string;
    logoPublicId?: string;
    showSearch: boolean;
    showWishlist: boolean;
    showCart: boolean;
    showAccount: boolean;
    stickyHeader: boolean;
    announcementBar: {
      enabled: boolean;
      text: string;
      backgroundColor: string;
      textColor: string;
      linkUrl: string;
      startsAt?: string | null;
      endsAt?: string | null;
    };
  };
  footerSettings?: {
    footerLogoUrl?: string;
    description: string;
    copyrightText: string;
    showPaymentLogos: boolean;
  };
  paymentMethods?: Array<{
    key: 'cod' | 'bkash' | 'nagad' | 'card' | 'sslcommerz';
    label: string;
    enabled: boolean;
    displayOrder: number;
    instructions: string;
    mode: 'sandbox' | 'live';
  }>;
  emailSettings?: {
    senderName: string;
    senderEmail: string;
    replyToEmail: string;
    orderConfirmationEnabled: boolean;
    shipmentUpdateEnabled: boolean;
    lowStockAlertEnabled: boolean;
  };
  notificationSettings?: {
    adminNewOrder: boolean;
    adminLowStock: boolean;
    adminReturnRequest: boolean;
    customerOrderUpdates: boolean;
    customerPromotions: boolean;
    lowStockAlertEmail: string;
  };
  securitySettings?: {
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    lockoutMinutes: number;
    minPasswordLength: number;
    requireStrongPassword: boolean;
    requireEmailVerification: boolean;
  };
  policies: {
    returnPolicy: string;
    shippingPolicy: string;
    privacyPolicy: string;
    termsAndConditions: string;
    aboutUs: string;
  };
  seoDefaults: {
    titleSuffix: string;
    defaultDescription: string;
    ogImageUrl?: string;
    robotsTxt?: string;
    sitemapEnabled?: boolean;
  };
  adsense: {
    enabled: boolean;
    publisherId?: string;
    adSlotId?: string;
  };
}

export interface OrderRecord {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerGender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  items: Array<{
    productId: string;
    variantId?: string | null;
    sku: string;
    productName: string;
    variantTitle?: string;
    selectedOptions?: Record<string, string>;
    imageUrl?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  shippingAddress: SavedAddress;
  deliveryMethod: 'standard' | 'express';
  paymentMethod: 'cod' | 'sslcommerz';
  paymentChannel?: 'cod' | 'card' | 'bkash' | 'nagad';
  transactionRef?: string;
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  policyVersion?: string;
  orderStatus: OrderLifecycleStatus;
  paymentStatus: PaymentState;
  fulfillmentStatus: FulfillmentState;
  subtotal: number;
  discountAmount: number;
  couponCode?: string | null;
  shippingCharge: number;
  taxAmount: number;
  totalAmount: number;
  trackingNumber?: string;
  courierName?: string;
  customerNote?: string;
  cancellationRequest?: {
    status: 'none' | 'requested' | 'approved' | 'rejected';
    reason?: string;
    requestedAt?: string | null;
    reviewedByName?: string;
    reviewedAt?: string | null;
    adminNote?: string;
  };
  staffNotes?: Array<{ note: string; actorName: string; createdAt: string }>;
  statusHistory: Array<{
    status: OrderLifecycleStatus;
    paymentStatus?: PaymentState;
    fulfillmentStatus?: FulfillmentState;
    note?: string;
    createdAt: string;
  }>;
  createdAt: string;
}

export interface AdminDashboardPayload {
  range: '7D' | '30D' | '3M' | '1Y';
  days: number;
  metrics: {
    grossSales: number;
    netSales: number;
    salesGrowthPercent: number | null;
    orderCount: number;
    ordersGrowthPercent: number | null;
    totalCustomers: number;
    newCustomersCurrent: number;
    customersGrowthPercent: number | null;
    totalProducts: number;
    activeProducts: number;
    avgOrderValue: number;
    pendingOrders: number;
    cancelledOrRefundedCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    inventoryValuation: number;
    pendingReviewsCount: number;
    openReturnsCount: number;
    cancellationRequestsCount: number;
    openSupportCount: number;
    unreadNotificationsCount: number;
  };
  salesOverview: {
    range: '7D' | '30D' | '3M' | '1Y';
    totalRevenue: number;
    previousRevenue: number;
    growthPercent: number | null;
    points: Array<{
      key: string;
      label: string;
      fullDate: string;
      revenue: number;
      orders: number;
    }>;
  };
  orderStatusBreakdown: {
    totalOrders: number;
    breakdown: Array<{
      key: 'delivered' | 'processing' | 'pending' | 'cancelled';
      label: string;
      count: number;
      percentage: number;
      color: string;
    }>;
  };
  topSellingProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    imageUrl: string;
    price: number;
    unitsSold: number;
    revenue: number;
    progressPercent: number;
  }>;
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    orderStatus: OrderLifecycleStatus;
    paymentStatus: PaymentState;
    createdAt: string;
  }>;
  latestCustomers: Array<{
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    emailVerified: boolean;
    isActive: boolean;
    createdAt: string;
  }>;
  specialOffer: {
    kind: 'campaign' | 'coupon';
    title: string;
    highlight: string;
    subtitle: string;
    code: string;
  } | null;
  recentAuditLogs: Array<{
    _id: string;
    actorEmail: string;
    actorRole: string;
    action: string;
    resourceType: string;
    createdAt: string;
  }>;
  securitySummary: {
    dbConnected: boolean;
    jwtConfigured: boolean;
    paymentSandbox: boolean;
  };
}

export interface SystemHealthPayload {
  status: 'healthy' | 'degraded';
  checkedAt: string;
  uptimeSeconds: number;
  nodeVersion: string;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  database: {
    connected: boolean;
    state: string;
  };
  integrations: {
    jwtConfigured: boolean;
    cloudinaryConfigured: boolean;
    resendConfigured: boolean;
    paymentConfigured: boolean;
    paymentSandbox: boolean;
    googleOAuthConfigured: boolean;
    facebookOAuthConfigured: boolean;
  };
}

export interface AdminAnalyticsPayload {
  range: '7D' | '30D' | '3M' | '1Y';
  days: number;
  revenue: {
    grossSales: number;
    netRevenue: number;
    discountsGiven: number;
    shippingCollected: number;
    taxCollected: number;
    refundedAmount: number;
    ordersCount: number;
    avgOrderValue: number;
  };
  salesSeries: AdminDashboardPayload['salesOverview'];
  orderStatusBreakdown: AdminDashboardPayload['orderStatusBreakdown'];
  topProducts: AdminDashboardPayload['topSellingProducts'];
  customers: {
    totalCustomers: number;
    newCustomersCount: number;
    repeatBuyersCount: number;
    topSpenders: Array<{
      _id: string;
      ordersCount: number;
      totalSpent: number;
      customerName: string;
      customerEmail: string;
    }>;
  };
  inventory: {
    totalProducts: number;
    totalUnits: number;
    inventoryValuation: number;
    costValuation: number;
    lowStockCount: number;
    lowStockItems: Array<{ name: string; sku: string; available: number; threshold: number }>;
  };
}

export interface CheckoutBannerConfig {
  enabled: boolean;
  badgeText: string;
  heading: string;
  subtitle: string;
  desktopImageUrl?: string;
  desktopImagePublicId?: string;
  mobileImageUrl?: string;
  mobileImagePublicId?: string;
  altText?: string;
}

export interface CartHeroBannerConfig {
  _id: string;
  badgeText: string;
  heading: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  desktopImageUrl?: string;
  desktopImagePublicId?: string;
  mobileImageUrl?: string;
  mobileImagePublicId?: string;
  altText: string;
  imagePosition: 'right' | 'background';
  displayOrder: number;
  isEnabled: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface AdminNotificationItem {
  _id: string;
  type: 'new_order' | 'payment_verified' | 'return_requested';
  title: string;
  message: string;
  orderNumber: string;
  orderId: string;
  isRead: boolean;
  createdAt: string;
}

export interface ReviewItem {
  _id: string;
  productId: string | { _id: string; name: string; slug: string; sku?: string } | null;
  userId?: string | { _id: string; avatarUrl?: string };
  userName: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  comment: string;
  images?: Array<{ publicId: string; url: string; alt?: string }>;
  verifiedPurchase: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
  helpfulVoterIds?: string[];
  reports?: Array<{ reason: string; createdAt: string }>;
  createdAt: string;
}

export interface ProductQuestionItem {
  _id: string;
  productId: string | { _id: string; name: string; slug: string; sku?: string } | null;
  userId?: string;
  askedByName: string;
  question: string;
  answer?: string;
  answeredByName?: string;
  answeredAt?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
