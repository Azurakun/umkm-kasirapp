let items = [];
let qrScanner;

document.addEventListener('DOMContentLoaded', async () => {
    await loadItems();
    document.getElementById('searchInput').addEventListener('input', renderList);
    document.getElementById('catFilter').addEventListener('change', renderList);
    document.getElementById('itemForm').addEventListener('submit', saveItem);
});

async function loadItems() {
    const res = await fetch('/api/items');
    items = await res.json();
    renderList();
}

function renderList() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const cat = document.getElementById('catFilter').value;
    const body = document.getElementById('inventoryBody');

    const filtered = items.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(query) || (i.code && i.code.toLowerCase().includes(query));
        const matchesCat = cat === 'All' || i.category === cat;
        return matchesSearch && matchesCat;
    });

    body.innerHTML = filtered.map(i => {
        let badge = 'bg-emerald-100 text-emerald-600';
        let label = 'STABLE';
        if (i.stock <= 0) { badge = 'bg-red-100 text-red-600'; label = 'EMPTY'; }
        else if (i.stock < 10) { badge = 'bg-amber-100 text-amber-600'; label = 'LOW STOCK'; }

        return `
            <tr class="hover:bg-slate-50 transition">
                <td class="px-8 py-5">
                    <div class="font-bold text-slate-800">${i.name}</div>
                    <div class="text-[10px] text-slate-400 font-mono">UID: ${i.code || 'NO-CODE'}</div>
                </td>
                <td class="px-8 py-5 text-slate-500">${i.category}</td>
                <td class="px-8 py-5 font-bold text-slate-900">Rp ${i.price.toLocaleString()}</td>
                <td class="px-8 py-5">${i.stock} units</td>
                <td class="px-8 py-5">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black ${badge}">${label}</span>
                </td>
                <td class="px-8 py-5 text-right space-x-3">
                    <button onclick="editItem('${i._id}')" class="text-indigo-400 hover:text-indigo-600"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteItem('${i._id}')" class="text-slate-300 hover:text-red-500 transition"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function openModal(id = null) {
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = id || '';
    document.getElementById('modalTitle').innerText = id ? 'Edit Configuration' : 'New Registration';
    document.getElementById('itemModal').classList.remove('hidden');
}

function closeModal() { document.getElementById('itemModal').classList.add('hidden'); }

async function saveItem(e) {
    e.preventDefault();
    const id = document.getElementById('itemId').value;
    const payload = {
        name: document.getElementById('itemName').value,
        price: Number(document.getElementById('itemPrice').value),
        stock: Number(document.getElementById('itemStock').value),
        category: document.getElementById('itemCat').value,
        code: document.getElementById('itemCode').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/items/${id}` : '/api/items';

    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) { await loadItems(); closeModal(); } 
    else { alert('Save Failed: Check if Barcode UID is unique.'); }
}

function editItem(id) {
    const i = items.find(x => x._id === id);
    openModal(id);
    document.getElementById('itemName').value = i.name;
    document.getElementById('itemPrice').value = i.price;
    document.getElementById('itemStock').value = i.stock;
    document.getElementById('itemCat').value = i.category;
    document.getElementById('itemCode').value = i.code || '';
}

async function deleteItem(id) {
    if (!confirm('Permanent delete?')) return;
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    await loadItems();
}

// Scanner Management
function openScanner() {
    document.getElementById('scanOverlay').classList.remove('hidden');
    qrScanner = new Html5Qrcode("reader");
    qrScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (txt) => {
        document.getElementById('itemCode').value = txt;
        closeScanner();
    });
}

async function closeScanner() {
    if (qrScanner) await qrScanner.stop();
    document.getElementById('scanOverlay').classList.add('hidden');
}