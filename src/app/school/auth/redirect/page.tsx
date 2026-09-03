import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSchoolSession } from "@/lib/school-session";

const SUPER_ADMIN_EMAIL = "adeluav3@gmail.com";

export default async function AuthRedirect() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/school/login");

  if (user.email === SUPER_ADMIN_EMAIL) redirect("/admin");

  const session = await getSchoolSession();
  if (!session) redirect("/school/login?error=no-role");

  if (session.role === "teacher") redirect("/school/dashboard/teacher");
  if (session.role === "student") redirect("/school/dashboard/student");
  if (session.role === "school_admin") redirect("/school/dashboard/admin");

  redirect("/school/login");
}
