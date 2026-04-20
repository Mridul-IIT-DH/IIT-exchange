import React from 'react';
import { Mail, ExternalLink, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Contact() {
  const { user, profile } = useAuth();

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
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 px-8 py-10 text-white text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-bold tracking-tight mb-2">Contact Admin</h1>
          <p className="text-indigo-100">
            Have an issue or a suggestion for IIT Exchange? Fill out the form below.
          </p>
        </div>
        
        <div className="p-4 sm:p-8 w-full flex flex-col items-center">
          <p className="text-sm text-gray-500 mb-6 text-center">
            If the form doesn't load below, you can also <a href={googleFormUrl.replace('?embedded=true', '')} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-medium">open it in a new tab <ExternalLink size={14} /></a>.
          </p>
          
          <div className="w-full bg-gray-50 rounded-xl overflow-hidden border border-gray-200 relative" style={{ height: '800px' }}>
            {!user && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Please Sign In</h3>
                <p className="text-gray-600">You must be signed in with your IIT Dharwad account to securely contact the administration.</p>
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
              className="w-full h-full bg-white"
            >
              Loading form...
            </iframe>
          </div>
        </div>
      </div>
    </div>
  );
}
