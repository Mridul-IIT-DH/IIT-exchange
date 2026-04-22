import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { IndianRupee, ShieldAlert, Phone, Mail, ChevronLeft, ChevronRight, Eye, MousePointerClick, ShieldCheck, Heart, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signIn, refreshProfile } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const isInWishlist = profile?.wishlist?.includes(id || '');

  const toggleWishlist = async () => {
    if (!user) {
      toast.error('Please sign in to save to wishlist');
      return;
    }
    setWishlistLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      if (isInWishlist) {
        await updateDoc(userRef, {
          wishlist: arrayRemove(id)
        });
        toast.success('Removed from wishlist');
      } else {
        await updateDoc(userRef, {
          wishlist: arrayUnion(id)
        });
        toast.success('Added to wishlist');
      }
      await refreshProfile();
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}`);
    } finally {
      setWishlistLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    
    const fetchAndViewProduct = async () => {
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
          
          if (user && docSnap.data().sellerId !== user?.uid) {
            updateDoc(docRef, { views: increment(1) }).catch(e => {
              if (e.code !== 'permission-denied') {
                console.error("View increment error:", e);
              }
            });
          }
        }
      } catch (error) {
        handleFirestoreError(error, 'get', `products/${id}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAndViewProduct();
  }, [id, user?.uid]);

  const handleRevealContact = async () => {
    if (!profile) {
      toast.error('You must setup your profile first.');
      return;
    }
    
    setRevealing(true);
    try {
      const docRef = doc(db, 'products', id!);
      await updateDoc(docRef, { contactClicks: increment(1) });
      setContactRevealed(true);
      toast.success('Contact info revealed.');
    } catch (error) {
      handleFirestoreError(error, 'update', `products/${id}`);
    } finally {
      setRevealing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">Product Not Found</h2>
        <p className="text-gray-500 mt-2">The listing might have been removed or expired.</p>
        <Link to="/" className="inline-block mt-6 text-indigo-600 font-medium hover:underline">
          &larr; Back to Home
        </Link>
      </div>
    );
  }

  const isOwner = user?.uid === product.sellerId;
  const canManage = isOwner || isAdmin;

  return (
    <div className="max-w-5xl mx-auto py-6">
      <Link to="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 inline-flex border-b border-transparent hover:border-gray-900 pb-0.5 transition">
        &larr; Back to listings
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 lg:gap-8 pb-32 md:pb-0">
          
          {/* Left: Images */}
          <div className="p-0 sm:p-6 md:pr-0">
            <div className="aspect-square sm:aspect-square bg-gray-100 sm:rounded-xl relative overflow-hidden flex items-center justify-center">
              {product.images?.length > 0 ? (
                <>
                  <img 
                    src={product.images[currentImageIdx]} 
                    alt={product.title} 
                    className="object-cover w-full h-full"
                    referrerPolicy="no-referrer"
                  />
                  {product.images.length > 1 && (
                    <>
                      <button 
                        onClick={() => setCurrentImageIdx(prev => prev === 0 ? product.images.length - 1 : prev - 1)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-md p-2.5 rounded-full shadow-lg text-gray-800 transition md:p-2"
                      >
                        <ChevronLeft size={24} className="md:size-5" />
                      </button>
                      <button 
                        onClick={() => setCurrentImageIdx(prev => prev === product.images.length - 1 ? 0 : prev + 1)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-md p-2.5 rounded-full shadow-lg text-gray-800 transition md:p-2"
                      >
                        <ChevronRight size={24} className="md:size-5" />
                      </button>
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-md px-3 py-2 rounded-full shadow-lg z-10 sm:bottom-4">
                        {product.images.map((_: any, idx: number) => (
                          <button 
                            key={idx} 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCurrentImageIdx(idx);
                            }}
                            className={`w-2 h-2 rounded-full transition-all duration-200 ${idx === currentImageIdx ? 'bg-white scale-125 shadow-sm' : 'bg-white/40'}`}
                            aria-label={`View image ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <span className="text-gray-400">No images provided</span>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="py-6 px-4 sm:px-6 md:pl-0 lg:pr-8 flex flex-col">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                  {product.title}
                </h1>
                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">
                  Listed {formatDistanceToNow(product.createdAt, { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                  className={`p-3 rounded-full border transition hidden sm:flex ${
                    isInWishlist 
                      ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100' 
                      : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                  title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart size={24} fill={isInWishlist ? "currentColor" : "none"} />
                </button>
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                  product.status === 'active' ? 'bg-green-100 text-green-800' :
                  product.status === 'sold' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                }`}>
                  {product.status}
                </span>
              </div>
            </div>

            {/* Product Meta Info */}
            <div className="mt-6 flex flex-wrap gap-3">
              {product.productAge && (
                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 flex-1 sm:flex-none text-center sm:text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Item Age</p>
                  <p className="text-sm font-black text-gray-900">{product.productAge}</p>
                </div>
              )}
              <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex-1 sm:flex-none text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Price</p>
                <div className="flex justify-center sm:justify-start items-baseline gap-1">
                  <IndianRupee size={16} className="text-indigo-600 self-center" />
                  <span className="text-lg font-black text-indigo-700">{product.price.toLocaleString()}</span>
                  {product.isPriceNegotiable && <span className="text-[10px] text-indigo-400 lowercase">(negotiable)</span>}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-8 border-t border-gray-100 pt-6 flex-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed font-medium">
                {product.description}
              </p>
            </div>

            {/* ACTIONS FOR OWNERS/ADMINS (Inline) */}
            {canManage && (
              <div className="mt-8 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><ShieldCheck size={20}/></div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Administrative Tools</p>
                    <p className="text-sm font-medium text-gray-600">{isOwner ? "This is your listing" : "Elevated admin control"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link 
                    to={`/edit/${product.id}`}
                    className="flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
                  >
                    Edit Listing
                  </Link>
                  
                  {product.status === 'active' && (
                     <button 
                       onClick={async () => {
                         try {
                           await updateDoc(doc(db, 'products', id!), { status: 'sold' });
                           setProduct({...product, status: 'sold'});
                           toast.success('Marked as sold');
                         } catch(err: any) {
                           toast.error(`Failed to update: ${err.message}`);
                         }
                       }}
                       className="flex justify-center items-center py-3 px-4 border border-indigo-200 rounded-xl shadow-sm text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition gap-2"
                     >
                       <Tag size={18} />
                       Mark as Sold
                     </button>
                  )}
                  
                  {showDeleteConfirm ? (
                    <div className="sm:col-span-2 bg-red-50 p-4 rounded-xl border border-red-200">
                      <p className="text-sm font-bold text-red-900 mb-3 text-center">Permanently delete this listing?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg text-sm font-bold">Cancel</button>
                        <button 
                          onClick={async () => {
                            try {
                              if (product.images && product.images.length > 0) {
                                const idToken = await user?.getIdToken();
                                for (const imageUrl of product.images) {
                                  try { await fetch('/api/images/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}) }, body: JSON.stringify({ imageUrl }) }); } catch (err) { console.error(err); }
                                }
                              }
                              await deleteDoc(doc(db, 'products', id!));
                              toast.success('Deleted');
                              navigate('/dashboard');
                            } catch(e: any) { toast.error(e.message); }
                          }}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowDeleteConfirm(true)} className="sm:col-span-2 py-3 px-4 border border-red-100 rounded-xl text-sm font-bold text-red-500 bg-red-50/50 hover:bg-red-50 transition">
                      Delete Listing
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Mobile-only Action Bar (Stickyish) */}
            <div className="md:hidden fixed bottom-24 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-hidden flex items-stretch">
                <button
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                  className={cn(
                    "px-6 border-r border-gray-100 flex items-center justify-center transition",
                    isInWishlist ? "text-red-500 bg-red-50/50" : "text-gray-400"
                  )}
                >
                  <Heart size={24} fill={isInWishlist ? "currentColor" : "none"} />
                </button>
                
                {!user ? (
                  <button onClick={() => signIn()} className="flex-1 py-4 text-sm font-black text-white bg-indigo-600 flex items-center justify-center gap-2">
                    Sign in to Contact
                  </button>
                ) : contactRevealed ? (
                  <div className="flex-1 flex overflow-hidden">
                    <a href={`tel:${product.sellerPhone}`} className="flex-1 flex items-center justify-center bg-green-500 text-white gap-2 py-4">
                      <Phone size={18} /> <span className="font-black text-sm">Call</span>
                    </a>
                    <a href={`mailto:${product.sellerEmail}`} className="flex-1 flex items-center justify-center bg-indigo-600 text-white gap-2 py-4">
                      <Mail size={18} /> <span className="font-black text-sm">Mail</span>
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={handleRevealContact}
                    disabled={revealing}
                    className="flex-1 py-4 text-sm font-black text-white bg-indigo-600 flex items-center justify-center gap-2 disabled:bg-indigo-400"
                  >
                    {revealing ? 'Loading...' : 'Reveal Seller Contact'}
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Contact Section */}
            <div className="hidden md:block mt-8 bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Seller Details</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                  {product.sellerName.substring(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{product.sellerName}</p>
                  <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">IIT Dharwad Student</p>
                </div>
              </div>
              
              {!user ? (
                <button onClick={() => signIn()} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition">
                  Sign in to view contact
                </button>
              ) : contactRevealed ? (
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                    <Phone size={18} className="text-indigo-600" />
                    <a href={`tel:${product.sellerPhone}`} className="text-sm font-bold text-gray-900 hover:underline">{product.sellerPhone}</a>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                    <Mail size={18} className="text-indigo-600" />
                    <a href={`mailto:${product.sellerEmail}`} className="text-sm font-bold text-gray-900 hover:underline">{product.sellerEmail}</a>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRevealContact}
                  className="w-full py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition active:translate-y-0"
                >
                  Reveal Contact Information
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
