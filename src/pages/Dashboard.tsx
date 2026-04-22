import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { IndianRupee, Trash2, Tag, Clock, User as UserIcon, Heart, Phone, Edit2, Save, X as CloseIcon, ShieldCheck, Mail, Package } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { cn, isValidPhoneNumber } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

// Snappy spring configuration for a premium feel
const snappySpring = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 1
};

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'listings' | 'wishlist' | 'profile'>('listings');
  const [listingsSubTab, setListingsSubTab] = useState<'active' | 'sold' | 'expired'>('active');
  const [listingToDelete, setListingToDelete] = useState<{id: string, images?: string[]} | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempPhone, setTempPhone] = useState(profile?.phone || '');

  const fetchMyListings = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'products'),
        where('sellerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load listings');
    }
  };

  const fetchWishlist = async () => {
    if (!profile?.wishlist || profile.wishlist.length === 0) {
      setWishlistProducts([]);
      return;
    }
    setWishlistLoading(true);
    try {
      const productsData = [];
      for (const prodId of profile.wishlist) {
        const prodDoc = await getDoc(doc(db, 'products', prodId));
        if (prodDoc.exists()) {
          productsData.push({ id: prodDoc.id, ...prodDoc.data() });
        }
      }
      setWishlistProducts(productsData.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load wishlist items');
    } finally {
      setWishlistLoading(false);
    }
  };

  useEffect(() => {
    if (!user) navigate('/');
    
    const initData = async () => {
      setLoading(true);
      await fetchMyListings();
      if (profile?.wishlist) {
        await fetchWishlist();
      }
      setLoading(false);
    };

    initData();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setTempPhone(profile.phone);
    }
  }, [profile]);

  // Refetch wishlist when switching tabs if needed
  useEffect(() => {
    if (activeTab === 'wishlist' && profile?.wishlist) {
      fetchWishlist();
    }
  }, [activeTab]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'products', id), { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
      fetchMyListings();
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    if (!isValidPhoneNumber(tempPhone)) {
      toast.error('Please enter a valid 10-digit Indian phone number');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        phone: tempPhone.trim()
      });
      await refreshProfile();
      setIsEditingProfile(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(`Failed to update profile: ${error.message}`);
    }
  };

  const handleExtend = async (id: string) => {
    try {
      await updateDoc(doc(db, 'products', id), { 
        expiresAt: Date.now() + 10 * 24 * 60 * 60 * 1000,
        status: 'active'
      });
      toast.success('Listing extended for 10 days!');
      fetchMyListings();
    } catch (error: any) {
      toast.error(`Failed to extend: ${error.message}`);
    }
  };

  const handleDelete = async (id: string, productImages?: string[]) => {
    try {
      if (productImages && productImages.length > 0) {
        const idToken = await user?.getIdToken();
        for (const imageUrl of productImages) {
          try {
            await fetch('/api/images/delete', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
              },
              body: JSON.stringify({ imageUrl })
            });
          } catch (err) {
            console.error("Failed to delete Cloudinary image:", err);
          }
        }
      }
      await deleteDoc(doc(db, 'products', id));
      toast.success('Listing deleted');
      fetchMyListings();
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={snappySpring}
          className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"
        ></motion.div>
      </div>
    );
  }

  const myFilteredProducts = products.filter(p => p.status === listingsSubTab);

  return (
    <div className="max-w-5xl mx-auto py-8 text-gray-900 px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={snappySpring}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12"
      >
        <div>
          <h1 className="text-4xl font-black text-black tracking-tightest uppercase italic">DASHBOARD</h1>
          <p className="text-gray-900 text-[10px] font-bold tracking-widest uppercase mt-1">Student Assets & Trading Profile</p>
        </div>
      </motion.div>

      {/* Main Tabs */}
      <div className="flex space-x-2 p-1.5 bg-gray-100 rounded-2xl mb-10 overflow-x-auto no-scrollbar relative shadow-inner">
        {(['listings', 'wishlist', 'profile'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2 px-6 py-3 font-black text-[11px] uppercase tracking-widest transition-all duration-300 rounded-xl",
              activeTab === tab ? "bg-white text-indigo-700 shadow-xl" : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
            )}
          >
            {tab === 'listings' && <Package size={16} />}
            {tab === 'wishlist' && <Heart size={16} />}
            {tab === 'profile' && <UserIcon size={16} />}
            {tab}
            {tab === 'listings' && ` (${products.length})`}
            {tab === 'wishlist' && ` (${profile?.wishlist?.length || 0})`}
            {activeTab === tab && (
              <motion.div 
                layoutId="dashboardTab"
                className="absolute inset-0 bg-white rounded-xl -z-10"
                transition={snappySpring}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={snappySpring}
          >
            {activeTab === 'listings' && (
              <div className="space-y-8">
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {(['active', 'sold', 'expired'] as const).map(subTab => (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      key={subTab}
                      onClick={() => setListingsSubTab(subTab)}
                      className={cn(
                        "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        listingsSubTab === subTab
                          ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100"
                          : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      {subTab} ({products.filter(p => p.status === subTab).length})
                    </motion.button>
                  ))}
                </div>

                <motion.div 
                  layout
                  className="space-y-4"
                >
                  {myFilteredProducts.length === 0 ? (
                    <motion.div 
                      key={`${listingsSubTab}-empty`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-24 bg-white rounded-[40px] border border-dashed border-gray-200"
                    >
                      <div className="mx-auto w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mb-6">
                        <Clock size={32} className="text-gray-300" />
                      </div>
                      <h3 className="text-xl font-black text-black uppercase tracking-tight">Empty Inventory</h3>
                      <p className="text-gray-600 font-bold text-sm mt-1">No {listingsSubTab} listings found in your listing bank.</p>
                      <Link to="/sell" className="text-indigo-600 text-[11px] font-black uppercase tracking-widest mt-6 inline-block hover:underline">Start Listing Now &rarr;</Link>
                    </motion.div>
                  ) : (
                    myFilteredProducts.map(product => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={product.id} 
                        className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50 transition-all group flex flex-col sm:flex-row gap-6 items-start sm:items-center"
                      >
                        <div className="aspect-square w-full sm:w-28 bg-gray-50 rounded-3xl overflow-hidden shrink-0 border border-gray-100 relative group-hover:scale-105 transition-transform duration-500">
                          {product.images?.length > 0 ? (
                            <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package size={32} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <Link to={`/product/${product.id}`} className="text-xl font-black text-gray-900 hover:text-indigo-600 transition truncate block tracking-tight">
                            {product.title}
                          </Link>
                          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-gray-600 uppercase font-black tracking-widest">
                            <span className="text-indigo-600 flex items-center bg-indigo-50 px-3 py-1 rounded-full">
                              {product.isPriceNegotiable && product.price === 0 ? "DISCUSS" : <><IndianRupee size={12} className="mr-0.5"/> {product.price.toLocaleString()}</>}
                            </span>
                            <span className="flex items-center gap-1.5"><Clock size={12} /> {format(product.createdAt, 'MMM d, yyyy')}</span>
                            {listingsSubTab === 'active' && (
                              <span className="text-amber-500 flex items-center gap-1.5">
                                <Clock size={12} /> {formatDistanceToNow(product.expiresAt, { addSuffix: true }).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <Link 
                            to={`/edit/${product.id}`}
                            className="flex-1 sm:flex-none p-4 bg-gray-50 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all active:scale-90"
                            title="Edit"
                          >
                            <Edit2 size={20} strokeWidth={2.5} />
                          </Link>

                          {listingsSubTab === 'active' && (
                            <button 
                              onClick={() => handleStatusChange(product.id, 'sold')}
                              className="flex-1 sm:flex-none p-4 bg-gray-50 text-green-500 hover:bg-green-50 rounded-2xl transition-all active:scale-90"
                              title="Mark as Sold"
                            >
                              <Tag size={20} strokeWidth={2.5} />
                            </button>
                          )}
                          
                          {listingsSubTab === 'expired' && (
                            <button 
                              onClick={() => handleExtend(product.id)}
                              className="flex-1 sm:flex-none p-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-2xl transition-all active:scale-90"
                              title="Extend Listing"
                            >
                              <Clock size={20} strokeWidth={2.5} />
                            </button>
                          )}

                          <button 
                            onClick={() => setListingToDelete({ id: product.id, images: product.images })}
                            className="flex-1 sm:flex-none p-4 bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-all active:scale-90"
                            title="Delete"
                          >
                            <Trash2 size={20} strokeWidth={2.5} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div className="space-y-6">
                {wishlistLoading ? (
                   <div className="flex justify-center items-center py-24">
                     <motion.div 
                       animate={{ rotate: 360 }}
                       transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                       className="rounded-full h-10 w-10 border-b-2 border-indigo-600"
                     ></motion.div>
                   </div>
                ) : wishlistProducts.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-24 bg-white rounded-[40px] border border-dashed border-gray-200"
                  >
                    <div className="mx-auto w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mb-6">
                      <Heart size={32} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black text-black uppercase tracking-tight">Watchlist Empty</h3>
                    <p className="text-gray-600 font-bold text-sm mt-1">Found nothing interesting yet? Start exploring.</p>
                    <Link to="/" className="text-indigo-600 text-[11px] font-black uppercase tracking-widest mt-6 inline-block hover:underline">Listings &rarr;</Link>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {wishlistProducts.map(product => (
                      <motion.div 
                        whileHover={{ y: -5 }}
                        key={product.id}
                      >
                        <Link 
                          to={`/product/${product.id}`}
                          className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-indigo-100 transition-all group flex flex-col h-full"
                        >
                          <div className="aspect-[5/4] bg-gray-50 relative overflow-hidden">
                            {product.images?.length > 0 ? (
                              <img 
                                src={product.images[0]} 
                                alt={product.title} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Package size={40} />
                              </div>
                            )}
                            <div className="absolute top-4 right-4">
                              <span className={cn(
                                "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg backdrop-blur-md border",
                                product.status === 'active' ? 'bg-green-500/80 border-green-400 text-white' : 'bg-gray-500/80 border-gray-400 text-white'
                              )}>
                                {product.status}
                              </span>
                            </div>
                          </div>
                          <div className="p-8">
                            <h3 className="text-lg font-black text-gray-900 group-hover:text-indigo-600 transition line-clamp-1 italic tracking-tight">{product.title}</h3>
                            <p className="mt-3 text-xl font-black text-indigo-700 flex items-center tracking-tighter">
                              {product.isPriceNegotiable && product.price === 0 ? "DISCUSS" : <><IndianRupee size={18} strokeWidth={3}/> {product.price.toLocaleString()}</>}
                            </p>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="max-w-xl mx-auto">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={snappySpring}
                  className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-indigo-100 overflow-hidden"
                >
                  <div className="bg-indigo-600 p-12 sm:p-16 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-x-24 -translate-y-24 blur-3xl opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-400/30 rounded-full -translate-x-20 translate-y-20 blur-2xl opacity-40"></div>
                    
                    <div className="relative">
                      <motion.div 
                        whileHover={{ rotate: 0, scale: 1.05 }}
                        className="w-24 h-24 sm:w-32 sm:h-32 bg-white/20 backdrop-blur-3xl rounded-[40px] flex items-center justify-center mx-auto mb-8 border-2 border-white/30 rotate-6 shadow-2xl transition-all duration-300"
                      >
                        <UserIcon size={56} strokeWidth={2.5} />
                      </motion.div>
                      <h3 className="text-3xl font-black tracking-tightest mb-2 uppercase italic">{profile?.name}</h3>
                      <p className="text-indigo-100/70 text-sm font-bold tracking-wide">{profile?.email}</p>
                      <div className="mt-8 inline-flex items-center gap-3 bg-white/10 backdrop-blur-3xl px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/20">
                        <ShieldCheck size={16} /> MEMBER ID: #{user?.uid.slice(-6).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="p-10 sm:p-14 space-y-12">
                    <div className="space-y-8">
                      <div className="flex justify-between items-center px-2 border-b border-gray-100 pb-4">
                        <h4 className="text-[11px] font-black text-gray-600 uppercase tracking-widest italic">User Credentials</h4>
                        {!isEditingProfile && (
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsEditingProfile(true)}
                            className="text-indigo-600 hover:text-indigo-700 text-[11px] font-black flex items-center gap-2 uppercase tracking-widest"
                          >
                            <Edit2 size={14} /> EDIT
                          </motion.button>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100 group hover:border-indigo-100 transition-all">
                          <div className="p-4 bg-white text-indigo-600 rounded-2xl shadow-xl border border-gray-100 group-hover:scale-110 transition-transform">
                            <Phone size={24} strokeWidth={2.5} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Phone Line</p>
                            {isEditingProfile ? (
                              <div className="flex gap-2">
                                <input 
                                  type="tel"
                                  value={tempPhone}
                                  onChange={(e) => setTempPhone(e.target.value)}
                                  className="block w-full px-4 py-2 bg-white border border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition text-sm font-black text-black"
                                  placeholder="10-digit primary mobile"
                                  autoFocus
                                />
                                <motion.button 
                                  whileTap={{ scale: 0.9 }}
                                  onClick={handleUpdateProfile}
                                  className="p-3 bg-indigo-600 text-white rounded-xl shadow-xl shadow-indigo-100"
                                >
                                  <Save size={20} />
                                </motion.button>
                                <motion.button 
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    setIsEditingProfile(false);
                                    setTempPhone(profile?.phone || '');
                                  }}
                                  className="p-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50"
                                >
                                  <CloseIcon size={20} />
                                </motion.button>
                              </div>
                            ) : (
                              <p className="text-xl font-black tracking-tight text-black">+91 {profile?.phone}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100 group">
                           <div className="p-4 bg-white text-indigo-600 rounded-2xl shadow-xl border border-gray-100">
                            <Mail size={24} strokeWidth={2.5} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest mb-1">Campus ID</p>
                            <p className="text-md font-black tracking-tight text-gray-900 truncate">{profile?.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                        <Package className="absolute -right-6 -bottom-6 size-24 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                        <p className="text-[11px] font-black uppercase tracking-widest opacity-70 mb-2">Total Listings</p>
                        <p className="text-5xl font-black italic tracking-tighter">{products.length}</p>
                      </div>
                       <div className="bg-white border-2 border-emerald-500/10 p-8 rounded-[40px] text-emerald-600 relative overflow-hidden group">
                        <Tag className="absolute -right-6 -bottom-6 size-24 opacity-5 group-hover:scale-110 transition-transform duration-700" />
                        <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-2 text-emerald-500">Successful Deals</p>
                        <p className="text-5xl font-black italic tracking-tighter text-emerald-600">{products.filter(p => p.status === 'sold').length}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {listingToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setListingToDelete(null)}
              className="absolute inset-0 bg-gray-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={snappySpring}
              className="relative bg-white rounded-[40px] shadow-3xl max-w-md w-full p-12 text-center"
            >
              <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-[32px] bg-red-50 mb-8 border-4 border-white shadow-xl">
                <Trash2 size={40} className="text-red-500" strokeWidth={2.5} />
              </div>
              <h3 className="text-3xl font-black text-black mb-4 uppercase italic tracking-tightest">Archive Listing?</h3>
              <p className="text-gray-600 font-bold text-sm mb-10 leading-relaxed">
                This asset will be permanently removed from the IIT Exchange grid. This action is irreversible.
              </p>
              <div className="flex flex-col gap-4">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    handleDelete(listingToDelete.id, listingToDelete.images);
                    setListingToDelete(null);
                  }}
                  className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[13px] shadow-xl shadow-red-100 hover:bg-red-700 transition"
                >
                  Confirm Deletion
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setListingToDelete(null)}
                  className="w-full py-5 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[13px] hover:text-gray-900 hover:bg-gray-200 transition"
                >
                  Abort Action
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

