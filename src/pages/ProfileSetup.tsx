import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { isValidPhoneNumber } from '../lib/utils';
import toast from 'react-hot-toast';

export default function ProfileSetup() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // If not logged in, or if already has a profile, redirect away.
  React.useEffect(() => {
    if (!user) navigate('/');
    if (profile) navigate('/');
  }, [user, profile, navigate]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhoneNumber(phone)) {
      toast.error('Please enter a valid 10-digit Indian phone number');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName || 'Anonymous Entry',
        email: user.email,
        phone: phone,
        createdAt: Date.now(),
        listingsCountToday: 0,
        wishlist: []
      });
      
      toast.success('Profile created successfully!');
      await refreshProfile();
      navigate('/');
    } catch (error: any) {
      toast.error('Error creating profile: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center text-white relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-12 -translate-y-12 blur-2xl"></div>
          <h2 className="text-2xl font-black tracking-tight mb-2">Welcome to IIT Exchange</h2>
          <p className="text-indigo-100 text-sm font-medium opacity-90">One last step to join the community</p>
        </div>
        
        <div className="p-8 sm:p-10">
          <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">
            Please provide your WhatsApp or primary phone number. This allows interested buyers to reach you instantly.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 shadow-none">Full Name</label>
              <input 
                type="text" 
                disabled 
                value={user.displayName || ''} 
                className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 font-bold cursor-not-allowed opacity-80"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 shadow-none">University Email</label>
              <input 
                type="text" 
                disabled 
                value={user.email || ''} 
                className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 font-bold cursor-not-allowed opacity-80"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1">Mobile Number <span className="text-indigo-500 text-base leading-none">*</span></label>
              <input 
                type="tel" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit phone number"
                className="block w-full px-4 py-3 bg-white border-2 border-gray-50 rounded-xl text-gray-900 font-bold placeholder:text-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                autoFocus
              />
              <p className="mt-2 text-[10px] text-gray-400 font-medium">We'll never share your data outside the campus.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-4 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:bg-indigo-300 disabled:shadow-none"
            >
              {loading ? 'Finalizing...' : 'Complete Profile Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
