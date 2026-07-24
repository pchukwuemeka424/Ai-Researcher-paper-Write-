import { redirect } from "next/navigation";

export default function AdminAdminsRedirectPage() {
	redirect("/super-admin/admins");
}
