import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, MapPin, Calendar, Activity, CheckCircle2, Clock, Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function MyReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { token } = useAuth();

    useEffect(() => {
        fetchMyReports();
    }, []);

    const fetchMyReports = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/complaints/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReports(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching reports:', err);
            setError('Failed to load your reports.');
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'assigned': return <Activity className="w-5 h-5 text-blue-500" />;
            case 'resolved': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            default: return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'assigned': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-emerald-100">
                    <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">My Reports</h2>
                    <p className="text-slate-500 text-sm">Track the status of your reported cleanliness issues</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                </div>
            ) : error ? (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center">
                    {error}
                </div>
            ) : reports.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-emerald-100 p-12 text-center shadow-lg shadow-emerald-500/5">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Leaf className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Reports Yet</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mb-6">
                        You haven't reported any garbage issues yet. Help keep the city clean by reporting issues you see!
                    </p>
                    <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all">
                        Report an Issue
                    </a>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map((report) => (
                        <div key={report.complaint_id} className="bg-white rounded-2xl border border-emerald-100 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                            <div className="h-48 relative overflow-hidden bg-slate-100">
                                {report.image_url ? (
                                    <img
                                        src={`http://localhost:5000/uploads/${report.image_url}`}
                                        alt="Report location"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                        <Leaf className="w-8 h-8 opacity-20 mb-2" />
                                        <span>No image</span>
                                    </div>
                                )}
                                
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 shadow-sm backdrop-blur-md bg-white/90 ${getStatusColor(report.status)}`}>
                                        {getStatusIcon(report.status)}
                                        <span className="capitalize">{report.status}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="flex items-start gap-3 mb-3 text-slate-600">
                                    <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-emerald-500" />
                                    <div className="text-sm">
                                        <p className="font-medium text-slate-800">Location</p>
                                        <p className="text-xs text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">
                                            {report.latitude ? Number(report.latitude).toFixed(4) : 'N/A'}, {report.longitude ? Number(report.longitude).toFixed(4) : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 mb-4 text-slate-600">
                                    <Calendar className="w-4 h-4 mt-1 flex-shrink-0 text-emerald-500" />
                                    <div className="text-sm">
                                        <p className="font-medium text-slate-800">Reported On</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(report.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric', month: 'short', day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <p className="text-sm text-slate-600 line-clamp-2">
                                        <strong>Type:</strong> <span className="capitalize">{report.garbage_type || 'Unknown'}</span><br/>
                                        <strong>Address:</strong> {report.address || 'Location not specified'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MyReports;
