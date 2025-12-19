let products = [];
let cart = [];
let html5QrCode;
let receiptSettings = {};

document.addEventListener('DOMContentLoaded', async () => {
    await fetchProducts();
    await fetchSettings();
    
    document.getElementById('product-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = products.filter(p => p.name.toLowerCase().includes(query) || (p.code && p.code.toLowerCase().includes(query)));
        renderProducts(filtered);
    });
});

async function fetchSettings() {
    const res = await fetch('/api/settings');
    receiptSettings = await res.json();
}

function showPopup(message, type = 'success') {
    const notify = document.getElementById('notification');
    const content = document.getElementById('notification-content');
    const icon = document.getElementById('notification-icon');
    const text = document.getElementById('notification-text');
    text.innerText = message;
    content.className = `bg-white border-l-4 p-4 shadow-2xl rounded-lg min-w-[300px] flex items-center ${type === 'success' ? 'border-green-500' : 'border-red-500'}`;
    icon.className = `fas ${type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'} mr-3`;
    notify.classList.remove('translate-x-full');
    setTimeout(() => notify.classList.add('translate-x-full'), 3000);
}

async function fetchProducts() {
    const res = await fetch('/api/items');
    products = await res.json();
    renderProducts(products);
}

function renderProducts(list) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = list.map(p => `
        <div onclick="addToCart('${p._id}')" class="bg-white p-5 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 cursor-pointer transition">
            <div class="text-xs text-blue-500 font-bold uppercase mb-1">${p.category}</div>
            <h3 class="font-bold text-slate-800">${p.name}</h3>
            <div class="flex justify-between items-center mt-3">
                <span class="text-slate-900 font-black">Rp ${p.price.toLocaleString()}</span>
                <span class="text-xs ${p.stock < 10 ? 'text-red-500' : 'text-slate-400'}">Stok: ${p.stock}</span>
            </div>
        </div>
    `).join('');
}

function addToCart(id) {
    const product = products.find(p => p._id === id);
    if (!product || product.stock <= 0) return showPopup('Stok tidak tersedia!', 'error');
    const existing = cart.find(c => c.productId === id);
    if (existing) {
        if (existing.quantity >= product.stock) return showPopup('Stok habis!', 'error');
        existing.quantity++;
    } else {
        cart.push({ productId: id, name: product.name, price: product.price, quantity: 1 });
    }
    renderCart();
}

function renderCart() {
    const list = document.getElementById('cart-items');
    let total = 0;
    list.innerHTML = cart.map((item, index) => {
        total += item.price * item.quantity;
        return `<div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
            <div><p class="font-bold text-sm text-gray-800">${item.name}</p><p class="text-[10px] text-gray-500">${item.quantity} x Rp ${item.price.toLocaleString()}</p></div>
            <button onclick="removeFromCart(${index})" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button>
        </div>`;
    }).join('');
    document.getElementById('total-price').innerText = `Rp ${total.toLocaleString()}`;
    document.getElementById('checkout-btn').disabled = cart.length === 0;
}

function removeFromCart(idx) { cart.splice(idx, 1); renderCart(); }

async function toggleScanner() {
    const modal = document.getElementById('scannerModal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        html5QrCode = new Html5Qrcode("reader-order");
        html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (text) => {
            const match = products.find(p => p.code === text);
            if (match) { addToCart(match._id); toggleScanner(); showPopup(`Ditambahkan: ${match.name}`); }
            else { showPopup("Produk tidak ditemukan!", "error"); }
        });
    } else { modal.classList.add('hidden'); if (html5QrCode) await html5QrCode.stop(); }
}

async function checkout() {
    const totalAmount = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, totalAmount })
    });

    if (res.ok) {
        // Apply Custom Receipt Settings
        document.getElementById('r-shopName').innerText = receiptSettings.shopName;
        document.getElementById('r-address').innerText = receiptSettings.address;
        document.getElementById('r-phone').innerText = `Telp: ${receiptSettings.phone}`;
        document.getElementById('r-footer').innerText = receiptSettings.footer;

        document.getElementById('receipt-items').innerHTML = cart.map(i => `
            <div class="flex justify-between"><span>${i.name} x${i.quantity}</span><span>Rp ${(i.price * i.quantity).toLocaleString()}</span></div>
        `).join('');
        document.getElementById('receipt-total').innerText = `Rp ${totalAmount.toLocaleString()}`;
        document.getElementById('receipt-date').innerText = new Date().toLocaleString('id-ID');

        showPopup('Pembayaran Berhasil! Mencetak Struk...');
        setTimeout(() => { window.print(); window.location.href = 'dashboard.html'; }, 1000);
    }
}