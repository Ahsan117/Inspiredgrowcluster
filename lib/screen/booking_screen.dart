import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'dart:async';
import '../Utils/booking/booking_utils.dart';
import '../Utils/booking/snackbar_utils.dart';
import '../model/van_booking/VanRoute_model.dart';
import '../utils/date_time_utils.dart';
import '../services/api_service_for_van.dart';
import '../services/navigation_service.dart';
import '../widget/booking/ComingSoon.dart';
import '../widget/booking/action_buttons_widget.dart';
import '../widget/booking/booking_widgets.dart';
import 'package:provider/provider.dart';
import '../providers/booking_provider.dart';
import '../providers/address_provider.dart';
import '../model/Address/address_model.dart';
import '../widget/booking/address_selections_dialog.dart';
import '../widget/booking/map_widget.dart';
import '../widget/main_header.dart';

class VanRoutePage extends StatefulWidget {
  const VanRoutePage({super.key});

  @override
  State<VanRoutePage> createState() => _VanRoutePageState();
}

class _VanRoutePageState extends State<VanRoutePage>
    with AutomaticKeepAliveClientMixin {
  final MapController _mapController = MapController();
  final VanRouteApiService _apiService = VanRouteApiService();

  // Timers for debouncing operations and sync
  Timer? _debounceTimer;
  Timer? _locationTimer;
  Timer? _syncTimer;

  // Current tile provider index
  int _currentTileProvider = 0;

  // Simplified tile providers
  final List<Map<String, dynamic>> _tileProviders = [
    {
      'name': 'CartoDB Light',
      'url': 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    },
    {
      'name': 'OpenStreetMap',
      'url': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    },
    {
      'name': 'ESRI World',
      'url':
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    },
  ];

  // State variables
  List<UserBooking> _userBookings = [];

  // Loading states
  bool _isLoading = false;
  bool _isLoadingBookings = false;
  bool _locationLoading = false;
  bool _isFullScreenMap = false;
  bool _isAddressLoading = false;
  final bool _isMapReady = false;

  // Location data
  LatLng _currentLocation = const LatLng(28.6139, 77.2090);
  LatLng _selectedLocation = const LatLng(28.6139, 77.2090);
  String _selectedAddress = "Loading address...";

  // Address components
  String _selectedArea = '';
  String _selectedCity = '';
  String _selectedState = '';
  String _selectedPostalCode = '';
  // Track the selected saved address id (if any). When present, include this
  // id in the booking payload so the server uses the existing address.
  String? _selectedAddressId;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeApp();
      _startPeriodicSync();
    });
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _locationTimer?.cancel();
    _syncTimer?.cancel();
    super.dispose();
  }

  // Initialize app without blocking
  Future<void> _initializeApp() async {
    if (!mounted) return;

    _getCurrentLocation();

    await Future.delayed(const Duration(milliseconds: 500));
    if (mounted) {
      _loadBasicData();
    }
  }

  // Add a method to refresh page state when returning from other screens
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Refresh bookings when page becomes active (e.g., returning from login)
    if (mounted) {
      _loadUserBookings();
    }
  }

  // Start periodic sync method
  void _startPeriodicSync() {
    _syncTimer?.cancel();

    _syncTimer = Timer.periodic(const Duration(minutes: 2), (timer) async {
      if (!mounted) {
        timer.cancel();
        return;
      }

      if (!_apiService.isUserLoggedIn()) {
        return;
      }

      try {
        final isHealthy = await _apiService.checkApiHealthAndSync();
        if (isHealthy) {
          print('API recovered, refreshing bookings...');
          _loadUserBookings();
        }
      } catch (e) {
        print('Periodic sync error: $e');
      }
    });
  }

  // Optimized tile provider switching
  void _switchTileProvider() {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      if (mounted) {
        setState(() {
          _currentTileProvider =
              (_currentTileProvider + 1) % _tileProviders.length;
        });
      }
    });
  }

  // Optimized location fetching
