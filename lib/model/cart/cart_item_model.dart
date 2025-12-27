// lib/model/cart/cart_response_model.dart - Fixed CartItem class
class CartItem {
  final String id;
  final String itemId;
  final String itemName;
  final String itemCode;
  final String itemImage;
  final double price;
  final double salesPrice;
  final String unit;
  final String brand;
  final int quantity;
  final double totalPrice;
  final String addedAt;

  CartItem({
    required this.id,
    required this.itemId,
    required this.itemName,
    required this.itemCode,
    required this.itemImage,
    required this.price,
    required this.salesPrice,
    required this.unit,
    required this.brand,
    required this.quantity,
    required this.totalPrice,
    required this.addedAt,
  });

  // Factory constructor with proper type conversion
  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      id: json['id']?.toString() ?? '',
      itemId: json['itemId']?.toString() ?? '',
      itemName: json['itemName']?.toString() ?? 'Unknown Product',
      itemCode: json['itemCode']?.toString() ?? '',
      itemImage: json['itemImage']?.toString() ?? '',
      price: (json['price'] ?? 0.0).toDouble(),
      salesPrice: (json['salesPrice'] ?? 0.0).toDouble(),
      unit: json['unit']?.toString() ?? '',
      brand: json['brand']?.toString() ?? '',
      quantity: (json['quantity'] ?? 0).toInt(), // Proper int conversion
      totalPrice: (json['totalPrice'] ?? 0.0).toDouble(),
      addedAt: json['addedAt']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'itemId': itemId,
      'itemName': itemName,
      'itemCode': itemCode,
      'itemImage': itemImage,
      'price': price,
      'salesPrice': salesPrice,
      'unit': unit,
      'brand': brand,
      'quantity': quantity,
      'totalPrice': totalPrice,
      'addedAt': addedAt,
    };
  }

  @override
  String toString() {
    return 'CartItem(id: $id, itemName: $itemName, salesPrice: $salesPrice, quantity: $quantity)';
  }
}
