import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../Animation/bouncing_dots.dart';
import '../model/home/product_model.dart';
import '../providers/cart_provider.dart';
import '../providers/notification_provider.dart';
import '../services/stock_service.dart';

class ProductAddButton extends StatefulWidget {
  final Product product;

  const ProductAddButton({
    super.key,
    required this.product,
  });

  @override
  State<ProductAddButton> createState() => _ProductAddButtonState();
}

class _ProductAddButtonState extends State<ProductAddButton> {
  bool _isProcessing = false;
  StockStatus? _stockStatus;
  bool _isLoadingStock = true;

  @override
  void initState() {
    super.initState();
    _loadStockStatus();
  }

  Future<void> _loadStockStatus() async {
    try {
      final stockStatus = await StockService.getStockStatus(widget.product.id);
      if (mounted) {
        setState(() {
          _stockStatus = stockStatus;
          _isLoadingStock = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _stockStatus = StockStatus(
            isAvailable: true, // CHANGED: Default to available
            currentStock: widget.product.stock, // Use model stock as fallback
            message: 'In Stock',
            statusType: widget.product.stock > 0
                ? StockStatusType.inStock
                : StockStatusType.outOfStock,
          );
          _isLoadingStock = false;
        });
      }
    }
  }

  void _showSnackBar(
      String message, {
        Color? backgroundColor,
      }) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: backgroundColor,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _updateCartQuantity(int newQuantity) async {
    if (_isProcessing) return;

    final cartProvider = Provider.of<CartProvider>(context, listen: false);

    // 1. Capture the quantity BEFORE we make any changes
    final int oldQuantity = cartProvider.getItemQuantity(widget.product.id);

    // Stock validation logic
    if (newQuantity > 0 && _stockStatus != null) {
      if (!_stockStatus!.isAvailable ||
          newQuantity > _stockStatus!.currentStock) {
        _showSnackBar(
          'Only ${_stockStatus!.currentStock} items available in stock',
          backgroundColor: Colors.orange,
        );
        return;
      }
    }

    setState(() {
      _isProcessing = true;
    });

    try {
      // Call the provider
      final result = await cartProvider.updateItemQuantity(
        itemId: widget.product.id,
        newQuantity: newQuantity,
      );

      // Check for API errors
      if (result != null && result['error'] != null) {
        _showSnackBar(
          result['error'] as String,
          backgroundColor: Colors.red,
        );
      } else {
        // ✅ SUCCESS SCENARIO LOGIC:

        // Condition: Only show message if we went from 0 -> 1 (First Add)
        if (oldQuantity == 0 && newQuantity == 1) {
          ScaffoldMessenger.of(context).hideCurrentSnackBar(); // Clean up old messages
          _showSnackBar(
            'Item added to cart successfully!',
            backgroundColor: Colors.green,
          );
        }

        // ❌ ELSE: If oldQuantity > 0 (e.g., 1->2 or 2->1),
        // we do absolutely NOTHING here. This ensures no SnackBar appears.
      }
    } catch (e) {
      _showSnackBar('Failed to update cart', backgroundColor: Colors.red);
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }



  @override
  Widget build(BuildContext context) {
    return Consumer2<CartProvider, NotificationProvider>(
      builder: (context, cartProvider, notificationProvider, child) {
        // Always get the true quantity directly from the provider
        final currentQuantity = cartProvider.getItemQuantity(widget.product.id);
        final isOutOfStock =
            _stockStatus?.statusType == StockStatusType.outOfStock;

        Widget buttonWidget;

        if (isOutOfStock) {
          final isAlreadyRequested =
          notificationProvider.isNotificationRequested(widget.product.id);
          buttonWidget = isAlreadyRequested
              ? OutlinedButton.icon(
            key: const ValueKey('notified_button'),
            onPressed: null,
            icon:
            const Icon(Icons.check, color: Colors.blue, size: 16),
            label: const Text('NOTIFIED',
                style: TextStyle(
                    color: Colors.blue,
                    fontWeight: FontWeight.bold,
                    fontSize: 11)),
            style: OutlinedButton.styleFrom(
                side: BorderSide(color: Colors.blue.shade100),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8))),
          )
              : OutlinedButton.icon(
            key: const ValueKey('notify_button'),
            onPressed: () {
              Provider.of<NotificationProvider>(context, listen: false)
                  .requestNotification(widget.product.id);
              _showSnackBar(
                  'We will notify you when this is back in stock!',
                  backgroundColor: Colors.blue);
            },
            icon: const Icon(Icons.notifications_active_outlined,
                color: Colors.blue, size: 16),
            label: const Text('NOTIFY',
                style: TextStyle(
                    color: Colors.blue,
                    fontWeight: FontWeight.bold,
                    fontSize: 11)),
            style: OutlinedButton.styleFrom(
                foregroundColor: Colors.blue,
                side:
                const BorderSide(color: Colors.blue, width: 1.5),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8))),
          );
        } else if (currentQuantity > 0) {
          buttonWidget = Container(
            key: ValueKey('quantity_stepper_$currentQuantity'),
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                    color:
                    _isProcessing ? Colors.grey.shade300 : Colors.green,
                    width: 1.5)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                Expanded(
                  child: InkWell(
                    onTap: _isProcessing
                        ? null
                        : () => _updateCartQuantity(currentQuantity - 1),
                    child: Icon(Icons.remove,
                        size: 18,
                        color: _isProcessing ? Colors.grey : Colors.green),
                  ),
                ),
                SizedBox(
                  width: 30,
                  child: Center(
                      child: Text('$currentQuantity',
                          style: TextStyle(
                              color:
                              _isProcessing ? Colors.grey : Colors.green,
                              fontWeight: FontWeight.bold,
                              fontSize: 14))),
                ),
                Expanded(
                  child: InkWell(
                    onTap: _isProcessing
                        ? null
                        : () => _updateCartQuantity(currentQuantity + 1),
                    child: Icon(Icons.add,
                        size: 18,
                        color: _isProcessing ? Colors.grey : Colors.green),
                  ),
                ),
              ],
            ),
          );
        } else {
          buttonWidget = OutlinedButton(
            key: const ValueKey('add_button'),
            onPressed: _isLoadingStock || _isProcessing
                ? null
                : () => _updateCartQuantity(1),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.green,
              side: BorderSide(
                  color: _isLoadingStock || _isProcessing
                      ? Colors.grey.shade300
                      : Colors.green,
                  width: 1.5),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
            child: _isLoadingStock || _isProcessing
                ? BouncingDotsIndicator(color: Colors.green, size: 4)
                : const Text('ADD',
                style:
                TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          );
        }

        return SizedBox(
          width: double.infinity,
          height: 36,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            transitionBuilder: (Widget child, Animation<double> animation) {
              return FadeTransition(
                opacity: animation,
                child: ScaleTransition(scale: animation, child: child),
              );
            },
            child: buttonWidget,
          ),
        );
      },
    );
  }
}