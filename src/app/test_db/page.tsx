import { getVacancies } from "@/app/actions/vacancy";

export default async function Page() {
  const res = await getVacancies();
  return (
    <pre>
      {JSON.stringify(res, null, 2)}
    </pre>
  );
}
