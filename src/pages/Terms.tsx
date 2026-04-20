import React from 'react';

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-white rounded-2xl shadow-sm border border-gray-100 my-8">
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-8">Terms and Conditions</h1>
      
      <div className="prose prose-indigo max-w-none text-gray-600 space-y-6">
        <p>
          <strong>Last Updated:</strong> April 2026
        </p>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing and using IIT Exchange (the "Platform"), you agree to be bound by these Terms and Conditions. 
            The Platform is provided strictly for the students, faculty, and staff of IIT Dharwad.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Eligibility & Accounts</h2>
          <p>
            You must register using a valid <code>@iitdh.ac.in</code> email address. 
            You are responsible for maintaining the confidentiality of your account credentials (handled via Google OAuth) and for all activities under your account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Listing and Selling</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Sellers must accurately describe the items they are listing.</li>
            <li>Prohibited items include: illegal substances, weapons, stolen property, and items that violate institute code of conduct.</li>
            <li>We reserve the right to remove listings that violate these rules or are deemed inappropriate.</li>
            <li>Listings automatically expire after 10 days unless extended.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Limitation of Liability</h2>
          <p>
            IIT Exchange serves solely as a discovery platform to connect buyers and sellers. 
            We do not handle payments, shipping, or physical condition verification of items. 
            <strong>All transactions are strictly between the buyer and seller.</strong>
          </p>
          <p className="mt-2">
            The platform developers and IIT Dharwad assume absolutely no liability for defective items, financial disputes, or injuries arising from the use of items bought/sold through this platform. Please inspect all items carefully before completing a transaction in person.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Data Privacy</h2>
          <p>
            We collect your name, email, and provided phone number. Phone numbers and email addresses are only revealed to other authenticated IITDH members who explicitly click to view contact details. We do not sell your data to third parties.
          </p>
        </section>

      </div>
    </div>
  );
}
