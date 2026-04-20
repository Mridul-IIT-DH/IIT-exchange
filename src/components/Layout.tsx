import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, PackagePlus, UserCircle, Menu, X, Code } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const { user, profile, signIn, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
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
              <Link to="/" className="flex items-center gap-2">
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
                  onClick={signIn}
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
                  onClick={() => { setMobileMenuOpen(false); signIn(); }}
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

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
