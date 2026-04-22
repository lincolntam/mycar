let map, ds, drGo, drBack;
let returnMode = false;

// 2026 隧道費率邏輯
const TUNNEL_DATA = [
    { id: "whc", name: "西隧", loc: "Western Harbour Crossing", match: "Island|Central|West|香港|中環|西環", type: "cross", toll: "h" },
    { id: "cht", name: "紅隧", loc: "Cross-Harbour Tunnel", match: "Island|Kowloon|Central|香港|尖沙咀|灣仔", type: "cross", toll: "h" },
    { id: "ehc", name: "東隧", loc: "Eastern Harbour Crossing", match: "Island|East|Kwun Tong|香港|觀塘|鰂魚涌", type: "cross", toll: "h" },
    { id: "tlt", name: "大欖", loc: "Tai Lam Tunnel", match: "Yuen Long|Tuen Mun|NT|元朗|屯門|天水圍", type: "hill", toll: "tlt" },
    { id: "lrt", name: "獅子山", loc: "Lion Rock Tunnel", match: "Sha Tin|Tai Po|Kowloon|沙田|大埔|九龍", type: "hill", toll: 8 }
];

function initApp() {
    ds = new google.maps.DirectionsService();
    drGo = new google.maps.DirectionsRenderer({ polylineOptions: { strokeColor: "#E3193F", strokeWeight: 6 } });
    drBack = new google.maps.DirectionsRenderer({ polylineOptions: { strokeColor: "#0A84FF", strokeWeight: 4 } });

    const now = new Date();
    document.getElementById('start-time').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    document.querySelectorAll('.node-input').forEach(bindAutocomplete);
    renderButtons('goTunnels');
    renderButtons('backTunnels');
}

function bindAutocomplete(inp) {
    const ac = new google.maps.places.Autocomplete(inp, { componentRestrictions: { country: "hk" } });
    ac.addListener('place_changed', () => { smartFilterTunnels(); calculate(); });
}

function renderButtons(id) {
    const container = document.getElementById(id);
    TUNNEL_DATA.forEach(t => {
        const div = document.createElement('div');
        div.className = 't-btn';
        div.innerText = t.name;
        div.onclick = function() { this.classList.toggle('active'); calculate(); };
        div.setAttribute('data-loc', t.loc);
        container.appendChild(div);
    });
}

function getToll(loc, targetDate) {
    const data = TUNNEL_DATA.find(d => d.loc === loc);
    if (!data) return 0;
    const h = targetDate.getHours() + targetDate.getMinutes()/60;

    // 三隧分流 (2026)
    if (data.toll === "h") {
        if ((h >= 7.5 && h < 10.25) || (h >= 16.5 && h < 19)) return 60;
        if (h >= 10.25 && h < 16.5) return 30;
        return 20;
    }
    // 大欖 (2026 政府接管方案)
    if (data.toll === "tlt") {
        if ((h >= 7.5 && h < 9.5) || (h >= 17.5 && h < 19)) return 45;
        return 18;
    }
    return data.toll;
}

function toggleReturn() {
    returnMode = !returnMode;
    document.getElementById('retBtn').classList.toggle('active', returnMode);
    document.getElementById('backTunnelSection').classList.toggle('hidden', !returnMode);
    calculate();
}

async function calculate() {
    const inputs = document.querySelectorAll('.node-input');
    const locs = Array.from(inputs).map(i => i.value).filter(v => v.length > 2);
    if (locs.length < 2) return;

    const time = new Date(); // 可串接 start-time
    const mapDiv = document.getElementById('map');
    if (!map) map = new google.maps.Map(mapDiv, { zoom: 12, center: { lat: 22.3, lng: 114.1 }, disableDefaultUI: true });

    drGo.setMap(map);
    let totalToll = 0;
    const tunnelWays = Array.from(document.querySelectorAll('#goTunnels .active')).map(b => {
        totalToll += getToll(b.getAttribute('data-loc'), time);
        return { location: b.getAttribute('data-loc'), stopover: false };
    });

    ds.route({ origin: locs[0], destination: locs[locs.length-1], waypoints: tunnelWays, travelMode: 'DRIVING' }, (res, stat) => {
        if (stat === 'OK') {
            drGo.setDirections(res);
            const km = res.routes[0].legs.reduce((a, b) => a + b.distance.value, 0) / 1000;
            const sec = res.routes[0].legs.reduce((a, b) => a + b.duration.value, 0);
            updateUI(km, totalToll, sec);
        }
    });
}

function updateUI(km, toll, sec) {
    const car = document.getElementById('car-model').value.split('|');
    const energy = km * parseFloat(car[0]) * parseFloat(car[1]);
    document.getElementById('km').innerText = km.toFixed(1) + " km";
    document.getElementById('duration').innerText = Math.round(sec / 60) + " min";
    document.getElementById('t-fee').innerText = "$" + toll;
    document.getElementById('e-cost').innerText = "$" + energy.toFixed(1);
    document.getElementById('total').innerText = (energy + toll).toFixed(1);
}