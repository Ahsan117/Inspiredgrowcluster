import 'package:eshop/screen/SubScreen/Comming_Soon_Screen.dart';
import 'package:eshop/screen/booking_screen.dart';
import 'package:eshop/screen/cart_screen.dart';
import 'package:eshop/screen/category_screen.dart';
import 'package:eshop/screen/home_screen.dart';
import 'package:eshop/screen/setting_screen.dart';
import 'package:eshop/services/navigation_service.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:eshop/providers/cart_provider.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({
    super.key,
    required this.userName,
    required this.email,
    required this.phone,
  });

  final String email;
  final String phone;
  final String userName;

  @override
  _MainNavigationState createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  final List<IconData> icons = [
    Icons.home,
    Icons.directions_bus,
    Icons.apps,
    Icons.shopping_cart,
    Icons.person,
  ];

  final List<String> labels = [
    'Home',
    'Booking',
    'Categories',
    'Cart',
    'Profile',
  ];

  late final List<Widget> pages;
  int selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    pages = [
      HomeScreen(),
      VanRoutePage(), // Assuming this is the correct name
      CategoriesScreen(),
      CartScreen(),
      SettingScreen(),
    ];

    NavigationService.onTabChange = (index) {
      if (mounted) {
        setState(() {
          selectedIndex = index;
        });
      }
    };
  }

  @override
  Widget build(BuildContext context) {
    // Use LayoutBuilder for adaptive UI
    return LayoutBuilder(
      builder: (context, constraints) {
        // Wide screen layout (Tablet/Web)
        if (constraints.maxWidth > 600) {
          return Scaffold(
            body: Row(
              children: [
                NavigationRail(
                  selectedIndex: selectedIndex,
                  onDestinationSelected:
                      (index) => setState(() => selectedIndex = index),
                  labelType: NavigationRailLabelType.all,
                  destinations: List.generate(icons.length, (i) {
                    return NavigationRailDestination(
                      icon: Icon(icons[i]),
                      label: Text(labels[i]),
                    );
                  }),
                ),
                const VerticalDivider(thickness: 1, width: 1),
                Expanded(child: pages[selectedIndex]),
              ],
            ),
          );
        }

        // Narrow screen layout (Phone) - Your original UI structure
        // Use a Stack so we can overlay a "View Cart" bar above the bottom navigation
        return Stack(
          children: [
            Scaffold(
              body: pages[selectedIndex],
              bottomNavigationBar: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      // --- 1. Left Floating Selected Item ---
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.red[800],
                          borderRadius: BorderRadius.circular(30),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min, // Important!
                          children: [
                            Icon(icons[selectedIndex], color: Colors.white),
                            const SizedBox(width: 6),
                            // ✅ KEY FIX #1: Use FittedBox to prevent text overflow
                            Flexible(
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text(
                                  labels[selectedIndex],
                                  style: const TextStyle(color: Colors.white),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),

                      // --- 2. Remaining Navigation Icons (in rounded grey container) ---
                      Expanded(
                        child: Container(
                          height: 60,
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          decoration: BoxDecoration(
                            color: Colors.grey[200],
                            borderRadius: BorderRadius.circular(30),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children:
                                List.generate(icons.length, (index) {
                                      // Don't render the selected item here
                                      if (index == selectedIndex) {
                                        return const Spacer(); // Use a Spacer to maintain position
                                      }
                                      // ✅ KEY FIX #2: Wrap each tappable icon in Expanded
                                      return Expanded(
                                        child: GestureDetector(
                                          onTap:
                                              () => setState(
                                                () => selectedIndex = index,
                                              ),
                                          behavior:
                                              HitTestBehavior
                                                  .opaque, // Ensures the whole expanded area is tappable
                                          child: Icon(
                                            icons[index],
                                            color: Colors.grey[700],
                                          ),
                                        ),
                                      );
                                    })
                                    .where((widget) => widget is! Spacer)
                                    .toList(), // Filter out the spacer visually but keep its space
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Positioned View Cart bar above the bottom navigation
            // Positioned View Cart bar above the bottom navigation
            Positioned(
              bottom:
                  MediaQuery.of(context).size.height *
                  0.12, // Dynamic distance from bottom
              left: 0,
              right: 0,
              child: Center(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    // Get screen width
                    final screenWidth = MediaQuery.of(context).size.width;

                    // Dynamically adjust button width based on screen width
                    double buttonWidth;
                    if (screenWidth < 460) {
                      buttonWidth = screenWidth * 0.45; // Medium phones
                    } else {
                      buttonWidth =
                          screenWidth * 0.8; // Larger screens / tablets
                    }

                    return Consumer<CartProvider>(
                      builder: (context, cartProvider, child) {
                        final itemCount = cartProvider.totalItemsInCart;
                        if (itemCount <= 0 ||
                            labels[selectedIndex] == 'Cart' ||
                            labels[selectedIndex] == 'Booking' ||
                            labels[selectedIndex] == 'Profile') {
                          return const SizedBox.shrink();
                        }

                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                          width: buttonWidth,
                          decoration: BoxDecoration(
                            color: const Color(0xFF5C9447),
                            borderRadius: BorderRadius.circular(30),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.25),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => setState(() => selectedIndex = 3),
                              borderRadius: BorderRadius.circular(30),
                              child: Padding(
                                padding: EdgeInsets.symmetric(
                                  vertical:
                                      screenWidth * 0.025, // Scales padding
                                  horizontal: screenWidth * 0.04,
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width:
                                          screenWidth *
                                          0.1, // Scales with device width
                                      height: screenWidth * 0.1,
                                      decoration: const BoxDecoration(
                                        color: Colors.white,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.shopping_cart,
                                        color: Color(0xFF5C9447),
                                      ),
                                    ),
                                    SizedBox(width: screenWidth * 0.04),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'View cart',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          Text(
                                            '$itemCount item${itemCount > 1 ? 's' : ''}',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const Icon(
                                      Icons.arrow_forward_ios,
                                      color: Colors.white,
                                      size: 18,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
