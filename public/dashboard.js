// public/dashboard.js

const tableBody = document.getElementById('inventory-table-body');
const emptyState = document.getElementById('empty-state');
const editModal = document.getElementById('edit-modal');

// 1. Fetch and Display Products
async function loadProducts() {
    try {
        console.log("Attempting to fetch from /api/products...");
        const res = await fetch('/api/products');
        
        // If server sends a 404 or 500 error
        if (!res.ok) {
            throw new Error(`Server Error: ${res.status} ${res.statusText}`);
        }

        const products = await res.json();
        
        tableBody.innerHTML = ''; // Clear table
        
        if (products.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            products.forEach(product => {
                const row = document.createElement('tr');
                row.className = "hover:bg-gray-50 transition-colors border-b";
                row.innerHTML = `
                    <td class="p-4 font-medium text-gray-900">${product.name || 'Unknown'}</td>
                    <td class="p-4 font-mono text-gray-500">${product.barcode}</td>
                    <td class="p-4">
                        <span class="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                            ${product.quantity} units
                        </span>
                    </td>
                    <td class="p-4 text-right space-x-2">
                        <button onclick="openEdit('${product._id}', '${product.name}', '${product.barcode}', ${product.quantity})" 
                            class="text-blue-600 hover:text-blue-800 font-medium text-sm border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded">
                            Edit
                        </button>
                        <button onclick="deleteProduct('${product._id}')" 
                            class="text-red-600 hover:text-red-800 font-medium text-sm border border-red-200 hover:bg-red-50 px-3 py-1 rounded">
                            Delete
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (err) {
        console.error("Error loading products:", err);
        // SHOW THE REAL ERROR ON SCREEN
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="p-6 text-center text-red-600 bg-red-50 rounded-lg">
                    <strong class="block text-lg">Connection Failed</strong>
                    <span class="text-sm">${err.message}</span>
                    <br><br>
                    <span class="text-xs text-gray-600">
                        Tip: Make sure you are using <b>http://localhost:3000</b><br>
                        and not file://...
                    </span>
                </td>
            </tr>`;
    }
}

// 2. Delete Logic
async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
        const res = await fetch(`/api/product/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadProducts(); 
        } else {
            alert("Failed to delete.");
        }
    } catch (err) {
        alert("Connection Error: " + err.message);
    }
}

// 3. Edit Logic (Open Modal)
function openEdit(id, name, barcode, qty) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-name').value = name;
    document.getElementById('edit-barcode').value = barcode;
    document.getElementById('edit-qty').value = qty;
    editModal.classList.remove('hidden');
}

function closeModal() {
    editModal.classList.add('hidden');
}

// 4. Save Edit
document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const qty = document.getElementById('edit-qty').value;
    const barcode = document.getElementById('edit-barcode').value;

    try {
        const res = await fetch(`/api/product/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, quantity: qty, barcode })
        });

        if (res.ok) {
            closeModal();
            loadProducts();
        } else {
            alert("Error updating product");
        }
    } catch (err) {
        alert("Server error: " + err.message);
    }
});

// Load on start
window.onload = loadProducts;