import { SITE_NAME } from "@/lib/site";

/** One quiet line at the bottom of every shell. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={className}>
      <p className="text-center text-xs text-muted-foreground">
        © {SITE_NAME} · This website is managed and owned by Animesh.
      </p>
    </footer>
  );
}
