// lib/providers/location_provider.dart

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import '../authentication/user_data.dart';
import '../model/Login/user_model.dart';
import '../services/Location/location_change_detector.dart';
import '../model/Address/address_model.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

import '../services/warehouse/warehouse_service.dart';

class LocationProvider extends ChangeNotifier {
  String _location = "Getting location...";
  bool _isLoading = false;
  bool _isManualAddress = false;
  String? _selectedAddressId;
  bool _autoReloadEnabled = true; // NEW: Auto-reload toggle

  String get location => _location;
  bool get isLoading => _isLoading;
  bool get isManualAddress => _isManualAddress;
  String? get selectedAddressId => _selectedAddressId;
  bool get autoReloadEnabled => _autoReloadEnabled;

  LocationProvider() {
    _initializeLocation();
    _setupLocationChangeListener(); // NEW: Setup auto-reload
  }

  Future<void> _initializeLocation() async {
    await _loadSavedLocation();
  }

  // 🆕 NEW: Setup location change listener for auto-reload
  void _setupLocationChangeListener() {
    LocationChangeDetector.instance.onLocationChange.listen((position) {
      if (_autoReloadEnabled && !_isManualAddress) {
        debugPrint('🔄 Auto-reload triggered by location change');
        _handleLocationChange(position);
      } else {
        debugPrint('⏸️ Auto-reload skipped (Manual address or disabled)');
      }
    });
  }

  // 🆕 NEW: Handle location change and check serviceability
  Future<void> _handleLocationChange(Position position) async {
    debugPrint('🔄 Checking serviceability for new location...');

    final userData = UserData();
    final user = userData.getCurrentUser();

    if (user?.token == null) {
      debugPrint('❌ No token available for serviceability check');
      return;
    }

    try {
      // Check if new location is serviceable
      final zoneResult = await _checkLocationInZone(
        position.latitude,
        position.longitude,
        user!.token!,
      );

      if (zoneResult['inside'] == true) {
        debugPrint('✅ New location is serviceable - Zone: ${zoneResult['zoneName']}');

        // Update location display
        final address = await _getAddressFromCoordinates(
          position.latitude,
          position.longitude,
        );

        _location = address;
        _isManualAddress = false;

        // Update user data with new location
        await _updateUserLocation(
          position.latitude,
          position.longitude,
          address,
          zoneResult,
        );

        notifyListeners();

        // Notify about serviceability change
        _notifyServiceabilityChange(true, zoneResult['zoneName']);
      } else {
        debugPrint('❌ New location is not serviceable');
        _notifyServiceabilityChange(false, null);
      }
    } catch (e) {
      debugPrint('❌ Error checking new location: $e');
    }
  }

  // 🆕 NEW: Notify listeners about serviceability changes
  final _serviceabilityController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get onServiceabilityChange =>
      _serviceabilityController.stream;

  void _notifyServiceabilityChange(bool isServiceable, String? zoneName) {
    _serviceabilityController.add({
      'isServiceable': isServiceable,
      'zoneName': zoneName,
      'timestamp': DateTime.now(),
    });
  }

  // 🆕 NEW: Get address from coordinates using reverse geocoding
  Future<String> _getAddressFromCoordinates(double lat, double lng) async {
    try {
      final placemarks = await placemarkFromCoordinates(lat, lng);
      if (placemarks.isNotEmpty) {
        final placemark = placemarks.first;
        final city = placemark.locality ?? placemark.subLocality ?? '';
        final state = placemark.administrativeArea ?? '';
        return city.isNotEmpty && state.isNotEmpty
            ? '$city, $state'
            : placemark.street ?? 'Unknown location';
      }
    } catch (e) {
      debugPrint('Error getting address: $e');
    }
    return 'Location updated';
  }

