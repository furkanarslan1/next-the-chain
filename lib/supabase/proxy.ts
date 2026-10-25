import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Token'ı yeniler; createServerClient ile getClaims arasına kod koyma.
  const { data } = await supabase.auth.getClaims();

  // Sadece iyimser yönlendirme; asıl doğrulama lib/auth.ts içinde yapılır.
  const { pathname } = request.nextUrl;
  const isPublic = pathname === "/login" || pathname.startsWith("/auth");

  if (!data?.claims && !isPublic) {
    return redirectWithCookies(request, response, "/login");
  }
  if (data?.claims && pathname === "/login") {
    return redirectWithCookies(request, response, "/");
  }

  return response;
}

// Yenilenen oturum cookie'lerini yönlendirme yanıtına da taşır.
function redirectWithCookies(
  request: NextRequest,
  from: NextResponse,
  path: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
