import Link from "next/link";
import { useSidebar } from "../ui/sidebar";
import Image from "next/image";

export default function SidebarHeader() {
  const { open } = useSidebar();
  return (
    <Link
      href="/"
      aria-label="Fidex"
      className={`relative z-20 flex items-center gap-3 py-1 text-sm w-full justify-start`}
      title="Fidex"
    >
      <Image src="/icon.svg" alt="Fidex" width={32} height={32} />
      {open && <span className="whitespace-pre font-bold">Fidex</span>}
    </Link>
  );
}