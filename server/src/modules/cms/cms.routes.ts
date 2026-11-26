import { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../../config/env.ts';
import { filterActiveCartBanners } from '../../../../shared/cartHelpers.ts';
import { isSafeDestinationUrl } from '../../../../shared/security.ts';
import {
  filterActiveWishlistSlides,
  hasValidScheduleWindow,
  validateImageUploadMeta,
} from '../../../../shared/wishlistHelpers.ts';
import { requireDatabase } from '../../database/connection.ts';
import {
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../middleware/auth.middleware.ts';
import { asyncHandler } from '../../middleware/error.middleware.ts';
import { recordAuditLog } from '../../services/audit.service.ts';
import {
  destroyCloudinaryAssetIfUnused,
  uploadBufferToCloudinary,
} from '../../services/cloudinary.service.ts';
import { sendTransactionalEmail } from '../../services/email.service.ts';
import {
  BlogPostModel,
  CartHeroBannerModel,
  FaqItemModel,
  HomepageConfigModel,
  NavigationMenuItemModel,
  PromotionalPlacementModel,
  StaticPageModel,
  StoreSettingsModel,
  WishlistHeroSlideModel,
} from './cms.model.ts';

const router = Router();
router.use(requireDatabase);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
});

export async function ensureDefaultCmsDocuments() {
  let homepage = await HomepageConfigModel.findOne({ key: 'primary' });
  if (!homepage) {
    homepage = await HomepageConfigModel.create({
      key: 'primary',
      announcementItems: [
        { icon: 'truck', text: 'Free Shipping on Orders Over ৳999' },
        { icon: 'rotate', text: '7 Days Easy Return' },
        { icon: 'shield', text: 'Secure Payment' },
      ],
      announcementPhone: '+880 1700 000000',
      heroSlides: [
        {
          badge: 'Big Savings, Big Happiness',
          headlinePrefix: 'Smart Shopping',
          headlineHighlight: 'Bigger',
          headlineSuffix: 'Savings!',
          subtitle: 'Up to 60% Off on Top Brands Across Bangladesh',
          ctaText: 'Shop Now',
          ctaLink: '/shop',
          imageUrl: '/src/assets/images/hero_shopper_bags_1795621229978.jpg',
          isActive: true,
        },
        {
          badge: 'Authentic Electronics & Gadgets',
          headlinePrefix: 'Upgrade Your',
          headlineHighlight: 'Tech',
          headlineSuffix: 'Setup Today',
          subtitle: 'Official Warranty & Cash on Delivery Nationwide',
          ctaText: 'Explore Electronics',
          ctaLink: '/category/electronics',
          imageUrl: '/src/assets/images/promo_tech_laptops_1795621230990.jpg',
          isActive: true,
        },
      ],
      trustPoints: [
        { title: 'Premium Quality', subtitle: 'Best Products', icon: 'gem' },
        { title: 'Secure Payment', subtitle: '100% Secure', icon: 'shield' },
        { title: 'Easy Return', subtitle: '7 Days Return', icon: 'rotate' },
        { title: '24/7 Support', subtitle: 'Always Here', icon: 'headphones' },
      ],
      dualBanners: [
        {
          eyebrow: 'Up to',
          title: '70% OFF on Electronics',
          ctaText: 'Shop Now',
          ctaLink: '/category/electronics',
          imageUrl: '/src/assets/images/promo_electronics_bundle_1795621230553.jpg',
          theme: 'ice',
        },
        {
          eyebrow: 'Flat',
          title: '50% OFF on Fashion Collection',
          ctaText: 'Shop Now',
          ctaLink: '/category/fashion',
          imageUrl: '/src/assets/images/promo_fashion_bundle_1795621230765.jpg',
          theme: 'blush',
        },
      ],
      sections: [
        { id: 'hero', label: 'Hero Campaign', enabled: true, order: 1, collectionType: 'hero' },
        { id: 'categories', label: 'Shop by Category', enabled: true, order: 2, title: 'Shop by Category', subtitle: 'Explore our wide range of categories', collectionType: 'categories' },
        { id: 'dual_banners', label: 'Dual Category Banners', enabled: true, order: 3, collectionType: 'dual_banners' },
        { id: 'featured_products', label: 'Featured Products', enabled: true, order: 4, title: 'Featured Products', subtitle: 'Handpicked favorites just for you', collectionType: 'featured_products', productLimit: 5, ctaText: 'View All', ctaLink: '/shop' },
        { id: 'promo_placement', label: 'Promotional Ad Placement', enabled: true, order: 5, collectionType: 'promo_placement' },
        { id: 'best_sellers', label: 'Best Sellers', enabled: true, order: 6, title: 'Best Sellers', subtitle: 'Most popular products based on verified orders', collectionType: 'best_sellers', productLimit: 5, ctaText: 'View All', ctaLink: '/shop?sort=best_selling' },
        { id: 'new_arrivals', label: 'New Arrivals', enabled: true, order: 7, title: 'New Arrivals', subtitle: 'Freshly added products across our store', collectionType: 'new_arrivals', productLimit: 5, ctaText: 'View All', ctaLink: '/shop?sort=newest' },
        { id: 'top_rated', label: 'Top Rated Products', enabled: true, order: 8, title: 'Top Rated Products', subtitle: 'Highest rated by verified shoppers', collectionType: 'top_rated', productLimit: 5, ctaText: 'View All', ctaLink: '/shop?sort=top_rated' },
        { id: 'on_sale', label: 'Special Offers & Flash Deals', enabled: true, order: 9, title: 'Special Offers & Deals', subtitle: 'Limited-time price drops across Bangladesh', collectionType: 'on_sale', productLimit: 5, ctaText: 'View Deals', ctaLink: '/deals' },
        { id: 'newsletter', label: 'Newsletter Subscription', enabled: true, order: 10, collectionType: 'newsletter' },
        { id: 'happy_clients', label: 'Authentic Customer Reviews', enabled: true, order: 11, title: 'Our Happy Clients', subtitle: 'Real feedback from verified NOVARA customers', collectionType: 'happy_clients' },
      ],
      status: 'published',
    });
  }

  let settings = await StoreSettingsModel.findOne({ key: 'primary' });
  if (!settings) {
    settings = await StoreSettingsModel.create({ key: 'primary' });
  }

  if (!homepage.wishlistDefaultsSeeded) {
    const wishlistSlidesCount = await WishlistHeroSlideModel.countDocuments();
    if (wishlistSlidesCount === 0) {
      await WishlistHeroSlideModel.insertMany([
        {
          title: 'My Wishlist',
          subtitle: 'Your favorite products, all in one place.',
          ctaText: 'Explore Deals',
          ctaDestination: '/shop?onSale=true',
          desktopImageUrl: '/src/assets/images/hero_shopper_bags_1795621229978.jpg',
          mobileImageUrl: '/src/assets/images/hero_shopper_bags_1795621229978.jpg',
          altText: 'My Wishlist curated favorites banner',
          displayOrder: 0,
          isActive: true,
        },
        {
          title: 'Curated Savings Across Bangladesh',
          subtitle: 'Track flash discounts on electronics, fashion, and everyday essentials.',
          ctaText: 'Shop Flash Deals',
          ctaDestination: '/shop?tab=on_sale',
          desktopImageUrl: '/src/assets/images/promo_fashion_bundle_1795621230765.jpg',
          mobileImageUrl: '/src/assets/images/promo_fashion_bundle_1795621230765.jpg',
          altText: 'Seasonal wishlist savings banner',
          displayOrder: 1,
          isActive: true,
        },
      ]);
    }

    const wishlistBottomPromoExists = await PromotionalPlacementModel.exists({
      placementSlot: 'wishlist_bottom_banner',
    });
    if (!wishlistBottomPromoExists) {
      await PromotionalPlacementModel.create({
        title: "Don't Miss Out!",
        subtitle: 'Explore more amazing products and exclusive deals.',
        ctaText: 'Continue Shopping',
        destinationUrl: '/shop',
        altText: 'Explore more amazing products and exclusive deals on NOVARA COMMERCE',
        imageUrl: '/src/assets/images/promo_electronics_bundle_1795621230553.jpg',
        placementSlot: 'wishlist_bottom_banner',
        layoutStyle: 'soft_sage_banner',
        isEnabled: true,
        status: 'published',
      });
    }

    homepage.wishlistDefaultsSeeded = true;
    await homepage.save();
  }

  if (!homepage.cartDefaultsSeeded) {
    const cartBannerCount = await CartHeroBannerModel.countDocuments();
    if (cartBannerCount === 0) {
      await CartHeroBannerModel.create({
        badgeText: 'Your Shopping Cart',
        heading: 'Your Cart',
        subtitle: 'Review your items and proceed to checkout',
        ctaText: 'Continue Shopping',
        ctaLink: '/shop',
        desktopImageUrl: '',
        mobileImageUrl: '',
        altText: 'Your Shopping Cart Banner',
        imagePosition: 'right',
        displayOrder: 0,
        isEnabled: true,
      });
    }
    homepage.cartDefaultsSeeded = true;
    await homepage.save();
  }

  return { homepage, settings };
}

