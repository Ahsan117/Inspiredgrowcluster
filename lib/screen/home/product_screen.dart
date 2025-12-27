import 'package:eshop/screen/home/product_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../model/home/deck.dart';
import '../../model/home/subsubcategory.dart';
import '../../model/home/product_model.dart';
import '../../providers/cart_provider.dart';
import '../../services/home/api_service.dart';
import '../../services/navigation_service.dart';
import '../../widget/product_add_button.dart';
import '../cart_screen.dart';


class ProductsScreen extends StatefulWidget {
  final String categoryId;
  final String subcategoryId;
  final String subcategoryName;

  const ProductsScreen({
    super.key,
    required this.categoryId,
    required this.subcategoryId,
    required this.subcategoryName,
  });

  @override
  _ProductsScreenState createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  bool _isDisposed = false;
  List<SubSubCategory> subsubcategories = [];
  List<Deck> decks = [];
  List<Product> allProducts = [];
  Map<String, List<Product>> subsubcategoryProducts = {};
  bool isUsingDecks = false;
  bool isLoading = true;
  String selectedFilter = 'All';
  List<String> availableFilters = ['All'];
  Map<String, String> filterImageMap = {};
  Map<String, String> filterImageTypeMap = {};
  String? errorMessage;

  static const bool _debugMode = false;

  void _debugSubSubCategoriesImages() async {
    print('🔍 === TESTING SUBSUBCATEGORIES IMAGE FETCHING ===');

    try {
      final List<SubSubCategory> testSubSubCategories =
      await ApiService.getSubSubCategories(
        widget.categoryId,
        widget.subcategoryId,
      );

      print('📊 Found ${testSubSubCategories.length} SubSubCategories:');

      if (testSubSubCategories.isEmpty) {
        print('❌ No SubSubCategories returned from API');
        print('   This is why your app falls back to Decks mode');

        final testUrl =
            '${ApiService.baseUrl}/categories/${widget.categoryId}/subcategories/${widget.subcategoryId}/subsubcategories';
        print('🔗 API URL being called: $testUrl');
      } else {
        for (int i = 0; i < testSubSubCategories.length; i++) {
          final ssc = testSubSubCategories[i];
          print('\n${i + 1}. SubSubCategory: "${ssc.name}"');
          print('   ID: ${ssc.id}');
          print('   Image field: "${ssc.image}"');

          if (ssc.image.isNotEmpty && ssc.image != 'null') {
            final possibleUrls = ApiService.getSubSubCategoryImageUrls(
              ssc.image,
            );
            print('   🔗 Generated ${possibleUrls.length} possible URLs:');

            for (int j = 0; j < possibleUrls.length && j < 5; j++) {
              print('     ${j + 1}. ${possibleUrls[j]}');
            }

            try {
              final response = await http.get(Uri.parse(possibleUrls.first));
              if (response.statusCode == 200) {
                print('   ✅ SUCCESS: First image URL works!');
              } else {
                print('   ❌ FAILED: Status ${response.statusCode}');
              }
            } catch (e) {
              print('   ❌ ERROR: $e');
            }
          } else {
            print('   ❌ No image field value');
          }
        }
      }
    } catch (e) {
      print('💥 Error testing SubSubCategories: $e');
    }

    print('🔍 ========================================');
  }

