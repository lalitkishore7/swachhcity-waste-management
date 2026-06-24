import { useState, useEffect } from 'react';
import { User, Save, Lock, Phone, AtSign, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000';

export default function ProfilePage() {
    const { user, token, updateUser } = useAuth();
    const [form, setForm] = useState({
        name: '',
        username: '',
        mobile: '',
        password: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            setForm(prev => ({
                ...prev,
                name: user.name || '',
                username: user.username || '',
                mobile: user.mobile || '',
            }));
        }
    }, [user]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setMessage({ type: '', text: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Validate password match
        if (form.password && form.password !== form.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }

        if (form.password && form.password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }

        setLoading(true);
        try {
            const body = {};
            if (form.name.trim()) body.name = form.name.trim();
            if (form.username !== undefined) body.username = form.username.trim();
            if (form.mobile !== undefined) body.mobile = form.mobile.trim();
            if (form.password.trim()) body.password = form.password.trim();

            const res = await fetch(`${API}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (res.ok) {
                updateUser(data.user);
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to update profile.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Network error.' });
        } finally {
            setLoading(false);
        }
    };

    const roleColors = {
        admin: 'from-purple-500 to-indigo-600',
        worker: 'from-amber-500 to-orange-600',
        citizen: 'from-emerald-500 to-green-600',
    };

    const roleBadgeColors = {
        admin: 'bg-purple-100 text-purple-700',
        worker: 'bg-amber-100 text-amber-700',
        citizen: 'bg-emerald-100 text-emerald-700',
    };

    return (
        <div className="max-w-lg mx-auto">
            <div className="eco-card p-8">
                {/* Profile Header */}
                <div className="text-center mb-8">
                    <div className={`w-20 h-20 mx-auto mb-4 bg-gradient-to-br ${roleColors[user?.role] || roleColors.citizen} rounded-2xl flex items-center justify-center shadow-lg`}>
                        <User className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">{user?.name || 'User'}</h2>
                    <p className="text-sm text-slate-500 mt-1">{user?.email}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold capitalize ${roleBadgeColors[user?.role] || roleBadgeColors.citizen}`}>
                        {user?.role}
                    </span>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            <User className="w-4 h-4 inline mr-1.5 text-emerald-500" />
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white/70 backdrop-blur-sm transition-all"
                            placeholder="Your full name"
                            required
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            <AtSign className="w-4 h-4 inline mr-1.5 text-emerald-500" />
                            Username
                        </label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={(e) => handleChange('username', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white/70 backdrop-blur-sm transition-all"
                            placeholder="Choose a username"
                        />
                    </div>

                    {/* Mobile */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            <Phone className="w-4 h-4 inline mr-1.5 text-emerald-500" />
                            Mobile Number
                        </label>
                        <input
                            type="tel"
                            value={form.mobile}
                            onChange={(e) => handleChange('mobile', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white/70 backdrop-blur-sm transition-all"
                            placeholder="+91 XXXXX XXXXX"
                        />
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-emerald-100"></div>
                        <span className="text-xs text-slate-400 font-medium">Change Password</span>
                        <div className="flex-1 h-px bg-emerald-100"></div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            <Lock className="w-4 h-4 inline mr-1.5 text-emerald-500" />
                            New Password
                        </label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white/70 backdrop-blur-sm transition-all"
                            placeholder="Leave blank to keep current password"
                            minLength={6}
                        />
                    </div>

                    {/* Confirm Password */}
                    {form.password && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <Lock className="w-4 h-4 inline mr-1.5 text-emerald-500" />
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={form.confirmPassword}
                                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white/70 backdrop-blur-sm transition-all"
                                placeholder="Confirm new password"
                                required={!!form.password}
                            />
                        </div>
                    )}

                    {/* Message */}
                    {message.text && (
                        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                            message.type === 'success'
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                            {message.type === 'success'
                                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                : <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            }
                            <span>{message.text}</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                            loading
                                ? 'bg-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 hover:scale-[1.02] shadow-emerald-500/30'
                        }`}
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Save Changes
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
