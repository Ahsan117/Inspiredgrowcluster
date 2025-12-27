import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../model/home/product_model.dart';
import '../../providers/cart_provider.dart';
import '../../providers/notification_provider.dart';
import '../../services/home/api_service.dart';
import '../../services/stock_service.dart';
import '../../widget/product_add_button.dart';
import '../cart_screen.dart';

class ProductDetailScreen extends StatefulWidget {
  final Product product;
  final String? categoryId;
  final String? subcategoryId;

  const ProductDetailScreen({
    super.key,
    required this.product,
    this.categoryId,
    this.subcategoryId,
  });

  @override
  _ProductDetailScreenState createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen>
    with SingleTickerProviderStateMixin {
  late PageController _pageController;
  int _currentStock = 0;
  bool _isLoadingStock = true;
  bool _hasStockError = false;
  int _currentImageIndex = 0;
  bool _isProcessing = false;
  int _optimisticQuantity = 0;
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  List<Product> _relatedProducts = [];
  bool _loadingRelatedProducts = false;
  bool _isNotificationRequested = false;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final cartProvider = Provider.of<CartProvider>(context, listen: false);
        _optimisticQuantity = cartProvider.getItemQuantity(widget.product.id);
        _loadRelatedProducts();
        _loadStock();
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadStock() async {
    try {
      setState(() {
        _isLoadingStock = true;
        _hasStockError = false;
      });

      final stockResponse = await StockService.getItemStock(widget.product.id);

      if (mounted) {
        setState(() {
          _currentStock = stockResponse?.currentStock ?? 0;
          _isLoadingStock = false;
          _hasStockError = stockResponse == null;
        });
      }
    } catch (e) {
      print('❌ Error loading stock for ${widget.product.itemName}: $e');
      if (mounted) {
        setState(() {
          _currentStock = 0;
          _isLoadingStock = false;
          _hasStockError = true;
        });
      }
    }
  }

  Future<void> _loadRelatedProducts() async {
    setState(() {
      _loadingRelatedProducts = true;
    });

    try {
      List<Product> products = [];

      if (widget.categoryId != null) {
        products = await ApiService.getProductsForCategory(
          widget.categoryId!,
          limit: 20,
        );
      } else {
        try {
          final categories = await ApiService.getCategories();
          for (final category in categories.take(3)) {
            try {
              final categoryProducts = await ApiService.getProductsForCategory(
                category.id,
                limit: 7,
              );
              products.addAll(categoryProducts);
              if (products.length >= 15) break;
            } catch (e) {
              debugPrint(
                'Error loading products from category ${category.id}: $e',
              );
            }
          }
        } catch (e) {
          debugPrint('Error loading categories for related products: $e');
        }
      }

      setState(() {
        _relatedProducts =
            products.where((p) => p.id != widget.product.id).take(10).toList();
        _loadingRelatedProducts = false;
      });
    } catch (e) {
      print('Error loading related products: $e');
      setState(() {
        _loadingRelatedProducts = false;
      });
    }
  }

  bool get _isFromSearch => widget.categoryId == null;

  void _showSnackBar(
    String message, {
    Color? backgroundColor,
    SnackBarAction? action,
  }) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: backgroundColor,
          action: action,
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          margin: const EdgeInsets.only(bottom: 10, right: 10, left: 10),
        ),
      );
    }
  }

  Future<void> _updateCartQuantity(int newQuantity) async {
    if (_isProcessing) return;

    if (newQuantity > _currentStock) {
      _showSnackBar(
        '📦 Item reached stock limit!',
        backgroundColor: Colors.orange,
      );
      return;
    }

    final cartProvider = Provider.of<CartProvider>(context, listen: false);
    // Capture the quantity BEFORE the update
    final currentQuantity = cartProvider.getItemQuantity(widget.product.id);

    setState(() {
      _optimisticQuantity = newQuantity;
      _isProcessing = true;
    });

    _animationController.forward().then((_) {
      _animationController.reverse();
    });

    Map<String, dynamic>? result;
    try {
      if (newQuantity > 0) {
        if (currentQuantity == 0) {
          result = await cartProvider.addItemToCart(
            itemId: widget.product.id,
            quantity: newQuantity,
          );
        } else {
          result = await cartProvider.updateItemQuantity(
            itemId: widget.product.id,
            newQuantity: newQuantity,
          );
        }
      } else {
        result = await cartProvider.removeItemFromCart(
          itemId: widget.product.id,
        );
      }

      if (mounted && result != null) {
        if (result['error'] == null) {
          final actualQuantity = cartProvider.getItemQuantity(widget.product.id);

          // ✅ FIX START: Logic to ONLY show message on first add

          if (currentQuantity == 0 && actualQuantity > 0) {
            // 1. This is a NEW item (0 -> 1). Show the success message.
            Future.delayed(const Duration(milliseconds: 100), () {
              if (mounted) {
                ScaffoldMessenger.of(context).hideCurrentSnackBar();
                _showSnackBar(
                  'Item added to cart successfully!',
                  backgroundColor: Colors.green,
                  action: SnackBarAction(
                    label: 'VIEW CART',
                    textColor: Colors.white,
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const CartScreen(),
                      ),
                    ),
                  ),
                );
              }
            });
          } else if (actualQuantity == 0) {
            // 2. Item Removed (Optional: keep if you want feedback on removal)
            Future.delayed(const Duration(milliseconds: 100), () {
              if (mounted) {
                ScaffoldMessenger.of(context).hideCurrentSnackBar();
                _showSnackBar('Item removed from cart', backgroundColor: Colors.black87);
              }
            });
          }

          // 3. UPDATES (1 -> 2, 2 -> 1):
          // We do absolutely NOTHING here, so no SnackBar appears.

          // ✅ FIX END

        } else {
          setState(() {
            _optimisticQuantity = cartProvider.getItemQuantity(widget.product.id);
          });
          String errorMessage = result['error'] ?? 'Failed to update item';

          Future.delayed(const Duration(milliseconds: 100), () {
            if (mounted) {
              _showSnackBar(errorMessage, backgroundColor: Colors.red);
            }
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _optimisticQuantity = cartProvider.getItemQuantity(widget.product.id);
        });

        Future.delayed(const Duration(milliseconds: 100), () {
          if (mounted) {
            _showSnackBar('Network error', backgroundColor: Colors.red);
          }
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  void _handleAddToCart() {
    _updateCartQuantity(_optimisticQuantity + 1);
  }

  void _incrementQuantity() {
    _updateCartQuantity(_optimisticQuantity + 1);
  }

  void _decrementQuantity() {
    if (_optimisticQuantity > 0) {
      _updateCartQuantity(_optimisticQuantity - 1);
    }
  }

  double _safeToDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  int _safeToInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  bool get _hasValidPricing {
    final salesPrice = _safeToDouble(widget.product.salesPrice);
    final mrp = _safeToDouble(widget.product.mrp);
    return salesPrice > 0 || mrp > 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Consumer<CartProvider>(
        builder: (context, cartProvider, child) {
          final actualQuantity = cartProvider.getItemQuantity(
            widget.product.id,
          );
          if (!_isProcessing && _optimisticQuantity != actualQuantity) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                setState(() {
                  _optimisticQuantity = actualQuantity;
                });
              }
            });
          }

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 400,
                pinned: true,
                backgroundColor: Colors.white,
                foregroundColor: Colors.black,
                elevation: 0,
                title:
                    _isFromSearch
                        ? const Text(
                          'Product Details',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        )
                        : null,
                leading: IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(
                      _isFromSearch ? Icons.search : Icons.arrow_back_ios,
                      size: 18,
                      color: Colors.black,
                    ),
                  ),
                  onPressed: () => Navigator.pop(context),
                ),
                actions: [
                  IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 10,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Stack(
                        children: [
                          const Icon(
                            Icons.shopping_cart,
                            size: 18,
                            color: Colors.black,
                          ),
                          if (cartProvider.totalItemsInCart > 0)
                            Positioned(
                              right: -2,
                              top: -2,
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: const BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle,
                                ),
                                constraints: const BoxConstraints(
                                  minWidth: 12,
                                  minHeight: 12,
                                ),
                                child: Text(
                                  '${cartProvider.totalItemsInCart}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 8,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    onPressed:
                        () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const CartScreen(),
                          ),
                        ),
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: _buildImageCarousel(),
                ),
              ),
              SliverToBoxAdapter(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 20),
                      _buildProductInfo(),
                      const SizedBox(height: 20),
                      _buildPriceSection(),
                      const SizedBox(height: 20),
                      _buildProductFeatures(),
                      const SizedBox(height: 20),
                      _buildRelatedProducts(),
                      const SizedBox(height: 120),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildImageCarousel() {
    final images =
        widget.product.itemImages.isNotEmpty
            ? widget.product.itemImages
            : ['placeholder'];

    return Container(
      color: Colors.grey[50],
      child: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentImageIndex = index;
              });
            },
            itemCount: images.length,
            itemBuilder: (context, index) {
              return Container(
                margin: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child:
                      images[index] == 'placeholder'
                          ? Container(
                            color: Colors.white,
                            child: Center(
                              // UPDATED: Using app logo instead of shopping basket icon
                              child: Opacity(
                                opacity: 0.3,
                                child: Image.asset(
                                  'assets/images/app_logo.png',
                                  width: 80,
                                  height: 80,
                                  fit: BoxFit.contain,
                                  errorBuilder: (context, error, stackTrace) {
                                    return const Icon(
                                      Icons.shopping_basket,
                                      size: 80,
                                      color: Colors.grey,
                                    );
                                  },
                                ),
                              ),
                            ),
                          )
                          : Image.network(
                            ApiService.getImageUrl(images[index], 'item'),
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                color: Colors.white,
                                child: Center(
                                  // UPDATED: Using app logo for error state
                                  child: Opacity(
                                    opacity: 0.3,
                                    child: Image.asset(
                                      'assets/images/app_logo.png',
                                      width: 80,
                                      height: 80,
                                      fit: BoxFit.contain,
                                      errorBuilder: (
                                        context,
                                        error,
                                        stackTrace,
                                      ) {
                                        return const Icon(
                                          Icons.image_not_supported,
                                          size: 80,
                                          color: Colors.grey,
                                        );
                                      },
                                    ),
                                  ),
                                ),
                              );
                            },
                            loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return Container(
                                color: Colors.white,
                                child: Center(
                                  child: CircularProgressIndicator(
                                    value:
                                        loadingProgress.expectedTotalBytes !=
                                                null
                                            ? loadingProgress
                                                    .cumulativeBytesLoaded /
                                                loadingProgress
                                                    .expectedTotalBytes!
                                            : null,
                                    color: Colors.green,
                                  ),
                                ),
                              );
                            },
                          ),
                ),
              );
            },
          ),
          if (images.length > 1)
            Positioned(
              bottom: 30,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children:
                    images.asMap().entries.map((entry) {
                      return Container(
                        width: _currentImageIndex == entry.key ? 20 : 8,
                        height: 8,
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(4),
                          color:
                              _currentImageIndex == entry.key
                                  ? Colors.green
                                  : Colors.white.withOpacity(0.5),
                        ),
                      );
                    }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildProductInfo() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (widget.product.brand.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.green[50],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    widget.product.brand.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            widget.product.itemName,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.star, size: 14, color: Colors.amber),
                    SizedBox(width: 4),
                    Text(
                      '4.2',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.orange[50],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.access_time, size: 14, color: Colors.orange),
                    SizedBox(width: 4),
                    Text(
                      '12 mins',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.orange,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPriceSection() {
    final salesPrice = _safeToDouble(widget.product.salesPrice);
    final mrp = _safeToDouble(widget.product.mrp);

    if (!_hasValidPricing) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.orange[50],
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.orange[200]!),
        ),
        child: Row(
          children: const [
            Icon(Icons.info_outline, color: Colors.orange, size: 20),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Price information will be available at checkout',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.orange,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Price Details',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                '₹${_safeToInt(salesPrice)}',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
              ),
              const SizedBox(width: 12),
              if (mrp > salesPrice) ...[
                Text(
                  '₹${_safeToInt(mrp)}',
                  style: const TextStyle(
                    fontSize: 18,
                    color: Colors.grey,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '${_safeToInt(((mrp - salesPrice) / mrp) * 100)}% OFF',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
          if (mrp > salesPrice) ...[
            const SizedBox(height: 8),
            Text(
              'You save ₹${_safeToInt(mrp - salesPrice)}',
              style: const TextStyle(
                fontSize: 14,
                color: Colors.green,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildProductFeatures() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Product Features',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          _buildFeatureItem(
            Icons.verified,
            'Quality Assured',
            'Premium quality products',
          ),
          _buildFeatureItem(
            Icons.local_shipping,
            'Fast Delivery',
            'Get it delivered in 12 minutes',
          ),
          _buildFeatureItem(
            Icons.refresh,
            'Easy Returns',
            '7-day return policy',
          ),
          _buildFeatureItem(
            Icons.support_agent,
            '24/7 Support',
            'Customer support available',
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureItem(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green[50],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Colors.green, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRelatedProducts() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Text(
            _isFromSearch ? 'You might also like' : 'Related Products',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
        ),
        const SizedBox(height: 16),
        if (_loadingRelatedProducts)
          const SizedBox(
            height: 200,
            child: Center(
              child: CircularProgressIndicator(color: Colors.green),
            ),
          )
        else if (_relatedProducts.isEmpty)
          Container(
            height: 150,
            margin: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.inventory_2_outlined,
                    size: 48,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _isFromSearch
                        ? 'No similar products found'
                        : 'No related products found',
                    style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
          )
        else
          SizedBox(
            height: 280,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _relatedProducts.length,
              itemBuilder: (context, index) {
                return _buildRelatedProductCard(_relatedProducts[index]);
              },
            ),
          ),
      ],
    );
  }

  Widget _buildRelatedProductCard(Product product) {
    return GestureDetector(
      onTap: () {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder:
                (context) => ProductDetailScreen(
                  product: product,
                  categoryId: widget.categoryId,
                  subcategoryId: widget.subcategoryId,
                ),
          ),
        );
      },
      child: Container(
        width: 160,
        margin: const EdgeInsets.only(right: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[200]!),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.1),
              spreadRadius: 1,
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 120,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(12),
                ),
                color: Colors.grey[50],
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(12),
                ),
                child:
                    product.itemImages.isNotEmpty
                        ? Image.network(
                          ApiService.getImageUrl(
                            product.itemImages.first,
                            'item',
                          ),
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) {
                            return Center(
                              // UPDATED: Using app logo for error state in related products
                              child: Opacity(
                                opacity: 0.3,
                                child: Image.asset(
                                  'assets/images/app_logo.png',
                                  width: 32,
                                  height: 32,
                                  fit: BoxFit.contain,
                                  errorBuilder: (context, error, stackTrace) {
                                    return Icon(
                                      Icons.image_not_supported,
                                      size: 32,
                                      color: Colors.grey[400],
                                    );
                                  },
                                ),
                              ),
                            );
                          },
                        )
                        : Center(
                          // UPDATED: Using app logo for no image state in related products
                          child: Opacity(
                            opacity: 0.3,
                            child: Image.asset(
                              'assets/images/app_logo.png',
                              width: 32,
                              height: 32,
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) {
                                return Icon(
                                  Icons.shopping_basket,
                                  size: 32,
                                  color: Colors.grey[400],
                                );
                              },
                            ),
                          ),
                        ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (product.brand.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.green[50],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          product.brand,
                          style: const TextStyle(
                            fontSize: 9,
                            color: Colors.green,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    const SizedBox(height: 4),
                    Text(
                      product.itemName,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Text(
                          '₹${_safeToInt(product.salesPrice)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: Colors.black,
                          ),
                        ),
                        if (_safeToDouble(product.mrp) >
                            _safeToDouble(product.salesPrice)) ...[
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              '₹${_safeToInt(product.mrp)}',
                              style: const TextStyle(
                                fontSize: 10,
                                color: Colors.grey,
                                decoration: TextDecoration.lineThrough,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 8),
                    ProductAddButton(product: product),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    return Consumer<CartProvider>(
      builder: (context, cartProvider, child) {
        final displayQuantity = _optimisticQuantity;

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 20,
                offset: const Offset(0, -5),
              ),
            ],
          ),
          child: SafeArea(
            child:
                _hasValidPricing
                    ? (displayQuantity > 0
                        ? _buildQuantityAndCartSection(
                          displayQuantity,
                          cartProvider,
                        )
                        : _buildAddToCartSection())
                    : _buildContactForPriceSection(),
          ),
        );
      },
    );
  }

  Widget _buildQuantityAndCartSection(
    int displayQuantity,
    CartProvider cartProvider,
  ) {
    return Row(
      children: [
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.green, width: 2),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              InkWell(
                onTap: _isProcessing ? null : _decrementQuantity,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(10),
                  bottomLeft: Radius.circular(10),
                ),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  child: Icon(
                    Icons.remove,
                    color: _isProcessing ? Colors.grey : Colors.green,
                    size: 18,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: const BoxDecoration(
                  border: Border(
                    left: BorderSide(color: Colors.green, width: 1),
                    right: BorderSide(color: Colors.green, width: 1),
                  ),
                ),
                child: Text(
                  '$displayQuantity',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.green,
                  ),
                ),
              ),
              InkWell(
                onTap:
                    _isProcessing
                        ? null
                        : () {
                          if (displayQuantity < _currentStock) {
                            _incrementQuantity();
                          } else {
                            _showSnackBar(
                              '📦 Item reached stock limit!',
                              backgroundColor: Colors.orange,
                            );
                          }
                        },
                borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(10),
                  bottomRight: Radius.circular(10),
                ),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  child: Icon(
                    Icons.add,
                    color:
                        _isProcessing
                            ? Colors.grey
                            : displayQuantity < _currentStock
                            ? Colors.green
                            : Colors.grey,
                    size: 18,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: SizedBox(
            height: 56,
            child: ElevatedButton(
              onPressed:
                  () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const CartScreen()),
                  ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Flexible(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${cartProvider.totalItemsInCart} items in cart',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.8),
                            fontSize: 11,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '₹${_safeToInt(_safeToDouble(widget.product.salesPrice) * displayQuantity)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Text(
                        'View Cart',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward, color: Colors.white, size: 14),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAddToCartSection() {
    final salesPrice = _safeToDouble(widget.product.salesPrice);

    if (_currentStock == 0 && !_isLoadingStock) {
      return Consumer<NotificationProvider>(
        builder: (context, notificationProvider, child) {
          final isAlreadyRequested = notificationProvider
              .isNotificationRequested(widget.product.id);

          return SizedBox(
            width: double.infinity,
            height: 56,
            child:
                isAlreadyRequested
                    ? ElevatedButton.icon(
                      onPressed: null,
                      icon: const Icon(Icons.check_circle),
                      label: const Text(
                        'We Will Notify You',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        disabledBackgroundColor: Colors.blue.shade100,
                        disabledForegroundColor: Colors.blue.shade700,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    )
                    : ElevatedButton.icon(
                      onPressed: () {
                        Provider.of<NotificationProvider>(
                          context,
                          listen: false,
                        ).requestNotification(widget.product.id);

                        _showSnackBar(
                          '🔔 You will be notified when this is back in stock.',
                          backgroundColor: Colors.blue,
                        );
                      },
                      icon: const Icon(Icons.notifications_active_outlined),
                      label: const Text(
                        'Notify When Available',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
          );
        },
      );
    }

    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isProcessing || _isLoadingStock ? null : _handleAddToCart,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.green,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 3,
        ),
        child:
            _isProcessing || _isLoadingStock
                ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 2,
                  ),
                )
                : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.add_shopping_cart, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Add to Cart • ₹${_safeToInt(salesPrice)}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
      ),
    );
  }

  Widget _buildContactForPriceSection() {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: () {
          _showSnackBar(
            'Please contact customer support for pricing information',
            backgroundColor: Colors.blue,
          );
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 3,
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.phone, size: 20),
            SizedBox(width: 8),
            Text(
              'Contact for Price',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