// In _VanRoutePageState

  Future<void> _getCurrentLocation() async {
    if (_locationLoading || !mounted) return;

    setState(() => _locationLoading = true);

    try {
      final location = await MapLocationService.getCurrentLocation();

      if (location != null && mounted) {
        // --- ADD THIS LINE ---
        // Explicitly move the map to the new location.
        // This ensures the map view re-centers even if it's been kept alive.
        _mapController.move(location, 15.0);
        // --- END OF ADDITION ---

        setState(() {
          _currentLocation = location;
          _selectedLocation = location;
          _locationLoading = false;
        });

        _getAddressFromLatLng(location);
      } else if (mounted) {
        setState(() => _locationLoading = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _locationLoading = false);
      }
    }
  }

  Future<void> _getAddressFromLatLng(LatLng location) async {
    if (_isAddressLoading || !mounted) return;

    setState(() => _isAddressLoading = true);

    try {
      final addressData = await MapLocationService.getAddressFromLatLng(
        location,
      );

      if (mounted) {
        setState(() {
          _selectedAddress = addressData['address'] ?? 'Unknown Address';
          _selectedArea = addressData['area'] ?? '';
          _selectedCity = addressData['city'] ?? '';
          _selectedState = addressData['state'] ?? '';
          _selectedPostalCode = addressData['postalCode'] ?? '';
          _isAddressLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _selectedAddress =
          '${location.latitude.toStringAsFixed(4)}, ${location.longitude.toStringAsFixed(4)}';
          _selectedArea = 'Unknown Area';
          _selectedCity = 'Unknown City';
          _selectedState = 'Unknown State';
          _selectedPostalCode = '000000';
          _isAddressLoading = false;
        });
      }
    }
  }

  Future<void> _loadBasicData() async {
    if (_isLoading || !mounted) return;

    setState(() => _isLoading = true);

    try {
      await _apiService.getBasket().timeout(const Duration(seconds: 10));
      if (mounted) {}

      _loadUserBookings();
    } catch (e) {
      debugPrint('Error loading basic data: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _loadUserBookings() async {
    try {
      final bookingProvider = Provider.of<BookingProvider>(
        context,
        listen: false,
      );
      await bookingProvider.load();

      final localPending = bookingProvider.pendingBookings;

      setState(() {
        _userBookings = localPending.map((m) => UserBooking.fromJson(m)).toList();
        _isLoadingBookings = false;
      });
    } catch (e) {
      debugPrint('Error reading local bookings cache: $e');
      if (mounted) {
        setState(() {
          _userBookings = [];
          _isLoadingBookings = false;
        });
      }
    }

    unawaited(_offloadRefreshBookings());
  }
  /// Background refresh that syncs remote bookings into Hive without blocking UI.
  /// Uses provider methods captured before await to avoid using BuildContext across async gaps.
  Future<void> _offloadRefreshBookings() async {
    try {
      final bookingProvider = Provider.of<BookingProvider>(
        context,
        listen: false,
      );

      if (!_apiService.isUserLoggedIn()) return;

      final bookings = await _apiService
          .getUserBookingsWithSmartMerge()
          .timeout(const Duration(seconds: 15));

      // FIXED: Include ALL active bookings, not just cancellable ones
      final pendingBookings = bookings.where((booking) {
        final status = booking.status.toLowerCase();
        // Active bookings: everything except completed/cancelled/failed
        return status != 'completed' &&
            status != 'cancelled' &&
            status != 'failed' &&
            status != 'delivered';
      }).toList();

      final completed = bookings.where((booking) {
        final status = booking.status.toLowerCase();
        return status == 'completed' ||
            status == 'cancelled' ||
            status == 'failed' ||
            status == 'delivered';
      }).toList();

      // Debug logging to see what we're getting
      debugPrint('📊 Total bookings from API: ${bookings.length}');
      debugPrint('📋 Active bookings: ${pendingBookings.length}');
      debugPrint('✅ Completed bookings: ${completed.length}');

      // Log each booking for debugging
      for (var booking in pendingBookings) {
        debugPrint('🚐 Active Booking ${booking.id.substring(0, 8)}: ${booking.status}');
      }

      // Persist to Hive
      try {
        await bookingProvider.savePendingFromDynamicList(pendingBookings);
        await bookingProvider.saveCompletedFromDynamicList(completed);
      } catch (persistErr) {
        debugPrint('Failed to persist bookings in background: $persistErr');
      }

      // Update UI
      if (mounted) {
        setState(() {
          final List<dynamic> pb = pendingBookings.cast<dynamic>().toList();
          _userBookings = pb.map<UserBooking>((m) {
            if (m is UserBooking) return m;
            if (m is Map<String, dynamic>) return UserBooking.fromJson(m);
            return UserBooking.fromJson(
              Map<String, dynamic>.from(m as Map),
            );
          }).toList();
        });
      }
    } catch (e) {
      debugPrint('Background booking refresh failed: $e');
    }
  }

// ============================================
// PART 2: Add this helper method to check if a booking is active
// ============================================

  /// Returns true if the booking should be displayed in the active bookings list
  bool _isActiveBooking(String status) {
    final statusLower = status.toLowerCase();
    return statusLower == 'pending' ||
        statusLower == 'confirmed' ||
        statusLower == 'scheduled' ||
        statusLower == 'assigned' ||
        statusLower == 'intransit' ||
        statusLower == 'in_transit' ||
        statusLower == 'in-transit';
  }

  /// Returns true if the booking is in a terminal state
  bool _isCompletedBooking(String status) {
    final statusLower = status.toLowerCase();
    return statusLower == 'completed' ||
        statusLower == 'cancelled' ||
        statusLower == 'failed' ||
        statusLower == 'delivered';
  }

  void _toggleFullScreenMap() {
    setState(() => _isFullScreenMap = !_isFullScreenMap);
  }

  // Handle map tap
  void _handleMapTap(LatLng tappedPoint) {
    if (_isFullScreenMap) {
      setState(() => _selectedLocation = tappedPoint);
      _getAddressFromLatLng(tappedPoint);
    }
  }

  // Confirm location
  void _confirmLocation() {
    _toggleFullScreenMap();
    if (mounted) {
      SnackbarUtils.showSuccess(
        context,
        'Location confirmed: $_selectedAddress',
      );
    }
  }

  // Enhanced login required dialog
  void _showLoginRequiredDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder:
          (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        title: Row(
          children: [
            Icon(Icons.login, color: const Color(0xFFB21E1E), size: 24),
            const SizedBox(width: 8),
            const Text(
              'Login Required',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'You need to be logged in to book a van.',
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: Colors.blue.shade600,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Please log in to continue with your booking',
                      style: TextStyle(fontSize: 14, color: Colors.blue),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(
              foregroundColor: Colors.grey.shade600,
            ),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/login').then((_) {
                if (mounted) {
                  setState(() {});
                  _loadUserBookings();
                }
              });
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFB21E1E),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Login'),
          ),
        ],
      ),
    );
  }

  // Show session expired dialog
  void _showSessionExpiredDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder:
          (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        title: Row(
          children: [
            Icon(
              Icons.error_outline,
              color: Colors.orange.shade600,
              size: 24,
            ),
            const SizedBox(width: 8),
            const Text(
              'Session Expired',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your login session has expired. Please log in again to continue.',
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: Colors.orange.shade600,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Your bookings are safe and will be available after login',
                      style: TextStyle(fontSize: 14, color: Colors.orange),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              NavigationService.goBackToHomeScreen();
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.grey.shade600,
            ),
            child: const Text('Later'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/login').then((_) {
                if (mounted) {
                  setState(() {});
                  _loadUserBookings();
                }
              });
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFB21E1E),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Login'),
          ),
        ],
      ),
    );
  }

  // Show address confirmation dialog
  Future<bool?> _showAddressConfirmationDialog() async {
    // Use AddressProvider and a selection dialog to avoid manual entry.
    final addressProvider = Provider.of<AddressProvider>(
      context,
      listen: false,
    );

    // Ensure addresses are loaded (cached-first) so dialog can show saved addresses.
    try {
      await addressProvider.loadAddresses();
      print("saved addresses:");
      print(addressProvider.addresses);
    } catch (_) {
      // ignore - dialog can still show and user can add new address
    }

    final result = await showDialog<Map<String, dynamic>?>(
      context: context,
      barrierDismissible: false,
      builder:
          (_) => AddressSelectionDialog(
        currentLocation: _selectedLocation,
        currentAddress: _selectedAddress,
        currentArea: _selectedArea,
        currentCity: _selectedCity,
        currentState: _selectedState,
        currentPostalCode: _selectedPostalCode,
        savedAddresses: addressProvider.addresses,
        selectedAddress: addressProvider.defaultAddress,
      ),
    );
    print("Result");
    print(result);

    if (result == null) return false;

    // --- FIXED LOGIC: CHECK "NEW ADDRESS" FIRST ---

    // If user added a new address via the dialog
    if (result['isNewAddress'] == true) {
      final label = result['label']?.toString() ?? 'Saved Address';
      final street = result['street']?.toString() ?? '';
      final area = result['area']?.toString() ?? '';
      final city = result['city']?.toString() ?? '';
      final state = result['state']?.toString() ?? '';
      final postal = result['postalCode']?.toString() ?? '';
      final isDefault = result['isDefault'] == true;
      final coords = result['coordinates'];

      double? lat;
      double? lng;
      if (coords is List && coords.length >= 2) {
        try {
          lat = (coords[0] as num).toDouble();
          lng = (coords[1] as num).toDouble();
        } catch (_) {}
      }

      final newAddress = Address(
        id: '',
        label: label,
        street: street,
        area: area,
        city: city,
        state: state,
        country: result['country']?.toString() ?? 'India',
        postalCode: postal,
        isDefault: isDefault,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        latitude: lat,
        longitude: lng,
      );

      try {
        await addressProvider.addAddress(newAddress);
        // Refresh addresses list to get server-provided id
        await addressProvider.loadAddresses();

        // Try to find the newly added address by matching label+street, fallback to last
        Address? added = addressProvider.addresses.firstWhere(
              (a) => a.label == label && a.street == street,
          orElse:
              () =>
          addressProvider.addresses.isNotEmpty
              ? addressProvider.addresses.last
              : newAddress,
        );

        _selectedAddress = added.street;
        _selectedArea = added.area;
        _selectedCity = added.city;
        _selectedState = added.state;
        _selectedPostalCode = added.postalCode;
        // If the provider returned a server id for the created address, use it
        // so future bookings use the saved address instead of re-creating.
        if (added.id.isNotEmpty) {
          _selectedAddressId = added.id;
        }
        if (added.latitude != null && added.longitude != null) {
          _selectedLocation = LatLng(added.latitude!, added.longitude!);
        }

        return true;
      } catch (e) {
        debugPrint('Failed to add new address: $e');
        return false;
      }
    }

    // If user chose an existing saved address (OR a simple one-off selection)
    if (result.containsKey('addressId') || result.containsKey('street')) {
      // If addressId present, try to find it in provider
      if (result['addressId'] != null) {
        // store the selected address id immediately so booking will use it
        _selectedAddressId = result['addressId'].toString();

        // try to get full details from provider cache; if present use them
        final addr = addressProvider.getAddressById(_selectedAddressId!);

        print("Selected saved address:");
        print(addr);
        if (addr != null) {
          _selectedAddressId = addr.id;
          _selectedAddress = addr.street;
          _selectedArea = addr.area;
          _selectedCity = addr.city;
          _selectedState = addr.state;
          _selectedPostalCode = addr.postalCode;
          if (addr.latitude != null && addr.longitude != null) {
            _selectedLocation = LatLng(addr.latitude!, addr.longitude!);
          }
          return true;
        }
        // otherwise fall through and use any street/coords returned by dialog
      } else {
        // No saved address id selected; clear any previous id so we do not
        // accidentally reuse a stale id when user picks a one-off location.
        _selectedAddressId = null;
      }

      // Fallback: use provided street/coordinates in the result
      _selectedAddress = result['street']?.toString() ?? _selectedAddress;
      _selectedArea = result['area']?.toString() ?? _selectedArea;
      _selectedCity = result['city']?.toString() ?? _selectedCity;
      _selectedState = result['state']?.toString() ?? _selectedState;
      _selectedPostalCode =
          result['postalCode']?.toString() ?? _selectedPostalCode;
      final coords = result['coordinates'];
      if (coords is List && coords.length >= 2) {
        try {
          final lat = (coords[0] as num).toDouble();
          final lng = (coords[1] as num).toDouble();
          _selectedLocation = LatLng(lat, lng);
        } catch (_) {}
      }

      return true;
    }

    return false;
  }

  // Enhanced success dialog
  void _showSuccessDialog(
      String title,
      String bookingId, {
        String? additionalInfo,
      }) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        title: Column(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: Colors.green.shade100,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.check_circle,
                size: 30,
                color: Colors.green.shade600,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.confirmation_number,
                        size: 16,
                        color: Colors.grey.shade600,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Booking ID: ${bookingId.length > 12 ? "${bookingId.substring(0, 12)}..." : bookingId}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.location_on,
                        size: 16,
                        color: Colors.grey.shade600,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _selectedAddress,
                          style: const TextStyle(fontSize: 12),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  if (additionalInfo != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.schedule,
                          size: 16,
                          color: Colors.grey.shade600,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            additionalInfo,
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 16,
                    color: Colors.blue.shade600,
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Your booking will appear in the list below',
                      style: TextStyle(fontSize: 11, color: Colors.blue),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _loadUserBookings();
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  // Show booking details dialog
  // Replace your existing _showBookingDetails method with this fixed version
  void _showBookingDetails(UserBooking booking) {
    final statusLower = booking.status.toLowerCase();
    final isInTransit = statusLower == 'intransit' ||
        statusLower == 'in_transit' ||
        statusLower == 'in-transit';
    final isAssigned = statusLower == 'assigned';
    final canModify = statusLower == 'pending' || statusLower == 'scheduled';
    final canCancel = statusLower == 'pending' || statusLower == 'scheduled';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        title: Row(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: BookingUtils.getStatusColor(booking.status),
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                BookingUtils.generateBookingReference(booking.id),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailRow(
                'Status',
                BookingUtils.getStatusDisplayText(booking.status),
                BookingUtils.getStatusColor(booking.status),
              ),
              _buildDetailRow(
                'Type',
                BookingUtils.getBookingTypeDisplayText(booking.bookingType),
              ),
              _buildDetailRow(
                'Address',
                BookingUtils.formatAddress(
                  street: booking.pickupAddress.street,
                  area: booking.pickupAddress.area,
                  city: booking.pickupAddress.city,
                  state: booking.pickupAddress.state,
                  showState: true,
                  maxLength: 60,
                ),
              ),
              if (booking.scheduledFor != null)
                _buildDetailRow(
                  'Scheduled',
                  booking.scheduledFor!.toFullFormat(),
                ),
              if (booking.remark.isNotEmpty)
                _buildDetailRow('Remark', booking.remark),
              _buildDetailRow('Created', booking.createdAt.toFullFormat()),
              _buildDetailRow(
                'Time Ago',
                booking.createdAt.toRelativeFormat(),
              ),

              // Special message for inTransit bookings
              if (isInTransit) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.local_shipping,
                        color: Colors.blue.shade700,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Your van is on the way! The driver will arrive soon.',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.blue,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Special message for assigned bookings
              if (isAssigned) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.check_circle_outline,
                        color: Colors.green.shade700,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'A driver has been assigned to your booking!',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.green,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Show booking actions only for modifiable/cancellable bookings
              if (canModify || canCancel) ...[
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 8),
                IntrinsicHeight(
                  child: Row(
                    children: [
                      if (canModify)
                        Flexible(
                          child: SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () {
                                Navigator.pop(context);
                                SnackbarUtils.showInfo(
                                  context,
                                  'Modify booking feature coming soon!',
                                );
                              },
                              icon: const Icon(Icons.edit, size: 16),
                              label: const Text(
                                'Modify',
                                style: TextStyle(fontSize: 12),
                              ),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.blue,
                                side: BorderSide(
                                  color: Colors.blue.shade300,
                                ),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(6),
                                ),
                              ),
                            ),
                          ),
                        ),
                      if (canModify && canCancel)
                        const SizedBox(width: 8),
                      if (canCancel)
                        Flexible(
                          child: SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () {
                                Navigator.pop(context);
                                _showCancelBookingDialog(booking);
                              },
                              icon: const Icon(Icons.cancel, size: 16),
                              label: const Text(
                                'Cancel',
                                style: TextStyle(fontSize: 12),
                              ),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.red,
                                side: BorderSide(
                                  color: Colors.red.shade300,
                                ),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(6),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  // Build detail row for booking details
  // Update your existing _buildDetailRow method
  Widget _buildDetailRow(String label, String value, [Color? valueColor]) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
          Expanded(
            // This ensures the value text can wrap properly
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                color: valueColor ?? Colors.black87,
                fontWeight:
                valueColor != null ? FontWeight.w600 : FontWeight.normal,
              ),
              softWrap: true, // Allow text to wrap
              overflow: TextOverflow.visible, // Show wrapped text
            ),
          ),
        ],
      ),
    );
  }

  // REMOVED _bookInstantVan method as requested

  void _scheduleVanBooking() async {
    if (!mounted) return;

    if (!_apiService.isUserLoggedIn()) {
      _showLoginRequiredDialog();
      return;
    }

    final bool? addressConfirmed = await _showAddressConfirmationDialog();
    if (addressConfirmed != true) return;

    final DateTime? selectedDate = await _showDatePicker();
    if (selectedDate == null) return;

    final TimeOfDay? selectedTime = await _showTimePicker();
    if (selectedTime == null) return;

    final DateTime scheduledDateTime = DateTime(
      selectedDate.year,
      selectedDate.month,
      selectedDate.day,
      selectedTime.hour,
      selectedTime.minute,
    );

    if (!scheduledDateTime.isValidBookingTime) {
      SnackbarUtils.showError(
        context,
        'Please select a time at least 30 minutes from now',
      );
      return;
    }

    if (!mounted) return;

    // Show loading snackbar
    final loadingSnackbar = SnackbarUtils.showLoading(
      context,
      'Scheduling van for ${scheduledDateTime.toDisplayFormat()}...',
    );

    try {
      final pickupAddress = BookingUtils.createPickupAddress(
        //id: _selectedAddressId,
        address: _selectedAddress,
        area: _selectedArea,
        city: _selectedCity,
        state: _selectedState,
        postalCode: _selectedPostalCode,
        location: _selectedLocation,
      );

      // If the user selected an existing saved address, include its id so the
      // API will associate the booking with the existing address instead of
      // creating a duplicate entry.
      if (_selectedAddressId != null && _selectedAddressId!.isNotEmpty) {
        pickupAddress['id'] = _selectedAddressId;
        print("Using saved address id: ${pickupAddress['id']}");
      }

      // Debug log - helps diagnose server 400 about missing fields
      if (kDebugMode) {
        print('DEBUG: scheduling booking with pickupAddress: $pickupAddress');
        print('DEBUG: _selectedAddressId: $_selectedAddressId');
      }

      // If no saved address id is present, ensure required fields are non-empty
      if (_selectedAddressId == null || _selectedAddressId!.isEmpty) {
        final List<String> missing = [];
        if ((pickupAddress['street']?.toString() ?? '').trim().isEmpty)
          missing.add('street');
        if ((pickupAddress['city']?.toString() ?? '').trim().isEmpty)
          missing.add('city');
        if ((pickupAddress['state']?.toString() ?? '').trim().isEmpty)
          missing.add('state');
        if ((pickupAddress['country']?.toString() ?? '').trim().isEmpty)
          missing.add('country');
        if ((pickupAddress['postalCode']?.toString() ?? '').trim().isEmpty)
          missing.add('postalCode');

        if (missing.isNotEmpty) {
          SnackbarUtils.showError(
            context,
            'Address incomplete: ${missing.join(', ')}. Please select or enter a complete address.',
          );
          return;
        }
      }

      if (kDebugMode) {
        print('Scheduling booking for: ${scheduledDateTime.toIso8601String()}');
        print('Pickup address: $pickupAddress');
        print('User info: ${_apiService.getUserDebugInfo()}');
      }

      final BookingResponse result = await _apiService
          .scheduleVanBooking(
        location: _selectedAddress,
        pickupAddress: pickupAddress,
        scheduledDateTime: scheduledDateTime,
        remark: 'Scheduled booking via mobile app',
      )
          .timeout(const Duration(seconds: 20));

      if (mounted) {
        // Hide loading snackbar
        loadingSnackbar.close();

        if (result.success && result.id.isNotEmpty) {
          _showSuccessDialog(
            'Van Scheduled Successfully!',
            result.id,
            additionalInfo:
            'Scheduled for ${scheduledDateTime.toDisplayFormat()}',
          );
          _loadUserBookings();

          // Show success snackbar
          SnackbarUtils.showBookingSuccess(
            context,
            result.id,
            onViewBooking: () => _loadUserBookings(),
          );
        } else {
          SnackbarUtils.showError(
            context,
            'Failed to schedule van. Please try again.',
          );
        }
      }
    } catch (e) {
      if (mounted) {
        // Hide loading snackbar
        loadingSnackbar.close();

        if (e.toString().contains('User not logged in')) {
          _showLoginRequiredDialog();
          return;
        } else if (e.toString().contains('Session expired')) {
          _showSessionExpiredDialog();
          return;
        }

        // Show API error with specific handling
        SnackbarUtils.showApiError(
          context,
          e.toString(),
          onRetry: _scheduleVanBooking,
        );
      }
    }
  }

  // Show date picker
  Future<DateTime?> _showDatePicker() async {
    return await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(primary: Color(0xFFB21E1E)),
          ),
          child: child!,
        );
      },
    );
  }

  // Show time picker
  Future<TimeOfDay?> _showTimePicker() async {
    return await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(primary: Color(0xFFB21E1E)),
          ),
          child: child!,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    if (_isFullScreenMap) {
      return _buildFullScreenMap();
    }

    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) {
        if (didPop) return;
        NavigationService.goBackToHomeScreen();
      },
      child: Scaffold(
        resizeToAvoidBottomInset: false,
        body: SafeArea(
          child: Column(
            children: [
              const Padding(padding: EdgeInsets.all(16), child: MainHeader()),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      const SizedBox(height: 20),
                      _buildMap(),
                      _buildActionButtons(),
                      _buildBookingsSection(),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBookingsSection() {
    // The nullRetryCallback variable is no longer needed.

    final bookingWidgets = BookingWidgets(
      apiService: _apiService,
      userBookings: _userBookings,
      isLoadingBookings: _isLoadingBookings,
      // Pass null directly, since the parameter is nullable.
      retryLoadBookings: null,
      showBookingDetails: _showBookingDetails,
      context: context,
    );

    return bookingWidgets.buildBookingsSection();
  }

  Widget _buildMap() {
    final mapWidget = MapWidget(
      mapController: _mapController,
      context: context,
      currentLocation: _currentLocation,
      selectedLocation: _selectedLocation,
      selectedAddress: _selectedAddress,
      selectedArea: _selectedArea,
      selectedCity: _selectedCity,
      selectedState: _selectedState,
      selectedPostalCode: _selectedPostalCode,
      locationLoading: _locationLoading,
      isAddressLoading: _isAddressLoading,
      isMapReady: _isMapReady,
      isFullScreenMap: _isFullScreenMap,
      currentTileProvider: _currentTileProvider,
      tileProviders: _tileProviders,
      onToggleFullScreen: _toggleFullScreenMap,
      onSwitchTileProvider: _switchTileProvider,
      onMapTap: _handleMapTap,
      onConfirmLocation: _confirmLocation,
      onLocationSelected: (location) {
        setState(() {
          _selectedLocation = location;
        });
        _getAddressFromLatLng(location);
      },
      // Add this new callback for centering to current location
      onCenterToCurrentLocation: _centerToCurrentLocation,
    );

    return mapWidget.buildMap();
  }

  Widget _buildFullScreenMap() {
    final mapWidget = MapWidget(
      mapController: _mapController,
      context: context,
      currentLocation: _currentLocation,
      selectedLocation: _selectedLocation,
      selectedAddress: _selectedAddress,
      selectedArea: _selectedArea,
      selectedCity: _selectedCity,
      selectedState: _selectedState,
      selectedPostalCode: _selectedPostalCode,
      locationLoading: _locationLoading,
      isAddressLoading: _isAddressLoading,
      isMapReady: _isMapReady,
      isFullScreenMap: _isFullScreenMap,
      currentTileProvider: _currentTileProvider,
      tileProviders: _tileProviders,
      onToggleFullScreen: _toggleFullScreenMap,
      onSwitchTileProvider: _switchTileProvider,
      onMapTap: _handleMapTap,
      onConfirmLocation: _confirmLocation,
      onLocationSelected: (location) {
        setState(() {
          _selectedLocation = location;
        });
        _getAddressFromLatLng(location);
      },
    );

    // FIX: Wrap the full-screen map in a PopScope
    return PopScope(
      canPop: false, // This prevents the system from popping the route
      onPopInvoked: (didPop) {
        if (didPop) return; // If it was already popped, do nothing

        // Instead of popping, just toggle the full-screen mode off
        _toggleFullScreenMap();
      },
      child: mapWidget.buildFullScreenMap(),
    );
  }

  Widget _buildActionButtons() {
    final actionButtonsWidget = ActionButtonsWidget(
      apiService: _apiService,
      onBookNow: _scheduleVanBooking,  // Changed from _bookNowVan to _scheduleVanBooking
      onScheduleBooking: _scheduleVanBooking,
      context: context,
    );

    return actionButtonsWidget.buildActionButtons();
  }
  // Add this method to your _VanRoutePageState class
  Future<void> _cancelBooking(UserBooking booking) async {
    if (!mounted) return;

    // Show loading indicator using your existing method
    late ScaffoldFeatureController<SnackBar, SnackBarClosedReason>
    loadingSnackbar;

    try {
      loadingSnackbar = SnackbarUtils.showLoading(
        context,
        'Cancelling booking ${BookingUtils.generateBookingReference(booking.id)}...',
        showProgressIndicator: true,
      );

      final result = await _apiService.cancelBooking(booking.id);

      if (mounted) {
        // Hide loading snackbar
        loadingSnackbar.close();

        if (result.success) {
          // Show success message
          SnackbarUtils.showSuccess(context, 'Booking cancelled successfully!');

          // Refresh bookings to show updated status
          await _loadUserBookings();

          // Show detailed success dialog
          _showCancellationSuccessDialog(booking, result.booking);
        } else {
          // Show error message
          SnackbarUtils.showError(
            context,
            result.message.isNotEmpty
                ? result.message
                : 'Failed to cancel booking',
            onRetry: () => _cancelBooking(booking),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        // Hide loading snackbar safely
        try {
          loadingSnackbar.close();
        } catch (closeError) {
          print('Error closing loading snackbar: $closeError');
        }

        print('Error cancelling booking: $e');

        if (e.toString().contains('Session expired') ||
            e.toString().contains('Authentication failed')) {
          _showSessionExpiredDialog();
        } else {
          // Use the showApiError method
          SnackbarUtils.showApiError(
            context,
            e.toString(),
            onRetry: () => _cancelBooking(booking),
          );
        }
      }
    }
  }


  // Center map to current location
  void _centerToCurrentLocation() {
    if (_currentLocation != null) {
      _mapController.move(_currentLocation, 15.0);
      setState(() {
        _selectedLocation = _currentLocation;
      });
      _getAddressFromLatLng(_currentLocation);

      if (mounted) {
        SnackbarUtils.showSuccess(
          context,
          'Centered to your current location',
        );
      }
    } else {
      _getCurrentLocation();
    }
  }


  // Replace your existing _showCancelBookingDialog method with this enhanced version
  void _showCancelBookingDialog(UserBooking booking) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder:
          (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        title: Row(
          children: [
            Icon(
              Icons.warning_amber_rounded,
              color: Colors.orange,
              size: 24,
            ),
            const SizedBox(width: 8),
            const Text('Cancel Booking'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Are you sure you want to cancel this booking?',
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 16),

            // Booking Details Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Booking Reference
                  Row(
                    children: [
                      Icon(
                        Icons.confirmation_number,
                        size: 16,
                        color: Colors.grey.shade600,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        BookingUtils.generateBookingReference(booking.id),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Status
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: BookingUtils.getStatusColor(
                            booking.status,
                          ),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Status: ${BookingUtils.getStatusDisplayText(booking.status)}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Address
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.location_on,
                        size: 16,
                        color: Colors.grey.shade600,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          BookingUtils.formatAddress(
                            street: booking.pickupAddress.street,
                            area: booking.pickupAddress.area,
                            city: booking.pickupAddress.city,
                            state: booking.pickupAddress.state,
                          ),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade700,
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Scheduled Time (if applicable)
                  if (booking.scheduledFor != null) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(
                          Icons.schedule,
                          size: 16,
                          color: Colors.grey.shade600,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Scheduled: ${booking.scheduledFor!.toDisplayFormat()}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Warning Message
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 18,
                    color: Colors.red.shade600,
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'This action cannot be undone. The booking will be permanently cancelled.',
                      style: TextStyle(fontSize: 13, color: Colors.red),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(
              foregroundColor: Colors.grey.shade600,
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 8,
              ),
            ),
            child: const Text('Keep Booking'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _cancelBooking(booking);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 8,
              ),
            ),
            child: const Text('Cancel Booking'),
          ),
        ],
      ),
    );
  }

  // Add this new method for the cancellation success dialog
  void _showCancellationSuccessDialog(
      UserBooking originalBooking,
      UserBooking? cancelledBooking,
      ) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder:
          (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        title: Column(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: Colors.orange.shade100,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.cancel_outlined,
                size: 30,
                color: Colors.orange.shade600,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Booking Cancelled',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.confirmation_number,
                        size: 16,
                        color: Colors.grey.shade600,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Booking: ${BookingUtils.generateBookingReference(originalBooking.id)}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(
                        Icons.access_time,
                        size: 16,
                        color: Colors.grey.shade600,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Cancelled: ${DateTime.now().toDisplayFormat()}',
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(
                        Icons.person,
                        size: 16,
                        color: Colors.grey.shade600,
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Cancelled by: You',
                          style: TextStyle(fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 16,
                    color: Colors.blue.shade600,
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'You can create a new booking anytime using the schedule button',
                      style: TextStyle(fontSize: 12, color: Colors.blue),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(
              foregroundColor: Colors.grey.shade600,
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 8,
              ),
            ),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _scheduleVanBooking(); // Allow quick rebooking
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFB21E1E),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 8,
              ),
            ),
            child: const Text('Book Again'),
          ),
        ],
      ),
    );
  }
}