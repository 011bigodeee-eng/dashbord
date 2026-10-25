import Invitation from "@/components/athlete/invitation";
export const metadata = {
  title: "Ativar acesso · MD Nation Athlete",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return <Invitation token={(await params).token} />;
}
