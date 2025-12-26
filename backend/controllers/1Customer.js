const Customer = require('../models/1Customer');

exports.searchCustomers = async (req, res) => {
  const { query } = req.query;
  try {
    // Search by name or phone number using case-insensitive regex
    const customers = await Customer.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ]
    }).limit(5); // Limit results for a cleaner UI dropdown
    
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: "Customer search failed", error });
  }
};