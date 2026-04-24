import Link from "next/link";
import { TherapistForm } from "@/components/therapists/TherapistForm";

export default function NovyTerapeutPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/terapeuti" className="text-gray-400 hover:text-gray-600 text-sm">← Zpět</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nový terapeut</h1>
      </div>
      <TherapistForm />
    </div>
  );
}
