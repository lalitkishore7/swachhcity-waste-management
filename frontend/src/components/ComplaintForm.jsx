import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, MapPin, Sparkles, Upload, CheckCircle2, Leaf, AlertCircle, Zap, Eye, Pencil, RotateCcw, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000';
const ML_API = 'http://localhost:5001';

// India bounding box (approximate)
const INDIA_BOUNDS = { latMin: 6.0, latMax: 37.5, lonMin: 68.0, lonMax: 97.5 };
function isValidIndianLocation(lat, lon) {
    return lat >= INDIA_BOUNDS.latMin && lat <= INDIA_BOUNDS.latMax &&
           lon >= INDIA_BOUNDS.lonMin && lon <= INDIA_BOUNDS.lonMax;
}

function BoundingBoxCanvas({ preview, box }) {
    const canvasRef = useRef(null);
    const imgRef = useRef(null);

    const drawBox = () => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img || !box) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(canvas.width / 60, 3);
        ctx.setLineDash([8, 4]);
        // box = [x, y, w, h] in 224x224 space – scale to natural image size
        const scaleX = canvas.width / 224;
        const scaleY = canvas.height / 224;
        ctx.strokeRect(box[0] * scaleX, box[1] * scaleY, box[2] * scaleX, box[3] * scaleY);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(239,68,68,0.15)';
        ctx.fillRect(box[0] * scaleX, box[1] * scaleY, box[2] * scaleX, box[3] * scaleY);

        // Label
        ctx.fillStyle = 'rgba(239,68,68,0.88)';
        const label = 'Garbage Detected';
        ctx.font = `bold ${Math.max(14, canvas.width / 20)}px sans-serif`;
        const tw = ctx.measureText(label).width;
        ctx.fillRect(box[0] * scaleX, box[1] * scaleY - 28 * scaleY, tw + 12, 26 * scaleY);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, box[0] * scaleX + 6, box[1] * scaleY - 8 * scaleY);
    };

    return (
        <div className="relative max-h-48 overflow-hidden rounded-xl shadow-lg mx-auto w-fit">
            <img ref={imgRef} src={preview} alt="Preview" onLoad={drawBox} className="max-h-48 rounded-xl" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
        </div>
    );
}

