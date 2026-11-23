import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const publicPaths = ["/connexion", "/inscription"];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { user } = await updateSession(request, response);

  const isPublic = publicPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (!isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    return NextResponse.redirect(url);
  }
  if (isPublic && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/tableau";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};