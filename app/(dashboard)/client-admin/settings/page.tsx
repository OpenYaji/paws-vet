'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth-client';
import {
  Settings, Globe, Navigation, HelpCircle,
  ShoppingBag, Save, Plus, Trash2,
  RefreshCw, CheckCircle, AlertCircle, Megaphone,
  HandPlatter, CalendarOff,
} from 'lucide-react';
import { CmsPageHeader } from '@/components/client/cms-page-header';
import { CmsBreadcrumb } from '@/components/client/cms-breadcrumb';

// ── Types ──────────────────────────────────────

interface ClinicSettings {
  id: number;
  clinic_name: string;
  email: string;
  phone: string;
  address: string;
  facebook_url: string;
  instagram_url: string;
  announcement_text: string;
  is_announcement_active: boolean;
  shopee_url: string;
  products_page_title: string;
  products_page_description: string;
  dashboard_about_text: string;
}

interface NavSettings {
  id: number;
  show_dashboard: boolean;
  show_appointments: boolean;
  show_history: boolean;
  show_pets: boolean;
  show_products: boolean;
  show_services: boolean;
  show_transactions: boolean;
  show_faq: boolean;
  show_settings: boolean;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
}

interface Service {
  id: string;
  service_name: string;
  service_category: string;
  description: string | null;
  base_price: number;
  duration_minutes: number | null;
  requires_specialist: boolean;
  is_active: boolean;
}

type ActiveTab = 'clinic' | 'navigation' | 'faq' | 'products' | 'services' | 'closed_dates';

interface ClosedDate {
  id: string;
  closed_date: string;
  reason: string | null;
  created_at: string;
}

const defaultClinicSettings: ClinicSettings = {
  id: 1,
  clinic_name: '',
  email: '',
  phone: '',
  address: '',
  facebook_url: '',
  instagram_url: '',
  announcement_text: '',
  is_announcement_active: false,
  shopee_url: '',
  products_page_title: 'Our Products',
  products_page_description: '',
  dashboard_about_text: '',
};

const defaultNavSettings: NavSettings = {
  id: 1,
  show_dashboard: true,
  show_appointments: true,
  show_history: true,
  show_pets: true,
  show_products: true,
  show_services: true,
  show_transactions: true,
  show_faq: true,
  show_settings: true,
};

// ── Component ──────────────────────────────────

