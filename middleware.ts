import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/storage/supabaseProxy";

export async function middleware(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/:path*"]
};
