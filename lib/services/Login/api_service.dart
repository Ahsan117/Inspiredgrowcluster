// api_service.dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../authentication/user_data.dart';

class ApiService {
  static const String baseUrl = 'https://pos.inspiredgrow.in/vps/customer';

  static Future<Map<String, dynamic>> sendOtp(String phone) async {
    try {
      print('=== FLUTTER SEND OTP DEBUG ===');
      print('Phone: $phone');
      print('API URL: $baseUrl/send-otp');

      final requestBody = jsonEncode({'phone': phone});
      print('Request body: $requestBody');

      final response = await http.post(
        Uri.parse('$baseUrl/send-otp'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: requestBody,
      );

      print('Send OTP Response status: ${response.statusCode}');
      print('Send OTP Response body: ${response.body}');

      final data = jsonDecode(response.body);

      if (data.containsKey('otp')) {
        print('🔥 OTP IN RESPONSE: ${data['otp']}');
      }
      if (data.containsKey('data') &&
          data['data'] != null &&
          data['data'].containsKey('otp')) {
        print('🔥 OTP IN DATA: ${data['data']['otp']}');
      }

      print('=== END SEND OTP DEBUG ===');

      return {
        'success': response.statusCode == 200,
        'data': data,
        'statusCode': response.statusCode,
      };
    } catch (e) {
      print('Error in sendOtp: $e');
      return {
        'success': false,
        'error': 'Network error. Please check your connection.',
      };
    }
  }

  static Future<Map<String, dynamic>> verifyOtp(
      String phone,
      String otp, {
        int maxRetries = 2,
      }) async {
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        print('=== FLUTTER VERIFY OTP DEBUG (Attempt $attempt) ===');
        print('Phone: $phone');
        print('OTP: $otp');
        print('API URL: $baseUrl/verify-otp');

        final requestBody = jsonEncode({'phone': phone, 'otp': otp});
        print('Request body: $requestBody');

        final response = await http.post(
          Uri.parse('$baseUrl/verify-otp'),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: requestBody,
        );

        print('Response status: ${response.statusCode}');
        print('Response body: ${response.body}');

        if (response.body.trim().startsWith('<!DOCTYPE') ||
            response.body.trim().startsWith('<html')) {
          print('HTML response detected - server error');
          if (attempt < maxRetries) {
            print('Retrying in 2 seconds...');
            await Future.delayed(const Duration(seconds: 2));
            continue;
          }
          return {'success': false, 'error': 'Server error. Please try again.'};
        }

        final data = jsonDecode(response.body);

        if (response.statusCode == 400 &&
            data['message'] != null &&
            data['message'].toString().toLowerCase().contains('invalid') &&
            attempt < maxRetries) {
          print(
            '⏳ OTP might not be ready yet, waiting 3 seconds before retry...',
          );
          await Future.delayed(const Duration(seconds: 3));
          continue;
        }

        print('=== END VERIFY OTP DEBUG ===');

        return {
          'success': true,
          'data': data,
          'statusCode': response.statusCode,
        };
      } catch (e) {
        print('Error in verifyOtp attempt $attempt: $e');
        if (attempt < maxRetries) {
          print('Retrying in 2 seconds...');
          await Future.delayed(const Duration(seconds: 2));
          continue;
        }
        return {
          'success': false,
          'error': 'Network error. Please check your connection.',
        };
      }
    }

    return {
      'success': false,
      'error': 'Failed to verify OTP after $maxRetries attempts',
    };
  }

  static Future<Map<String, dynamic>> completeProfile({
    required String phone,
    required String name,
    String? email,
    String? city,
    String? state,
    String? country,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/create-account'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'phone': phone,
          'name': name,
          if (email != null) 'email': email,
          if (city != null) 'city': city,
          if (state != null) 'state': state,
          if (country != null) 'country': country,
        }),
      );

      final data = jsonDecode(response.body);

      return {
        'success': response.statusCode == 201,
        'data': data,
        'statusCode': response.statusCode,
      };
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  // --- START OF MODIFIED SECTION ---
  // MODIFIED: Method now accepts a token as a parameter to fix the error.
  static Future<Map<String, dynamic>> getProfile(String token) async {
    try {
      // REMOVED: No longer need to get the token from UserData here.
      // It's passed directly into the method.

      final response = await http.get(
        Uri.parse('$baseUrl/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      final responseData = json.decode(response.body);

      if (response.statusCode == 200) {
        if (responseData['success'] == true) {
          return {'success': true, 'data': responseData['data']};
        } else {
          return {'success': false, 'error': responseData['message'] ?? 'Failed to get profile'};
        }
      } else {
        return {'success': false, 'error': 'Server error: ${response.statusCode}'};
      }
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }
  // --- END OF MODIFIED SECTION ---

  static Future<Map<String, dynamic>> updateProfile({
    String? name,
    String? email,
    String? city,
    String? state,
    String? country,
  }) async {
    try {
      final userData = UserData();
      final token = await userData.getToken();

      if (token == null) {
        return {'success': false, 'error': 'No token found'};
      }

      final body = <String, dynamic>{};
      if (name != null) body['name'] = name;
      if (email != null) body['email'] = email;
      if (city != null) body['city'] = city;
      if (state != null) body['state'] = state;
      if (country != null) body['country'] = country;

      final response = await http.patch(
        Uri.parse('$baseUrl/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      );

      final data = jsonDecode(response.body);

      return {
        'success': response.statusCode == 200,
        'data': data,
        'statusCode': response.statusCode,
      };
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }
}