'use client';

import { useState } from 'react';
import { ChevronDown, Phone, Mail, MapPin } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I schedule an appointment for my pet?",
    answer: "You can easily schedule an appointment through your client dashboard. Navigate to the 'Appointments' section, click 'Book New Appointment', select your pet, choose a service, and pick an available time slot. You'll receive a confirmation email once your appointment is booked."
  },
  {
    question: "What should I bring to my pet's first appointment?",
    answer: "For your pet's first visit, please bring any previous medical records, vaccination history, current medications, and your pet's insurance information if applicable. It's also helpful to bring a list of any questions or concerns you have about your pet's health."
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
        <p className="text-gray-600 mt-2">
          Find answers to common questions about our services, procedures, and pet care.
        </p>
      </div>

      {/* FAQ Items */}
      <div className="space-y-4 mb-12">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-900 pr-4">
                {faq.question}
              </h3>
              <ChevronDown
                className={`flex-shrink-0 w-5 h-5 text-gray-500 transition-transform ${
                  openIndex === index ? 'transform rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-6 pb-6">
                <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="bg-blue-50 rounded-lg p-8 border border-blue-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Didn't Find Your Answer?
        </h2>
        <p className="text-gray-700 mb-6">
          Our team is here to help! Contact us directly with any questions about your pet's care.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Phone */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Call Us</h3>
              <a
                href="tel:1234567890"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                (123) 456-7890
              </a>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Email Us</h3>
              <a
                href="mailto:info@pawsclinic.com"
                className="text-blue-600 hover:text-blue-700 hover:underline break-all"
              >
                info@pawsclinic.com
              </a>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Visit Us</h3>
              <p className="text-gray-700">
                123 Pet Street, VC 12345
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}