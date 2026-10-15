import { redirect } from "next/navigation";

/** Archived notes live in the main Notes sidebar accordion. */
export default function NotesArchivePage() {
  redirect("/notes");
}
