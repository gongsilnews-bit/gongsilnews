import { redirect } from "next/navigation";

// 공실스터디란? 내용은 /study 로 합쳐졌다. 예전 링크가 죽지 않도록 넘겨준다.
export default function StudyAboutPage() {
  redirect("/study");
}
