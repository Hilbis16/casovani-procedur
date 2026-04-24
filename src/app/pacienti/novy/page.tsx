import Link from "next/link";
import { PatientForm } from "@/components/patients/PatientForm";

export default function NovyPacientPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pacienti" className="text-gray-400 hover:text-gray-600 text-sm">← Zpět</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nový pacient</h1>
      </div>
      <PatientForm />
    </div>
  );
}
