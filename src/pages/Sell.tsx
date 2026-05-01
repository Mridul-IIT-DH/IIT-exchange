import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, setDoc, updateDoc, increment, getDoc, collection, query, where, getCountFromServer, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { IndianRupee, ImagePlus, X, AlertCircle, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { toSafeDate } from '../lib/utils';

import { motion, AnimatePresence } from 'motion/react';

const PRODUCT_AGE_OPTIONS = [
  "Brand New (Unused / Sealed)",
  "Less than 1 month",
  "1 to 6 months",
  "6 to 12 months",
  "1 to 2 years",
  "More than 2 years"
];

// Snappy spring configuration for a premium feel
const snappySpring = {
  type: 'spring',
  stiffness: 450,
  damping: 30,
  mass: 1
};

export default function Sell() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productAge, setProductAge] = useState('');
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // States specific to editing
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [deletedImages, setDeletedImages] = useState<string[]>([]);

  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);

  // Authentication check
  useEffect(() => {
    if (!user) navigate('/');
    if (user && !profile && !fetching && !isAdmin) navigate('/setup-profile');
  }, [user, profile, navigate, fetching, isAdmin]);

  // Fetch product data if edit mode
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id || !user) return;
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Allow edit if owner OR admin
          if (data.sellerId !== user.uid && !isAdmin) {
            toast.error("Unauthorized. You can only edit your own listings.");
            navigate('/dashboard');
            return;
          }
          if (data.sellerId !== user.uid && isAdmin) {
            toast("Admin Editing Mode", { icon: '🛡️' });
          }
          setTitle(data.title);
          setDescription(data.description);
          setProductAge(data.productAge || '');
          setPrice(data.price === 0 ? '' : data.price.toString());
          setIsNegotiable(data.isPriceNegotiable);
          setExistingImages(data.images || []);
          setPhone(data.sellerPhone || profile?.phone || '');
        } else {
          toast.error("Product not found");
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Failed to load product details.");
      } finally {
        setFetching(false);
      }
    };
    
    if (isEditMode) {
      fetchProduct();
    }
  }, [id, user, isEditMode, navigate, profile, isAdmin]);

  const getUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const totalImages = images.length + existingImages.length + selectedFiles.length;
      if (totalImages > 20) {
        toast.error('Maximum 20 images allowed completely (including existing)');
        return;
      }
      
      setImages(prev => [...prev, ...selectedFiles]);
      
      // Create previews
      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file as unknown as Blob));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeNewImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]); // Cleanup
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const removeExistingImage = (index: number) => {
    const toDelete = existingImages[index];
    setDeletedImages(prev => [...prev, toDelete]);
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      toast.error('Authentication Error');
      return;
    }

    setLoading(true);

    try {
      if (!isEditMode && !isAdmin) {
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);

        let countToday = 0;
        try {
          const q = query(
            collection(db, 'products'),
            where('sellerId', '==', user.uid),
            where('createdAt', '>=', midnight)
          );
          const snapshot = await getCountFromServer(q);
          countToday = snapshot.data().count;
        } catch (indexError) {
          // Fallback if composite index is missing
          const fallbackQ = query(
            collection(db, 'products'),
            where('sellerId', '==', user.uid)
          );
          const snap = await getDocs(fallbackQ);
          countToday = snap.docs.filter(d => toSafeDate(d.data().createdAt).getTime() >= midnight.getTime()).length;
        }

        if (countToday >= 10) {
          toast.error('Daily listing limit reached (Max 10). Please try again tomorrow.');
          setLoading(false);
          return;
        }
      }

      let newlyUploadedUrls: string[] = [];
      const numPrice = price ? parseInt(price, 10) : 0;

      // Upload New Images to Cloudinary
      if (images.length > 0) {
        try {
          const compressionOptions = {
            maxSizeMB: 0.5, // Reduced from 0.8 to be safer
            maxWidthOrHeight: 1024, // Reduced from 1200
            useWebWorker: true, // Switched to true for better UI performance
            initialQuality: 0.7, // Reduced from 0.8
          };

          for (const file of images) {
            toast.loading(`Compressing ${file.name}...`, { id: `process-${file.name}` });
            let compressedFile: any = file;
            try {
               compressedFile = await imageCompression(file as unknown as File, compressionOptions);
            } catch (compErr) {
               console.warn("Compression failed, using original:", compErr);
            }
            
            toast.loading(`Uploading ${file.name} to server...`, { id: `process-${file.name}` });
            
            const formData = new FormData();
            formData.append('file', compressedFile, file.name);

            const idToken = await user.getIdToken();
            const response = await fetch(`/api/images/upload`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${idToken}`
              },
              body: formData,
            });

            if (!response.ok) {
              const errorText = await response.text();
              let errorMessage = `Server error ${response.status}`;
              
              if (errorText.includes('Cookie check') || errorText.includes('Action required')) {
                 errorMessage = "Security session expired. Please refresh the page and try again.";
              } else if (response.status === 413) {
                 errorMessage = "File too large for the network proxy. Try a smaller image.";
              } else {
                 try {
                   const errJson = JSON.parse(errorText);
                   if (errJson.error) errorMessage = errJson.error;
                 } catch (e) {
                   console.error("Non-JSON Server Error:", errorText);
                 }
              }
              throw new Error(errorMessage);
            }

            const text = await response.text();
            
            // Platform Identity/Security Bridge Check
            if (text.trim().startsWith('<') || text.includes('Cookie check') || text.includes('Action required')) {
              console.error("Platform level interception detected:", text);
              throw new Error("Security session invalidated by platform. Please refresh the page or click 'Authenticate' in the preview window to continue.");
            }

            try {
               const data = JSON.parse(text);
               newlyUploadedUrls.push(data.secure_url);
            } catch (jsonErr) {
               console.error("JSON Parse Failure. Response was:", text);
               throw new Error("Server communication failure. The response was not valid data. Try a smaller image.");
            }
            toast.dismiss(`process-${file.name}`);
          }
        } catch (uploadError: any) {
          toast.dismiss();
          console.error("Upload Error:", uploadError);
          setLoading(false);
          toast.error(`Listing failed: ${uploadError.message}`);
          return; // Stop the flow instead of proceeding with broken images
        }
      }

      if (isEditMode && deletedImages.length > 0) {
        const idToken = await user.getIdToken();
        for (const imageUrl of deletedImages) {
          try {
            await fetch('/api/images/delete', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({ imageUrl })
            });
          } catch (err) {
            console.error("Failed to delete removed Cloudinary image from backend:", err);
          }
        }
      }

      const finalImageUrls = [...existingImages, ...newlyUploadedUrls];

      if (isEditMode) {
        const updateData = {
          title: title.trim(),
          description: description.trim(),
          productAge: productAge.trim(),
          price: numPrice,
          isPriceNegotiable: isNegotiable || numPrice === 0,
          images: finalImageUrls,
          updatedAt: serverTimestamp(),
        };
        
        await updateDoc(doc(db, 'products', id), updateData);
        toast.success('Listing updated successfully!');
      } else {
        const productId = getUUID();
        const productData = {
          id: productId,
          title: title.trim(),
          description: description.trim(),
          productAge: productAge.trim(),
          price: numPrice,
          isPriceNegotiable: isNegotiable || numPrice === 0,
          images: finalImageUrls,
          sellerId: user.uid,
          sellerName: profile.name,
          sellerEmail: profile.email,
          sellerPhone: profile.phone,
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          status: 'active',
          contactClicks: 0,
          views: 0,
          updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, 'products', productId), productData);
        
        toast.success('Listing created successfully!');
      }

      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} listing: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-64">
         <motion.div 
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={snappySpring}
           className="animate-spin rounded-full h-10 w-10 border-b-2 border-google-blue"
         ></motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={snappySpring}
        className="mb-12"
      >
        <h1 className="text-4xl font-black text-black tracking-tightest uppercase italic mt-4">
          Sell Item
        </h1>
        <p className="text-gray-600 font-bold text-sm mt-2 max-w-md">
          {isEditMode 
            ? 'Adjust parameters and images for your existing listing.' 
            : 'Initialize your listing onto the campus trading grid. All listings remain active for 10 cycles.'}
        </p>
      </motion.div>

      <motion.form 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...snappySpring, delay: 0.1 }}
        onSubmit={handleSubmit} 
        className="space-y-10 bg-white p-8 sm:p-12 rounded-[40px] shadow-2xl shadow-blue-100/50 border border-gray-100 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full translate-x-12 -translate-y-12 blur-3xl"></div>

        {/* Title */}
        <div className="relative">
          <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-2 italic">Product Name <span className="text-google-red">*</span></label>
          <input 
            type="text" 
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="E.G. ENGINEERING GRAPHICS KIT, MACBOOK AIR M1"
            className="block w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-google-blue/10 focus:border-google-blue focus:bg-white outline-none transition-all font-bold text-sm tracking-tight placeholder:text-gray-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-2 italic">Detailed Description <span className="text-google-red">*</span></label>
          <textarea 
            required
            rows={4}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="DESCRIBE CONDITION, DEFECTS, OR SPECIFICATIONS..."
            className="block w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-google-blue/10 focus:border-google-blue focus:bg-white outline-none transition-all font-bold text-sm tracking-tight leading-relaxed placeholder:text-gray-500"
          />
        </div>

        {/* Product Age */}
        <div>
          <label className="block text-[11px] font-black text-black uppercase tracking-widest mb-2 italic">Product Age <span className="text-google-red">*</span></label>
          <select 
            required
            value={PRODUCT_AGE_OPTIONS.includes(productAge) ? productAge : ""}
            onChange={(e) => setProductAge(e.target.value)}
            className="block w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-google-blue/10 focus:border-google-blue focus:bg-white outline-none transition-all font-black text-sm tracking-tight text-gray-800"
          >
            <option value="" disabled>SELECT AGE / CONDITION</option>
            {PRODUCT_AGE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Price Box */}
        <div className="bg-blue-50 p-8 rounded-[32px] border border-blue-100 relative group">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h3 className="text-[11px] font-black text-google-blue uppercase tracking-[0.2em] italic">Valuation Control</h3>
            <label className="relative inline-flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={isNegotiable}
                onChange={(e) => setIsNegotiable(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-blue-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-google-blue transition-all shadow-inner"></div>
              <span className="ml-3 text-[11px] font-black text-google-blue uppercase tracking-widest">Negotiable</span>
            </label>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <IndianRupee size={20} className="text-google-blue" strokeWidth={3} />
            </div>
            <input 
              type="number" 
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              placeholder="ZERO / EMPTY FOR 'DISCUSS PRICE'"
              className="block w-full pl-14 pr-6 py-5 bg-white border border-blue-100 rounded-2xl shadow-inner focus:ring-4 focus:ring-google-blue/10 focus:border-google-blue outline-none transition-all font-black text-xl tracking-tightest placeholder:text-blue-200 placeholder:text-sm"
            />
          </div>
          
          {Number(price) > 5000 && (
            <motion.p 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-[10px] text-amber-600 font-black flex items-center gap-2 uppercase tracking-widest bg-amber-50 p-2 rounded-lg border border-amber-100"
            >
              <AlertCircle size={14} strokeWidth={3} /> Attention: High-Value Asset Verification Required.
            </motion.p>
          )}
        </div>

        {/* Images */}
        <div className="space-y-4">
          <label className="block text-[11px] font-black text-black uppercase tracking-widest italic">Images (MAX 5)</label>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            
            {/* Existing Images */}
            <AnimatePresence>
              {existingImages.map((url, idx) => (
                <motion.div 
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  key={`existing-${idx}`} 
                  className="relative aspect-square rounded-3xl overflow-hidden border border-gray-100 shadow-lg group"
                >
                  <img src={url} alt={`Existing ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    type="button"
                    onClick={() => removeExistingImage(idx)}
                    className="absolute top-2 right-2 bg-red-500/90 text-white rounded-xl p-2 shadow-xl backdrop-blur-md border border-white/20 transition-all hover:bg-red-600"
                  >
                    <X size={14} strokeWidth={3} />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* New Image Previews */}
            <AnimatePresence>
              {imagePreviews.map((url, idx) => (
                <motion.div 
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  key={`new-${idx}`} 
                  className="relative aspect-square rounded-3xl overflow-hidden border border-gray-100 shadow-lg group"
                >
                  <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    type="button"
                    onClick={() => removeNewImage(idx)}
                    className="absolute top-2 right-2 bg-red-500/90 text-white rounded-xl p-2 shadow-xl backdrop-blur-md border border-white/20 transition-all hover:bg-red-600"
                  >
                    <X size={14} strokeWidth={3} />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Add Image Button */}
            {(existingImages.length + images.length) < 20 && (
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="aspect-square border-4 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center bg-gray-50/50 p-2 gap-2"
              >
                <div className="flex w-full gap-2 h-full">
                  <label className="flex-1 flex flex-col items-center justify-center rounded-2xl bg-white hover:bg-blue-50 border border-gray-100 text-google-blue cursor-pointer transition-colors group">
                    <Camera size={28} className="group-hover:scale-110 transition-transform duration-300" strokeWidth={2} />
                    <span className="text-[9px] font-black uppercase tracking-widest mt-2">Camera</span>
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp" 
                      capture="environment"
                      className="hidden" 
                      onChange={handleImageChange} 
                    />
                  </label>
                  <label className="flex-1 flex flex-col items-center justify-center rounded-2xl bg-white hover:bg-blue-50 border border-gray-100 text-google-blue cursor-pointer transition-colors group">
                    <ImagePlus size={28} className="group-hover:scale-110 transition-transform duration-300" strokeWidth={2} />
                    <span className="text-[9px] font-black uppercase tracking-widest mt-2">Gallery</span>
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp" 
                      multiple 
                      className="hidden" 
                      onChange={handleImageChange} 
                    />
                  </label>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-6 px-4 bg-black text-white rounded-3xl font-black uppercase tracking-widest text-[13px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:bg-gray-900 transition-all disabled:bg-gray-300 disabled:shadow-none italic"
        >
          {loading 
            ? (isEditMode ? 'SYNCHRONIZING...' : 'INITIALIZING LISTING...') 
            : (isEditMode ? 'UPDATE LISTING' : 'POST LISTING')}
        </motion.button>
      </motion.form>
    </div>
  );
}
