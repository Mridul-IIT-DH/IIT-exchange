import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc, getCountFromServer, where, getDocsFromServer, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Package, 
  Users, 
  Trash2, 
  CheckCircle, 
  ExternalLink,
  Search,
  RefreshCw,
  AlertTriangle,
  Edit3,
  Tag,
  Mail,
  Zap,
  IndianRupee,
  Activity,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { cn, toSafeDate } from '../lib/utils';

type Tab = 'listings' | 'users';

import { motion, AnimatePresence } from 'motion/react';

// Snappy spring configuration for a premium feel
const snappySpring = {
  type: 'spring',
  stiffness: 450,
  damping: 30,
  mass: 1
};

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('listings');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [listings, setListings] = useState<any[]>([]);
  const [siteUsers, setSiteUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalUsers: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [listingToDelete, setListingToDelete] = useState<{id: string, images?: string[]} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingVerificationId, setSendingVerificationId] = useState<string | null>(null);
  const [isRunningSentinel, setIsRunningSentinel] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Unauthorized: Admin access only");
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  const formatSafeDate = (date: any, formatStr: string) => {
    try {
      const d = toSafeDate(date);
      return format(d, formatStr);
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const fetchData = async () => {
    setLoading(true);

    try {
      // 1. Fetch Stats (Safe count queries)
      const productsRef = collection(db, 'products');
      const usersRef = collection(db, 'users');

      const getCount = async (q: any, label: string) => {
        try {
          const snap = await getCountFromServer(q);
          return snap.data().count;
        } catch (e) {
          console.warn(`Admin [Stats]: Count failed for ${label}`, e);
          return 0;
        }
      };

      const [totalCount, allProductsSnap, uCount] = await Promise.all([
        getCount(productsRef, 'totalProducts'),
        getDocs(productsRef),
        getCount(usersRef, 'totalUsers')
      ]);

      const allItems = allProductsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const now = new Date();
      const realActiveCount = allItems.filter((p: any) => {
        const createdAt = toSafeDate(p.createdAt);
        const expiresAt = p.expiresAt ? toSafeDate(p.expiresAt) : new Date(createdAt.getTime() + 10 * 24 * 60 * 60 * 1000);
        return p.status === 'active' && expiresAt >= now;
      }).length;

      setStats({
        totalProducts: totalCount,
        activeProducts: realActiveCount,
        totalUsers: uCount
      });

      // 2. Tab Specific Detailed Fetch
      if (activeTab === 'listings') {
        const items = [...allItems];
        items.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));
        setListings(items);
      } 
      
      else if (activeTab === 'users') {
        try {
          const q = query(usersRef);
          const snap = await getDocs(q);
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          items.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
          setSiteUsers(items);
          console.log(`Admin [Data]: Successfully loaded ${snap.docs.length} users`);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'users');
        }
      }

    } catch (criticalError: any) {
      console.error("Admin [Critical]: Unhandled fetch failure", criticalError);
      handleFirestoreError(criticalError, OperationType.LIST, 'admin/collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, activeTab]);

  const handleDeleteListing = async () => {
    if (!listingToDelete) return;
    
    setIsDeleting(true);
    try {
      console.log(`Admin [Delete]: Initiating deletion for listing ${listingToDelete.id}`);
      
      // 1. Delete images from Cloudinary via server (Non-blocking)
      if (listingToDelete.images && listingToDelete.images.length > 0) {
        const idToken = await user?.getIdToken();
        for (const imageUrl of listingToDelete.images) {
          try {
            await fetch('/api/images/delete', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ imageUrl })
            });
          } catch (err) {
            console.warn("Optional: Cloudinary cleanup failed for image:", imageUrl, err);
          }
        }
      }

      // 2. Delete document from Firestore (The main event)
      await deleteDoc(doc(db, 'products', listingToDelete.id));
      
      toast.success("Listing deleted successfully");
      setListingToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error("Admin [Delete]: Critical failure", error);
      toast.error("Delete failed: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkSold = async (id: string) => {
    try {
      await updateDoc(doc(db, 'products', id), { 
        status: 'sold',
        updatedAt: serverTimestamp()
      });
      toast.success("Listing marked as sold");
      fetchData();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  };

  const handleSendVerification = async (id: string) => {
    setSendingVerificationId(id);
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch(`/api/listings/${id}/send-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification trigger failed');
      
      toast.success("Verification email sent to seller");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSendingVerificationId(null);
    }
  };

  const handleTriggerSentinel = async () => {
    if (!window.confirm("Run daily expiration scan now? This will notify all sellers with expiring items.")) return;
    
    setIsRunningSentinel(true);
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch('/api/admin/trigger-sentinel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sentinel trigger failed');
      
      toast.success(`Scan Complete: ${data.results.updated} expired, ${data.results.emailsSent} emails sent.`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsRunningSentinel(false);
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <motion.div 
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="text-google-blue" size={32} />
        </motion.div>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Authenicating Admin Authority...</p>
      </div>
    );
  }

  const filteredListings = listings.filter(l => 
    l.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.sellerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.sellerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = siteUsers.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={snappySpring}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12"
      >
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="p-4 bg-google-blue text-white rounded-[24px] shadow-2xl shadow-blue-200"
          >
            <ShieldCheck size={32} strokeWidth={2.5} />
          </motion.div>
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tightest uppercase italic">Admin Console</h1>
            <p className="text-gray-900 font-black text-[10px] uppercase tracking-[0.2em] italic">Campus Infrastructure Management</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={fetchData}
            className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-gray-900 shadow-xl shadow-gray-200/50 font-black text-xs uppercase tracking-widest hover:border-blue-200 transition-all italic"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} strokeWidth={3} /> Synchronize Data
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTriggerSentinel}
            disabled={isRunningSentinel}
            className="flex items-center gap-3 px-6 py-3 bg-google-blue text-white rounded-2xl shadow-xl shadow-blue-100 font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all italic disabled:opacity-50"
          >
            <Zap size={14} className={isRunningSentinel ? "animate-pulse" : ""} strokeWidth={3} /> Run Sentinel
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {[
          { label: 'Total Listings', val: stats.totalProducts, icon: Package, color: 'text-google-blue', bg: 'bg-blue-50' },
          { label: 'Active Items', val: stats.activeProducts, icon: CheckCircle, color: 'text-google-green', bg: 'bg-green-50' },
          { label: 'Total Users', val: stats.totalUsers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...snappySpring, delay: i * 0.1 }}
            key={i} 
            className="bg-white p-8 rounded-[32px] border border-gray-50 shadow-2xl shadow-gray-100 flex items-center gap-6 group hover:-translate-y-1 transition-all"
          >
            <div className={`p-5 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 shadow-lg`}>
              <stat.icon size={28} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1 italic">{stat.label}</p>
              <p className="text-3xl font-black text-gray-900 tracking-tighter">{stat.val}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-12 gap-10 overflow-x-auto no-scrollbar">
        {(['listings', 'users'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-5 text-[11px] font-black tracking-[0.2em] uppercase transition-all relative ${
              activeTab === tab ? 'text-google-blue italic' : 'text-gray-300 hover:text-gray-500'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div 
                layoutId="adminTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-google-blue rounded-full" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={snappySpring}
          className="bg-white rounded-[40px] border border-gray-50 shadow-2xl shadow-blue-100 overflow-hidden"
        >
          
          {/* Search Header */}
          <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} strokeWidth={3} />
              <input 
                type="text" 
                placeholder={`FILTER ${activeTab.toUpperCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-bold tracking-tight focus:ring-4 focus:ring-google-blue/10 focus:border-blue-200 outline-none transition-all uppercase placeholder:text-gray-300"
              />
            </div>
          </div>

          <div className="overflow-x-auto sm:overflow-visible">
            {loading ? (
              <div className="py-32 text-center">
                <RefreshCw className="animate-spin inline-block text-google-blue/60" size={40} />
              </div>
            ) : activeTab === 'listings' ? (
            <div className="min-w-full">
              {/* Desktop Table */}
              <table className="hidden sm:table w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-600 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Listings</th>
                    <th className="px-6 py-4">Sellers</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredListings.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            {l.images?.[0] && <img src={l.images[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                          </div>
                          <div className="max-w-[200px]">
                            <p className="font-bold text-gray-900 truncate text-sm">{l.title}</p>
                            <p className="text-[10px] text-gray-600 font-mono truncate uppercase">{l.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <p className="text-gray-900">{l.sellerName}</p>
                        <p className="text-xs text-gray-600">{l.sellerEmail}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-google-blue">₹{l.price.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const now = new Date();
                          const createdAt = toSafeDate(l.createdAt);
                          const expiresAt = l.expiresAt ? toSafeDate(l.expiresAt) : new Date(createdAt.getTime() + 10 * 24 * 60 * 60 * 1000);
                          const isExpired = expiresAt < now;

                          return (
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              l.status === 'active' && !isExpired ? 'bg-green-50 text-google-green border border-green-100' : 
                              l.status === 'sold' ? 'bg-red-50 text-google-red border border-red-100' : 
                              (l.status === 'active' && isExpired) || l.status === 'archived' || l.status === 'expired' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-gray-50 text-gray-500 border border-gray-100'
                            }`}>
                              {(l.status === 'active' && isExpired) ? 'EXPIRED' : l.status}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 font-medium">
                        {formatSafeDate(l.createdAt, 'MMM d, h:mm a')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => navigate(`/product/${l.id}`)}
                            className="p-2 bg-blue-50 text-google-blue hover:bg-blue-100 rounded-lg transition-all active:scale-90"
                            title="View Listing"
                          >
                            <ExternalLink size={16} />
                          </button>
                          <button 
                            onClick={() => navigate(`/edit/${l.id}`)}
                            className="p-2 bg-blue-50 text-google-blue hover:bg-blue-100 rounded-lg transition-all active:scale-90 border border-blue-100"
                            title="Edit Listing"
                          >
                            <Edit3 size={16} />
                          </button>
                          {l.status === 'active' && (
                            <>
                              <button 
                                onClick={() => handleSendVerification(l.id)}
                                disabled={sendingVerificationId === l.id}
                                className={cn(
                                  "p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-all active:scale-90 border border-purple-100",
                                  sendingVerificationId === l.id && "animate-pulse"
                                )}
                                title="Send Verification Link"
                              >
                                {sendingVerificationId === l.id ? (
                                  <RefreshCw size={16} className="animate-spin" />
                                ) : (
                                  <Mail size={16} />
                                )}
                              </button>
                              <button 
                                onClick={() => handleMarkSold(l.id)}
                                className="p-2 bg-green-50 text-google-green hover:bg-green-100 rounded-lg transition-all active:scale-90 border border-green-100"
                                title="Mark as Sold"
                              >
                                <Tag size={16} />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => setListingToDelete({ id: l.id, images: l.images })}
                            className="p-2 bg-red-50 text-google-red hover:bg-red-100 rounded-lg transition-all active:scale-90 border border-red-100"
                            title="Delete Listing"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile View */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filteredListings.map(l => (
                  <div key={l.id} className="p-4 space-y-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {l.images?.[0] && <img src={l.images[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-gray-900 text-sm truncate">{l.title}</h4>
                          <span className="text-google-blue font-black text-sm shrink-0">₹{l.price.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-gray-600 font-mono truncate uppercase mt-1">ID: {l.id}</p>
                        <div className="mt-2 flex items-center gap-2">
                           {(() => {
                            const now = new Date();
                            const createdAt = toSafeDate(l.createdAt);
                            const expiresAt = l.expiresAt ? toSafeDate(l.expiresAt) : new Date(createdAt.getTime() + 10 * 24 * 60 * 60 * 1000);
                            const isExpired = expiresAt < now;

                            return (
                              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                                l.status === 'active' && !isExpired ? 'bg-green-50 text-google-green border border-green-100' : 
                                l.status === 'sold' ? 'bg-red-50 text-google-red border border-red-100' : 
                                (l.status === 'active' && isExpired) || l.status === 'archived' || l.status === 'expired' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                'bg-gray-50 text-gray-500 border border-gray-100'
                              }`}>
                                {(l.status === 'active' && isExpired) ? 'EXPIRED' : l.status}
                              </span>
                            );
                          })()}
                          <span className="text-[10px] text-gray-600">{formatSafeDate(l.createdAt, 'MMM d')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-[10px]">
                        <p className="text-gray-900 font-bold">{l.sellerName}</p>
                        <p className="text-gray-600">{l.sellerEmail}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => navigate(`/product/${l.id}`)}
                          className="p-2 bg-gray-50 text-gray-500 rounded-lg"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button 
                          onClick={() => navigate(`/edit/${l.id}`)}
                          className="p-2 bg-gray-50 text-gray-500 rounded-lg"
                        >
                          <Edit3 size={14} />
                        </button>
                        {l.status === 'active' && (
                          <button 
                            onClick={() => handleSendVerification(l.id)}
                            className="p-2 bg-purple-50 text-purple-600 rounded-lg"
                          >
                            <Mail size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => setListingToDelete({ id: l.id, images: l.images })}
                          className="p-2 bg-red-50 text-google-red rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'users' ? (
            <div className="min-w-full">
              {/* Desktop Table */}
              <table className="hidden sm:table w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-600 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4">Total Listings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 shadow-none">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-google-blue flex items-center justify-center font-black text-xs">
                            {u.name?.[0]}
                          </div>
                          <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <p className="text-gray-900">{u.email}</p>
                        <p className="text-xs text-gray-600">{u.phone}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {formatSafeDate(u.createdAt, 'MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-google-blue">
                        {u.listingsCountToday}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile View */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filteredUsers.map(u => (
                  <div key={u.id} className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-8 h-8 rounded-full bg-blue-100 text-google-blue flex items-center justify-center font-black text-xs">
                          {u.name?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                          <p className="text-[10px] text-gray-600 uppercase tracking-widest">Joined {formatSafeDate(u.createdAt, 'MMM yyyy')}</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <p className="text-gray-700">{u.email}</p>
                        <p className="text-gray-600">{u.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-tighter">Total Listings</p>
                        <p className="text-lg font-black text-google-blue">{u.listingsCountToday}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>

    {/* Warning Area */}
      <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 text-google-red">
        <div className="p-3 bg-red-100 rounded-xl"><AlertTriangle size={24} /></div>
        <div>
          <p className="font-black text-sm uppercase tracking-widest">Admin Warning</p>
          <p className="text-xs font-medium opacity-80">Deletion actions are irreversible and will immediately remove data from production storage. Use with absolute caution.</p>
        </div>
      </div>

      <AnimatePresence>
        {listingToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setListingToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={snappySpring}
              className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-10 text-center">
                <div className="mx-auto w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
                  <Trash2 size={32} className="text-google-red" />
                </div>
                <h3 className="text-xl font-black text-black uppercase tracking-tight">Confirm Purge</h3>
                <p className="text-gray-600 font-bold text-sm mt-2">
                  This action is irreversible. All listing data and linked assets will be permanently removed.
                </p>
                <div className="flex flex-col gap-3 mt-10">
                  <button
                    disabled={isDeleting}
                    onClick={handleDeleteListing}
                    className="w-full py-4 bg-google-red text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700 transition disabled:bg-gray-300 disabled:shadow-none"
                  >
                    {isDeleting ? "PURGING..." : "DELETE PERMANENTLY"}
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={() => setListingToDelete(null)}
                    className="w-full py-4 bg-white text-gray-400 font-black uppercase tracking-widest text-xs rounded-2xl hover:text-black transition disabled:opacity-50"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
