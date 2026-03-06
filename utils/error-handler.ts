import { NextResponse } from "next/server";

export function handleError(error: any, context?: string) {
  // Destructure the error so the console shows all hidden properties
  console.error(`[DB Error]${context ? ` [${context}]` : ""}:`, {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });

  const errorMessage = String(error?.message || "");

  // HTTP 416: Requested Range Not Satisfiable (e.g., invalid pagination parameters)
  if (
    error?.code === 'PGRST103' || 
    errorMessage === '{"' || 
    errorMessage.includes('Requested range not satisfiable')
  ) {
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
    { error: errorMessage || "An unexpected database error occurred." }, 
    { status: 500 }
  );
}