// Public: Homepage Configuration + Active Valid Promotional Placements + Public Store Settings
router.get(
  '/public/homepage',
  asyncHandler(async (_req, res) => {
    const { homepage, settings } = await ensureDefaultCmsDocuments();
    const now = new Date();

    const activePromos = await PromotionalPlacementModel.find({
      isEnabled: true,
      status: 'published',
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .sort({ displayOrder: 1, updatedAt: -1 })
      .lean();

    res.json({
      homepage: homepage.status === 'published' ? homepage : null,
      activePromotions: activePromos,
      storeSettings: {
        storeName: settings.storeName,
        tagline: settings.tagline,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        businessAddress: settings.businessAddress,
        socialLinks: settings.socialLinks,
        shipping: settings.shipping,
        taxRate: settings.taxRate ?? 0,
        taxSettings: settings.taxSettings,
        headerSettings: settings.headerSettings,
        footerSettings: settings.footerSettings,
        paymentMethods: settings.paymentMethods,
        policies: settings.policies,
        seoDefaults: settings.seoDefaults,
        adsense: settings.adsense,
      },
    });
  })
);

router.get(
  '/public/settings',
  asyncHandler(async (_req, res) => {
    const { settings } = await ensureDefaultCmsDocuments();
    res.json({
      settings: {
        storeName: settings.storeName,
        tagline: settings.tagline,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        businessAddress: settings.businessAddress,
        socialLinks: settings.socialLinks,
        shipping: settings.shipping,
        taxRate: settings.taxRate ?? 0,
        taxSettings: settings.taxSettings,
        headerSettings: settings.headerSettings,
        footerSettings: settings.footerSettings,
        paymentMethods: settings.paymentMethods,
        policies: settings.policies,
        seoDefaults: settings.seoDefaults,
        adsense: settings.adsense,
      },
    });
  })
);

// Public: Navigation Menu Items
router.get(
  '/public/navigation',
  asyncHandler(async (req, res) => {
    const location = req.query.location === 'footer' ? 'footer' : req.query.location === 'header' ? 'header' : null;
    const filter: Record<string, unknown> = { isVisible: true };
    if (location) filter.location = location;
    const items = await NavigationMenuItemModel.find(filter)
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();
    res.json({ items });
  })
);

// Public: Static Pages
router.get(
  '/public/pages',
  asyncHandler(async (_req, res) => {
    const pages = await StaticPageModel.find({ isPublished: true })
      .select('title slug pageType showInFooter updatedAt')
      .sort({ title: 1 })
      .lean();
    res.json({ pages });
  })
);

router.get(
  '/public/pages/:slug',
  asyncHandler(async (req, res) => {
    const page = await StaticPageModel.findOne({
      slug: req.params.slug.toLowerCase(),
      isPublished: true,
    }).lean();
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json({ page });
  })
);

// Public: FAQs
router.get(
  '/public/faqs',
  asyncHandler(async (_req, res) => {
    const faqs = await FaqItemModel.find({ isPublished: true })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();
    res.json({ faqs });
  })
);

// Public: Blog Posts
router.get(
  '/public/blog',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const posts = await BlogPostModel.find({
      $or: [
        { status: 'published' },
        { status: 'scheduled', publishedAt: { $lte: now } },
      ],
    })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();
    res.json({ posts });
  })
);

router.get(
  '/public/blog/:slug',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const post = await BlogPostModel.findOne({
      slug: req.params.slug.toLowerCase(),
      $or: [
        { status: 'published' },
        { status: 'scheduled', publishedAt: { $lte: now } },
      ],
    }).lean();
    if (!post) {
      res.status(404).json({ error: 'Blog article not found' });
      return;
    }
    res.json({ post });
  })
);

