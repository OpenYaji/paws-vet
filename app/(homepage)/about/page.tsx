import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-grow">
        {/* Hero */}
        <section className="py-12 md:py-16 border-b border-border bg-secondary/20">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">About PAWS Clinic</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Dedicated to providing exceptional veterinary care for over two decades.
            </p>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    PAWS Clinic was founded in 2003 with a simple mission: to provide the highest quality veterinary care while treating every pet like family. What started as a small neighborhood clinic has grown into a trusted institution in our community.
                  </p>
                  <p>
                    Our journey has been fueled by our passion for animals and our commitment to continuous learning and improvement. We've invested in the latest technology and trained our team with the most current veterinary practices.
                  </p>
                  <p>
                    Today, we're proud to serve thousands of pets and their families, maintaining the same values of compassion and excellence that defined our founding day.
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="relative w-full max-w-md aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center">
                  <div className="text-8xl">📖</div>
                </div>
              </div>
            </div>

            {/* Mission & Vision */}
            <div className="grid md:grid-cols-2 gap-8 my-16">
              <div className="bg-card rounded-lg p-8 border border-border">
                <h3 className="text-2xl font-bold mb-4 text-primary">Our Mission</h3>
                <p className="text-muted-foreground">
                  To deliver compassionate, professional veterinary care that enhances the health and wellbeing of pets while providing reassurance and support to their families.
                </p>
              </div>
              <div className="bg-card rounded-lg p-8 border border-border">
                <h3 className="text-2xl font-bold mb-4 text-primary">Our Vision</h3>
                <p className="text-muted-foreground">
                  To be the most trusted veterinary clinic in the region, known for excellence, innovation, and genuine care for every animal that walks through our doors.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 bg-secondary/20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Our Expert Team</h2>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'Dr. Sarah Johnson', role: 'Chief Veterinarian', specialty: 'Small Animals' },
                { name: 'Dr. Michael Chen', role: 'Senior Veterinarian', specialty: 'Surgery & Orthopedics' },
                { name: 'Dr. Emily Rodriguez', role: 'Veterinary Surgeon', specialty: 'Exotic Animals' },
              ].map((member, idx) => (
                <div key={idx} className="bg-card rounded-lg p-6 border border-border text-center">
                  <div className="w-24 h-24 rounded-full bg-primary/20 mx-auto mb-4 flex items-center justify-center text-4xl">
                    👨‍⚕️
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{member.name}</h3>
                  <p className="text-primary text-sm font-medium mb-2">{member.role}</p>
                  <p className="text-muted-foreground text-sm">{member.specialty}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Our Core Values</h2>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { icon: '❤️', title: 'Compassion', desc: 'Genuine care for animals and their families' },
                { icon: '🎯', title: 'Excellence', desc: 'Highest standards in veterinary care' },
                { icon: '🤝', title: 'Integrity', desc: 'Honest and transparent communication' },
                { icon: '🔬', title: 'Innovation', desc: 'Latest technology and techniques' },
              ].map((value, idx) => (
                <div key={idx} className="text-center p-6">
                  <p className="text-5xl mb-4">{value.icon}</p>
                  <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl font-bold">Experience the PAWS Difference</h2>
            <p className="text-lg opacity-95 max-w-2xl mx-auto">
              Schedule a visit with our team today and discover why pet owners trust us with their beloved companions.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/appointment">Book Appointment</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
