import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:lottie/lottie.dart';
import '../services/Notification/firebase_notification_service.dart';
import 'otp_screen_authentication.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _phoneController = TextEditingController();
  bool _isLoading = false;
  final FirebaseNotificationService _notificationService = FirebaseNotificationService();

  @override
  void initState() {
    super.initState();
    _initializeNotifications();
  }

  // Initialize Firebase notifications when screen loads
  Future<void> _initializeNotifications() async {
    try {
      await _notificationService.initialize(
        onNotificationTap: (route) {
          _handleNotificationNavigation(route);
        },
      );
      print('✅ Notifications initialized on login screen');
    } catch (e) {
      print('Error initializing notifications: $e');
    }
  }

  // Handle notification navigation
  void _handleNotificationNavigation(String route) {
    print('Notification tapped, navigating to: $route');

    if (route.startsWith('/order-details/')) {
      final orderId = route.split('/').last;
      Navigator.pushNamed(context, '/order-details', arguments: orderId);
    } else {
      Navigator.pushNamed(context, route);
    }
  }


  Future<void> _sendOtp() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your phone number')),
      );
      return;
    }

    final fullPhoneNumber = '+91$phone';
    setState(() => _isLoading = true);

    try {
      final response = await http.post(
        Uri.parse('https://pos.inspiredgrow.in/vps/customer/send-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phone': fullPhoneNumber}),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => OtpScreen(
              phone: fullPhoneNumber,
              otpSentTime: DateTime.now(),
              onLoginSuccess: _handleLoginSuccess, // Pass callback
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['message'] ?? 'Failed to send OTP')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Network error')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // Handle successful login - register for notifications
  Future<void> _handleLoginSuccess() async {
    try {
      print('🎉 Login successful, registering for notifications...');

      // Register device token for push notifications
      await _notificationService.registerDeviceTokenAfterLogin();

      print('✅ Device token registered successfully');

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Login successful! You\'ll receive order notifications.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      print('Error registering for notifications: $e');
      // Don't show error to user as login was successful
    }
  }

  void _skipToHome() {
    Navigator.pushReplacementNamed(context, '/main');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Stack(
          children: [
            // Skip Now button positioned at top right
            Positioned(
              top: 16,
              right: 16,
              child: TextButton(
                onPressed: _skipToHome,
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF8B1A1A),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Skip Now',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_ios,
                      size: 12,
                      color: const Color(0xFF8B1A1A),
                    ),
                  ],
                ),
              ),
            ),

            // Main content
            Center(
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Lottie Animation at the top
                      Center(
                        child: SizedBox(
                          height: 300,
                          width: 300,
                          child: Lottie.asset(
                            'assets/animations/groceries.json',
                            fit: BoxFit.contain,
                            repeat: true,
                            animate: true,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'Login',
                        style: TextStyle(
                          color: const Color(0xFF8B1A1A),
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 40),
                      Text(
                        'PHONE NUMBER',
                        style: TextStyle(
                          color: const Color(0xFF8B1A1A),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1.1,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              border: Border(
                                bottom: BorderSide(
                                  color: Color(0xFF8B1A1A),
                                  width: 1,
                                ),
                              ),
                            ),
                            child: Text(
                              '+91',
                              style: TextStyle(
                                color: const Color(0xFF8B1A1A),
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              style: const TextStyle(
                                color: Colors.black,
                                fontSize: 16,
                              ),
                              decoration: InputDecoration(
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(
                                  vertical: 10,
                                ),
                                border: InputBorder.none,
                                enabledBorder: UnderlineInputBorder(
                                  borderSide: BorderSide(
                                    color: Color(0xFF8B1A1A),
                                    width: 1,
                                  ),
                                ),
                                focusedBorder: UnderlineInputBorder(
                                  borderSide: BorderSide(
                                    color: Color(0xFF8B1A1A),
                                    width: 1.2,
                                  ),
                                ),
                                hintText: '10-digit phone number',
                                hintStyle: TextStyle(
                                  color: Colors.grey[400],
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 40),
                      Center(
                        child: SizedBox(
                          width: 160,
                          height: 44,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _sendOtp,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF8B1A1A),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(22),
                              ),
                              elevation: 0,
                            ),
                            child: _isLoading
                                ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                                : const Text(
                              'Login',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}