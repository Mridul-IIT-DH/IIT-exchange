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
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={snappySpring}
        className="relative bg-indigo-700 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-100"
      >
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.25 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 bg-[url('https://picsum.photos/seed/college/1920/1080')] bg-cover bg-center"
        ></motion.div>
        <div className="relative p-8 sm:p-16 lg:px-24 lg:py-28 text-center sm:text-left">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...snappySpring, delay: 0.2 }}
            className="text-4xl md:text-6xl font-black text-white tracking-tightest mb-6"
          >
            IIT EXCHANGE
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...snappySpring, delay: 0.3 }}
            className="text-lg md:text-xl text-indigo-100 max-w-2xl mb-8 sm:mb-10 font-medium leading-relaxed"
          >
            The official campus-wide trading network for IIT Dharwad. Secure, fast, and exclusively for students.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...snappySpring, delay: 0.4 }}
            className="flex flex-wrap gap-4 justify-center sm:justify-start"
          >
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
              className="px-10 py-4 bg-white text-indigo-700 font-black uppercase tracking-widest text-xs rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              Start Listing
            </button>
          </motion.div>
        </div>
      </motion.div>

      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-gray-200 pb-6 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-10 bg-indigo-600 rounded-full"></div>
            <div>
              <h2 className="text-3xl font-black text-black tracking-tightest uppercase italic">Listings</h2>
            </div>
          </div>
          
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-600" />
            </div>
            <input 
              type="text"
              placeholder="SEARCH LISTINGS, CATEGORIES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-sm tracking-wide placeholder:text-gray-400"
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
                  className="group relative bg-white rounded-[32px] shadow-sm hover:shadow-2xl hover:shadow-indigo-100 border border-gray-200 overflow-hidden transition-all duration-300 flex flex-col h-full hover:-translate-y-2 active:scale-95"
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
                      <div className="flex items-center justify-center w-full h-full text-gray-300">
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
                          className="bg-indigo-600 text-white text-[9px] uppercase font-black px-3 py-1.5 rounded-full shadow-xl backdrop-blur-md tracking-widest border border-white/20"
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
                          ? "bg-red-500 border-red-400 text-white"
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
                    <h3 className="text-sm sm:text-lg font-bold text-black line-clamp-1 group-hover:text-indigo-600 transition">
                      {product.title}
                    </h3>
                    <div className="mt-1 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                      {product.isPriceNegotiable && product.price === 0 ? (
                        <span className="text-sm sm:text-lg font-bold text-black">Discuss Price</span>
                      ) : (
                        <>
                          <span className="text-base sm:text-xl font-black text-black flex items-center">
                            <IndianRupee size={14} className="sm:size-[18px]" /> {product.price.toLocaleString()}
                          </span>
                          {product.isPriceNegotiable && (
                             <span className="text-[8px] sm:text-[10px] uppercase font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 sm:px-2 py-0.5 rounded-full w-fit">
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