router.get(
  '/public/wishlist-page',
  asyncHandler(async (_req, res) => {
    const { homepage } = await ensureDefaultCmsDocuments();
    const now = new Date();

    const [allSlides, wishlistPromos] = await Promise.all([
      WishlistHeroSlideModel.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 }).lean(),
      PromotionalPlacementModel.find({
        placementSlot: { $in: ['wishlist_bottom_banner', 'wishlist_sidebar'] },
        isEnabled: true,
        status: 'published',
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      })
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    const slides = filterActiveWishlistSlides(allSlides, now);
    const bottomPromo =
      wishlistPromos.find((p) => p.placementSlot === 'wishlist_bottom_banner') || null;
    const sidebarPromo =
      wishlistPromos.find((p) => p.placementSlot === 'wishlist_sidebar') || null;

    res.json({
      slides,
      sliderSettings: homepage.wishlistSliderSettings || {
        autoplay: true,
        transitionDurationMs: 5000,
      },
      bottomPromo,
      sidebarPromo,
    });
  })
);

router.get(
  '/public/checkout-banner',
  asyncHandler(async (_req, res) => {
    const { homepage, settings } = await ensureDefaultCmsDocuments();
    const banner = homepage.checkoutBanner || {
      enabled: true,
      badgeText: 'Secure Checkout',
      heading: 'Checkout',
      subtitle: 'Complete your order quickly and securely',
      desktopImageUrl: '',
      mobileImageUrl: '',
      altText: 'Secure Checkout Banner',
    };
    res.json({
      banner,
      taxRate: settings.taxRate ?? 0,
      taxSettings: settings.taxSettings,
      shipping: settings.shipping,
    });
  })
);

router.get(
  '/public/cart-banner',
  asyncHandler(async (_req, res) => {
    const { homepage, settings } = await ensureDefaultCmsDocuments();
    const now = new Date();
    const candidates = await CartHeroBannerModel.find({ isEnabled: true })
      .sort({ displayOrder: 1, updatedAt: -1 })
      .lean();
    const active = filterActiveCartBanners(candidates, now);

    res.json({
      banner: active[0] || null,
      trustPoints: homepage.trustPoints || [],
      shipping: settings.shipping,
      taxRate: settings.taxRate ?? 0,
      taxSettings: settings.taxSettings,
    });
  })
);

// ADMIN: Cloudinary Image Upload
router.get(
  '/admin/cloudinary/status',
  requireAuth,
  requirePermission('catalog:write'),
  (_req, res) => {
    res.json({
      configured: env.cloudinary.isConfigured,
      cloudName: env.cloudinary.cloudName || null,
    });
  }
);

router.post(
  '/admin/upload',
  requireAuth,
  requirePermission('catalog:write'),
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided.' });
      return;
    }

    const metaCheck = validateImageUploadMeta({
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      maxBytes: 6 * 1024 * 1024,
    });
    if (!metaCheck.valid) {
      res.status(400).json({ error: metaCheck.error });
      return;
    }

    const folder = z
      .enum(['products', 'categories', 'brands', 'cms', 'promotions', 'wishlist', 'cart', 'avatars'])
      .catch('products')
      .parse(req.body?.folder);
    const alt = typeof req.body?.alt === 'string' ? req.body.alt.trim().slice(0, 160) : '';

    const asset = await uploadBufferToCloudinary(req.file.buffer, folder, alt);

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CLOUDINARY_UPLOAD',
      resourceType: 'MediaAsset',
      resourceId: asset.publicId,
      details: { folder, url: asset.url },
      ipAddress: req.ip,
    });

    res.status(201).json({ asset });
  })
);

// ADMIN: Homepage CMS Config
router.get(
  '/admin/homepage',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (_req, res) => {
    const { homepage } = await ensureDefaultCmsDocuments();
    res.json({ homepage });
  })
);

router.put(
  '/admin/homepage',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      announcementItems: z.array(z.object({ icon: z.string(), text: z.string().min(1) })).optional(),
      announcementPhone: z.string().max(40).optional(),
      heroSlides: z
        .array(
          z.object({
            badge: z.string().default(''),
            headlinePrefix: z.string().min(1),
            headlineHighlight: z.string().default(''),
            headlineSuffix: z.string().default(''),
            subtitle: z.string().default(''),
            ctaText: z.string().min(1),
            ctaLink: z.string().trim().min(1).refine((v) => isSafeDestinationUrl(v), 'Unsafe or invalid CTA URL'),
            imageUrl: z.string().trim().min(1).refine((v) => isSafeDestinationUrl(v, { allowRelative: true }), 'Invalid desktop image URL'),
            imagePublicId: z.string().optional(),
            mobileImageUrl: z
              .string()
              .trim()
              .refine((v) => v === '' || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }), 'Invalid mobile image URL')
              .optional()
              .default(''),
            mobileImagePublicId: z.string().optional(),
            displayOrder: z.number().int().min(0).optional().default(0),
            isActive: z.boolean().default(true),
          })
        )
        .optional(),
      trustPoints: z
        .array(z.object({ title: z.string(), subtitle: z.string(), icon: z.string() }))
        .optional(),
      dualBanners: z
        .array(
          z.object({
            eyebrow: z.string().default(''),
            title: z.string().min(1),
            ctaText: z.string().min(1),
            ctaLink: z.string().trim().min(1).refine((v) => isSafeDestinationUrl(v), 'Unsafe or invalid banner URL'),
            imageUrl: z.string().trim().min(1).refine((v) => isSafeDestinationUrl(v, { allowRelative: true }), 'Invalid banner image URL'),
            imagePublicId: z.string().optional(),
            theme: z.enum(['ice', 'blush']).default('ice'),
          })
        )
        .optional(),
      sections: z
        .array(
          z.object({
            id: z.string().min(1),
            label: z.string().min(1),
            enabled: z.boolean(),
            order: z.number().int(),
            title: z.string().trim().max(120).optional(),
            subtitle: z.string().trim().max(220).optional(),
            collectionType: z
              .enum([
                'hero',
                'categories',
                'dual_banners',
                'featured_products',
                'best_sellers',
                'new_arrivals',
                'top_rated',
                'on_sale',
                'promo_placement',
                'category_collection',
                'happy_clients',
                'newsletter',
              ])
              .optional(),
            productLimit: z.number().int().min(1).max(20).optional(),
            categorySlug: z.string().trim().max(100).optional(),
            ctaText: z.string().trim().max(50).optional(),
            ctaLink: z
              .string()
              .trim()
              .max(240)
              .refine((v) => !v || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }), 'Unsafe or invalid CTA URL')
              .optional(),
          })
        )
        .optional(),
      status: z.enum(['draft', 'published']).optional(),
    });

    const parsed = schema.parse(req.body);
    const { homepage } = await ensureDefaultCmsDocuments();

    Object.assign(homepage, parsed, { updatedBy: req.user!._id });
    await homepage.save();

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_HOMEPAGE_CMS',
      resourceType: 'HomepageConfig',
      resourceId: String(homepage._id),
      details: { status: homepage.status },
      ipAddress: req.ip,
    });

    res.json({ homepage });
  })
);

