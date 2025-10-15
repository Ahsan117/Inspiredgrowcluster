const mongoose = require("mongoose");

const CardSchema = new mongoose.Schema(
  {
    cardNo: {
      type: String,
      required: true,
      trim: true,
      unique: true, // optional, if card numbers should be unique
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Card", CardSchema);
