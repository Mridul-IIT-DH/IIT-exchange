import { motion } from 'motion/react';

// Snappy spring configuration for a premium feel
const snappySpring = {
  type: 'spring',
  stiffness: 450,
  damping: 30,
  mass: 1
};

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={snappySpring}
        className="bg-white rounded-[40px] shadow-2xl shadow-blue-100 border border-gray-100 p-10 sm:p-16 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full translate-x-12 -translate-y-12 blur-3xl opacity-50"></div>
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ ...snappySpring, delay: 0.1 }}
           className="mb-16"
        >
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tightest italic underline decoration-google-blue decoration-4 underline-offset-8">Terms and Conditions</h1>
          <p className="text-[10px] font-black text-google-blue mt-8 uppercase tracking-[0.2em] italic">Last Updated: April 2026</p>
        </motion.div>

        <div className="mt-16 space-y-12">
          <motion.section 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="group"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-black text-google-blue font-mono tracking-tighter opacity-40 group-hover:opacity-100 transition-opacity">[01]</span>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest italic">Acceptance of Terms</h2>
            </div>
            <p className="text-gray-500 font-bold text-sm tracking-tight leading-relaxed italic border-l-2 border-gray-100 pl-6 group-hover:border-google-blue transition-colors">
              By accessing and using IIT Exchange (the "Platform"), you agree to be bound by these Terms and Conditions. The Platform is provided strictly for the students, faculty, and staff of IIT Dharwad.
            </p>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="group"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-black text-google-blue font-mono tracking-tighter opacity-40 group-hover:opacity-100 transition-opacity">[02]</span>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest italic">Eligibility & Accounts</h2>
            </div>
            <p className="text-gray-500 font-bold text-sm tracking-tight leading-relaxed italic border-l-2 border-gray-100 pl-6 group-hover:border-google-blue transition-colors">
              You must register using a valid @iitdh.ac.in email address. You are responsible for maintaining the confidentiality of your account credentials (handled via Google OAuth) and for all activities under your account.
            </p>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="group"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-black text-google-blue font-mono tracking-tighter opacity-40 group-hover:opacity-100 transition-opacity">[03]</span>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest italic">Listing and Selling</h2>
            </div>
            <p className="mb-4 text-gray-500 font-bold text-sm tracking-tight leading-relaxed italic border-l-2 border-transparent pl-6">
              Sellers must accurately describe the items they are listing.
            </p>
            <ul className="space-y-4 pl-6 border-l-2 border-gray-100 group-hover:border-google-blue transition-colors">
              {[
                'Prohibited items include: illegal substances, weapons, stolen property, and items that violate institute code of conduct.',
                'We reserve the right to remove listings that violate these rules or are deemed inappropriate.',
                'Listings automatically expire after 10 days unless extended.'
              ].map((text, idx) => (
                <li key={idx} className="text-gray-500 font-bold text-xs tracking-tight italic flex gap-3">
                  <span className="text-google-blue">»</span> {text}
                </li>
              ))}
            </ul>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="group"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-black text-google-blue font-mono tracking-tighter opacity-40 group-hover:opacity-100 transition-opacity">[04]</span>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest italic">Limitation of Liability</h2>
            </div>
            <div className="space-y-4 border-l-2 border-gray-100 pl-6 group-hover:border-google-blue transition-colors">
              <p className="text-gray-500 font-bold text-sm tracking-tight leading-relaxed italic">
                IIT Exchange serves solely as a discovery platform to connect buyers and sellers. We do not handle payments, shipping, or physical condition verification of items. All transactions are strictly between the buyer and seller.
              </p>
              <p className="text-google-red/70 font-bold text-sm tracking-tight leading-relaxed italic">
                The platform developers and IIT Dharwad assume absolutely no liability for defective items, financial disputes, or injuries arising from the use of items bought/sold through this platform. Please inspect all items carefully before completing a transaction in person.
              </p>
            </div>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="group"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-black text-google-blue font-mono tracking-tighter opacity-40 group-hover:opacity-100 transition-opacity">[05]</span>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest italic">Data Privacy</h2>
            </div>
            <p className="text-gray-500 font-bold text-sm tracking-tight leading-relaxed italic border-l-2 border-gray-100 pl-6 group-hover:border-google-blue transition-colors">
              We collect your name, email, and provided phone number. Phone numbers and email addresses are only revealed to other authenticated IITDH members who explicitly click to view contact details. We do not sell your data to third parties.
            </p>
          </motion.section>
        </div>
      </motion.div>
    </div>
  );
}
