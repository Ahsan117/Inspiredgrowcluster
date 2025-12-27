import 'dart:math' as math;
import 'package:eshop/Animation/bouncing_dots.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../model/home/trending_in_city_model.dart';
import '../../../providers/cart_provider.dart';
import '../../../providers/notification_provider.dart';
import '../../../services/home/api_service.dart';
import '../../../services/search_service.dart';
import '../../../providers/recent_searches_provider.dart';
import '../../../model/home/product_model.dart';
import 'dart:async';

import '../../../services/stock_service.dart';
import '../product_detail_screen.dart';
import '../product_screen.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  static const Duration _debounceDuration = Duration(milliseconds: 500);
  int _requestId = 0;
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  final _searchFocusNode = FocusNode();


  // Cached data
  List<Product> _productResults = [];
  List<String> _suggestions = [];
  List<Product> _cachedSuggestionProducts = []; // Cache products fetched for suggestions
  late final List<String> _popularSearches;

  // State flags
  bool _isSearching = false;
  bool _isLoadingSuggestions = false;
  String _searchQuery = '';
  Timer? _debounceTimer;

  // Cached popular products to avoid redundant API calls
  List<Product>? _cachedPopularProducts;

  // Trending tiles from API
  List<Data>? _trendingTilesData;
  bool _isLoadingTrendingTiles = true;

  @override
  void initState() {
    super.initState();
    _popularSearches = SearchService.getPopularSearches();

    // ✅ Pre-cache popular searches in background
    Future.microtask(() {
      for (final search in _popularSearches.take(3)) {
        SearchService.searchProducts(search);
      }
    });

    Future.microtask(() => _loadTrendingTiles());
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    _searchFocusNode.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadTrendingTiles() async {
    try {
      debugPrint('🔥 Loading trending tiles from API...');

      // ✅ Add timeout to prevent long waits
      final response = await ApiService.getTrendingTiles()
          .timeout(const Duration(seconds: 5));

      if (response['success'] == true && response['data'] != null) {
        final trendingData = TrendingInCity.fromJson(response);

        if (mounted) {
          setState(() {
            _trendingTilesData = trendingData.data;
            _isLoadingTrendingTiles = false;
          });
        }
      } else {
        if (mounted) {
          setState(() => _isLoadingTrendingTiles = false);
        }
      }
    } on TimeoutException catch (e) {
      debugPrint('⏱️ Trending tiles timeout: $e');
      if (mounted) {
        setState(() => _isLoadingTrendingTiles = false);
      }
    } catch (e) {
      debugPrint('❌ Error loading trending tiles: $e');
      if (mounted) {
        setState(() => _isLoadingTrendingTiles = false);
      }
    }
  }

  Future<void> _performSearch(String query, {bool suggestionsOnly = false}) async {
    if (query.trim().isEmpty) {
      setState(() {
        _suggestions = [];
        _productResults = [];
        _cachedSuggestionProducts = [];
        _isSearching = false;
        _isLoadingSuggestions = false;
      });
      return;
    }

    // Generate unique request ID
    final currentRequestId = ++_requestId;

    try {
      if (suggestionsOnly) {
        setState(() => _isLoadingSuggestions = true);

        // Check if we can use cached suggestion products
        if (_cachedSuggestionProducts.isNotEmpty &&
            _searchQuery.toLowerCase() == query.toLowerCase()) {
          debugPrint('✅ Reusing cached suggestion products');

          final productSuggestions = _cachedSuggestionProducts
              .map((p) => p.itemName)
              .toSet()
              .take(5)
              .toList();

          final recentProvider = context.read<RecentSearchesProvider>();
          final localSuggestions = SearchService.generateSuggestions(
            query,
            recentProvider.recentSearches,
          );

          final combinedSuggestions = <String>{
            ...localSuggestions.take(3),
            ...productSuggestions.take(5),
          }.take(8).toList();

          if (mounted && currentRequestId == _requestId) {
            setState(() {
              _suggestions = combinedSuggestions;
              _isLoadingSuggestions = false;
            });
          }
          return;
        }

        // Parallel fetch: local suggestions + API call
        final recentProvider = context.read<RecentSearchesProvider>();
        final localSuggestions = SearchService.generateSuggestions(
          query,
          recentProvider.recentSearches,
        );

        // Show local suggestions immediately
        if (localSuggestions.isNotEmpty && mounted && currentRequestId == _requestId) {
          setState(() {
            _suggestions = localSuggestions.take(3).toList();
          });
        }

        // Fetch products in background
        final results = await SearchService.searchProducts(query);

        // Check if request is still valid
        if (!mounted || currentRequestId != _requestId) return;

        _cachedSuggestionProducts = results;

        final productSuggestions = results
            .map((p) => p.itemName)
            .toSet()
            .take(5)
            .toList();

        final combinedSuggestions = <String>{
          ...localSuggestions.take(3),
          ...productSuggestions.take(5),
        }.take(8).toList();

        setState(() {
          _suggestions = combinedSuggestions;
          _isLoadingSuggestions = false;
        });
      } else {
        setState(() {
          _isSearching = true;
          _suggestions = [];
        });

        // Reuse cached results if available
        if (_cachedSuggestionProducts.isNotEmpty &&
            _searchQuery.toLowerCase() == query.toLowerCase()) {
          debugPrint('✅ Reusing ${_cachedSuggestionProducts.length} cached products');

          if (mounted && currentRequestId == _requestId) {
            setState(() {
              _productResults = _cachedSuggestionProducts;
              _isSearching = false;
            });
          }
          return;
        }

        // Fresh search
        final results = await SearchService.searchProducts(query);

        // Check if request is still valid
        if (!mounted || currentRequestId != _requestId) return;

        setState(() {
          _productResults = results;
          _cachedSuggestionProducts = results; // Cache for future use
          _isSearching = false;
        });
      }
    } catch (e) {
      debugPrint('❌ Error during search: $e');
      if (mounted && currentRequestId == _requestId) {
        setState(() {
          if (suggestionsOnly) {
            _suggestions = [];
            _isLoadingSuggestions = false;
          } else {
            _productResults = [];
            _isSearching = false;
          }
        });
      }
    }
  }


  void _onSearchChanged(String query) {
    debugPrint('📝 Search changed: "$query"');
    _searchQuery = query;
    _debounceTimer?.cancel();

    if (query.trim().isEmpty) {
      setState(() {
        _suggestions = [];
        _productResults = [];
        _isSearching = false;
        _isLoadingSuggestions = false;
      });
      return;
    }

    // Don't show loading immediately - wait for debounce
    _debounceTimer = Timer(_debounceDuration, () {
      if (_searchQuery == query && mounted) {
        setState(() => _isLoadingSuggestions = true);
        _performSearch(query, suggestionsOnly: true);
      }
    });
  }

  void _onSearchSubmitted(String query) {
    debugPrint('🔍 Search submitted: "$query"');
    if (query.trim().isEmpty) return;
    _debounceTimer?.cancel();

    // Add to recent searches
    context.read<RecentSearchesProvider>().addSearch(query);

    // Update state and trigger full search
    setState(() {
      _searchQuery = query;
      _suggestions = [];
      _isLoadingSuggestions = false;
    });

    _searchFocusNode.unfocus();
    _performSearch(query, suggestionsOnly: false);
  }

  void _handleSearchSelection(String term) {
    debugPrint('✅ Search selection: "$term"');
    _debounceTimer?.cancel();
    _searchController.text = term;
    _searchController.selection = TextSelection.fromPosition(TextPosition(offset: term.length));

    // Add to recent searches
    context.read<RecentSearchesProvider>().addSearch(term);

    // Update state and trigger full search
    setState(() {
      _searchQuery = term;
      _suggestions = [];
      _isLoadingSuggestions = false;
    });

    _searchFocusNode.unfocus();
    _performSearch(term, suggestionsOnly: false);
  }

  void _clearSearch() {
    _debounceTimer?.cancel();
    _searchController.clear();
    setState(() {
      _searchQuery = '';
      _suggestions = [];
      _productResults = [];
      _cachedSuggestionProducts = [];
      _isSearching = false;
      _isLoadingSuggestions = false;
    });
    _searchFocusNode.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: _buildAppBar(),
      body: Consumer<RecentSearchesProvider>(
        builder: (context, recentProvider, _) => Column(
          children: [
            // Show recent searches only if query is empty
            if (recentProvider.recentSearches.isNotEmpty &&
                _searchQuery.isEmpty &&
                !_isLoadingSuggestions)
              _buildRecentSearches(recentProvider),
            // Show suggestions OR search results/popular searches
            Expanded(child: _buildMainContent()),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      elevation: 0,
      backgroundColor: Colors.white,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back, color: Colors.black87),
        onPressed: () => Navigator.pop(context),
      ),
      title: Container(
        height: 44,
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
        ),
        child: TextField(
          controller: _searchController,
          focusNode: _searchFocusNode,
          autofocus: true,
          textInputAction: TextInputAction.search,
          style: const TextStyle(fontSize: 15),
          decoration: InputDecoration(
            hintText: 'Search for products...',
            hintStyle: TextStyle(color: Colors.grey[500], fontSize: 15),
            prefixIcon: Icon(Icons.search, color: Colors.grey[600], size: 22),
            suffixIcon: _searchQuery.isNotEmpty
                ? IconButton(
              icon: Icon(Icons.clear, color: Colors.grey[600], size: 20),
              onPressed: _clearSearch,
            )
                : null,
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
          onChanged: _onSearchChanged,
          onSubmitted: _onSearchSubmitted,
        ),
      ),
    );
  }

  Widget _buildRecentSearches(RecentSearchesProvider provider) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Recent Searches',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey[700])),
              TextButton(
                onPressed: () => _showClearHistoryDialog(provider),
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(50, 30),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  alignment: Alignment.centerRight,
                ),
                child: Text('Clear All',
                    style: TextStyle(fontSize: 12, color: Colors.red[600], fontWeight: FontWeight.w500)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: provider.recentSearches
                .map((search) => _buildChip(
              search,
              Icons.history,
                  () => _handleSearchSelection(search),
            ))
                .toList(),
          ),
          const SizedBox(height: 12),
          Divider(height: 1, color: Colors.grey[200]),
        ],
      ),
    );
  }

  Widget _buildChip(String text, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey[300]!, width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: Colors.grey[600]),
            const SizedBox(width: 6),
            Text(text,
                style: TextStyle(fontSize: 13, color: Colors.grey[800], fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }

  Widget _buildMainContent() {
    debugPrint('🎨 Building main content: query="$_searchQuery", isSearching=$_isSearching, suggestions=${_suggestions.length}, products=${_productResults.length}, isLoadingSuggestions=$_isLoadingSuggestions');

    // Priority 1: Show suggestions if query is active and (has suggestions OR loading)
    if (_searchQuery.isNotEmpty && (_isLoadingSuggestions || _suggestions.isNotEmpty)) {
      return _buildSuggestionsSection();
    }

    // Priority 2: Show loading for product search
    if (_isSearching) {
      return const Center(child: BouncingDotsIndicator());
    }

    // Priority 3: Show product results
    if (_productResults.isNotEmpty) {
      return _buildSearchResults();
    }

    // Priority 4: Show "No results" if search was performed but nothing found
    if (_searchQuery.isNotEmpty && !_isSearching && !_isLoadingSuggestions) {
      return _buildEmptyState(
        Icons.search_off_rounded,
        'No results found',
        'Try searching for something else',
      );
    }

    // Priority 5: Default state - show popular searches
    return _buildPopularSearches();
  }

  Widget _buildSuggestionsSection() {
    return ListView(
      children: [
        Container(
          color: Colors.white,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Text('Suggestions',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey[700])),
              ),
              if (_isLoadingSuggestions)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(
                    child: SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                )
              else if (_suggestions.isNotEmpty)
                ..._suggestions.map((suggestion) => _buildSuggestionTile(suggestion)),
            ],
          ),
        ),
        // Show products below suggestions if available
        if (!_isLoadingSuggestions && _cachedSuggestionProducts.isNotEmpty) ...[
          Container(height: 8, color: Colors.grey[100]),
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'Products',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey[700]),
            ),
          ),
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(12),
            child: _buildProductGrid(_cachedSuggestionProducts),
          ),
        ]
        // Show message if no products found
        else if (!_isLoadingSuggestions && _suggestions.isEmpty && _searchQuery.isNotEmpty) ...[
          Container(height: 8, color: Colors.grey[100]),
          Padding(
            padding: const EdgeInsets.all(32),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.search_off_rounded, size: 48, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No products found',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey[700]),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Try searching with different keywords',
                    style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSuggestionTile(String suggestion) {
    return Material(
      color: Colors.white,
      child: InkWell(
        onTap: () => _handleSearchSelection(suggestion),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.grey[200]!, width: 1)),
          ),
          child: Row(
            children: [
              Icon(Icons.search, size: 20, color: Colors.grey[500]),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  suggestion,
                  style: const TextStyle(fontSize: 14, color: Colors.black87),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Icon(Icons.north_west, size: 16, color: Colors.grey[400]),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(IconData icon, String title, String subtitle) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: Colors.grey[100], shape: BoxShape.circle),
              child: Icon(icon, size: 64, color: Colors.grey[400]),
            ),
            const SizedBox(height: 24),
            Text(title, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.grey[800])),
            const SizedBox(height: 8),
            Text(subtitle, style: TextStyle(fontSize: 14, color: Colors.grey[600]), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchResults() {
    return ListView(
      controller: _scrollController,
      children: [
        Container(height: 8, color: Colors.grey[100]),
        Container(
          color: Colors.white,
          // padding: const EdgeInsets.all(12), // <-- REMOVED
          child: _buildProductGrid(_productResults),
        ),
      ],
    );
  }
  // ✅ Product grid using the same layout as ProductsScreen

  Widget _buildPopularSearches() {
    if (_popularSearches.isEmpty) {
      return _buildEmptyState(
        Icons.search_rounded,
        'Start your search',
        'Find groceries, medicines, and more...',
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Trending in your city',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87, letterSpacing: -0.3)),
                const SizedBox(height: 4),
                Text('Popular searches near you', style: TextStyle(fontSize: 13, color: Colors.grey[600])),
                const SizedBox(height: 20),
                _buildTrendingGrid(),
              ],
            ),
          ),
          Container(height: 8, color: Colors.grey[100]),
          const SizedBox(height: 16),
          _buildPopularProductsSection(),
        ],
      ),
    );
  }

  Widget _buildTrendingGrid() {
    // Show loading skeleton while fetching from API
    if (_isLoadingTrendingTiles) {
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          childAspectRatio: 1.0,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: 6,
        itemBuilder: (_, i) => Container(
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      );
    }

    // Use API data if available
    if (_trendingTilesData != null && _trendingTilesData!.isNotEmpty) {
      final tiles = _trendingTilesData!.take(6).toList();

      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          childAspectRatio: 1.0,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: tiles.length,
        itemBuilder: (_, i) => _buildTrendingCardFromApi(tiles[i], i),
      );
    }

    // Fallback to empty state
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Text(
          'No trending items available',
          style: TextStyle(color: Colors.grey[600]),
        ),
      ),
    );
  }

  Widget _buildTrendingCardFromApi(Data tileData, int index) {
    final color = _getCategoryColor(index);
    final label = tileData.label ?? 'Item';

    // Get first 2 item images or use default emojis
    final images = tileData.items?.take(2).map((item) {
      if (item.itemImages != null && item.itemImages!.isNotEmpty) {
        return item.itemImages!.first;
      }
      return null;
    }).where((img) => img != null).toList() ?? [];

    return InkWell(
      onTap: () {
        // If tile has items, show them directly
        if (tileData.items != null && tileData.items!.isNotEmpty) {
          final products = tileData.items!.map((item) => Product(
            id: item.sId ?? '',
            itemName: item.itemName ?? '',
            brand: item.brand ?? '',
            salesPrice: (item.salesPrice ?? 0).toDouble(),
            mrp: (item.mrp ?? 0).toDouble(),
            itemImages: item.itemImages ?? [],
            unit: '',
            description: '',
            stock: item.currentStock ?? 0, // Added stock parameter using currentStock
          )).toList();

          setState(() {
            _productResults = List<Product>.from(products);
            _searchQuery = label;
            _searchController.text = label;
          });
          _searchFocusNode.unfocus();
        } else {
          // Fallback to search
          _handleSearchSelection(label);
        }
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [color, color.withOpacity(0.8)],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.3),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label.toLowerCase(),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.3,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const Spacer(),
            Row(
              children: [
                Expanded(
                  child: images.isNotEmpty
                      ? _buildImageBox(images[0]!)
                      : _buildEmojiBox('🛒'),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: images.length > 1
                      ? _buildImageBox(images[1]!)
                      : _buildEmojiBox('📦'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImageBox(String imagePath) {
    return AspectRatio(
      aspectRatio: 1.0,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Image.network(
            ApiService.getImageUrl(imagePath, 'item'),
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return _buildEmojiBox('📦');
            },
          ),
        ),
      ),
    );
  }

  Color _getCategoryColor(int index) {
    final colors = [
      Colors.green[600]!, Colors.orange[600]!, Colors.blue[600]!,
      Colors.purple[600]!, Colors.teal[600]!, Colors.red[500]!,
      Colors.brown[600]!, Colors.pink[600]!, Colors.amber[600]!,
    ];
    return colors[index % colors.length];
  }

  Widget _buildEmojiBox(String emoji) {
    return AspectRatio(
      aspectRatio: 1.0,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))],
        ),
        child: Center(child: Text(emoji, style: const TextStyle(fontSize: 22))),
      ),
    );
  }

  Widget _buildPopularProductsSection() {
    return Container(
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Popular Products', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87)),
                const SizedBox(height: 4),
                Text('Most searched items', style: TextStyle(fontSize: 13, color: Colors.grey[600])),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: FutureBuilder<List<Product>>(
              future: _getPopularProducts(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return _buildPopularProductsSkeleton();
                }
                if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  return const SizedBox(height: 100, child: Center(child: Text("No popular products found.")));
                }

                final popularProducts = snapshot.data!.take(6).toList();

                return ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: (popularProducts.length / 2).ceil(),
                  itemBuilder: (context, rowIndex) {
                    final leftIndex = rowIndex * 2;
                    final rightIndex = leftIndex + 1;

                    if (leftIndex >= popularProducts.length) {
                      return const SizedBox.shrink();
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: SeparatedProductCard(
                              product: popularProducts[leftIndex],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: rightIndex < popularProducts.length
                                ? SeparatedProductCard(
                              product: popularProducts[rightIndex],
                            )
                                : const SizedBox(),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildPopularProductsSkeleton() {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 3,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (_, __) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: _buildSkeletonCard()),
          const SizedBox(width: 12),
          Expanded(child: _buildSkeletonCard()),
        ],
      ),
    );
  }

  Widget _buildSkeletonCard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AspectRatio(
          aspectRatio: 1.0,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Container(height: 10, width: 60, color: Colors.grey[200], margin: const EdgeInsets.only(bottom: 4)),
        Container(height: 12, width: double.infinity, color: Colors.grey[200], margin: const EdgeInsets.only(bottom: 4)),
        Container(height: 12, width: double.infinity, color: Colors.grey[200], margin: const EdgeInsets.only(bottom: 6)),
        Container(height: 14, width: 40, color: Colors.grey[200], margin: const EdgeInsets.only(bottom: 8)),
        Container(height: 30, width: double.infinity, color: Colors.grey[200]),
      ],
    );
  }

  void _showClearHistoryDialog(RecentSearchesProvider provider) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Clear Search History'),
        content: const Text('Are you sure you want to clear all recent searches?'),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: TextStyle(color: Colors.grey[600])),
          ),
          TextButton(
            onPressed: () {
              provider.clearSearches();
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Search history cleared'), duration: Duration(seconds: 2)),
              );
            },
            child: Text('Clear', style: TextStyle(color: Colors.red[600], fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Future<List<Product>> _getPopularProducts() async {
    if (_cachedPopularProducts != null) {
      return _cachedPopularProducts!;
    }
    try {
      if (_productResults.isNotEmpty) {
        _cachedPopularProducts = _productResults.take(6).toList();
        return _cachedPopularProducts!;
      }

      // Use API data if available
      if (_trendingTilesData != null && _trendingTilesData!.isNotEmpty) {
        final allProducts = <Product>[];

        // Collect products from all trending tiles
        for (final tile in _trendingTilesData!) {
          if (tile.items != null) {
            for (final item in tile.items!) {
              allProducts.add(Product(
                id: item.sId ?? '',
                itemName: item.itemName ?? '',
                brand: item.brand ?? '',
                salesPrice: (item.salesPrice ?? 0).toDouble(),
                mrp: (item.mrp ?? 0).toDouble(),
                itemImages: item.itemImages ?? [],
                unit: '',
                description: '',
                stock: item.currentStock ?? 0, // Using currentStock directly
              ));
            }
          }
        }

        _cachedPopularProducts = allProducts.take(12).toList();
        return _cachedPopularProducts!;
      }

      // Fallback: Search for generic popular items
      final results = await SearchService.searchProducts('popular');
      _cachedPopularProducts = results.take(12).toList();
      return _cachedPopularProducts!;
    } catch (e) {
      debugPrint('Error getting popular products: $e');
      return [];
    }
  }
  Widget _buildProductGrid(List<Product> products) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      itemCount: (products.length / 3).ceil(),
      itemBuilder: (context, index) {
        final firstIndex = index * 3;
        final secondIndex = firstIndex + 1;
        final thirdIndex = firstIndex + 2;

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: CompactProductCard(
                  product: products[firstIndex],
                  // ✅ Removed isVisible parameter
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: secondIndex < products.length
                    ? CompactProductCard(
                  product: products[secondIndex],
                  // ✅ Removed isVisible parameter
                )
                    : const SizedBox(),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: thirdIndex < products.length
                    ? CompactProductCard(
                  product: products[thirdIndex],
                  // ✅ Removed isVisible parameter
                )
                    : const SizedBox(),
              ),
            ],
          ),
        );
      },
    );
  }
}

