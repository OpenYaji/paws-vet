'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth-client';
import { ChevronDown, Phone, Mail, MapPin, HelpCircle, MessageCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicInfo, setClinicInfo] = useState({
    phone: '(123) 456-7890',
    email: 'info@pawsclinic.com',
    address: '123 Pet Street, VC 12345',
  });

  useEffect(() => {
    Promise.all([
      supabase.from('faqs').select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase.from('clinic_settings')
        .select('phone, email, address')
        .eq('id', 1).single(),
    ]).then(([faqRes, clinicRes]) => {
      setFaqs((faqRes.data ?? []) as FAQItem[]);
      if (clinicRes.data) setClinicInfo(clinicRes.data);
      setLoading(false);
    });
  }, []);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
          <HelpCircle className="w-7 h-7 text-primary" />
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Frequently Asked Questions</span>
          <span className="ml-1 bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{faqs.length}</span>
        </h1>
        <p className="text-muted-foreground">Find answers to common questions about our services, procedures, and pet care.</p>
      </div>

      {/* FAQ Items */}
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className={`bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 ${openIndex === index ? 'bg-primary/5' : ''}`}
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-accent/30 transition-colors duration-150"
            >
              <div className="flex items-center gap-3 pr-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{index + 1}</span>
                <h3 className="text-base font-semibold text-foreground">
                  {faq.question}
                </h3>
              </div>
              <ChevronDown
                className={`flex-shrink-0 w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-6 pb-6 pt-0">
                <div className="h-px bg-border mb-4" />
                <p className="text-muted-foreground leading-relaxed text-sm border-l-2 border-primary/30 pl-4">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="bg-gradient-to-br from-primary/5 via-accent/30 to-primary/10 rounded-2xl border border-border p-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" />
          Didn&apos;t Find Your Answer?
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Our team is here to help! Contact us directly with any questions about your pet&apos;s care.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Phone */}
          <div className="flex items-start gap-3 bg-card rounded-xl border border-border p-4 hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-primary/20 transition-all duration-150">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-0.5 text-sm">Call Us</h3>
              <a
                href={`tel:${clinicInfo.phone}`}
                className="text-primary hover:underline text-sm font-medium transition-colors"
              >
                {clinicInfo.phone}
              </a>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3 bg-card rounded-xl border border-border p-4 hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-primary/20 transition-all duration-150">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-0.5 text-sm">Email Us</h3>
              <a
                href={`mailto:${clinicInfo.email}`}
                className="text-primary hover:underline text-sm font-medium break-all transition-colors"
              >
                {clinicInfo.email}
              </a>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3 bg-card rounded-xl border border-border p-4 hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-primary/20 transition-all duration-150">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-0.5 text-sm">Visit Us</h3>
              <p className="text-muted-foreground text-sm">
                {clinicInfo.address}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
