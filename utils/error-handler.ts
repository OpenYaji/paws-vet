import { NextResponse } from "next/server";

/** Centralized Supabase error handler — import and call in every API route catch block. */
export function handleError(error: any, context?: string) {
  // Include route context in the log so every error is traceable to its source
  console.error(`[DB Error]${context ? ` [${context}]` : ""}:`, error);

  // Pagination out of bounds (return empty array instead of crashing)
  if (error?.code === 'PGRST103') {
    return NextResponse.json({ data: [], total: 0 }, { status: 200 });
  }

  // Duplicate key value violates unique constraint (e.g., email already exists)
  if (error?.code === '23505') {
    return NextResponse.json({ error: "This record already exists." }, { status: 409 });
  }

  // Foreign key violation (e.g., trying to add an appointment for a pet that was deleted)
  if (error?.code === '23503') {
    return NextResponse.json({ error: "Referenced record does not exist." }, { status: 400 });
  }

  // Row Level Security (RLS) violation
  if (error?.code === '42501') {
    return NextResponse.json({ error: "You do not have permission to access this data." }, { status: 403 });
  }

  // Default fallback for any other unexpected errors
  return NextResponse.json(
    { error: error?.message || "An unexpected database error occurred." }, 
    { status: 500 }
  );
}