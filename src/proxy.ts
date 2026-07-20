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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const caminho = request.nextUrl.pathname;
  const { data: { user } } = await supabase.auth.getUser();
  const publica = rotasPublicas.some((rota) => caminho.startsWith(rota))
    || caminho === "/pre-cadastro" || caminho === "/api/pre-cadastros";
  if (!user && !publica) return NextResponse.redirect(new URL("/login", request.url));
  if (!user) return response;

  if (!publica || caminho === "/login") {
    const [{ data: profile }, { data: vinculos }] = await Promise.all([
      supabase.from("profiles").select("status,perfil").eq("id", user.id).maybeSingle(),
      supabase.from("loja_usuarios").select("perfil,obreiro_id,acesso_portal_obreiro,deve_trocar_senha")
        .eq("usuario_id", user.id).eq("status", "ativo"),
    ]);
    if (!profile || profile.status !== "ativo") {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?erro=acesso_indisponivel", request.url));
    }
    const deveTrocar = Boolean(vinculos?.some((v) => v.deve_trocar_senha));
    if (deveTrocar && caminho !== "/alterar-senha") {
      return NextResponse.redirect(new URL("/alterar-senha", request.url));
    }
    const portalDisponivel = Boolean(vinculos?.some((v) => v.acesso_portal_obreiro && v.obreiro_id));
    if (profile.perfil === "Obreiro" && !portalDisponivel) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?erro=portal_indisponivel", request.url));
    }
    if (profile.perfil === "Obreiro" && !publica && !caminho.startsWith("/portal-obreiro") && caminho !== "/alterar-senha") {
      return NextResponse.redirect(new URL("/portal-obreiro", request.url));
    }
    const destino = profile.perfil === "Obreiro" ? "/portal-obreiro" : "/dashboard";
    if (!deveTrocar && caminho === "/alterar-senha") return NextResponse.redirect(new URL(destino, request.url));
    if (caminho === "/login") return NextResponse.redirect(new URL(destino, request.url));
  }

  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