// ADMIN: Promotional Ad Placements
router.get(
  '/admin/promotions',
  requireAuth,
  requirePermission('ads:write'),
  asyncHandler(async (_req, res) => {
    const promotions = await PromotionalPlacementModel.find().sort({ displayOrder: 1, updatedAt: -1 });
    res.json({ promotions });
  })
);

const promoSchema = z.object({
  title: z.string().trim().min(2).max(140),
  subtitle: z.string().trim().max(220).optional(),
  ctaText: z.string().trim().max(40).optional(),
  destinationUrl: z.string().trim().min(1).refine((v) => isSafeDestinationUrl(v), 'Unsafe or invalid URL'),
  altText: z.string().trim().min(2).max(180),
  imageUrl: z.string().trim().min(1).refine((v) => isSafeDestinationUrl(v, { allowRelative: true }), 'Invalid banner image URL'),
  imagePublicId: z.string().optional(),
  placementSlot: z
    .enum([
      'homepage_mid_banner',
      'homepage_secondary_banner',
      'homepage_bottom_banner',
      'homepage_triple_banners',
      'homepage_sidebar',
      'top_strip',
      'wishlist_bottom_banner',
      'wishlist_sidebar',
      'product_sidebar',
    ])
    .default('homepage_mid_banner'),
  layoutStyle: z
    .enum(['dark_emerald_banner', 'clean_card', 'soft_sage_banner'])
    .default('dark_emerald_banner'),
  displayOrder: z.number().int().min(0).default(0),
  isEnabled: z.boolean().default(false),
  status: z.enum(['draft', 'published']).default('draft'),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

router.post(
  '/admin/promotions',
  requireAuth,
  requirePermission('ads:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = promoSchema.parse(req.body);
    if (!hasValidScheduleWindow(parsed.startsAt, parsed.endsAt)) {
      res.status(400).json({ error: 'Promotion end date must be after start date.' });
      return;
    }
    const promotion = await PromotionalPlacementModel.create({
      ...parsed,
      startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
      endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      updatedBy: req.user!._id,
    });

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_PROMO_PLACEMENT',
      resourceType: 'PromotionalPlacement',
      resourceId: String(promotion._id),
      details: { title: promotion.title, isEnabled: promotion.isEnabled, status: promotion.status },
      ipAddress: req.ip,
    });

    res.status(201).json({ promotion });
  })
);

router.patch(
  '/admin/promotions/:id',
  requireAuth,
  requirePermission('ads:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid promotion ID.' });
      return;
    }
    const parsed = promoSchema.partial().parse(req.body);
    const existing = await PromotionalPlacementModel.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Promotional placement not found' });
      return;
    }

    const nextStartsAt =
      parsed.startsAt !== undefined
        ? parsed.startsAt
          ? new Date(parsed.startsAt)
          : null
        : existing.startsAt;
    const nextEndsAt =
      parsed.endsAt !== undefined
        ? parsed.endsAt
          ? new Date(parsed.endsAt)
          : null
        : existing.endsAt;
    if (!hasValidScheduleWindow(nextStartsAt, nextEndsAt)) {
      res.status(400).json({ error: 'Promotion end date must be after start date.' });
      return;
    }

    const oldPublicId = existing.imagePublicId;
    Object.assign(existing, {
      ...parsed,
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
      updatedBy: req.user!._id,
    });
    await existing.save();

    if (oldPublicId && parsed.imagePublicId && parsed.imagePublicId !== oldPublicId) {
      void destroyCloudinaryAssetIfUnused(oldPublicId);
    }

    res.json({ promotion: existing });
  })
);

router.delete(
  '/admin/promotions/:id',
  requireAuth,
  requirePermission('ads:write'),
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid promotion ID.' });
      return;
    }
    const deleted = await PromotionalPlacementModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Promotional placement not found' });
      return;
    }
    if (deleted.imagePublicId) {
      void destroyCloudinaryAssetIfUnused(deleted.imagePublicId);
    }
    res.json({ ok: true });
  })
);

// ADMIN: Wishlist Hero Slideshow Management
const wishlistSlideSchema = z.object({
  title: z.string().trim().min(2).max(140),
  subtitle: z.string().trim().max(240).default(''),
  ctaText: z.string().trim().max(50).optional().default(''),
  ctaDestination: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v === '' || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }),
      'Unsafe or invalid CTA URL'
    )
    .optional()
    .default(''),
  desktopImageUrl: z
    .string()
    .trim()
    .min(1)
    .refine((v) => isSafeDestinationUrl(v, { allowRelative: true }), 'Invalid desktop image URL'),
  desktopImagePublicId: z.string().trim().optional(),
  mobileImageUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }),
      'Invalid mobile image URL'
    )
    .optional()
    .default(''),
  mobileImagePublicId: z.string().trim().optional(),
  altText: z.string().trim().min(2).max(180).default('Wishlist hero slide'),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

router.get(
  '/admin/wishlist-slides',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (_req, res) => {
    const { homepage } = await ensureDefaultCmsDocuments();
    const slides = await WishlistHeroSlideModel.find()
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();
    res.json({
      slides,
      sliderSettings: homepage.wishlistSliderSettings || {
        autoplay: true,
        transitionDurationMs: 5000,
      },
    });
  })
);

router.post(
  '/admin/wishlist-slides',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = wishlistSlideSchema.parse(req.body);
    if (!hasValidScheduleWindow(parsed.startsAt, parsed.endsAt)) {
      res.status(400).json({ error: 'Schedule end date must be after start date.' });
      return;
    }
    const slide = await WishlistHeroSlideModel.create({
      ...parsed,
      startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
      endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      updatedBy: req.user!._id,
    });

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_WISHLIST_SLIDE',
      resourceType: 'WishlistHeroSlide',
      resourceId: String(slide._id),
      details: { title: slide.title, isActive: slide.isActive },
      ipAddress: req.ip,
    });

    res.status(201).json({ slide });
  })
);

