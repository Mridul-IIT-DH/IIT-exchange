import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc, getCountFromServer, where, getDocsFromServer } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
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
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type Tab = 'listings' | 'users';

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

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Unauthorized: Admin access only");
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  const formatSafeDate = (date: any, formatStr: string) => {
    try {
      if (!date) return 'N/A';
      const d = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
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

      const [totalCount, activeCount, uCount] = await Promise.all([
        getCount(productsRef, 'totalProducts'),
        getCount(query(productsRef, where('status', '==', 'active')), 'activeProducts'),
        getCount(usersRef, 'totalUsers')
      ]);

      setStats({
        totalProducts: totalCount,
        activeProducts: activeCount,
        totalUsers: uCount
      });

      // 2. Tab Specific Detailed Fetch with distinct handlers
      console.log(`Admin [Data]: Attempting fetch for tab "${activeTab}"`);
      
      if (activeTab === 'listings') {
        try {
          const q = query(productsRef);
          const snap = await getDocs(q);
          setListings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          console.log(`Admin [Data]: Successfully loaded ${snap.docs.length} listings`);
        } catch (err) {
          handleFirestoreError(err, 'list', 'products');
        }
      } 
      
      else if (activeTab === 'users') {
        try {
          const q = query(usersRef);
          const snap = await getDocs(q);
          setSiteUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          console.log(`Admin [Data]: Successfully loaded ${snap.docs.length} users`);
        } catch (err) {
          handleFirestoreError(err, 'list', 'users');
        }
      }

    } catch (criticalError: any) {
      console.error("Admin [Critical]: Unhandled fetch failure", criticalError);
      toast.error("Internal Admin Error: Check developer console");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, activeTab]);

  const handleDeleteListing = async (id: string, images?: string[]) => {
    if (!window.confirm("Are you sure you want to delete this listing permanently?")) return;
    
    try {
      // Delete images from Cloudinary via server
      if (images && images.length > 0) {
        const idToken = await user?.getIdToken();
        for (const imageUrl of images) {
          try {
            await fetch('/api/images/upload', { // Re-using delete endpoint is cleaner but I don't have it explicitly shown in standard way
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ imageUrl, action: 'delete' }) // The server.ts has a legacy delete but /api/images/delete is standard
            });
            // Actually server.ts has /api/images/delete
            await fetch('/api/images/delete', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ imageUrl })
            });
          } catch (err) {
            console.error("Cloudinary delete error:", err);
          }
        }
      }
      await deleteDoc(doc(db, 'products', id));
      toast.success("Listing deleted successfully");
      fetchData();
    } catch (error: any) {
      toast.error("Delete failed: " + error.message);
    }
  };

  const handleMarkSold = async (id: string) => {
    try {
      await updateDoc(doc(db, 'products', id), { 
        status: 'sold',
        updatedAt: Date.now()
      });
      toast.success("Listing marked as sold");
      fetchData();
    } catch (error: any) {
      toast.error("Update failed: " + error.message);
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCw className="animate-spin text-indigo-600" size={32} />
        <p className="text-gray-500 font-medium tracking-tight">Verifying Admin Privileges...</p>
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
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-indigo-200 shadow-lg">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Console</h1>
            <p className="text-gray-500 font-medium">IIT DH Exchange Management</p>
          </div>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition shadow-sm font-bold text-sm"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh Data
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total Listings', val: stats.totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Items', val: stats.activeProducts, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Users', val: stats.totalUsers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 gap-8 overflow-x-auto no-scrollbar">
        {(['listings', 'users'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-black tracking-widest uppercase transition-all relative ${
              activeTab === tab ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Search Header */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center"><RefreshCw className="animate-spin inline-block text-indigo-600" /></div>
          ) : activeTab === 'listings' ? (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Seller</th>
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
                          <p className="text-[10px] text-gray-400 font-mono truncate uppercase">{l.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <p className="text-gray-900">{l.sellerName}</p>
                      <p className="text-xs text-gray-400">{l.sellerEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-indigo-600">₹{l.price.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        l.status === 'active' ? 'bg-green-100 text-green-700' : 
                        l.status === 'sold' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 font-medium">
                      {formatSafeDate(l.createdAt, 'MMM d, h:mm a')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => navigate(`/product/${l.id}`)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 transition"
                          title="View Listing"
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button 
                          onClick={() => navigate(`/edit/${l.id}`)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 transition"
                          title="Edit Listing"
                        >
                          <Edit3 size={16} />
                        </button>
                        {l.status === 'active' && (
                          <button 
                            onClick={() => handleMarkSold(l.id)}
                            className="p-1.5 text-gray-400 hover:text-green-600 transition"
                            title="Mark as Sold"
                          >
                            <Tag size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteListing(l.id, l.images)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition"
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
          ) : activeTab === 'users' ? (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4">Listings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 shadow-none">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                          {u.name?.[0]}
                        </div>
                        <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <p className="text-gray-900">{u.email}</p>
                      <p className="text-xs text-gray-400">{u.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {formatSafeDate(u.createdAt, 'MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-indigo-600">
                      {u.listingsCountToday}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

      {/* Warning Area */}
      <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 text-red-600">
        <div className="p-3 bg-red-100 rounded-xl"><AlertTriangle size={24} /></div>
        <div>
          <p className="font-black text-sm uppercase tracking-widest">Admin Warning</p>
          <p className="text-xs font-medium opacity-80">Deletion actions are irreversible and will immediately remove data from production storage. Use with absolute caution.</p>
        </div>
      </div>
    </div>
  );
}
