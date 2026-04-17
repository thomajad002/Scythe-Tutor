import Link from "next/link";
import { Card } from "@/components/ui/card";

const externalLinks = [
  {
    label: "Stonemaier Games",
    href: "https://store.stonemaiergames.com/products/scythe?srsltid=AfmBOooAa_iuSsQvB6syn1ThG-k8KTLhGv9uAeYKCecXTNNxoyKL61g-",
  },
  {
    label: "Amazon",
    href: "https://www.amazon.com/Stonemaier-Games-STM600-Scythe-Board/dp/B01IPUGYK6/ref=sr_1_2?crid=394BYD4OQ2D6T&dib=eyJ2IjoiMSJ9.g78e9B4wO7LEB61Occ-0XoY_W4SwePFKBZidP4QRijgYWHnfzbQ4OTVxLPoIS9qD6PlS5WFb7Tq194ZIpGNz1FqDdgzZkMmY-LAWYzaywdTWP1qzwpo8u27klVw1_QbSqumxo7Tfvh_gnXI0AHJOME06olsLVIFx-fLnJu_RHfWpFZkC4TyFHTFkyyBIL-eNM5F6IGjMaCabiZP30yGTEOEB7l_3EMTG2Fy_140keUk.0Y29nmWFCBSxqtDtiWENmfyROar553PXyN63uB2Hp5k&dib_tag=se&keywords=scythe&qid=1776379563&sprefix=scyt%2Cspecialty-aps%2C261&sr=8-2&th=1",
  },
  {
    label: "iOS App",
    href: "https://apps.apple.com/us/app/scythe-digital-edition/id1482645966",
  },
  {
    label: "Android App",
    href: "https://play.google.com/store/apps/details?id=com.asmodeedigital.scythe&hl=en_US&pli=1",
  },
] as const;

export default function BuyPage() {
  return (
    <main className="mx-auto min-h-full w-full max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
      <section className="reveal-up space-y-6 rounded-3xl border border-border/70 bg-surface-1/85 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:p-12">
        <div className="space-y-3">
          <p className="inline-flex rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-accent-strong">
            Buy
          </p>
          <h1 className="text-4xl sm:text-5xl">Support the creators of Scythe</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted sm:text-base">
            This is a fan project built because we love the game. We are not affiliated with Stonemaier Games,
            Amazon, Apple, or Google, and <span className="font-bold" style={{ color: "#ef4444" }}>we do not receive anything</span> if you buy through these links. They are here
            only if you want to support the original creators and check out the official game to play for yourself.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {externalLinks.map((link) => (
            <Card key={link.label} className="space-y-3 border-border/70 bg-surface-2/70 p-5">
              <h2 className="text-xl">{link.label}</h2>
              <p className="text-sm text-muted">
                Open the official {link.label.toLowerCase()} listing in a new tab.
              </p>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-3"
              >
                Open {link.label}
              </a>
            </Card>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/tutor">
            <span className="inline-flex items-center justify-center rounded-xl border border-amber-300/30 bg-accent px-4 py-2 text-sm font-medium text-[#1f1508] transition-colors hover:bg-accent-strong">
              Back to Tutor
            </span>
          </Link>
          <Link href="/">
            <span className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-3">
              Home
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
