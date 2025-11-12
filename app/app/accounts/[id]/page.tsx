import Link from "next/link";

export default function AccountDetailPage(ctx: unknown) {
  const { params } = ctx as { params: { id: string } };
  const { id } = params;
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/"
          className="p-1 hover:bg-accent rounded transition-colors"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold">Account</h1>
        <span className="ml-2 text-muted-foreground">/{id}</span>
      </div>

      <div className="rounded-xl border bg-background p-6 space-y-2">
        <p className="text-sm text-muted-foreground">This is a placeholder for account details.</p>
        <p className="text-sm">Selected account id: <span className="font-mono text-primary">{id}</span></p>
      </div>
    </div>
  );
}


