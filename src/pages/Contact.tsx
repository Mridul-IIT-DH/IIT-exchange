import { motion } from 'motion/react';
import { Mail, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Snappy spring configuration for a premium feel
const snappySpring = {
  type: 'spring',
  stiffness: 450,
  damping: 30,
  mass: 1
};

export default function Contact() {
  const { user, profile, signIn } = useAuth();

  // ==========================================
  // CONFIGURATION
  // ==========================================
  const FORM_ID = "1FAIpQLScXuGBfuoECmTP30y0VtV55QmtY0HKgijmEMgMJJgI99Tb9Ng"; 
  const ENTRY_ID_NAME = "1930698556"; 
  const ENTRY_ID_EMAIL = "1759558291";

  // Get the active user's details
  const nameToPrefill = profile?.name || user?.displayName || "";
  const emailToPrefill = user?.email || "";

  // Construct the URL dynamically
  let googleFormUrl = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform?embedded=true`;
  
  if (nameToPrefill) {
    googleFormUrl += `&entry.${ENTRY_ID_NAME}=${encodeURIComponent(nameToPrefill)}`;
  }
  if (emailToPrefill) {
    googleFormUrl += `&entry.${ENTRY_ID_EMAIL}=${encodeURIComponent(emailToPrefill)}`;
  }

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={snappySpring}
        className="bg-white rounded-[40px] shadow-2xl shadow-indigo-100 border border-gray-100 overflow-hidden relative"
      >
        <div className="bg-indigo-600 h-2 w-full"></div>
        <div className="p-10 sm:p-16">
          <motion.div
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ ...snappySpring, delay: 0.1 }}
             className="text-center mb-16"
          >
            <h1 className="text-5xl font-black text-black uppercase tracking-tightest italic">Contact Admin</h1>
          </motion.div>
          
          <div className="w-full flex flex-col items-center">
            <div className="w-full bg-gray-50 rounded-[32px] overflow-hidden border border-gray-100 relative shadow-inner" style={{ height: '1050px' }}>
              {!user && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-xl z-20 flex flex-col items-center justify-center p-12 text-center">
                  <div className="p-5 bg-indigo-50 text-indigo-600 rounded-full mb-6">
                    <Mail size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-black mb-4 uppercase italic tracking-tighter">Authorization Required</h3>
                  <p className="text-gray-600 font-bold text-sm mb-8 italic uppercase tracking-widest">YOU MUST BE AUTHENTICATED VIA THE IIT DHARWAD DOMAIN TO BROADCAST SECURE COMMS.</p>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => signIn && signIn()}
                    className="px-10 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl shadow-indigo-100 italic"
                  >
                    Authenticate Now
                  </motion.button>
                </div>
              )}
              <iframe 
                src={googleFormUrl} 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                marginHeight={0} 
                marginWidth={0}
                title="Contact Admin Form"
                className="w-full h-full bg-white transition-opacity duration-1000"
              >
                Loading Command Form...
              </iframe>
            </div>
            
          </div>
        </div>
      </motion.div>
    </div>
  );
}