  // 🆕 NEW: Update user location in storage
  Future<void> _updateUserLocation(
      double lat,
      double lng,
      String address,
      Map<String, dynamic> zoneResult,
      ) async {
    final userData = UserData();
    final currentUser = userData.getCurrentUser();

    if (currentUser != null) {
      final updatedUser = UserModel(
        phone: currentUser.phone,
        name: currentUser.name,
        email: currentUser.email,
        city: currentUser.city,
        state: currentUser.state,
        country: currentUser.country,
        token: currentUser.token,
        isLoggedIn: currentUser.isLoggedIn,
        createdAt: currentUser.createdAt,
        id: currentUser.id,
        selectedWarehouseId: zoneResult['storeId'],
        estimatedDeliveryTime: 15,
        isServiceable: true,
        userLatitude: lat,
        userLongitude: lng,
        userAddress: address,
      );

      await userData.saveUser(updatedUser);
      debugPrint('💾 Updated user location in storage');
    }
  }

  // 🆕 NEW: Toggle auto-reload feature
  void setAutoReload(bool enabled) {
    _autoReloadEnabled = enabled;
    notifyListeners();
    debugPrint('🔄 Auto-reload ${enabled ? "enabled" : "disabled"}');

    if (enabled) {
      LocationChangeDetector.instance.startListening();
    } else {
      LocationChangeDetector.instance.stopListening();
    }
  }

  // 🆕 NEW: Start location tracking
  Future<void> startLocationTracking() async {
    await LocationChangeDetector.instance.startListening();
  }

  // 🆕 NEW: Stop location tracking
  void stopLocationTracking() {
    LocationChangeDetector.instance.stopListening();
  }

  Future<void> _loadSavedLocation() async {
    try {
      final userData = UserData();
      final user = userData.getCurrentUser();

      if (user != null && user.userAddress != null && user.userAddress!.isNotEmpty) {
        final address = user.userAddress!;
        _location = _extractDisplayLocation(address);
        _isManualAddress = true;
        notifyListeners();
        return;
      }
    } catch (e) {
      print('Error loading saved location: $e');
    }

    await refreshLocation();
  }

  String _extractDisplayLocation(String fullAddress) {
    final parts = fullAddress.split(',');
    if (parts.length >= 2) {
      final cityIndex = parts.length >= 3 ? parts.length - 3 : 0;
      final stateIndex = parts.length >= 2 ? parts.length - 2 : parts.length - 1;
      return "${parts[cityIndex].trim()}, ${parts[stateIndex].trim()}";
    }
    return fullAddress;
  }

