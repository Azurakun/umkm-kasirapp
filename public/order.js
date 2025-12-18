let products = [];
let cart = [];
let html5QrCode;

document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch('/api/items');
    products = await res.json();
    renderProducts(products);
    
    document.getElementById('search').addEventListener('input', (e) => {
        const filtered = products.filter(p => p.name.toLowerCase().includes(e.target.value.toLowerCase()));
        renderProducts(filtered);
    });
});

function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = list.map(p => `
        <div onclick="addToCart('${p._id}')" class="bg-white p-5 rounded-[32px] shadow-sm border-2 border-transparent hover:border-indigo-500 cursor-pointer transition group relative overflow-hidden">
            <div class="absolute top-4 right-4 bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase">${p.category}</div>
            <div class="w-full h-32 bg-slate-50 rounded-2xl mb-4 flex items-center justify-center text-slate-200">
                <i class="fas fa-image fa-2x"></i>
            </div>
            <h3 class="font-bold text-slate-800 text-lg">${p.name}</h3>
            <div class="flex justify-between items-end mt-4">
                <span class="text-indigo-600 font-black">Rp ${p.price.toLocaleString()}</span>
                <span class="text-[10px] text-slate-400 font-bold">STOCK: ${p.stock}</span>
            </div>
        </div>
    `).join('');
}

function addToCart(id) {
    const product = products.find(p => p._id === id);
    if (!product || product.stock <= 0) return alert('No Stock Available!');

    const existing = cart.find(c => c.productId === id);
    if (existing) existing.quantity++;
    else cart.push({ productId: id, name: product.name, price: product.price, quantity: 1 });
    
    renderCart();
}

function renderCart() {
    const list = document.getElementById('cartList');
    let total = 0;
    list.innerHTML = cart.map((item, index) => {
        total += item.price * item.quantity;
        return `
            <div class="flex justify-between items-center bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <div>
                    <div class="font-bold text-slate-800">${item.name}</div>
                    <div class="text-xs text-slate-400">${item.quantity} units x Rp ${item.price.toLocaleString()}</div>
                </div>
                <button onclick="removeFromCart(${index})" class="w-10 h-10 rounded-full bg-white text-red-300 hover:text-red-500 shadow-sm border border-red-50 transition"><i class="fas fa-trash"></i></button>
            </div>
        `;
    }).join('');
    document.getElementById('cartTotal').innerText = `Rp ${total.toLocaleString()}`;
    document.getElementById('subtotal').innerText = `Rp ${total.toLocaleString()}`;
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    renderCart();
}

async function toggleScanner() {
    const modal = document.getElementById('scannerModal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        html5QrCode = new Html5Qrcode("reader");
        html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (text) => {
            const match = products.find(p => p.code === text);
            if (match) addToCart(match._id);
            toggleScanner();
        });
    } else {
        modal.classList.add('hidden');
        if (html5QrCode) await html5QrCode.stop();
    }
}

async function checkout() {
    if (cart.length === 0) return;
    const totalAmount = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, totalAmount })
    });
    if (res.ok) {
        alert('Payment Success! Stock updated.');
        window.location.href = 'dashboard.html';
    }
}