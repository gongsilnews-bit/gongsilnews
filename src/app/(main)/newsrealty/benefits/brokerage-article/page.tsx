"use client";

import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import BenefitsSubNav from "@/components/newsrealty/BenefitsSubNav";
import BrokerageArticleContent from "@/components/newsrealty/BrokerageArticleContent";

export default function BrokerageArticleBenefitPage() {
  return <div><NewsrealtyHeader /><BenefitsSubNav activeTab="brokerage-article" /><BrokerageArticleContent applyHref="/newsrealty/apply" /></div>;
}
