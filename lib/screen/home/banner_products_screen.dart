import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

// ✅ 1. ADDED IMPORTS for Provider, CartProvider, and the CartScreen
import '../../providers/cart_provider.dart';
import '../cart_screen.dart';

import '../../model/home/banner_model.dart' as banner_model;
import '../../model/home/product_model.dart';
import '../../services/home/api_service.dart';
import '../../widget/product_add_button.dart';
import '../home/product_detail_screen.dart';

class BannerProductsScreen extends StatelessWidget {
  final banner_model.Banner banner;
  final List<Product> products;
  final banner_model.BannerMedia? mediaItem;

  const BannerProductsScreen({
    super.key,
    required this.banner,
    required this.products,
    this.mediaItem,
  });

  @override
  Widget build(BuildContext context) {
    String bannerImageUrl = '';
    if (mediaItem != null) {
      bannerImageUrl = mediaItem!.getFullUrl();
    } else if (banner.imageUrls.isNotEmpty) {
      bannerImageUrl = banner.imageUrls.first;
    }

    const backgroundColor = Color(0xFFf8f9fa);
    const textColor = Color(0xFF343a40);
    const accentRed = Color(0xFFe63946);

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: backgroundColor,
        elevation: 0.5,
        shadowColor: Colors.grey.withOpacity(0.2),
        systemOverlayStyle: const SystemUiOverlayStyle(
          statusBarIconBrightness: Brightness.dark,
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: textColor),
          onPressed: () => Navigator.of(context).pop(),
        ),
        // ✅ 2. REPLACED the static cart icon with a dynamic one
        actions: [
          Consumer<CartProvider>(
            builder: (context, cartProvider, child) {
              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.shopping_cart, color: textColor),
                      onPressed: () {
                        // Added navigation to the cart screen
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (context) => const CartScreen()),
                        );
                      },
                    ),
                    if (cartProvider.totalItemsInCart > 0)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            color: accentRed,
                            shape: BoxShape.circle,
                            border:
                            Border.all(color: backgroundColor, width: 1.5),
                          ),
                          constraints: const BoxConstraints(
                            minWidth: 16,
                            minHeight: 16,
                          ),
                          child: Text(
                            // Display the actual item count from the provider
                            '${cartProvider.totalItemsInCart}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      )
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              if (bannerImageUrl.isNotEmpty)
                AspectRatio(
                  aspectRatio: 2.2 / 1,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16.0),
                    child: CachedNetworkImage(
                      imageUrl: bannerImageUrl,
                      width: double.infinity,
                      fit: BoxFit.fill,
                      placeholder: (context, url) =>
                          Container(color: Colors.grey[200]),
                      errorWidget: (context, url, error) =>
                      const Icon(Icons.image, size: 48, color: Colors.grey),
                    ),
                  ),
                ),
              const SizedBox(height: 24),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: products.length,
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 200.0,
                  mainAxisSpacing: 16.0,
                  crossAxisSpacing: 16.0,
                  childAspectRatio: 0.65,
                ),
                itemBuilder: (context, index) {
                  return _ProductCard(
                    product: products[index],
                    banner: banner,
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;
  final banner_model.Banner banner;

  const _ProductCard({required this.product, required this.banner});

  void _navigateToProductDetail(BuildContext context) {
    String? categoryId;
    String? subcategoryId;

    // Try to get category ID from banner media
    if (banner.media != null && banner.media!.isNotEmpty) {
      final firstMedia = banner.media!.first;
      categoryId = firstMedia.category?.id;
    }

    // Fallback IDs (these won't be visible to users)
    categoryId ??= '687cbb1a5f081ded01079b1c';
    subcategoryId ??= '68b82c78ed01f968c63ac335';

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductDetailScreen(
          product: product,
          categoryId: categoryId,
          subcategoryId: subcategoryId,
        ),
      ),
    );
  }
  @override
  Widget build(BuildContext context) {
    const cardLight = Colors.white;
    const textLight = Color(0xFF212529);
    const accentRed = Color(0xFFd00000);

    final hasDiscount = product.mrp > product.salesPrice;
    final discountPercent = hasDiscount
        ? (((product.mrp - product.salesPrice) / product.mrp) * 100).round()
        : 0;

    return GestureDetector(
      onTap: () => _navigateToProductDetail(context),
      child: Container(
        decoration: BoxDecoration(
          color: cardLight,
          borderRadius: BorderRadius.circular(16.0),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              spreadRadius: 1,
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              flex: 5,
              child: Stack(
                children: [
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: CachedNetworkImage(
                        imageUrl: ApiService.getImageUrl(
                            product.itemImages.isNotEmpty
                                ? product.itemImages.first
                                : '',
                            'item'),
                        fit: BoxFit.contain,
                        placeholder: (context, url) => const Center(
                            child:
                            CircularProgressIndicator(strokeWidth: 2.0)),
                        errorWidget: (context, url, error) => const Icon(
                            Icons.image_not_supported_outlined,
                            color: Colors.grey),
                      ),
                    ),
                  ),
                  if (hasDiscount)
                    Positioned(
                      top: 12,
                      left: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: accentRed,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '$discountPercent% OFF',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              flex: 4,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.max,
                  children: [
                    Text(
                      product.itemName,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: textLight,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Text(
                          '₹${product.salesPrice.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: textLight,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Align(
                            alignment: Alignment.centerRight,
                            child: ProductAddButton(
                              product: product,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}