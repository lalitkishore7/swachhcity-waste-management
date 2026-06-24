import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, MapPin, Clock, TrendingUp, Users, Trash2, Shield, Zap, BarChart2, RefreshCw, Download, X, Check, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DailyChart, TypePieChart } from './AnalyticsChart';

// Lazy-load the map only on client (avoids SSR issues with Leaflet)
import HotspotMap from './HotspotMap';

const API = 'http://localhost:5000';

function getSeverityBadge(score) {
    if (score > 0.7) return { cls: 'badge-danger', label: 'High', dot: 'bg-red-500' };
    if (score > 0.4) return { cls: 'badge-warning', label: 'Medium', dot: 'bg-amber-500' };
    return { cls: 'badge-success', label: 'Low', dot: 'bg-emerald-500' };
}

function SLABadge({ createdAt }) {
    const hours = (Date.now() - new Date(createdAt)) / 3_600_000;
    if (hours > 24) return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">⚠ {Math.round(hours)}h</span>;
    if (hours > 8) return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{Math.round(hours)}h</span>;
    return <span className="text-xs text-slate-400">{Math.round(hours)}h ago</span>;
}

export default function AdminDashboard() {
    const { token } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [hotspots, setHotspots] = useState([]);
    const [activeTab, setActiveTab] = useState('map'); // map | analytics | workers | hotspots
    const [assigning, setAssigning] = useState(null); // complaint id being assigned
    const [assignWorkerId, setAssignWorkerId] = useState('');
    const [assignMsg, setAssignMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
    const [filterStatus, setFilterStatus] = useState('all');

    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [cRes, wRes, aRes, hRes] = await Promise.all([
                fetch(`${API}/api/complaints`, { headers: authHeaders }),
                fetch(`${API}/api/users/workers`, { headers: authHeaders }),
                fetch(`${API}/api/complaints/analytics`, { headers: authHeaders }),
                fetch(`${API}/api/complaints/hotspots`, { headers: authHeaders }),
            ]);
            const [cData, wData, aData, hData] = await Promise.all([
                cRes.json(), wRes.json(), aRes.json(), hRes.json()
            ]);
            if (Array.isArray(cData)) {
                setComplaints(cData);
                // Set map center to first valid complaint or default
                const first = cData.find(c => c.latitude && c.longitude);
                if (first) setMapCenter([first.latitude, first.longitude]);
            }
            if (Array.isArray(wData)) setWorkers(wData);
            if (aData && !aData.error) setAnalytics(aData);
            if (hData?.hotspots) setHotspots(hData.hotspots);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const assignWorker = async (complaintId) => {
        if (!assignWorkerId) return;
        try {
            const res = await fetch(`${API}/api/complaints/${complaintId}/assign`, {
                method: 'PUT',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ worker_id: assignWorkerId }),
            });
            const data = await res.json();
            if (res.ok) {
                setAssignMsg('✓ Worker assigned!');
                fetchData();
                setTimeout(() => { setAssigning(null); setAssignMsg(''); setAssignWorkerId(''); }, 1500);
            } else {
                setAssignMsg(data.error || 'Assignment failed');
            }
        } catch (e) {
            setAssignMsg('Network error');
        }
    };

    const exportCSV = () => {
        const header = ['ID', 'Type', 'Status', 'Severity', 'Latitude', 'Longitude', 'Created At'];
        const rows = complaints.map(c => [c.complaint_id, c.garbage_type, c.status, c.severity_score, c.latitude, c.longitude, c.created_at]);
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'swachhcity_complaints.csv';
        a.click(); URL.revokeObjectURL(url);
    };

    const filteredComplaints = filterStatus === 'all'
        ? complaints
        : complaints.filter(c => c.status === filterStatus);

    const stats = [
        { label: 'Total Reports', value: analytics?.total ?? complaints.length, icon: Trash2, color: 'emerald', bg: 'from-emerald-500 to-teal-600' },
        { label: 'Active Workers', value: workers.length, icon: Users, color: 'teal', bg: 'from-teal-500 to-cyan-600' },
        { label: 'High Priority', value: analytics?.highPriority ?? 0, icon: AlertTriangle, color: 'amber', bg: 'from-amber-500 to-orange-600' },
        { label: 'Resolved', value: analytics?.resolved ?? 0, icon: TrendingUp, color: 'green', bg: 'from-green-500 to-emerald-600' },
    ];

    const tabs = [
        { id: 'map', label: 'Live Map', icon: MapPin },
        { id: 'analytics', label: 'Analytics', icon: BarChart2 },
        { id: 'complaints', label: 'Reports', icon: AlertTriangle },
        { id: 'workers', label: 'Workers', icon: Users },
        { id: 'hotspots', label: 'Hotspots', icon: Zap },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Admin Command Center</h1>
                        <p className="text-emerald-600 text-sm flex items-center gap-1">
                            <Activity className="w-3 h-3 animate-pulse" />
                            Live waste management intelligence
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-all text-sm font-medium shadow-sm">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all text-sm font-medium shadow-sm">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="eco-card p-5 flex items-center gap-4 hover:scale-[1.02] transition-all">
                        <div className={`w-12 h-12 bg-gradient-to-br ${stat.bg} rounded-xl flex items-center justify-center shadow-md`}>
                            <stat.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                            <p className="text-sm text-slate-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Avg Resolution Time */}
            {analytics?.avgResolutionHours > 0 && (
                <div className="eco-card p-4 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-teal-500" />
                    <span className="text-sm text-slate-600">
                        Average resolution time: <strong className="text-teal-700">{analytics.avgResolutionHours}h</strong>
                    </span>
                    {analytics.pending > 0 && (
                        <span className="ml-4 text-sm text-slate-600">
                            Pending: <strong className="text-amber-600">{analytics.pending}</strong>
                        </span>
                    )}
                    {analytics.assigned > 0 && (
                        <span className="ml-4 text-sm text-slate-600">
                            Assigned: <strong className="text-blue-600">{analytics.assigned}</strong>
                        </span>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-emerald-50 p-1 rounded-2xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-emerald-600/70 hover:text-emerald-700 hover:bg-white/50'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── LIVE MAP TAB ─────────────────────────────────────────────────── */}
            {activeTab === 'map' && (
                <div className="eco-card p-2" style={{ height: 500 }}>
                    <HotspotMap
                        complaints={complaints.filter(c => c.latitude && c.longitude)}
                        hotspots={hotspots}
                        center={mapCenter}
                        zoom={complaints.length > 0 ? 12 : 5}
                    />
                </div>
            )}

            {/* ── ANALYTICS TAB ────────────────────────────────────────────────── */}
            {activeTab === 'analytics' && analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="eco-card p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-emerald-500" />
                            Daily Complaints (Last 7 Days)
                        </h3>
                        <DailyChart data={analytics.daily} />
                    </div>
                    <div className="eco-card p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-amber-500" />
                            Garbage Type Breakdown
                        </h3>
                        <TypePieChart data={analytics.typeBreakdown} />
                    </div>
                    <div className="eco-card p-6 lg:col-span-2">
                        <h3 className="font-bold text-slate-800 mb-3">Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Total', val: analytics.total, color: 'text-slate-700' },
                                { label: 'Pending', val: analytics.pending, color: 'text-amber-600' },
                                { label: 'Assigned', val: analytics.assigned, color: 'text-blue-600' },
                                { label: 'Resolved', val: analytics.resolved, color: 'text-emerald-600' },
                            ].map(s => (
                                <div key={s.label} className="bg-slate-50 rounded-xl p-4 text-center">
                                    <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
                                    <p className="text-sm text-slate-500">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── COMPLAINTS TAB ────────────────────────────────────────────────── */}
            {activeTab === 'complaints' && (
                <div className="eco-card p-6 space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-3">
                        <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            All Reports ({filteredComplaints.length})
                        </h2>
                        <div className="flex gap-2 flex-wrap">
                            {['all', 'pending', 'assigned', 'resolved'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${filterStatus === s ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {filteredComplaints.map(c => {
                            const normalizedScore = (c.severity_score || 0) / 10;
                            const badge = getSeverityBadge(normalizedScore);
                            return (
                                <div key={c.complaint_id} className="border border-emerald-100 bg-white rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start">
                                    {/* Image */}
                                    {c.image_url && (
                                        <img
                                            src={`${API}/uploads/${c.image_url}`}
                                            alt="complaint"
                                            className="w-20 h-20 object-cover rounded-xl flex-shrink-0 shadow"
                                        />
                                    )}
                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-800">#{c.complaint_id}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${c.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : c.status === 'assigned' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                                            {c.created_at && <SLABadge createdAt={c.created_at} />}
                                        </div>
                                        <p className="text-sm text-slate-600 capitalize mb-1"><strong>Type:</strong> {c.garbage_type ?? 'Unknown'} &nbsp;|&nbsp; <strong>Priority:</strong> {(c.severity_score || 0).toFixed(1)}/10</p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {c.latitude ? Number(c.latitude).toFixed(4) : 'N/A'}, {c.longitude ? Number(c.longitude).toFixed(4) : 'N/A'}
                                        </p>
                                    </div>
                                    {/* Assign button */}
                                    {c.status !== 'resolved' && (
                                        <div className="flex-shrink-0">
                                            {assigning === c.complaint_id ? (
                                                <div className="flex gap-2 items-center">
                                                    <select
                                                        value={assignWorkerId}
                                                        onChange={e => setAssignWorkerId(e.target.value)}
                                                        className="text-sm border border-emerald-200 rounded-lg px-2 py-1"
                                                    >
                                                        <option value="">Select worker</option>
                                                        {workers.map(w => (
                                                            <option key={w.id} value={w.id}>{w.name}</option>
                                                        ))}
                                                    </select>
                                                    <button onClick={() => assignWorker(c.complaint_id)} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => { setAssigning(null); setAssignMsg(''); }} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    {assignMsg && <span className="text-xs text-emerald-700 font-medium">{assignMsg}</span>}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => { setAssigning(c.complaint_id); setAssignWorkerId(''); setAssignMsg(''); }}
                                                    className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg text-xs font-medium hover:bg-teal-100 transition-all flex items-center gap-1"
                                                >
                                                    <Users className="w-3 h-3" />
                                                    {c.assigned_worker_id ? 'Reassign' : 'Assign'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {/* Cleanup proof */}
                                    {c.status === 'resolved' && c.cleanup_image_url && (
                                        <img
                                            src={`${API}/uploads/${c.cleanup_image_url}`}
                                            alt="cleanup proof"
                                            className="w-20 h-20 object-cover rounded-xl flex-shrink-0 shadow border-2 border-emerald-400"
                                            title="Cleanup proof"
                                        />
                                    )}
                                </div>
                            );
                        })}
                        {filteredComplaints.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No complaints found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── WORKERS TAB ───────────────────────────────────────────────────── */}
            {activeTab === 'workers' && (
                <div className="eco-card p-6">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
                        <Users className="w-5 h-5 text-teal-500" />
                        Worker Performance ({workers.length})
                    </h2>
                    {workers.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No workers registered yet</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-slate-500 border-b border-emerald-100">
                                        <th className="py-3 pr-4">Worker</th>
                                        <th className="py-3 pr-4">Assigned</th>
                                        <th className="py-3 pr-4">Resolved</th>
                                        <th className="py-3 pr-4">Completion %</th>
                                        <th className="py-3 pr-4">GPS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workers.map(w => {
                                        const pct = w.assigned_count > 0 ? Math.round((w.resolved_count / w.assigned_count) * 100) : 0;
                                        return (
                                            <tr key={w.id} className="border-b border-emerald-50 hover:bg-emerald-50/50 transition-colors">
                                                <td className="py-3 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                                                            {w.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-700">{w.name}</p>
                                                            <p className="text-xs text-slate-400">{w.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 font-bold text-blue-600">{w.assigned_count}</td>
                                                <td className="py-3 pr-4 font-bold text-emerald-600">{w.resolved_count}</td>
                                                <td className="py-3 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-[60px]">
                                                            <div
                                                                className="h-2 rounded-full transition-all"
                                                                style={{
                                                                    width: `${pct}%`,
                                                                    background: pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444'
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-600">{pct}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 text-xs text-slate-400">
                                                    {w.worker_lat && w.worker_lon
                                                        ? `${w.worker_lat.toFixed(3)}, ${w.worker_lon.toFixed(3)}`
                                                        : <span className="text-slate-300">No GPS</span>
                                                    }
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── HOTSPOTS TAB ──────────────────────────────────────────────────── */}
            {activeTab === 'hotspots' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="eco-card p-2" style={{ height: 400 }}>
                        <HotspotMap
                            complaints={[]}
                            hotspots={hotspots}
                            center={mapCenter}
                            zoom={complaints.length > 0 ? 12 : 5}
                        />
                    </div>
                    <div className="eco-card p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Predicted Risk Zones ({hotspots.length})
                        </h3>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {hotspots.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No hotspot data yet. Submit more complaints to build predictions.</p>
                            ) : hotspots.map((hs, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm ${hs.risk_score > 0.6 ? 'bg-red-500' : hs.risk_score > 0.3 ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                                        #{i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700">
                                            {hs.latitude.toFixed(3)}, {hs.longitude.toFixed(3)}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {hs.complaint_count} complaints &nbsp;|&nbsp; Avg severity: {(hs.avg_severity * 10).toFixed(1)}/10
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-700">{(hs.risk_score * 10).toFixed(1)}</p>
                                        <p className="text-xs text-slate-400">Risk</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${hs.risk_score > 0.6 ? 'bg-red-100 text-red-700' : hs.risk_score > 0.3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {hs.label ?? (hs.risk_score > 0.6 ? 'High Risk' : hs.risk_score > 0.3 ? 'Medium Risk' : 'Low Risk')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
