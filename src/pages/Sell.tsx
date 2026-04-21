import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, setDoc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { IndianRupee, ImagePlus, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

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
      if (totalImages > 5) {
        toast.error('Maximum 5 images allowed completely (including existing)');
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

    if (!isEditMode && profile.listingsCountToday >= 10) {
      toast.error('Daily listing limit reached (Max 10). Please try again tomorrow.');
      return;
    }

    setLoading(true);
    try {
      let newlyUploadedUrls: string[] = [];
      const numPrice = price ? parseInt(price, 10) : 0;

      // Upload New Images to Cloudinary
      if (images.length > 0) {
        try {
          const compressionOptions = {
            maxSizeMB: 1, 
            maxWidthOrHeight: 1920,
            useWebWorker: false,
            initialQuality: 0.8,
          };

          // We no longer need VITE_CLOUDINARY_UPLOAD_PRESET since uploading happens securely on our backend
          for (const file of images) {
            toast.loading(`Compressing ${file.name}...`, { id: `process-${file.name}` });
            const compressedFile = await imageCompression(file as unknown as File, compressionOptions);
            
            toast.loading(`Uploading ${file.name} to server...`, { id: `process-${file.name}` });
            
            const formData = new FormData();
            formData.append('file', compressedFile, file.name);

            // POST to our secure backend endpoint Instead of uploading directly to Cloudinary
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
              let errorMessage = `Status ${response.status}`;
              try {
                const errJson = JSON.parse(errorText);
                if (errJson.error) {
                  errorMessage = errJson.error;
                }
              } catch (e) {
                errorMessage = errorText;
              }
              throw new Error(`Server: ${errorMessage}`);
            }

            const data = await response.json();
            newlyUploadedUrls.push(data.secure_url);
            toast.dismiss(`process-${file.name}`);
          }
        } catch (uploadError: any) {
          toast.dismiss();
          console.error("Upload Error:", uploadError);
          toast.error(`Image upload failed: ${uploadError.message}. Proceeding anyway.`);
        }
      }

      // Cleanup user-deleted existing images from Cloudinary
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
        // Update Document
        const updateData = {
          title: title.trim(),
          description: description.trim(),
          productAge: productAge.trim(),
          price: numPrice,
          isPriceNegotiable: isNegotiable || numPrice === 0,
          images: finalImageUrls,
          updatedAt: Date.now(),
        };
        
        await updateDoc(doc(db, 'products', id), updateData);
        toast.success('Listing updated successfully!');
      } else {
        // Create Document
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
          createdAt: Date.now(),
          expiresAt: Date.now() + 10 * 24 * 60 * 60 * 1000, // 10 days
          status: 'active',
          contactClicks: 0,
          views: 0,
          updatedAt: Date.now()
        };

        await setDoc(doc(db, 'products', productId), productData);
        
        await updateDoc(doc(db, 'users', user.uid), {
          listingsCountToday: increment(1)
        });
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
         <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          {isEditMode ? 'Edit Listing' : 'Sell an Item'}
        </h1>
        <p className="text-gray-500 mt-2">
          {isEditMode 
            ? 'Update your product details and images.' 
            : 'Post your item to the private IIT DH marketplace. Active for 10 days.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
        
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Product Title <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Engineering Graphics Kit, Used Bicycle"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Description <span className="text-red-500">*</span></label>
          <textarea 
            required
            rows={4}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the condition, reasons for selling..."
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          />
        </div>

        {/* Product Age */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Product Age <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            required
            value={productAge}
            onChange={(e) => setProductAge(e.target.value)}
            placeholder="e.g. 6 Months, 2 Years old..."
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          />
        </div>

        {/* Price Box */}
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Pricing Strategy</h3>
            <div className="flex items-center">
              <input
                id="negotiable"
                type="checkbox"
                checked={isNegotiable}
                onChange={(e) => setIsNegotiable(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="negotiable" className="ml-2 block text-sm text-gray-700">
                Open to negotiation
              </label>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IndianRupee className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="number" 
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Leave 0 or empty for 'Discuss Price'"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            />
          </div>
          
          {Number(price) > 10000 && (
            <p className="mt-2 text-sm text-yellow-600 flex items-center gap-1">
              <AlertCircle size={16} /> High value item. Please deal cautiously on campus.
            </p>
          )}
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Images (Max 5 total)</label>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            
            {/* Existing Images */}
            {existingImages.map((url, idx) => (
              <div key={`existing-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                <img src={url} alt={`Existing ${idx}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(idx)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-80 hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {/* New Image Previews */}
            {imagePreviews.map((url, idx) => (
              <div key={`new-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewImage(idx)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-80 hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            
            {/* Add Image Button */}
            {(existingImages.length + images.length) < 5 && (
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-500 cursor-pointer transition">
                <ImagePlus size={32} />
                <span className="text-xs font-medium mt-2">Add Image</span>
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp" 
                  multiple 
                  className="hidden" 
                  onChange={handleImageChange} 
                />
              </label>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition disabled:bg-indigo-400"
        >
          {loading 
            ? (isEditMode ? 'Saving Changes...' : 'Uploading & Creating Listing...') 
            : (isEditMode ? 'Save Changes' : 'Post Listing')}
        </button>
      </form>
    </div>
  );
}
