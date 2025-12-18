let html5QrCode;
let currentCameraId = null;
let isScanning = false;

// --- 1. INITIALIZATION ---
async function initScanner() {
    try {
        html5QrCode = new Html5Qrcode("reader");

        const devices = await Html5Qrcode.getCameras();
        const cameraSelect = document.getElementById('camera-select');
        cameraSelect.innerHTML = "";

        if (devices && devices.length) {
            devices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.id;
                option.text = device.label || `Camera ${index + 1}`;
                cameraSelect.appendChild(option);
            });

            // Default to the last camera (usually back camera)
            currentCameraId = devices[devices.length - 1].id;
            cameraSelect.value = currentCameraId;

            startScanning(currentCameraId);
        } else {
            cameraSelect.innerHTML = "<option>No cameras found</option>";
            document.getElementById('status-text').innerText = "No cameras detected.";
        }
    } catch (err) {
        console.error("Camera setup error:", err);
        document.getElementById('status-text').innerText = "Camera Permission Denied.";
    }
}

// --- 2. HIGH-RES SCANNING LOGIC ---
function startScanning(cameraId) {
    if (isScanning) return;

    // ROBUST CONFIGURATION
    const config = { 
        fps: 20,    // High FPS for smoother scanning
        qrbox: { width: 300, height: 300 }, // Larger target area
        aspectRatio: 1.0, 
        // Force high resolution and continuous focus
        videoConstraints: {
            width: { min: 640, ideal: 1920, max: 3840 }, 
            height: { min: 480, ideal: 1080, max: 2160 },
            facingMode: "environment", 
            focusMode: "continuous"
        },
        useBarCodeDetectorIfSupported: true // Use native hardware detection (Faster)
    };
    
    html5QrCode.start(
        cameraId, 
        config, 
        onScanSuccess, 
        onScanFailure
    ).then(() => {
        isScanning = true;
        document.getElementById('status-text').innerText = "Scanner Active";
        // Attempt to enable zoom slider
        initZoom();
    }).catch(err => {
        console.error("Failed to start scanner:", err);
        document.getElementById('status-text').innerText = "Error starting camera.";
    });
}

async function stopScanning() {
    if (html5QrCode && isScanning) {
        try {
            await html5QrCode.stop();
            isScanning = false;
        } catch (err) {
            console.error("Failed to stop scanner:", err);
        }
    }
}

// --- 3. ZOOM CONTROLS ---
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
        } else {
            slider.disabled = true;
        }
    }, 500); // Small delay to allow camera to fully load
}

function changeZoom(value) {
    html5QrCode.applyVideoConstraints({
        advanced: [{ zoom: parseFloat(value) }]
    });
}

function onCameraChange() {
    const newCameraId = document.getElementById('camera-select').value;
    if (newCameraId && newCameraId !== currentCameraId) {
        stopScanning().then(() => {
            currentCameraId = newCameraId;
            startScanning(currentCameraId);
        });
    }
}

// --- 4. SUCCESS & API LOGIC ---
function onScanSuccess(decodedText) {
    document.getElementById('status-text').innerText = "Checking: " + decodedText;

    // Pause camera UI logic by stopping it temporarily 
    stopScanning().then(() => {
        document.getElementById('reader').parentElement.classList.add('hidden'); // Hide wrapper
        document.getElementById('zoom-slider').parentElement.classList.add('hidden'); // Hide slider
        checkProductInBackend(decodedText);
    });
}

function onScanFailure(error) {
    // Silent
}

function checkProductInBackend(barcode) {
    fetch(`/api/product/${barcode}`)
        .then(res => res.json())
        .then(data => {
            if (data.found) {
                showProductDetails(data.data);
            } else {
                showAddForm(barcode);
            }
        })
        .catch(err => {
            console.error(err);
            alert("Connection error.");
            resetScanner();
        });
}

// --- 5. UI HELPERS ---
function triggerManualAdd() {
    stopScanning().then(() => {
        showAddForm("");
    });
}

function showAddForm(barcode) {
    document.getElementById('reader').parentElement.classList.add('hidden');
    document.getElementById('zoom-slider').parentElement.classList.add('hidden');
    document.getElementById('view-product').classList.add('hidden');
    document.getElementById('add-product').classList.remove('hidden');
    
    const barcodeInput = document.getElementById('input-barcode');
    barcodeInput.value = barcode || ""; 
    
    if (barcode) {
        document.getElementById('form-title').innerText = "Product Not Found: Add Details";
    } else {
        document.getElementById('form-title').innerText = "Manually Add Product";
        barcodeInput.focus();
    }
}

function showProductDetails(product) {
    document.getElementById('reader').parentElement.classList.add('hidden');
    document.getElementById('zoom-slider').parentElement.classList.add('hidden');
    document.getElementById('add-product').classList.add('hidden');
    document.getElementById('view-product').classList.remove('hidden');

    document.getElementById('view-name').innerText = product.name;
    document.getElementById('view-barcode').innerText = product.barcode;
    document.getElementById('view-qty').innerText = product.quantity;
}

function resetScanner() {
    document.getElementById('view-product').classList.add('hidden');
    document.getElementById('add-product').classList.add('hidden');
    
    document.getElementById('reader').parentElement.classList.remove('hidden');
    document.getElementById('zoom-slider').parentElement.classList.remove('hidden');
    
    document.getElementById('status-text').innerText = "Initializing camera...";
    document.getElementById('add-form').reset();
    
    startScanning(currentCameraId);
}

document.getElementById('add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
        barcode: document.getElementById('input-barcode').value,
        name: document.getElementById('input-name').value,
        quantity: document.getElementById('input-qty').value
    };

    fetch('/api/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        alert("Saved: " + data.message);
        resetScanner();
    })
    .catch(err => alert("Error: " + err.message));
});

window.onload = initScanner;