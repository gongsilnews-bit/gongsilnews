import Link from "next/link";
import { redirect } from "next/navigation";
import { checkArticleWritePermission } from "@/app/actions/article";
import { isAdminRole } from "@/utils/permissionCheck";
import { createClient } from "@/utils/supabase/server";

type WriteEntrySearchParams = Promise<{
  vacancy_id?: string | string[];
}>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function writeDestination(role?: string | null) {
  if (isAdminRole(role)) return "/admin";
  if (role === "REALTOR" || role === "부동산회원") return "/realty_admin";
  return "/user_admin";
}

function AccessMessage({ message }: { message: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f4f5f7",
        fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(460px, 100%)",
          padding: "36px 30px",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          background: "#fff",
          textAlign: "center",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div style={{ fontSize: 38, marginBottom: 14 }}>📰</div>
        <h1 style={{ margin: "0 0 12px", fontSize: 21, color: "#111827" }}>기사 작성 권한을 확인해 주세요</h1>
        <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 14, lineHeight: 1.7 }}>{message}</p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "11px 18px",
            borderRadius: 8,
            background: "#374151",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          공실뉴스로 돌아가기
        </Link>
      </section>
    </main>
  );
}

export default async function ArticleWriteEntryPage({
  searchParams,
}: {
  searchParams: WriteEntrySearchParams;
}) {
  const query = await searchParams;
  const vacancyId = firstParam(query.vacancy_id);
  const entryParams = new URLSearchParams();
  if (vacancyId) entryParams.set("vacancy_id", vacancyId);
  const entryPath = `/article/write${entryParams.size ? `?${entryParams.toString()}` : ""}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(entryPath)}`);
  }

  const { data: member } = await supabase
    .from("members")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!member) {
    return <AccessMessage message="로그인 계정과 연결된 회원정보를 찾을 수 없습니다. 다시 로그인해 주세요." />;
  }

  const permission = await checkArticleWritePermission(user.id);
  if (!permission.allowed) {
    return <AccessMessage message={permission.error || "현재 회원은 기사 작성 권한이 없습니다."} />;
  }

  const destinationParams = new URLSearchParams({ menu: "article", action: "write" });
  if (vacancyId) destinationParams.set("vacancy_id", vacancyId);
  redirect(`${writeDestination(member.role)}?${destinationParams.toString()}`);
}
