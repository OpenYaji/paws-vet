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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/50 rounded-full animate-pulse"></div>
            <div className="absolute inset-1 bg-card rounded-full flex items-center justify-center">
              <div className="text-5xl animate-bounce">🩺</div>
            </div>
          </div>
          <p className="text-lg font-medium text-foreground">Loading services...</p>
          <p className="text-sm text-muted-foreground">Please wait a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-grow">
        {/* Hero */}
        <section className="py-12 md:py-20 border-b border-border bg-gradient-to-br from-primary/10 via-transparent to-primary/5">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="space-y-4">
              <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">🐾 Our Veterinary Services</span>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Our Services</h1>
              <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Comprehensive veterinary services designed to keep your beloved pets healthy and happy.
              </p>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-6 mb-16">
              {Object.entries(groupedServices).map(([category, categoryServices], idx) => {
                const icon = serviceIconMap[category] || '🩺';
                const mainService = categoryServices[0];
                
                return (
                  <div
                    key={category}
                    className="group bg-card rounded-2xl p-8 border border-border hover:shadow-2xl hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                      <p className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300 inline-block">{icon}</p>
                      <h3 className="text-2xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">{category}</h3>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {mainService.description || `Professional ${category.toLowerCase()} services for your pets`}
                      </p>

                      <div className="space-y-3 bg-secondary/30 rounded-lg p-4">
                        {categoryServices.map((service) => (
                          <div key={service.id} className="flex items-start gap-3 group/item">
                            <span className="text-primary font-bold flex-shrink-0 text-lg group-hover/item:scale-125 transition-transform">✓</span>
                            <div className="flex-1">
                              <p className="font-medium">{service.service_name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">₱{service.base_price.toFixed(2)} • {service.duration_minutes} min</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Choose Our Services */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-secondary/30 via-transparent to-secondary/20">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16 space-y-3">
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Why Choose PAWS Services</h2>
              <p className="text-lg text-muted-foreground">Excellence in veterinary care</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
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
                <div 
                  key={idx} 
                  className="group bg-card rounded-2xl p-8 border border-border hover:shadow-xl hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 text-center relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <p className="text-5xl mb-4 group-hover:scale-125 transition-transform duration-300 inline-block">{reason.icon}</p>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{reason.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{reason.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Info */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="max-w-3xl mx-auto bg-gradient-to-br from-card to-card/50 rounded-2xl p-8 border border-border relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="relative z-10 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">💰 Service Pricing</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Our pricing is transparent and competitive. We offer package discounts and wellness plans to help you save on routine care. Contact us for a personalized quote based on your pet's specific needs.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {services.slice(0, 4).map((service) => (
                    <div key={service.id} className="bg-background/50 hover:bg-background/80 rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-all duration-200 group/price">
                      <h4 className="font-semibold mb-2 group-hover/price:text-primary transition-colors">{service.service_name}</h4>
                      <p className="text-3xl font-bold text-primary">
                        ₱{service.base_price.toFixed(2)}
                        {service.requires_specialist && <span className="text-sm ml-1">+</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        ⏱️ {service.duration_minutes} minutes
                      </p>
                    </div>
                  ))}
                </div>

                <Button asChild className="w-full bg-primary hover:bg-primary/90 h-12 text-base font-semibold transition-all duration-200 hover:shadow-lg">
                  <Link href="/client/appointments">📅 Book Your Service</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary-foreground rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary-foreground rounded-full blur-3xl"></div>
          </div>
          <div className="container mx-auto px-4 max-w-4xl text-center space-y-8 relative z-10">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold">Ready to Schedule Your Pet's Appointment?</h2>
              <p className="text-lg opacity-95 max-w-2xl mx-auto leading-relaxed">
                Contact us today to book a consultation or schedule any of our services.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="font-semibold hover:shadow-xl transition-all">
              <Link href="/client/appointments">Book an Appointment →</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}