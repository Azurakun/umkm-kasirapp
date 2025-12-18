document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('id-ID', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
    initAnalytics();
    loadTransactions();
});

async function initAnalytics() {
    const res = await fetch('/api/stats/summary');
    const data = await res.json();

    document.getElementById('statRevenue').innerText = `Rp ${data.totalRevenue.toLocaleString()}`;
    document.getElementById('statItems').innerText = `${data.totalProducts} Items`;
    document.getElementById('statLowStock').innerText = `${data.lowStockAlerts} Alerts`;
    document.getElementById('statTopProduct').innerText = data.topProducts[0]?._id || 'N/A';

    // 📈 Revenue Trend Chart
    new Chart(document.getElementById('revenueChart'), {
        type: 'line',
        data: {
            labels: data.monthlyTrends.map(m => m._id),
            datasets: [{
                label: 'Monthly Revenue',
                data: data.monthlyTrends.map(m => m.total),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#6366f1'
            }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    // 📊 Product Distribution Chart
    new Chart(document.getElementById('productChart'), {
        type: 'doughnut',
        data: {
            labels: data.topProducts.map(p => p._id),
            datasets: [{
                data: data.topProducts.map(p => p.count),
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                hoverOffset: 20
            }]
        },
        options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } }
    });
}

async function loadTransactions() {
    const res = await fetch('/api/orders/history');
    const orders = await res.json();
    const body = document.getElementById('historyBody');
    
    body.innerHTML = orders.map(order => `
        <tr class="hover:bg-slate-50 transition">
            <td class="px-8 py-5 font-mono text-xs text-slate-400">#${order._id.slice(-8)}</td>
            <td class="px-8 py-5">${new Date(order.timestamp).toLocaleString()}</td>
            <td class="px-8 py-5 font-bold text-slate-900">Rp ${order.totalAmount.toLocaleString()}</td>
            <td class="px-8 py-5 text-center">
                <button class="text-slate-400 hover:text-indigo-600"><i class="fas fa-external-link-alt"></i></button>
            </td>
        </tr>
    `).join('');
}