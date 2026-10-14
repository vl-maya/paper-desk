import { Suspense } from "react";
import { NotesPageContent } from "@/components/NotesPageContent";

export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <NotesPageContent />
    </Suspense>
  );
}
