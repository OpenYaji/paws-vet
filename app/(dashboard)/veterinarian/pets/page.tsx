"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Eye,
  FileText,
  Trash2,
  LayoutList,
  TableIcon,
  ChevronLeft,
  ChevronRight,
  Archive,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import AddNewPet from "@/components/veterinarian/pets/add-new-pet";
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/auth-client";

const ITEMS_LIST = 5;
const ITEMS_TABLE = 10;

// Fetcher function for SWR to handle API requests and errors uniformly
const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch data");
  }
  return res.json();
};

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: string;
  color?: string;
  microchip_number?: string;
  photo_url?: string;
  owner_id: string;
  created_at: string;
  client_profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
}

function getSpeciesEmoji(species: string): string {
  const emojiMap: Record<string, string> = {
    dog: "🐕",
    cat: "🐱",
    bird: "🐦",
    rabbit: "🐰",
    hamster: "🐹",
    fish: "🐠",
    reptile: "🦎",
    other: "🐾",
  };
  return emojiMap[species?.toLowerCase()] || "🐾";
}

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState<"list" | "table">("list");
  const [page, setPage] = useState(1); // For pagination, if needed in the future when API supports it
  const limit = 20; // Limit to 20 pets per page for pagination
  const [recordFilter, setRecordFilter] = useState<"active" | "archived">("active");

  // API endpoint with filters
  const swrKey = `/api/pets?page=${page}&limit=${limit}&${recordFilter === "archived" ? "&archived=true" : ""}`;

  const { data: apiResponse, isLoading } = useSWR(swrKey, fetcher, {
    revalidateOnFocus: false,
  });

  const allPets: Pet[] = useMemo(
    () => (Array.isArray(apiResponse?.data) ? apiResponse.data : []),
    [apiResponse],
  );

  // Archive confirm modal
  const [archiveTarget, setArchiveTarget] = useState<Pet | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const resetPage = () => setPage(1);
  const itemsPerPage = viewMode === "list" ? ITEMS_LIST : ITEMS_TABLE;

  const filteredPets = useMemo(() => {
    const filtered = allPets.filter((pet) => {
      const petOwner = pet.client_profiles;
      const ownerName = petOwner
        ? `${petOwner.first_name} ${petOwner.last_name}`
        : "";

      const matchesSearch =
        pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pet.breed && pet.breed.toLowerCase().includes(searchTerm.toLowerCase())) ||
        ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pet.microchip_number && pet.microchip_number.includes(searchTerm));

      const matchesSpecies =
        speciesFilter === "all" ||
        pet.species?.toLowerCase() === speciesFilter.toLowerCase();

      return matchesSearch && matchesSpecies;
    });

    filtered.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "recent")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest")
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return 0;
    });

    return filtered;
  }, [allPets, searchTerm, speciesFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredPets.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedPets = filteredPets.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    // Optimistic update
    mutate(
      swrKey,
      (cur: any) =>
        cur
          ? { ...cur, data: cur.data.filter((p: Pet) => p.id !== archiveTarget.id) }
          : cur,
      false,
    );
    try {
      const res = await fetch(`/api/pets/${archiveTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: true }),
      });
      if (res.ok) mutate(swrKey);
    } catch (err) {
      console.error(err);
      mutate(swrKey); // revert optimistic on error
    } finally {
      setIsArchiving(false);
      setArchiveTarget(null);
    }
  };

  const refreshData = () => mutate(swrKey);

  const PetAvatar = ({ pet, size = "sm" }: { pet: Pet; size?: "sm" | "md" }) => {
    const dim = size === "sm" ? "w-8 h-8 text-base" : "w-14 h-14 text-3xl";
    return (
      <div
        className={`${dim} rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-border shrink-0`}
      >
        {pet.photo_url ? (
          <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
        ) : (
          getSpeciesEmoji(pet.species)
        )}
      </div>
    );
  };

  const ActionButtons = ({ pet }: { pet: Pet }) => (
    <div className="flex gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={`/veterinarian/pets/${pet.id}`}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent>View Details</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => console.log("View history:", pet.id)}
          >
            <FileText className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Medical History</TooltipContent>
      </Tooltip>

      {recordFilter === "active" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setArchiveTarget(pet)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Archive Pet</TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  const Pagination = () => {
    if (filteredPets.length <= itemsPerPage) return null;
    return (
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Showing {(safePage - 1) * itemsPerPage + 1}–
          {Math.min(safePage * itemsPerPage, filteredPets.length)} of{" "}
          {filteredPets.length} {recordFilter === "archived" ? "archived" : ""} pets
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={safePage === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">
            {safePage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading pets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/veterinarian/dashboard" className="hover:text-primary">
            Dashboard
          </Link>
          <span>›</span>
          <span>Pet Records</span>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Pet Records</h1>
            <p className="text-muted-foreground">
              Comprehensive database of all registered pets
            </p>
          </div>
          <AddNewPet onPetAdded={refreshData} />
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by pet name, breed, owner, or microchip..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            {/* Species */}
            <div className="space-y-1 min-w-35">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Species</label>
              <Select value={speciesFilter} onValueChange={(v) => { setSpeciesFilter(v); resetPage(); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Species</SelectItem>
                  <SelectItem value="dog">Dog</SelectItem>
                  <SelectItem value="cat">Cat</SelectItem>
                  <SelectItem value="bird">Bird</SelectItem>
                  <SelectItem value="rabbit">Rabbit</SelectItem>
                  <SelectItem value="hamster">Hamster</SelectItem>
                  <SelectItem value="fish">Fish</SelectItem>
                  <SelectItem value="reptile">Reptile</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-1 min-w-40">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sort By</label>
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); resetPage(); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Records filter */}
            <div className="space-y-1 min-w-40">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Records</label>
              <Select
                value={recordFilter}
                onValueChange={(v: "active" | "archived") => {
                  setRecordFilter(v);
                  resetPage();
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Records</SelectItem>
                  <SelectItem value="archived">Archived Records</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View toggle */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">View</label>
              <div className="flex border border-border rounded-md overflow-hidden h-9">
                <button
                  className={`px-3 flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted text-foreground"
                  }`}
                  onClick={() => { setViewMode("list"); resetPage(); }}
                >
                  <LayoutList className="h-4 w-4" />
                  List
                </button>
                <button
                  className={`px-3 flex items-center gap-1.5 text-sm font-medium border-l border-border transition-colors ${
                    viewMode === "table"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted text-foreground"
                  }`}
                  onClick={() => { setViewMode("table"); resetPage(); }}
                >
                  <TableIcon className="h-4 w-4" />
                  Table
                </button>
              </div>
            </div>

            <Button variant="outline" size="sm" className="h-9 ml-auto" onClick={refreshData}>
              Refresh
            </Button>
          </div>

          {/* Archived banner */}
          {recordFilter === "archived" && (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 text-xs font-medium dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
              <Archive className="h-3.5 w-3.5 shrink-0" />
              Showing archived pet records — these are no longer active in the system.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold text-primary">{filteredPets.length}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredPets.length === allPets.length
                ? recordFilter === "archived" ? "Archived Pets" : "Total Pets"
                : "Filtered Results"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold">
              {new Set(filteredPets.map((p) => p.species)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Species Types</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-2xl font-bold">
              {new Set(filteredPets.map((p) => p.owner_id)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Pet Owners</p>
          </CardContent>
        </Card>
      </div>

      {/* Records */}
      {filteredPets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-5xl mb-3 opacity-30">
              {recordFilter === "archived" ? "🗄️" : "🔍"}
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {recordFilter === "archived" ? "No archived pets" : "No pets found"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {recordFilter === "archived"
                ? "No pet records have been archived yet."
                : "Try adjusting your search or filters"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* ── LIST VIEW ── */
        <div className="space-y-3">
          {paginatedPets.map((pet) => (
            <Card
              key={pet.id}
              className={`hover:shadow-md transition-shadow ${recordFilter === "archived" ? "opacity-75" : ""}`}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <PetAvatar pet={pet} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-bold">{pet.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
                        {pet.species}
                      </span>
                      {recordFilter === "archived" && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0.5 text-xs">
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{pet.breed || "—"}</span> · Breed
                      </span>
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{pet.color || "—"}</span> · Color
                      </span>
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{pet.weight || "—"}</span> · Weight
                      </span>
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {pet.client_profiles
                            ? `${pet.client_profiles.first_name} ${pet.client_profiles.last_name}`
                            : "Unknown"}
                        </span>{" "}
                        · Owner
                      </span>
                    </div>
                    {pet.microchip_number && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        Microchip: {pet.microchip_number}
                      </p>
                    )}
                  </div>

                  <ActionButtons pet={pet} />
                </div>
              </CardContent>
            </Card>
          ))}
          <Pagination />
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Name</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead>Breed</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Microchip</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPets.map((pet) => (
                  <TableRow
                    key={pet.id}
                    className={`hover:bg-muted/40 ${recordFilter === "archived" ? "opacity-75" : ""}`}
                  >
                    <TableCell>
                      <PetAvatar pet={pet} size="sm" />
                    </TableCell>
                    <TableCell className="font-semibold">{pet.name}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
                        {pet.species}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{pet.breed || "—"}</TableCell>
                    <TableCell className="text-sm">{pet.color || "—"}</TableCell>
                    <TableCell className="text-sm">{pet.weight || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {pet.client_profiles
                        ? `${pet.client_profiles.first_name} ${pet.client_profiles.last_name}`
                        : "Unknown"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {pet.microchip_number || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionButtons pet={pet} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 pb-4">
              <Pagination />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ARCHIVE CONFIRM MODAL ── */}
      <Dialog open={!!archiveTarget} onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle>Archive Pet Record</DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              You are about to archive{" "}
              <span className="font-semibold text-foreground">{archiveTarget?.name}</span>.
              This will remove the record from active listings. You can still view it
              by switching to <span className="font-semibold text-foreground">Archived Records</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setArchiveTarget(null)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmArchive}
              disabled={isArchiving}
            >
              {isArchiving ? "Archiving..." : "Archive Pet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
