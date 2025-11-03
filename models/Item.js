const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  description: String,
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  // Store unitPrice as number
  unitPrice: { type: Number, required: true },  
  imageUrl: String,
  userId: { type: String, required: true },
});

// Optional: add a virtual to format price as PHP
itemSchema.virtual("unitPricePHP").get(function () {
  return this.unitPrice.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
});

module.exports = mongoose.model("Item", itemSchema);
