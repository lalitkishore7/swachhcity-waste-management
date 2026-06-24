const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../database');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const exifParser = require('exif-parser');
const { authenticateToken } = require('../middleware/auth');

// ─── Multer Setup ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Haversine distance in km between two lat/lon points.
 */
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Query OpenStreetMap Overpass API for sensitive locations near the coordinates.
 * Returns { score: 0-1, nearby_places: [...] }
 */
async function getLocationSensitivity(lat, lon) {
    const RADIUS = 500; // metres
    const query = `
        [out:json][timeout:10];
        (
            nwr["amenity"="school"](around:${RADIUS},${lat},${lon});
            nwr["amenity"="university"](around:${RADIUS},${lat},${lon});
            nwr["amenity"="hospital"](around:${RADIUS},${lat},${lon});
            nwr["amenity"="clinic"](around:${RADIUS},${lat},${lon});
            nwr["amenity"="marketplace"](around:${RADIUS},${lat},${lon});
            nwr["amenity"="place_of_worship"](around:${RADIUS},${lat},${lon});
            nwr["landuse"="commercial"](around:${RADIUS},${lat},${lon});
            nwr["landuse"="residential"](around:${RADIUS},${lat},${lon});
        );
        out tags center 50;
    `;

    const weights = {
        hospital: { per: 0.20, cap: 0.30 },
        clinic: { per: 0.15, cap: 0.25 },
        school: { per: 0.18, cap: 0.30 },
        university: { per: 0.18, cap: 0.30 },
        place_of_worship: { per: 0.12, cap: 0.20 },
        marketplace: { per: 0.08, cap: 0.20 },
        commercial: { per: 0.06, cap: 0.15 },
        residential: { per: 0.04, cap: 0.10 },
    };

    try {
        const res = await axios.post(
            'https://overpass-api.de/api/interpreter',
            `data=${encodeURIComponent(query)}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 12000 }
        );

        const elements = res.data.elements || [];
        const counts = {};
        const nearbyPlaces = [];

        elements.forEach(el => {
            const tags = el.tags || {};
            let type = tags.amenity || tags.landuse || 'unknown';
            counts[type] = (counts[type] || 0) + 1;

            if (nearbyPlaces.length < 10) {
                nearbyPlaces.push({
                    name: tags.name || type,
                    type,
                    distance_approx: `< ${RADIUS}m`,
                });
            }
        });

        let score = 0;
        for (const [type, count] of Object.entries(counts)) {
            const w = weights[type];
            if (w) {
                score += Math.min(w.cap, count * w.per);
            }
        }
        score = Math.min(1.0, score);

        return { score: Math.round(score * 1000) / 1000, nearby_places: nearbyPlaces };
    } catch (err) {
        console.warn('Overpass API error (using fallback):', err.message);
        return { score: 0.3, nearby_places: [] }; // fallback mid-range score
    }
}

/**
 * Enhanced severity: combines ML score, location sensitivity, and item count.
 */
function computeEnhancedSeverity(mlSeverity, locationScore, detectionCount) {
    const countFactor = Math.min(1.0, (detectionCount || 1) / 5.0);
    const severity = 0.40 * (mlSeverity || 0.5)
                   + 0.35 * (locationScore || 0.3)
                   + 0.25 * countFactor;
    return Math.round(Math.min(1.0, severity) * 1000) / 1000;
}

/**
 * Priority label from severity score.
 */
function priorityLabel(severity) {
    return severity > 0.8 ? 'critical' : severity > 0.6 ? 'high' : severity > 0.3 ? 'medium' : 'low';
}

/**
 * Find the nearest available worker and return their id.
 */
async function findNearestWorker(lat, lon) {
    const [workers] = await db.query(
        `SELECT u.user_id as worker_id, w.current_latitude as worker_lat, w.current_longitude as worker_lon 
         FROM users u JOIN workers w ON u.user_id = w.user_id
         WHERE u.role='worker' AND w.current_latitude IS NOT NULL AND w.current_longitude IS NOT NULL`
    );
    if (!workers || workers.length === 0) return null;

    let nearest = null;
    let minDist = Infinity;
    workers.forEach(w => {
        const d = haversine(lat, lon, w.worker_lat, w.worker_lon);
        if (d < minDist) { minDist = d; nearest = w.worker_id; }
    });
    return nearest;
}

// ─── POST /api/complaints ─────────────────────────────────────────────────────
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { user_id, latitude, longitude } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'Image is required' });

        const lat = parseFloat(latitude) || 0;
        const lon = parseFloat(longitude) || 0;

        // ── EXIF timestamp validation ──────────────────────────────────────
        try {
            const buffer = fs.readFileSync(file.path);
            const parser = exifParser.create(buffer);
            const exifResult = parser.parse();
            if (exifResult.tags && exifResult.tags.CreateDate) {
                const createTime = exifResult.tags.CreateDate * 1000;
                const diff = Date.now() - createTime;
                if (diff > 1_800_000 || diff < -600_000) {
                    fs.unlinkSync(file.path);
                    return res.status(400).json({
                        error: 'Image is too old. Please take a live photo of the garbage.'
                    });
                }
            }
        } catch (exifErr) {
            console.log('EXIF parse skipped:', exifErr.message);
        }

        // ── Call ML Service ────────────────────────────────────────────────
        const formData = new FormData();
        formData.append('image', fs.createReadStream(file.path));

        let mlResponse;
        try {
            const mlRes = await axios.post('http://127.0.0.1:5001/predict', formData, {
                headers: { ...formData.getHeaders() },
                timeout: 30000,
            });
            mlResponse = mlRes.data;
        } catch (mlErr) {
            console.error('ML Service Error:', mlErr.message);
            mlResponse = { is_garbage: true, severity_score: 0.5, garbage_type: 'unknown', confidence: 0.5 };
        }

        // ── Reject non-garbage images ──────────────────────────────────────
        if (!mlResponse.is_garbage) {
            fs.unlinkSync(file.path);
            return res.status(400).json({
                error: 'The uploaded image does not appear to contain garbage. Please upload a valid image of garbage/waste.',
                analysis: mlResponse
            });
        }

        // ── Location Sensitivity Score ───────────────────────────────────
        const locationData = await getLocationSensitivity(lat, lon);

        // ── Enhanced Severity Score ────────────────────────────────────────
        const detectionCount = mlResponse.detection_count || 1;
        const enhancedSeverity = computeEnhancedSeverity(
            mlResponse.severity_score, locationData.score, detectionCount
        );

        const severityBreakdown = {
            ml_score: { value: Math.round((mlResponse.severity_score || 0.5) * 1000) / 1000, weight: '40%', label: 'AI Detection Score' },
            location_score: { value: locationData.score, weight: '35%', label: 'Location Sensitivity', nearby_places: locationData.nearby_places },
            count_factor: { value: Math.round(Math.min(1.0, detectionCount / 5.0) * 1000) / 1000, weight: '25%', label: 'Item Count Factor', detection_count: detectionCount },
            final_score: enhancedSeverity,
        };

        // ── Auto-assign nearest worker ─────────────────────────────────────
        let assigned_worker_id = null;
        try {
            assigned_worker_id = await findNearestWorker(lat, lon);
        } catch (e) {
            console.warn('Worker assignment failed:', e.message);
        }

        // ── Save to DB ─────────────────────────────────────────────────────
        const status = assigned_worker_id ? 'assigned' : 'pending';

        let dbGarbageType = mlResponse.garbage_type || 'other';
        if (dbGarbageType === 'paper') dbGarbageType = 'organic';
        const validTypes = ['plastic', 'organic', 'metal', 'glass', 'e-waste', 'mixed', 'other'];
        if (!validTypes.includes(dbGarbageType)) dbGarbageType = 'other';

        const [result] = await db.query(
            `INSERT INTO complaints
             (user_id, image_url, latitude, longitude, garbage_type, severity_score, priority, status, assigned_worker_id, address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id ? parseInt(user_id) : null,
                file.filename,
                lat, lon,
                dbGarbageType,
                Math.round(enhancedSeverity * 10), // Scale to 1-10 severity score
                priorityLabel(enhancedSeverity),
                status,
                assigned_worker_id,
                req.body.address || 'Unknown'
            ]
        );

        res.json({
            message: 'Complaint submitted successfully',
            id: result.insertId,
            analysis: mlResponse,
            severity_breakdown: severityBreakdown,
            priority: priorityLabel(enhancedSeverity),
            assigned_worker_id,
            status,
            image_url: file.filename
        });

    } catch (err) {
        res.status(500).json({ error: 'Server Error: ' + err.message });
    }
});

