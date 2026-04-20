import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { IndianRupee, Trash2, CheckCircle, Clock, User as UserIcon, Heart, Phone, Edit2, Save, X as CloseIcon } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

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
    if (!tempPhone.trim()) {
      toast.error('Phone number cannot be empty');
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const myFilteredProducts = products.filter(p => p.status === listingsSubTab);

  return (
    <div className="max-w-5xl mx-auto py-8 text-gray-900 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your activity and profile</p>
        </div>
        <Link to="/sell" className="w-full sm:w-auto text-center px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm">
          Sell New Item
        </Link>
      </div>

      {/* Main Tabs */}
      <div className="flex space-x-1 border-b border-gray-200 mb-8 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('listings')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition whitespace-nowrap ${
            activeTab === 'listings'
              ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/30'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          My Listings ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition whitespace-nowrap ${
            activeTab === 'wishlist'
              ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/30'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Wishlist ({profile?.wishlist?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/30'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          My Profile
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'listings' && (
          <div className="space-y-6">
            <div className="flex gap-2">
              {(['active', 'sold', 'expired'] as const).map(subTab => (
                <button
                  key={subTab}
                  onClick={() => setListingsSubTab(subTab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                    listingsSubTab === subTab
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {subTab.toUpperCase()} ({products.filter(p => p.status === subTab).length})
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {myFilteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                  <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <Clock className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">You have no {listingsSubTab} listings.</p>
                  <Link to="/sell" className="text-indigo-600 text-sm font-bold mt-2 inline-block hover:underline">Start selling today &rarr;</Link>
                </div>
              ) : (
                myFilteredProducts.map(product => (
                  <div key={product.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-5 items-start sm:items-center group">
                    <div className="aspect-square w-full sm:w-24 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                      {product.images?.length > 0 ? (
                        <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No Image</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link to={`/product/${product.id}`} className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition truncate block">
                        {product.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 uppercase font-bold tracking-wider">
                        <span className="text-indigo-600 flex items-center">
                          {product.isPriceNegotiable && product.price === 0 ? "Discuss" : <><IndianRupee size={12} className="mr-0.5"/> {product.price}</>}
                        </span>
                        <span>{format(product.createdAt, 'MMM d, yyyy')}</span>
                        {listingsSubTab === 'active' && (
                          <span className="text-orange-500 flex items-center gap-1">
                            <Clock size={12} /> {formatDistanceToNow(product.expiresAt, { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Link 
                        to={`/edit/${product.id}`}
                        className="flex-1 sm:flex-none p-2 bg-white text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </Link>

                      {listingsSubTab === 'active' && (
                        <button 
                          onClick={() => handleStatusChange(product.id, 'sold')}
                          className="flex-1 sm:flex-none p-2 bg-white text-green-600 hover:bg-green-50 border border-green-100 rounded-lg transition"
                          title="Mark as Sold"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      
                      {listingsSubTab === 'expired' && (
                        <button 
                          onClick={() => handleExtend(product.id)}
                          className="flex-1 sm:flex-none p-2 bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded-lg transition"
                          title="Extend Listing"
                        >
                          <Clock size={18} />
                        </button>
                      )}

                      <button 
                        onClick={() => setListingToDelete({ id: product.id, images: product.images })}
                        className="flex-1 sm:flex-none p-2 bg-white text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div className="space-y-4">
            {wishlistLoading ? (
               <div className="flex justify-center items-center py-20">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
               </div>
            ) : wishlistProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Heart className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Your wishlist is empty.</p>
                <Link to="/" className="text-indigo-600 text-sm font-bold mt-2 inline-block hover:underline">Explore items &rarr;</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistProducts.map(product => (
                  <Link 
                    key={product.id} 
                    to={`/product/${product.id}`}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                      {product.images?.length > 0 ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                          product.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                        }`}>
                          {product.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition line-clamp-1">{product.title}</h3>
                      <p className="mt-1 text-sm font-bold text-indigo-700 flex items-center">
                        {product.isPriceNegotiable && product.price === 0 ? "Discuss Price" : <><IndianRupee size={14}/> {product.price.toLocaleString()}</>}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-8 text-white text-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                  <UserIcon size={40} />
                </div>
                <h3 className="text-xl font-bold">{profile?.name}</h3>
                <p className="text-indigo-100 text-sm">{profile?.email}</p>
                <div className="mt-4 inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
                  Member Since {profile ? format(profile.createdAt, 'MMM yyyy') : ''}
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Contact Information</h4>
                    {!isEditingProfile && (
                      <button 
                        onClick={() => setIsEditingProfile(true)}
                        className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Edit2 size={14} /> EDIT
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <Phone size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Phone Number</p>
                      {isEditingProfile ? (
                        <div className="mt-1 flex gap-2">
                          <input 
                            type="tel"
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                            className="block w-full px-3 py-1.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                            placeholder="Enter your phone number"
                            autoFocus
                          />
                          <button 
                            onClick={handleUpdateProfile}
                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            title="Save"
                          >
                            <Save size={18} />
                          </button>
                          <button 
                            onClick={() => {
                              setIsEditingProfile(false);
                              setTempPhone(profile?.phone || '');
                            }}
                            className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition"
                            title="Cancel"
                          >
                            <CloseIcon size={18} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-900 font-bold">{profile?.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Listings</p>
                    <p className="text-2xl font-black text-gray-900">{products.length}</p>
                  </div>
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Items Sold</p>
                    <p className="text-2xl font-black text-green-600">{products.filter(p => p.status === 'sold').length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {listingToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Listing?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone. The listing and all associated images will be permanently removed.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setListingToDelete(null)}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-bold transition shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleDelete(listingToDelete.id, listingToDelete.images);
                  setListingToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-bold transition shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

