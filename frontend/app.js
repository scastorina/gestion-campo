document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([-34.9, -56.2], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let selected = null;
    let marker = null;

    map.on('click', (e) => {
        selected = e.latlng;
        document.getElementById('lote-display').textContent = `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`;
        if (marker) marker.remove();
        marker = L.marker(selected).addTo(map);
    });

    const fechaInput = document.getElementById('fecha');
    document.getElementById('guardar').addEventListener('click', () => {
        if (!selected || !fechaInput.value) {
            alert('Seleccione un lote en el mapa y una fecha.');
            return;
        }
        fetch('/api/riegos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lote: `${selected.lat},${selected.lng}`,
                fecha: fechaInput.value,
                nota: ''
            })
        })
        .then(r => r.json())
        .then(() => {
            fechaInput.value = '';
            loadRiegos();
        });
    });

    function loadRiegos() {
        fetch('/api/riegos')
            .then(r => r.json())
            .then(data => {
                const tbody = document.querySelector('#tabla-riegos tbody');
                tbody.innerHTML = '';
                data.forEach(riego => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${riego.id}</td><td>${riego.lote}</td><td>${riego.fecha}</td><td>${riego.nota}</td>`;
                    tbody.appendChild(tr);
                });
            });
    }

    loadRiegos();
});
