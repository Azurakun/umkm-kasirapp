let html5QrCode;
let currentCameraId = null;
let cart = []; 
let isScanning = false;

async function initScanner() {
    try {
        html5QrCode = new Html5Qrcode("reader");
        const devices = await Html5Qrcode.getCameras();
        const cameraSelect = document.getElementById('camera-select');
        cameraSelect.innerHTML = "";

        if (devices && devices.length) {
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.text = device.label;
                cameraSelect.appendChild(option);
            });
            currentCameraId = devices[devices.length - 1].id; 
            startScanning(currentCameraId);
        } else {
            cameraSelect.innerHTML = "<option>No cameras found</option>";
        }
    } catch (err) {
        console.error(err);
        document.getElementById('status-text').innerText = "Camera Error";
    }
}

function startScanning(cameraId) {
    if(isScanning) return;

    const config = { 
        fps: 20, 
        qrbox: { width: 250, height: 250 },
        // Robust Settings
        videoConstraints: {
            width: { min: 640, ideal: 1920, max: 3840 }, 
            facingMode: "environment", 
            focusMode: "continuous"
        },
        useBarCodeDetectorIfSupported: true 
    };

    html5QrCode.start(cameraId, config,
        onScanSuccess, 
        () => {} 
    ).then(() => { 
        isScanning = true;
        initZoom(); // Enable zoom
    });
}

// Zoom Logic
function initZoom() {
    setTimeout(() => {
        const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
        const slider = document.getElementById('zoom-slider');
        if (capabilities && capabilities.zoom) {
            slider.disabled = false;
            slider.min = capabilities.zoom.min;
            slider.max = capabilities.zoom.max;
            slider.value = capabilities.zoom.min;
            slider.step = capabilities.zoom.step || 0.1;
        }
    }, 500);
}

function changeZoom(value) {
    html5QrCode.applyVideoConstraints({
        advanced: [{ zoom: parseFloat(value) }]
    });
}

async function onCameraChange() {
    const newId = document.getElementById('camera-select').value;
    if(html5QrCode && isScanning) {
        await html5QrCode.stop();
        isScanning = false;
    }
    startScanning(newId);
}

// Scan Logic
function onScanSuccess(decodedText) {
    if (html5QrCode) html5QrCode.pause(); // Pause

    document.getElementById('status-text').innerText = "Found: " + decodedText;

    fetch(`/api/product/${decodedText}`)
        .then(res => res.json())
        .then(data => {
            if (data.found) {
                addToCart(data.data);
                // Resume after delay
                setTimeout(() => html5QrCode.resume(), 800);
            } else {
                alert("Product not found! Add it in Scanner page.");
                setTimeout(() => html5QrCode.resume(), 1000);
            }
        })
        .catch(err => {
            alert("Server Error");
            html5QrCode.resume();
        });
}

// Cart Logic (Unchanged)
function addToCart(product) {
    const existing = cart.find(item => item.barcode === product.barcode);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            barcode: product.barcode,
            name: product.name,
            quantity: 1,
            maxStock: product.quantity 
        });
    }
    renderCart();
}

function renderCart() {
    const list = document.getElementById('cart-list');
    const count = document.getElementById('cart-count');
    list.innerHTML = "";
    let totalItems = 0;

    if (cart.length === 0) {
        list.innerHTML = `<p class="text-gray-400 text-center italic mt-10">Cart is empty.<br>Scan an item to add it.</p>`;
    }

    cart.forEach((item, index) => {
        totalItems += item.quantity;
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100";
        div.innerHTML = `
            <div>
                <p class="font-bold text-sm text-gray-800">${item.name}</p>
                <p class="text-xs text-gray-500 font-mono">${item.barcode}</p>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="updateQty(${index}, -1)" class="w-6 h-6 bg-gray-200 rounded text-gray-700 hover:bg-gray-300">-</button>
                <span class="font-bold w-4 text-center">${item.quantity}</span>
                <button onclick="updateQty(${index}, 1)" class="w-6 h-6 bg-blue-100 rounded text-blue-700 hover:bg-blue-200">+</button>
                <button onclick="removeFromCart(${index})" class="text-red-500 text-xs ml-2 hover:underline">×</button>
            </div>
        `;
        list.appendChild(div);
    });

    count.innerText = `${totalItems} items`;
}

function updateQty(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    renderCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function clearCart() {
    cart = [];
    renderCart();
}

async function processCheckout() {
    if (cart.length === 0) return alert("Cart is empty!");
    if (!confirm("Confirm order?")) return;

    try {
        const res = await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart })
        });
        const data = await res.json();
        if (data.success) {
            alert("Order Successful!");
            clearCart();
        } else {
            alert("Order Failed: " + data.message);
        }
    } catch (err) {
        alert("Server Error");
    }
}

window.onload = initScanner;