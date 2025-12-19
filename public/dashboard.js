document.addEventListener('DOMContentLoaded', () => {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.innerText = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    initAnalytics();
    loadActivity();
});

async function initAnalytics() {
    const res = await fetch('/api/stats/summary');
    const data = await res.json();

    document.getElementById('totalSales').innerText = `Rp ${data.totalRevenue.toLocaleString()}`;
    document.getElementById('activeProducts').innerText = data.totalProducts;
    document.getElementById('orderCount').innerText = data.monthlyTrends.length;

    new Chart(document.getElementById('salesChart'), {
        type: 'line',
        data: {
            labels: data.monthlyTrends.map(m => m._id),
            datasets: [{
                label: 'Penjualan',
                data: data.monthlyTrends.map(m => m.total),
                borderColor: '#3b82f6',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
        },
        options: { plugins: { legend: { display: false } } }
    });
}

async function loadActivity() {
    const res = await fetch('/api/orders/history');
    const orders = await res.json();
    const list = document.getElementById('recentActivity');
    
    list.innerHTML = orders.map(o => `
        <li class="p-4 flex justify-between border-b last:border-0">
            <div>
                <p class="font-bold text-sm">#${o._id.slice(-6)}</p>
                <p class="text-xs text-gray-500">${new Date(o.timestamp).toLocaleString()}</p>
            </div>
            <p class="font-bold text-blue-600">Rp ${o.totalAmount.toLocaleString()}</p>
        </li>
    `).join('');
}