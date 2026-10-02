import { getHelpCenterData } from "@/app/actions/helpCenter";
import HelpCenterClient from "@/components/help/HelpCenterClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "고객센터 - 공실뉴스",
  description: "공실뉴스 자주 묻는 질문, 실시간 상담, 1:1 문의",
};

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ inquiry?: string }> }) {
  const [data, params] = await Promise.all([getHelpCenterData(), searchParams]);
  return <HelpCenterClient data={data} autoOpenInquiry={params.inquiry === "1"} />;
}
