import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const rotasPublicas = ["/login", "/esqueci-senha", "/redefinir-senha", "/auth/confirm"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            void options;
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const publica = rotasPublicas.some((rota) => request.nextUrl.pathname.startsWith(rota));

  if (!user && !publica) return NextResponse.redirect(new URL("/login", request.url));
  if (user && request.nextUrl.pathname === "/login") return NextResponse.redirect(new URL("/dashboard", request.url));

  if (user && !publica) {
    const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (!profile || profile.status !== "ativo") {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?erro=acesso_indisponivel", request.url));
    }
  }

  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
