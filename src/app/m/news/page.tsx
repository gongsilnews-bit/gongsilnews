import MobileNewsPage from "../news_gongsil/page";

interface SearchParams {
	author_name?: string;
	keyword?: string;
	sec?: string;
}

export default async function MobileAllNewsPage({
	searchParams,
}: {
	searchParams?: Promise<SearchParams> | SearchParams;
}) {
	const resolved = searchParams ? await searchParams : {};
	return MobileNewsPage({ searchParams: { ...(resolved || {}), sec: "all" } });
}
