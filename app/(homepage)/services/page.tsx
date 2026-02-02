import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Services() {
  const services = [
    {
      icon: '💊',
      title: 'General Wellness Exams',
      desc: 'Comprehensive health check-ups and preventive care for pets of all ages',
      details: [
        'Physical examination',
        'Health assessment',
        'Vaccination updates',
        'Parasite prevention',
        'Nutrition consultation',
      ],
    },
    {
      icon: '🦷',
      title: 'Dental Care',
      desc: 'Professional dental cleaning and oral health treatments',
      details: [
        'Professional cleaning',
        'Tooth extractions',
        'Dental X-rays',
        'Oral surgery',
        'Preventive care plans',
      ],
    },
    {
      icon: '🩺',
      title: 'Diagnostic Services',
      desc: 'Advanced imaging and laboratory tests for accurate diagnosis',
      details: [
        'Digital X-rays',
        'Ultrasound imaging',
        'Blood work & lab tests',
        'Pathology services',
        'Quick result turnaround',
      ],
    },
    {
      icon: '💉',
      title: 'Vaccinations',
      desc: 'Complete vaccination programs tailored to your pet',
      details: [
        'Core vaccinations',
        'Rabies vaccine',
        'Bordetella protection',
        'Vaccination records',
        'Booster schedules',
      ],
    },
    {
      icon: '🏥',
      title: 'Surgery & Orthopedics',
      desc: 'Surgical procedures performed by experienced surgeons',
      details: [
        'Spay & neuter',
        'Soft tissue surgery',
        'Orthopedic surgery',
        'Trauma surgery',
        'Anesthesia monitoring',
      ],
    },
    {
      icon: '🧬',
      title: 'Specialized Care',
      desc: 'Treatment for specific conditions and diseases',
      details: [
        'Dermatology',
        'Cardiology care',
        'Behavioral counseling',
        'Geriatric care',
        'Exotic animal care',
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

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
              {services.map((service, idx) => (
                <div key={idx} className="bg-card rounded-lg p-8 border border-border hover:shadow-lg transition-shadow">
                  <p className="text-5xl mb-4">{service.icon}</p>
                  <h3 className="text-2xl font-bold mb-2">{service.title}</h3>
                  <p className="text-muted-foreground mb-6">{service.desc}</p>
                  
                  <div className="space-y-2">
                    {service.details.map((detail, didx) => (
                      <div key={didx} className="flex items-start gap-3">
                        <span className="text-primary font-bold flex-shrink-0">✓</span>
                        <span className="text-sm">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
                <div className="bg-secondary/30 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Basic Exam</h4>
                  <p className="text-2xl font-bold text-primary">$85</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Comprehensive Exam</h4>
                  <p className="text-2xl font-bold text-primary">$125</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Dental Cleaning</h4>
                  <p className="text-2xl font-bold text-primary">$250-500</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Spay/Neuter</h4>
                  <p className="text-2xl font-bold text-primary">$300-600</p>
                </div>
              </div>

              <Button asChild className="w-full bg-primary hover:bg-primary/90">
                <Link href="/appointment">Book Your Service</Link>
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
              <Link href="/appointment">Book Now</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
