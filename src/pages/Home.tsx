import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, limit, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { PackageSearch, IndianRupee, Search, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

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
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative bg-indigo-700 rounded-2xl overflow-hidden shadow-lg">
        <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/college/1920/1080')] bg-cover bg-center"></div>
        <div className="relative p-12 lg:px-20 lg:py-24 text-center sm:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            IIT Exchange Marketplace
          </h1>
          <p className="text-xl text-indigo-100 max-w-2xl mb-8">
            The exclusive platform for IIT Dharwad students to buy and sell used books, electronics, cycles, and more securely.
          </p>
          <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
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
              className="px-8 py-3 bg-white text-indigo-700 font-bold rounded-lg shadow hover:bg-gray-50 transition"
            >
              Start Selling
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-gray-200 pb-4 gap-4 mt-8">
          <h2 className="text-2xl font-bold text-gray-900">Recent Listings</h2>
          
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-xl shadow-sm border border-gray-100 h-72"></div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
            <PackageSearch size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No active products found</h3>
            <p className="text-gray-500 mt-1">
              {searchQuery ? `No listings match "${searchQuery}"` : "Be the first to list an item on the exchange!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Link 
                to={`/product/${product.id}`} 
                key={product.id}
                className="group relative bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-200 overflow-hidden transition duration-200 flex flex-col"
              >
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.title} 
                      className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-gray-400">
                      No Image
                    </div>
                  )}
                  {/* Tags */}
                  <div className="absolute top-2 left-2 flex gap-1 z-10">
                    {Date.now() - product.createdAt < 24 * 60 * 60 * 1000 && (
                      <span className="bg-green-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm">New</span>
                    )}
                  </div>

                  {/* Wishlist Toggle */}
                  <button
                    onClick={(e) => toggleWishlist(e, product.id)}
                    disabled={wishlistLoadingId === product.id}
                    className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md transition-all z-10 shadow-sm ${
                      profile?.wishlist?.includes(product.id)
                        ? 'bg-red-500 text-white'
                        : 'bg-black/20 text-white hover:bg-black/40'
                    }`}
                  >
                    <Heart size={16} fill={profile?.wishlist?.includes(product.id) ? "currentColor" : "none"} />
                  </button>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-lg font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition">
                    {product.title}
                  </h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    {product.isPriceNegotiable && product.price === 0 ? (
                      <span className="text-lg font-bold text-gray-900">Discuss Price</span>
                    ) : (
                      <>
                        <span className="text-xl font-bold text-gray-900 flex items-center">
                          <IndianRupee size={18} /> {product.price.toLocaleString()}
                        </span>
                        {product.isPriceNegotiable && (
                           <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Negotiable</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="mt-auto pt-4 flex justify-between items-center text-xs text-gray-500">
                    <span className="line-clamp-1">{product.sellerName}</span>
                    <span>{formatDistanceToNow(product.createdAt, { addSuffix: true })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
