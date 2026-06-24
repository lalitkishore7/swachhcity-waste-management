import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ComplaintForm from './components/ComplaintForm';
import AdminDashboard from './components/AdminDashboard';
import WorkerPanel from './components/WorkerPanel';
import ProfilePage from './components/ProfilePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MyReports from './components/MyReports';
import { Leaf, LogOut, Home, Shield, Wrench, User, FileText } from 'lucide-react';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}

// Navigation Component
function Navigation() {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) return null;

    const navItems = [
        { path: '/', label: 'Report', icon: Home, roles: ['citizen'] },
        { path: '/my-reports', label: 'My Reports', icon: FileText, roles: ['citizen'] },
        { path: '/admin', label: 'Admin', icon: Shield, roles: ['admin'] },
        { path: '/worker', label: 'Tasks', icon: Wrench, roles: ['worker'] },
        { path: '/profile', label: 'Profile', icon: User, roles: ['citizen', 'worker', 'admin'] },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-all">
                        <Leaf className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-xl gradient-text">SwachhCity</span>
                </Link>

                <div className="flex items-center gap-4">
                    <div className="flex gap-1 bg-emerald-50 p-1 rounded-xl">
                        {navItems.filter(item => item.roles.includes(user.role)).map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                    location.pathname === item.path
                                        ? 'bg-white text-emerald-700 shadow-sm'
                                        : 'text-emerald-600/70 hover:text-emerald-700 hover:bg-white/50'
                                }`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 pl-4 border-l border-emerald-100">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium text-slate-700">{user.name}</p>
                            <p className="text-xs text-emerald-600 capitalize">{user.role}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}

// Main Layout
function MainLayout({ children }) {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative">
            {/* Background Pattern */}
            <div className="fixed inset-0 leaf-pattern pointer-events-none"></div>
            
            <Navigation />

            <main className="relative z-10 container mx-auto px-4 py-8 animate-fade-in">
                {user && (
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-extrabold gradient-text mb-2">
                            🌿 AI-Powered Cleanliness
                        </h1>
                        <p className="text-emerald-600/70">Smart waste management for a greener tomorrow</p>
                    </div>
                )}
                {children}
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-emerald-100 py-3 text-center text-xs text-emerald-600/50">
                <span className="animate-pulse">🌱</span> SwachhCity • Powered by React, Node & AI <span className="animate-pulse">♻️</span>
            </footer>
        </div>
    );
}

// App Component
function AppRoutes() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
            <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupPage />} />
            
            <Route path="/" element={
                <ProtectedRoute>
                    <MainLayout>
                        {user?.role === 'admin' ? <Navigate to="/admin" replace /> : user?.role === 'worker' ? <Navigate to="/worker" replace /> : <ComplaintForm />}
                    </MainLayout>
                </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <MainLayout>
                        <AdminDashboard />
                    </MainLayout>
                </ProtectedRoute>
            } />
            
            <Route path="/worker" element={
                <ProtectedRoute allowedRoles={['worker']}>
                    <MainLayout>
                        <WorkerPanel />
                    </MainLayout>
                </ProtectedRoute>
            } />

            <Route path="/profile" element={
                <ProtectedRoute>
                    <MainLayout>
                        <ProfilePage />
                    </MainLayout>
                </ProtectedRoute>
            } />
            
            <Route path="/my-reports" element={
                <ProtectedRoute allowedRoles={['citizen']}>
                    <MainLayout>
                        <MyReports />
                    </MainLayout>
                </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;