// ─── GET /api/complaints/me ───────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(
            'SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/complaints ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.*,
                u.name as citizen_name,
                u.email as citizen_email,
                w.worker_code,
                wu.name as worker_name
            FROM complaints c
            LEFT JOIN users u ON c.user_id = u.user_id
            LEFT JOIN workers w ON c.assigned_worker_id = w.worker_id
            LEFT JOIN users wu ON w.user_id = wu.user_id
            ORDER BY c.severity_score DESC, c.created_at DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/complaints/analytics ────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM complaints');

        const total = rows.length;
        const pending = rows.filter(r => r.status === 'pending').length;
        const assigned = rows.filter(r => r.status === 'assigned' || r.status === 'in_progress').length;
        const resolved = rows.filter(r => r.status === 'completed').length;
        const highPriority = rows.filter(r => r.priority === 'high' || r.priority === 'critical').length;

        // Daily breakdown for last 7 days
        const daily = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            daily[key] = { date: key, total: 0, resolved: 0 };
        }
        rows.forEach(r => {
            const created = r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : null;
            if (created && daily[created]) {
                daily[created].total++;
                if (r.status === 'completed') daily[created].resolved++;
            }
        });

        // Type breakdown
        const typeBreakdown = {};
        rows.forEach(r => {
            const t = r.garbage_type || 'unknown';
            typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
        });

        // Avg resolution time (hours) for resolved complaints
        const resolvedRows = rows.filter(r => r.status === 'completed' && r.completed_at && r.created_at);
        const avgResolutionHours = resolvedRows.length > 0
            ? resolvedRows.reduce((acc, r) => {
                return acc + (new Date(r.completed_at) - new Date(r.created_at)) / 3_600_000;
            }, 0) / resolvedRows.length
            : 0;

        res.json({
            total, pending, assigned, resolved, highPriority,
            daily: Object.values(daily),
            typeBreakdown,
            avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/complaints/hotspots ─────────────────────────────────────────────
router.get('/hotspots', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT latitude, longitude, severity_score, created_at FROM complaints');

        try {
            const mlRes = await axios.post('http://127.0.0.1:5001/hotspot',
                { complaints: rows },
                { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
            );
            res.json(mlRes.data);
        } catch (mlErr) {
            // Fallback: simple grid ourselves if ML service unavailable
            const GRID = 0.01;
            const grid = {};
            rows.forEach(r => {
                const gLat = Math.floor(r.latitude / GRID) * GRID;
                const gLon = Math.floor(r.longitude / GRID) * GRID;
                const key = `${gLat.toFixed(4)},${gLon.toFixed(4)}`;
                if (!grid[key]) grid[key] = { latitude: gLat, longitude: gLon, complaint_count: 0, severity_sum: 0 };
                grid[key].complaint_count++;
                grid[key].severity_sum += r.severity_score || 0.5;
            });
            const hotspots = Object.values(grid).map(c => ({
                latitude: c.latitude,
                longitude: c.longitude,
                complaint_count: c.complaint_count,
                avg_severity: Math.round(c.severity_sum / c.complaint_count * 1000) / 1000,
                risk_score: Math.min(1, (c.complaint_count / rows.length) + (c.severity_sum / c.complaint_count) * 0.3),
            })).sort((a, b) => b.risk_score - a.risk_score).slice(0, 20);
            res.json({ hotspots });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/complaints/:id/assign ───────────────────────────────────────────
router.put('/:id/assign', async (req, res) => {
    try {
        const { id } = req.params;
        const { worker_id } = req.body;

        if (!worker_id) return res.status(400).json({ error: 'worker_id is required' });

        const [result] = await db.query(
            `UPDATE complaints SET assigned_worker_id = ?, status = 'assigned' WHERE complaint_id = ?`,
            [worker_id, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });
        res.json({ message: 'Worker assigned successfully', worker_id, complaint_id: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/complaints/:id/status ───────────────────────────────────────────
router.put('/:id/status', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const file = req.file;

        if (status === 'resolved') {
            if (!file) {
                return res.status(400).json({ error: 'Proof image is required to mark task as resolved' });
            }

            // Call ML to verify area is clean
            const formData = new FormData();
            formData.append('image', fs.createReadStream(file.path));

            let mlResponse;
            try {
                const mlRes = await axios.post(
                    'http://127.0.0.1:5001/predict?check_clean=true',
                    formData,
                    { headers: { ...formData.getHeaders() }, timeout: 30000 }
                );
                mlResponse = mlRes.data;
            } catch (mlErr) {
                console.error('ML Verification Error:', mlErr.message);
                return res.status(500).json({ error: 'Failed to verify cleanup with ML service.' });
            }

            if (mlResponse.is_garbage === true) {
                fs.unlinkSync(file.path);
                return res.status(400).json({
                    error: 'Verification failed: ML model still detects garbage in this image.',
                    confidence: mlResponse.confidence
                });
            }

            // Save cleanup image and completed_at
            const [result] = await db.query(
                `UPDATE complaints SET status = ?, after_cleanup_image_url = ?, completed_at = NOW() WHERE complaint_id = ?`,
                ['completed', file.filename, id]
            );
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });
            res.json({ message: 'Task marked as completed. Cleanup verified by ML.', cleanup_image: file.filename });
        } else {
            const [result] = await db.query(`UPDATE complaints SET status = ? WHERE complaint_id = ?`, [status === 'resolved' ? 'completed' : status, id]);
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });
            res.json({ message: `Task status updated to ${status}` });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server Error: ' + err.message });
    }
});

module.exports = router;