class CompactProductCard extends StatefulWidget {
  final Product product;

  const CompactProductCard({
    super.key,
    required this.product,
  });

  @override
  State<CompactProductCard> createState() => _CompactProductCardState();
}

class _CompactProductCardState extends State<CompactProductCard> {
  bool _imageLoaded = false;
  bool _imageError = false;

  // Stock status logic
  bool _isProcessing = false;
  StockStatus? _stockStatus;
  bool _isLoadingStock = true;

  @override
  void initState() {
    super.initState();
    // ✅ Load stock status in background (non-blocking)
    Future.microtask(() => _loadStockStatus());
  }

  Future<void> _loadStockStatus() async {
    try {
      final stockStatus = await StockService.getStockStatus(widget.product.id)
          .timeout(const Duration(seconds: 2)); // ✅ Reduced timeout to 2s

      if (mounted) {
        setState(() {
          _stockStatus = stockStatus;
          _isLoadingStock = false;
        });
      }
    } on TimeoutException {
      // ✅ Assume available if timeout (faster fallback)
      if (mounted) {
        setState(() {
          _stockStatus = StockStatus(
            isAvailable: true,
            currentStock: 999,
            message: 'Available',
            statusType: StockStatusType.inStock,
          );
          _isLoadingStock = false;
        });
      }
    } catch (e) {
      // ✅ On network error, assume available (better UX)
      debugPrint('⚠️ Stock check failed for ${widget.product.id}, assuming available');
      if (mounted) {
        setState(() {
          _stockStatus = StockStatus(
            isAvailable: true,
            currentStock: 999,
            message: 'Available',
            statusType: StockStatusType.inStock,
          );
          _isLoadingStock = false;
        });
      }
    }
  }

