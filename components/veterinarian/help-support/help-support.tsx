"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Search,
  Calendar,
  PawPrint,
  PillBottle,
  CreditCard,
  UserCog,
  ShieldCheck,
  LifeBuoy,
  Settings2,
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Eye,
  EyeOff,
  FileQuestion,
  AlertTriangle,
  LayoutList,
  CheckCircle2,
} from "lucide-react"

interface HelpArticle {
  id: string
  question: string
  answer: string
  category: string
  enabled: boolean
  archived: boolean
}

interface SuggestedTopic {
  label: string
  icon: React.ReactNode
  query: string
}

const suggestedTopics: SuggestedTopic[] = [
  { label: "Appointments", icon: <Calendar size={18} />, query: "appointment" },
  { label: "Pet Records", icon: <PawPrint size={18} />, query: "pet" },
  { label: "Prescriptions", icon: <PillBottle size={18} />, query: "prescription" },
  { label: "Billing", icon: <CreditCard size={18} />, query: "billing" },
  { label: "Account", icon: <UserCog size={18} />, query: "account" },
  { label: "Security", icon: <ShieldCheck size={18} />, query: "security" },
]

const initialArticles: HelpArticle[] = [
  { id: "1", question: "How do I schedule a new appointment?", answer: "Navigate to My Appointments from the sidebar, then click the 'New Appointment' button. Fill in the pet, owner, date, time, and reason for visit, then confirm the booking.", category: "Appointments", enabled: true, archived: false },
  { id: "2", question: "How do I reschedule or cancel an appointment?", answer: "Go to My Appointments, find the appointment you want to modify, and click on it. You'll see options to reschedule to a new date/time or cancel the appointment with a reason.", category: "Appointments", enabled: true, archived: false },
  { id: "3", question: "How do I add a new pet to the system?", answer: "Go to the Pet Master File from the sidebar and click 'Add New Pet'. Fill in the pet's name, species, breed, weight, and owner information, then save the record.", category: "Pet Records", enabled: true, archived: false },
  { id: "4", question: "How do I view a pet's medical history?", answer: "Navigate to Pet Master File, find the pet using the search bar or filters, and click on the pet's card. You'll see the full medical history including past visits, vaccinations, and prescriptions.", category: "Pet Records", enabled: true, archived: false },
  { id: "5", question: "How do I issue a prescription?", answer: "Go to Prescriptions from the sidebar, click 'Issue Prescription', select the pet and medical record, then fill in the medication name, dosage, frequency, and instructions.", category: "Prescriptions", enabled: true, archived: false },
  { id: "6", question: "How do I record a vaccination?", answer: "Navigate to Vaccinations from the sidebar, click 'Record Vaccination', select the pet, and enter the vaccine name, type, batch number, and next due date.", category: "Pet Records", enabled: true, archived: false },
  { id: "7", question: "How do I update my profile information?", answer: "Go to your Profile page by clicking your avatar in the top-right corner and selecting 'Profile'. You can update your name, phone, specializations, biography, and other professional details.", category: "Account", enabled: true, archived: false },
  { id: "8", question: "How do I change my password?", answer: "Navigate to Settings from the sidebar, then go to the 'Access & Security' tab. Enter your current password and your new password, then click 'Update Password'.", category: "Security", enabled: true, archived: false },
  { id: "9", question: "How do I view billing and invoices?", answer: "Billing information is available through the admin panel. If you need to check invoice details for a specific appointment, contact your clinic administrator for access.", category: "Billing", enabled: true, archived: false },
  { id: "10", question: "How do I start a consultation?", answer: "Go to Consultation from the sidebar. Select an existing appointment or start a walk-in consultation. Record examination findings, diagnosis, and treatment plan during the visit.", category: "Appointments", enabled: true, archived: false },
  { id: "11", question: "How do I capture vitals for incoming patients?", answer: "Navigate to Capture from the sidebar. You'll see a list of patients in the waiting room. Click on a patient to record vitals, assess urgency, and assign a priority level.", category: "Appointments", enabled: true, archived: false },
  { id: "12", question: "How do I enable two-factor authentication?", answer: "Go to Settings > Access & Security. Under the 'Two-Factor Authentication' section, toggle the switch to enable 2FA. Follow the on-screen instructions to set up your verification method.", category: "Security", enabled: true, archived: false },
  { id: "13", question: "How do I change the dashboard theme?", answer: "Navigate to Settings from the sidebar, then go to the 'Themes' tab. You can choose between Light, Dark, or System (auto-detect) modes.", category: "Account", enabled: true, archived: false },
  { id: "14", question: "Who do I contact for technical support?", answer: "For technical issues, contact your clinic administrator first. For system-wide issues, reach out to the PAWS support team via email at support@pawsclinic.com or through the in-app feedback form.", category: "Account", enabled: true, archived: false },
]

