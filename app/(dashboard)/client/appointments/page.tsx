'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/auth-client';
import {
  Calendar,
  Heart,
  Clock,
  PawPrint,
  History,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

interface CurrentAppointment {
  id: string;
  appointment_number: string;
  scheduled_start: string;
  scheduled_end: string;
  appointment_status: string;
  reason_for_visit: string;
  is_emergency: boolean;
  pets?: { name: string; species: string; breed: string } | { name: string; species: string; breed: string }[] | null;
}

export default function ClientAppointmentsPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentAppointments, setCurrentAppointments] = useState<CurrentAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [outreachAvailable, setOutreachAvailable] = useState(false);
  const [checkingOutreach, setCheckingOutreach] = useState(true);

  useEffect(() => {
    fetchClientData();
    checkOutreachAvailability();
  }, []);

  useEffect(() => {
    if (clientId) {
      fetchCurrentAppointments(clientId);
    }
  }, [clientId]);

  const checkOutreachAvailability = async () => {
    setCheckingOutreach(true);
    try {
      const { data, error } = await supabase
        .from('outreach_programs')
        .select('id')
        .eq('is_open', true)
        .eq('is_full', false)
        .limit(1);
      if (!error && data && data.length > 0) {
        setOutreachAvailable(true);
      }
    } catch {
      setOutreachAvailable(false);
    } finally {
      setCheckingOutreach(false);
    }
  };

  const fetchClientData = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        setLoading(false);
        return;
      }

      if (data) {
        setClientId(data.id);
      } else {
        const { data: newProfile, error: createError } = await supabase
          .from('client_profiles')
          .insert({
            user_id: user.id,
            first_name: user.email?.split('@')[0] || 'User',
            last_name: '',
            phone: '+10000000000',
            address_line1: 'N/A',
            city: 'N/A',
            state: 'N/A',
            zip_code: '00000',
            communication_preference: 'email',
          })
          .select('id')
          .single();
        if (!createError && newProfile) setClientId(newProfile.id);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentAppointments = async (cId: string) => {
    setLoadingAppointments(true);
    try {
      const { data: petsData } = await supabase
        .from('pets')
        .select('id')
        .eq('owner_id', cId);

      if (!petsData || petsData.length === 0) {
        setCurrentAppointments([]);
        return;
      }

      const petIds = petsData.map((p: any) => p.id);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_number,
          scheduled_start,
          scheduled_end,
          appointment_status,
          reason_for_visit,
          is_emergency,
          pets!appointments_pet_id_fkey (
            name,
            species,
            breed
          )
        `)
        .in('pet_id', petIds)
        .in('appointment_status', ['pending', 'confirmed'])
        .order('scheduled_start', { ascending: true });

      if (error) return;
      setCurrentAppointments((data || []) as unknown as CurrentAppointment[]);
    } catch {
      // silent
    } finally {
      setLoadingAppointments(false);
    }
  };

  return (
    <main className="p-6 space-y-8">
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <PawPrint size={22} className="text-primary" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Appointments
          </h1>
        </div>
        <p className="text-lg text-muted-foreground ml-[52px]">Track and manage your pet&apos;s appointments</p>
      </div>

      {/* Current / Upcoming Appointments */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Current Appointments</h2>
            {!loadingAppointments && currentAppointments.length > 0 && (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {currentAppointments.length} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (clientId) fetchCurrentAppointments(clientId); checkOutreachAvailability(); }}
              className="p-2 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150"
              aria-label="Refresh appointments"
            >
              <RefreshCw size={14} className={loadingAppointments ? 'animate-spin' : ''} />
            </button>
            <Link
              href="/client/appointments/history"
              className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <History size={14} /> View History
            </Link>
          </div>
        </div>

        {loadingAppointments ? (
          <div className="flex items-center gap-3 text-muted-foreground text-sm py-4">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Loading appointments&hellip;
          </div>
        ) : currentAppointments.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center text-muted-foreground">
            <CalendarIcon size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No current appointments</p>
            <p className="text-sm mt-1">Book an appointment below to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentAppointments.map((apt) => {
              const isPending = apt.appointment_status === 'pending';
              const cardCls = isPending
                ? 'border-l-yellow-500 bg-yellow-50/40 dark:bg-yellow-900/10'
                : 'border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-900/10';
              const badgeCls = isPending
                ? 'bg-amber-700 text-white dark:bg-amber-500 dark:text-white'
                : 'bg-emerald-700 text-white dark:bg-emerald-500 dark:text-white';
              const badgeLabel = isPending ? 'Pending' : 'Confirmed';
              const isOutreach = apt.reason_for_visit?.startsWith('Outreach');
              const typeBadgeCls = isOutreach
                ? 'bg-violet-700 text-white dark:bg-violet-500 dark:text-white'
                : 'bg-blue-700 text-white dark:bg-blue-500 dark:text-white';
              const typeLabel = isOutreach ? 'Outreach' : 'Regular';
              const pet = apt.pets ? (Array.isArray(apt.pets) ? apt.pets[0] : apt.pets) : null;

              return (
                <div
                  key={apt.id}
                  className={`rounded-2xl border border-border border-l-4 ${cardCls} p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-background/70 border border-border flex items-center justify-center flex-shrink-0">
                          <CalendarIcon size={18} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {new Date(apt.scheduled_start).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              timeZone: 'Asia/Manila',
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock size={11} />
                            {new Date(apt.scheduled_start).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Manila',
                            })}
                            {' \u2013 '}
                            {new Date(apt.scheduled_end).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Manila',
                            })}
                          </p>
                        </div>
                      </div>

                      <p className="font-bold text-foreground">{apt.reason_for_visit}</p>

                      {pet && (
                        <div className="inline-flex items-center gap-2 bg-background/70 border border-border rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground">
                          <PawPrint size={12} className="text-primary" />
                          <span className="font-bold text-sm text-foreground">
                            {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                            {' '}{pet.name}
                          </span>
                          {pet.breed && (
                            <>
                              <span className="text-muted-foreground">&bull;</span>
                              <span>{pet.breed}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row sm:flex-col items-start sm:items-end gap-3">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${typeBadgeCls}`}>
                          {typeLabel}
                        </span>
                        <span className={`rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${badgeCls}`}>
                          {badgeLabel}
                        </span>
                        {apt.is_emergency && (
                          <span className="rounded-full px-3 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
                            🚨 Emergency
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-0.5">
                          Appt #
                        </p>
                        <p className="text-sm font-bold font-mono text-foreground">
                          {apt.appointment_number}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Book New */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Book New Appointment</h2>
          <p className="text-muted-foreground">
            Choose the type of appointment you&apos;d like to schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 — Regular Appointment */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar size={24} className="text-primary" />
              </div>
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">₱500</span>
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-bold">Book Regular Appointment</h3>
              <p className="text-sm text-muted-foreground">
                Schedule a Kapon/Neuter procedure. &#8369;500 for all pets.
              </p>
            </div>
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 w-full"
            >
              <Link
                href="/client/appointments/regular"
                className="flex items-center justify-center gap-2"
              >
                Book Now <ChevronRight size={16} />
              </Link>
            </Button>
          </div>

          {/* Card 2 — Outreach Program */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                <Heart size={24} className="text-pink-500" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full">Free / ₱500</span>
                {!checkingOutreach && !outreachAvailable && (
                  <span className="text-xs font-semibold bg-muted text-muted-foreground rounded-full px-3 py-1">
                    Currently Unavailable
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-bold">Outreach Program</h3>
              <p className="text-sm text-muted-foreground">
                Free for Aspin/Puspin. &#8369;500 for breeds. Only available when a program is open.
              </p>
            </div>
            {checkingOutreach ? (
              <Button disabled className="w-full">
                <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
                Checking availability&hellip;
              </Button>
            ) : outreachAvailable ? (
              <Button
                asChild
                className="bg-primary text-primary-foreground hover:opacity-90 active:scale-95 w-full"
              >
                <Link
                  href="/client/appointments/outreach"
                  className="flex items-center justify-center gap-2"
                >
                  Check Availability <ChevronRight size={16} />
                </Link>
              </Button>
            ) : (
              <Button disabled className="w-full">
                No Open Programs
              </Button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
