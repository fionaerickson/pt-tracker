import { redirect } from "next/navigation";

/** The session screen moved to /today (punch-list 3). */
export default function WorkoutRedirect() {
  redirect("/today");
}
