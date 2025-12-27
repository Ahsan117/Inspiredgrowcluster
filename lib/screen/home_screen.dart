import 'dart:async';
import 'dart:convert';
import 'package:eshop/screen/home/search/search_page.dart';
import 'package:flutter/material.dart' hide Banner, CarouselController;
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../main.dart';
import '../model/home/category.dart';
import '../model/home/product_model.dart';
import '../model/home/subcategory.dart';
import '../providers/cart_provider.dart';
import '../providers/location_provider.dart';
import '../services/home/api_service.dart';
import '../services/home/banner_api_service.dart';
import '../services/warehouse/testing_warehouse_service.dart';
import '../services/warehouse/warehouse_mode_controller.dart';
import '../services/warehouse/warehouse_service.dart';
import '../widget/home/USPBanner.dart';
import '../widget/home/banner_carousel.dart';
import '../widget/home/optimized_network.dart';
import '../widget/main_header.dart';
import '../widget/skeleton_widgets.dart';
import 'address_screen.dart';
import 'home/banner_products_screen.dart';
import 'home/product_screen.dart';
import '../model/home/banner_model.dart' as banner_model;
import 'home/widgets/category_products_section.dart';
import 'home/widgets/subcategory_grid.dart';
import 'home/widgets/subcategory_section.dart';
import '../authentication/user_data.dart';
import 'package:flutter/foundation.dart' as foundation;

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with AutomaticKeepAliveClientMixin, WidgetsBindingObserver, RouteAware {
  bool _isCheckingServiceability = false;
  bool _isLocationServiceable = false;
  List<Category> categories = [];
  List<Category> filteredCategories = [];
  List<Product> productSearchResults = [];
  List<String> searchSuggestions = [];
  List<String> recentSearches = [];
  List<String> popularSearches = [];
  bool showSearchSuggestions = false;
  bool isSearchFocused = false;
  bool isLoading = true;
  bool _isLoadingData = false;
  bool isSearching = false;
  bool _routeSubscribed = false;
  bool _isNavigating = false;

  // ✅ NEW: Track initialization state
  bool _isInitialized = false;

  StreamSubscription<Map<String, dynamic>>? _serviceabilitySubscription;

  String searchQuery = '';
  int selectedCategoryIndex = -1;
  String currentGreeting = 'Good Morning';

  final TextEditingController _searchController = TextEditingController();
  DateTime? _lastPressedAt;
  Timer? _debounceTimer;
  Timer? _greetingTimer;
  bool _disposed = false;

  final List<String> _inlineBannerFolders = [
    'F2', 'F3', 'F4', '25', '3', '5', '6', '7',
  ];

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    debugPrint('🟢 [HOME] ===== initState CALLED ===== ${DateTime.now()}');

    WidgetsBinding.instance.addObserver(this);

    // ✅ OPTIMIZATION 1: Initialize greeting immediately (no async)
    _updateGreeting();
    _setupGreetingTimer();

    // ✅ OPTIMIZATION 2: Use addPostFrameCallback for heavy operations
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        debugPrint('🟢 [HOME] postFrameCallback - Starting initialization');
        _initializeScreen();
      }
    });
  }

  // ✅ NEW: Centralized initialization with parallel loading
  Future<void> _initializeScreen() async {
    if (_isInitialized) {
      debugPrint('⚠️ [INIT] Already initialized, skipping');
      return;
    }

    _isInitialized = true;

    try {
      // ✅ OPTIMIZATION 3: Load everything in parallel
      await Future.wait([
        _loadInitialDataFast(),
        _setupServiceabilityListenerAsync(),
        _startLocationTrackingAsync(),
      ], eagerError: false); // Continue even if one fails

    } catch (e) {
      debugPrint('❌ [INIT] Error during initialization: $e');
    }
  }

  // ✅ OPTIMIZATION 4: Fast category loading without serviceability check
  Future<void> _loadInitialDataFast() async {
    if (_disposed || !mounted) return;

    if (_isLoadingData) {
      debugPrint('⚠️ [LOAD] Already loading data, skipping...');
      return;
    }

    try {
      _isLoadingData = true;
      debugPrint('🔄 [LOAD] Starting FAST category load...');

      if (mounted) setState(() => isLoading = true);

      // ✅ Load categories immediately without waiting for serviceability
      final loadedCategories = await ApiService.getCategories();

      if (_disposed || !mounted) {
        debugPrint('⚠️ [LOAD] Aborted - widget disposed during load');
        return;
      }

      debugPrint('✅ [LOAD] Loaded ${loadedCategories.length} categories FAST');

      setState(() {
        categories = loadedCategories;
        filteredCategories = loadedCategories;
        isLoading = false;
      });

      // ✅ OPTIMIZATION 5: Preload images in background (non-blocking)
      if (categories.isNotEmpty) {
        _preloadCriticalImagesAsync();
      }

      // ✅ Check serviceability AFTER showing categories
      _checkWarehouseServiceabilityAsync();

    } catch (e) {
      debugPrint('❌ [LOAD] Error loading categories: $e');
      if (mounted) {
        setState(() => isLoading = false);
        _showErrorSnackBar('Error loading categories. Pull down to refresh.');
      }
    } finally {
      _isLoadingData = false;
      debugPrint('✅ [LOAD] Loading completed');
    }
  }

  // ✅ NEW: Async wrapper for serviceability setup
  Future<void> _setupServiceabilityListenerAsync() async {
    try {
      _setupServiceabilityListener();
    } catch (e) {
      debugPrint('⚠️ [INIT] Error setting up serviceability listener: $e');
    }
  }

  // ✅ NEW: Async wrapper for location tracking
  Future<void> _startLocationTrackingAsync() async {
    try {
      if (mounted) {
        context.read<LocationProvider>().startLocationTracking();
      }
    } catch (e) {
      debugPrint('⚠️ [INIT] Error starting location tracking: $e');
    }
  }

  // ✅ NEW: Async wrapper for serviceability check
  Future<void> _checkWarehouseServiceabilityAsync() async {
    try {
      await _checkWarehouseServiceability();
    } catch (e) {
      debugPrint('⚠️ [INIT] Error checking serviceability: $e');
    }
  }

  // ✅ OPTIMIZATION 6: Non-blocking image preload
  void _preloadCriticalImagesAsync() {
    if (_disposed || !mounted) return;

    // Don't await - let it run in background
    Future.microtask(() async {
      try {
        // Only preload first category
        if (categories.isEmpty) return;

        final category = categories.first;
        final subcategories = await ApiService.getSubCategories(category.id);

        if (_disposed || !mounted) return;

        // Preload only 2 images max
        final imageUrls = subcategories
            .where((sub) => sub.image.isNotEmpty)
            .take(2)
            .map((sub) => ApiService.getImageUrl(sub.image, 'subcategory'))
            .toList();

        for (final url in imageUrls) {
          if (mounted) {
            precacheImage(CachedNetworkImageProvider(url), context);
          }
        }

        debugPrint('✅ [PRELOAD] Preloaded ${imageUrls.length} critical images');
      } catch (e) {
        debugPrint('⚠️ [PRELOAD] Error preloading images: $e');
      }
    });
  }

  void _setupServiceabilityListener() {
    _serviceabilitySubscription = context
        .read<LocationProvider>()
        .onServiceabilityChange
        .listen((event) {
      if (!mounted || _disposed) return;

      final isServiceable = event['isServiceable'] as bool;
      final zoneName = event['zoneName'] as String?;

      debugPrint('🔄 Serviceability changed: $isServiceable (Zone: $zoneName)');

      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || _disposed) return;

        setState(() {
          _isLocationServiceable = isServiceable;
        });

        if (isServiceable) {
          // ✅ OPTIMIZATION 7: Don't reload categories, just update state
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('✅ You entered a delivery zone: $zoneName'),
                backgroundColor: Colors.green,
                duration: const Duration(seconds: 3),
              ),
            );
          }
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('❌ You left the delivery zone'),
                backgroundColor: Colors.orange,
                duration: Duration(seconds: 3),
              ),
            );
          }
        }
      });
    });
  }

  @override
  void dispose() {
    debugPrint('🔴 [HOME] ===== dispose CALLED ===== ${DateTime.now()}');
    _disposed = true;

    _serviceabilitySubscription?.cancel();
    _debounceTimer?.cancel();
    _greetingTimer?.cancel();

    routeObserver.unsubscribe(this);
    WidgetsBinding.instance.removeObserver(this);
    _searchController.dispose();

    super.dispose();
  }

  @override
  void deactivate() {
    debugPrint('⚠️ [HOME] ===== deactivate CALLED =====');
    try {
      if (mounted) {
        context.read<LocationProvider>().stopLocationTracking();
      }
    } catch (e) {
      debugPrint('⚠️ Error stopping location tracking in deactivate: $e');
    }
    super.deactivate();
  }

  @override
  void didPush() {
    debugPrint('🟡 [HOME] ===== didPush CALLED ===== (Screen pushed)');
    super.didPush();
  }

  @override
  void didPushNext() {
    debugPrint('⚫ [HOME] ===== didPushNext CALLED ===== (Navigated to another screen)');
    _isNavigating = true;
    super.didPushNext();
  }

  @override
  void didPopNext() {
    debugPrint('🔵 [HOME] ===== didPopNext CALLED ===== (Returned from another screen)');
    _isNavigating = false;

    if (mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;

        Provider.of<CartProvider>(context, listen: false).loadCart();
        _performServiceabilityCheck();

        final locationProvider = context.read<LocationProvider>();
        if (locationProvider.autoReloadEnabled && !locationProvider.isManualAddress) {
          locationProvider.startLocationTracking();
        }
      });
    }
    super.didPopNext();
  }

  Future<void> _performServiceabilityCheck() async {
    if (!mounted || _disposed) return;

    final userData = UserData();
    if (!userData.isLoggedIn()) {
      if (mounted && !_disposed) {
        setState(() => _isLocationServiceable = false);
      }
      return;
    }

    try {
      WarehouseModeController.printCurrentMode();

      if (WarehouseModeController.isTestingMode) {
        final isValid = await TestingWarehouseService.validateTestingServiceability();
        if (mounted && !_disposed) {
          setState(() => _isLocationServiceable = isValid);
        }
      } else {
        final token = userData.getToken();
        if (token == null) {
          if (mounted && !_disposed) {
            setState(() => _isLocationServiceable = false);
          }
          return;
        }

        final user = userData.getCurrentUser();
        bool hasSavedLocation = user?.userLatitude != null &&
            user?.userLongitude != null &&
            user?.userAddress != null;

        if (hasSavedLocation) {
          final zoneResult = await _checkSavedAddressZone(
            user!.userLatitude!,
            user.userLongitude!,
            token,
          );

          if (mounted && !_disposed) {
            final wasServiceable = _isLocationServiceable;
            final isNowServiceable = zoneResult['inside'] == true;

            setState(() {
              _isLocationServiceable = isNowServiceable;
            });

            // ✅ OPTIMIZATION 8: Only reload if changing from not serviceable to serviceable
            if (!wasServiceable && isNowServiceable && mounted && !_disposed && categories.isEmpty) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted && !_disposed) {
                  _loadInitialDataFast();
                }
              });
            }
          }
        }
      }
    } catch (e) {
      if (mounted && !_disposed) {
        setState(() => _isLocationServiceable = false);
      }
    }
  }

  @override
  void didChangeDependencies() {
    debugPrint('🟠 [HOME] ===== didChangeDependencies CALLED =====');
    super.didChangeDependencies();

    if (!_routeSubscribed) {
      final route = ModalRoute.of(context);
      if (route is PageRoute) {
        routeObserver.subscribe(this, route);
        _routeSubscribed = true;
        debugPrint('✅ [HOME] Route observer subscribed (first time only)');
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    debugPrint('📱 [HOME] App lifecycle state: $state');
    if (state == AppLifecycleState.resumed && mounted) {
      _updateGreeting();
      Provider.of<CartProvider>(context, listen: false).loadCart();
    }
  }

  Future<void> _checkWarehouseServiceability() async {
    if (_isCheckingServiceability) return;

    _isCheckingServiceability = true;

    try {
      await _performServiceabilityCheck();
    } finally {
      _isCheckingServiceability = false;
    }
  }

  Future<Map<String, dynamic>> _checkSavedAddressZone(
      double lat,
      double lng,
      String token,
      ) async {
    final url = Uri.parse('${ZoneWarehouseService.baseUrl}/check-location');

    try {
      final response = await http.post(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'lat': lat, 'lng': lng}),
      ).timeout(const Duration(seconds: 5)); // ✅ Add timeout

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data['success'] == true) {
          final inside = data['inside'] ?? false;

          if (inside) {
            return {
              'inside': true,
              'zoneId': data['zoneId'],
              'zoneName': data['zoneName'],
              'storeId': data['storeId'],
              'deliveryFee': (data['deliveryFee'] ?? 0).toDouble(),
              'minOrder': (data['minOrder'] ?? 0).toDouble(),
            };
          }
        }
      }

      return {'inside': false};
    } catch (e) {
      debugPrint('⚠️ Error checking zone: $e');
      return {'inside': false};
    }
  }

  void _updateGreeting() {
    if (_disposed) return;

    try {
      final hour = DateTime.now().hour;
      String greeting;
      if (hour >= 5 && hour < 12) {
        greeting = 'Good Morning';
      } else if (hour >= 12 && hour < 17) {
        greeting = 'Good Afternoon';
      } else if (hour >= 17 && hour < 21) {
        greeting = 'Good Evening';
      } else {
        greeting = 'Good Night';
      }

      if (greeting != currentGreeting && mounted) {
        setState(() => currentGreeting = greeting);
      }
    } catch (e) {
      debugPrint('Error updating greeting: $e');
    }
  }
  void _setupGreetingTimer() {
    _greetingTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      if (mounted) _updateGreeting();
    });
  }

  // ✅ REMOVED: _loadInitialData (replaced with _loadInitialDataFast)

  // ✅ OPTIMIZATION 9: Removed old _preloadCriticalImages method
  // (now using _preloadCriticalImagesAsync)

  Future<void> searchProducts(String query) async {
    final trimmedQuery = query.trim();
    if (trimmedQuery.isEmpty) {
      if (mounted) {
        setState(() {
          isSearching = false;
          productSearchResults = [];
        });
      }
      return;
    }

    if (mounted) setState(() => isSearching = true);

    try {
      final results = await ApiService.searchProductsWithPrices(trimmedQuery);
      if (_disposed || !mounted || query != searchQuery) return;
      setState(() {
        productSearchResults = results;
        isSearching = false;
      });
    } catch (e) {
      debugPrint('Search error: $e');
      if (mounted && query == searchQuery) {
        setState(() => isSearching = false);
        _showErrorSnackBar('Search failed. Please try again.');
      }
    }
  }

  void onSearchChanged(String query) {
    if (_disposed) return;

    setState(() => searchQuery = query);
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 600), () {
      if (mounted && query == searchQuery) {
        searchProducts(query);
      }
    });
  }

  Future<void> _handleRefresh() async {
    if (_disposed) return;
    try {
      ApiService.clearCache();

      // ✅ OPTIMIZATION 10: Parallel refresh
      await Future.wait([
        _checkWarehouseServiceability(),
        _loadInitialDataFast(),
      ]);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Data refreshed successfully'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      debugPrint('Refresh error: $e');
      if (mounted) {
        _showErrorSnackBar('Failed to refresh data');
      }
    }
  }

  Widget _buildNotServiceableScreen() {
    return SingleChildScrollView(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  color: Colors.orange[50],
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.location_off_outlined,
                  size: 100,
                  color: Colors.orange[400],
                ),
              ),
              const SizedBox(height: 32),
              const Text(
                'Currently Not Available',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'We\'re not delivering to your location yet.\nWe\'ll notify you once we start serving your area.',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey[600],
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () {
                  _checkWarehouseServiceabilityAsync();
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Check Again'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const AddressScreen(
                        isSelectionMode: true,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.edit_location_alt),
                label: const Text('Select Address'),
                style: TextButton.styleFrom(foregroundColor: Colors.blue),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingContent() {
    return Column(
      children: [
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            children: [
              const Padding(padding: EdgeInsets.all(16), child: MainHeader()),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SkeletonWidgets.buildCardSkeleton(
                            width: 120,
                            height: 16,
                            margin: EdgeInsets.zero,
                            padding: EdgeInsets.zero,
                          ),
                          const SizedBox(height: 8),
                          SkeletonWidgets.buildCardSkeleton(
                            width: 200,
                            height: 18,
                            margin: EdgeInsets.zero,
                            padding: EdgeInsets.zero,
                          ),
                        ],
                      ),
                    ),
                    SkeletonWidgets.buildCardSkeleton(
                      width: 40,
                      height: 40,
                      margin: EdgeInsets.zero,
                      padding: EdgeInsets.zero,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: SkeletonWidgets.buildCardSkeleton(
                  width: double.infinity,
                  height: 50,
                  margin: EdgeInsets.zero,
                  padding: EdgeInsets.zero,
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              children: [
                _buildDeliveryStatusSkeleton(),
                Container(
                  height: 50,
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: 5,
                    itemBuilder: (context, index) => Container(
                      margin: const EdgeInsets.only(right: 8),
                      child: SkeletonWidgets.buildCardSkeleton(
                        width: 80,
                        height: 35,
                        margin: EdgeInsets.zero,
                        padding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                ),
                _buildBannerSkeleton(),
                _buildCategoriesLoadingSkeleton(),
                _buildPopularSubcategoriesSkeleton(),
                SkeletonWidgets.buildInitialLoadingSkeleton(
                  message: 'Loading categories...',
                  dotColor: Colors.red,
                  dotSize: 8.0,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDeliveryStatusSkeleton() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SkeletonWidgets.buildCardSkeleton(
        width: double.infinity,
        height: 60,
        margin: EdgeInsets.zero,
      ),
    );
  }

  Widget _buildBannerSkeleton({double aspectRatio = 2.2 / 1}) {
    return AspectRatio(
      aspectRatio: aspectRatio,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 20),
        child: SkeletonWidgets.buildCardSkeleton(
          width: double.infinity,
          height: double.infinity,
          margin: EdgeInsets.zero,
        ),
      ),
    );
  }

  Widget _buildPopularSubcategoriesSkeleton() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SkeletonWidgets.buildCardSkeleton(
              width: 180,
              height: 22,
              margin: EdgeInsets.zero,
              padding: EdgeInsets.zero,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(height: 120, child: _buildHorizontalSubcategorySkeleton()),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    if (_isNavigating) {
      debugPrint('⏸️ [HOME] Skipping rebuild - navigation in progress');
      return const SizedBox.shrink();
    }

    debugPrint('🔨 [HOME] build() called - isLoading: $isLoading, categories: ${categories.length}');

    if (_disposed) return const SizedBox.shrink();

    return PopScope(
      canPop: false,
      onPopInvoked: (bool didPop) {
        if (didPop) return;
        _handleBackPress();
      },
      child: Scaffold(
        backgroundColor: Colors.grey[50],
        body: SafeArea(
          child: RefreshIndicator(
            onRefresh: _handleRefresh,
            color: Colors.red,
            child: isLoading && categories.isEmpty
                ? _buildLoadingContent()
                : CustomScrollView(
              key: PageStorageKey<String>('home_scroll'),
              physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              slivers: [
                SliverToBoxAdapter(child: _buildHeader()),
                SliverToBoxAdapter(
                  child: _isCheckingServiceability
                      ? _buildDeliveryStatusSkeleton()
                      : const USPBannerWidget(),
                ),
                ..._buildSliverMainContent(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildSliverMainContent() {
    if (!_isLocationServiceable) {
      return [SliverFillRemaining(child: _buildNotServiceableScreen())];
    }

    final bool isSpecificCategorySelected = selectedCategoryIndex != -1;

    return [
      if (!isLoading && categories.isNotEmpty) ...[
        SliverToBoxAdapter(child: _buildCategoryChips()),
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
      ],

      if (!isLoading && !isSpecificCategorySelected) ...[
        SliverToBoxAdapter(
          child: Container(
            margin: const EdgeInsets.fromLTRB(16, 0, 16, 20),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: BannerCarousel(
                onBannerTap: _handleBannerTap,
                aspectRatio: 1.8 / 1,
                folderName: 'F1',
              ),
            ),
          ),
        ),
      ] else if (isLoading && !isSpecificCategorySelected) ...[
        SliverToBoxAdapter(child: _buildBannerSkeleton(aspectRatio: 1.8 / 1)),
      ],

      SliverToBoxAdapter(
        child: Container(
          margin: const EdgeInsets.only(top: 8, bottom: 12),
          child: _buildCategoriesSection(),
        ),
      ),

      if (!isLoading && categories.isNotEmpty && !isSpecificCategorySelected) ...[
        SliverToBoxAdapter(child: _buildPopularSubcategoriesSection()),
      ] else if (isLoading && !isSpecificCategorySelected) ...[
        SliverToBoxAdapter(child: _buildPopularSubcategoriesSkeleton()),
      ],

      if (isLoading)
        SliverToBoxAdapter(child: _buildInitialLoadingSkeleton())
      else
        ..._buildCategoriesWithBanners(),

      const SliverToBoxAdapter(child: SizedBox(height: 80)),
    ];
  }

  Widget _buildPopularSubcategoriesSection() {
    if (categories.isEmpty) return const SizedBox.shrink();

    final shuffledCategories = List.of(categories)..shuffle();
    final randomCategory = shuffledCategories.first;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              'Popular Categories',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 120,
            child: FutureBuilder<List<SubCategory>>(
              future: ApiService.getSubCategories(randomCategory.id),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return _buildHorizontalSubcategorySkeleton();
                }

                if (snapshot.hasError || !snapshot.hasData) {
                  return Center(
                    child: SkeletonWidgets.buildInitialLoadingSkeleton(
                      message: 'Failed to load categories',
                      dotColor: Colors.red,
                      padding: const EdgeInsets.all(20),
                    ),
                  );
                }

                final subcategories = List.of(snapshot.data!)..shuffle();

                return SubcategoryGrid(
                  subcategories: subcategories,
                  onSubcategoryTap: (subcategory) => _navigateToSubcategories(
                    randomCategory,
                    selectedSubcategoryId: subcategory.id,
                  ),
                  maxItemsToShow: 4,
                  imageSize: 80,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHorizontalSubcategorySkeleton() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: List.generate(
          4,
              (index) => Expanded(
            child: Container(
              alignment: Alignment.center,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  SkeletonWidgets.buildCardSkeleton(
                    width: 80,
                    height: 80,
                    margin: EdgeInsets.zero,
                    padding: EdgeInsets.zero,
                  ),
                  const SizedBox(height: 8),
                  SkeletonWidgets.buildCardSkeleton(
                    width: 60,
                    height: 12,
                    margin: EdgeInsets.zero,
                    padding: EdgeInsets.zero,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildCategoriesWithBanners() {
    final List<Widget> widgets = [];

    if (_inlineBannerFolders.isEmpty) {
      debugPrint("_inlineBannerFolders is empty. No inline banners will be shown.");

      for (int i = 0; i < filteredCategories.length; i++) {
        final category = filteredCategories[i];
        widgets.add(
          SliverToBoxAdapter(
            child: SubcategorySection(
              key: ValueKey('main_subcategory_${category.id}'),
              category: category,
              onSubcategoryTap: (subcategory) => _navigateToSubcategories(
                category,
                selectedSubcategoryId: subcategory.id,
              ),
              maxItemsToShow: 8,
              showTitle: true,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
        );
      }
      for (int i = 0; i < filteredCategories.length; i++) {
        final category = filteredCategories[i];
        widgets.add(const SliverToBoxAdapter(child: SizedBox(height: 8)));
        widgets.add(
          SliverToBoxAdapter(
            child: CategoryProductsSection(
              key: ValueKey('products_${category.id}'),
              category: category,
            ),
          ),
        );
        widgets.add(const SliverToBoxAdapter(child: SizedBox(height: 12)));
      }
      return widgets;
    }

    for (int i = 0; i < filteredCategories.length; i++) {
      final category = filteredCategories[i];
      widgets.add(
        SliverToBoxAdapter(
          child: SubcategorySection(
            key: ValueKey('main_subcategory_${category.id}'),
            category: category,
            onSubcategoryTap: (subcategory) => _navigateToSubcategories(
              category,
              selectedSubcategoryId: subcategory.id,
            ),
            maxItemsToShow: 8,
            showTitle: true,
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
        ),
      );
      widgets.add(const SliverToBoxAdapter(child: SizedBox(height: 12)));

      if ((i + 1) % 2 == 0 && i < filteredCategories.length - 1) {
        final folderIndex = (i ~/ 2) % _inlineBannerFolders.length;
        final folderName = _inlineBannerFolders[folderIndex];

        widgets.add(
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: BannerCarousel(
                  onBannerTap: _handleBannerTap,
                  aspectRatio: 1.8 / 1,
                  folderName: folderName,
                ),
              ),
            ),
          ),
        );
      }
    }

    for (int i = 0; i < filteredCategories.length; i++) {
      final category = filteredCategories[i];
      widgets.add(const SliverToBoxAdapter(child: SizedBox(height: 8)));
      widgets.add(
        SliverToBoxAdapter(
          child: CategoryProductsSection(
            key: ValueKey('products_${category.id}'),
            category: category,
          ),
        ),
      );
      widgets.add(const SliverToBoxAdapter(child: SizedBox(height: 12)));

      if ((i + 1) % 3 == 0 && i < filteredCategories.length - 1) {
        final int firstLoopBannerCount = (filteredCategories.length - 1) ~/ 2;
        final int folderIndex =
            (firstLoopBannerCount + (i ~/ 3)) % _inlineBannerFolders.length;
        final folderName = _inlineBannerFolders[folderIndex];

        widgets.add(
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: BannerCarousel(
                  onBannerTap: _handleBannerTap,
                  aspectRatio: 1.8 / 1,
                  folderName: folderName,
                ),
              ),
            ),
          ),
        );
      }
    }

    return widgets;
  }

  void _handleBannerTap(banner_model.Banner banner, int mediaIndex) async {
    foundation.debugPrint('Banner tapped: ${banner.title}, Media Index: $mediaIndex');

    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(color: Colors.red),
              const SizedBox(height: 16),
              Text(
                'Loading products...',
                style: TextStyle(fontSize: 14, color: Colors.grey[700]),
              ),
            ],
          ),
        ),
      ),
    );

    try {
      banner_model.BannerMedia? specificMedia;
      if (banner.media != null && mediaIndex < banner.media!.length) {
        specificMedia = banner.media![mediaIndex];
      }

      List<Product> products;

      if (specificMedia != null) {
        products = await BannerApiService.getProductsForSpecificMedia(
          banner,
          specificMedia,
        );
        foundation.debugPrint('✅ Fetched ${products.length} products for specific media');
      } else {
        products = await BannerApiService.getProductsForBanner(banner);
        foundation.debugPrint('✅ Fetched ${products.length} products (fallback)');
      }

      if (!mounted) return;
      Navigator.pop(context);

      if (products.isEmpty) {
        _showSnackBar(
          'No products available for this banner',
          backgroundColor: Colors.orange,
        );
        return;
      }

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => BannerProductsScreen(
            banner: banner,
            products: products,
            mediaItem: specificMedia,
          ),
        ),
      );
    } catch (e) {
      foundation.debugPrint('🚨 Error handling banner tap: $e');

      if (!mounted) return;
      Navigator.pop(context);

      _showSnackBar(
        'Failed to load banner products',
        backgroundColor: Colors.red,
      );
    }
  }

  void _showSnackBar(String message, {Color? backgroundColor}) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: backgroundColor ?? Colors.grey[800],
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Widget _buildCategoriesSection() {
    if (categories.isEmpty) {
      return _buildCategoriesLoadingSkeleton();
    }
    final displayCategories = categories.take(6).toList();

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Shop by Category',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                if (categories.length > 6)
                  TextButton(
                    onPressed: _showAllCategoriesBottomSheet,
                    child: const Text(
                      'View All',
                      style: TextStyle(
                        color: Colors.red,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                Row(
                  children: [
                    for (int i = 0; i < 3 && i < displayCategories.length; i++) ...[
                      Expanded(
                        child: _buildSimpleCategoryCard(displayCategories[i]),
                      ),
                      if (i < 2) const SizedBox(width: 16),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                if (displayCategories.length > 3)
                  Row(
                    children: [
                      for (int i = 3; i < 6 && i < displayCategories.length; i++) ...[
                        Expanded(
                          child: _buildSimpleCategoryCard(displayCategories[i]),
                        ),
                        if (i < 5) const SizedBox(width: 16),
                      ],
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSimpleCategoryCard(Category category) {
    return GestureDetector(
      onTap: () => _navigateToSubcategories(category),
      child: Container(
        height: 160,
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey[200]!, width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Expanded(
              flex: 3,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: category.image.isNotEmpty == true
                      ? OptimizedNetworkImage(
                    imageUrl: category.image,
                    imageType: 'category',
                    width: double.infinity,
                    height: double.infinity,
                    fit: BoxFit.cover,
                  )
                      : Container(
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        category.name.isNotEmpty
                            ? category.name[0].toUpperCase()
                            : '?',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[500],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Expanded(
              flex: 1,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                child: Center(
                  child: Text(
                    category.name,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                      height: 1.1,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoriesLoadingSkeleton() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                SkeletonWidgets.buildCardSkeleton(
                  width: 180,
                  height: 26,
                  margin: EdgeInsets.zero,
                  padding: EdgeInsets.zero,
                ),
                SkeletonWidgets.buildCardSkeleton(
                  width: 60,
                  height: 20,
                  margin: EdgeInsets.zero,
                  padding: EdgeInsets.zero,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                Row(
                  children: [
                    for (int i = 0; i < 3; i++) ...[
                      Expanded(child: _buildCategoryCardSkeleton()),
                      if (i < 2) const SizedBox(width: 16),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    for (int i = 0; i < 3; i++) ...[
                      Expanded(child: _buildCategoryCardSkeleton()),
                      if (i < 2) const SizedBox(width: 16),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryCardSkeleton() {
    return SkeletonWidgets.buildCardSkeleton(
      height: 160,
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(12),
    );
  }

  void _showAllCategoriesBottomSheet() {
    if (!mounted) return;

    final sortedCategories = List<Category>.from(categories)
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(20),
              child: Text(
                'All Categories',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
            ),
            Expanded(
              child: GridView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  childAspectRatio: 0.85,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: sortedCategories.length,
                itemBuilder: (context, index) {
                  return _buildSimpleCategoryCard(sortedCategories[index]);
                },
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(padding: EdgeInsets.all(16), child: MainHeader()),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 300),
                        child: Text(
                          '$currentGreeting,',
                          key: ValueKey(currentGreeting),
                          style: const TextStyle(
                            fontSize: 16,
                            color: Colors.grey,
                          ),
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'What would you like to order?',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _getGreetingColor(),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: Icon(
                      _getGreetingIcon(),
                      key: ValueKey(currentGreeting),
                      color: _getGreetingIconColor(),
                      size: 24,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _buildSearchBar(),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Color _getGreetingColor() {
    try {
      final hour = DateTime.now().hour;
      if (hour >= 5 && hour < 12) return Colors.orange[50]!;
      if (hour >= 12 && hour < 17) return Colors.yellow[50]!;
      if (hour >= 17 && hour < 21) return Colors.purple[50]!;
      return Colors.indigo[50]!;
    } catch (e) {
      return Colors.grey.shade50;
    }
  }

  IconData _getGreetingIcon() {
    try {
      final hour = DateTime.now().hour;
      if (hour >= 5 && hour < 12) return Icons.wb_sunny;
      if (hour >= 12 && hour < 17) return Icons.wb_sunny;
      if (hour >= 17 && hour < 21) return Icons.wb_twilight;
      return Icons.nightlight_round;
    } catch (e) {
      return Icons.wb_sunny;
    }
  }

  Color _getGreetingIconColor() {
    try {
      final hour = DateTime.now().hour;
      if (hour >= 5 && hour < 12) return Colors.orange;
      if (hour >= 12 && hour < 17) return Colors.amber;
      if (hour >= 17 && hour < 21) return Colors.purple;
      return Colors.indigo;
    } catch (e) {
      return Colors.grey;
    }
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GestureDetector(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const SearchPage()),
          );
        },
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Row(
            children: [
              const Icon(Icons.search, color: Colors.red, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Search for food, groceries, medicines...',
                  style: TextStyle(color: Colors.grey[400], fontSize: 16),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryChips() {
    return SizedBox(
      height: 50,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return _buildCategoryChip('All', selectedCategoryIndex == -1, () {
              if (mounted) {
                setState(() {
                  selectedCategoryIndex = -1;
                  filteredCategories = categories;
                });
              }
            });
          }

          final categoryIndex = index - 1;
          final category = categories[categoryIndex];
          return _buildCategoryChip(
            category.name,
            selectedCategoryIndex == categoryIndex,
                () {
              if (mounted) {
                setState(() {
                  selectedCategoryIndex = categoryIndex;
                  filteredCategories = [category];
                });
              }
            },
          );
        },
      ),
    );
  }

  Widget _buildCategoryChip(String label, bool isSelected, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) => onTap(),
        selectedColor: Colors.red,
        labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black),
        backgroundColor: Colors.white,
        shape: StadiumBorder(
          side: BorderSide(color: isSelected ? Colors.red : Colors.grey[300]!),
        ),
      ),
    );
  }

  void _navigateToSubcategories(
      Category category, {
        String? selectedSubcategoryId,
      }) async {
    debugPrint('🚀 [NAVIGATION] Starting navigation for category: ${category.name}');
    debugPrint('🚀 [NAVIGATION] Selected subcategory ID: $selectedSubcategoryId');

    try {
      debugPrint('🔄 [NAVIGATION] Fetching subcategories...');

      _isNavigating = true;

      final subcategories = await ApiService.getSubCategories(category.id);

      debugPrint('✅ [NAVIGATION] Got ${subcategories.length} subcategories');

      if (!mounted) {
        debugPrint('⚠️ [NAVIGATION] Widget not mounted, aborting');
        return;
      }

      if (subcategories.isEmpty) {
        debugPrint('⚠️ [NAVIGATION] No subcategories found');
        _showSnackBar('No products available in ${category.name}');
        return;
      }

      final targetSubcategory =
      selectedSubcategoryId != null
          ? subcategories.firstWhere(
            (sub) => sub.id == selectedSubcategoryId,
        orElse: () => subcategories.first,
      )
          : subcategories.first;

      debugPrint('🎯 [NAVIGATION] Target subcategory: ${targetSubcategory.name}');
      debugPrint('➡️ [NAVIGATION] Navigating to ProductsScreen...');

      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) {
            debugPrint('🗝️ [NAVIGATION] Building ProductsScreen');
            return ProductsScreen(
              categoryId: category.id,
              subcategoryId: targetSubcategory.id,
              subcategoryName: targetSubcategory.name,
            );
          },
        ),
      );

      _isNavigating = false;
      debugPrint('⬅️ [NAVIGATION] Returned from ProductsScreen');
      debugPrint('🏠 [NAVIGATION] Back on HomeScreen');
    } catch (e) {
      _isNavigating = false;
      debugPrint('❌ [NAVIGATION] ERROR: $e');

      if (mounted) {
        _showSnackBar('Failed to load products. Please try again.');
      }
    }
  }

  void _handleBackPress() {
    final now = DateTime.now();
    if (_lastPressedAt == null ||
        now.difference(_lastPressedAt!) > const Duration(seconds: 2)) {
      _lastPressedAt = now;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Press back again to exit'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } else {
      SystemNavigator.pop();
    }
  }

  void _showErrorSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
          action: SnackBarAction(
            label: 'RETRY',
            textColor: Colors.white,
            onPressed: _handleRefresh,
          ),
        ),
      );
    }
  }

  Widget _buildInitialLoadingSkeleton() {
    return SkeletonWidgets.buildInitialLoadingSkeleton(
      message: 'Loading categories...',
      dotColor: Colors.red,
      dotSize: 8.0,
    );
  }
}