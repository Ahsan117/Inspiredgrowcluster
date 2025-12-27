import 'package:eshop/authentication/profile_creation_screen.dart';
import 'package:eshop/authentication/user_data.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lottie/lottie.dart';
import 'dart:async';
import '../model/Login/user_model.dart';
import '../services/Login/api_service.dart';
import '../services/Notification/firebase_notification_service.dart';
import '../services/warehouse/testing_warehouse_service.dart';
import '../services/warehouse/warehouse_mode_controller.dart';

class OtpScreen extends StatefulWidget {
  final String phone;
  final DateTime? otpSentTime;
  final VoidCallback? onLoginSuccess;

  const OtpScreen({
    super.key,
    required this.phone,
    this.otpSentTime,
    this.onLoginSuccess,
  });

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  DateTime? _otpSentTime;
  final List<TextEditingController> _controllers = List.generate(
    6,
        (index) => TextEditingController(),
  );
  final List<FocusNode> _focusNodes = List.generate(6, (index) => FocusNode());
  bool _isVerifying = false;
  bool _isResending = false;

  // Timer related variables
  Timer? _resendTimer;
  int _resendCountdown = 0;
  int _resendAttempts = 0;

  // Add notification service
  final FirebaseNotificationService _notificationService =
  FirebaseNotificationService();

  @override
  void initState() {
    super.initState();
    _otpSentTime = widget.otpSentTime ?? DateTime.now();

    // Start initial resend timer
    _startResendTimer();
  }

  // Start resend timer with progressive delays
  void _startResendTimer() {
    // Progressive delays: 30s, 45s, 1m, 2m, 3m, then cap at 5m
    final delays = [30, 45, 60, 120, 180, 300]; // in seconds
    final delayIndex = _resendAttempts.clamp(0, delays.length - 1);
    _resendCountdown = delays[delayIndex];


    _resendTimer?.cancel();
    _resendTimer = Timer.periodic(Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _resendCountdown--;
        });

