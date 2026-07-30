import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OpenReply - Open source Instagram comment-to-DM automation",
  description:
    "A free, self-hosted ManyChat alternative. Turn Instagram keyword comments into automatic private replies using the official Meta API.",
};

const GITHUB_URL = "https://github.com/diwenne/openreply";

function formatStars(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toLocaleString();
}

const githubIconPath =
  "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z";

const heroStats = [
  { value: "24/7", label: "Comment monitoring" },
  { value: "1", label: "DM per matched comment" },
  { value: "0", label: "Scraping required" },
];

const flowSteps = [
  {
    eyebrow: "Connect",
    title: "Link your Instagram professional account",
    description:
      "Sign in by email and connect Instagram once. No password sharing, no browser automation.",
  },
  {
    eyebrow: "Build",
    title: "Pick a post, keywords, and the DM",
    description:
      "Create a campaign for a reel or post: the keyword to watch, the public reply, and the DM to send.",
  },
  {
    eyebrow: "Deliver",
    title: "Replies go out through the official API",
    description:
      "Webhooks catch comments instantly and a polling sweep catches the ones Instagram never pushes, so nothing is missed. Every send is queued, rate-limited, and logged.",
  },
];

const features = [
  "Email magic-link sign-in",
  "Multiple Instagram accounts",
  "Encrypted tokens at rest",
  "Webhook + polling reconciliation",
  "Queue-backed delivery worker",
  "Per-account rate limiting",
  "Tracked links with click stats",
  "DM logs with full status",
  "No plan limits, fully self-hosted",
];

/* Static, faithful copies of the real Overview and Dashboard screens, built in
   the app's own design tokens so what visitors see is what the app looks like. */

function AppWindow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-2 text-xs text-muted">{label}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

const overviewStats = [
  ["Views", "847.2K"],
  ["Reach", "612.4K"],
  ["Likes", "38.1K"],
  ["Comments", "4,204"],
  ["Saved", "9,712"],
  ["Shares", "2,340"],
];

const overviewPosts = [
  ["Spring drop reel", "214.8K", "9.1K", "Apr 3"],
  ["Restock haul", "88.4K", "5.2K", "Mar 28"],
  ["Behind the studio", "51.3K", "3.4K", "Mar 21"],
];

