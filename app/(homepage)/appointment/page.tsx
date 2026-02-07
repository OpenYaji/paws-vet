'use client';

import React from "react"

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/auth-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const services = [
  'General Wellness Exam',
  'Vaccination Update',
  'Dental Cleaning',
  'Surgical Procedure',
  'Behavioral Consultation',
  'Emergency Visit',
  'Product Inquiry',
  'Other',
];

const vets = [
  { id: 1, name: 'Dr. Sarah Johnson', specialty: 'Small Animals' },
  { id: 2, name: 'Dr. Michael Chen', specialty: 'Surgery & Orthopedics' },
  { id: 3, name: 'Dr. Emily Rodriguez', specialty: 'Exotic Animals' },
];

const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM',
];

export default function AppointmentPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    petName: '',
    petType: 'dog',
    petBreed: '',
    ownerName: '',
    email: '',
    phone: '',
    service: '',
    veterinarian: '',
    date: '',
    time: '',
    notes: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Check if user is authenticated before confirming
      if (!isAuthenticated) {
        setShowLoginDialog(true);
        return;
      }
      
      setSubmitted(true);
      console.log('Appointment booked:', formData);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        setLoginError(error.message);
        setIsLoggingIn(false);
        return;
      }

      if (data.user) {
        // Update auth state immediately
        setIsAuthenticated(true);
        setShowLoginDialog(false);
        // Clear login form
        setLoginEmail('');
        setLoginPassword('');
        setLoginError('');
        // Auto-submit the form after successful login
        setSubmitted(true);
        console.log('Appointment booked:', formData);
      }
    } catch (err) {
      setLoginError('An error occurred. Please try again.');
      setIsLoggingIn(false);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto bg-card rounded-lg border border-border p-8 text-center space-y-6">
              <div className="text-6xl">✓</div>
              <h1 className="text-3xl font-bold">Appointment Confirmed!</h1>
              <p className="text-muted-foreground text-lg">
                Thank you for booking with PAWS Clinic. We've sent a confirmation email to <strong>{formData.email}</strong>
              </p>

              <div className="bg-secondary/30 rounded-lg p-6 space-y-3 text-left my-8">
                <div>
                  <p className="text-sm text-muted-foreground">Pet Name</p>
                  <p className="font-semibold">{formData.petName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service</p>
                  <p className="font-semibold">{formData.service}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled Date & Time</p>
                  <p className="font-semibold">{formData.date} at {formData.time}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Veterinarian</p>
                  <p className="font-semibold">
                    {vets.find(v => v.id === parseInt(formData.veterinarian))?.name || 'Available'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-muted-foreground">
                  We'll send you a reminder 24 hours before your appointment. If you need to reschedule, please contact us at <a href="tel:+1234567890" className="text-primary font-semibold">(123) 456-7890</a>
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button asChild variant="outline">
                    <Link href="/">Return Home</Link>
                  </Button>
                  <Button asChild className="bg-primary hover:bg-primary/90">
                    <Link href="/services">View Services</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-grow">
        {/* Hero */}
        <section className="py-12 md:py-16 border-b border-border bg-secondary/20">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Book Your Appointment</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Schedule a visit with our veterinarians. It only takes a few minutes!
            </p>
          </div>
        </section>

        {/* Form */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3].map(s => (
                    <div
                      key={s}
                      className={`flex-1 h-2 rounded-full transition-colors ${
                        s <= step ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Step {step} of 3
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Pet Information */}
                {step === 1 && (
                  <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                    <h2 className="text-2xl font-bold mb-6">Tell us about your pet</h2>

                    <div>
                      <label className="block text-sm font-medium mb-2">Pet Name *</label>
                      <Input
                        name="petName"
                        value={formData.petName}
                        onChange={handleChange}
                        placeholder="e.g., Buddy"
                        required
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Pet Type *</label>
                        <select
                          name="petType"
                          value={formData.petType}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background"
                          required
                        >
                          <option value="dog">Dog</option>
                          <option value="cat">Cat</option>
                          <option value="rabbit">Rabbit</option>
                          <option value="bird">Bird</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Breed</label>
                        <Input
                          name="petBreed"
                          value={formData.petBreed}
                          onChange={handleChange}
                          placeholder="e.g., Golden Retriever"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Service Needed *</label>
                      <select
                        name="service"
                        value={formData.service}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background"
                        required
                      >
                        <option value="">Select a service</option>
                        {services.map(svc => (
                          <option key={svc} value={svc}>{svc}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Notes for Veterinarian</label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Any health concerns or special notes..."
                        className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-24"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Owner Information */}
                {step === 2 && (
                  <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                    <h2 className="text-2xl font-bold mb-6">Your information</h2>

                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name *</label>
                      <Input
                        name="ownerName"
                        value={formData.ownerName}
                        onChange={handleChange}
                        placeholder="Your full name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Email Address *</label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Phone Number *</label>
                      <Input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="(123) 456-7890"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Appointment Details */}
                {step === 3 && (
                  <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                    <h2 className="text-2xl font-bold mb-6">Choose your appointment time</h2>

                    <div>
                      <label className="block text-sm font-medium mb-2">Preferred Veterinarian</label>
                      <select
                        name="veterinarian"
                        value={formData.veterinarian}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      >
                        <option value="">Any Available</option>
                        {vets.map(vet => (
                          <option key={vet.id} value={vet.id}>
                            {vet.name} - {vet.specialty}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Preferred Date *</label>
                      <Input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Time Slot *</label>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {timeSlots.map(time => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, time }))}
                            className={`py-2 px-3 rounded-md border transition-colors text-sm font-medium ${
                              formData.time === time
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border hover:border-primary'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-6">
                  {step > 1 && (
                    <Button type="button" variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {step < 3 ? 'Next' : 'Confirm Appointment'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Info */}
        <section className="py-16 bg-secondary/20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <p className="text-3xl mb-2">📞</p>
                <h3 className="font-semibold mb-2">Call Us</h3>
                <a href="tel:+1234567890" className="text-primary hover:underline">
                  (123) 456-7890
                </a>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-sm">123 Pet Street<br/>Veterinary City, VC 12345</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to confirm appointment</DialogTitle>
            <DialogDescription>
              You need to be signed in to book an appointment. Please log in or create an account.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            {loginError && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {loginError}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                placeholder="your@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? 'Signing in...' : 'Sign In & Confirm'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link
              href="/signup"
              className="text-primary hover:underline font-medium"
              onClick={() => setShowLoginDialog(false)}
            >
              Sign up
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
