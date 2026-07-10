import { LoginClient } from "@/components/LoginClient";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <LoginClient erroInicial={erro ? "Seu acesso está suspenso, revogado ou indisponível." : ""} />;
}