router.put(
  '/admin/wishlist-slides/settings',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = z
      .object({
        autoplay: z.boolean(),
        transitionDurationMs: z.number().int().min(1500).max(20000),
      })
      .parse(req.body);

    const { homepage } = await ensureDefaultCmsDocuments();
    homepage.wishlistSliderSettings = parsed;
    homepage.updatedBy = req.user!._id;
    await homepage.save();

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_WISHLIST_SLIDER_SETTINGS',
      resourceType: 'HomepageConfig',
      resourceId: String(homepage._id),
      details: parsed,
      ipAddress: req.ip,
    });

    res.json({ sliderSettings: homepage.wishlistSliderSettings });
  })
);

router.put(
  '/admin/wishlist-slides/reorder',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = z
      .object({
        orderedIds: z
          .array(
            z
              .string()
              .trim()
              .refine((id) => mongoose.Types.ObjectId.isValid(id), 'Invalid slide ID')
          )
          .min(1)
          .max(100),
      })
      .parse(req.body);

    const uniqueIds = Array.from(new Set(parsed.orderedIds));
    await Promise.all(
      uniqueIds.map((id, idx) =>
        WishlistHeroSlideModel.findByIdAndUpdate(id, {
          displayOrder: idx,
          updatedBy: req.user!._id,
        })
      )
    );

    const slides = await WishlistHeroSlideModel.find()
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    res.json({ slides });
  })
);

router.patch(
  '/admin/wishlist-slides/:id',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid slide ID.' });
      return;
    }
    const parsed = wishlistSlideSchema.partial().parse(req.body);
    const existing = await WishlistHeroSlideModel.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Wishlist hero slide not found' });
      return;
    }

    const nextStartsAt =
      parsed.startsAt !== undefined
        ? parsed.startsAt
          ? new Date(parsed.startsAt)
          : null
        : existing.startsAt;
    const nextEndsAt =
      parsed.endsAt !== undefined
        ? parsed.endsAt
          ? new Date(parsed.endsAt)
          : null
        : existing.endsAt;
    if (!hasValidScheduleWindow(nextStartsAt, nextEndsAt)) {
      res.status(400).json({ error: 'Schedule end date must be after start date.' });
      return;
    }

    const oldDesktopPublicId = existing.desktopImagePublicId;
    const oldMobilePublicId = existing.mobileImagePublicId;

    Object.assign(existing, {
      ...parsed,
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
      updatedBy: req.user!._id,
    });
    await existing.save();

    if (
      oldDesktopPublicId &&
      parsed.desktopImagePublicId !== undefined &&
      parsed.desktopImagePublicId !== oldDesktopPublicId
    ) {
      void destroyCloudinaryAssetIfUnused(oldDesktopPublicId);
    }
    if (
      oldMobilePublicId &&
      parsed.mobileImagePublicId !== undefined &&
      parsed.mobileImagePublicId !== oldMobilePublicId
    ) {
      void destroyCloudinaryAssetIfUnused(oldMobilePublicId);
    }

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_WISHLIST_SLIDE',
      resourceType: 'WishlistHeroSlide',
      resourceId: String(existing._id),
      details: { title: existing.title, isActive: existing.isActive },
      ipAddress: req.ip,
    });

    res.json({ slide: existing });
  })
);

router.delete(
  '/admin/wishlist-slides/:id',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid slide ID.' });
      return;
    }
    const deleted = await WishlistHeroSlideModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Wishlist hero slide not found' });
      return;
    }
    if (deleted.desktopImagePublicId) {
      void destroyCloudinaryAssetIfUnused(deleted.desktopImagePublicId);
    }
    if (deleted.mobileImagePublicId) {
      void destroyCloudinaryAssetIfUnused(deleted.mobileImagePublicId);
    }

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'DELETE_WISHLIST_SLIDE',
      resourceType: 'WishlistHeroSlide',
      resourceId: String(deleted._id),
      details: { title: deleted.title },
      ipAddress: req.ip,
    });

    res.json({ ok: true });
  })
);

// ADMIN: Checkout Hero Banner Management
const checkoutBannerSchema = z.object({
  enabled: z.boolean().default(true),
  badgeText: z.string().trim().max(50).default('Secure Checkout'),
  heading: z.string().trim().min(1).max(100).default('Checkout'),
  subtitle: z.string().trim().max(220).default('Complete your order quickly and securely'),
  desktopImageUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }),
      'Invalid desktop image URL'
    )
    .optional()
    .default(''),
  desktopImagePublicId: z.string().trim().max(200).optional().default(''),
  mobileImageUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }),
      'Invalid mobile image URL'
    )
    .optional()
    .default(''),
  mobileImagePublicId: z.string().trim().max(200).optional().default(''),
  altText: z.string().trim().max(180).optional().default('Secure Checkout Banner'),
});

router.get(
  '/admin/checkout-banner',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (_req, res) => {
    const { homepage } = await ensureDefaultCmsDocuments();
    res.json({
      banner: homepage.checkoutBanner || {
        enabled: true,
        badgeText: 'Secure Checkout',
        heading: 'Checkout',
        subtitle: 'Complete your order quickly and securely',
        desktopImageUrl: '',
        desktopImagePublicId: '',
        mobileImageUrl: '',
        mobileImagePublicId: '',
        altText: 'Secure Checkout Banner',
      },
    });
  })
);

router.put(
  '/admin/checkout-banner',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = checkoutBannerSchema.parse(req.body);
    const { homepage } = await ensureDefaultCmsDocuments();
    const oldDesktopPublicId = homepage.checkoutBanner?.desktopImagePublicId;
    const oldMobilePublicId = homepage.checkoutBanner?.mobileImagePublicId;

    homepage.checkoutBanner = parsed;
    homepage.updatedBy = req.user!._id;
    await homepage.save();

    if (
      oldDesktopPublicId &&
      parsed.desktopImagePublicId !== oldDesktopPublicId
    ) {
      void destroyCloudinaryAssetIfUnused(oldDesktopPublicId);
    }
    if (
      oldMobilePublicId &&
      parsed.mobileImagePublicId !== oldMobilePublicId
    ) {
      void destroyCloudinaryAssetIfUnused(oldMobilePublicId);
    }

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_CHECKOUT_BANNER',
      resourceType: 'HomepageConfig',
      resourceId: String(homepage._id),
      details: { enabled: parsed.enabled, heading: parsed.heading },
      ipAddress: req.ip,
    });

    res.json({ banner: homepage.checkoutBanner });
  })
);

