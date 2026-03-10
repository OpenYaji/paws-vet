"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, Upload, Image, Trash2, RefreshCw, PawPrint, X, ZoomIn,
} from "lucide-react";
import { supabase } from "@/lib/auth-client";

interface Pet { id: string; name: string; species: string; }
interface CaptureFile {
  name: string;
  id: string;
  created_at: string;
  metadata: { size: number; mimetype: string } | null;
  publicUrl: string;
  category: string;
}

const CATEGORIES = ["wound", "dental", "dermatology", "surgical", "behavioral", "general"] as const;
type Category = (typeof CATEGORIES)[number];

const BUCKET = "clinical-captures";

const CATEGORY_COLORS: Record<string, string> = {
  wound: "bg-red-100 text-red-700 border-red-200",
  dental: "bg-blue-100 text-blue-700 border-blue-200",
  dermatology: "bg-orange-100 text-orange-700 border-orange-200",
  surgical: "bg-purple-100 text-purple-700 border-purple-200",
  behavioral: "bg-yellow-100 text-yellow-700 border-yellow-200",
  general: "bg-gray-100 text-gray-700 border-gray-200",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CapturePage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: petsRes } = useSWR<{ data: Pet[] }>("/api/veterinarian/pets", fetcher);
  const pets: Pet[] = Array.isArray(petsRes) ? petsRes : (petsRes?.data ?? []);

  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [category, setCategory] = useState<Category>("general");
  const [uploading, setUploading] = useState(false);
  const [captures, setCaptures] = useState<CaptureFile[]>([]);
  const [loadingCaptures, setLoadingCaptures] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Ensure the storage bucket exists on first load
  useEffect(() => {
    fetch("/api/veterinarian/capture/ensure-bucket", { method: "POST" });
  }, []);

  const loadCaptures = useCallback(async (petId: string) => {
    if (!petId) return;
    setLoadingCaptures(true);
    try {
      const { data: files, error } = await supabase.storage
        .from(BUCKET)
        .list(petId, { sortBy: { column: "created_at", order: "desc" } });

      if (error) throw error;

      const enriched: CaptureFile[] = (files ?? [])
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => {
          const parts = f.name.split("-");
          const cat = CATEGORIES.includes(parts[0] as Category) ? parts[0] : "general";
          const { data: { publicUrl } } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(`${petId}/${f.name}`);
          return {
            name: f.name,
            id: f.id ?? f.name,
            created_at: f.created_at ?? "",
            metadata: f.metadata as { size: number; mimetype: string } | null,
            publicUrl,
            category: cat,
          };
        });

      setCaptures(enriched);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load captures";
      toast({ title: "Error loading captures", description: message, variant: "destructive" });
    } finally {
      setLoadingCaptures(false);
    }
  }, [toast]);

  const handlePetChange = (petId: string) => {
    setSelectedPetId(petId);
    setCaptures([]);
    setFilterCategory("all");
    loadCaptures(petId);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!selectedPetId) {
      toast({ title: "Select a pet first", variant: "destructive" });
      return;
    }

    setUploading(true);
    let successCount = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${selectedPetId}/${category}-${timestamp}-${safeName}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (!error) successCount++;
    }
    setUploading(false);

    if (successCount > 0) {
      toast({ title: `${successCount} photo${successCount > 1 ? "s" : ""} uploaded` });
      loadCaptures(selectedPetId);
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!selectedPetId) return;
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([`${selectedPetId}/${fileName}`]);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      setCaptures((prev) => prev.filter((c) => c.name !== fileName));
      toast({ title: "Photo deleted" });
    }
  };

  const selectedPet = pets.find((p) => p.id === selectedPetId);

  const filteredCaptures =
    filterCategory === "all"
      ? captures
      : captures.filter((c) => c.category === filterCategory);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Camera className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Clinical Capture</h1>
          <p className="text-sm text-muted-foreground">
            Upload and manage clinical photos by patient
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-1.5 flex-1">
              <Label>Patient</Label>
              <Select value={selectedPetId} onValueChange={handlePetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient..." />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="capitalize">{p.name} ({p.species})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-44">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !selectedPetId}
              className="gap-2"
            >
              {uploading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading..." : "Upload Photos"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gallery */}
      {selectedPetId && (
        <div className="space-y-4">
          {/* Gallery header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium capitalize">{selectedPet?.name}</span>
              <span className="text-muted-foreground text-sm">
                — {captures.length} photo{captures.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Category filter */}
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadCaptures(selectedPetId)}
                disabled={loadingCaptures}
              >
                <RefreshCw className={`h-4 w-4 ${loadingCaptures ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {loadingCaptures ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
              Loading photos...
            </div>
          ) : filteredCaptures.length === 0 ? (
            <div className="text-center py-16 border rounded-lg text-muted-foreground">
              <Image className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No photos yet for this patient</p>
              <p className="text-xs mt-1">Upload clinical photos above</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredCaptures.map((cap) => (
                <div
                  key={cap.id}
                  className="relative group rounded-lg overflow-hidden border bg-muted aspect-square"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cap.publicUrl}
                    alt={cap.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 cursor-pointer"
                    onClick={() => setLightbox(cap.publicUrl)}
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end p-2 opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-1.5 w-full">
                      <Badge
                        className={`text-[10px] capitalize px-1.5 py-0 border ${CATEGORY_COLORS[cap.category] ?? ""}`}
                      >
                        {cap.category}
                      </Badge>
                      <div className="flex gap-1 ml-auto">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setLightbox(cap.publicUrl)}
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDelete(cap.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Date label */}
                  {cap.created_at && (
                    <div className="absolute top-1.5 left-1.5">
                      <span className="text-[9px] bg-black/60 text-white rounded px-1 py-0.5">
                        {format(new Date(cap.created_at), "MMM d")}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/10 z-50"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Clinical capture"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

