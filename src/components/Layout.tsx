import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, PackagePlus, UserCircle, Menu, X, Home, ShieldCheck, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'motion/react';

// Snappy spring configuration for a premium feel
const snappySpring = {
  type: 'spring',
  stiffness: 450,
  damping: 30,
  mass: 1
};

export default function Layout() {
  const { user, profile, isAdmin, signIn, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [pendingPath, setPendingPath] = React.useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleLogin = async () => {
    await signIn();
    if (pendingPath) {
      navigate(pendingPath);
      setPendingPath(null);
    }
    setShowAuthModal(false);
  };

  const protectedNavigate = (path: string) => {
    if (!user) {
      setPendingPath(path);
      setShowAuthModal(true);
    } else {
      navigate(path);
    }
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Redirect to setup if logged in but no profile exists (and not already on setup)
  React.useEffect(() => {
    if (!loading && user && !profile && location.pathname !== '/setup-profile') {
      navigate('/setup-profile');
    }
  }, [loading, user, profile, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={snappySpring}
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"
        ></motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Toaster position="top-right" />
      
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" onClick={handleHomeClick} className="flex items-center gap-2 group transition-all">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-100"
                >
                  <Home size={24} />
                </motion.div>
                <span className="text-xl font-black text-gray-900 tracking-tightest">IIT EXCHANGE</span>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex md:items-center md:space-x-2">
              {user && profile ? (
                <>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95",
                        location.pathname === '/admin' 
                          ? "text-indigo-700 bg-indigo-50 shadow-inner" 
                          : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      )}
                    >
                      <ShieldCheck size={18} />
                      ADMIN CONSOLE
                    </Link>
                  )}
                  <Link
                    to="/sell"
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all hover:shadow-lg hover:shadow-indigo-200 active:scale-95"
                  >
                    <PackagePlus size={18} />
                    SELL ITEM
                  </Link>
                  <Link
                    to="/dashboard"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95",
                      location.pathname === '/dashboard' 
                        ? "text-indigo-700 bg-indigo-50 shadow-inner" 
                        : "text-gray-600 hover:text-indigo-600 hover:bg-gray-100"
                    )}
                  >
                    <LayoutDashboard size={18} />
                    DASHBOARD
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-all active:scale-95"
                  >
                    <LogOut size={18} />
                    LOGOUT
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all hover:shadow-lg hover:shadow-indigo-200 active:scale-95 shadow-sm"
                >
                  <UserCircle size={20} />
                  LOGIN
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-500 hover:bg-gray-100 p-2 rounded-xl transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={snappySpring}
              className="md:hidden border-t border-gray-100 bg-white overflow-hidden"
            >
              <div className="pt-2 pb-4 space-y-1 px-4">
                {user && profile ? (
                  <>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "block px-4 py-3 text-sm font-bold rounded-xl flex items-center gap-3 mb-1",
                          location.pathname === '/admin'
                            ? "text-indigo-700 bg-indigo-50"
                            : "text-amber-600 bg-amber-50/50"
                        )}
                      >
                        <ShieldCheck size={18} /> ADMIN CONSOLE
                      </Link>
                    )}
                    <Link
                      to="/sell"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-sm font-bold text-gray-900 bg-gray-50 rounded-xl flex items-center gap-3 transition-colors active:bg-gray-100"
                    >
                      <PackagePlus size={18} /> SELL ITEM
                    </Link>
                    <button
                      onClick={() => { setMobileMenuOpen(false); protectedNavigate('/dashboard'); }}
                      className={cn(
                        "w-full text-left px-4 py-3 text-sm font-bold rounded-xl flex items-center gap-3 transition-colors",
                        location.pathname === '/dashboard'
                          ? "text-indigo-700 bg-indigo-50"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <LayoutDashboard size={18} /> DASHBOARD
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <LogOut size={18} /> LOGOUT
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleLogin(); }}
                    className="w-full text-left px-4 py-4 text-sm font-black text-indigo-700 bg-indigo-50 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95"
                  >
                    <UserCircle size={18} /> LOGIN WITH @iitdh.ac.in
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className={cn(
        "flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8",
        "pb-32 md:pb-8" // Add extra bottom padding for mobile to account for bottom nav
      )}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation (Floating) */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-40">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...snappySpring, delay: 0.2 }}
          className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-2 flex justify-around items-center"
        >
          {[
            { id: 'home', icon: Home, path: '/', action: () => {
              if (location.pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // Add a slight delay for the scroll to start before reload
                setTimeout(() => window.location.reload(), 300);
              } else {
                navigate('/');
              }
            } },
            { id: 'sell', icon: PackagePlus, path: '/sell', action: () => protectedNavigate('/sell') },
            { id: 'dashboard', icon: LayoutDashboard, path: '/dashboard', action: () => protectedNavigate('/dashboard') },
            ...(isAdmin ? [{ id: 'admin', icon: ShieldCheck, path: '/admin', action: () => navigate('/admin') }] : []),
            ...(!user ? [{ id: 'login', icon: UserCircle, path: null, action: () => setShowAuthModal(true) }] : [])
          ].map((item) => (
            <motion.button 
              key={item.id}
              whileTap={{ scale: 0.85, y: -2 }}
              onClick={item.action}
              className={cn(
                "p-4 rounded-2xl transition-all duration-300 relative group",
                (item.path === location.pathname) 
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-110 -translate-y-1" 
                  : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50"
              )}
            >
              <item.icon size={22} strokeWidth={2.5} />
              {item.path === location.pathname && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                />
              )}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Auth Guard Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-gray-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, y: 150, scale: 0.9, rotateX: -20 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 150, scale: 0.9, rotateX: 20 }}
              transition={snappySpring}
              className="relative bg-white w-full max-w-[400px] rounded-[40px] shadow-2xl overflow-hidden perspective-1000"
            >
              <div className="bg-indigo-600 p-12 text-white text-center relative overflow-hidden">
                <motion.div 
                  initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ ...snappySpring, delay: 0.1 }}
                  className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-12 -translate-y-12 blur-2xl"
                />
                <div className="relative z-10">
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ ...snappySpring, delay: 0.2 }}
                    className="w-20 h-20 bg-white/20 backdrop-blur-2xl rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/20"
                  >
                    <LogIn size={40} strokeWidth={2.5} />
                  </motion.div>
                  <motion.h3 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ ...snappySpring, delay: 0.3 }}
                    className="text-3xl font-black tracking-tightest mb-3 uppercase"
                  >
                    IDENTIFY YOURSELF
                  </motion.h3>
                  <motion.p 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ ...snappySpring, delay: 0.4 }}
                    className="text-indigo-100/70 text-sm font-bold tracking-wide"
                  >
                    SECURE CAMPUS ACCESS REQUIRED
                  </motion.p>
                </div>
              </div>
              
              <div className="p-10 space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-4 py-5 bg-indigo-600 text-white font-black uppercase tracking-widest text-[13px] rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all"
                >
                  <LogIn size={20} />
                  LOGIN WITH GOOGLE
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAuthModal(false)}
                  className="w-full py-4 text-gray-400 font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl hover:text-gray-600 hover:bg-gray-50 transition-all"
                >
                  DISMISS
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto hidden md:block">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start gap-2">
              <span className="text-xl font-black text-gray-900 tracking-tightest">IIT EXCHANGE</span>
              <p className="text-gray-900 text-xs font-bold tracking-wide uppercase">PRIVATE CAMPUS NETWORK • EST. 2026</p>
            </div>
            <div className="flex space-x-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-600">
              <Link to="/about" className="hover:text-indigo-600 transition-colors">ABOUT</Link>
              <Link to="/terms" className="hover:text-indigo-600 transition-colors">TERMS AND CONDITIONS</Link>
              <Link to="/contact" className="hover:text-indigo-600 transition-colors">CONTACT ADMIN</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
            <span className="text-[10px] font-bold text-black uppercase tracking-widest">
              &copy; {new Date().getFullYear()} IIT EXCHANGE SYSTEM. ALL CAMPUS RIGHTS RESERVED.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