// ADMIN: Cart Hero Banner Management
const cartBannerSchema = z.object({
  badgeText: z.string().trim().max(60).optional().default('Your Shopping Cart'),
  heading: z.string().trim().min(1).max(120).default('Your Cart'),
  subtitle: z
    .string()
    .trim()
    .max(240)
    .optional()
    .default('Review your items and proceed to checkout'),
  ctaText: z.string().trim().max(50).optional().default('Continue Shopping'),
  ctaLink: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v === '' || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }),
      'Unsafe or invalid CTA destination URL'
    )
    .optional()
    .default('/shop'),
  desktopImageUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }),
      'Invalid desktop image URL'
    )
    .optional()
    .default(''),
  desktopImagePublicId: z.string().trim().max(200).optional().default(''),
  mobileImageUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }),
      'Invalid mobile image URL'
    )
    .optional()
    .default(''),
  mobileImagePublicId: z.string().trim().max(200).optional().default(''),
  altText: z.string().trim().max(180).optional().default('Your Shopping Cart Banner'),
  imagePosition: z.enum(['right', 'background']).optional().default('right'),
  displayOrder: z.number().int().min(0).optional().default(0),
  isEnabled: z.boolean().optional().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

router.get(
  '/admin/cart-banners',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (_req, res) => {
    await ensureDefaultCmsDocuments();
    const banners = await CartHeroBannerModel.find()
      .sort({ displayOrder: 1, updatedAt: -1 })
      .lean();
    res.json({ banners });
  })
);

router.post(
  '/admin/cart-banners',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = cartBannerSchema.parse(req.body);
    if (!hasValidScheduleWindow(parsed.startsAt, parsed.endsAt)) {
      res.status(400).json({ error: 'Schedule end date must be after start date.' });
      return;
    }

    const banner = await CartHeroBannerModel.create({
      ...parsed,
      startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
      endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      updatedBy: req.user!._id,
    });

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_CART_BANNER',
      resourceType: 'CartHeroBanner',
      resourceId: String(banner._id),
      details: { heading: banner.heading, isEnabled: banner.isEnabled, displayOrder: banner.displayOrder },
      ipAddress: req.ip,
    });

    res.status(201).json({ banner });
  })
);

router.patch(
  '/admin/cart-banners/:id',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid banner ID.' });
      return;
    }
    const parsed = cartBannerSchema.partial().parse(req.body);
    const existing = await CartHeroBannerModel.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Cart hero banner not found' });
      return;
    }

    const nextStartsAt =
      parsed.startsAt !== undefined
        ? parsed.startsAt
          ? new Date(parsed.startsAt)
          : null
        : existing.startsAt;
    const nextEndsAt =
      parsed.endsAt !== undefined
        ? parsed.endsAt
          ? new Date(parsed.endsAt)
          : null
        : existing.endsAt;

    if (!hasValidScheduleWindow(nextStartsAt, nextEndsAt)) {
      res.status(400).json({ error: 'Schedule end date must be after start date.' });
      return;
    }

    const oldDesktopPublicId = existing.desktopImagePublicId;
    const oldMobilePublicId = existing.mobileImagePublicId;

    Object.assign(existing, {
      ...parsed,
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
      updatedBy: req.user!._id,
    });
    await existing.save();

    if (
      oldDesktopPublicId &&
      parsed.desktopImagePublicId !== undefined &&
      parsed.desktopImagePublicId !== oldDesktopPublicId
    ) {
      void destroyCloudinaryAssetIfUnused(oldDesktopPublicId);
    }
    if (
      oldMobilePublicId &&
      parsed.mobileImagePublicId !== undefined &&
      parsed.mobileImagePublicId !== oldMobilePublicId
    ) {
      void destroyCloudinaryAssetIfUnused(oldMobilePublicId);
    }

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_CART_BANNER',
      resourceType: 'CartHeroBanner',
      resourceId: String(existing._id),
      details: { heading: existing.heading, isEnabled: existing.isEnabled, displayOrder: existing.displayOrder },
      ipAddress: req.ip,
    });

    res.json({ banner: existing });
  })
);

router.delete(
  '/admin/cart-banners/:id',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid banner ID.' });
      return;
    }
    const deleted = await CartHeroBannerModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Cart hero banner not found' });
      return;
    }

    if (deleted.desktopImagePublicId) {
      void destroyCloudinaryAssetIfUnused(deleted.desktopImagePublicId);
    }
    if (deleted.mobileImagePublicId) {
      void destroyCloudinaryAssetIfUnused(deleted.mobileImagePublicId);
    }

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'DELETE_CART_BANNER',
      resourceType: 'CartHeroBanner',
      resourceId: String(deleted._id),
      details: { heading: deleted.heading },
      ipAddress: req.ip,
    });

    res.json({ ok: true });
  })
);

// ADMIN: Store Settings
router.get(
  '/admin/settings',
  requireAuth,
  requirePermission('settings:write'),
  asyncHandler(async (_req, res) => {
    const { settings } = await ensureDefaultCmsDocuments();
    res.json({ settings });
  })
);

