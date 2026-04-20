import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { IndianRupee, Trash2, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'sold' | 'expired'>('active');
  const [listingToDelete, setListingToDelete] = useState<{id: string, images?: string[]} | null>(null);

  const fetchMyListings = async () => {
    if (!user) return;
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) navigate('/');
    fetchMyListings();
  }, [user]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'products', id), { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
      fetchMyListings();
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
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
    // Note: window.confirm is blocked by security settings inside iframes
    try {
      // 1. Delete image files from Cloudinary via our secure backend
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

      // 2. Delete the Firestore document
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

  const filteredProducts = products.filter(p => p.status === activeTab);

  return (
    <div className="max-w-5xl mx-auto py-8 text-gray-900">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Listings</h1>
        <Link to="/sell" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
          Sell New Item
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-200 mb-6">
        {(['active', 'sold', 'expired'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium text-sm transition ${
              activeTab === tab
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-2 text-xs py-0.5 px-2 bg-gray-100 rounded-full text-gray-600">
              {products.filter(p => p.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">You have no {activeTab} listings.</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              
              <div className="aspect-[4/3] w-full sm:w-32 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                {product.images?.length > 0 ? (
                  <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                )}
              </div>

              <div className="flex-1">
                <Link to={`/product/${product.id}`} className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition truncate block">
                  {product.title}
                </Link>
                <div className="mt-1 flex gap-4 text-sm text-gray-500">
                  <span className="font-semibold text-gray-900 flex items-center">
                    {product.isPriceNegotiable && product.price === 0 ? "Discuss" : <><IndianRupee size={14}/> {product.price}</>}
                  </span>
                  <span>Listed: {format(product.createdAt, 'MMM d, yyyy')}</span>
                  {activeTab === 'active' && (
                    <span className="text-yellow-600 flex items-center gap-1">
                      <Clock size={14} /> Expires {formatDistanceToNow(product.expiresAt, { addSuffix: true })}
                    </span>
                  )}
                </div>
                
                <div className="mt-3 flex items-center gap-4 text-xs font-medium text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded-md">{product.views || 0} Views</span>
                  <span className="bg-gray-100 px-2 py-1 rounded-md">{product.contactClicks || 0} Contacts Revealed</span>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                <Link 
                  to={`/edit/${product.id}`}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 text-sm font-medium rounded-lg transition"
                >
                  Edit
                </Link>

                {activeTab === 'active' && (
                  <button 
                    onClick={() => handleStatusChange(product.id, 'sold')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-sm font-medium rounded-lg transition"
                  >
                    <CheckCircle size={16} /> Mark Sold
                  </button>
                )}
                
                {activeTab === 'expired' && (
                  <button 
                    onClick={() => handleExtend(product.id)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-sm font-medium rounded-lg transition"
                  >
                    <Clock size={16} /> Extend 10 Days
                  </button>
                )}

                <button 
                  onClick={() => setListingToDelete({ id: product.id, images: product.images })}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))
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
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleDelete(listingToDelete.id, listingToDelete.images);
                  setListingToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition shadow-sm"
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