  @override
  void initState() {
    super.initState();
    loadSubSubCategoriesAndProducts();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<CartProvider>(context, listen: false).loadCart();
    });
  }

  Future<void> loadSubSubCategoriesAndProducts() async {
    setState(() {
      isLoading = true;
      errorMessage = null;
      isUsingDecks = false;
    });

    try {
      if (_debugMode) {
        print('🔍 === LOADING DATA FOR ${widget.subcategoryName} ===');
        print('CategoryId: ${widget.categoryId}');
        print('SubcategoryId: ${widget.subcategoryId}');
      }

      List<SubSubCategory> loadedSubSubCategories = [];

      try {
        loadedSubSubCategories = await ApiService.getSubSubCategories(
          widget.categoryId,
          widget.subcategoryId,
        ).timeout(const Duration(seconds: 30));

        if (_debugMode) {
          print('📊 Loaded ${loadedSubSubCategories.length} SubSubCategories:');
          for (var ssc in loadedSubSubCategories) {
            print('- 📂 ${ssc.name} (ID: ${ssc.id}) - Image: "${ssc.image}"');
          }
        }
      } catch (e) {
        if (_debugMode) print('❌ Failed to load SubSubCategories: $e');
      }

      if (loadedSubSubCategories.isEmpty) {
        if (_debugMode) {
          print('🔄 No SubSubCategories found, trying Decks method...');
        }
        await _loadDecksData();
        return;
      }

      await _loadSubSubCategoriesData(loadedSubSubCategories);
    } catch (e) {
      if (_debugMode) print('💥 Error in loadSubSubCategoriesAndProducts: $e');
      setState(() {
        isLoading = false;
        errorMessage = 'Error loading data: $e';
      });
    }
  }

  Future<void> _loadDecksData() async {
    try {
      final loadedDecks = await ApiService.getDecksView(
        widget.categoryId,
        widget.subcategoryId,
      );

      if (_debugMode) {
        print('📦 Loaded ${loadedDecks.length} Decks:');
        for (var deck in loadedDecks) {
          print(
            '- 🎯 ${deck.name} (${deck.items.length} items) - Image: "${deck.image}"',
          );
        }
      }

      setState(() {
        decks = loadedDecks;
        allProducts = loadedDecks.expand((deck) => deck.items).toList();
        availableFilters =
            ['All'] + loadedDecks.map((deck) => deck.name).toList();
        isUsingDecks = true;

        filterImageMap = {'All': ''};
        filterImageTypeMap = {'All': 'icon'};

        for (final deck in loadedDecks) {
          String imageUrl = '';
          String imageType = 'icon';

          if (deck.image.isNotEmpty && deck.image != 'null') {
            imageUrl = deck.image;
            imageType = 'deck';
          } else if (deck.items.isNotEmpty) {
            for (final item in deck.items) {
              if (item.itemImages.isNotEmpty &&
                  item.itemImages.first.isNotEmpty) {
                imageUrl = item.itemImages.first;
                imageType = 'item';
                break;
              }
            }
          }

          filterImageMap[deck.name] = imageUrl;
          filterImageTypeMap[deck.name] = imageType;
        }

        isLoading = false;
      });

      if (_debugMode) {
        print(
          '✅ Decks loaded successfully: ${allProducts.length} total products',
        );
        print('🏷️ Available filters: $availableFilters');
      }
    } catch (e) {
      if (_debugMode) print('❌ Failed to load Decks: $e');
      setState(() {
        isLoading = false;
        errorMessage =
        'No data available. Both SubSubCategories and Decks failed to load.';
      });
    }
  }

  Future<void> _loadSubSubCategoriesData(
      List<SubSubCategory> loadedSubSubCategories,
      ) async {
    if (_debugMode) print('🛒 Loading products for each SubSubCategory...');

    List<Product> allLoadedProducts = [];
    Map<String, List<Product>> loadedSubsubcategoryProducts = {};

    for (final subsubcategory in loadedSubSubCategories) {
      if (_debugMode) print('📦 Loading products for: ${subsubcategory.name}');

      try {
        final products = await ApiService.getItemsForSubSubCategory(
          widget.categoryId,
          widget.subcategoryId,
          subsubcategory.id,
        );

        if (_debugMode) print('  ✅ Found ${products.length} products');
        loadedSubsubcategoryProducts[subsubcategory.id] = products;
        allLoadedProducts.addAll(products);
      } catch (e) {
        if (_debugMode) print('  ❌ Failed to load products: $e');
        loadedSubsubcategoryProducts[subsubcategory.id] = [];
      }
    }

    if (_debugMode) {
      print('📊 Total products loaded: ${allLoadedProducts.length}');
    }

    setState(() {
      subsubcategories = loadedSubSubCategories;
      allProducts = allLoadedProducts;
      subsubcategoryProducts = loadedSubsubcategoryProducts;
      availableFilters =
          ['All'] + loadedSubSubCategories.map((ssc) => ssc.name).toList();

      filterImageMap = {'All': ''};
      filterImageTypeMap = {'All': 'icon'};

      for (final subsubcategory in loadedSubSubCategories) {
        String imageUrl = '';
        String imageType = 'icon';

        if (subsubcategory.image.isNotEmpty && subsubcategory.image != 'null') {
          imageUrl = subsubcategory.image;
          imageType = 'subsubcategory';
        } else {
          final products =
              loadedSubsubcategoryProducts[subsubcategory.id] ?? [];
          for (final product in products) {
            if (product.itemImages.isNotEmpty &&
                product.itemImages.first.isNotEmpty) {
              imageUrl = product.itemImages.first;
              imageType = 'item';
              break;
            }
          }
        }

        filterImageMap[subsubcategory.name] = imageUrl;
        filterImageTypeMap[subsubcategory.name] = imageType;
      }

      isUsingDecks = false;
      isLoading = false;
    });

    if (_debugMode) {
      print(
        '🎉 SubSubCategories setup complete. Available filters: $availableFilters',
      );
    }
  }

  List<Product> getFilteredProducts() {
    if (selectedFilter == 'All') {
      return allProducts;
    }

    if (isUsingDecks) {
      final selectedDeck = decks.firstWhere(
            (deck) => deck.name == selectedFilter,
        orElse:
            () => Deck(id: '', name: '', items: [], image: '', description: ''),
      );

      if (selectedDeck.name.isEmpty) {
        return allProducts;
      }

      return selectedDeck.items;
    } else {
      final selectedSubSubCategory = subsubcategories.firstWhere(
            (ssc) => ssc.name == selectedFilter,
        orElse:
            () => SubSubCategory(id: '', name: '', description: '', image: ''),
      );

      if (selectedSubSubCategory.id.isEmpty) {
        return allProducts;
      }

      final filteredProducts =
          subsubcategoryProducts[selectedSubSubCategory.id] ?? [];
      return filteredProducts;
    }
  }

  Widget _buildCategoryIcon(String filter, bool isSelected) {
    if (filter == 'All') {
      return Container(
        width: 35,
        height: 35,
        decoration: BoxDecoration(
          color: isSelected ? Colors.green.withOpacity(0.2) : Colors.grey[200],
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          Icons.grid_view,
          color: isSelected ? Colors.green : Colors.grey[600],
          size: 18,
        ),
      );
    }

    final imageUrl = filterImageMap[filter] ?? '';
    final imageType = filterImageTypeMap[filter] ?? 'icon';

    if (imageUrl.isNotEmpty) {
      List<String> possibleUrls = _generateImageUrls(imageUrl, imageType);

      return Container(
        width: 35,
        height: 35,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? Colors.green : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: _buildImageWithFallbacks(possibleUrls, isSelected, 0, filter),
        ),
      );
    }

    return _buildFallbackIcon(filter, isSelected);
  }

  List<String> _generateImageUrls(String imageUrl, String imageType) {
    List<String> urls = [];

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      urls.add(imageUrl);
      return urls;
    }

    if (imageUrl.startsWith('/')) {
      urls.add('https://pos.inspiredgrow.in$imageUrl');
      return urls;
    }

    String encodedPath = _encodeImagePath(imageUrl);
    String rawPath = imageUrl;
    String baseUrl = 'https://pos.inspiredgrow.in/vps/uploads';

    switch (imageType) {
      case 'subsubcategory':
        urls.addAll([
          '$baseUrl/sub-subcategories/$encodedPath',
          '$baseUrl/sub-subcategories/$rawPath',
          '$baseUrl/subsubcategories/$encodedPath',
          '$baseUrl/subsubcategories/$rawPath',
          '$baseUrl/subcategories/$encodedPath',
          '$baseUrl/subcategories/$rawPath',
          '$baseUrl/$encodedPath',
          '$baseUrl/$rawPath',
        ]);
        break;

      case 'deck':
        urls.addAll([
          '$baseUrl/sub-subcategories/$encodedPath',
          '$baseUrl/sub-subcategories/$rawPath',
          '$baseUrl/decks/$encodedPath',
          '$baseUrl/decks/$rawPath',
          '$baseUrl/subsubcategories/$encodedPath',
          '$baseUrl/subsubcategories/$rawPath',
          '$baseUrl/subcategories/$encodedPath',
          '$baseUrl/subcategories/$rawPath',
          '$baseUrl/categories/$encodedPath',
          '$baseUrl/categories/$rawPath',
          '$baseUrl/$encodedPath',
          '$baseUrl/$rawPath',
        ]);
        break;

      case 'item':
        urls.addAll([
          '$baseUrl/qr/items/$encodedPath',
          '$baseUrl/qr/items/$rawPath',
          '$baseUrl/items/$encodedPath',
          '$baseUrl/items/$rawPath',
          '$baseUrl/$encodedPath',
          '$baseUrl/$rawPath',
        ]);
        break;

      default:
        urls.addAll(['$baseUrl/$encodedPath', '$baseUrl/$rawPath']);
        break;
    }

    final Set<String> seen = {};
    return urls.where((url) => seen.add(url)).toList();
  }

  String _encodeImagePath(String imagePath) {
    List<String> pathParts = imagePath.split('/');
    List<String> encodedParts =
    pathParts.map((part) => Uri.encodeComponent(part)).toList();
    return encodedParts.join('/');
  }

  Widget _buildImageWithFallbacks(
      List<String> urls,
      bool isSelected,
      int urlIndex,
      String filterName,
      ) {
    if (urlIndex >= urls.length) {
      return _buildFallbackIcon(filterName, isSelected);
    }

    final currentUrl = urls[urlIndex];

    return Image.network(
      currentUrl,
      width: 35,
      height: 35,
      fit: BoxFit.cover,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return Container(
          width: 35,
          height: 35,
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(6),
          ),
          child: Center(
            child: SizedBox(
              width: 12,
              height: 12,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.grey[400],
              ),
            ),
          ),
        );
      },
      errorBuilder: (context, error, stackTrace) {
        return _buildImageWithFallbacks(
          urls,
          isSelected,
          urlIndex + 1,
          filterName,
        );
      },
    );
  }

  Widget _buildFallbackIcon(String filter, bool isSelected) {
    IconData iconData = Icons.category;
    final filterLower = filter.toLowerCase();

    if (filterLower.contains('rice') || filterLower.contains('basmati')) {
      iconData = Icons.rice_bowl;
    } else if (filterLower.contains('dal') ||
        filterLower.contains('pulse') ||
        filterLower.contains('toor') ||
        filterLower.contains('channa') ||
        filterLower.contains('moong') ||
        filterLower.contains('urad')) {
      iconData = Icons.grain;
    } else if (filterLower.contains('cereal') ||
        filterLower.contains('millet')) {
      iconData = Icons.breakfast_dining;
    } else if (filterLower.contains('oil') || filterLower.contains('ghee')) {
      iconData = Icons.water_drop;
    } else if (filterLower.contains('picks') || filterLower.contains('top')) {
      iconData = Icons.star;
    } else if (filterLower.contains('detergent') ||
        filterLower.contains('washing')) {
      iconData = Icons.local_laundry_service;
    } else if (filterLower.contains('soap') || filterLower.contains('bar')) {
      iconData = Icons.soap;
    } else if (filterLower.contains('face') || filterLower.contains('facial')) {
      iconData = Icons.face;
    } else if (filterLower.contains('baby') || filterLower.contains('infant')) {
      iconData = Icons.child_care;
    }

    return Container(
      width: 35,
      height: 35,
      decoration: BoxDecoration(
        color: isSelected ? Colors.green.withOpacity(0.2) : Colors.grey[200],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(
        iconData,
        color: isSelected ? Colors.green : Colors.grey[600],
        size: 18,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvoked: (bool didPop) {
        if (didPop) return;
        NavigationService.goBackToHomeScreen();
      },
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios),
            onPressed: () {
              NavigationService.goBackToHomeScreen();
            },
          ),
          title: Text(widget.subcategoryName),
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 0.5,
          actions: [
            IconButton(icon: const Icon(Icons.search), onPressed: () {}),
            Consumer<CartProvider>(
              builder: (context, cartProvider, child) {
                return Stack(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.shopping_cart),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const CartScreen(),
                          ),
                        );
                      },
                    ),
                    if (cartProvider.totalItemsInCart > 0)
                      Positioned(
                        right: 5,
                        top: 5,
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          constraints: const BoxConstraints(
                            minWidth: 16,
                            minHeight: 16,
                          ),
                          child: Text(
                            '${cartProvider.totalItemsInCart}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ],
        ),
        backgroundColor: Colors.grey[50],
        body: isLoading
            ? const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading categories and products...'),
            ],
          ),
        )
            : errorMessage != null
            ? Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red[300],
              ),
              const SizedBox(height: 16),
              Text(
                'Error Loading Data',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.red[700],
                ),
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  errorMessage!,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: loadSubSubCategoriesAndProducts,
                child: const Text('Retry'),
              ),
            ],
          ),
        )
            : Row(
          children: [
            Container(
              width: 85,
              color: Colors.white,
              child: Column(
                children: [
                  Container(
                    height: 50,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: Colors.grey[200]!),
                      ),
                      color: Colors.grey[50],
                    ),
                    child: Center(
                      child: Text(
                        'Categories',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[700],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: availableFilters.isEmpty
                        ? Center(
                      child: Column(
                        mainAxisAlignment:
                        MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.category_outlined,
                            size: 32,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'No categories\navailable',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey[500],
                            ),
                          ),
                        ],
                      ),
                    )
                        : ListView.builder(
                      padding: const EdgeInsets.symmetric(
                        vertical: 8,
                      ),
                      itemCount: availableFilters.length,
                      itemBuilder: (context, index) {
                        final filter = availableFilters[index];
                        final isSelected =
                            selectedFilter == filter;
                        final hasImage =
                            filterImageMap[filter]
                                ?.isNotEmpty ==
                                true;

                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              selectedFilter = filter;
                            });
                          },
                          child: Container(
                            margin: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 4,
                            ),
                            padding: const EdgeInsets.symmetric(
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? Colors.green
                                  .withOpacity(0.1)
                                  : Colors.transparent,
                              borderRadius:
                              BorderRadius.circular(8),
                              border: Border.all(
                                color: isSelected
                                    ? Colors.green
                                    : hasImage
                                    ? Colors.blue
                                    .withOpacity(0.3)
                                    : Colors.grey[200]!,
                                width: isSelected ? 2 : 1,
                              ),
                              boxShadow: isSelected
                                  ? [
                                BoxShadow(
                                  color: Colors.green
                                      .withOpacity(0.2),
                                  blurRadius: 4,
                                  offset:
                                  const Offset(0, 2),
                                ),
                              ]
                                  : null,
                            ),
                            child: Column(
                              children: [
                                Stack(
                                  children: [
                                    _buildCategoryIcon(
                                      filter,
                                      isSelected,
                                    ),
                                    if (hasImage)
                                      Positioned(
                                        top: 0,
                                        right: 0,
                                        child: Container(
                                          width: 8,
                                          height: 8,
                                          decoration:
                                          BoxDecoration(
                                            color: Colors.green,
                                            borderRadius:
                                            BorderRadius
                                                .circular(
                                              4,
                                            ),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  filter,
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: isSelected
                                        ? FontWeight.bold
                                        : FontWeight.normal,
                                    color: isSelected
                                        ? Colors.green[700]
                                        : Colors.black87,
                                  ),
                                  textAlign: TextAlign.center,
                                  maxLines: 2,
                                  overflow:
                                  TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: getFilteredProducts().isEmpty
                  ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Image(image: AssetImage('assets/images/app_logo.png'),
                      fit: BoxFit.contain,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      selectedFilter == 'All'
                          ? 'No products available'
                          : 'No products in $selectedFilter',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w500,
                        color: Colors.grey[600],
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      margin: const EdgeInsets.symmetric(
                        horizontal: 20,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: Colors.grey[200]!,
                        ),
                      ),
                      child: Column(
                        children: [
                          Text(
                            'Data Source Information',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey[700],
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Mode: ${isUsingDecks ? "Decks" : "SubSubCategories"}\n'
                                'Total categories: ${availableFilters.length}\n'
                                'Total products: ${allProducts.length}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      onPressed:
                      loadSubSubCategoriesAndProducts,
                      icon:
                      const Icon(Icons.refresh, size: 18),
                      label: const Text('Retry'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
              )
                  : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount:
                (getFilteredProducts().length / 2).ceil(),
                itemBuilder: (context, index) {
                  final leftIndex = index * 2;
                  final rightIndex = leftIndex + 1;
                  final products = getFilteredProducts();

                  return Padding(
                    padding:
                    const EdgeInsets.only(bottom: 16),
                    child: Row(
                      crossAxisAlignment:
                      CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: SeparatedProductCard(
                            product: products[leftIndex],
                            categoryId: widget.categoryId,
                            subcategoryId:
                            widget.subcategoryId,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: rightIndex < products.length
                              ? SeparatedProductCard(
                            product:
                            products[rightIndex],
                            categoryId:
                            widget.categoryId,
                            subcategoryId:
                            widget.subcategoryId,
                          )
                              : const SizedBox(),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
// In ProductsScreen.dart

class SeparatedProductCard extends StatefulWidget {
  final Product product;
  final String? categoryId; // Make nullable
  final String? subcategoryId; // Make nullable

  const SeparatedProductCard({
    super.key,
    required this.product,
    this.categoryId, // Remove 'required'
    this.subcategoryId, // Remove 'required'
  });

  @override
  _SeparatedProductCardState createState() => _SeparatedProductCardState();
}

class _SeparatedProductCardState extends State<SeparatedProductCard> {

  void _navigateToProductDetail() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductDetailScreen(
          product: widget.product,
          // Pass the potentially null IDs
          categoryId: widget.categoryId,
          subcategoryId: widget.subcategoryId,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Check if itemImages is not empty and the first image is not an empty string
    final bool hasValidImage = widget.product.itemImages.isNotEmpty &&
        widget.product.itemImages.first.isNotEmpty;

    return GestureDetector(
      onTap: _navigateToProductDetail,
      child: Column( // Main card column
        crossAxisAlignment: CrossAxisAlignment.start,
        // Let the content determine the height naturally
        mainAxisSize: MainAxisSize.min, // Ensure the Column doesn't try to expand infinitely
        children: [
          // --- Image Section (Keep As Is) ---
          AspectRatio(
            aspectRatio: 1.0, // Makes the image container square
            child: Hero(
              tag: 'product-image-${widget.product.id}-${widget.categoryId ?? 'popular'}',
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[200]!, width: 1),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.withOpacity(0.08),
                      spreadRadius: 1,
                      blurRadius: 3,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(8), // Padding around image
                    width: double.infinity,
                    height: double.infinity,
                    color: Colors.grey[50],
                    child: hasValidImage
                        ? Image.network(
                      ApiService.getImageUrl(
                        widget.product.itemImages.first,
                        'item',
                      ),
                      fit: BoxFit.contain,
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return Center(
                          child: CircularProgressIndicator(
                            value: loadingProgress.expectedTotalBytes != null
                                ? loadingProgress.cumulativeBytesLoaded /
                                loadingProgress.expectedTotalBytes!
                                : null,
                            strokeWidth: 3,
                            color: Colors.grey[300],
                          ),
                        );
                      },
                      errorBuilder: (context, error, stackTrace) {
                        return Center(
                          child: Image(
                            image: AssetImage('assets/images/app_logo.png'),
                            fit: BoxFit.contain,
                          ),
                        );
                      },
                    )
                        : Center( // Fallback icon
                      child: Image(
                        image: AssetImage('assets/images/app_logo.png'),
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),

          // --- Details Section (No Expanded, No Spacer, No spaceBetween) ---
          // This Column simply stacks its children vertically.
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min, // Take minimum required height
            children: [
              // Brand Row removed

              const SizedBox(height: 4), // Space before item name

              // --- Item Name ---
              Text(
                widget.product.itemName,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 6),

              // --- Discount Badge ---
              if (widget.product.discountPercentage > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: Colors.red.withOpacity(0.5), width: 0.5)
                  ),
                  child: Text(
                    '${widget.product.discountPercentage.toInt()}% OFF',
                    style: const TextStyle(
                      color: Colors.red,
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              // Space after discount badge
              if (widget.product.discountPercentage > 0) const SizedBox(height: 4),

              // --- Price Row ---
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    '₹${widget.product.salesPrice.toInt()}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: Colors.black,
                    ),
                  ),
                  if (widget.product.mrp > widget.product.salesPrice) ...[
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        'MRP ₹${widget.product.mrp.toInt()}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Colors.grey,
                          decoration: TextDecoration.lineThrough,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 8), // Space before button

              // --- Add Button ---
              SizedBox(height: 30, child: ProductAddButton(product: widget.product)),
              // Add a final SizedBox for padding at the bottom if needed visually
              // const SizedBox(height: 4),
            ],
          ), // <-- End Details Column
        ],
      ),
    );
  }
}