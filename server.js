// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB via Railway'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Define Product Schema
const productSchema = new mongoose.Schema({
    barcode: { type: String, required: true, unique: true },
    name: String,
    quantity: Number
});

const Product = mongoose.model('Product', productSchema);

// --- API ROUTES ---

// 1. Get Single Product
app.get('/api/product/:barcode', async (req, res) => {
    try {
        const product = await Product.findOne({ barcode: req.params.barcode });
        if (product) {
            res.json({ found: true, data: product });
        } else {
            res.json({ found: false });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Add or Update Product (Restock)
app.post('/api/product', async (req, res) => {
    const { barcode, name, quantity } = req.body;
    try {
        let product = await Product.findOne({ barcode });
        
        if (product) {
            // Add to existing stock
            product.quantity = parseInt(product.quantity) + parseInt(quantity);
            await product.save();
            res.json({ message: "Product updated", product });
        } else {
            // Create new
            product = new Product({ barcode, name, quantity });
            await product.save();
            res.json({ message: "Product added", product });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Process Order (Checkout / Deduct Stock) --- NEW ROUTE
app.post('/api/order', async (req, res) => {
    const { items } = req.body; // Expects array: [{ barcode, quantity }]
    
    try {
        // We loop through items and update them one by one
        for (const item of items) {
            const product = await Product.findOne({ barcode: item.barcode });
            if (product) {
                // Prevent negative stock
                const newQty = product.quantity - item.quantity;
                product.quantity = newQty < 0 ? 0 : newQty; 
                await product.save();
            }
        }
        res.json({ success: true, message: "Order processed successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error processing order" });
    }
});

// 4. Get All Products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Update Product (Edit)
app.put('/api/product/:id', async (req, res) => {
    try {
        const { name, quantity, barcode } = req.body;
        await Product.findByIdAndUpdate(req.params.id, { name, quantity, barcode });
        res.json({ message: "Product updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Delete Product
app.delete('/api/product/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});