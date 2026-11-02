import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="mb-2 text-lg font-medium">Nie znaleziono tej oferty.</p>
      <Link href="/" className="text-sm hover:underline">
        Wróć do listy
      </Link>
    </div>
  );
}
