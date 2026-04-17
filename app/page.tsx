import Link from "next/link";
import { getOptionalUser } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const user = await getOptionalUser();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-10 pb-12 sm:px-10 sm:pt-14 sm:pb-16">
      
      <section className="mt-6 rounded-3xl border border-border/70 bg-surface-1/80 p-8 sm:mt-10 sm:p-12">
        
        <div className="grid gap-8 sm:grid-cols-2 items-start">
          
          {/* LEFT */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent-strong">
              Scythe Tutor
            </p>

            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Practice end-game scoring.
            </h1>

            <p className="mt-4 max-w-md text-sm text-muted sm:text-base">
              Quick drills, clear feedback, and no table arguments.
              Learn Scythe scoring faster with guided examples and instant validation.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {user ? (
                <>
                  <Link href="/tutor">
                    <Button>
                      Go to Tutor
                    </Button>
                  </Link>

                  <Link href="/dashboard">
                    <Button variant="secondary">
                      Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signup">
                    <Button>
                      Sign Up
                    </Button>
                  </Link>

                  <Link href="/login">
                    <Button variant="secondary">
                      Log In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <figure className="overflow-hidden rounded-2xl border border-border/70 bg-surface-2/60">
            <img
              src="/assets/boards/played_board.webp"
              alt="Scythe board from a real game"
              className="w-full h-auto object-contain"
            />
          </figure>

        </div>

      </section>

    </main>
  );
}