import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/location_provider.dart';
import '../screen/address_screen.dart';
import '../services/Cart/cart_service.dart';
import '../services/navigation_service.dart';

class MainHeader extends StatefulWidget {
  const MainHeader({super.key});

  @override
  State<MainHeader> createState() => _MainHeaderState();
}

class _MainHeaderState extends State<MainHeader> {
  int cartItemCount = 0;
  bool isLoadingCart = false;

  @override
  void initState() {
    super.initState();
    // Use addPostFrameCallback to ensure context is available
    // and heavy calls are non-blocking to the initial build()
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Start both heavy processes non-blockingly
      _checkLocation();
      _loadCartItemCount();
    });
  }

  void _checkLocation() {
    // This calls the provider to check if location needs updating (GPS fetch/network)
    context.read<LocationProvider>().checkLocationUpdate();
  }

  Future<void> _loadCartItemCount() async {
    print('=== LOADING CART COUNT ===');

    if (!CartService.isAuthenticated()) {
      print('User not authenticated, setting cart count to 0');
      if (mounted) {
        setState(() {
          cartItemCount = 0;
        });
      }
      return;
    }

    if (mounted) {
      setState(() {
        isLoadingCart = true;
      });
    }

    try {
      print('Calling CartService.getCart()...');

      // âœ… PERFORMANCE FIX: Apply a timeout to the cart API call
      final cartData = await CartService.getCart().timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          print('âŒ Cart API call timed out after 10 seconds.');
          // Return an object structure that indicates failure
          return {'error': 'Timeout'};
        },
      );

      print('Cart data received: $cartData');

      if (cartData != null && cartData['error'] == null) {
        print('Cart data is valid, extracting items...');
        List<dynamic> items = [];
        if (cartData['items'] != null) {
          items = cartData['items'] as List<dynamic>;
        } else if (cartData['data'] != null && cartData['data']['items'] != null) {
          items = cartData['data']['items'] as List<dynamic>;
        } else if (cartData['data'] != null && cartData['data'] is List) {
          items = cartData['data'] as List<dynamic>;
        }
        if (mounted) {
          setState(() {
            cartItemCount = items.length;
          });
        }
        print('Cart count set to: $cartItemCount');
      } else {
        print('Cart data is null or has error: ${cartData?['error']}');
        if (mounted) {
          setState(() {
            cartItemCount = 0;
          });
        }
      }
    } catch (e) {
      print('Error loading cart count: $e');
      if (mounted) {
        setState(() {
          cartItemCount = 0;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          isLoadingCart = false;
        });
      }
    }

    print('=== CART COUNT LOADING COMPLETE ===');
  }

  void _showLocationOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.my_location, color: Colors.blue),
              title: const Text('Use Current Location'),
              subtitle: const Text('Get your GPS location'),
              onTap: () {
                // Triggers GPS fetch and updates the LocationProvider
                context.read<LocationProvider>().refreshLocation();
                Navigator.pop(context);
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.book_outlined, color: Colors.green),
              title: const Text('Select from Saved Addresses'),
              subtitle: const Text('Choose a saved address'),
              onTap: () {
                Navigator.pop(context);
                _navigateToAddressSelection();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _navigateToAddressSelection() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const AddressScreen(
          isSelectionMode: true,
        ),
      ),
    );

    // 🆕 FIX: Force check location update when returning
    if (mounted && result == true) {
      // Address was selected successfully
      await context.read<LocationProvider>().checkLocationUpdate();

      // Trigger a rebuild of parent widgets
      // This will cause HomeScreen to rebuild without disposing
    }
  }
  
  void _goToCart() {
    NavigationService.goToCartScreen();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    print(
      'MainHeader build - cartItemCount: $cartItemCount, isLoadingCart: $isLoadingCart',
    );

    return Consumer<LocationProvider>(
      builder: (context, locationProvider, child) {
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // --- LOCATION SECTION ---
            Expanded(
              child: GestureDetector(
                onTap: _showLocationOptions,
                behavior: HitTestBehavior.opaque,
                child: Row(
                  children: [
                    Icon(
                      locationProvider.isManualAddress
                          ? Icons.location_on
                          : Icons.location_pin,
                      color: Colors.red,
                    ),
                    SizedBox(width: screenWidth * 0.015),
                    Flexible(
                      child: Text(
                        locationProvider.location,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    ),
                    SizedBox(width: screenWidth * 0.01),
                    if (locationProvider.isLoading)
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    else
                      const Icon(Icons.keyboard_arrow_down),
                  ],
                ),
              ),
            ),
            // --- ACTION ICONS SECTION ---
            Row(
              children: [
                SizedBox(width: screenWidth * 0.02),
                GestureDetector(
                  onTap: _goToCart,
                  behavior: HitTestBehavior.opaque,
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        const Icon(Icons.shopping_bag),
                        if (cartItemCount > 0)
                          Positioned(
                            right: -12,
                            top: -10,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              constraints: const BoxConstraints(
                                minWidth: 18,
                                minHeight: 18,
                              ),
                              decoration: const BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                              ),
                              child: Text(
                                cartItemCount > 99 ? '99+' : cartItemCount.toString(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                        if (isLoadingCart)
                          const Positioned(
                            right: -2,
                            top: -2,
                            child: SizedBox(
                              width: 8,
                              height: 8,
                              child: CircularProgressIndicator(
                                strokeWidth: 1.5,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.red),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}