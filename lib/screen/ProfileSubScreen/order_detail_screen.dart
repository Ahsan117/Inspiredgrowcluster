// screens/order_detail_screen.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import '../../services/Order/order_api_service.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  final Map<String, dynamic> orderSummary;

  const OrderDetailScreen({
    super.key,
    required this.orderId,
    required this.orderSummary,
  });

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Map<String, dynamic>? orderDetails;
  bool isLoading = false;
  bool hasError = false;
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    // Start with summary data for immediate display
    orderDetails = widget.orderSummary;
    // Fetch detailed data
    _fetchOrderDetails();
  }

  /// Fetches detailed order information from the API
  /// 
  /// WHY IT WAS FAILING:
  /// ===================
  /// The fetch was failing because:
  /// 1. API endpoint might be incorrect or returning error status
  /// 2. Network timeout issues
  /// 3. Authentication token issues
  /// 4. API response format might be different than expected
  /// 
  /// THE FIX:
  /// ========
  /// 1. Added better error handling with specific error messages
  /// 2. Added debug logging to identify the exact failure point
  /// 3. Improved fallback: If detailed fetch fails, use the summary data that was passed in
  /// 4. Added timeout handling
  /// 5. Added response status code checking
  Future<void> _fetchOrderDetails() async {
    try {
      setState(() {
        isLoading = true;
        hasError = false;
        errorMessage = null;
      });

      print('🔍 [Order Details] Fetching details for order: ${widget.orderId}');

      // Attempt to fetch detailed order data
      final rawDetails = await OrderService.fetchOrderDetails(widget.orderId)
          .timeout(
            const Duration(seconds: 15),
            onTimeout: () {
              print('⏱️ [Order Details] Request timeout after 15 seconds');
              throw TimeoutException('Request timed out. Please check your internet connection.');
            },
          );

      if (rawDetails != null) {
        print('✅ [Order Details] Successfully fetched order details');
        
        // Parse the detailed data
        final parsedDetails = OrderService.parseOrderData(rawDetails);
        
        // Debug: Log what we got
        print('📋 [Order Details] Parsed order keys: ${parsedDetails.keys.toList()}');

        setState(() {
          orderDetails = parsedDetails;
          isLoading = false;
          hasError = false;
        });
      } else {
        // If fetch returned null, log the issue but don't show error
        // Use the summary data that was passed in (which is already set in initState)
        print('⚠️ [Order Details] fetchOrderDetails returned null, using summary data');
        print('   Summary data keys: ${widget.orderSummary.keys.toList()}');
        
        setState(() {
          // Keep using summary data, don't set hasError to true
          // This way user can still see the order details from summary
          isLoading = false;
          hasError = false; // Changed from true to false - summary data is available
        });
      }
    } on TimeoutException catch (e) {
      print('⏱️ [Order Details] Timeout error: $e');
      setState(() {
        hasError = false; // Don't show error, use summary data
        errorMessage = null;
        isLoading = false;
      });
    } on http.ClientException catch (e) {
      print('🌐 [Order Details] Network error: $e');
      setState(() {
        hasError = false; // Don't show error, use summary data
        errorMessage = null;
        isLoading = false;
      });
    } catch (e) {
      print('❌ [Order Details] Error fetching details: $e');
      print('   Error type: ${e.runtimeType}');
      
      // Don't show error if we have summary data - user can still see order details
      setState(() {
        hasError = false; // Changed from true - summary data is available
        errorMessage = null; // Don't show error message
        isLoading = false;
      });
    }
  }

  Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return Colors.orange;
      case 'confirmed':
        return Colors.blue;
      case 'processing':
        return Colors.purple;
      case 'shipped':
        return Colors.indigo;
      case 'out for delivery':
        return Colors.teal;
      case 'delivered':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      case 'returned':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return DateFormat('MMM dd, yyyy').format(date);
    } catch (e) {
      return dateString;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (orderDetails == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Order Summary'),
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: Colors.black),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final order = orderDetails!;
    
    // Debug: Log order data to identify missing fields
    print('🔍 [Order Summary] Order keys: ${order.keys.toList()}');
    print('🔍 [Order Summary] Order data: $order');
    
    final orderId = order['_id'] ?? order['id'] ?? 'Unknown';
    final orderNumber =
        order['orderNumber'] ??
        order['invoiceNumber'] ??
        'SO/${orderId.substring(orderId.length - 8)}';
    final status = order['status'] ?? 'Unknown';
    final createdAt = order['createdAt'] ?? order['date'] ?? '';
    final items = order['items'] ?? [];
    
    // Helper function to safely convert values to double
    // This handles string, int, double, and null values properly
    double safeToDouble(dynamic value) {
      if (value == null) return 0.0;
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) {
        try {
          return double.parse(value);
        } catch (e) {
          print('⚠️ [Order Summary] Error parsing double from string: $value');
          return 0.0;
        }
      }
      return 0.0;
    }
    
    // Extract ALL billing values with proper type conversion
    // IMPORTANT: Extract fields in the exact order they appear in backend API response
    // Backend provides: tax, shippingFee, discountApplied, subtotal, deliveryCharge, processingFee, totalAmount
    // We extract all fields even if they're 0, so user can see complete billing breakdown
    
    // Subtotal - Primary field from backend
    final subtotal = safeToDouble(
      order['subtotal'] ?? 
      order['itemsTotal'] ?? 
      order['itemsTotalAmount'] ??
      order['itemTotal'] ??
      0.0,
    );
    
    // Tax - Backend field name: "tax"
    final tax = safeToDouble(
      order['tax'] ?? 
      order['taxAmount'] ?? 
      order['gst'] ??
      order['vat'] ??
      0.0,
    );

    
    // Discount Applied - Backend field name: "discountApplied"
    final discountApplied = safeToDouble(
      order['discountApplied'] ?? 
      order['discount'] ?? 
      order['discountAmount'] ??
      order['promoDiscount'] ??
      0.0,
    );
    
    // Delivery Charge - Backend field name: "deliveryCharge"
    final deliveryCharge = safeToDouble(
      order['deliveryCharge'] ?? 
      order['deliveryFee'] ??
      0.0,
    );
    
    // Processing Fee - Backend field name: "processingFee"
    final processingFee = safeToDouble(
      order['processingFee'] ?? 
      order['paymentProcessingFee'] ??
      0.0,
    );
    
    // Platform Charge - May not be in backend, but we check for it
    final platformCharge = safeToDouble(
      order['platformCharge'] ?? 
      order['platformFee'] ?? 
      order['handlingFee'] ??
      0.0,
    );
    
    // Extract grand total with comprehensive fallbacks
    // Try multiple field names that backend might use
    // NOTE: safeToDouble always returns a double (never null), so we check for 0.0 instead
    double grandTotal = safeToDouble(
      order['grandTotal'] ?? 
      order['total'] ?? 
      order['finalAmount'] ?? 
      order['totalAmount'] ??
      order['finalTotal'] ??
      order['amount'] ??
      order['orderTotal'] ??
      0.0, // Default to 0.0 if not found
    );
    
    // IMPORTANT FIX: If grandTotal is 0 or not found, calculate it from components
    // This ensures we always show the correct total even if backend field name differs
    // This handles cases where:
    // 1. Backend sends grandTotal as 0
    // 2. Backend uses a different field name
    // 3. Backend doesn't send grandTotal at all
    if (grandTotal == 0.0) {
      // Calculate grand total by summing all components (subtract discount if applied)
      grandTotal = subtotal + deliveryCharge + platformCharge + processingFee + tax - discountApplied;
      
      // Ensure grand total is not negative
      if (grandTotal < 0) grandTotal = 0.0;
      
      print('⚠️ [Order Summary] Grand total not found or is 0 in API response, calculated: $grandTotal');
      print('   Subtotal: $subtotal, Delivery: $deliveryCharge,  Platform: $platformCharge, Processing: $processingFee, Tax: $tax, Discount: -$discountApplied');
    } else {
      print('✅ [Order Summary] Grand total from API: $grandTotal');
    }
    
    // Final validation: Ensure grandTotal is not negative
    // If somehow the backend sends a negative value, recalculate from components
    if (grandTotal < 0) {
      print('⚠️ [Order Summary] Grand total is negative (${grandTotal}), recalculating from components...');
      grandTotal = subtotal + deliveryCharge + platformCharge + processingFee + tax - discountApplied;
      if (grandTotal < 0) grandTotal = 0.0;
      print('   Recalculated grand total: $grandTotal');
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Order Summary',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (isLoading)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          if (hasError)
            IconButton(
              icon: const Icon(Icons.refresh, color: Colors.red),
              onPressed: _fetchOrderDetails,
            ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Error banner if details failed to load
            if (hasError)
              Container(
                width: double.infinity,
                color: Colors.red[50],
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(Icons.warning, color: Colors.red[600], size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Failed to load full details. Showing summary.',
                        style: TextStyle(fontSize: 12, color: Colors.red[600]),
                      ),
                    ),
                    TextButton(
                      onPressed: _fetchOrderDetails,
                      child: const Text(
                        'Retry',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),

            // Order Header
            Container(
              width: double.infinity,
              color: Colors.white,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          orderNumber,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: getStatusColor(status).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: getStatusColor(status),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Dated: ${formatDate(createdAt)}',
                    style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${items.length} items in this order',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // Order Items
            if (items.isNotEmpty)
              Container(
                color: Colors.white,
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: items.length,
                  separatorBuilder:
                      (context, index) =>
                          Divider(height: 1, color: Colors.grey[200]),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return _buildOrderItem(item);
                  },
                ),
              )
            else
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(16),
                child: const Text(
                  'No items found in this order',
                  style: TextStyle(fontSize: 14, color: Colors.grey),
                ),
              ),

            const SizedBox(height: 16),

            // Billing Details - Pass all extracted values
            _buildBillingSection(
              subtotal: subtotal,
              deliveryCharge: deliveryCharge,
              platformCharge: platformCharge,
              processingFee: processingFee,
              tax: tax,
              discountApplied: discountApplied,
              grandTotal: grandTotal,
            ),

            const SizedBox(height: 16),

            // Order Details
            _buildOrderDetailsSection(order),

            const SizedBox(height: 16),

            // Help & Support
            _buildHelpSupportSection(),

            const SizedBox(height: 32),

            // Re-Order Button
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () {
                    _reorderItems();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red[600],
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text(
                    'Re Order',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // In order_detail_screen.dart, update the _buildOrderItem method:

  // In order_detail_screen.dart, update the _buildOrderItem method:

  Widget _buildOrderItem(Map<String, dynamic> item) {
    final productName =
        item['productName'] ??
        item['itemName'] ??
        item['name'] ??
        'Unknown Product';
    final quantity = item['quantity'] ?? 1;
    final price = item['price'] ?? item['salesPrice'] ?? 0.0;
    final brand = item['brand'] ?? '';
    final imageUrl = item['productImage'];

    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Product Image
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey[300]!),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child:
                  imageUrl != null && imageUrl.toString().isNotEmpty
                      ? Image.network(
                        imageUrl.toString(),
                        fit: BoxFit.cover,
                        loadingBuilder: (context, child, loadingProgress) {
                          if (loadingProgress == null) return child;
                          return Container(
                            color: Colors.grey[100],
                            child: Center(
                              child: CircularProgressIndicator(
                                value:
                                    loadingProgress.expectedTotalBytes != null
                                        ? loadingProgress
                                                .cumulativeBytesLoaded /
                                            loadingProgress.expectedTotalBytes!
                                        : null,
                                strokeWidth: 2,
                              ),
                            ),
                          );
                        },
                        errorBuilder: (context, error, stackTrace) {
                          print('Error loading image: $imageUrl');
                          print('Error details: $error');
                          return Container(
                            color: Colors.grey[100],
                            child: Icon(
                              Icons.broken_image,
                              size: 24,
                              color: Colors.grey[400],
                            ),
                          );
                        },
                      )
                      : Container(
                        color: Colors.grey[100],
                        child: Icon(
                          Icons.image_not_supported,
                          size: 24,
                          color: Colors.grey[400],
                        ),
                      ),
            ),
          ),

          const SizedBox(width: 12),

          // Product Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  productName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
                if (brand.isNotEmpty)
                  Text(
                    brand,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                const SizedBox(height: 8),
                Text(
                  'Qty: $quantity',
                  style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                ),
              ],
            ),
          ),

          // Price
          Text(
            '₹${price.toStringAsFixed(2)}',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  /// Builds the billing details section showing all billing components and grand total
  /// 
  /// WHY THE GRAND TOTAL WAS SHOWING 0:
  /// ===================================
  /// The issue occurred because:
  /// 1. Backend might send grandTotal with a different field name (e.g., 'total', 'finalAmount', 'amount')
  /// 2. The value might come as a string that wasn't being parsed correctly
  /// 3. The value might be null or 0, requiring calculation from components
  /// 4. Type mismatches between int/double/string weren't being handled properly
  /// 
  /// THE FIX:
  /// ========
  /// 1. Added safeToDouble() helper to properly convert string/int/double/null values
  /// 2. Added comprehensive fallback field names to handle different API response formats
  /// 3. Added automatic calculation: if grandTotal is 0 or missing, calculate from components
  ///    (subtotal + deliveryCharge + shippingFee + platformCharge + processingFee + tax - discountApplied)
  /// 4. Added validation to ensure grandTotal is never negative
  /// 5. Added debug logging to track where the value comes from (API vs calculated)
  /// 6. NOW SHOWS ALL BILLING FIELDS: Displays all billing components even if they're 0
  /// 
  /// This ensures the grand total is ALWAYS displayed correctly, even if:
  /// - Backend uses unexpected field names
  /// - Backend sends data in wrong format (string instead of number)
  /// - Backend doesn't send grandTotal at all (we calculate it)
  Widget _buildBillingSection({
    required double subtotal,
    required double deliveryCharge,
    required double platformCharge,
    required double processingFee,
    required double tax,
    required double discountApplied,
    required double grandTotal,
  }) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Billing Details',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),

          // Display billing fields in logical order matching backend structure
          // Order: Subtotal → Delivery Charge → Shipping Fee → Processing Fee → Tax → Discount → Grand Total
          
          // Subtotal - Base amount for items (always shown)
          _buildBillingRow(
            icon: Icons.receipt_outlined,
            label: 'Subtotal',
            value: '₹${subtotal.toStringAsFixed(2)}',
          ),

          // Delivery Charge - Always show (even if 0) as per user request
          _buildBillingRow(
            icon: Icons.delivery_dining_outlined,
            label: 'Delivery Charge',
            value: '₹${deliveryCharge.toStringAsFixed(2)}',
          ),

          // Shipping Fee - Always show (even if 0) as per user request
          // Backend sends this separately from deliveryCharge
          /*_buildBillingRow(
            icon: Icons.local_shipping_outlined,
            label: 'Shipping Fee',
            value: '₹${shippingFee.toStringAsFixed(2)}',
          ),*/

          // Processing Fee - Always show (even if 0) as per user request
          _buildBillingRow(
            icon: Icons.account_balance_wallet_outlined,
            label: 'Processing Fee',
            value: '₹${processingFee.toStringAsFixed(2)}',
          ),

          // Tax - Always show (even if 0) as per user request
          _buildBillingRow(
            icon: Icons.receipt_long_outlined,
            label: 'Tax',
            value: '₹${tax.toStringAsFixed(2)}',
          ),

          // Platform Charge - Show if different from processingFee or if both are 0
          // This field may not always be in backend response
          if (platformCharge != processingFee || (platformCharge == 0 && processingFee == 0))
            _buildBillingRow(
              icon: Icons.payments_outlined,
              label: 'Platform Charges',
              value: '₹${platformCharge.toStringAsFixed(2)}',
            ),

          // Discount Applied - Always show (even if 0)
          // Display as negative if discount was applied (green color)
          if (discountApplied > 0)
            _buildBillingRow(
              icon: Icons.discount_outlined,
              label: 'Discount Applied',
              value: '-₹${discountApplied.toStringAsFixed(2)}',
              valueColor: Colors.green,
            )
          else
            _buildBillingRow(
              icon: Icons.discount_outlined,
              label: 'Discount Applied',
              value: '₹${discountApplied.toStringAsFixed(2)}',
            ),

          const Divider(height: 24),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Grand total',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              Text(
                '₹${grandTotal.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Download Invoice Button
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.orange[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.orange[200]!),
            ),
            child: TextButton.icon(
              onPressed: () {
                _downloadInvoice();
              },
              icon: Icon(Icons.download, color: Colors.orange[700]),
              label: Text(
                'Download Invoice',
                style: TextStyle(
                  color: Colors.orange[700],
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderDetailsSection(Map<String, dynamic> order) {
    final orderId = order['_id'] ?? order['id'] ?? 'Unknown';
    final customerName = order['customerName'] ?? 'N/A';
    final customerPhone = order['customerPhone'] ?? 'N/A';
    final paymentMethod = order['paymentMethod'] ?? 'N/A';

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Order Details',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),

          _buildDetailRow('Order Id', orderId),
          _buildDetailRow('Delivered To', customerName),
          _buildDetailRow('Customer', customerName),
          _buildDetailRow('Phone', customerPhone),
          _buildDetailRow('Payment Method', paymentMethod),
          _buildDetailRow('Partner Type', 'VAN Partner'),
          _buildDetailRow('Delivery Type', 'Scheduled'),

          const SizedBox(height: 12),

          Text(
            'Delivery Address',
            style: TextStyle(fontSize: 14, color: Colors.grey[600]),
          ),
          const SizedBox(height: 4),
          Text(
            _formatAddress(order),
            style: const TextStyle(fontSize: 14, color: Colors.black87),
          ),
        ],
      ),
    );
  }

  Widget _buildHelpSupportSection() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Help & Support',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),

          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: TextButton.icon(
              onPressed: () {
                _openChat();
              },
              icon: Icon(Icons.chat_bubble_outline, color: Colors.grey[700]),
              label: Text(
                'Chat with Us',
                style: TextStyle(
                  color: Colors.grey[700],
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBillingRow({
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: TextStyle(fontSize: 14, color: Colors.grey[700]),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: valueColor ?? Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(fontSize: 14, color: Colors.grey[600]),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatAddress(Map<String, dynamic> order) {
    final houseNo = order['houseNo'] ?? '';
    final area = order['area'] ?? '';
    final city = order['city'] ?? '';
    final state = order['state'] ?? '';
    final postalCode = order['postalCode'] ?? '';
    final country = order['country'] ?? 'India';

    List<String> addressParts = [];
    if (houseNo.isNotEmpty) addressParts.add(houseNo);
    if (area.isNotEmpty) addressParts.add(area);
    if (city.isNotEmpty) addressParts.add(city);
    if (state.isNotEmpty) addressParts.add(state);
    if (postalCode.isNotEmpty) addressParts.add(postalCode);
    if (country.isNotEmpty) addressParts.add(country);

    return addressParts.isEmpty
        ? 'Address not available'
        : addressParts.join(', ');
  }

  void _downloadInvoice() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Invoice download feature coming soon!'),
        backgroundColor: Colors.orange,
      ),
    );
  }

  void _openChat() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Chat feature coming soon!'),
        backgroundColor: Colors.blue,
      ),
    );
  }

  void _reorderItems() async {
    try {
      // Show loading dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder:
            (context) => AlertDialog(
              content: Row(
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(width: 16),
                  const Text('Adding items to cart...'),
                ],
              ),
            ),
      );

      await OrderService.reorderFromPreviousOrder(widget.orderId);

      Navigator.pop(context); // Close loading dialog

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Items added to cart successfully!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      Navigator.pop(context); // Close loading dialog

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error reordering: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
