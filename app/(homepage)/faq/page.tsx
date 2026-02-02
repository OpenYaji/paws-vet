'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Link from 'next/link';

const faqItems = [
  {
    category: 'General',
    questions: [
      {
        question: 'What are your clinic hours?',
        answer: 'We are open Monday through Friday from 9:00 AM to 5:00 PM, Saturday from 9:00 AM to 2:00 PM, and closed on Sundays. We offer 24/7 emergency services for urgent pet health concerns.',
      },
      {
        question: 'Do you accept walk-in appointments?',
        answer: 'While we welcome walk-ins, we recommend booking appointments online for shorter wait times. Walk-ins are accommodated on a first-come, first-served basis based on our schedule.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards, debit cards, cash, and offers flexible payment plans for larger procedures. We also accept CareCredit for qualified customers.',
      },
      {
        question: 'Do you offer veterinary house calls?',
        answer: 'Yes, we offer house call services for senior pets, anxious animals, or situations where traveling to the clinic is difficult. Please contact us to arrange.',
      },
    ],
  },
  {
    category: 'Services & Procedures',
    questions: [
      {
        question: 'What vaccinations does my pet need?',
        answer: 'Core vaccinations include Rabies and DHPP for dogs, and Rabies and FVRCP for cats. The specific vaccines your pet needs depend on their age, lifestyle, and health status. Our veterinarians will recommend an appropriate vaccination schedule during the first visit.',
      },
      {
        question: 'At what age should I spay or neuter my pet?',
        answer: 'We typically recommend spaying or neutering around 6-8 months of age for most pets. However, the ideal age can vary based on breed and health factors. We will discuss the best timing for your specific pet.',
      },
      {
        question: 'How often should my pet have a dental cleaning?',
        answer: 'Professional dental cleanings are typically recommended annually for most pets. However, some pets may need more frequent cleanings depending on their dental health. Our team will assess your pet\'s teeth and provide personalized recommendations.',
      },
      {
        question: 'What should I expect during surgery?',
        answer: 'We provide pre-operative exams, use modern anesthesia protocols, and monitor your pet closely during and after surgery. We will discuss pre-operative instructions, pain management, and post-operative care with you before the procedure.',
      },
    ],
  },
  {
    category: 'Pet Health',
    questions: [
      {
        question: 'How often should my pet visit the vet?',
        answer: 'Healthy adult pets should visit once annually for preventive care. Puppies, kittens, and senior pets (over 7 years) should visit every 6 months. Pets with health conditions may need more frequent visits.',
      },
      {
        question: 'What should I feed my pet?',
        answer: 'The best diet depends on your pet\'s age, size, health status, and lifestyle. Our veterinarians can provide personalized nutrition recommendations. We stock high-quality pet foods in our clinic.',
      },
      {
        question: 'How can I tell if my pet is sick?',
        answer: 'Common signs of illness include changes in appetite or water intake, lethargy, vomiting, diarrhea, difficulty breathing, or behavioral changes. If you notice any concerning symptoms, contact us promptly.',
      },
      {
        question: 'How do I prevent parasites in my pet?',
        answer: 'We recommend year-round flea, tick, and heartworm prevention. We offer several prescription preventative options. Our team will recommend the best option for your pet\'s lifestyle and health.',
      },
    ],
  },
  {
    category: 'Appointments & Registration',
    questions: [
      {
        question: 'What documents do I need for my first visit?',
        answer: 'Please bring proof of any prior veterinary care, current medications, vaccination records (if available), and insurance information if applicable. Also have information about your pet\'s diet and medical history ready.',
      },
      {
        question: 'Can I schedule online?',
        answer: 'Yes, you can easily schedule appointments through our online booking system. Select your preferred date and time, and fill in your pet\'s information. You\'ll receive a confirmation and reminder emails.',
      },
      {
        question: 'What is your cancellation policy?',
        answer: 'We ask for 24 hours notice for cancellations. Cancellations made with less notice or no-shows may incur a cancellation fee. We understand emergencies happen and will try to accommodate last-minute changes.',
      },
      {
        question: 'Do you offer follow-up consultations?',
        answer: 'Yes, follow-up appointments are available at reduced rates for post-operative visits, medication refills, or ongoing treatment monitoring. These can also be scheduled online.',
      },
    ],
  },
];

export default function FAQ() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-grow">
        {/* Hero */}
        <section className="py-12 md:py-16 border-b border-border bg-secondary/20">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Find answers to common questions about our services, procedures, and pet care.
            </p>
          </div>
        </section>

        {/* FAQ Sections */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {faqItems.map((section, idx) => (
              <div key={idx} className="mb-12 last:mb-0">
                <h2 className="text-2xl font-bold mb-6 text-primary">{section.category}</h2>
                
                <Accordion type="single" collapsible className="w-full space-y-3 mb-8">
                  {section.questions.map((item, qidx) => (
                    <AccordionItem
                      key={qidx}
                      value={`${idx}-${qidx}`}
                      className="bg-card border border-border rounded-lg px-6 hover:shadow-md transition-shadow"
                    >
                      <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary py-4">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pt-2 pb-4">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 bg-secondary/20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto bg-card rounded-lg p-8 border border-border">
              <h2 className="text-2xl font-bold mb-4 text-center">Didn't Find Your Answer?</h2>
              <p className="text-muted-foreground text-center mb-6">
                Our team is here to help! Contact us directly with any questions about your pet's care.
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-2xl mb-2">📞</p>
                  <h3 className="font-semibold mb-1">Call Us</h3>
                  <a href="tel:+1234567890" className="text-primary hover:underline">
                    (123) 456-7890
                  </a>
                </div>
                <div className="text-center">
                  <p className="text-2xl mb-2">✉️</p>
                  <h3 className="font-semibold mb-1">Email Us</h3>
                  <a href="mailto:info@pawsclinic.com" className="text-primary hover:underline">
                    info@pawsclinic.com
                  </a>
                </div>
                <div className="text-center">
                  <p className="text-2xl mb-2">📍</p>
                  <h3 className="font-semibold mb-1">Visit Us</h3>
                  <p className="text-muted-foreground text-sm">123 Pet Street, VC 12345</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to Give Your Pet The Best Care?</h2>
            <p className="text-lg opacity-95 max-w-2xl mx-auto">
              Schedule an appointment with our experienced veterinarians today.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/appointment">Book Your Appointment</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