  Future<void> refreshLocation() async {
    _isLoading = true;
    _isManualAddress = false;
    notifyListeners();

    try {
      final userData = UserData();
      final user = userData.getCurrentUser();

      if (user?.token == null) {
        _location = "Login to see location";
        _isLoading = false;
        notifyListeners();
        return;
      }

      final result = await ZoneWarehouseService.autoAssignWarehouse(user!.token!);

      if (result.isServiceable && result.userAddress != null) {
        _location = _extractDisplayLocation(result.userAddress!);
        _isManualAddress = false;
      } else {
        _location = "Location unavailable";
      }
    } catch (e) {
      print('Error refreshing location: $e');
      _location = "Unable to get location";
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> setManualAddressWithZoneCheck(
      Address address,
      ) async {
    print('🔍 Checking zone for selected address...');
    print('📍 Address: ${address.label} - ${address.fullAddress}');

    if (address.latitude == null || address.longitude == null) {
      print('❌ Address missing coordinates');
      return {
        'success': false,
        'message': 'Address does not have location coordinates',
      };
    }

    final userData = UserData();
    final user = userData.getCurrentUser();

    if (user?.token == null) {
      print('❌ User not authenticated');
      return {
        'success': false,
        'message': 'User not authenticated',
      };
    }

    try {
      final zoneResult = await _checkLocationInZone(
        address.latitude!,
        address.longitude!,
        user!.token!,
      );

      if (!zoneResult['inside']) {
        print('❌ Address outside delivery zones');
        return {
          'success': false,
          'message': "We're not delivering to this area yet",
          'isServiceable': false,
        };
      }

      print('✅ Address is serviceable - Zone: ${zoneResult['zoneName']}');

      await _saveAddressWithZoneInfo(address, zoneResult, user);

      _location = _formatAddressForDisplay(address);
      _isManualAddress = true;
      _selectedAddressId = address.id;

      // 🆕 When manual address is selected, pause auto-reload
      setAutoReload(false);

      notifyListeners();

      return {
        'success': true,
        'message': 'Address selected successfully',
        'isServiceable': true,
        'zoneName': zoneResult['zoneName'],
        'deliveryTime': 15,
        'deliveryFee': zoneResult['deliveryFee'],
        'minOrder': zoneResult['minOrder'],
      };
    } catch (e) {
      print('❌ Error checking zone: $e');
      return {
        'success': false,
        'message': 'Failed to check delivery availability: ${e.toString()}',
      };
    }
  }

  Future<Map<String, dynamic>> _checkLocationInZone(
      double lat,
      double lng,
      String token,
      ) async {
    final url = Uri.parse('${ZoneWarehouseService.baseUrl}/check-location');

    print('🌐 Checking zone API: $url');
    print('📍 Coordinates: ($lat, $lng)');

    try {
      final response = await http.post(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'lat': lat,
          'lng': lng,
        }),
      );

      print('📡 Zone API Response Status: ${response.statusCode}');
      print('📡 Zone API Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data['success'] == true) {
          final inside = data['inside'] ?? false;

          if (inside) {
            print('✅ Location is inside zone: ${data['zoneName']}');
            return {
              'inside': true,
              'zoneId': data['zoneId'],
              'zoneName': data['zoneName'],
              'storeId': data['storeId'],
              'deliveryFee': (data['deliveryFee'] ?? 0).toDouble(),
              'minOrder': (data['minOrder'] ?? 0).toDouble(),
            };
          } else {
            print('❌ Location is outside all delivery zones');
            return {'inside': false};
          }
        }
      }

      print('⚠️ Unexpected API response format');
      return {'inside': false};
    } catch (e) {
      print('❌ Error calling zone API: $e');
      return {'inside': false};
    }
  }

  Future<void> _saveAddressWithZoneInfo(
      Address address,
      Map<String, dynamic> zoneResult,
      UserModel currentUser,
      ) async {
    final userData = UserData();

    final updatedUser = UserModel(
      phone: currentUser.phone,
      name: currentUser.name,
      email: currentUser.email,
      city: address.city,
      state: address.state,
      country: address.country,
      token: currentUser.token,
      isLoggedIn: currentUser.isLoggedIn,
      createdAt: currentUser.createdAt,
      id: currentUser.id,
      selectedWarehouseId: zoneResult['storeId'],
      estimatedDeliveryTime: 15,
      isServiceable: true,
      userLatitude: address.latitude,
      userLongitude: address.longitude,
      userAddress: address.fullAddress,
    );

    await userData.saveUser(updatedUser);
    print('💾 Address and zone info saved to user data');
    print('📦 Store ID: ${zoneResult['storeId']}');
    print('🏢 Zone Name: ${zoneResult['zoneName']}');
    print('🚚 Delivery Fee: ₹${zoneResult['deliveryFee']}');
    print('💰 Min Order: ₹${zoneResult['minOrder']}');
  }

  String _formatAddressForDisplay(Address address) {
    if (address.city.isNotEmpty && address.state.isNotEmpty) {
      return "${address.city}, ${address.state}";
    } else if (address.city.isNotEmpty) {
      return address.city;
    } else if (address.area.isNotEmpty && address.city.isNotEmpty) {
      return "${address.area}, ${address.city}";
    } else {
      return address.label;
    }
  }

// In location_provider.dart, update the notification method
  Future<void> checkLocationUpdate() async {
    final userData = UserData();
    final user = userData.getCurrentUser();

    if (user?.userAddress != null && user!.userAddress!.isNotEmpty) {
      await _loadSavedLocation();

      // 🆕 Force notify listeners even if location string is same
      // This ensures UI rebuilds when address changes
      notifyListeners();
    } else {
      await refreshLocation();
    }
  }

  void updateFromManualSelection(String displayLocation) {
    _location = displayLocation;
    _isManualAddress = true;
    notifyListeners();
  }

  @override
  void dispose() {
    _serviceabilityController.close();
    LocationChangeDetector.instance.dispose();
    super.dispose();
  }
}