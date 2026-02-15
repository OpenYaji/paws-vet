'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/auth-client';
import Link from 'next/link';
import { toast } from 'sonner';

interface Service {
  id: string;
  service_name: string;
  service_category: string;
  description: string;
  base_price: number;
  duration_minutes: number;
  requires_specialist: boolean;
  is_active: boolean;
}

// Map service categories to icons and details
const serviceIconMap: { [key: string]: string } = {
  'General Wellness': '💊',
  'Dental Care': '🦷',
  'Diagnostic': '🩺',
  'Vaccination': '💉',
  'Surgery': '🏥',
  'Specialized Care': '🧬',
  'Emergency': '🚨',
  'Grooming': '✂️',
};

export default function ClientServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedServices, setGroupedServices] = useState<{ [key: string]: Service[] }>({});

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('service_category', { ascending: true })
        .order('service_name', { ascending: true });

      if (error) {
        console.error('Error fetching services:', error);
        toast.error('Failed to load services');
        return;
      }

      setServices(data || []);
      
      // Group services by category
      const grouped = (data || []).reduce((acc, service) => {
        const category = service.service_category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(service);
        return acc;
      }, {} as { [key: string]: Service[] });
      
      setGroupedServices(grouped);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto animate-pulse text-primary text-5xl">🩺</div>
          <p className="text-muted-foreground">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-grow">
        {/* Hero */}
        <section className="py-12 md:py-16 border-b border-border bg-secondary/20">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Comprehensive veterinary services designed to meet every need of your beloved pets.
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8 mb-16">
              {Object.entries(groupedServices).map(([category, categoryServices]) => {
                const icon = serviceIconMap[category] || '🩺';
                const mainService = categoryServices[0];
                
                return (
                  <div
                    key={category}
                    className="bg-card rounded-lg p-8 border border-border hover:shadow-lg transition-shadow"
                  >
                    <p className="text-5xl mb-4">{icon}</p>
                    <h3 className="text-2xl font-bold mb-2">{category}</h3>
                    <p className="text-muted-foreground mb-6">
                      {mainService.description || `Professional ${category.toLowerCase()} services for your pets`}
                    </p>

                    <div className="space-y-2">
                      {categoryServices.map((service) => (
                        <div key={service.id} className="flex items-start gap-3">
                          <span className="text-primary font-bold flex-shrink-0">✓</span>
                          <span className="text-sm">{service.service_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Choose Our Services */}
        <section className="py-16 bg-secondary/20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose PAWS Services</h2>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: '👨‍⚕️',
                  title: 'Experienced Veterinarians',
                  desc: 'Board-certified professionals with years of expertise',
                },
                {
                  icon: '🔬',
                  title: 'State-of-the-Art Equipment',
                  desc: 'Latest diagnostic and surgical technology',
                },
                {
                  icon: '⏱️',
                  title: 'Efficient & Quick',
                  desc: 'Minimal wait times and fast results',
                },
                {
                  icon: '💰',
                  title: 'Affordable Pricing',
                  desc: 'Transparent costs with flexible payment options',
                },
                {
                  icon: '🏥',
                  title: '24/7 Emergency Care',
                  desc: 'Available for emergencies any time, any day',
                },
                {
                  icon: '🤝',
                  title: 'Compassionate Care',
                  desc: 'We treat your pet like our own family',
                },
              ].map((reason, idx) => (
                <div key={idx} className="bg-card rounded-lg p-6 border border-border text-center">
                  <p className="text-4xl mb-3">{reason.icon}</p>
                  <h3 className="font-semibold text-lg mb-2">{reason.title}</h3>
                  <p className="text-muted-foreground text-sm">{reason.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Info */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto bg-card rounded-lg p-8 border border-border">
              <h2 className="text-2xl font-bold mb-6">Service Pricing</h2>
              <p className="text-muted-foreground mb-6">
                Our pricing is transparent and competitive. We offer package discounts and wellness plans to help you save on routine care. Contact us for a personalized quote based on your pet's specific needs.
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {services.slice(0, 4).map((service) => (
                  <div key={service.id} className="bg-secondary/30 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{service.service_name}</h4>
                    <p className="text-2xl font-bold text-primary">
                      ${service.base_price.toFixed(2)}
                      {service.requires_specialist && '+'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {service.duration_minutes} minutes
                    </p>
                  </div>
                ))}
              </div>

              <Button asChild className="w-full bg-primary hover:bg-primary/90">
                <Link href="/client/appointments">Book Your Service</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to Schedule Your Pet's Appointment?</h2>
            <p className="text-lg opacity-95 max-w-2xl mx-auto">
              Contact us today to book a consultation or schedule any of our services.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/client/appointments">Book Now</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}