router.put(
  '/admin/settings',
  requireAuth,
  requirePermission('settings:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      storeName: z.string().trim().min(2).max(100).optional(),
      tagline: z.string().trim().max(140).optional(),
      supportEmail: z.string().trim().email().or(z.literal('')).optional(),
      supportPhone: z.string().trim().max(30).optional(),
      businessAddress: z.string().trim().max(240).optional(),
        socialLinks: z
          .object({
            whatsapp: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
            messenger: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
            facebook: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
            instagram: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
            linkedin: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
            youtube: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
            tiktok: z.string().trim().refine((v) => isSafeDestinationUrl(v, { allowRelative: false, allowEmpty: true }), 'Invalid social URL').optional(),
          })
          .optional(),
        shipping: z
          .object({
            dhakaMetroCharge: z.number().min(0),
            dhakaSuburbCharge: z.number().min(0),
            outsideDhakaCharge: z.number().min(0),
            freeShippingThreshold: z.number().min(0),
            expressSurcharge: z.number().min(0),
          })
          .optional(),
        taxRate: z.number().min(0).max(30).optional(),
        taxSettings: z
          .object({
            enabled: z.boolean(),
            taxInclusive: z.boolean(),
            label: z.string().trim().min(1).max(30),
            applyToShipping: z.boolean(),
          })
          .optional(),
        headerSettings: z
          .object({
            logoUrl: z.string().trim().refine((v) => !v || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }), 'Invalid logo URL').optional(),
            logoPublicId: z.string().trim().optional(),
            showSearch: z.boolean(),
            showWishlist: z.boolean(),
            showCart: z.boolean(),
            showAccount: z.boolean(),
            stickyHeader: z.boolean(),
            announcementBar: z.object({
              enabled: z.boolean(),
              text: z.string().trim().max(240),
              backgroundColor: z.string().trim().max(30),
              textColor: z.string().trim().max(30),
              linkUrl: z.string().trim().refine((v) => !v || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }), 'Invalid link URL'),
              startsAt: z.string().datetime().nullable().optional(),
              endsAt: z.string().datetime().nullable().optional(),
            }),
          })
          .optional(),
        footerSettings: z
          .object({
            footerLogoUrl: z.string().trim().refine((v) => !v || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }), 'Invalid logo URL').optional(),
            description: z.string().trim().max(600),
            copyrightText: z.string().trim().max(200),
            showPaymentLogos: z.boolean(),
          })
          .optional(),
        paymentMethods: z
          .array(
            z.object({
              key: z.enum(['cod', 'bkash', 'nagad', 'card', 'sslcommerz']),
              label: z.string().trim().min(1).max(60),
              enabled: z.boolean(),
              displayOrder: z.number().int().min(0),
              instructions: z.string().trim().max(300).default(''),
              mode: z.enum(['sandbox', 'live']).default('sandbox'),
            })
          )
          .optional(),
        emailSettings: z
          .object({
            senderName: z.string().trim().min(1).max(80),
            senderEmail: z.string().trim().email(),
            replyToEmail: z.string().trim().email().or(z.literal('')),
            orderConfirmationEnabled: z.boolean(),
            shipmentUpdateEnabled: z.boolean(),
            lowStockAlertEnabled: z.boolean(),
          })
          .optional(),
        notificationSettings: z
          .object({
            adminNewOrder: z.boolean(),
            adminLowStock: z.boolean(),
            adminReturnRequest: z.boolean(),
            customerOrderUpdates: z.boolean(),
            customerPromotions: z.boolean(),
            lowStockAlertEmail: z.string().trim().email().or(z.literal('')),
          })
          .optional(),
        securitySettings: z
          .object({
            sessionTimeoutMinutes: z.number().int().min(15).max(43200),
            maxLoginAttempts: z.number().int().min(3).max(30),
            lockoutMinutes: z.number().int().min(1).max(240),
            minPasswordLength: z.number().int().min(6).max(32),
            requireStrongPassword: z.boolean(),
            requireEmailVerification: z.boolean(),
          })
          .optional(),
        policies: z
          .object({
            returnPolicy: z.string(),
            shippingPolicy: z.string(),
            privacyPolicy: z.string(),
            termsAndConditions: z.string(),
            aboutUs: z.string(),
          })
          .optional(),
        seoDefaults: z
          .object({
            titleSuffix: z.string(),
            defaultDescription: z.string(),
            ogImageUrl: z.string().trim().refine((v) => !v || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }), 'Invalid OG image URL').optional(),
            robotsTxt: z.string().trim().max(2000).optional(),
            sitemapEnabled: z.boolean().optional(),
          })
          .optional(),
        adsense: z
          .object({
            enabled: z.boolean(),
            publisherId: z.string().optional(),
            adSlotId: z.string().optional(),
          })
          .optional(),
      });

    const parsed = schema.parse(req.body);
    const { settings } = await ensureDefaultCmsDocuments();
    const prevHeaderLogoPublicId = settings.headerSettings?.logoPublicId;
    if (parsed.headerSettings?.announcementBar) {
      const ab = parsed.headerSettings.announcementBar;
      Object.assign(parsed.headerSettings, {
        announcementBar: {
          ...ab,
          startsAt: ab.startsAt ? new Date(ab.startsAt) : null,
          endsAt: ab.endsAt ? new Date(ab.endsAt) : null,
        },
      });
    }
    Object.assign(settings, parsed);
    await settings.save();
    if (
      prevHeaderLogoPublicId &&
      prevHeaderLogoPublicId !== settings.headerSettings?.logoPublicId
    ) {
      void destroyCloudinaryAssetIfUnused(prevHeaderLogoPublicId);
    }

    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'UPDATE_STORE_SETTINGS',
      resourceType: 'StoreSettings',
      resourceId: String(settings._id),
      ipAddress: req.ip,
    });

    res.json({ settings });
  })
);

router.post(
  '/admin/settings/test-email',
  requireAuth,
  requirePermission('settings:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const email = z.string().trim().email().parse(req.body?.email || req.user!.email);
    const result = await sendTransactionalEmail({
      userId: String(req.user!._id),
      email,
      type: 'marketing',
      subject: 'NOVARA COMMERCE — SMTP / Resend Configuration Test',
      html: '<p>Your transactional email integration is reachable from NOVARA COMMERCE Admin.</p>',
    });
    res.json({
      ok: result.status === 'sent',
      status: result.status,
      configured: env.resend.isConfigured,
      message:
        result.status === 'sent'
          ? `Test email dispatched to ${email}.`
          : 'RESEND_API_KEY is not configured in .env; logged as skipped_unconfigured.',
    });
  })
);

// ADMIN: Navigation Menu Items CRUD
const navItemSchema = z.object({
  label: z.string().trim().min(1).max(60),
  url: z.string().trim().min(1).max(300).refine((v) => isSafeDestinationUrl(v, { allowRelative: true }), 'Invalid URL'),
  parentId: z.string().nullable().optional(),
  location: z.enum(['header', 'footer']).default('header'),
  displayOrder: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
  openInNewTab: z.boolean().default(false),
});

router.get(
  '/admin/navigation',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (_req, res) => {
    const items = await NavigationMenuItemModel.find().sort({ location: 1, displayOrder: 1, createdAt: 1 }).lean();
    res.json({ items });
  })
);

router.post(
  '/admin/navigation',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = navItemSchema.parse(req.body);
    const item = await NavigationMenuItemModel.create({
      ...parsed,
      parentId: parsed.parentId || null,
    });
    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_NAV_ITEM',
      resourceType: 'NavigationMenuItem',
      resourceId: String(item._id),
      details: { label: item.label, location: item.location },
      ipAddress: req.ip,
    });
    res.status(201).json({ item });
  })
);