function OverviewPreview() {
  return (
    <AppWindow label="app / overview">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Overview</h3>
          <p className="mt-1 text-xs text-muted">
            Recent — 24 posts from @studio.store
          </p>
        </div>
        <span className="rounded border border-border px-2 py-1 text-xs text-muted">
          Last 50
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {overviewStats.map(([label, value]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </div>

      <div className="mt-4 rounded border border-border bg-surface p-4">
        <p className="text-sm font-semibold text-foreground">Posts</p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-zinc-500">
              <th className="pb-2 pr-3 font-medium">Post</th>
              <th className="pb-2 px-3 text-right font-medium">Views</th>
              <th className="pb-2 px-3 text-right font-medium">Likes</th>
              <th className="pb-2 pl-3 text-right font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {overviewPosts.map(([post, views, likes, date]) => (
              <tr key={post} className="border-b border-border last:border-0">
                <td className="py-2 pr-3 text-foreground">{post}</td>
                <td className="py-2 px-3 text-right text-muted">{views}</td>
                <td className="py-2 px-3 text-right text-muted">{likes}</td>
                <td className="py-2 pl-3 text-right text-zinc-500">{date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppWindow>
  );
}

function MatchedCommentCard() {
  return (
    <div className="w-64 rounded-lg border border-border bg-surface p-4 shadow-2xl shadow-black/50">
      <p className="text-xs text-muted">New comment</p>
      <p className="mt-1 text-sm font-semibold text-foreground">@maya.co</p>
      <p className="mt-1 text-sm text-muted">LINK please</p>
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-xs text-muted">
          Matched <span className="text-accent">GUIDE</span>
        </p>
        <p className="mt-1 text-sm font-medium text-success">
          Queued private reply
        </p>
      </div>
    </div>
  );
}

const dashboardStats = [
  ["Active Campaigns", "8"],
  ["DMs Sent", "1,284"],
  ["Skipped", "42"],
  ["Failed", "3"],
  ["Clicks", "356"],
  ["CTR", "27.7%"],
];

const dashboardChart: [string, number][] = [
  ["Mon", 42],
  ["Tue", 68],
  ["Wed", 51],
  ["Thu", 94],
  ["Fri", 120],
  ["Sat", 86],
  ["Sun", 73],
];

const dashboardActivity = [
  ["@maya.co", "Product guide reply", "Sent", "text-success"],
  ["@founder.ray", "Price request", "Sent", "text-success"],
  ["@shop.ava", "Lead magnet", "Queued", "text-warning"],
];

function DashboardPreview() {
  const maxDM = Math.max(...dashboardChart.map(([, n]) => n));
  return (
    <AppWindow label="app / dashboard">
      <h3 className="text-base font-semibold text-foreground">Hello, Maya!</h3>
      <p className="mt-1 text-xs text-muted">2 connected accounts · 340 contacts</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {dashboardStats.map(([label, value]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </div>

      <div className="mt-4 rounded border border-border bg-surface p-4">
        <p className="text-sm font-semibold text-foreground">DMs — Last 7 Days</p>
        <div className="mt-4 flex h-32 items-end gap-2">
          {dashboardChart.map(([day, n]) => (
            <div key={day} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[10px] text-muted">{n}</span>
              <div
                className="w-full rounded-sm bg-accent"
                style={{ height: `${Math.max((n / maxDM) * 100, 4)}%` }}
              />
              <span className="text-[10px] text-zinc-500">{day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded border border-border bg-surface p-4">
        <p className="text-sm font-semibold text-foreground">Recent Activity</p>
        <div className="mt-3 space-y-2">
          {dashboardActivity.map(([user, automation, status, color]) => (
            <div
              key={user}
              className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0"
            >
              <span className="truncate text-foreground">{user}</span>
              <span className="truncate text-muted">{automation}</span>
              <span className={`text-sm ${color}`}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </AppWindow>
  );
}

async function getGitHubStars(): Promise<number | null> {
  try {
    const res = await fetch("https://api.github.com/repos/diwenne/openreply", {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const stars = await getGitHubStars();
  return (
    <main className="min-h-screen bg-white text-zinc-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900">
            Open<span className="text-orange-600">Reply</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-5">
            <a href="#how" className="hidden text-sm text-zinc-600 transition-colors hover:text-zinc-900 sm:inline">
              How it works
            </a>
            <a href="#features" className="hidden text-sm text-zinc-600 transition-colors hover:text-zinc-900 sm:inline">
              Features
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="View OpenReply on GitHub"
              className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-zinc-600 transition-colors hover:text-zinc-900"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-current">
                <path d={githubIconPath} />
              </svg>
              <span className="hidden sm:inline">GitHub</span>
              {stars !== null && (
                <span className="text-zinc-400">{formatStars(stars)}</span>
              )}
            </a>
            <Link
              href="/login"
              className="rounded-md bg-orange-500 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 pt-20 pb-16 sm:px-6 sm:pt-28 lg:px-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">
          Open-source ManyChat · self-hosted · official Instagram API
        </p>
        <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-900 sm:text-5xl">
          Someone comments your keyword. A second later, they get your DM.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600">
          OpenReply watches your Instagram comments and sends the right private
          reply automatically. Free, open source, and running on your own
          infrastructure — no scraping, no monthly fee, no middleman.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            Get started
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <span className="text-orange-500">↳</span>
            See how it works
          </a>
        </div>

        {/* Hero stats — divided editorial row */}
        <dl className="mt-14 grid grid-cols-1 divide-y divide-zinc-200 border-y border-zinc-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {heroStats.map((stat) => (
            <div key={stat.label} className="px-5 py-5 sm:first:pl-0">
              <dt className="text-2xl font-semibold tracking-tight text-zinc-900">
                {stat.value}
              </dt>
              <dd className="mt-1 text-sm text-zinc-500">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-4xl scroll-mt-20 px-5 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">
          <span className="mr-2">◆</span>How it works
        </p>
        <div className="mt-8 divide-y divide-zinc-200 border-t border-zinc-200">
          {flowSteps.map((step, i) => (
            <div
              key={step.eyebrow}
              className="grid grid-cols-[auto_1fr] gap-x-4 py-6 sm:grid-cols-[3rem_10rem_1fr] sm:gap-x-8"
            >
              <div className="text-sm font-semibold tabular-nums text-zinc-300">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="col-start-2 sm:col-start-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">
                  {step.eyebrow}
                </p>
                <h3 className="mt-1 text-base font-semibold text-zinc-900">
                  {step.title}
                </h3>
              </div>
              <p className="col-span-2 mt-2 flex gap-2 text-sm leading-relaxed text-zinc-600 sm:col-span-1 sm:col-start-3 sm:mt-0">
                <span className="text-orange-500">↳</span>
                <span>{step.description}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* App preview — one prominent screenshot with a matched-comment card floating over it */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">
          <span className="mr-2">◆</span>A look inside
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-zinc-900">
            Every matched comment, from trigger to delivered DM.
          </h2>
          <p className="text-sm text-zinc-500">
            The dashboard you actually self-host.
          </p>
        </div>
        <div className="relative mt-10 shadow-xl shadow-zinc-300/40">
          <OverviewPreview />
          <div className="absolute -bottom-8 right-4 z-10 hidden shadow-xl shadow-zinc-400/30 sm:right-6 sm:block">
            <MatchedCommentCard />
          </div>
        </div>
      </section>

      {/* Dashboard band — full traceability */}
      <section className="border-y border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">
                <span className="mr-2">◆</span>No black box
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
                See every send: queued, matched, sent, skipped, failed, or
                rate-limited.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-zinc-600">
                The dashboard logs the full lifecycle of every comment and DM, so
                you always know what went out, what didn't, and why. No guessing,
                no scraping, no vendor between you and Instagram.
              </p>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Read the OpenReply source on GitHub"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900"
              >
                <span className="text-orange-500">↳</span>
                Read the source on GitHub
              </a>
            </div>
            <div className="shadow-xl shadow-zinc-300/40">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Features — two plain columns, no cards */}
      <section id="features" className="mx-auto max-w-4xl scroll-mt-20 px-5 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">
          <span className="mr-2">◆</span>What's included
        </p>
        <ul className="mt-8 grid grid-cols-1 gap-x-10 gap-y-px border-t border-zinc-200 sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-baseline gap-3 border-b border-zinc-200 py-4 text-sm text-zinc-700"
            >
              <span className="text-orange-500">↳</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Own your Instagram automation.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-zinc-600">
            Clone it, deploy it, connect your account. It's free and the code is
            yours to read, change, and run forever.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="rounded-md bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
            >
              Get started
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="View OpenReply source on GitHub"
              className="inline-flex items-center gap-2 rounded-md border border-orange-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-current">
                <path d={githubIconPath} />
              </svg>
              View source
              {stars !== null && (
                <span className="text-zinc-400">{formatStars(stars)}</span>
              )}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-zinc-500 sm:flex-row sm:px-6 lg:px-8">
          <p>
            Open<span className="text-orange-600">Reply</span> — free, open
            source, self-hosted.
          </p>
          <div className="flex items-center gap-5">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-zinc-900">
              GitHub
            </a>
            <Link href="/login" className="hover:text-zinc-900">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
