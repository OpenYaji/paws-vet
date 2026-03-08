import { createCookieClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try{
        
    }catch(error){
        console.error("Vet reports API error:", error);
        return NextResponse.json([], { status: 200 });
    }
}