router.patch(
  '/admin/navigation/:id',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid menu item ID.' });
      return;
    }
    const parsed = navItemSchema.partial().parse(req.body);
    const updated = await NavigationMenuItemModel.findByIdAndUpdate(
      req.params.id,
      { ...parsed, ...(parsed.parentId === '' ? { parentId: null } : {}) },
      { new: true, runValidators: true }
    );
    if (!updated) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }
    res.json({ item: updated });
  })
);

router.delete(
  '/admin/navigation/:id',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid menu item ID.' });
      return;
    }
    await NavigationMenuItemModel.updateMany({ parentId: req.params.id }, { $set: { parentId: null } });
    const deleted = await NavigationMenuItemModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }
    res.json({ ok: true });
  })
);

// ADMIN: Static Pages CRUD
const staticPageSchema = z.object({
  title: z.string().trim().min(2).max(140),
  slug: z.string().trim().min(2).max(150).toLowerCase(),
  content: z.string().trim().min(10).max(30000),
  pageType: z.enum(['policy', 'custom']).default('custom'),
  seoTitle: z.string().trim().max(140).optional(),
  seoDescription: z.string().trim().max(260).optional(),
  isPublished: z.boolean().default(true),
  showInFooter: z.boolean().default(true),
});

router.get(
  '/admin/pages',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (_req, res) => {
    const pages = await StaticPageModel.find().sort({ updatedAt: -1 }).lean();
    res.json({ pages });
  })
);

router.post(
  '/admin/pages',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = staticPageSchema.parse(req.body);
    const page = await StaticPageModel.create(parsed);
    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_STATIC_PAGE',
      resourceType: 'StaticPage',
      resourceId: String(page._id),
      details: { slug: page.slug },
      ipAddress: req.ip,
    });
    res.status(201).json({ page });
  })
);

router.patch(
  '/admin/pages/:id',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid page ID.' });
      return;
    }
    const parsed = staticPageSchema.partial().parse(req.body);
    const page = await StaticPageModel.findByIdAndUpdate(req.params.id, parsed, {
      new: true,
      runValidators: true,
    });
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json({ page });
  })
);

router.delete(
  '/admin/pages/:id',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid page ID.' });
      return;
    }
    const deleted = await StaticPageModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json({ ok: true });
  })
);

// ADMIN: FAQs CRUD
const faqSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(4000),
  category: z.string().trim().min(1).max(60).default('General'),
  displayOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
});

router.get(
  '/admin/faqs',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (_req, res) => {
    const faqs = await FaqItemModel.find().sort({ displayOrder: 1, createdAt: 1 }).lean();
    res.json({ faqs });
  })
);

router.post(
  '/admin/faqs',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req, res) => {
    const parsed = faqSchema.parse(req.body);
    const faq = await FaqItemModel.create(parsed);
    res.status(201).json({ faq });
  })
);

router.patch(
  '/admin/faqs/:id',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid FAQ ID.' });
      return;
    }
    const parsed = faqSchema.partial().parse(req.body);
    const faq = await FaqItemModel.findByIdAndUpdate(req.params.id, parsed, {
      new: true,
      runValidators: true,
    });
    if (!faq) {
      res.status(404).json({ error: 'FAQ not found' });
      return;
    }
    res.json({ faq });
  })
);

router.delete(
  '/admin/faqs/:id',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid FAQ ID.' });
      return;
    }
    const deleted = await FaqItemModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'FAQ not found' });
      return;
    }
    res.json({ ok: true });
  })
);

// ADMIN: Blog Posts CRUD
const blogPostSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(2).max(180).toLowerCase(),
  excerpt: z.string().trim().max(400).optional().default(''),
  content: z.string().trim().min(10).max(40000),
  category: z.string().trim().min(1).max(60).default('Guides'),
  featuredImageUrl: z
    .string()
    .trim()
    .refine((v) => !v || isSafeDestinationUrl(v, { allowRelative: true, allowEmpty: true }), 'Invalid image URL')
    .optional()
    .default(''),
  featuredImagePublicId: z.string().trim().optional().default(''),
  authorName: z.string().trim().min(2).max(80).default('NOVARA Editorial'),
  seoTitle: z.string().trim().max(140).optional(),
  seoDescription: z.string().trim().max(260).optional(),
  status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
  publishedAt: z.string().datetime().nullable().optional(),
});

router.get(
  '/admin/blog',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (_req, res) => {
    const posts = await BlogPostModel.find().sort({ createdAt: -1 }).lean();
    res.json({ posts });
  })
);

router.post(
  '/admin/blog',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = blogPostSchema.parse(req.body);
    const post = await BlogPostModel.create({
      ...parsed,
      publishedAt:
        parsed.publishedAt
          ? new Date(parsed.publishedAt)
          : parsed.status === 'published'
          ? new Date()
          : null,
    });
    await recordAuditLog({
      actorId: req.user!._id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'CREATE_BLOG_POST',
      resourceType: 'BlogPost',
      resourceId: String(post._id),
      details: { slug: post.slug, status: post.status },
      ipAddress: req.ip,
    });
    res.status(201).json({ post });
  })
);

router.patch(
  '/admin/blog/:id',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid blog post ID.' });
      return;
    }
    const parsed = blogPostSchema.partial().parse(req.body);
    const existing = await BlogPostModel.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Blog post not found' });
      return;
    }
    const prevImageId = existing.featuredImagePublicId;
    Object.assign(existing, {
      ...parsed,
      publishedAt:
        parsed.publishedAt !== undefined
          ? parsed.publishedAt
            ? new Date(parsed.publishedAt)
            : null
          : parsed.status === 'published' && !existing.publishedAt
          ? new Date()
          : existing.publishedAt,
    });
    await existing.save();
    if (prevImageId && prevImageId !== existing.featuredImagePublicId) {
      void destroyCloudinaryAssetIfUnused(prevImageId);
    }
    res.json({ post: existing });
  })
);

router.delete(
  '/admin/blog/:id',
  requireAuth,
  requirePermission('cms:write'),
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid blog post ID.' });
      return;
    }
    const deleted = await BlogPostModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Blog post not found' });
      return;
    }
    if (deleted.featuredImagePublicId) {
      void destroyCloudinaryAssetIfUnused(deleted.featuredImagePublicId);
    }
    res.json({ ok: true });
  })
);

export default router;
