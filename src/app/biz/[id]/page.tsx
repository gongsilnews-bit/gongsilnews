import { Metadata } from "next";
import BizPageClient from "./BizPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `비즈니스 미니홈피 - 공실뉴스`,
    description: `공실뉴스 비즈니스 회원의 미니홈피 페이지입니다.`,
    openGraph: {
      title: `비즈니스 미니홈피 - 공실뉴스`,
      description: `공실뉴스 비즈니스 회원의 미니홈피 페이지입니다.`,
    },
  };
}

export default async function BizPage({ params }: PageProps) {
  const { id } = await params;
  return <BizPageClient profileId={id} />;
}