  void _showSnackBar(String message, {Color? backgroundColor}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: backgroundColor,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _updateCartQuantity(int newQuantity) async {
    if (_isProcessing) return;

    final cartProvider = Provider.of<CartProvider>(context, listen: false);

    // Stock validation
    if (newQuantity > 0 && _stockStatus != null) {
      if (!_stockStatus!.isAvailable ||
          newQuantity > _stockStatus!.currentStock) {
        _showSnackBar(
          'Only ${_stockStatus!.currentStock} items available in stock',
          backgroundColor: Colors.orange,
        );
        return;
      }
    }

    setState(() {
      _isProcessing = true;
    });

    try {
      final result = await cartProvider.updateItemQuantity(
        itemId: widget.product.id,
        newQuantity: newQuantity,
      );

      if (result != null && result['error'] != null) {
        _showSnackBar(
          result['error'] as String,
          backgroundColor: Colors.red,
        );
      }
    } catch (e) {
      _showSnackBar('Failed to update cart', backgroundColor: Colors.red);
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  void _navigateToProductDetail() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductDetailScreen(
          product: widget.product,
          categoryId: null,
          subcategoryId: null,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool hasValidImage = widget.product.itemImages.isNotEmpty &&
        widget.product.itemImages.first.isNotEmpty;

    return GestureDetector(
      onTap: _navigateToProductDetail,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[200]!, width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.08),
              spreadRadius: 1,
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // ✅ Image Section - Always load immediately
            AspectRatio(
              aspectRatio: 1.0,
              child: Hero(
                tag: 'product-image-${widget.product.id}-search',
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(12),
                      topRight: Radius.circular(12),
                    ),
                  ),
                  child: ClipRRect(
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(12),
                      topRight: Radius.circular(12),
                    ),
                    child: hasValidImage && !_imageError
                        ? _buildOptimizedImage()
                        : Center(
                      child: Icon(
                        Icons.image_not_supported_outlined,
                        size: 35,
                        color: Colors.grey[300],
                      ),
                    ),
                  ),
                ),
              ),
            ),

