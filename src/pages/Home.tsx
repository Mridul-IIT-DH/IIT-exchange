import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, limit, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { PackageSearch, IndianRupee, Search, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

// Snappy spring configuration for a premium feel
const snappySpring = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 1
};

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, profile, signIn, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [wishlistLoadingId, setWishlistLoadingId] = useState<string | null>(null);

  const toggleWishlist = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please sign in to save to wishlist');
      return;
    }

    setWishlistLoadingId(productId);
    try {
      const userRef = doc(db, 'users', user.uid);
      const isInWishlist = profile?.wishlist?.includes(productId);

      if (isInWishlist) {
        await updateDoc(userRef, {
          wishlist: arrayRemove(productId)
        });
        toast.success('Removed from wishlist');
      } else {
        await updateDoc(userRef, {
          wishlist: arrayUnion(productId)
        });
        toast.success('Added to wishlist');
      }
      await refreshProfile();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update wishlist');
    } finally {
      setWishlistLoadingId(null);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(
          collection(db, 'products'),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(200) // Increased limit to allow reasonable client-side filtering
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 sm:space-y-12">
      {/* Minimalist Premium Hero Section */}
      <section className="pt-4 pb-12 sm:pt-8 sm:pb-20 relative overflow-hidden">
        {/* Subtle Background Accent */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-green-50 rounded-full blur-3xl opacity-40 pointer-events-none"></div>

        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={snappySpring}
          >
            <span className="inline-block text-[10px] font-black tracking-[0.3em] uppercase text-google-blue mb-6 px-4 py-1.5 bg-blue-50 rounded-full">
              IIT Dharwad Marketplace
            </span>
            <h1 className="text-6xl md:text-8xl font-black text-black tracking-tightest leading-[0.85] uppercase italic mb-8">
              IIT <span className="text-black non-italic font-light">Exchange</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 font-medium leading-tight mb-12 max-w-xl">
              The official trading network. <span className="text-black">Secure, fast, and exclusively for campus.</span>
            </p>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => {
                  if (!user) {
                    signIn();
                  } else if (!profile) {
                    navigate('/setup-profile');
                  } else {
                    navigate('/sell');
                  }
                }} 
                className="px-10 py-5 bg-black text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] hover:bg-gray-900 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Start Listing
              </button>
              
              {!user && (
                <button 
                  onClick={() => signIn()}
                  className="px-10 py-5 bg-white border-2 border-google-blue text-google-blue font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-blue-50 transition-all"
                >
                  Join Network
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <div>
        <div className="flex flex-col mb-12">
          <div className="flex items-center gap-3 w-full">
            <div className="flex flex-col">
              <h2 className="text-4xl font-black text-black tracking-tightest uppercase italic">Listings</h2>
              <div className="w-12 h-1.5 bg-google-yellow rounded-full mt-1"></div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-start mb-12">
          <div className="relative w-full sm:w-[450px]">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text"
              placeholder="SEARCH THE CAMPUS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-14 pr-8 py-5 bg-white border border-gray-200 rounded-3xl shadow-2xl shadow-blue-900/[0.08] focus:ring-4 focus:ring-google-blue/10 focus:border-google-blue outline-none transition-all font-black text-xs tracking-widest uppercase placeholder:text-gray-400"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-2xl border border-gray-200 h-80"></div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 bg-white rounded-3xl border border-gray-200 border-dashed"
          >
            <PackageSearch size={64} className="mx-auto text-gray-300 mb-6" />
            <h3 className="text-2xl font-black text-black uppercase tracking-tight">No listings Available</h3>
            <p className="text-gray-600 mt-2 font-bold max-w-sm mx-auto">
              {searchQuery ? `"${searchQuery}" didn't return any matches. Try a different term or clear filters.` : "The market is quiet. Be the first to start a trade!"}
            </p>
          </motion.div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08,
                  delayChildren: 0.1
                }
              }
            }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-8"
          >
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                variants={{
                  hidden: { opacity: 0, y: 40, scale: 0.9 },
                  show: { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: snappySpring
                  }
                }}
              >
                <Link 
                  to={`/product/${product.id}`} 
                  className="group relative bg-white rounded-[32px] shadow-sm hover:shadow-2xl hover:shadow-blue-100 border border-gray-100 overflow-hidden transition-all duration-300 flex flex-col h-full hover:-translate-y-2 active:scale-95"
                >
                  <div className="aspect-[4/5] bg-gray-50 relative overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <motion.img 
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                        src={product.images[0]} 
                        alt={product.title} 
                        className="object-contain w-full h-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-gray-200">
                        <PackageSearch size={32} />
                      </div>
                    )}
                    
                    {/* Status Tags */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                      {Date.now() - product.createdAt < 24 * 60 * 60 * 1000 && (
                        <motion.span 
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="bg-google-blue text-white text-[9px] uppercase font-black px-4 py-2 rounded-full shadow-2xl tracking-widest border border-white/30"
                        >
                          NEW
                        </motion.span>
                      )}
                    </div>

                    {/* Wishlist Toggle */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => toggleWishlist(e, product.id)}
                      disabled={wishlistLoadingId === product.id}
                      className={cn(
                        "absolute top-3 right-3 p-3 rounded-2xl backdrop-blur-xl border transition-all z-10 shadow-lg",
                        profile?.wishlist?.includes(product.id)
                          ? "bg-google-red border-transparent text-white"
                          : "bg-white/40 border-white/40 text-gray-900"
                      )}
                    >
                      <Heart 
                        size={18} 
                        strokeWidth={2.5}
                        fill={profile?.wishlist?.includes(product.id) ? "currentColor" : "none"} 
                      />
                    </motion.button>
</div>
                  <div className="p-3 sm:p-4 flex-1 flex flex-col">
                    <h3 className="text-sm sm:text-lg font-bold text-black line-clamp-1 group-hover:text-google-blue transition">
                      {product.title}
                    </h3>
                    <div className="mt-1 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                      {product.isPriceNegotiable && product.price === 0 ? (
                        <span className="text-sm sm:text-lg font-bold text-google-blue">Discuss Price</span>
                      ) : (
                        <>
                          <span className="text-base sm:text-xl font-black text-google-blue flex items-center">
                            <IndianRupee size={14} className="sm:size-[18px]" /> {product.price.toLocaleString()}
                          </span>
                          {product.isPriceNegotiable && (
                             <span className="text-[8px] sm:text-[9px] uppercase font-black text-white bg-google-green px-2.5 sm:px-3 py-1 rounded-full w-fit shadow-lg shadow-green-100 border border-white/20 tracking-widest">
                                Negotiable
                             </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="mt-auto pt-3 sm:pt-4 flex justify-between items-center text-[10px] sm:text-xs text-gray-600 font-medium">
                      <span className="line-clamp-1 max-w-[60%]">{product.sellerName}</span>
                      <span className="shrink-0">{formatDistanceToNow(product.createdAt, { addSuffix: true }).replace('about ', '')}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
