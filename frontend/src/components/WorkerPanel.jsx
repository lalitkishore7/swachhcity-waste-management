import { useEffect, useState, useRef, useCallback } from 'react';
import { Wrench, MapPin, Clock, CheckCircle, AlertTriangle, Navigation, Image, Camera, Wifi, WifiOff, Timer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000';

function SLATimer({ createdAt }) {
    const [elapsed, setElapsed] = useState('');
    const [urgent, setUrgent] = useState(false);

    useEffect(() => {
        const update = () => {
            const diff = Date.now() - new Date(createdAt);
            const h = Math.floor(diff / 3_600_000);
            const m = Math.floor((diff % 3_600_000) / 60_000);
            setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
            setUrgent(diff > 8 * 3_600_000); // > 8 hours = urgent
        };
        update();
        const interval = setInterval(update, 60_000);
        return () => clearInterval(interval);
    }, [createdAt]);

    return (
        <span className={`flex items-center gap-1.5 ${urgent ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
            <Timer className={`w-4 h-4 ${urgent ? 'animate-pulse' : ''}`} />
            {elapsed}
            {urgent && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Overdue</span>}
        </span>
    );
}

export default function WorkerPanel() {
    const { user, token } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [uploadingTaskId, setUploadingTaskId] = useState(null);
    const [errorMessages, setErrorMessages] = useState({});
    const [gpsSharing, setGpsSharing] = useState(false);
    const [gpsError, setGpsError] = useState('');
    const gpsIntervalRef = useRef(null);

    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    const fetchTasks = useCallback(async () => {
        if (!user?.id) return;
        try {
            const res = await fetch(`${API}/api/users/worker-tasks/${user.id}`, { headers: authHeaders });
            if (!res.ok) throw new Error('Not ok');
            const data = await res.json();
            if (Array.isArray(data)) setTasks(data);
        } catch {
            // Fallback: get all complaints, filter locally
            try {
                const res = await fetch(`${API}/api/complaints`, { headers: authHeaders });
                const data = await res.json();
                if (Array.isArray(data)) {
                    const mine = data.filter(t =>
                        t.status !== 'resolved' &&
                        (t.assigned_worker_id === user.id || t.assigned_worker_id == null)
                    );
                    setTasks(mine);
                }
            } catch (e) {
                console.error('Task fetch error:', e);
            }
        }
    }, [user?.id, token]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    // GPS sharing: update server every 2 minutes
    const startGPSSharing = useCallback(() => {
        if (!navigator.geolocation) {
            setGpsError('Geolocation not supported');
            return;
        }
        const postLocation = () => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        await fetch(`${API}/api/users/workers/${user.id}/location`, {
                            method: 'PUT',
                            headers: { ...authHeaders, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                        });
                        setGpsError('');
                    } catch {}
                },
                err => setGpsError(err.message),
                { enableHighAccuracy: true }
            );
        };
        postLocation(); // immediately
        gpsIntervalRef.current = setInterval(postLocation, 120_000); // every 2 minutes
        setGpsSharing(true);
    }, [user?.id, token]);

    const stopGPSSharing = () => {
        clearInterval(gpsIntervalRef.current);
        setGpsSharing(false);
    };

    useEffect(() => () => clearInterval(gpsIntervalRef.current), []);

    const completeTask = async (id, file) => {
        if (!file) return;
        setUploadingTaskId(id);
        setErrorMessages(prev => ({ ...prev, [id]: null }));

        const formData = new FormData();
        formData.append('image', file);
        formData.append('status', 'resolved');

        try {
            const response = await fetch(`${API}/api/complaints/${id}/status`, {
                method: 'PUT',
                headers: authHeaders,
                body: formData,
            });
            const data = await response.json();
            if (response.ok) {
                setTasks(prev => prev.filter(t => t.id !== id));
                setCompletedCount(prev => prev + 1);
            } else {
                setErrorMessages(prev => ({ ...prev, [id]: data.error || 'Verification failed.' }));
            }
        } catch (err) {
            setErrorMessages(prev => ({ ...prev, [id]: err.message || 'Network error' }));
        } finally {
            setUploadingTaskId(null);
        }
    };

    const handleNavigate = (lat, lon) => {
        if (lat && lon) window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
    };

    const getPriorityBadge = (score) => {
        if (score > 0.7) return { cls: 'badge-danger', label: 'Urgent', icon: AlertTriangle };
        if (score > 0.4) return { cls: 'badge-warning', label: 'Medium', icon: Clock };
        return { cls: 'badge-success', label: 'Normal', icon: CheckCircle };
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <Wrench className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Worker Duty Panel</h1>
                        <p className="text-emerald-600">Welcome back, {user?.name || 'Worker'}</p>
                    </div>
                </div>

                <div className="flex gap-3 items-center">
                    {/* GPS sharing toggle */}
                    <button
                        onClick={gpsSharing ? stopGPSSharing : startGPSSharing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${gpsSharing
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                            : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                    >
                        {gpsSharing ? <Wifi className="w-4 h-4 animate-pulse" /> : <WifiOff className="w-4 h-4" />}
                        {gpsSharing ? 'GPS On' : 'Share GPS'}
                    </button>

                    {/* Stats */}
                    <div className="eco-card px-5 py-3 text-center">
                        <p className="text-2xl font-bold text-amber-600">{tasks.length}</p>
                        <p className="text-xs text-slate-500">Pending</p>
                    </div>
                    <div className="eco-card px-5 py-3 text-center">
                        <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
                        <p className="text-xs text-slate-500">Completed</p>
                    </div>
                </div>
            </div>

            {gpsError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-2">
                    GPS: {gpsError}
                </div>
            )}

            {/* Task List */}
            <div className="space-y-4">
                {tasks.map(task => {
                    const priority = getPriorityBadge(task.priority_score ?? task.severity_score ?? 0);
                    return (
                        <div key={task.id} className="eco-card p-6 flex flex-col md:flex-row gap-6 items-start">
                            {/* Before Image */}
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-slate-400 font-medium text-center">Before</p>
                                <div className="w-28 h-28 rounded-xl overflow-hidden bg-emerald-100 flex-shrink-0 shadow-md border-2 border-red-200">
                                    {task.image_url ? (
                                        <img
                                            src={`${API}/uploads/${task.image_url}`}
                                            alt="Garbage"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Image className="w-10 h-10 text-emerald-300" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Task Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <h3 className="text-xl font-bold text-slate-800">Task #{task.id}</h3>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${priority.cls}`}>
                                        <priority.icon className="w-3 h-3" />
                                        {priority.label}
                                    </span>
                                </div>

                                <p className="text-slate-600 mb-2 capitalize text-sm">
                                    <span className="font-medium">Type:</span> {task.type || 'Unknown'}
                                    <span className="mx-2">•</span>
                                    <span className="font-medium">Priority:</span> {((task.priority_score ?? task.severity_score ?? 0) * 10).toFixed(1)}/10
                                </p>

                                {task.description && (
                                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3 line-clamp-2">
                                        "{task.description}"
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-emerald-500" />
                                        {task.latitude?.toFixed(4)}, {task.longitude?.toFixed(4)}
                                    </span>
                                    {task.created_at && <SLATimer createdAt={task.created_at} />}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
                                {errorMessages[task.id] && (
                                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg text-center max-w-[200px]">
                                        {errorMessages[task.id]}
                                    </p>
                                )}
                                <div className="relative">
                                    <button
                                        disabled={uploadingTaskId === task.id}
                                        className={`btn-primary w-full flex items-center justify-center gap-2 ${uploadingTaskId === task.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {uploadingTaskId === task.id ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Camera className="w-5 h-5" />
                                        )}
                                        {uploadingTaskId === task.id ? 'Verifying with AI...' : 'Capture Proof & Mark Done'}
                                    </button>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        disabled={uploadingTaskId === task.id}
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                completeTask(task.id, e.target.files[0]);
                                                e.target.value = null;
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                                <button
                                    onClick={() => handleNavigate(task.latitude, task.longitude)}
                                    className="btn-secondary flex items-center justify-center gap-2"
                                >
                                    <Navigation className="w-4 h-4" />
                                    Navigate
                                </button>
                            </div>
                        </div>
                    );
                })}

                {tasks.length === 0 && (
                    <div className="eco-card p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">All Tasks Completed!</h3>
                        <p className="text-slate-500">Great job! No pending tasks at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
