import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { IndianRupee, ShieldAlert, Phone, Mail, ChevronLeft, ChevronRight, Eye, MousePointerClick, ShieldCheck, Heart, Tag, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

import { motion, AnimatePresence } from 'motion/react';

// Snappy spring configuration for a premium feel
const snappySpring = {
  type: 'spring',
  stiffness: 450,
  damping: 30,
  mass: 1
};

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
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={snappySpring}
          className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"
        ></motion.div>
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
    <div className="max-w-5xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }} 
        transition={snappySpring}
      >
        <Link to="/" className="text-[10px] font-black text-gray-600 hover:text-indigo-600 uppercase tracking-[0.2em] mb-8 inline-flex items-center gap-2 group transition-all italic">
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" strokeWidth={3} /> Return to Listings
        </Link>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...snappySpring, delay: 0.1 }}
        className="bg-white rounded-[40px] shadow-2xl shadow-indigo-100 border border-gray-100 overflow-hidden mt-8 relative"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 lg:gap-12 pb-32 md:pb-0">
          
          {/* Left: Images */}
          <div className="p-0 sm:p-10 md:pr-0">
            <div className="aspect-square bg-gray-50 sm:rounded-[32px] relative overflow-hidden flex items-center justify-center group shadow-inner">
              <AnimatePresence mode="wait">
                {product.images?.length > 0 ? (
                  <motion.img 
                    key={currentImageIdx}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    src={product.images[currentImageIdx]} 
                    alt={product.title} 
                    className="object-contain w-full h-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-gray-300 font-black uppercase tracking-widest text-xs italic">No Assets Provided</span>
                )}
              </AnimatePresence>

              {product.images?.length > 1 && (
                <>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCurrentImageIdx(prev => prev === 0 ? product.images.length - 1 : prev - 1)}
                    className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-xl p-3 rounded-2xl shadow-2xl text-indigo-600 border border-indigo-50 transition-all active:scale-90"
                  >
                    <ChevronLeft size={24} strokeWidth={3} />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCurrentImageIdx(prev => prev === product.images.length - 1 ? 0 : prev + 1)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-xl p-3 rounded-2xl shadow-2xl text-indigo-600 border border-indigo-50 transition-all active:scale-90"
                  >
                    <ChevronRight size={24} strokeWidth={3} />
                  </motion.button>
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 bg-gray-950/20 backdrop-blur-md px-4 py-3 rounded-full shadow-2xl z-10">
                    {product.images.map((_: any, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentImageIdx(idx);
                        }}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIdx ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'}`}
                        aria-label={`View image ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="py-10 px-8 lg:pr-12 flex flex-col">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-black text-black tracking-tightest leading-none uppercase italic">
                  {product.title}
                </h1>
                <p className="text-[10px] font-black text-black mt-4 uppercase tracking-[0.2em] italic">
                  Listed {formatDistanceToNow(product.createdAt, { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                  className={cn(
                    "p-2 rounded-full flex items-center justify-center transition border",
                    isInWishlist ? "text-red-500 bg-red-50 border-red-100" : "text-gray-400 bg-white border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <Heart size={20} fill={isInWishlist ? "currentColor" : "none"} />
                </button>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center"
                >
                  <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full italic border ${
                    product.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' :
                    product.status === 'sold' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'
                  }`}>
                    {product.status}
                  </span>
                </motion.div>
              </div>
            </div>

            {/* Product Meta Info */}
            <div className="mt-10 flex flex-wrap gap-4">
              {product.productAge && (
                <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100 flex-1 min-w-[140px]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-black mb-2 italic">Product Age</p>
                  <p className="text-sm font-black text-gray-900 italic">{product.productAge.toUpperCase()}</p>
                </div>
              )}
              <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100 flex-1 min-w-[140px]">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-700 mb-2 italic">Campus Value</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <IndianRupee size={16} className="text-indigo-600 self-center" strokeWidth={3} />
                    <span className="text-2xl font-black text-indigo-700 tracking-tighter italic">{product.price.toLocaleString()}</span>
                  </div>
                  {product.isPriceNegotiable && (
                    <span className="bg-indigo-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">Negotiable</span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-10 border-t border-gray-50 pt-8 flex-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-black mb-6 italic">Description</h3>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed font-bold text-sm tracking-tight">
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

            {/* Contact Section */}
            <div className="mt-8 bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <h3 className="text-xs font-black uppercase tracking-widest text-black mb-6">Seller Details</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                  {product.sellerName.substring(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-black">{product.sellerName}</p>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">IIT Dharwad Student</p>
                </div>
              </div>
              
              {!user ? (
                <button onClick={() => signIn()} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition">
                  Sign in to view contact
                </button>
              ) : contactRevealed ? (
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Phone size={18} className="text-indigo-600 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] uppercase tracking-widest text-gray-400 font-black mb-0.5">Phone Number</span>
                        <a href={`tel:${product.sellerPhone}`} className="text-xs sm:text-sm font-bold text-gray-900 hover:underline truncate">{product.sellerPhone}</a>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(product.sellerPhone);
                        toast.success('Phone copied to clipboard');
                      }}
                      className="text-gray-400 hover:text-indigo-600 p-1 shrink-0 transition"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Mail size={18} className="text-indigo-600 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] uppercase tracking-widest text-gray-400 font-black mb-0.5">Email</span>
                        <a href={`mailto:${product.sellerEmail}`} className="text-xs sm:text-sm font-bold text-gray-900 hover:underline truncate">{product.sellerEmail}</a>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(product.sellerEmail);
                        toast.success('Email copied to clipboard');
                      }}
                      className="text-gray-400 hover:text-indigo-600 p-1 shrink-0 transition"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRevealContact}
                  disabled={revealing}
                  className="w-full py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition active:translate-y-0 disabled:bg-indigo-400 disabled:transform-none"
                >
                  {revealing ? 'Loading...' : 'Reveal Contact Information'}
                </button>
              )}
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