export default function CMSSettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('clinic');
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  const [navSettings, setNavSettings] = useState<NavSettings | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [newClosedDate, setNewClosedDate] = useState('');
  const [newClosedReason, setNewClosedReason] = useState('');
  const [addingClosedDate, setAddingClosedDate] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    service_name: '',
    service_category: '',
    description: '',
    base_price: 0,
    duration_minutes: 60,
    requires_specialist: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);

  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [showAddFaq, setShowAddFaq] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadWarning(null);
    try {
      const [clinicRes, navRes, faqRes, closedRes, servicesRes] = await Promise.all([
        supabase.from('clinic_settings').select('*').order('id', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('nav_settings').select('*').order('id', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('faqs').select('*').eq('is_active', true).order('display_order', { ascending: true }),
        supabase
          .from('closed_dates')
          .select('*')
          .gte('closed_date', new Date().toISOString().slice(0, 10))
          .order('closed_date', { ascending: true }),
        supabase.from('services').select('*').order('service_category', { ascending: true }).order('service_name', { ascending: true }),
      ]);

      if (clinicRes.error || navRes.error) {
        setLoadWarning('Some settings could not be loaded from the database. Showing default values for now.');
      }

      setClinicSettings(clinicRes.data ?? defaultClinicSettings);
      setNavSettings(navRes.data ?? defaultNavSettings);
      if (faqRes.data) setFaqs(faqRes.data);
      setClosedDates(closedRes.data ?? []);
      setServices(servicesRes.data ?? []);
    } catch (e) {
      console.error(e);
      setLoadWarning('Failed to load settings from the database. Showing default values.');
      setClinicSettings(defaultClinicSettings);
      setNavSettings(defaultNavSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save clinic settings ──────────────────────

  const saveClinicSettings = async () => {
    if (!clinicSettings) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('clinic_settings')
        .update({
          clinic_name: clinicSettings.clinic_name,
          email: clinicSettings.email,
          phone: clinicSettings.phone,
          address: clinicSettings.address,
          facebook_url: clinicSettings.facebook_url,
          instagram_url: clinicSettings.instagram_url,
          announcement_text: clinicSettings.announcement_text,
          is_announcement_active: clinicSettings.is_announcement_active,
          shopee_url: clinicSettings.shopee_url,
          products_page_title: clinicSettings.products_page_title,
          products_page_description: clinicSettings.products_page_description,
          dashboard_about_text: clinicSettings.dashboard_about_text,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clinicSettings.id)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        showToast('Clinic settings row is missing. Please ask an admin to seed clinic_settings.', 'error');
        return;
      }

      showToast('Clinic settings saved!');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Save nav settings ─────────────────────────

  const saveNavSettings = async () => {
    if (!navSettings) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('nav_settings')
        .update({ ...navSettings, updated_at: new Date().toISOString() })
        .eq('id', navSettings.id)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        showToast('Navigation settings row is missing. Please ask an admin to seed nav_settings.', 'error');
        return;
      }

      showToast('Navigation settings saved!');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── FAQ actions ───────────────────────────────

  const addFaq = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      showToast('Question and answer are required', 'error');
      return;
    }
    try {
      const { error } = await supabase.from('faqs').insert({
        question: newFaq.question.trim(),
        answer: newFaq.answer.trim(),
        display_order: faqs.length + 1,
        is_active: true,
      });
      if (error) throw error;
      setNewFaq({ question: '', answer: '' });
      setShowAddFaq(false);
      showToast('FAQ added!');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Failed to add FAQ', 'error');
    }
  };

  const updateFaq = async () => {
    if (!editingFaq) return;
    try {
      const { error } = await supabase
        .from('faqs')
        .update({
          question: editingFaq.question,
          answer: editingFaq.answer,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingFaq.id);
      if (error) throw error;
      setEditingFaq(null);
      showToast('FAQ updated!');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Failed to update', 'error');
    }
  };

  const deleteFaq = async (id: string) => {
    try {
      const { error } = await supabase
        .from('faqs')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      showToast('FAQ removed!');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Failed to delete', 'error');
    }
  };

  // ── Service actions ───────────────────────────

  const addService = async () => {
    if (!serviceForm.service_name.trim() || !serviceForm.service_category.trim()) {
      showToast('Name and category are required', 'error');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('services')
      .insert({
        service_name: serviceForm.service_name.trim(),
        service_category: serviceForm.service_category.trim(),
        description: serviceForm.description.trim() || null,
        base_price: serviceForm.base_price,
        duration_minutes: serviceForm.duration_minutes || null,
        requires_specialist: serviceForm.requires_specialist,
        is_active: true,
        created_by: user?.id ?? null,
      });
    if (error) { showToast(error.message || 'Failed to add', 'error'); return; }
    setShowAddService(false);
    setServiceForm({
      service_name: '', service_category: '',
      description: '', base_price: 0,
      duration_minutes: 60, requires_specialist: false,
    });
    showToast('Service added!');
    await load();
  };

  const updateService = async () => {
    if (!editingService) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('services')
      .update({
        service_name: editingService.service_name,
        service_category: editingService.service_category,
        description: editingService.description,
        base_price: editingService.base_price,
        duration_minutes: editingService.duration_minutes,
        requires_specialist: editingService.requires_specialist,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingService.id);
    if (error) { showToast(error.message || 'Failed to update', 'error'); return; }
    setEditingService(null);
    showToast('Service updated!');
    await load();
  };

  const toggleService = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !isActive })
      .eq('id', id);
    if (error) { showToast('Failed to toggle service', 'error'); return; }
    showToast(!isActive ? 'Service activated' : 'Service deactivated');
    await load();
  };

  const addClosedDate = async () => {
    if (!newClosedDate) {
      showToast('Please select a date', 'error');
      return;
    }
    setAddingClosedDate(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('closed_dates')
        .insert({
          closed_date: newClosedDate,
          reason: newClosedReason.trim() || null,
          created_by: user?.id ?? null,
        });
      if (error) {
        if (error.code === '23505') {
          showToast('This date is already closed', 'error');
        } else {
          showToast(error.message || 'Failed to add', 'error');
        }
        return;
      }
      setNewClosedDate('');
      setNewClosedReason('');
      showToast('Date closed successfully!');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Failed to add', 'error');
    } finally {
      setAddingClosedDate(false);
    }
  };

  const removeClosedDate = async (id: string, date: string) => {
    const { error } = await supabase
      .from('closed_dates')
      .delete()
      .eq('id', id);
    if (error) {
      showToast('Failed to remove', 'error');
      return;
    }
    showToast(`${date} reopened!`);
    await load();
  };

  // ── Input helpers ─────────────────────────────

  const inp = 'w-full px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all';
  const textarea = `${inp} resize-vertical min-h-[80px]`;
  const currentClinicSettings = clinicSettings ?? defaultClinicSettings;
  const currentNavSettings = navSettings ?? defaultNavSettings;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-destructive'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <CmsBreadcrumb items={[{ label: 'CMS', href: '/client-admin?tab=clients' }, { label: 'Settings' }]} />
        <CmsPageHeader
          title="CMS Settings"
          description="Control what your clients see and manage information in the client portal"
          actions={
            <div className="hidden rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary md:flex">
              <Settings size={16} />
            </div>
          }
        />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border/80 bg-card p-1">
        {([
          { key: 'clinic', label: 'Clinic Info', icon: Globe },
          { key: 'navigation', label: 'Navigation', icon: Navigation },
          { key: 'faq', label: 'FAQ', icon: HelpCircle },
          { key: 'products', label: 'Products Page', icon: ShoppingBag },
          { key: 'services', label: 'Services', icon: HandPlatter },
          { key: 'closed_dates', label: 'Closed Dates', icon: CalendarOff },
        ] as const).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Icon size={15} />{tab.label}
            </button>
          );
        })}
      </div>

      {loadWarning && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {loadWarning}
        </div>
      )}

      {/* ── CLINIC INFO TAB ── */}
      {activeTab === 'clinic' && (
        <div className="flex flex-col gap-5">

          {/* Announcement Banner */}
          <div className="rounded-2xl border border-border/80 bg-card/95 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-3">
              <Megaphone size={18} className="text-primary" />
              <div>
                <h2 className="text-base font-bold">Announcement Banner</h2>
                <p className="text-xs text-muted-foreground">
                  Shows at the top of the client portal when active
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {clinicSettings.is_announcement_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => setClinicSettings(s => ({ ...(s ?? defaultClinicSettings), is_announcement_active: !(s ?? defaultClinicSettings).is_announcement_active }))}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${
                    currentClinicSettings.is_announcement_active ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    currentClinicSettings.is_announcement_active ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <textarea
                className={textarea}
                value={currentClinicSettings.announcement_text ?? ''}
                onChange={e => setClinicSettings(s => ({ ...(s ?? defaultClinicSettings), announcement_text: e.target.value }))}
                placeholder="Announcement message..."
                rows={2}
              />
            </div>
          </div>

          {/* Basic Info */}
          <div className="rounded-2xl border border-border/80 bg-card/95 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold">Basic Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Clinic Name</label>
                <input className={inp}
                  value={currentClinicSettings.clinic_name ?? ''}
                  onChange={e => setClinicSettings(s => ({ ...(s ?? defaultClinicSettings), clinic_name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Phone Number</label>
                <input className={inp}
                  value={currentClinicSettings.phone ?? ''}
                  onChange={e => setClinicSettings(s => ({ ...(s ?? defaultClinicSettings), phone: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Email Address</label>
                <input className={inp} type="email"
                  value={currentClinicSettings.email ?? ''}
                  onChange={e => setClinicSettings(s => ({ ...(s ?? defaultClinicSettings), email: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Address</label>
                <input className={inp}
                  value={currentClinicSettings.address ?? ''}
                  onChange={e => setClinicSettings(s => ({ ...(s ?? defaultClinicSettings), address: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Facebook URL</label>
                <input className={inp}
                  value={currentClinicSettings.facebook_url ?? ''}
                  onChange={e => setClinicSettings(s => ({ ...(s ?? defaultClinicSettings), facebook_url: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Instagram URL</label>
                <input className={inp}
                  value={currentClinicSettings.instagram_url ?? ''}
                  onChange={e => setClinicSettings(s => ({ ...(s ?? defaultClinicSettings), instagram_url: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-semibold">Dashboard &ldquo;About PAWS&rdquo; Text</label>
                <textarea className={textarea}
                  value={currentClinicSettings.dashboard_about_text ?? ''}
                  onChange={e => setClinicSettings(s => ({ ...(s ?? defaultClinicSettings), dashboard_about_text: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveClinicSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-55"
            >
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              Save Clinic Info
            </button>
          </div>
        </div>
      )}

      {/* ── NAVIGATION TAB ── */}
      {activeTab === 'navigation' && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border/80 bg-card/95 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold">Client Sidebar Navigation</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle which items appear in the client sidebar
              </p>
            </div>
            <div className="p-6 flex flex-col gap-3">
              {([
                { key: 'show_dashboard', label: 'Dashboard', desc: 'Main stats and quick actions' },
                { key: 'show_appointments', label: 'Appointments', desc: 'Booking and current appointments' },
                { key: 'show_history', label: 'History', desc: 'Past appointment history' },
                { key: 'show_pets', label: 'My Pets', desc: 'Pet profile management' },
                { key: 'show_products', label: 'Products', desc: 'Shopee store redirect page' },
                { key: 'show_services', label: 'Services', desc: 'Clinic services listing' },
                { key: 'show_transactions', label: 'Transactions', desc: 'Payment history' },
                { key: 'show_faq', label: 'FAQ', desc: 'Frequently asked questions' },
                { key: 'show_settings', label: 'Settings', desc: 'Client account settings' },
              ] as const).map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-accent/30 rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${currentNavSettings[item.key] ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNavSettings(s => ({ ...(s ?? defaultNavSettings), [item.key]: !(s ?? defaultNavSettings)[item.key] }))}
                    className={`w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${
                      currentNavSettings[item.key] ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      currentNavSettings[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={saveNavSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-55"
            >
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              Save Navigation
            </button>
          </div>
        </div>
      )}

      {/* ── FAQ TAB ── */}
      {activeTab === 'faq' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {faqs.length} active question{faqs.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setShowAddFaq(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus size={15} /> Add Question
            </button>
          </div>

          {/* Add FAQ form */}
          {showAddFaq && (
            <div className="bg-card rounded-2xl border-2 border-primary/30 shadow-sm p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold">New FAQ Item</h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Question
                </label>
                <input className={inp}
                  value={newFaq.question}
                  onChange={e => setNewFaq(f => ({ ...f, question: e.target.value }))}
                  placeholder="Enter the question..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Answer
                </label>
                <textarea className={textarea}
                  value={newFaq.answer}
                  onChange={e => setNewFaq(f => ({ ...f, answer: e.target.value }))}
                  placeholder="Enter the answer..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowAddFaq(false); setNewFaq({ question: '', answer: '' }); }}
                  className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={addFaq}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
                >
                  Add FAQ
                </button>
              </div>
            </div>
          )}

          {/* FAQ list */}
          {faqs.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
              <HelpCircle size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold">No FAQs yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first question above</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {faqs.map((faq, idx) => (
                <div key={faq.id} className="rounded-2xl border border-border/80 bg-card/95 shadow-sm overflow-hidden">
                  {editingFaq?.id === faq.id ? (
                    <div className="p-5 flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Question
                        </label>
                        <input className={inp}
                          value={editingFaq.question}
                          onChange={e => setEditingFaq(f => f ? { ...f, question: e.target.value } : f)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Answer
                        </label>
                        <textarea className={textarea}
                          value={editingFaq.answer}
                          onChange={e => setEditingFaq(f => f ? { ...f, answer: e.target.value } : f)}
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingFaq(null)}
                          className="px-4 py-2 rounded-lg border border-border hover:bg-accent text-sm font-semibold transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={updateFaq}
                          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{faq.question}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingFaq(faq)}
                            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-150 text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmModal({
                              title: 'Delete FAQ',
                              message: `Are you sure you want to delete this question? This action cannot be undone.`,
                              onConfirm: () => deleteFaq(faq.id),
                            })}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-all duration-150"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCTS TAB ── */}
      {activeTab === 'products' && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border/80 bg-card/95 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold">Products Page Content</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Controls what clients see on the Products page
              </p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Shopee Store URL</label>
                <input className={inp}
                  value={currentClinicSettings.shopee_url ?? ''}
                  onChange={e => setClinicSettings(s => ({ ...(s ?? defaultClinicSettings), shopee_url: e.target.value }))}
                  placeholder="https://ph.shp.ee/..."
                />
                <p className="text-xs text-muted-foreground">The link the &ldquo;Shop Now&rdquo; button opens</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Page Title</label>
                <input className={inp}
                  value={currentClinicSettings.products_page_title ?? ''}
                  onChange={e => setClinicSettings(s => ({ ...(s ?? defaultClinicSettings), products_page_title: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Page Description</label>
                <textarea className={textarea}
                  value={currentClinicSettings.products_page_description ?? ''}
                  onChange={e => setClinicSettings(s => ({ ...(s ?? defaultClinicSettings), products_page_description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={saveClinicSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-55"
            >
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              Save Products Page
            </button>
          </div>
        </div>
      )}

      {/* ── SERVICES TAB ── */}
      {activeTab === 'services' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {services.filter(s => s.is_active).length} active
              &nbsp;&middot;&nbsp;
              {services.filter(s => !s.is_active).length} inactive
            </p>
            <button
              onClick={() => setShowAddService(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus size={15} /> Add Service
            </button>
          </div>

          {/* Add Service Form */}
          {showAddService && (
            <div className="bg-card rounded-2xl border-2 border-primary/30 shadow-sm p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold">New Service</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Service Name *
                  </label>
                  <input className={inp}
                    value={serviceForm.service_name}
                    onChange={e => setServiceForm(f => ({ ...f, service_name: e.target.value }))}
                    placeholder="e.g. Spay / Neuter"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Category *
                  </label>
                  <input className={inp}
                    value={serviceForm.service_category}
                    onChange={e => setServiceForm(f => ({ ...f, service_category: e.target.value }))}
                    placeholder="e.g. Surgery"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Base Price (&#8369;)
                  </label>
                  <input className={inp} type="number" min="0"
                    value={serviceForm.base_price}
                    onChange={e => setServiceForm(f => ({ ...f, base_price: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Duration (minutes)
                  </label>
                  <input className={inp} type="number" min="1"
                    value={serviceForm.duration_minutes}
                    onChange={e => setServiceForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Description
                  </label>
                  <textarea className={textarea}
                    value={serviceForm.description}
                    onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Optional description..."
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input type="checkbox"
                    id="requiresSpecialist"
                    checked={serviceForm.requires_specialist}
                    onChange={e => setServiceForm(f => ({ ...f, requires_specialist: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  <label htmlFor="requiresSpecialist" className="text-sm font-medium cursor-pointer">
                    Requires specialist veterinarian
                  </label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddService(false)}
                  className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-accent text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={addService}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
                >
                  Add Service
                </button>
              </div>
            </div>
          )}

          {/* Grouped by category */}
          {Object.entries(
            services.reduce((acc, s) => {
              const cat = s.service_category;
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(s);
              return acc;
            }, {} as Record<string, Service[]>)
          ).map(([category, items]) => (
            <div key={category} className="rounded-2xl border border-border/80 bg-card/95 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-accent/30 flex items-center justify-between">
                <h3 className="text-sm font-bold">{category}</h3>
                <span className="text-xs text-muted-foreground">
                  {items.filter(s => s.is_active).length}/{items.length} active
                </span>
              </div>
              <div className="divide-y divide-border">
                {items.map(service => (
                  <div key={service.id} className="p-4">
                    {editingService?.id === service.id ? (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground font-medium">Name</label>
                            <input className={inp}
                              value={editingService.service_name}
                              onChange={e => setEditingService(s => s ? { ...s, service_name: e.target.value } : s)}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground font-medium">Category</label>
                            <input className={inp}
                              value={editingService.service_category}
                              onChange={e => setEditingService(s => s ? { ...s, service_category: e.target.value } : s)}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground font-medium">Price (&#8369;)</label>
                            <input className={inp} type="number"
                              value={editingService.base_price}
                              onChange={e => setEditingService(s => s ? { ...s, base_price: Number(e.target.value) } : s)}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground font-medium">Duration (min)</label>
                            <input className={inp} type="number"
                              value={editingService.duration_minutes ?? ''}
                              onChange={e => setEditingService(s => s ? { ...s, duration_minutes: Number(e.target.value) } : s)}
                            />
                          </div>
                          <div className="flex flex-col gap-1 col-span-2">
                            <label className="text-xs text-muted-foreground font-medium">Description</label>
                            <textarea className={textarea} rows={2}
                              value={editingService.description ?? ''}
                              onChange={e => setEditingService(s => s ? { ...s, description: e.target.value } : s)}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingService(null)}
                            className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-sm font-semibold transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={updateService}
                            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-semibold ${!service.is_active ? 'text-muted-foreground line-through' : ''}`}>
                              {service.service_name}
                            </p>
                            {!service.is_active && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                INACTIVE
                              </span>
                            )}
                            {service.requires_specialist && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                SPECIALIST
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs font-bold text-primary">
                              &#8369;{service.base_price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                            {service.duration_minutes && (
                              <span className="text-xs text-muted-foreground">
                                {service.duration_minutes} min
                              </span>
                            )}
                            {service.description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {service.description}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingService(service)}
                            className="px-2.5 py-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-semibold transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleService(service.id, service.is_active)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              service.is_active
                                ? 'hover:bg-red-50 text-red-600 dark:hover:bg-red-900/20'
                                : 'hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-900/20'
                            }`}
                          >
                            {service.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CLOSED DATES TAB ── */}
      {activeTab === 'closed_dates' && (
        <div className="flex flex-col gap-5">

          {/* Add new closed date */}
          <div className="rounded-2xl border border-border/80 bg-card/95 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold">
                Close a Specific Date
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Block a specific date from accepting bookings.
              </p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">
                    Date to Close <span className="text-destructive">
                      *
                    </span>
                  </label>
                  <input
                    type="date"
                    className={inp}
                    value={newClosedDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => setNewClosedDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">
                    Reason (optional)
                  </label>
                  <input
                    className={inp}
                    value={newClosedReason}
                    onChange={e => setNewClosedReason(e.target.value)}
                    placeholder="e.g. Holiday, Staff Training..."
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={addClosedDate}
                  disabled={addingClosedDate || !newClosedDate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-55"
                >
                  {addingClosedDate
                    ? <RefreshCw size={15} className="animate-spin" />
                    : <CalendarOff size={15} />}
                  Close This Date
                </button>
              </div>
            </div>
          </div>

          {/* List of closed dates */}
          <div className="rounded-2xl border border-border/80 bg-card/95 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">
                  Upcoming Closed Dates
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  These dates are blocked from client booking
                </p>
              </div>
              <span className="bg-destructive/10 text-destructive text-xs font-bold px-2.5 py-1 rounded-full">
                {closedDates.length} closed
              </span>
            </div>
            {closedDates.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <CalendarOff size={28} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">
                  No upcoming closed dates
                </p>
                <p className="text-xs mt-1">
                  All future dates are open for booking
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {closedDates.map(cd => (
                  <div key={cd.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                        <CalendarOff size={18} className="text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">
                          {new Date(cd.closed_date + 'T00:00:00')
                            .toLocaleDateString('en-PH', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cd.reason ?? 'No reason provided'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeClosedDate(
                        cd.id, cd.closed_date
                      )}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20 transition-all duration-150"
                    >
                      Reopen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmModal(null)} />
          <div className="relative z-10 bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent text-foreground transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-all duration-150 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