        if (_resendCountdown <= 0) {
          timer.cancel();
        }
      } else {
        timer.cancel();
      }
    });
  }

  // Format countdown display
  String _formatCountdown() {
    if (_resendCountdown <= 0) return '';

    if (_resendCountdown >= 60) {
      final minutes = _resendCountdown ~/ 60;
      final seconds = _resendCountdown % 60;
      return ' (${minutes}m ${seconds}s)';
    } else {
      return ' (${_resendCountdown}s)';
    }
  }

  Future<void> _resendOtp() async {
    if (_resendCountdown > 0 || _isResending) return;

    setState(() => _isResending = true);

    // Clear current OTP
    for (var controller in _controllers) {
      controller.clear();
    }

    // Increment resend attempts
    _resendAttempts++;

    try {
      final result = await ApiService.sendOtp(widget.phone);

      if (result['success']) {
        final data = result['data'];
        if (data['success'] == true) {
          _otpSentTime = DateTime.now();

          // Start new timer for next resend
          _startResendTimer();

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.white),
                    SizedBox(width: 8),
                    Text('OTP resent successfully'),
                  ],
                ),
                backgroundColor: Colors.green,
                duration: Duration(seconds: 2),
              ),
            );
            _focusNodes[0].requestFocus();
          }
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(data['message'] ?? 'Failed to resend OTP'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['error'] ?? 'Network error'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error resending OTP: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }

    if (mounted) {
      setState(() => _isResending = false);
    }
  }

  void _fillOtp(String otp) {
    for (int i = 0; i < 6; i++) {
      _controllers[i].text = i < otp.length ? otp[i] : '';
    }
    setState(() {});

    if (otp.length == 6) {
      _focusNodes[5].requestFocus();
    }
  }

  String _getCurrentOtp() {
    return _controllers.map((controller) => controller.text).join();
  }

  void _onOtpChanged(String value, int index) {
    if (value.isEmpty) {
      if (index > 0) {
        _focusNodes[index - 1].requestFocus();
      }
      return;
    }

    if (value.length > 1) {
      String digits = value.replaceAll(RegExp(r'\D'), '');
      if (digits.length >= 6) {
        _fillOtp(digits.substring(0, 6));
        return;
      } else {
        _controllers[index].text = digits.isNotEmpty ? digits[0] : '';
        if (index < 5 && digits.isNotEmpty) {
          _focusNodes[index + 1].requestFocus();
        }
        return;
      }
    }

    if (value.length == 1 && RegExp(r'\d').hasMatch(value)) {
      if (index < 5) {
        _focusNodes[index + 1].requestFocus();
      }
    }
  }

  @override
  void dispose() {
    _resendTimer?.cancel();

    for (var controller in _controllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  // Keep all your existing methods unchanged
  Future<void> _onOtpVerificationSuccess(
      Map<String, dynamic> loginData,
      bool hasToken,
      ) async {
    try {
      final userDataService = UserData();

      if (hasToken) {
        final token = loginData['token'];

        final profileResult = await ApiService.getProfile(token);

        if (profileResult['success']) {
          final userProfile = profileResult['data'];

          final userModel = UserModel(
            phone: userProfile['phone'] ?? widget.phone,
            token: token,
            isLoggedIn: true,
            createdAt: DateTime.now(),
            id: userProfile['_id'] ?? userProfile['id'],
            name: userProfile['name'],
            email: userProfile['email'],
          );

          await userDataService.saveUser(userModel);

          await _detectAndAssignWarehouse(token);
          await _registerFCMToken(userDataService);

          if (widget.onLoginSuccess != null) {
            widget.onLoginSuccess!();
          }

          // AFTER: This pushes '/main' and removes everything behind it.
          if (mounted) {
            Navigator.pushNamedAndRemoveUntil(
              context,
              '/main',
                  (Route<dynamic> route) => false,
            );
          }
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  profileResult['error'] ??
                      'Could not retrieve your profile. Please try again.',
                ),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      } else {
        final userModel = UserModel(
          phone: widget.phone,
          isLoggedIn: false,
          createdAt: DateTime.now(),
        );

        await userDataService.saveUser(userModel);

        // AFTER: This pushes the new screen and removes everything behind it.
        if (mounted) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(
              builder:
                  (context) => ProfileCompletionScreen(phone: widget.phone),
            ),
                (Route<dynamic> route) => false,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('An unexpected error occurred during login.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _detectAndAssignWarehouse(String userToken) async {
    try {
      WarehouseModeController.printCurrentMode();

      if (WarehouseModeController.isTestingMode) {

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.science, color: Colors.white, size: 16),
                  SizedBox(width: 8),
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(width: 12),
                  Text('🧪 Setting up testing warehouse...'),
                ],
              ),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 2),
            ),
          );
        }

        final testingResult =
        await TestingWarehouseService.autoAssignTestingWarehouse();

        if (testingResult.isServiceable) {

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.white),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        testingResult.deliveryTime != null
                            ? '🧪 Testing Mode: Delivery in ${testingResult.deliveryTime} mins'
                            : '🧪 Testing Mode: Warehouse connected',
                      ),
                    ),
                  ],
                ),
                backgroundColor: Colors.green,
                duration: Duration(seconds: 3),
              ),
            );
          }
        } else {

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    Icon(Icons.warning, color: Colors.white),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text('🧪 Testing: ${testingResult.message}'),
                    ),
                  ],
                ),
                backgroundColor: Colors.orange,
                duration: Duration(seconds: 4),
              ),
            );
          }
        }
      } else {

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.rocket_launch, color: Colors.white, size: 16),
                  SizedBox(width: 8),
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(width: 12),
                  Text('Setting up your location...'),
                ],
              ),
              backgroundColor: Colors.blue,
              duration: Duration(seconds: 2),
            ),
          );
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.white),
                  SizedBox(width: 4),
                  Text('🚀 Production mode'),
                ],
              ),
              backgroundColor: Colors.grey[600],
              duration: Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (e) {

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.warning_amber, color: Colors.white, size: 16),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    WarehouseModeController.isTestingMode
                        ? '🧪 Testing setup will continue in background'
                        : 'Location services will be set up in background',
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.grey[600],
            duration: Duration(seconds: 3),
          ),
        );
      }
    }
  }

  Future<void> _registerFCMToken(UserData userDataService) async {
    try {

      await userDataService.registerFCMTokenAfterLogin();

      final currentToken = await _notificationService.getCurrentToken();
      if (currentToken != null) {
      }
    } catch (e) {

      try {
        await _notificationService.registerDeviceTokenAfterLogin();
      } catch (altError) {
        rethrow;
      }
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _getCurrentOtp();
    if (otp.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter the 6-digit OTP'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_otpSentTime != null) {
      final timeDiff = DateTime.now().difference(_otpSentTime!);

      if (timeDiff.inSeconds < 5) {
        await Future.delayed(Duration(seconds: 5 - timeDiff.inSeconds));
      }

      if (timeDiff.inMinutes > 10) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Row(
                children: [
                  Icon(Icons.access_time, color: Colors.white),
                  SizedBox(width: 8),
                  Text('OTP expired. Please request a new one.'),
                ],
              ),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }
    }

    setState(() => _isVerifying = true);

    try {
      final result = await ApiService.verifyOtp(widget.phone, otp);

      if (result.containsKey('data') && result['data'] != null) {
        final data = result['data'];

        if (data['success'] == true) {

          if (data['data'] != null && data['data']['token'] != null) {
            await _onOtpVerificationSuccess(data['data'], true);
          } else {
            await _onOtpVerificationSuccess({}, false);
          }
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    Icon(Icons.error, color: Colors.white),
                    SizedBox(width: 8),
                    Text(data['message'] ?? 'Invalid or expired OTP'),
                  ],
                ),
                backgroundColor: Colors.red,
              ),
            );

            for (var controller in _controllers) {
              controller.clear();
            }
            _focusNodes[0].requestFocus();
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['error'] ?? 'Network error occurred'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.error_outline, color: Colors.white),
                SizedBox(width: 8),
                Expanded(child: Text('Error: ${e.toString()}')),
              ],
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    }

    if (mounted) {
      setState(() => _isVerifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF8B1A1A)),
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Lottie Animation at the top
                Center(
                  child: SizedBox(
                    height: 180,
                    width: 180,
                    child: Lottie.asset(
                      'assets/animations/otp.json',
                      fit: BoxFit.contain,
                      repeat: true,
                      animate: true,
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                Text(
                  'Verify Phone',
                  style: TextStyle(
                    color: const Color(0xFF8B1A1A),
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Enter the verification code sent to your phone',
                  style: TextStyle(color: Colors.grey[700], fontSize: 16),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.phone,
                  style: TextStyle(
                    color: Colors.black87,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 40),

                // OTP Input Fields
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(6, (index) {
                    final hasValue = _controllers[index].text.isNotEmpty;
                    return SizedBox(
                      width: 44,
                      child: TextField(
                        controller: _controllers[index],
                        focusNode: _focusNodes[index],
                        onChanged: (value) => _onOtpChanged(value, index),
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        maxLength: 6,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                        ],
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color:
                          hasValue ? Colors.green.shade700 : Colors.black87,
                        ),
                        decoration: InputDecoration(
                          counterText: '',
                          filled: hasValue,
                          fillColor: hasValue ? Colors.green.shade50 : null,
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                              color:
                              hasValue ? Colors.green : Color(0xFF8B1A1A),
                              width: hasValue ? 2 : 1,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: Color(0xFF8B1A1A),
                              width: 2,
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 40),

                // Verify Button
                Center(
                  child: SizedBox(
                    width: 160,
                    height: 44,
                    child: ElevatedButton(
                      onPressed: _isVerifying ? null : _verifyOtp,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF8B1A1A),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(22),
                        ),
                        elevation: 0,
                      ),
                      child: _isVerifying
                          ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                          : const Text(
                        'Verify',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Resend OTP Button with Timer
                Center(
                  child: TextButton(
                    onPressed: (_isResending || _resendCountdown > 0)
                        ? null
                        : _resendOtp,
                    child: _isResending
                        ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            color: Color(0xFF8B1A1A),
                            strokeWidth: 2,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Resending...',
                          style: TextStyle(
                            color: const Color(0xFF8B1A1A),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    )
                        : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.refresh,
                          size: 18,
                          color: _resendCountdown > 0
                              ? Colors.grey
                              : const Color(0xFF8B1A1A),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Resend OTP${_formatCountdown()}',
                          style: TextStyle(
                            color: _resendCountdown > 0
                                ? Colors.grey
                                : const Color(0xFF8B1A1A),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 60),
              ],
            ),
          ),
        ),
      ),
    );
  }
}