// profile_completion_screen.dart
import 'package:eshop/services/Referals/referal_services.dart';
import 'package:flutter/material.dart';
import '../model/Login/user_model.dart';
import '../services/Login/api_service.dart';
import 'user_data.dart';

class ProfileCompletionScreen extends StatefulWidget {
  final String phone;

  const ProfileCompletionScreen({Key? key, required this.phone})
    : super(key: key);

  @override
  State<ProfileCompletionScreen> createState() =>
      _ProfileCompletionScreenState();
}

class _ProfileCompletionScreenState extends State<ProfileCompletionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _countryController = TextEditingController();
  bool _isApplying = false;
  final TextEditingController _applyController = TextEditingController();
  List<String> referrals = [];

  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _countryController.dispose();
    super.dispose();
  }

  Future<void> _completeProfile() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    final result = await ApiService.completeProfile(
      phone: widget.phone,
      name: _nameController.text.trim(),
      email:
          _emailController.text.trim().isEmpty
              ? null
              : _emailController.text.trim(),
      city:
          _cityController.text.trim().isEmpty
              ? null
              : _cityController.text.trim(),
      state:
          _stateController.text.trim().isEmpty
              ? null
              : _stateController.text.trim(),
      country:
          _countryController.text.trim().isEmpty
              ? null
              : _countryController.text.trim(),
    );

    if (result['success']) {
      final data = result['data'];
      if (data['success'] == true) {
        // Save complete user profile
        final userModel = UserModel(
          phone: widget.phone,
          name: _nameController.text.trim(),
          email:
              _emailController.text.trim().isEmpty
                  ? null
                  : _emailController.text.trim(),
          city:
              _cityController.text.trim().isEmpty
                  ? null
                  : _cityController.text.trim(),
          state:
              _stateController.text.trim().isEmpty
                  ? null
                  : _stateController.text.trim(),
          country:
              _countryController.text.trim().isEmpty
                  ? null
                  : _countryController.text.trim(),
          token: data['data']['token'],
          isLoggedIn: true,
          createdAt: DateTime.now(),
        );

        final userData = UserData();
        await userData.saveUser(userModel);

        // Navigate to main screen
        Navigator.pushReplacementNamed(context, '/main');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(data['message'] ?? 'Failed to complete profile'),
          ),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['error'] ?? 'Network error')),
      );
    }

    setState(() => _isLoading = false);
  }

  Future<void> _applyCode() async {
    final code = _applyController.text.trim();
    if (code.isEmpty) {
      _showSnackBar(
        'Please enter a referral code',
        Icons.warning_amber,
        Colors.orange,
      );
      return;
    }

    setState(() => _isApplying = true);
    final userData = UserData();
    final token = userData.getToken();
    final resp = await ReferralService.applyReferralCodeToServer(
      code,
      token: token,
    );
    setState(() => _isApplying = false);

    final success = resp['success'] == true;
    final message =
        resp['message'] ??
        (success
            ? 'Referral applied successfully!'
            : 'Failed to apply referral code');

    _showSnackBar(
      message,
      success ? Icons.check_circle : Icons.error_outline,
      success ? Colors.green : Colors.red,
    );

    if (success) {
      final display =
          resp['data'] != null && resp['data']['referralId'] != null
              ? '${code} (id:${resp['data']['referralId']})'
              : code;
      setState(() {
        referrals.insert(0, display);
        _applyController.clear();
      });
    }
  }

  void _showSnackBar(String message, IconData icon, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF8B1A1A)),
        title: Text(
          'Complete Profile',
          style: TextStyle(
            color: const Color(0xFF8B1A1A),
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 20),
                Text(
                  'Please complete your profile to continue',
                  style: TextStyle(color: Colors.grey[700], fontSize: 16),
                ),
                const SizedBox(height: 30),

                // Name Field (Required)
                _buildInputField(
                  controller: _nameController,
                  label: 'FULL NAME',
                  isRequired: true,
                ),
                const SizedBox(height: 24),

                // Email Field (Optional)
                _buildInputField(
                  controller: _emailController,
                  label: 'EMAIL',
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 24),

                // City Field (Optional)
                _buildInputField(controller: _cityController, label: 'CITY'),
                const SizedBox(height: 24),

                // State Field (Optional)
                _buildInputField(controller: _stateController, label: 'STATE'),
                const SizedBox(height: 24),

                // Country Field (Optional)
                _buildInputField(
                  controller: _countryController,
                  label: 'COUNTRY',
                ),

                const SizedBox(height: 30),
                // Apply Referral Code Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        spreadRadius: 0,
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.green.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Icons.redeem_rounded,
                              color: const Color(0xFF8B1A1A),
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Text(
                            "Have a Referral Code?",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                          ),
                        ],
                      ),

                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _applyController,
                              decoration: InputDecoration(
                                hintText: 'Enter referral code',
                                hintStyle: TextStyle(
                                  color: Colors.grey.shade400,
                                ),
                                filled: true,
                                fillColor: Colors.grey.shade50,
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 14,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: Colors.grey.shade200,
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: Colors.grey.shade200,
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: Colors.green.shade400,
                                    width: 2,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          ElevatedButton(
                            onPressed: _isApplying ? null : _applyCode,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Color(0xFF8B1A1A),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                                vertical: 14,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                            ),
                            child:
                                _isApplying
                                    ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor:
                                            AlwaysStoppedAnimation<Color>(
                                              Colors.white,
                                            ),
                                      ),
                                    )
                                    : const Text(
                                      'Apply',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                SizedBox(height: 30),
                // Complete Profile Button
                Center(
                  child: SizedBox(
                    width: 200,
                    height: 44,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _completeProfile,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF8B1A1A),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(22),
                        ),
                        elevation: 0,
                      ),
                      child:
                          _isLoading
                              ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                              : const Text(
                                'Complete Profile',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                    ),
                  ),
                ),
                SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String label,
    bool isRequired = false,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label + (isRequired ? ' *' : ''),
          style: TextStyle(
            color: const Color(0xFF8B1A1A),
            fontSize: 13,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          style: const TextStyle(color: Colors.black, fontSize: 16),
          validator:
              isRequired
                  ? (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'This field is required';
                    }
                    return null;
                  }
                  : null,
          decoration: InputDecoration(
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(vertical: 10),
            border: InputBorder.none,
            enabledBorder: UnderlineInputBorder(
              borderSide: BorderSide(color: Color(0xFF8B1A1A), width: 1),
            ),
            focusedBorder: UnderlineInputBorder(
              borderSide: BorderSide(color: Color(0xFF8B1A1A), width: 1.2),
            ),
            errorBorder: UnderlineInputBorder(
              borderSide: BorderSide(color: Colors.red, width: 1),
            ),
            focusedErrorBorder: UnderlineInputBorder(
              borderSide: BorderSide(color: Colors.red, width: 1.2),
            ),
          ),
        ),
      ],
    );
  }
}
