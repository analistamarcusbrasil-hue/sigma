import { obterBackupParaDownload } from "@/lib/backup/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  contexto: RouteContext<"/api/backups/[id]/download">,
) {
  try {
    const { id } = await contexto.params;
    const url = new URL(request.url);
    const lojaId = url.searchParams.get("lojaId") ?? "";
    const resultado = await obterBackupParaDownload(id, lojaId, {
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "",
      userAgent: request.headers.get("user-agent") ?? "",
    });
    const nomeAscii = resultado.nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, "_");
    return new Response(resultado.texto, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(resultado.nomeArquivo)}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Download indisponível.";
    return Response.json({ erro: mensagem }, {
      status: mensagem.includes("sessão") ? 401 : mensagem.includes("permissão") ? 403 : 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