const CATEGORIES = ["Appointments", "Pet Records", "Prescriptions", "Billing", "Account", "Security"]

interface ArticleFormState {
  question: string
  answer: string
  category: string
}

const emptyForm: ArticleFormState = { question: "", answer: "", category: CATEGORIES[0] }

type CmsTab = "active" | "archived"

const CATEGORY_COLORS: Record<string, string> = {
  Appointments: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Pet Records": "bg-green-500/10 text-green-600 dark:text-green-400",
  Prescriptions: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  Billing: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  Account: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  Security: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
}

// ── Reusable confirm modal ────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  preview?: React.ReactNode
  note?: React.ReactNode
  confirmLabel: string
  confirmClass?: string
}

function ConfirmDialog({
  open, onClose, onConfirm,
  icon, iconBg, title, description,
  preview, note,
  confirmLabel, confirmClass,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className={`p-2 rounded-full shrink-0 ${iconBg}`}>{icon}</div>
            <div>
              <DialogTitle className="text-base">{title}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {preview && <div className="mt-1">{preview}</div>}
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className={confirmClass} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Article preview chip ──────────────────────────────────────────────────────

function ArticlePreview({ article }: { article: HelpArticle }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mb-1.5 ${CATEGORY_COLORS[article.category] ?? "bg-muted text-muted-foreground"}`}>
        {article.category}
      </span>
      <p className="text-sm font-medium leading-snug">{article.question}</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HelpSupport() {
  const [searchQuery, setSearchQuery] = useState("")
  const [articles, setArticles] = useState<HelpArticle[]>(initialArticles)

  // CMS modal
  const [cmsOpen, setCmsOpen] = useState(false)
  const [cmsTab, setCmsTab] = useState<CmsTab>("active")
  const [cmsSearch, setCmsSearch] = useState("")

  // Add / Edit form modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ArticleFormState>(emptyForm)

  // Confirm modals
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<HelpArticle | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<HelpArticle | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<HelpArticle | null>(null)

  // ── helpers ──────────────────────────────────────────────────────────────

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(article: HelpArticle) {
    setEditingId(article.id)
    setForm({ question: article.question, answer: article.answer, category: article.category })
    setFormOpen(true)
  }

  function requestSave() {
    if (!form.question.trim() || !form.answer.trim()) return
    setSaveConfirmOpen(true)
  }

  function doSave() {
    if (editingId) {
      setArticles((prev) => prev.map((a) => (a.id === editingId ? { ...a, ...form } : a)))
    } else {
      setArticles((prev) => [
        ...prev,
        { id: Date.now().toString(), ...form, enabled: true, archived: false },
      ])
    }
    setSaveConfirmOpen(false)
    setFormOpen(false)
  }

  function doToggle() {
    if (!toggleTarget) return
    setArticles((prev) => prev.map((a) => (a.id === toggleTarget.id ? { ...a, enabled: !a.enabled } : a)))
    setToggleTarget(null)
  }

  function doArchive() {
    if (!archiveTarget) return
    setArticles((prev) =>
      prev.map((a) => (a.id === archiveTarget.id ? { ...a, archived: true, enabled: false } : a))
    )
    setArchiveTarget(null)
  }

  function doRestore() {
    if (!restoreTarget) return
    setArticles((prev) => prev.map((a) => (a.id === restoreTarget.id ? { ...a, archived: false } : a)))
    setRestoreTarget(null)
  }

  // ── derived data ─────────────────────────────────────────────────────────

  const filteredArticles = useMemo(() => {
    const active = articles.filter((a) => a.enabled && !a.archived)
    if (!searchQuery.trim()) return active
    const q = searchQuery.toLowerCase()
    return active.filter(
      (a) =>
        a.question.toLowerCase().includes(q) ||
        a.answer.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    )
  }, [searchQuery, articles])

  const categories = useMemo(() => {
    const cats = new Map<string, HelpArticle[]>()
    for (const a of filteredArticles) {
      cats.set(a.category, [...(cats.get(a.category) || []), a])
    }
    return cats
  }, [filteredArticles])

  const activeArticles = articles.filter((a) => !a.archived)
  const archivedArticles = articles.filter((a) => a.archived)

  const cmsFiltered = useMemo(() => {
    const pool = cmsTab === "active" ? activeArticles : archivedArticles
    if (!cmsSearch.trim()) return pool
    const q = cmsSearch.toLowerCase()
    return pool.filter(
      (a) => a.question.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmsTab, cmsSearch, articles])

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative text-center space-y-2">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-primary/10">
            <LifeBuoy size={32} className="text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Help &amp; Support</h2>
        <p className="text-muted-foreground">Search for answers or browse suggested topics below.</p>
        <Button
          variant="outline"
          size="sm"
          className="absolute top-0 right-0 gap-2"
          onClick={() => setCmsOpen(true)}
        >
          <Settings2 size={15} />
          Manage
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search for help (e.g. appointment, prescription, password)..."
          className="pl-10 h-12 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Suggested Topics */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-2">
          {suggestedTopics.map((topic) => (
            <button
              key={topic.label}
              onClick={() => setSearchQuery(topic.query)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card hover:bg-accent text-sm transition-colors"
            >
              {topic.icon}
              {topic.label}
            </button>
          ))}
        </div>
      )}

      {/* Search Results Info */}
      {searchQuery && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredArticles.length} result{filteredArticles.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
          </p>
          <button onClick={() => setSearchQuery("")} className="text-sm text-primary hover:underline">
            Clear search
          </button>
        </div>
      )}

      {/* FAQ Articles */}
      {filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <Search size={32} className="mb-3" />
            <p className="font-medium">No results found</p>
            <p className="text-sm mt-1">Try a different search term or browse the suggested topics.</p>
          </CardContent>
        </Card>
      ) : (
        Array.from(categories.entries()).map(([category, arts]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {category}
                <Badge variant="secondary" className="text-xs font-normal">{arts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple">
                {arts.map((article) => (
                  <AccordionItem key={article.id} value={article.id}>
                    <AccordionTrigger className="text-sm text-left">{article.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{article.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))
      )}

      {/* ── CMS Modal ─────────────────────────────────────────────────────── */}
      <Dialog open={cmsOpen} onOpenChange={setCmsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          {/* Modal Header */}
          <div className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <LayoutList size={15} className="text-primary" />
                  </div>
                  Help &amp; Support Management
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage FAQ articles — toggle visibility, edit content, or archive outdated entries.
                </p>
              </div>
              <Button size="sm" className="gap-1.5 shrink-0" onClick={openAdd}>
                <Plus size={13} />
                New Article
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 p-1 rounded-lg bg-muted w-fit">
              <button
                onClick={() => setCmsTab("active")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  cmsTab === "active"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Active
                <span className="ml-1.5 text-xs opacity-60">{activeArticles.length}</span>
              </button>
              <button
                onClick={() => setCmsTab("archived")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  cmsTab === "archived"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Archived
                <span className="ml-1.5 text-xs opacity-60">{archivedArticles.length}</span>
              </button>
            </div>
          </div>

          {/* Search inside CMS */}
          <div className="px-6 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
              <Input
                placeholder="Filter articles..."
                className="pl-8 h-8 text-xs"
                value={cmsSearch}
                onChange={(e) => setCmsSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Article List */}
          <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-2">
            {cmsFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                <FileQuestion size={32} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">No articles found</p>
                <p className="text-xs mt-1 opacity-70">
                  {cmsTab === "archived" ? "Nothing has been archived yet." : "Try a different filter or add a new article."}
                </p>
              </div>
            ) : (
              cmsFiltered.map((article) => (
                <div
                  key={article.id}
                  className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                    article.archived
                      ? "bg-muted/30 border-dashed opacity-70"
                      : article.enabled
                      ? "bg-card hover:bg-accent/30"
                      : "bg-muted/20 hover:bg-accent/20"
                  }`}
                >
                  {/* Toggle — only for active articles */}
                  {!article.archived && (
                    <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                      <Switch
                        checked={article.enabled}
                        onCheckedChange={() => setToggleTarget(article)}
                        className="scale-90"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {article.enabled ? "On" : "Off"}
                      </span>
                    </div>
                  )}

                  {/* Archived indicator */}
                  {article.archived && (
                    <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                      <div className="p-1 rounded-md bg-amber-500/10">
                        <Archive size={13} className="text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[article.category] ?? "bg-muted text-muted-foreground"}`}>
                        {article.category}
                      </span>
                      {!article.archived && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${article.enabled ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                          {article.enabled ? <><Eye size={9} /> Visible</> : <><EyeOff size={9} /> Hidden</>}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-medium mt-1.5 leading-snug ${!article.enabled || article.archived ? "text-muted-foreground" : ""}`}>
                      {article.question}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{article.answer}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {article.archived ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => setRestoreTarget(article)}
                      >
                        <ArchiveRestore size={12} />
                        Restore
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(article)}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                          onClick={() => setArchiveTarget(article)}
                        >
                          <Archive size={12} />
                          Archive
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Toggle Confirm Modal ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={doToggle}
        icon={toggleTarget?.enabled ? <EyeOff size={16} className="text-muted-foreground" /> : <Eye size={16} className="text-green-600 dark:text-green-400" />}
        iconBg={toggleTarget?.enabled ? "bg-muted" : "bg-green-500/10"}
        title={toggleTarget?.enabled ? "Hide this article?" : "Make this article visible?"}
        description={
          toggleTarget?.enabled
            ? "This article will no longer appear in Help & Support."
            : "This article will become visible to users in Help & Support."
        }
        preview={toggleTarget ? <ArticlePreview article={toggleTarget} /> : undefined}
        confirmLabel={toggleTarget?.enabled ? "Yes, hide it" : "Yes, make it visible"}
        confirmClass={toggleTarget?.enabled ? "" : "bg-green-600 hover:bg-green-700 text-white"}
      />

      {/* ── Archive Confirm Modal ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={doArchive}
        icon={<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />}
        iconBg="bg-amber-500/10"
        title="Archive this article?"
        description="This will hide the article from Help & Support and move it to the archive."
        preview={archiveTarget ? <ArticlePreview article={archiveTarget} /> : undefined}
        note={<>You can restore it anytime from the <span className="font-medium text-foreground">Archived</span> tab.</>}
        confirmLabel="Yes, archive it"
        confirmClass="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
      />

      {/* ── Restore Confirm Modal ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={doRestore}
        icon={<ArchiveRestore size={16} className="text-primary" />}
        iconBg="bg-primary/10"
        title="Restore this article?"
        description="This will move the article back to Active. You can then toggle its visibility."
        preview={restoreTarget ? <ArticlePreview article={restoreTarget} /> : undefined}
        confirmLabel="Yes, restore it"
        confirmClass="gap-1.5"
      />

      {/* ── Add / Edit Form Modal ─────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? <><Pencil size={15} /> Edit Article</> : <><Plus size={15} /> New Article</>}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingId ? "Update the article details below." : "Fill in the details to add a new help article."}
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-medium">Category</Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="question" className="text-xs font-medium">Question</Label>
              <Input
                id="question"
                placeholder="e.g. How do I reset my password?"
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="answer" className="text-xs font-medium">Answer</Label>
              <Textarea
                id="answer"
                rows={4}
                placeholder="Provide a clear and helpful answer..."
                value={form.answer}
                onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={requestSave}
                disabled={!form.question.trim() || !form.answer.trim()}
              >
                {editingId ? "Save Changes" : "Add Article"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Save Confirm Modal ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={saveConfirmOpen}
        onClose={() => setSaveConfirmOpen(false)}
        onConfirm={doSave}
        icon={<CheckCircle2 size={16} className="text-primary" />}
        iconBg="bg-primary/10"
        title={editingId ? "Save these changes?" : "Add this article?"}
        description={
          editingId
            ? "The article will be updated with the new details you entered."
            : "A new article will be added and made visible in Help & Support."
        }
        preview={
          <div className="rounded-lg border bg-muted/40 p-3">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium mb-1.5 ${CATEGORY_COLORS[form.category] ?? "bg-muted text-muted-foreground"}`}>
              {form.category}
            </span>
            <p className="text-sm font-medium leading-snug">{form.question}</p>
          </div>
        }
        confirmLabel={editingId ? "Yes, save changes" : "Yes, add article"}
        confirmClass="gap-1.5"
      />
    </div>
  )
}
