import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/Referals/referal_services.dart';
import '../../authentication/user_data.dart';

class ReferEarnScreen extends StatefulWidget {
  const ReferEarnScreen({super.key});

  @override
  State<ReferEarnScreen> createState() => _ReferEarnScreenState();
}

class _ReferEarnScreenState extends State<ReferEarnScreen>
    with SingleTickerProviderStateMixin {
  String referralCode = "-";
  List<String> referrals = [];
  // final TextEditingController _applyController = TextEditingController();
  bool _isGenerating = false;
  // bool _isApplying = false;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    );
    _animationController.forward();
    _loadReferral();
  }

  @override
  void dispose() {
    // _applyController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  void copyCode() {
    if (referralCode == "-") return;

    Clipboard.setData(ClipboardData(text: referralCode));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: const [
            Icon(Icons.check_circle, color: Colors.white),
            SizedBox(width: 12),
            Text("Referral code copied to clipboard!"),
          ],
        ),
        backgroundColor: Colors.green.shade600,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _loadReferral() async {
    final userData = UserData();
    final userId = userData.getUserId();
    final token = userData.getToken();

    setState(() => _isGenerating = true);
    String? code;
    if (userId != null && userId.isNotEmpty) {
      code = await ReferralService.generateReferralFromServer(
        userId,
        token: token,
      );
    }
    code ??= await ReferralService.getReferralCode();

    setState(() {
      referralCode = code ?? '-';
      _isGenerating = false;
    });
  }

  /* Future<void> _generateNow() async {
  //   final userData = UserData();
  //   final userId = userData.getUserId();
  //   final token = userData.getToken();

  //   if (userId == null || userId.isEmpty) {
  //     _showSnackBar(
  //       'Please login to generate your referral',
  //       Icons.info_outline,
  //       Colors.orange,
  //     );
  //     return;
  //   }

  //   setState(() => _isGenerating = true);
  //   final code = await ReferralService.generateReferralFromServer(
  //     userId,
  //     token: token,
  //   );

  //   setState(() {
  //     if (code != null) referralCode = code;
  //     _isGenerating = false;
  //   });

  //   if (code != null) {
  //     _showSnackBar(
  //       'Referral code generated successfully!',
  //       Icons.check_circle,
  //       Colors.green,
  //     );
  //   } else {
  //     _showSnackBar(
  //       'Failed to generate referral code',
  //       Icons.error_outline,
  //       Colors.red,
  //     );
  //   }
  // }

  // Future<void> _applyCode() async {
  //   final code = _applyController.text.trim();
  //   if (code.isEmpty) {
  //     _showSnackBar(
  //       'Please enter a referral code',
  //       Icons.warning_amber,
  //       Colors.orange,
  //     );
  //     return;
  //   }

  //   setState(() => _isApplying = true);
  //   final userData = UserData();
  //   final token = userData.getToken();
  //   final resp = await ReferralService.applyReferralCodeToServer(
  //     code,
  //     token: token,
  //   );
  //   setState(() => _isApplying = false);

  //   final success = resp['success'] == true;
  //   final message =
  //       resp['message'] ??
  //       (success
  //           ? 'Referral applied successfully!'
  //           : 'Failed to apply referral code');

  //   _showSnackBar(
  //     message,
  //     success ? Icons.check_circle : Icons.error_outline,
  //     success ? Colors.green : Colors.red,
  //   );

  //   if (success) {
  //     final display =
  //         resp['data'] != null && resp['data']['referralId'] != null
  //             ? '${code} (id:${resp['data']['referralId']})'
  //             : code;
  //     setState(() {
  //       referrals.insert(0, display);
  //       _applyController.clear();
  //     });
  //   }
  // }*/

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
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          "Refer & Earn",
          style: TextStyle(
            color: Colors.black87,
            fontWeight: FontWeight.w600,
            fontSize: 20,
          ),
        ),
        centerTitle: true,
      ),
      backgroundColor: Colors.grey.shade50,
      body: FadeTransition(
        opacity: _fadeAnimation,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            children: [
              // Hero Section
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.blue.shade400, Colors.blue.shade600],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.blue.withOpacity(0.3),
                      spreadRadius: 0,
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: Image.asset(
                        'assets/images/gift.png',
                        height: 80,
                        errorBuilder:
                            (context, error, stackTrace) => const Icon(
                              Icons.card_giftcard,
                              size: 80,
                              color: Colors.white,
                            ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      "Invite Friends & Earn Rewards!",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      "Share your code and get points when friends sign up",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.9),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Your Referral Code Card
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
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.qr_code,
                            color: Colors.blue.shade600,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Text(
                          "Your Referral Code",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child:
                                _isGenerating
                                    ? const Center(
                                      child: SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      ),
                                    )
                                    : Text(
                                      referralCode,
                                      style: TextStyle(
                                        fontSize: 18,
                                        letterSpacing: 2,
                                        fontWeight: FontWeight.bold,
                                        color:
                                            referralCode == "-"
                                                ? Colors.grey.shade400
                                                : Colors.black87,
                                      ),
                                    ),
                          ),
                          if (!_isGenerating && referralCode != "-")
                            IconButton(
                              icon: Icon(
                                Icons.copy_rounded,
                                color: Colors.blue.shade600,
                              ),
                              onPressed: copyCode,
                              tooltip: 'Copy code',
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    // SizedBox(
                    //   width: double.infinity,
                    //   child: ElevatedButton.icon(
                    //     onPressed: _isGenerating ? null : _generateNow,
                    //     icon:
                    //         _isGenerating
                    //             ? const SizedBox(
                    //               width: 16,
                    //               height: 16,
                    //               child: CircularProgressIndicator(
                    //                 strokeWidth: 2,
                    //                 valueColor: AlwaysStoppedAnimation<Color>(
                    //                   Colors.white,
                    //                 ),
                    //               ),
                    //             )
                    //             : const Icon(Icons.refresh_rounded, size: 20),
                    //     label: Text(
                    //       _isGenerating ? 'Generating...' : 'Generate New Code',
                    //       style: const TextStyle(
                    //         fontSize: 15,
                    //         fontWeight: FontWeight.w600,
                    //       ),
                    //     ),
                    //     style: ElevatedButton.styleFrom(
                    //       backgroundColor: Colors.blue.shade600,
                    //       foregroundColor: Colors.white,
                    //       padding: const EdgeInsets.symmetric(vertical: 14),
                    //       shape: RoundedRectangleBorder(
                    //         borderRadius: BorderRadius.circular(12),
                    //       ),
                    //       elevation: 0,
                    //     ),
                    //   ),
                    // ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              const SizedBox(height: 24),

              // Referrals List
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
                            color: Colors.purple.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.people_rounded,
                            color: Colors.purple.shade600,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Text(
                          "Your Referrals",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.purple.shade50,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${referrals.length}',
                            style: TextStyle(
                              color: Colors.purple.shade600,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (referrals.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          child: Column(
                            children: [
                              Icon(
                                Icons.people_outline,
                                size: 48,
                                color: Colors.grey.shade300,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'No referrals yet',
                                style: TextStyle(
                                  color: Colors.grey.shade400,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: referrals.length,
                        separatorBuilder:
                            (context, index) => Divider(
                              height: 24,
                              color: Colors.grey.shade100,
                            ),
                        itemBuilder: (context, index) {
                          return Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      Colors.purple.shade300,
                                      Colors.purple.shade500,
                                    ],
                                  ),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.person_rounded,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Text(
                                  referrals[index],
                                  style: const TextStyle(
                                    color: Colors.black87,
                                    fontWeight: FontWeight.w500,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                              Icon(
                                Icons.check_circle,
                                color: Colors.green.shade400,
                                size: 20,
                              ),
                            ],
                          );
                        },
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
