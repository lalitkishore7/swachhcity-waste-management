import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Lock, User, Leaf, Users, Shield, Wrench, ArrowLeft, RefreshCw } from 'lucide-react';

export default function SignupPage() {
    const [step, setStep] = useState(1); // 1 = form, 2 = OTP
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('citizen');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [resendCooldown, setResendCooldown] = useState(0);
    const otpRefs = useRef([]);
    const { sendOtp, verifyOtp, resendOtp } = useAuth();
    const navigate = useNavigate();

    const roles = [
        { value: 'citizen', label: 'Citizen', icon: Users, desc: 'Report waste issues' },
        { value: 'worker', label: 'Worker', icon: Wrench, desc: 'Handle cleanup tasks' },
        { value: 'admin', label: 'Admin', icon: Shield, desc: 'Manage the system' }
    ];

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await sendOtp(name, email, password, role);
            setStep(2);
            setResendCooldown(30);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) value = value[value.length - 1];
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (paste.length === 6) {
            setOtp(paste.split(''));
            otpRefs.current[5]?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter the complete 6-digit OTP');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const user = await verifyOtp(email, otpString);
            if (user.role === 'admin') navigate('/admin');
            else if (user.role === 'worker') navigate('/worker');
            else navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setError('');
        try {
            await resendOtp(email);
            setResendCooldown(30);
            setOtp(['', '', '', '', '', '']);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 relative overflow-hidden py-12">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="leaf-pattern absolute inset-0 opacity-10"></div>
                <div className="absolute top-40 right-20 w-80 h-80 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-40 left-20 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
                        <Leaf className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {step === 1 ? 'Join SwachhCity' : 'Verify Your Email'}
                    </h1>
                    <p className="text-emerald-200/70">
                        {step === 1 ? 'Create your account to get started' : `We sent a code to ${email}`}
                    </p>
                </div>

                {/* Card */}
                <div className="glass-card rounded-3xl p-8 shadow-2xl">
                    {/* Step 1: Registration Form */}
                    {step === 1 && (
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/50" />
                                    <input
                                        type="text"
                                        placeholder="Full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all"
                                    />
                                </div>

                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/50" />
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all"
                                    />
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/50" />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div className="space-y-3">
                                <label className="text-white/70 text-sm font-medium">Select your role</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {roles.map((r) => (
                                        <button
                                            key={r.value}
                                            type="button"
                                            onClick={() => setRole(r.value)}
                                            className={`p-4 rounded-xl border transition-all text-center ${
                                                role === r.value
                                                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                                                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                                            }`}
                                        >
                                            <r.icon className={`w-6 h-6 mx-auto mb-2 ${role === r.value ? 'text-emerald-400' : ''}`} />
                                            <span className="text-sm font-medium">{r.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Mail className="w-5 h-5" />
                                        Send Verification Code
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Step 2: OTP Verification */}
                    {step === 2 && (
                        <div className="space-y-6">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* OTP Icon */}
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-3 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                                    <Mail className="w-8 h-8 text-emerald-400" />
                                </div>
                                <p className="text-white/60 text-sm">Enter the 6-digit code sent to</p>
                                <p className="text-emerald-400 font-semibold">{email}</p>
                            </div>

                            {/* OTP Input Boxes */}
                            <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={el => otpRefs.current[i] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        className="w-12 h-14 text-center text-xl font-bold bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all"
                                    />
                                ))}
                            </div>

                            {/* Verify Button */}
                            <button
                                onClick={handleVerifyOtp}
                                disabled={loading || otp.join('').length !== 6}
                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <UserPlus className="w-5 h-5" />
                                        Verify & Create Account
                                    </>
                                )}
                            </button>

                            {/* Resend / Go Back */}
                            <div className="flex items-center justify-between text-sm">
                                <button
                                    onClick={() => { setStep(1); setError(''); setOtp(['', '', '', '', '', '']); }}
                                    className="flex items-center gap-1 text-white/50 hover:text-white/80 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Go back
                                </button>
                                <button
                                    onClick={handleResend}
                                    disabled={resendCooldown > 0}
                                    className={`flex items-center gap-1 transition-colors ${
                                        resendCooldown > 0
                                            ? 'text-white/30 cursor-not-allowed'
                                            : 'text-emerald-400 hover:text-emerald-300'
                                    }`}
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-white/50">
                            Already have an account?{' '}
                            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
