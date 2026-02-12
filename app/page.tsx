"use client";
import {useState,useEffect} from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Stethoscope, Syringe, Activity, Pill, Scissors, Heart } from 'lucide-react';

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const images = [
    '/images/1.png',
    '/images/2.png',
    '/images/3.png',
    '/images/4.png',
    '/images/5.png',
  ];

  // Auto-play carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-12 md:py-20 overflow-hidden">
          <div className="container mx-auto px-4 -mt-8">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left Content - Desktop */}
              <div className="hidden md:block space-y-6 text-left">
                <div>
                  <p className="text-primary font-semibold text-lg md:text-xl mb-2">Welcome to PAWS</p>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                    Caring for Your Beloved Pets
                  </h1>
                </div>
                
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Experience compassionate veterinary care with state-of-the-art facilities. From routine check-ups to emergency services, we're here for your pet's health and happiness.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-start">
                  <Button asChild size="lg" className="bg-primary hover:bg-primary/90 rounded-xl px-8 w-full sm:w-auto">
                    <Link href="/appointment">Book Appointment</Link>
                  </Button>
                  
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-xl">
                    <Link href="/services" className="flex items-center gap-2">
                      <span>Learn More</span>
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden space-y-6 text-center">
                {/* Title */}
                <div>
                  <p className="text-primary font-semibold text-lg mb-2">Welcome to PAWS</p>
                  <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                    Caring for Your Beloved Pets
                  </h1>
                </div>

                {/* Image Carousel */}
                <div className="relative flex justify-center items-center min-h-[300px] sm:min-h-[400px] pb-12">
                  <div className="relative w-full max-w-xs sm:max-w-sm aspect-square flex items-center justify-center">
                    <div className="relative w-full h-full">
                      {images.map((image, index) => (
                        <div
                          key={index}
                          className={`absolute inset-0 transition-opacity duration-700 ${
                            index === currentSlide ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          <img
                            src={image}
                            alt={`PAWS Pet ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentSlide(index)}
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            index === currentSlide
                              ? 'bg-primary w-8'
                              : 'bg-primary/30 hover:bg-primary/50'
                          }`}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-base text-muted-foreground leading-relaxed">
                  Experience compassionate veterinary care with state-of-the-art facilities. From routine check-ups to emergency services, we're here for your pet's health and happiness.
                </p>

                {/* Buttons */}
                <div className="flex flex-col gap-4 pt-4">
                  <Button asChild size="lg" className="bg-primary hover:bg-primary/90 rounded-xl px-8 w-full">
                    <Link href="/appointment">Book Appointment</Link>
                  </Button>
                  
                  <Button asChild size="lg" variant="outline" className="w-full rounded-xl">
                    <Link href="/services" className="flex items-center gap-2">
                      <span>Learn More</span>
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right Image Carousel Section - Desktop */}
              <div className="hidden md:flex relative justify-center items-center min-h-[500px]">
                <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {images.map((image, index) => (
                      <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-700 ${
                          index === currentSlide ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`PAWS Pet ${index + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          index === currentSlide
                            ? 'bg-primary w-8'
                            : 'bg-primary/30 hover:bg-primary/50'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Preview */}
        <section className="py-20 bg-secondary/30 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <p className="text-primary font-semibold text-lg mb-3">What We Offer</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Comprehensive veterinary services designed to keep your pets healthy and happy
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {[
                { 
                  icon: <Stethoscope className="w-8 h-8" />,
                  title: 'General Wellness', 
                  desc: 'Routine check-ups, health screenings, and preventive care to keep your pet in optimal health',
                  color: 'bg-blue-500/10 text-blue-600'
                },
                { 
                  icon: <Heart className="w-8 h-8" />,
                  title: 'Dental Care', 
                  desc: 'Professional cleaning, extractions, and comprehensive oral health maintenance',
                  color: 'bg-pink-500/10 text-pink-600'
                },
                { 
                  icon: <Activity className="w-8 h-8" />,
                  title: 'Diagnostics', 
                  desc: 'Advanced imaging, laboratory services, and comprehensive diagnostic solutions',
                  color: 'bg-green-500/10 text-green-600'
                },
                { 
                  icon: <Syringe className="w-8 h-8" />,
                  title: 'Vaccinations', 
                  desc: 'Complete vaccination programs tailored to your pet\'s age and lifestyle needs',
                  color: 'bg-purple-500/10 text-purple-600'
                },
                { 
                  icon: <Scissors className="w-8 h-8" />,
                  title: 'Surgery', 
                  desc: 'Expert surgical procedures with modern equipment and compassionate post-op care',
                  color: 'bg-orange-500/10 text-orange-600'
                },
                { 
                  icon: <Pill className="w-8 h-8" />,
                  title: 'Behavioral', 
                  desc: 'Professional training guidance and behavior consultation services',
                  color: 'bg-teal-500/10 text-teal-600'
                },
              ].map((service, idx) => (
                <div 
                  key={idx} 
                  className="group bg-card rounded-2xl p-8 border border-border hover:shadow-2xl hover:border-primary/50 transition-all duration-300 hover:-translate-y-2"
                >
                  <div className={`w-16 h-16 rounded-xl ${service.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    {service.icon}
                  </div>
                  <h3 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{service.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button asChild variant="outline" size="lg" className="rounded-xl px-8">
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
