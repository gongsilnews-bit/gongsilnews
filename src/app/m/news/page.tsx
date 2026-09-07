import MobileNewsPage from "../news_gongsil/page";

interface SearchParams {
	author_name?: string;
	keyword?: string;
	sec?: string;
}

export default async function MobileAllNewsPage({ searchParams }: { searchParams: SearchParams }) {
	return MobileNewsPage({ searchParams: { ...searchParams, sec: "all" } });
}
