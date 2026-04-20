import React from 'react';
import { BookOpen, ShieldCheck, Leaf } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-white rounded-2xl shadow-sm border border-gray-100 my-8">
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-6">About IIT Exchange</h1>
      
      <div className="prose prose-indigo max-w-none text-gray-600">
        <p className="text-lg leading-relaxed mb-8">
          IIT Exchange is the exclusive, secure, and intuitive marketplace built specifically for the students, faculty, and staff of the <strong>Indian Institute of Technology (IIT) Dharwad</strong>. 
          Our platform ensures that buying, selling, and exchanging items within the campus is safe, transparent, and completely restricted to the institute's community.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
            <ShieldCheck className="h-10 w-10 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Exclusive & Secure</h3>
            <p className="text-sm">
              Only users with a verified <code>@iitdh.ac.in</code> email address can access seller contact information and post new items, ensuring dealing with unknown external parties is eliminated.
            </p>
          </div>
          
          <div className="bg-green-50 p-6 rounded-xl border border-green-100">
            <Leaf className="h-10 w-10 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sustainable Campus</h3>
            <p className="text-sm">
              Reduce waste by passing down textbooks, cycles, electronics, and drafting equipment to junior batches. Promote a circular economy right here on campus.
            </p>
          </div>

          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <BookOpen className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Student First</h3>
            <p className="text-sm">
              Created to solve the exact problems students face: easily discovering required semester materials and getting fair prices without middle-men.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
        <p className="leading-relaxed mb-6">
          Every semester, hundreds of items change hands through unorganized WhatsApp groups and hostel notice boards. 
          IIT Exchange centralizes this process. Whether you need a drafter, an engineering mathematics textbook, a cycle to commute to classes, 
          or are just looking to sell your old monitor, IIT Exchange is your go-to hub.
        </p>
      </div>
    </div>
  );
}
