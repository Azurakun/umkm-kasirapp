const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Modern MongoDB Connection (Fixes your previous error)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/umkm_kasir')
    .then(() => console.log('✅ System Connected to Database'))
    .catch(err => console.error('❌ Connection Error:', err));

// Schemas
const itemSchema = new mongoose.Schema({
    name: String,
    price: Number,
    stock: Number,
    category: { type: String, default: 'General' },
    code: { type: String, unique: true }
});
const Item = mongoose.model('Item', itemSchema);

const orderSchema = new mongoose.Schema({
    items: Array,
    totalAmount: Number,
    timestamp: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// --- ROUTES ---

// FIX: Redirect root to Dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Analytics API
app.get('/api/stats/summary', async (req, res) => {
    try {
        const revenue = await Order.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]);
        const lowStock = await Item.countDocuments({ stock: { $lt: 10 } });
        const monthly = await Order.aggregate([
            { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$timestamp" } }, total: { $sum: "$totalAmount" } } },
            { $sort: { _id: 1 } }
        ]);
        const topSelling = await Order.aggregate([
            { $unwind: "$items" },
            { $group: { _id: "$items.name", count: { $sum: "$items.quantity" } } },
            { $sort: { count: -1 } }, { $limit: 5 }
        ]);

        res.json({
            totalRevenue: revenue[0]?.total || 0,
            monthlyTrends: monthly,
            topProducts: topSelling,
            lowStockAlerts: lowStock,
            totalProducts: await Item.countDocuments()
        });
    } catch (err) { res.status(500).json(err); }
});

// Inventory API
app.get('/api/items', async (req, res) => res.json(await Item.find()));
app.post('/api/items', async (req, res) => {
    try { res.json(await new Item(req.body).save()); } 
    catch (e) { res.status(400).json({ error: "Duplicate Barcode" }); }
});
app.put('/api/items/:id', async (req, res) => res.json(await Item.findByIdAndUpdate(req.params.id, req.body)));
app.delete('/api/items/:id', async (req, res) => res.json(await Item.findByIdAndDelete(req.params.id)));

// Order API
app.post('/api/orders', async (req, res) => {
    const order = new Order(req.body);
    for (let item of order.items) {
        await Item.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    }
    res.json(await order.save());
});
app.get('/api/orders/history', async (req, res) => res.json(await Order.find().sort({ timestamp: -1 }).limit(10)));

app.listen(3000, () => console.log('🚀 Server active at http://localhost:3000'));