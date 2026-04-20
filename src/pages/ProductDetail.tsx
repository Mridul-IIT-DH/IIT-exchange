import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { IndianRupee, ShieldAlert, Phone, Mail, ChevronLeft, ChevronRight, Eye, MousePointerClick, ShieldCheck, Heart, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, isAdmin, refreshProfile } = useAuth();
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
      console.error(error);
      toast.error('Failed to update wishlist');
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
        console.error("Error fetching product:", error);
        toast.error("Could not load product details.");
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
      console.error(error);
      toast.error('Failed to reveal contact.');
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 lg:gap-8">
          
          {/* Left: Images */}
          <div className="p-6 md:pr-0">
            <div className="aspect-square bg-gray-100 rounded-xl relative overflow-hidden flex items-center justify-center">
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
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md text-gray-800 transition"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button 
                        onClick={() => setCurrentImageIdx(prev => prev === product.images.length - 1 ? 0 : prev + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md text-gray-800 transition"
                      >
                        <ChevronRight size={20} />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm z-10">
                        {product.images.map((_: any, idx: number) => (
                          <button 
                            key={idx} 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCurrentImageIdx(idx);
                            }}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${idx === currentImageIdx ? 'bg-white scale-110 shadow-md' : 'bg-white/50 hover:bg-white/80'}`}
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
          <div className="py-6 px-6 md:pl-0 lg:pr-8 flex flex-col">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {product.title}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Listed {formatDistanceToNow(product.createdAt, { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                  className={`p-2.5 rounded-full border transition hidden sm:flex ${
                    isInWishlist 
                      ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100' 
                      : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                  title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart size={22} fill={isInWishlist ? "currentColor" : "none"} />
                </button>
                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                  product.status === 'active' ? 'bg-green-100 text-green-800' :
                  product.status === 'sold' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                }`}>
                  {product.status}
                </span>
              </div>
            </div>

            <div className="mt-4 sm:hidden">
               <button
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                  className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border transition ${
                    isInWishlist 
                      ? 'bg-red-50 border-red-200 text-red-500' 
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  <Heart size={18} fill={isInWishlist ? "currentColor" : "none"} />
                  {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                </button>
            </div>

            <div className="mt-6 flex items-end gap-3">
              {product.isPriceNegotiable && product.price === 0 ? (
                <span className="text-3xl font-bold text-gray-900">Discuss Price</span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-indigo-700 flex items-center">
                    <IndianRupee size={28} /> {product.price.toLocaleString()}
                  </span>
                  {product.isPriceNegotiable && (
                    <span className="text-sm text-gray-500 mb-1">(Negotiable)</span>
                  )}
                </>
              )}
            </div>

            {/* Description */}
            <div className="mt-8 border-t border-gray-100 pt-6 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Seller Contact Box */}
            <div className="mt-8 bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Seller Information</h3>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 font-bold rounded-full flex items-center justify-center text-sm">
                  {product.sellerName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{product.sellerName}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">IIT Dharwad Student</p>
                </div>
              </div>

              {!user ? (
                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm flex items-start gap-2 border border-yellow-200">
                  <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                  <p>You must be signed in with your @iitdh.ac.in email to view the seller's contact details safely.</p>
                </div>
              ) : canManage ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                  <p className={`text-sm mb-2 p-3 rounded-lg border ${isAdmin && !isOwner ? 'bg-red-50 text-red-800 border-red-200' : 'bg-blue-50 text-gray-600 border-blue-100'}`}>
                    {isAdmin && !isOwner ? (
                      <span className="flex items-center gap-1 font-bold"><ShieldCheck size={16}/> Admin View: You are overriding this user's listing.</span>
                    ) : (
                        "This is your listing. Here's your contact info:"
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone size={18} className="text-indigo-600" /> {product.sellerPhone}
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail size={18} className="text-indigo-600" /> {product.sellerEmail}
                    </div>
                    <div className="flex gap-4 mt-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Eye size={14}/> {product.views || 0} Views</span>
                      <span className="flex items-center gap-1"><MousePointerClick size={14}/> {product.contactClicks || 0} Contacts</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 mt-2 space-y-3">
                    <Link 
                      to={`/edit/${product.id}`}
                      className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition"
                    >
                      Edit Listing
                    </Link>
                    
                    {showDeleteConfirm ? (
                      <div className="bg-red-50 p-4 rounded-xl border border-red-200 animate-in fade-in slide-in-from-top-2">
                        <h4 className="text-sm font-bold text-red-900 mb-1">Delete this listing?</h4>
                        <p className="text-xs text-red-700 mb-3">This action cannot be undone and will permanently remove images.</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 px-3 py-1.5 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium transition"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                if (product.images && product.images.length > 0) {
                                  const idToken = await user?.getIdToken();
                                  for (const imageUrl of product.images) {
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
                                await deleteDoc(doc(db, 'products', id!));
                                toast.success('Listing permanently deleted');
                                navigate('/dashboard');
                              } catch(error: any) {
                                toast.error(`Failed to delete: ${error.message}`);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition shadow-sm"
                          >
                            Yes, Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full flex justify-center items-center py-2.5 px-4 border border-red-200 rounded-lg shadow-sm text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 focus:outline-none transition"
                      >
                        Delete This Listing
                      </button>
                    )}
                    
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
                         className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none transition gap-2"
                       >
                         <Tag size={18} />
                         Mark as Sold
                       </button>
                    )}
                  </div>
                </div>
              ) : contactRevealed ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3 text-gray-800 font-medium">
                    <Phone size={20} className="text-indigo-600" /> 
                    <a href={`tel:${product.sellerPhone}`} className="hover:underline">{product.sellerPhone}</a>
                  </div>
                  <div className="flex items-center gap-3 text-gray-800 font-medium">
                    <Mail size={20} className="text-indigo-600" /> 
                    <a href={`mailto:${product.sellerEmail}`} className="hover:underline">{product.sellerEmail}</a>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleRevealContact}
                  disabled={revealing}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition disabled:bg-indigo-400"
                >
                  {revealing ? 'Loading...' : 'Reveal Contact Info'}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
