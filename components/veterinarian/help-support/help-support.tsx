"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Search,
  Calendar,
  PawPrint,
  PillBottle,
  CreditCard,
  UserCog,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react"

interface HelpArticle {
  id: string
  question: string
  answer: string
  category: string
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

const helpArticles: HelpArticle[] = [
  {
    id: "1",
    question: "How do I schedule a new appointment?",
    answer:
      "Navigate to My Appointments from the sidebar, then click the 'New Appointment' button. Fill in the pet, owner, date, time, and reason for visit, then confirm the booking.",
    category: "Appointments",
  },
  {
    id: "2",
    question: "How do I reschedule or cancel an appointment?",
    answer:
      "Go to My Appointments, find the appointment you want to modify, and click on it. You'll see options to reschedule to a new date/time or cancel the appointment with a reason.",
    category: "Appointments",
  },
  {
    id: "3",
    question: "How do I add a new pet to the system?",
    answer:
      "Go to the Pet Master File from the sidebar and click 'Add New Pet'. Fill in the pet's name, species, breed, weight, and owner information, then save the record.",
    category: "Pet Records",
  },
  {
    id: "4",
    question: "How do I view a pet's medical history?",
    answer:
      "Navigate to Pet Master File, find the pet using the search bar or filters, and click on the pet's card. You'll see the full medical history including past visits, vaccinations, and prescriptions.",
    category: "Pet Records",
  },
  {
    id: "5",
    question: "How do I issue a prescription?",
    answer:
      "Go to Prescriptions from the sidebar, click 'Issue Prescription', select the pet and medical record, then fill in the medication name, dosage, frequency, and instructions.",
    category: "Prescriptions",
  },
  {
    id: "6",
    question: "How do I record a vaccination?",
    answer:
      "Navigate to Vaccinations from the sidebar, click 'Record Vaccination', select the pet, and enter the vaccine name, type, batch number, and next due date.",
    category: "Pet Records",
  },
  {
    id: "7",
    question: "How do I update my profile information?",
    answer:
      "Go to your Profile page by clicking your avatar in the top-right corner and selecting 'Profile'. You can update your name, phone, specializations, biography, and other professional details.",
    category: "Account",
  },
  {
    id: "8",
    question: "How do I change my password?",
    answer:
      "Navigate to Settings from the sidebar, then go to the 'Access & Security' tab. Enter your current password and your new password, then click 'Update Password'.",
    category: "Security",
  },
  {
    id: "9",
    question: "How do I view billing and invoices?",
    answer:
      "Billing information is available through the admin panel. If you need to check invoice details for a specific appointment, contact your clinic administrator for access.",
    category: "Billing",
  },
  {
    id: "10",
    question: "How do I start a consultation?",
    answer:
      "Go to Consultation from the sidebar. Select an existing appointment or start a walk-in consultation. Record examination findings, diagnosis, and treatment plan during the visit.",
    category: "Appointments",
  },
  {
    id: "11",
    question: "How do I manage triage for incoming patients?",
    answer:
      "Navigate to Triage from the sidebar. You'll see a list of patients awaiting triage. Click on a patient to record vitals, assess urgency, and assign a priority level.",
    category: "Appointments",
  },
  {
    id: "12",
    question: "How do I enable two-factor authentication?",
    answer:
      "Go to Settings > Access & Security. Under the 'Two-Factor Authentication' section, toggle the switch to enable 2FA. Follow the on-screen instructions to set up your verification method.",
    category: "Security",
  },
  {
    id: "13",
    question: "How do I change the dashboard theme?",
    answer:
      "Navigate to Settings from the sidebar, then go to the 'Themes' tab. You can choose between Light, Dark, or System (auto-detect) modes.",
    category: "Account",
  },
  {
    id: "14",
    question: "Who do I contact for technical support?",
    answer:
      "For technical issues, contact your clinic administrator first. For system-wide issues, reach out to the PAWS support team via email at support@pawsclinic.com or through the in-app feedback form.",
    category: "Account",
  },
]

export default function HelpSupport() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return helpArticles

    const query = searchQuery.toLowerCase()
    return helpArticles.filter(
      (article) =>
        article.question.toLowerCase().includes(query) ||
        article.answer.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const categories = useMemo(() => {
    const cats = new Map<string, HelpArticle[]>()
    for (const article of filteredArticles) {
      const existing = cats.get(article.category) || []
      existing.push(article)
      cats.set(article.category, existing)
    }
    return cats
  }, [filteredArticles])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-primary/10">
            <LifeBuoy size={32} className="text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Help & Support</h2>
        <p className="text-muted-foreground">
          Search for answers or browse suggested topics below.
        </p>
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
          <button
            onClick={() => setSearchQuery("")}
            className="text-sm text-primary hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* FAQ Articles grouped by category */}
      {filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <Search size={32} className="mb-3" />
            <p className="font-medium">No results found</p>
            <p className="text-sm mt-1">
              Try a different search term or browse the suggested topics.
            </p>
          </CardContent>
        </Card>
      ) : (
        Array.from(categories.entries()).map(([category, articles]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {category}
                <Badge variant="secondary" className="text-xs font-normal">
                  {articles.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple">
                {articles.map((article) => (
                  <AccordionItem key={article.id} value={article.id}>
                    <AccordionTrigger className="text-sm text-left">
                      {article.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {article.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
