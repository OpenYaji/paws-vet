"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function SmsClientPage() {
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [targetClientId, setTargetClientId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Search state
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  useEffect(() => {
    if (!clientSearchTerm.trim()) {
      setClientResults([]);
      setIsSearchDropdownOpen(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/veterinarian/clients?q=${encodeURIComponent(clientSearchTerm)}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setClientResults(data);
        } else {
          setClientResults([]);
        }
        setIsSearchDropdownOpen(true);
      } catch (error) {
        console.error("Failed to search clients:", error);
        setClientResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [clientSearchTerm]);

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setClientSearchTerm(`${client.first_name} ${client.last_name} (${client.phone || 'No phone'})`);
    setTargetClientId(client.id);
    setIsSearchDropdownOpen(false);
  };

  const clearSelection = () => {
    setSelectedClient(null);
    setTargetClientId("");
    setClientSearchTerm("");
  }

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetType === "specific" && !targetClientId) {
      setStatusMsg({ type: "error", text: "Please select a specific client." });
      return;
    }
    if (!message.trim()) {
      setStatusMsg({ type: "error", text: "Message cannot be empty." });
      return;
    }

    setIsSending(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/veterinarian/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: targetType === "all" ? "all" : targetClientId,
          message: message,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMsg({ type: "success", text: data.message || "SMS sent successfully!" });
        setMessage("");
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to send SMS." });
      }
    } catch (error: any) {
      setStatusMsg({ type: "error", text: "Network error occurred." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-green-600" />
        <h1 className="text-2xl font-bold">SMS Client</h1>
      </div>

      <Card className="bg-muted/40 border-dashed border-2 border-border">
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
          <CardDescription>
            Broadcast an SMS message to all clients or send it to a specific client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendSms} className="space-y-6">

            {/* Target Selection */}
            <div className="space-y-3">
              <Label>Target Recipient</Label>
              <Select
                value={targetType}
                onValueChange={(val) => {
                  setTargetType(val as "all" | "specific");
                  setStatusMsg(null);
                  if (val === "all") {
                    clearSelection();
                  }
                }}
              >
                <SelectTrigger className="w-full md:w-1/2">
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Broadcast to All Clients</SelectItem>
                  <SelectItem value="specific">Send to Specific Client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific Client Selection */}
            {targetType === "specific" && (
              <div className="space-y-3">
                <Label>Select Client</Label>
                <div className="relative w-full md:w-1/2">
                  <Input
                    type="text"
                    placeholder="Search client by name or phone..."
                    value={clientSearchTerm}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      if (selectedClient) {
                        setSelectedClient(null);
                        setTargetClientId("");
                      }
                    }}
                    onFocus={() => {
                      if (clientResults.length > 0) setIsSearchDropdownOpen(true);
                    }}
                  />

                  {/* The Search Results Dropdown */}
                  {isSearchDropdownOpen && (
                    <div className="absolute top-full left-0 z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                      {isSearching ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
                      ) : !Array.isArray(clientResults) || clientResults.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">No clients found.</div>
                      ) : (
                        clientResults.map((client) => (
                          <div
                            key={client.id}
                            onClick={() => handleSelectClient(client)}
                            className="p-3 text-sm cursor-pointer hover:bg-muted border-b last:border-0"
                          >
                            <div className="font-medium text-foreground">{client.first_name} {client.last_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {client.phone || "No phone"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Message Box */}
            <div className="space-y-3">
              <Label>SMS Message</Label>
              <Textarea
                placeholder="Write your SMS message here..."
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full min-h-[120px] resize-y p-3 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="text-right text-xs text-muted-foreground">
                {message.length} characters
              </div>
            </div>

            {/* Status Message */}
            {statusMsg && (
              <div
                className={`flex items-center gap-2 p-3 rounded-md text-sm ${statusMsg.type === "success"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  }`}
              >
                {statusMsg.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {statusMsg.text}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSending || (targetType === "specific" && !targetClientId) || !message.trim()}
              className="w-full md:w-auto bg-green-600 hover:bg-green-700"
            >
              {isSending ? "Sending..." : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send SMS
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
