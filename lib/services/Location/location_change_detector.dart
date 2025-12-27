// lib/services/Location/location_change_detector.dart

import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:flutter/foundation.dart';

class LocationChangeDetector {
  static LocationChangeDetector? _instance;
  static LocationChangeDetector get instance {
    _instance ??= LocationChangeDetector._();
    return _instance!;
  }

  LocationChangeDetector._();

  StreamSubscription<Position>? _positionStreamSubscription;
  Position? _lastKnownPosition;
  final _locationChangeController = StreamController<Position>.broadcast();

  // Minimum distance in meters to trigger a location change event
  static const double _significantDistanceThreshold = 500.0; // 500 meters

  bool _isListening = false;

  /// Stream that emits when user's location changes significantly
  Stream<Position> get onLocationChange => _locationChangeController.stream;

  /// Start listening to location changes
  Future<void> startListening() async {
    if (_isListening) {
      debugPrint('📍 Location listener already active');
      return;
    }

    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('❌ Location services are disabled');
        return;
      }

      // Check permissions
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint('❌ Location permissions denied');
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        debugPrint('❌ Location permissions permanently denied');
        return;
      }

      // Get initial position
      _lastKnownPosition = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      debugPrint('✅ Started listening to location changes');
      debugPrint('📍 Initial position: (${_lastKnownPosition?.latitude}, ${_lastKnownPosition?.longitude})');

      // Start listening to position stream
      const LocationSettings locationSettings = LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 100, // Update every 100 meters
      );

      _positionStreamSubscription = Geolocator.getPositionStream(
        locationSettings: locationSettings,
      ).listen(
        _onPositionUpdate,
        onError: (error) {
          debugPrint('❌ Location stream error: $error');
        },
      );

      _isListening = true;
    } catch (e) {
      debugPrint('❌ Error starting location listener: $e');
    }
  }

  /// Handle position updates
  void _onPositionUpdate(Position position) {
    if (_lastKnownPosition == null) {
      _lastKnownPosition = position;
      return;
    }

    // Calculate distance from last known position
    double distanceInMeters = Geolocator.distanceBetween(
      _lastKnownPosition!.latitude,
      _lastKnownPosition!.longitude,
      position.latitude,
      position.longitude,
    );

    debugPrint('📍 Position update: distance moved = ${distanceInMeters.toStringAsFixed(0)}m');

    // Only trigger event if user moved significantly
    if (distanceInMeters >= _significantDistanceThreshold) {
      debugPrint('🚶 Significant location change detected!');
      debugPrint('📍 Old: (${_lastKnownPosition!.latitude}, ${_lastKnownPosition!.longitude})');
      debugPrint('📍 New: (${position.latitude}, ${position.longitude})');

      _lastKnownPosition = position;
      _locationChangeController.add(position);
    }
  }

  /// Stop listening to location changes
  void stopListening() {
    _positionStreamSubscription?.cancel();
    _positionStreamSubscription = null;
    _isListening = false;
    debugPrint('🛑 Stopped listening to location changes');
  }

  /// Check if currently listening
  bool get isListening => _isListening;

  /// Get last known position
  Position? get lastKnownPosition => _lastKnownPosition;

  /// Dispose resources
  void dispose() {
    stopListening();
    _locationChangeController.close();
  }
}