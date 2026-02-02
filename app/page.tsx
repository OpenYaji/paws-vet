import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 md:order-2">
                <div>
                  <p className="text-primary font-semibold text-sm mb-2">Welcome to PAWS</p>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-balance leading-tight text-foreground">
                    Caring for Your Beloved Pets
                  </h1>
                </div>
                <p className="text-lg text-muted-foreground text-pretty">
                  Experience compassionate veterinary care with state-of-the-art facilities. From routine check-ups to emergency services, we're here for your pet's health and happiness.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                    <Link href="/appointment">Book Appointment</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/services">Learn More</Link>
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-8 border-t border-border">
                  <div>
                    <p className="text-2xl font-bold text-primary">20+</p>
                    <p className="text-sm text-muted-foreground">Years Experience</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">5000+</p>
                    <p className="text-sm text-muted-foreground">Happy Pets</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">24/7</p>
                    <p className="text-sm text-muted-foreground">Emergency Care</p>
                  </div>
                </div>
              </div>

              <div className="md:order-1 flex justify-center">
                <div className="relative w-full max-w-md aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center">
                    <img src="/images/paws.png" alt="PAWS Clinic" className="w-full h-full object-contain p-8" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Preview */}
        <section className="py-16 bg-secondary/30 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Comprehensive veterinary services designed to keep your pets healthy and happy
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { title: 'General Wellness', desc: 'Routine check-ups and preventive care' },
                { title: 'Dental Care', desc: 'Professional cleaning and oral health' },
                { title: 'Diagnostics', desc: 'Advanced imaging and lab services' },
                { title: 'Vaccinations', desc: 'Complete vaccination programs' },
                { title: 'Surgery', desc: 'Surgical procedures with expert care' },
                { title: 'Behavioral', desc: 'Training and behavior consultation' },
              ].map((service, idx) => (
                <div key={idx} className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">{service.title}</h3>
                  <p className="text-muted-foreground text-sm">{service.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button asChild variant="outline" size="lg">
                <Link href="/services">View All Services</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose PAWS Clinic</h2>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-4">
                {[
                  { title: 'Expert Veterinarians', desc: 'Highly trained and certified professionals' },
                  { title: 'Modern Facilities', desc: 'State-of-the-art equipment and technology' },
                  { title: 'Compassionate Care', desc: 'We treat every pet like family' },
                  { title: 'Quick Appointments', desc: 'Easy online booking with minimal wait' },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">✓</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-muted-foreground text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center">
                <div className="relative w-full max-w-sm aspect-square bg-gradient-to-br from-accent/20 to-accent/5 rounded-3xl flex items-center justify-center">
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to Care for Your Pet?</h2>
            <p className="text-lg text-pretty max-w-2xl mx-auto opacity-95">
              Schedule an appointment today and give your beloved pet the professional care they deserve.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/appointment">Book Your Appointment Now</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