export default function ComplaintForm() {
    const { user, token } = useAuth();
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('idle'); // idle | analyzing | uploading | success | error
    const [result, setResult] = useState(null);
    const [location, setLocation] = useState(null);
    const [address, setAddress] = useState('Fetching live location...');
    const [errorMessage, setErrorMessage] = useState('');
    const [aiPreview, setAiPreview] = useState(null); // ML response before full submit
    const [aiPreviewLoading, setAiPreviewLoading] = useState(false);
    const [invalidPicturePopup, setInvalidPicturePopup] = useState(false);
    const [locationWarning, setLocationWarning] = useState('');
    const [isEditingLocation, setIsEditingLocation] = useState(false);
    const [editLat, setEditLat] = useState('');
    const [editLon, setEditLon] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [showSeverityInfo, setShowSeverityInfo] = useState(false);
    const reverseGeocodeTimer = useRef(null);

    useEffect(() => {
        if (!('geolocation' in navigator)) {
            setAddress('Geolocation not supported.');
            return;
        }

        let retryCount = 0;
        const MAX_RETRIES = 3;

        const attemptGeolocation = () => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude, lon = pos.coords.longitude;

                    if (!isValidIndianLocation(lat, lon)) {
                        retryCount++;
                        if (retryCount < MAX_RETRIES) {
                            setLocationWarning(`Location seems inaccurate. Retrying... (${retryCount}/${MAX_RETRIES})`);
                            setTimeout(attemptGeolocation, 1500);
                            return;
                        }
                        setLocationWarning('Unable to detect your location accurately. Please ensure GPS is enabled and you are in India.');
                        setAddress('Location detection failed — outside service area.');
                        return;
                    }

                    setLocationWarning('');
                    setLocation({ lat, lon });
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                        const data = await res.json();
                        setAddress(data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
                    } catch {
                        setAddress(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
                    }
                },
                () => {
                    setAddress('Location access denied.');
                    setLocationWarning('Please allow location access for accurate detection.');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        };

        attemptGeolocation();
    }, []);

    // Reverse-geocode helper for manual lat/lon edits
    const reverseGeocode = useCallback(async (lat, lon) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            setEditAddress(data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        } catch {
            setEditAddress(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        }
    }, []);

    const handleEditLatChange = (val) => {
        setEditLat(val);
        const lat = parseFloat(val), lon = parseFloat(editLon);
        if (!isNaN(lat) && !isNaN(lon)) {
            setLocation({ lat, lon });
            clearTimeout(reverseGeocodeTimer.current);
            reverseGeocodeTimer.current = setTimeout(() => reverseGeocode(lat, lon), 800);
        }
    };

    const handleEditLonChange = (val) => {
        setEditLon(val);
        const lat = parseFloat(editLat), lon = parseFloat(val);
        if (!isNaN(lat) && !isNaN(lon)) {
            setLocation({ lat, lon });
            clearTimeout(reverseGeocodeTimer.current);
            reverseGeocodeTimer.current = setTimeout(() => reverseGeocode(lat, lon), 800);
        }
    };

    const startEditing = () => {
        setIsEditingLocation(true);
        setEditLat(location?.lat?.toString() || '');
        setEditLon(location?.lon?.toString() || '');
        setEditAddress(address);
    };

    const useCurrentLocation = () => {
        setIsEditingLocation(false);
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude, lon = pos.coords.longitude;
                    setLocation({ lat, lon });
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                        const data = await res.json();
                        setAddress(data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
                    } catch {
                        setAddress(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
                    }
                },
                () => setAddress('Location access denied.'),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }
    };

    const handleFileChange = async (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setAiPreview(null);
        setResult(null);
        setStatus('idle');
        setErrorMessage('');

        // Call ML preview endpoint immediately
        setAiPreviewLoading(true);
        setInvalidPicturePopup(false);
        try {
            const fd = new FormData();
            fd.append('image', selected);
            const res = await fetch(`${ML_API}/analyze-preview`, { method: 'POST', body: fd });
            if (res.ok) {
                const data = await res.json();
                setAiPreview(data);
                if (!data.is_garbage) {
                    setInvalidPicturePopup(true);
                }
            }
        } catch {
            setAiPreview(null);
        } finally {
            setAiPreviewLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        if (!file) return;
        if (!location) {
            setErrorMessage('Please wait for location to be detected before submitting.');
            return;
        }
        setStatus('uploading');

        const formData = new FormData();
        formData.append('image', file);
        if (user?.id) formData.append('user_id', user.id);
        formData.append('latitude', location.lat);
        formData.append('longitude', location.lon);
        formData.append('description', description);
        formData.append('address', isEditingLocation ? editAddress : address);

        try {
            const response = await fetch(`${API}/api/complaints`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            });
            const data = await response.json();
            if (response.ok) {
                setStatus('success');
                setResult(data);
            } else {
                setStatus('error');
                setErrorMessage(data.error || 'Server rejected submission');
            }
        } catch (err) {
            setStatus('error');
            setErrorMessage(err.message || 'Network error');
        }
    };

    const resetForm = () => {
        setFile(null); setPreview(null); setDescription('');
        setStatus('idle'); setResult(null); setErrorMessage('');
        setAiPreview(null); setInvalidPicturePopup(false);
    };

    const severityColor = (s) => s > 0.7 ? '#ef4444' : s > 0.4 ? '#f59e0b' : '#10b981';
    const severityLabel = (s) => s > 0.7 ? 'High' : s > 0.4 ? 'Medium' : 'Low';

    return (
        <div className="max-w-md mx-auto">
            <div className="eco-card p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Leaf className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Report Garbage</h2>
                        <p className="text-sm text-emerald-600">Help keep our city clean</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Upload Area */}
                    <div className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer group ${preview
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-emerald-200 bg-white hover:bg-emerald-50/30 hover:border-emerald-300'
                        }`}>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {preview ? (
                            <div className="relative">
                                {/* Show bounding box if AI detected garbage */}
                                {aiPreview?.is_garbage && aiPreview?.box_coordinates ? (
                                    <BoundingBoxCanvas preview={preview} box={aiPreview.box_coordinates} />
                                ) : (
                                    <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-xl shadow-lg" />
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); resetForm(); }}
                                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <div className="text-emerald-600">
                                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                    <Camera className="w-8 h-8 text-emerald-600" />
                                </div>
                                <p className="font-semibold mb-1">Take a photo or upload</p>
                                <p className="text-xs text-emerald-500">AI will analyze the image instantly</p>
                            </div>
                        )}
                    </div>

                    {/* AI Preview Panel */}
                    {aiPreviewLoading && (
                        <div className="flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl animate-pulse">
                            <div className="w-8 h-8 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-teal-700">AI Analyzing Image…</p>
                                <p className="text-xs text-teal-500">Detecting garbage type & severity</p>
                            </div>
                        </div>
                    )}

                    {aiPreview && !aiPreviewLoading && (
                        <div className={`p-4 rounded-xl border ${aiPreview.is_garbage
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-emerald-50 border-emerald-200'
                            }`}>
                            <div className="flex items-center gap-2 mb-3">
                                <Eye className={`w-4 h-4 ${aiPreview.is_garbage ? 'text-amber-600' : 'text-emerald-600'}`} />
                                <span className={`text-sm font-bold ${aiPreview.is_garbage ? 'text-amber-700' : 'text-emerald-700'}`}>
                                    AI Analysis Result
                                </span>
                            </div>
                            {aiPreview.is_garbage ? (
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-white/80 p-2 rounded-lg">
                                        <p className="text-lg font-bold" style={{ color: severityColor(aiPreview.severity_score) }}>
                                            {(aiPreview.severity_score * 10).toFixed(1)}
                                        </p>
                                        <p className="text-xs text-slate-500">Severity</p>
                                    </div>
                                    <div className="bg-white/80 p-2 rounded-lg">
                                        <p className="text-sm font-bold text-slate-700 capitalize">
                                            {aiPreview.garbage_type || 'mixed'}
                                        </p>
                                        <p className="text-xs text-slate-500">Type</p>
                                    </div>
                                    <div className="bg-white/80 p-2 rounded-lg">
                                        <p className="text-sm font-bold" style={{ color: severityColor(aiPreview.severity_score) }}>
                                            {severityLabel(aiPreview.severity_score)}
                                        </p>
                                        <p className="text-xs text-slate-500">Priority</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-emerald-700">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <div>
                                        <p className="text-sm font-semibold">No garbage detected</p>
                                        <p className="text-xs text-emerald-600">Submit anyway if you see garbage the AI missed.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    <textarea
                        placeholder="Add a brief description of the garbage or location context..."
                        className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none h-24 text-sm bg-white/70 backdrop-blur-sm transition-all"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />

                    {/* Location */}
                    <div className="flex flex-col gap-2 text-xs px-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-emerald-600">
                                <MapPin className="w-4 h-4" />
                                <span>{isEditingLocation ? 'Edit Location' : 'Live Location Detected'}</span>
                            </span>
                            <div className="flex items-center gap-2">
                                {!isEditingLocation ? (
                                    <button type="button" onClick={startEditing}
                                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                                        <Pencil className="w-3 h-3" /> Edit
                                    </button>
                                ) : (
                                    <button type="button" onClick={useCurrentLocation}
                                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors">
                                        <RotateCcw className="w-3 h-3" /> Use GPS
                                    </button>
                                )}
                            </div>
                        </div>

                        {isEditingLocation ? (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-slate-500 font-medium mb-0.5 block">Latitude</label>
                                        <input type="number" step="any" value={editLat}
                                            onChange={(e) => handleEditLatChange(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-medium mb-0.5 block">Longitude</label>
                                        <input type="number" step="any" value={editLon}
                                            onChange={(e) => handleEditLonChange(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-medium mb-0.5 block">Address</label>
                                    <input type="text" value={editAddress}
                                        onChange={(e) => setEditAddress(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-2">
                                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                                <span className="line-clamp-2 leading-relaxed" title={address}>{address}</span>
                            </p>
                        )}
                    </div>

                    {/* Location Warning */}
                    {locationWarning && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{locationWarning}</span>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={!file || status === 'uploading' || (aiPreview && !aiPreview.is_garbage)}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${(status === 'uploading' || (aiPreview && !aiPreview.is_garbage))
                            ? 'bg-slate-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 hover:scale-[1.02] shadow-emerald-500/30'
                            }`}
                    >
                        {status === 'uploading' ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Analyzing & Submitting…
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                Submit Report
                            </>
                        )}
                    </button>
                </form>

                {/* Success Result */}
                {status === 'success' && result && (
                    <div className="mt-6 p-5 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl animate-fade-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-emerald-800">Report Submitted!</h3>
                                <p className="text-sm text-emerald-600">
                                    {result.assigned_worker_id
                                        ? '✓ Auto-assigned to nearest worker'
                                        : 'AI verified your submission'}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-white/70 p-3 rounded-xl">
                                <p className="text-2xl font-bold text-emerald-600">
                                    {result.severity_breakdown
                                        ? (result.severity_breakdown.final_score * 10).toFixed(1)
                                        : (result.analysis.severity_score * 10).toFixed(1)}
                                </p>
                                <p className="text-xs text-slate-500">Severity</p>
                            </div>
                            <div className="bg-white/70 p-3 rounded-xl">
                                <p className="text-sm font-bold text-emerald-600 capitalize">
                                    {result.analysis.garbage_type}
                                </p>
                                <p className="text-xs text-slate-500">Type</p>
                            </div>
                            <div className="bg-white/70 p-3 rounded-xl">
                                <p className="text-lg font-bold text-emerald-600">#{result.id}</p>
                                <p className="text-xs text-slate-500">Task ID</p>
                            </div>
                        </div>

                        {/* Severity Breakdown */}
                        {result.severity_breakdown && (
                            <div className="mt-3">
                                <button type="button" onClick={() => setShowSeverityInfo(!showSeverityInfo)}
                                    className="flex items-center gap-2 text-sm text-teal-700 font-semibold hover:text-teal-800 transition-colors w-full justify-center py-1">
                                    <Info className="w-4 h-4" />
                                    How is severity calculated?
                                    {showSeverityInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                {showSeverityInfo && (
                                    <div className="mt-2 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl space-y-3 text-sm animate-fade-in">
                                        {/* ML Score */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="font-semibold text-slate-700">🤖 AI Detection Score</span>
                                                <span className="text-teal-700 font-bold">{(result.severity_breakdown.ml_score.value * 100).toFixed(0)}% <span className="text-xs font-normal text-slate-400">(weight: {result.severity_breakdown.ml_score.weight})</span></span>
                                            </div>
                                            <div className="w-full bg-teal-100 rounded-full h-2">
                                                <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${result.severity_breakdown.ml_score.value * 100}%` }} />
                                            </div>
                                        </div>
                                        {/* Location Score */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="font-semibold text-slate-700">📍 Location Sensitivity</span>
                                                <span className="text-amber-700 font-bold">{(result.severity_breakdown.location_score.value * 100).toFixed(0)}% <span className="text-xs font-normal text-slate-400">(weight: {result.severity_breakdown.location_score.weight})</span></span>
                                            </div>
                                            <div className="w-full bg-amber-100 rounded-full h-2">
                                                <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${result.severity_breakdown.location_score.value * 100}%` }} />
                                            </div>
                                            {result.severity_breakdown.location_score.nearby_places?.length > 0 && (
                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                    {result.severity_breakdown.location_score.nearby_places.slice(0, 5).map((p, i) => (
                                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-medium">
                                                            {p.type === 'hospital' || p.type === 'clinic' ? '🏥' : p.type === 'school' || p.type === 'university' ? '🏫' : p.type === 'place_of_worship' ? '🛕' : '🏪'}
                                                            {' '}{p.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {result.severity_breakdown.location_score.nearby_places?.length === 0 && (
                                                <p className="text-xs text-slate-400 mt-1">No sensitive locations detected nearby</p>
                                            )}
                                        </div>
                                        {/* Count Factor */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="font-semibold text-slate-700">📊 Item Count ({result.severity_breakdown.count_factor.detection_count} items)</span>
                                                <span className="text-purple-700 font-bold">{(result.severity_breakdown.count_factor.value * 100).toFixed(0)}% <span className="text-xs font-normal text-slate-400">(weight: {result.severity_breakdown.count_factor.weight})</span></span>
                                            </div>
                                            <div className="w-full bg-purple-100 rounded-full h-2">
                                                <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${result.severity_breakdown.count_factor.value * 100}%` }} />
                                            </div>
                                        </div>
                                        {/* Final */}
                                        <div className="pt-2 border-t border-teal-200 flex justify-between items-center">
                                            <span className="font-bold text-slate-800">Final Severity Score</span>
                                            <span className="text-xl font-bold" style={{ color: severityColor(result.severity_breakdown.final_score) }}>
                                                {(result.severity_breakdown.final_score * 10).toFixed(1)}/10
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={resetForm}
                                className="flex-1 py-3 bg-white border border-emerald-200 text-emerald-700 font-medium rounded-xl hover:bg-emerald-50 transition-colors"
                            >
                                Report Another
                            </button>
                            <a
                                href="/my-reports"
                                className="flex-1 py-3 bg-emerald-600 text-white text-center font-medium rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center"
                            >
                                View My Reports
                            </a>
                        </div>
                    </div>
                )}

                {/* Error */}
                {status === 'error' && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
                        <AlertCircle className="w-6 h-6 mx-auto mb-1" />
                        <p className="font-medium text-sm">{errorMessage}</p>
                        <button onclick={resetForm} onClick={resetForm} className="mt-2 text-sm underline font-semibold p-2 bg-red-100 rounded-lg hover:bg-red-200 transition-colors w-full">
                            Try again
                        </button>
                    </div>
                )}
            </div>

            {/* Invalid Picture Popup Modal */}
            {invalidPicturePopup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setInvalidPicturePopup(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center transform transition-all" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Invalid Picture</h3>
                        <p className="text-slate-600 mb-6">
                            The uploaded image does not appear to contain garbage. Please upload a valid image of garbage/waste.
                        </p>
                        <button
                            onClick={() => { setInvalidPicturePopup(false); resetForm(); }}
                            className="w-full py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl hover:from-red-400 hover:to-rose-400 transition-all shadow-lg shadow-red-500/30"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
