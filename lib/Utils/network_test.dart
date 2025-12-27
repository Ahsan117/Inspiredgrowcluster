import 'dart:io';
import 'package:http/http.dart' as http;
import 'dart:convert';

class NetworkTest {
  static Future<void> runDiagnostics() async {
    print('🔧 === NETWORK DIAGNOSTICS ===');

    // Test 1: Basic connectivity
    await _testBasicConnectivity();

    // Test 2: DNS resolution
    await _testDNSResolution();

    // Test 3: HTTP request
    await _testHTTPRequest();

    // Test 4: HTTPS request
    await _testHTTPSRequest();

    print('🔧 === DIAGNOSTICS COMPLETE ===');
  }

  static Future<void> _testBasicConnectivity() async {
    try {
      print('📡 Testing basic connectivity...');
      final result = await InternetAddress.lookup('google.com');
      if (result.isNotEmpty && result[0].rawAddress.isNotEmpty) {
        print('✅ Internet connection: OK');
      }
    } catch (e) {
      print('❌ Internet connection: FAILED - $e');
    }
  }

  static Future<void> _testDNSResolution() async {
    try {
      print('🌐 Testing DNS resolution for pos.inspiredgrow.in...');
      final result = await InternetAddress.lookup('pos.inspiredgrow.in');
      if (result.isNotEmpty) {
        print('✅ DNS resolution: OK - ${result.first.address}');
      }
    } catch (e) {
      print('❌ DNS resolution: FAILED - $e');
    }
  }

  static Future<void> _testHTTPRequest() async {
    try {
      print('🔗 Testing HTTP request to httpbin.org...');
      final response = await http.get(
        Uri.parse('http://httpbin.org/get'),
      ).timeout(Duration(seconds: 10));
      print('✅ HTTP request: OK - Status ${response.statusCode}');
    } catch (e) {
      print('❌ HTTP request: FAILED - $e');
    }
  }
  // Add this test method
  static Future<void> testWithDifferentDNS() async {
    print('🔄 Testing with different approaches...');

    // Test 1: Try with IP address if possible
    try {
      print('🔍 Trying with resolved IP...');
      final addresses = await InternetAddress.lookup('pos.inspiredgrow.in');
      if (addresses.isNotEmpty) {
        final ip = addresses.first.address;
        print('📍 Server IP: $ip');

        // Note: This won't work for HTTPS due to certificate issues
        // but helps confirm if it's a DNS issue
      }
    } catch (e) {
      print('❌ IP resolution failed: $e');
    }

    // Test 2: Try a simple ping-like test
    try {
      print('🏓 Testing basic socket connection...');
      final socket = await Socket.connect('pos.inspiredgrow.in', 443,
          timeout: Duration(seconds: 10));
      print('✅ Socket connection successful');
      await socket.close();
    } catch (e) {
      print('❌ Socket connection failed: $e');
    }
  }
  // Add this method to force DNS refresh
  Future<void> forceDNSRefresh() async {
    try {
      // Clear any cached DNS by doing multiple lookups
      await InternetAddress.lookup('pos.inspiredgrow.in');
      await InternetAddress.lookup('8.8.8.8'); // Google DNS
      await InternetAddress.lookup('pos.inspiredgrow.in');

      print('✅ DNS refresh attempted');
    } catch (e) {
      print('❌ DNS refresh failed: $e');
    }
  }

  static Future<void> _testHTTPSRequest() async {
    try {
      print('🔒 Testing HTTPS request to your server...');

      // Test with different endpoints
      final endpoints = [
        'https://pos.inspiredgrow.in',
        'https://pos.inspiredgrow.in/vps',
        'https://pos.inspiredgrow.in/vps/api',
        'https://pos.inspiredgrow.in/vps/api/catalog/categories',
        'https://pos.inspiredgrow.in/vps/customer/send-otp',
      ];

      for (final endpoint in endpoints) {
        try {
          print('   Testing: $endpoint');
          final response = await http.get(
            Uri.parse(endpoint),
            headers: {
              'User-Agent': 'Flutter-App/1.0',
              'Accept': 'application/json',
            },
          ).timeout(Duration(seconds: 15));
          print('   ✅ Status: ${response.statusCode}');
        } catch (e) {
          print('   ❌ Failed: $e');
        }
      }
    } catch (e) {
      print('❌ HTTPS requests: FAILED - $e');
    }
  }
}