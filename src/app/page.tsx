import { redirect } from "next/navigation";

// proxy.ts already sends signed-in users to /dashboard; everyone else lands on login.
export default function Home() {
  redirect("/login");
}
