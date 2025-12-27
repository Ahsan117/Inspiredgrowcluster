class Product {
  final String id;
  final String itemName;
  final String brand;
  final String unit;
  final String description;
  final List<String> itemImages;
  final double mrp;
  final double salesPrice;
  final int stock;

  Product({
    required this.id,
    required this.itemName,
    required this.brand,
    required this.unit,
    required this.description,
    required this.itemImages,
    required this.mrp,
    required this.salesPrice,
    required this.stock,
  });

  // ✅ ADD THIS STATIC METHOD - Creates an empty Product instance
  static Product empty() {
    return Product(
      id: '',
      itemName: '',
      brand: '',
      unit: '',
      description: '',
      itemImages: [],
      mrp: 0.0,
      salesPrice: 0.0,
      stock: 0,
    );
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    List<String> images = _parseImages(json);

    String productId = json['_id']?.toString() ?? '';

    double parsedMrp = 0.0;
    double parsedSalesPrice = 0.0;

    if (json['mrp'] != null) {
      parsedMrp = double.tryParse(json['mrp'].toString()) ?? 0.0;
    }

    if (json['salesPrice'] != null) {
      parsedSalesPrice = double.tryParse(json['salesPrice'].toString()) ?? 0.0;
    }

    if (parsedMrp == 0.0 && parsedSalesPrice == 0.0) {
      parsedMrp = -1.0;
      parsedSalesPrice = -1.0;
      print('WARNING: No price data found for ${json['name'] ?? json['itemName']}, will need to fetch separately');
    }

    print('Product: ${json['name'] ?? json['itemName']}, MRP: $parsedMrp, SalesPrice: $parsedSalesPrice');

    String productBrand = '';
    if (json['brand'] != null &&
        json['brand'].toString().isNotEmpty &&
        json['brand'].toString() != 'null') {
      productBrand = json['brand'].toString();
    }

    String productDescription = '';
    if (json['description'] != null &&
        json['description'].toString().isNotEmpty &&
        json['description'].toString() != 'null') {
      productDescription = json['description'].toString();
    } else if (json['barcode'] != null &&
        json['barcode'].toString().isNotEmpty &&
        json['barcode'].toString() != 'null') {
      productDescription = json['barcode'].toString();
    }

    int stockQuantity = 0;
    if (json['stock'] != null) {
      stockQuantity = int.tryParse(json['stock'].toString()) ?? 0;
    } else if (json['quantity'] != null) {
      stockQuantity = int.tryParse(json['quantity'].toString()) ?? 0;
    } else if (json['availableQuantity'] != null) {
      stockQuantity = int.tryParse(json['availableQuantity'].toString()) ?? 0;
    }

    return Product(
      id: productId,
      itemName: json['name']?.toString() ?? json['itemName']?.toString() ?? '',
      brand: productBrand,
      unit: json['unit']?.toString() ?? 'piece',
      description: productDescription,
      itemImages: images,
      mrp: parsedMrp,
      salesPrice: parsedSalesPrice,
      stock: stockQuantity,
    );
  }

  static List<String> _parseImages(Map<String, dynamic> json) {
    print('Parsing images from JSON:');
    print('  Raw json keys: ${json.keys.toList()}');

    final List<String> images = [];

    if (json['images'] != null && json['images'] is List) {
      print('  Found "images" array');
      final imagesList = json['images'] as List;
      print('  Images array length: ${imagesList.length}');
      print('  Images array content: $imagesList');

      for (final img in imagesList) {
        if (img != null && img.toString().isNotEmpty && img.toString() != 'null') {
          images.add(img.toString());
        }
      }
    } else {
      print('  No "images" array found or not a List');
    }

    if (images.isEmpty && json['image'] != null) {
      print('  Found single "image" field');
      final singleImage = json['image'].toString();
      print('  Single image: $singleImage');
      if (singleImage.isNotEmpty && singleImage != 'null') {
        images.add(singleImage);
      }
    }

    if (images.isEmpty && json['itemImages'] != null && json['itemImages'] is List) {
      print('  Found "itemImages" array');
      final itemImagesList = json['itemImages'] as List;
      print('  ItemImages array length: ${itemImagesList.length}');

      for (final img in itemImagesList) {
        if (img != null && img.toString().isNotEmpty && img.toString() != 'null') {
          images.add(img.toString());
        }
      }
    }

    print('  Final parsed images count: ${images.length}');
    print('  Final images: $images');
    return images;
  }

  bool get needsPriceFetch => mrp == -1.0 && salesPrice == -1.0;

  double get discountPercentage {
    if (mrp <= 0 || salesPrice <= 0) return 0;
    return ((mrp - salesPrice) / mrp * 100);
  }

  bool get isInStock => stock > 0;

  bool get isOutOfStock => stock <= 0;

  @override
  String toString() {
    return 'Product{id: "$id", itemName: "$itemName", brand: "$brand", unit: "$unit", mrp: $mrp, salesPrice: $salesPrice, stock: $stock}';
  }

  Product copyWith({
    String? id,
    String? itemName,
    String? brand,
    String? unit,
    String? description,
    List<String>? itemImages,
    double? mrp,
    double? salesPrice,
    int? stock,
  }) {
    return Product(
      id: id ?? this.id,
      itemName: itemName ?? this.itemName,
      brand: brand ?? this.brand,
      unit: unit ?? this.unit,
      description: description ?? this.description,
      itemImages: itemImages ?? this.itemImages,
      mrp: mrp ?? this.mrp,
      salesPrice: salesPrice ?? this.salesPrice,
      stock: stock ?? this.stock,
    );
  }
}