// services/referral_service.dart

import 'dart:math';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

class ReferralService {
  static const String _referralCodeKey = 'user_referral_code';

  // ------------------------------
  // DEBUG LOGGING UTILITIES
  // ------------------------------

  static void _log(String message) {
    final ts = DateTime.now().toIso8601String();
    print("🔍 [ReferralService][$ts] $message");
  }

  static void _logError(
    dynamic e,
    StackTrace st, {
    String function = 'unknown',
  }) {
    final ts = DateTime.now().toIso8601String();
    print("❌ [ReferralService][$function][$ts] ERROR: $e");
    print("🔻 Stack Trace:\n$st");
  }

  // Mask Authorization header
  static Map<String, String> _maskHeaders(Map<String, String> headers) {
    final out = <String, String>{};
    headers.forEach((k, v) {
      if (k.toLowerCase() == 'authorization' && v.length > 12) {
        final parts = v.split(' ');
        if (parts.length >= 2) {
          final scheme = parts[0];
          final token = parts.sublist(1).join(' ');
          final suffix =
              token.length > 6 ? token.substring(token.length - 6) : token;
          out[k] = '$scheme ***$suffix';
        } else {
          out[k] = '***';
        }
      } else {
        out[k] = v;
      }
    });
    return out;
  }

  // ------------------------------
  // LOCAL REFERRAL CODE HANDLING
  // ------------------------------

  static Future<String> getReferralCode() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      String? code = prefs.getString(_referralCodeKey);

      if (code == null) {
        code = _generateCode();
        await prefs.setString(_referralCodeKey, code);
        _log("Generated new referral code: $code");
      } else {
        _log("Referral code loaded from cache: $code");
      }

      return code;
    } catch (e, st) {
      _logError(e, st, function: "getReferralCode");
      rethrow;
    }
  }

  // Reset referral code (testing)
  static Future<void> resetReferralCode() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_referralCodeKey);
      _log("Referral code reset.");
    } catch (e, st) {
      _logError(e, st, function: "resetReferralCode");
    }
  }

  // ------------------------------
  // SERVER: GENERATE REFERRAL
  // ------------------------------

  static Future<String?> generateReferralFromServer(
    String customerId, {
    String? token,
  }) async {
    if (customerId.trim().isEmpty) {
      _log(
        'generateReferralFromServer called with empty customerId — aborting',
      );
      return null;
    }
    final url =
        'https://pos.inspiredgrow.in/vps/customer/$customerId/generate-referral';

    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    try {
      _log("→ GET $url");
      _log("Headers: ${json.encode(_maskHeaders(headers))}");

      final stopwatch = Stopwatch()..start();

      final resp = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 15));

      stopwatch.stop();
      _log("← Status ${resp.statusCode} in ${stopwatch.elapsedMilliseconds}ms");
      _log("Response Body: ${resp.body}");

      if (resp.statusCode != 200) {
        _log("Server returned error code: ${resp.statusCode}");
        return null;
      }

      final body = json.decode(resp.body);
      _log("Parsed body: $body");

      if (body is Map) {
        final data = body['data'];
        if (data is Map && data['referralCode'] != null) {
          return data['referralCode'].toString();
        }
        if (data is Map && data['code'] != null) {
          return data['code'].toString();
        }
        if (body['referralCode'] != null) {
          return body['referralCode'].toString();
        }
      }

      return body.toString();
    } catch (e, st) {
      _logError(e, st, function: "generateReferralFromServer");
      return null;
    }
  }

  // ------------------------------
  // SERVER: APPLY REFERRAL
  // ------------------------------

  static Future<Map<String, dynamic>> applyReferralCodeToServer(
    String referralCode, {
    String? token,
  }) async {
    final url = 'https://pos.inspiredgrow.in/vps/referral/apply-referral-code';

    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    try {
      final requestBody = json.encode({'referralCode': referralCode});

      _log("→ POST $url");
      _log("Headers: ${json.encode(_maskHeaders(headers))}");
      _log("Request Body: $requestBody");

      final stopwatch = Stopwatch()..start();

      final resp = await http
          .post(Uri.parse(url), headers: headers, body: requestBody)
          .timeout(const Duration(seconds: 15));

      stopwatch.stop();
      _log("← Status ${resp.statusCode} in ${stopwatch.elapsedMilliseconds}ms");
      _log("Response Body: ${resp.body}");

      final parsed = json.decode(resp.body);
      _log("Parsed Response: $parsed");

      if (parsed is Map<String, dynamic>) return parsed;

      return {
        'success': false,
        'message': 'Invalid response structure',
        'raw': resp.body,
      };
    } catch (e, st) {
      _logError(e, st, function: "applyReferralCodeToServer");
      return {'success': false, 'message': e.toString()};
    }
  }

  // ------------------------------
  // RANDOM REFERRAL CODE GENERATOR
  // ------------------------------

  static String _generateCode() {
    const prefix = 'GOWREF';
    final random = Random();
    final numbers = List.generate(3, (_) => random.nextInt(10)).join();
    return '$prefix$numbers';
  }
}
