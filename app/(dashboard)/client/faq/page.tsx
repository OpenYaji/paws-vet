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
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-3xl font-bold mb-1">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">Find answers to common questions about our services, procedures, and pet care.</p>
      </div>

      {/* FAQ Items */}
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-accent/30 transition-colors duration-150"
            >
              <h3 className="text-base font-semibold text-foreground pr-4">
                {faq.question}
              </h3>
              <ChevronDown
                className={`flex-shrink-0 w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-6 pb-6 pt-0">
                <div className="h-px bg-border mb-4" />
                <p className="text-muted-foreground leading-relaxed text-sm">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="bg-accent/30 rounded-2xl border border-border p-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Didn't Find Your Answer?</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Our team is here to help! Contact us directly with any questions about your pet's care.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Phone */}
          <div className="flex items-start gap-3 bg-card rounded-xl border border-border p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-0.5 text-sm">Call Us</h3>
              <a
                href="tel:1234567890"
                className="text-primary hover:underline text-sm font-medium transition-colors"
              >
                (123) 456-7890
              </a>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3 bg-card rounded-xl border border-border p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-0.5 text-sm">Email Us</h3>
              <a
                href="mailto:info@pawsclinic.com"
                className="text-primary hover:underline text-sm font-medium break-all transition-colors"
              >
                info@pawsclinic.com
              </a>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3 bg-card rounded-xl border border-border p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-0.5 text-sm">Visit Us</h3>
              <p className="text-muted-foreground text-sm">
                123 Pet Street, VC 12345
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}