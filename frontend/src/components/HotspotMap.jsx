import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Heatmap overlay using canvas – lightweight implementation without leaflet.heat plugin
function HeatmapLayer({ hotspots }) {
    const map = useMap();
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!hotspots || hotspots.length === 0) return;

        // We draw a simple canvas layer as a hotspot overlay
        // Each hotspot emits a radial gradient blob
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = 0;
        canvas.style.left = 0;
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = 650;
        canvas.style.opacity = 0.55;

        const container = map.getContainer();
        container.appendChild(canvas);

        const render = () => {
            const { width, height } = container.getBoundingClientRect();
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, width, height);

            hotspots.forEach(hs => {
                try {
                    const point = map.latLngToContainerPoint([Number(hs.latitude), Number(hs.longitude)]);
                    const radius = 50 + hs.risk_score * 60;
                    const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
                    const alpha = Math.min(0.85, hs.risk_score + 0.2);
                    if (hs.risk_score > 0.6) {
                        grad.addColorStop(0, `rgba(239,68,68,${alpha})`);
                        grad.addColorStop(1, 'rgba(239,68,68,0)');
                    } else if (hs.risk_score > 0.3) {
                        grad.addColorStop(0, `rgba(245,158,11,${alpha})`);
                        grad.addColorStop(1, 'rgba(245,158,11,0)');
                    } else {
                        grad.addColorStop(0, `rgba(16,185,129,${alpha})`);
                        grad.addColorStop(1, 'rgba(16,185,129,0)');
                    }
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                } catch {}
            });
        };

        render();
        map.on('moveend zoomend', render);

        return () => {
            canvas.remove();
            map.off('moveend zoomend', render);
        };
    }, [map, hotspots]);

    return null;
}

function getSeverityColor(score) {
    if (score > 0.7) return '#ef4444';
    if (score > 0.4) return '#f59e0b';
    return '#10b981';
}

export default function HotspotMap({ complaints = [], hotspots = [], center = [20.5937, 78.9629], zoom = 5 }) {
    return (
        <MapContainer
            center={center}
            zoom={zoom}
            style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
            zoomControl={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Heatmap canvas layer */}
            <HeatmapLayer hotspots={hotspots} />

            {/* Individual complaint markers */}
            {complaints.map(c => (
                <CircleMarker
                    key={c.complaint_id}
                    center={[Number(c.latitude), Number(c.longitude)]}
                    radius={8}
                    pathOptions={{
                        fillColor: getSeverityColor((c.severity_score || 0) / 10),
                        fillOpacity: 0.85,
                        color: '#fff',
                        weight: 2
                    }}
                >
                    <Popup>
                        <div style={{ minWidth: 160, fontSize: 13 }}>
                            <strong>#{c.complaint_id} – {c.garbage_type || 'Unknown'}</strong><br />
                            Priority: {(c.severity_score || 0).toFixed(1)}/10<br />
                            Status: <span style={{ textTransform: 'capitalize' }}>{c.status}</span><br />
                            {c.created_at && <span>Reported: {new Date(c.created_at).toLocaleDateString()}</span>}
                        </div>
                    </Popup>
                </CircleMarker>
            ))}
        </MapContainer>
    );
}
