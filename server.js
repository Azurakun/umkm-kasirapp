const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/umkm_kasir')
    .then(() => console.log('✅ System Connected to Database'))
    .catch(err => console.error('❌ Connection Error:', err));

// --- SCHEMAS ---

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

// New Schema for Receipt Customization
const settingSchema = new mongoose.Schema({
    shopName: { type: String, default: 'KasirApp UMKM' },
    address: { type: String, default: 'Jl. Contoh No. 123' },
    phone: { type: String, default: '08123456789' },
    footer: { type: String, default: 'Terima Kasih Atas Kunjungan Anda' }
});
const Setting = mongoose.model('Setting', settingSchema);

// --- ROUTES ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Analytics
app.get('/api/stats/summary', async (req, res) => {
    try {
        const revenue = await Order.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]);
        const lowStock = await Item.countDocuments({ stock: { $lt: 10 } });
        const monthly = await Order.aggregate([
            { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$timestamp" } }, total: { $sum: "$totalAmount" } } },
            { $sort: { _id: 1 } }
        ]);
        res.json({
            totalRevenue: revenue[0]?.total || 0,
            monthlyTrends: monthly,
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
app.get('/api/orders/history', async (req, res) => res.json(await Order.find().sort({ timestamp: -1 })));

// Settings API
app.get('/api/settings', async (req, res) => {
    let s = await Setting.findOne();
    if (!s) s = await new Setting({}).save();
    res.json(s);
});
app.post('/api/settings', async (req, res) => {
    let s = await Setting.findOne();
    if (s) res.json(await Setting.findByIdAndUpdate(s._id, req.body, { new: true }));
    else res.json(await new Setting(req.body).save());
});

app.listen(3000, () => console.log('🚀 Server active at http://localhost:3000'));