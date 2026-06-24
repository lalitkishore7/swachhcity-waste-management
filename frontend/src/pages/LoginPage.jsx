import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, Leaf, ArrowRight, ArrowLeft, KeyRound, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, forgotPassword, resetPassword } = useAuth();
    const navigate = useNavigate();

    // Forgot password state
    const [forgotMode, setForgotMode] = useState(false);
    const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=otp, 3=new password
    const [forgotEmail, setForgotEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [successMessage, setSuccessMessage] = useState('');
    const otpRefs = useRef([]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await login(email, password);
            if (user.role === 'admin') navigate('/admin');
            else if (user.role === 'worker') navigate('/worker');
            else navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await forgotPassword(forgotEmail);
            setForgotStep(2);
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
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
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

    const handleVerifyAndProceed = () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter the complete 6-digit OTP');
            return;
        }
        setError('');
        setForgotStep(3);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            await resetPassword(forgotEmail, otp.join(''), newPassword);
            setSuccessMessage('Password reset successfully! You can now log in.');
            setForgotMode(false);
            setForgotStep(1);
            setOtp(['', '', '', '', '', '']);
            setNewPassword('');
            setConfirmPassword('');
            setForgotEmail('');
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
            await forgotPassword(forgotEmail);
            setResendCooldown(30);
            setOtp(['', '', '', '', '', '']);
        } catch (err) {
            setError(err.message);
        }
    };

    const exitForgotMode = () => {
        setForgotMode(false);
        setForgotStep(1);
        setError('');
        setOtp(['', '', '', '', '', '']);
        setForgotEmail('');
        setNewPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="leaf-pattern absolute inset-0 opacity-10"></div>
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
                        <Leaf className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {forgotMode
                            ? (forgotStep === 1 ? 'Forgot Password' : forgotStep === 2 ? 'Enter OTP' : 'New Password')
                            : 'Welcome Back'
                        }
                    </h1>
                    <p className="text-emerald-200/70">
                        {forgotMode
                            ? (forgotStep === 1 ? 'Enter your email to reset password' : forgotStep === 2 ? `Code sent to ${forgotEmail}` : 'Create a new secure password')
                            : 'Sign in to SwachhCity'
                        }
                    </p>
                </div>

                {/* Card */}
                <div className="glass-card rounded-3xl p-8 shadow-2xl">
                    {/* Success Message */}
                    {successMessage && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-300 text-sm flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                            {successMessage}
                        </div>
                    )}

                    {/* ===== NORMAL LOGIN ===== */}
                    {!forgotMode && (
                        <>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/50" />
                                        <input
                                            type="email"
                                            placeholder="Email address"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setSuccessMessage(''); }}
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
                                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Forgot Password Link */}
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => { setForgotMode(true); setError(''); setSuccessMessage(''); }}
                                        className="text-sm text-emerald-400/70 hover:text-emerald-300 transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
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
                                            <LogIn className="w-5 h-5" />
                                            Sign In
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-white/50">
                                    Don't have an account?{' '}
                                    <Link to="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                                        Create one
                                    </Link>
                                </p>
                            </div>
                        </>
                    )}

                    {/* ===== FORGOT PASSWORD FLOW ===== */}
                    {forgotMode && (
                        <div className="space-y-6">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Step 1: Enter Email */}
                            {forgotStep === 1 && (
                                <form onSubmit={handleForgotSendOtp} className="space-y-5">
                                    <div className="text-center mb-2">
                                        <div className="w-14 h-14 mx-auto mb-3 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                                            <KeyRound className="w-7 h-7 text-amber-400" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/50" />
                                        <input
                                            type="email"
                                            placeholder="Enter your registered email"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            required
                                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Mail className="w-5 h-5" />
                                                Send Reset Code
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* Step 2: Enter OTP */}
                            {forgotStep === 2 && (
                                <div className="space-y-5">
                                    <div className="text-center">
                                        <div className="w-14 h-14 mx-auto mb-3 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                                            <Mail className="w-7 h-7 text-emerald-400" />
                                        </div>
                                        <p className="text-white/60 text-sm">Enter the 6-digit code</p>
                                    </div>

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

                                    <button
                                        onClick={handleVerifyAndProceed}
                                        disabled={otp.join('').length !== 6}
                                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        Verify Code
                                        <ArrowRight className="w-5 h-5" />
                                    </button>

                                    <div className="text-center">
                                        <button
                                            onClick={handleResend}
                                            disabled={resendCooldown > 0}
                                            className={`text-sm flex items-center gap-1 mx-auto transition-colors ${
                                                resendCooldown > 0 ? 'text-white/30 cursor-not-allowed' : 'text-emerald-400 hover:text-emerald-300'
                                            }`}
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: New Password */}
                            {forgotStep === 3 && (
                                <form onSubmit={handleResetPassword} className="space-y-5">
                                    <div className="text-center mb-2">
                                        <div className="w-14 h-14 mx-auto mb-3 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                                            <Lock className="w-7 h-7 text-emerald-400" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/50" />
                                        <input
                                            type="password"
                                            placeholder="New password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/50" />
                                        <input
                                            type="password"
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all"
                                        />
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
                                                <CheckCircle2 className="w-5 h-5" />
                                                Reset Password
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* Back to Login */}
                            <button
                                onClick={exitForgotMode}
                                className="flex items-center gap-1 text-white/50 hover:text-white/80 transition-colors text-sm mx-auto"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
