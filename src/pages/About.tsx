import { motion } from 'motion/react';
import { BookOpen, ShieldCheck, Leaf } from 'lucide-react';

// Snappy spring configuration for a premium feel
const snappySpring = {
  type: 'spring',
  stiffness: 450,
  damping: 30,
  mass: 1
};

export default function About() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={snappySpring}
        className="bg-white rounded-[40px] shadow-2xl shadow-indigo-100 border border-gray-100 p-10 sm:p-16 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full translate-x-24 -translate-y-24 blur-3xl opacity-50"></div>
        
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ ...snappySpring, delay: 0.1 }}
        >
          <h1 className="text-5xl font-black text-gray-900 tracking-tightest uppercase italic underline decoration-indigo-600 decoration-8 underline-offset-8">ABOUT IIT EXCHANGE</h1>
        </motion.div>
        
        <div className="mt-12 text-gray-600 leading-relaxed font-bold text-lg tracking-tight space-y-8">
          <p className="italic border-l-4 border-indigo-600 pl-6 py-2 bg-indigo-50/30 rounded-r-2xl">
            IIT Exchange is the exclusive, secure, and intuitive marketplace built specifically for the students, faculty, and staff of the Indian Institute of Technology (IIT) Dharwad.
          </p>
          <p>
            Our platform ensures that buying, selling, and exchanging items within the campus is safe, transparent, and completely restricted to the institute's community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {[
            { icon: ShieldCheck, title: 'Exclusive & Secure', bg: 'bg-indigo-50', text: 'text-indigo-600', desc: 'Only users with a verified @iitdh.ac.in email address can access seller contact information and post new items, ensuring dealing with unknown external parties is eliminated.' },
            { icon: Leaf, title: 'Sustainable Campus', bg: 'bg-green-50', text: 'text-green-600', desc: 'Reduce waste by passing down textbooks, cycles, electronics, and drafting equipment to junior batches. Promote a circular economy right here on campus.' },
            { icon: BookOpen, title: 'Student First', bg: 'bg-blue-50', text: 'text-blue-600', desc: 'Created to solve the exact problems students face: easily discovering required semester materials and getting fair prices without middle-men.' }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...snappySpring, delay: 0.3 + (i * 0.1) }}
              whileHover={{ y: -5 }}
              className={`${item.bg} p-8 rounded-[32px] border border-transparent hover:border-gray-100 transition-all shadow-sm`}
            >
              <item.icon className={`h-10 w-10 ${item.text} mb-6`} strokeWidth={3} />
              <h3 className="text-sm font-black text-gray-900 mb-2 uppercase tracking-widest">{item.title}</h3>
              <p className="text-xs font-medium text-gray-600 leading-relaxed tracking-wide">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-20 pt-12 border-t border-gray-50"
        >
          <h2 className="text-xl font-black text-gray-900 mb-6 uppercase italic tracking-tighter">Our Vision</h2>
          <p className="text-gray-500 font-medium leading-relaxed max-w-2xl text-sm">
            Every semester, hundreds of items change hands through unorganized WhatsApp groups and hostel notice boards. IIT Exchange centralizes this process. Whether you need a drafter, an engineering mathematics textbook, a cycle to commute to classes, or are just looking to sell your old monitor, IIT Exchange is your go-to hub.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
