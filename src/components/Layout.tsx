import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, PackagePlus, UserCircle, Menu, X, Code, ShieldCheck, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'motion/react';

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
      // Minor hack to trigger refresh-like behavior without full reload if needed, 
      // but usually scroll to top is what users expect.
      // If user strictly wants refresh:
      // window.location.reload(); 
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" onClick={handleHomeClick} className="flex items-center gap-2">
                <div className="bg-indigo-600 text-white p-2 rounded-lg">
                  <Code size={24} />
                </div>
                <span className="text-xl font-bold font-sans text-gray-900 tracking-tight">IIT Exchange</span>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              {user && profile ? (
                <>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-md font-medium transition",
                        location.pathname === '/admin' 
                          ? "text-indigo-700 bg-indigo-50" 
                          : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      )}
                    >
                      <ShieldCheck size={18} />
                      Admin Panel
                    </Link>
                  )}
                  <Link
                    to="/sell"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition"
                  >
                    <PackagePlus size={18} />
                    Sell
                  </Link>
                  <Link
                    to="/dashboard"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md font-medium transition",
                      location.pathname === '/dashboard' 
                        ? "text-indigo-700 bg-indigo-50" 
                        : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                    )}
                  >
                    <LayoutDashboard size={18} />
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md font-medium transition"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition shadow-sm"
                >
                  <UserCircle size={20} />
                  Login with IIT Email
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="pt-2 pb-3 space-y-1 px-4">
              {user && profile ? (
                <>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "block px-3 py-2 text-base font-medium rounded-md flex items-center gap-2 mb-1",
                        location.pathname === '/admin'
                          ? "text-indigo-700 bg-indigo-50"
                          : "text-amber-600 bg-amber-50/50"
                      )}
                    >
                      <ShieldCheck size={18} /> Admin Console
                    </Link>
                  )}
                  <Link
                    to="/sell"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-gray-900 bg-gray-50 rounded-md flex items-center gap-2"
                  >
                    <PackagePlus size={18} /> Sell Item
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "block px-3 py-2 text-base font-medium rounded-md flex items-center gap-2",
                      location.pathname === '/dashboard'
                        ? "text-indigo-700 bg-indigo-50"
                        : "text-gray-700 hover:bg-gray-50 bg-transparent"
                    )}
                  >
                    <LayoutDashboard size={18} /> Dashboard
                  </Link>
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2"
                  >
                    <LogOut size={18} /> Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogin(); }}
                  className="w-full text-left px-3 py-2 text-base font-medium text-indigo-600 bg-indigo-50 rounded-md flex items-center gap-2"
                >
                  <UserCircle size={18} /> Login (@iitdh.ac.in)
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className={cn(
        "flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8",
        "pb-28 md:pb-8" // Add extra bottom padding for mobile to account for bottom nav
      )}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation (Floating) */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-40">
        <div className="bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.12)] p-2 flex justify-around items-center">
          <button 
            onClick={(e) => {
              if (location.pathname === '/') {
                handleHomeClick(e);
              } else {
                navigate('/');
              }
            }}
            className={cn(
              "p-3 rounded-xl transition-all duration-300",
              location.pathname === '/' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110" : "text-gray-400 hover:bg-gray-100"
            )}
          >
            <Code size={22} />
          </button>
          
          <button 
            onClick={() => protectedNavigate('/sell')}
            className={cn(
              "p-3 rounded-xl transition-all duration-300",
              location.pathname === '/sell' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110" : "text-gray-400 hover:bg-gray-100"
            )}
          >
            <PackagePlus size={22} />
          </button>

          <button 
            onClick={() => protectedNavigate('/dashboard')}
            className={cn(
              "p-3 rounded-xl transition-all duration-300",
              location.pathname === '/dashboard' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110" : "text-gray-400 hover:bg-gray-100"
            )}
          >
            <LayoutDashboard size={22} />
          </button>

          {isAdmin && (
            <button 
              onClick={() => navigate('/admin')}
              className={cn(
                "p-3 rounded-xl transition-all duration-300",
                location.pathname === '/admin' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110" : "text-gray-400 hover:bg-gray-100"
              )}
            >
              <ShieldCheck size={22} />
            </button>
          )}

          {!user && (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <UserCircle size={22} />
            </button>
          )}
        </div>
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
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-indigo-600 p-10 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-8 -translate-y-8 blur-2xl"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/10">
                    <LogIn size={32} />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight mb-2">Login Required</h3>
                  <p className="text-indigo-100/80 text-sm font-medium">Please sign in with your IIT email to access this feature.</p>
                </div>
              </div>
              
              <div className="p-8 space-y-3">
                <button
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95"
                >
                  <LogIn size={18} />
                  Login with Google
                </button>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="w-full py-4 bg-gray-100 text-gray-500 font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-gray-200 transition active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} IIT Exchange. Private marketplace for IIT Dharwad.
            </span>
            <div className="flex space-x-6 text-sm text-gray-500">
              <Link to="/about" className="hover:text-indigo-600 transition">About</Link>
              <Link to="/terms" className="hover:text-indigo-600 transition">Terms and Conditions</Link>
              <Link to="/contact" className="hover:text-indigo-600 transition">Contact Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