            // Details Section
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Item Name
                  Text(
                    widget.product.itemName,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                      height: 1.3,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),

                  // Price Row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        '₹${widget.product.salesPrice.toInt()}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: Colors.black,
                        ),
                      ),
                      if (widget.product.mrp > widget.product.salesPrice) ...[
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            '₹${widget.product.mrp.toInt()}',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey[600],
                              decoration: TextDecoration.lineThrough,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ],
                  ),

                  // Discount Badge
                  if (widget.product.discountPercentage > 0) ...[
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                          color: Colors.red.withOpacity(0.5),
                          width: 0.5,
                        ),
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
                  ],

                  const SizedBox(height: 8),

                  // Action Button
                  _buildActionButton(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ✅ UPDATED: Always load images immediately (removed visibility check)
  Widget _buildOptimizedImage() {
    return Stack(
      children: [
        // Placeholder while loading
        if (!_imageLoaded)
          Center(
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Colors.grey[300],
            ),
          ),
        // Optimized network image
        Positioned.fill(
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Image.network(
              ApiService.getImageUrl(
                widget.product.itemImages.first,
                'item',
              ),
              fit: BoxFit.contain,
              cacheWidth: 300, // ✅ Resize to reduce memory
              cacheHeight: 300,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (mounted && !_imageLoaded) {
                      setState(() => _imageLoaded = true);
                    }
                  });
                  return child;
                }
                return const SizedBox();
              },
              errorBuilder: (context, error, stackTrace) {
                debugPrint('❌ Image load error: $error');
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted && !_imageError) {
                    setState(() => _imageError = true);
                  }
                });
                return Center(
                  child: Icon(
                    Icons.image_not_supported_outlined,
                    size: 35,
                    color: Colors.grey[300],
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton() {
    return Consumer2<CartProvider, NotificationProvider>(
      builder: (context, cartProvider, notificationProvider, child) {
        final currentQuantity = cartProvider.getItemQuantity(widget.product.id);
        final isOutOfStock = _stockStatus?.statusType == StockStatusType.outOfStock;

        Widget buttonWidget;

        if (isOutOfStock) {
          final isAlreadyRequested =
          notificationProvider.isNotificationRequested(widget.product.id);
          buttonWidget = isAlreadyRequested
              ? OutlinedButton.icon(
            key: const ValueKey('notified_button'),
            onPressed: null,
            style: OutlinedButton.styleFrom(
              padding: EdgeInsets.zero,
              side: BorderSide(color: Colors.blue.shade100),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            icon: const Icon(Icons.check, color: Colors.blue, size: 14),
            label: const Text(
              'NOTIFIED',
              style: TextStyle(
                color: Colors.blue,
                fontWeight: FontWeight.bold,
                fontSize: 10,
                letterSpacing: 0.3,
              ),
            ),
          )
              : OutlinedButton.icon(
            key: const ValueKey('notify_button'),
            onPressed: () {
              Provider.of<NotificationProvider>(context, listen: false)
                  .requestNotification(widget.product.id);
              _showSnackBar(
                'We will notify you when this is back in stock!',
                backgroundColor: Colors.blue,
              );
            },
            style: OutlinedButton.styleFrom(
              padding: EdgeInsets.zero,
              foregroundColor: Colors.blue,
              side: const BorderSide(color: Colors.blue, width: 1.5),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              backgroundColor: Colors.blue.withOpacity(0.05),
            ),
            icon: const Icon(
              Icons.notifications_active_outlined,
              color: Colors.blue,
              size: 13,
            ),
            label: Text(
              'NOTIFY',
              style: TextStyle(
                color: Colors.blue[700],
                fontWeight: FontWeight.bold,
                fontSize: 10,
                letterSpacing: 0.3,
              ),
            ),
          );
        } else if (currentQuantity > 0) {
          buttonWidget = Container(
            key: ValueKey('quantity_stepper_$currentQuantity'),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: _isProcessing ? Colors.grey.shade300 : Colors.green,
                width: 1.5,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                Expanded(
                  child: InkWell(
                    onTap: _isProcessing
                        ? null
                        : () => _updateCartQuantity(currentQuantity - 1),
                    child: Icon(
                      Icons.remove,
                      size: 18,
                      color: _isProcessing ? Colors.grey : Colors.green,
                    ),
                  ),
                ),
                SizedBox(
                  width: 24,
                  child: Center(
                    child: Text(
                      '$currentQuantity',
                      style: TextStyle(
                        color: _isProcessing ? Colors.grey : Colors.green,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    onTap: _isProcessing
                        ? null
                        : () => _updateCartQuantity(currentQuantity + 1),
                    child: Icon(
                      Icons.add,
                      size: 18,
                      color: _isProcessing ? Colors.grey : Colors.green,
                    ),
                  ),
                ),
              ],
            ),
          );
        } else {
          buttonWidget = OutlinedButton(
            key: const ValueKey('add_button'),
            onPressed: _isLoadingStock || _isProcessing
                ? null
                : () => _updateCartQuantity(1),
            style: OutlinedButton.styleFrom(
              padding: EdgeInsets.zero,
              foregroundColor: Colors.green,
              side: BorderSide(
                color: _isLoadingStock || _isProcessing
                    ? Colors.grey.shade300
                    : Colors.green,
                width: 1.5,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: _isLoadingStock || _isProcessing
                ? const BouncingDotsIndicator(color: Colors.green, size: 4)
                : const Text(
              'ADD',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          );
        }

        return SizedBox(
          width: double.infinity,
          height: 32,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            transitionBuilder: (Widget child, Animation<double> animation) {
              return FadeTransition(
                opacity: animation,
                child: ScaleTransition(scale: animation, child: child),
              );
            },
            child: buttonWidget,
          ),
        );
      },
    );
  }
}