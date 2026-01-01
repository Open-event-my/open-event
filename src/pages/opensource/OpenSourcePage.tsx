import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { useGitHubData } from '@/hooks/use-github-data'
import {
  ArrowLeft,
  ArrowUpRight,
  Star,
  GitFork,
  GitCommit,
  Code,
  CheckCircle,
  Circle,
  GithubLogo,
  Tag,
  Clock,
} from '@phosphor-icons/react'

const REPO_OWNER = 'hazlijohar95'
const REPO_NAME = 'open-event'

// Roadmap data
const roadmap = {
  now: [
    { title: 'Core event management', done: true },
    { title: 'Sponsor & vendor marketplace', done: true },
    { title: 'AI-powered assistant', done: true },
    { title: 'Google OAuth', done: true },
    { title: 'Real-time dashboard', done: false },
  ],
  next: [
    { title: 'Mobile app (iOS & Android)' },
    { title: 'Advanced analytics' },
    { title: 'Ticketing integration' },
    { title: 'Email campaigns' },
  ],
  later: [
    { title: 'White-label solution' },
    { title: 'Enterprise SSO' },
    { title: 'Zapier integration' },
    { title: 'API marketplace' },
  ],
}

export function OpenSourcePage() {
  const { repo, contributors, commits, releases, languages, loading, lastUpdated } = useGitHubData()

  const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0)

  const languageColors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    CSS: '#563d7c',
    HTML: '#e34c26',
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return `${Math.floor(diffDays / 30)}mo ago`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <Logo />
            </Link>
            <span className="hidden sm:block text-muted-foreground/30">|</span>
            <span className="hidden sm:block text-sm text-muted-foreground">Contributors</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <GithubLogo size={16} weight="fill" />
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14 max-w-7xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          Back
        </Link>

        {/* Title */}
        <div className="mb-12">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">Contributors</h1>
          <p className="text-muted-foreground">
            Built by the community. Free forever, MIT licensed.
          </p>
        </div>

        {/* Stats Grid - Interactive cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <a
            href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/stargazers`}
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-xl border border-border/40 hover:border-border hover:bg-muted/20 transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <Star size={14} weight="fill" className="text-amber-500" />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Stars
              </span>
            </div>
            <span className="text-2xl font-semibold tabular-nums">
              {loading ? '—' : (repo?.stargazers_count ?? 0)}
            </span>
          </a>
          <a
            href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/network/members`}
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-xl border border-border/40 hover:border-border hover:bg-muted/20 transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <GitFork size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Forks
              </span>
            </div>
            <span className="text-2xl font-semibold tabular-nums">
              {loading ? '—' : (repo?.forks_count ?? 0)}
            </span>
          </a>
          <a
            href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/commits`}
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-xl border border-border/40 hover:border-border hover:bg-muted/20 transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <GitCommit size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Commits
              </span>
            </div>
            <span className="text-2xl font-semibold tabular-nums">
              {loading ? '—' : commits.length > 0 ? '100+' : '50+'}
            </span>
          </a>
          <div className="p-4 rounded-xl border border-border/40">
            <div className="flex items-center gap-2 mb-1">
              <Code size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Lines of Code</span>
            </div>
            <span className="text-2xl font-semibold tabular-nums">
              {loading ? '—' : `${Math.round(totalBytes / 30).toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Contributors */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-foreground">
                  Contributors
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    {!loading && `${contributors.length} people`}
                  </span>
                </h2>
                <a
                  href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/graphs/contributors`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </a>
              </div>
              {/* Contributor cards */}
              <div className="space-y-2 mb-4">
                {loading
                  ? Array.from({ length: 2 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/40"
                      >
                        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))
                  : contributors.slice(0, 5).map((c) => (
                      <a
                        key={c.login}
                        href={c.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-border hover:bg-muted/20 transition-all group"
                      >
                        <OptimizedImage
                          src={c.avatar_url}
                          alt={c.login}
                          lazy
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {c.login}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.contributions} contributions
                          </p>
                        </div>
                        <ArrowUpRight
                          size={14}
                          className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors"
                        />
                      </a>
                    ))}
              </div>
              {/* More contributors avatars */}
              {!loading && contributors.length > 5 && (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {contributors.slice(5, 12).map((c) => (
                      <a
                        key={c.login}
                        href={c.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={c.login}
                      >
                        <OptimizedImage
                          src={c.avatar_url}
                          alt={c.login}
                          lazy
                          className="w-6 h-6 rounded-full ring-2 ring-background hover:ring-border hover:z-10 relative transition-all"
                        />
                      </a>
                    ))}
                  </div>
                  {contributors.length > 12 && (
                    <span className="text-xs text-muted-foreground">
                      +{contributors.length - 12} more
                    </span>
                  )}
                </div>
              )}
            </section>

            {/* Recent Commits */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-foreground">Recent activity</h2>
                <a
                  href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/commits`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </a>
              </div>
              <div className="space-y-1">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5">
                      <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
                    </div>
                  ))
                ) : commits.length > 0 ? (
                  commits.slice(0, 6).map((commit) => (
                    <a
                      key={commit.sha}
                      href={commit.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 py-2.5 group hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      {commit.author ? (
                        <OptimizedImage
                          src={commit.author.avatar_url}
                          alt={commit.author.login}
                          lazy
                          className="w-5 h-5 rounded-full mt-0.5"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center mt-0.5">
                          <GitCommit size={10} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {commit.commit.message.split('\n')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {commit.author?.login || commit.commit.author.name} ·{' '}
                          {formatRelativeTime(commit.commit.author.date)}
                        </p>
                      </div>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-4">No commits found</p>
                )}
              </div>
            </section>

            {/* Languages */}
            <section>
              <h2 className="text-sm font-medium text-foreground mb-4">Languages</h2>
              <div className="h-2 rounded-full overflow-hidden flex bg-muted/50">
                {Object.entries(languages)
                  .sort(([, a], [, b]) => b - a)
                  .map(([lang, bytes]) => (
                    <div
                      key={lang}
                      className="h-full"
                      style={{
                        width: `${(bytes / totalBytes) * 100}%`,
                        backgroundColor: languageColors[lang] || '#6e7681',
                      }}
                      title={`${lang}: ${((bytes / totalBytes) * 100).toFixed(1)}%`}
                    />
                  ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {Object.entries(languages)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 4)
                  .map(([lang, bytes]) => (
                    <div key={lang} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: languageColors[lang] || '#6e7681' }}
                      />
                      <span className="text-muted-foreground">{lang}</span>
                      <span className="text-muted-foreground/60">
                        {((bytes / totalBytes) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Releases */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-foreground">Releases</h2>
                <a
                  href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </a>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : releases.length > 0 ? (
                <div className="space-y-2">
                  {releases.slice(0, 4).map((release, i) => (
                    <a
                      key={release.id}
                      href={release.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-all group"
                    >
                      <Tag size={14} className="text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {release.tag_name}
                        </span>
                        {i === 0 && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded">
                            latest
                          </span>
                        )}
                      </div>
                      <ArrowUpRight
                        size={12}
                        className="text-muted-foreground/50 group-hover:text-muted-foreground"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center border border-border/40 rounded-lg">
                  <Tag size={20} className="text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No releases yet</p>
                </div>
              )}
            </section>

            {/* Roadmap */}
            <section>
              <h2 className="text-sm font-medium text-foreground mb-4">Roadmap</h2>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-muted-foreground">Now</span>
                  </div>
                  <ul className="space-y-1.5 pl-3.5">
                    {roadmap.now.map((item) => (
                      <li key={item.title} className="flex items-center gap-2 text-xs">
                        {item.done ? (
                          <CheckCircle size={12} weight="fill" className="text-emerald-500" />
                        ) : (
                          <Circle size={12} className="text-muted-foreground/40" />
                        )}
                        <span className={item.done ? 'text-muted-foreground' : 'text-foreground'}>
                          {item.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-xs font-medium text-muted-foreground">Next</span>
                  </div>
                  <ul className="space-y-1.5 pl-3.5">
                    {roadmap.next.map((item) => (
                      <li
                        key={item.title}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <Circle size={12} className="text-muted-foreground/30" />
                        {item.title}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    <span className="text-xs font-medium text-muted-foreground">Later</span>
                  </div>
                  <ul className="space-y-1.5 pl-3.5">
                    {roadmap.later.map((item) => (
                      <li
                        key={item.title}
                        className="flex items-center gap-2 text-xs text-muted-foreground/60"
                      >
                        <Circle size={12} className="text-muted-foreground/20" />
                        {item.title}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Quick Links */}
            <section>
              <h2 className="text-sm font-medium text-foreground mb-4">Quick links</h2>
              <div className="space-y-1">
                {[
                  {
                    label: 'View repository',
                    href: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
                  },
                  {
                    label: 'Report an issue',
                    href: `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new`,
                  },
                  { label: 'Read the docs', href: '/docs', internal: true },
                ].map((link) =>
                  link.internal ? (
                    <Link
                      key={link.label}
                      to={link.href}
                      className="flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      {link.label}
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </Link>
                  ) : (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                    >
                      {link.label}
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </a>
                  )
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <div className="mt-12 pt-8 border-t border-border/40">
            <p className="text-xs text-muted-foreground/50 flex items-center gap-1">
              <Clock size={10} />
              Updated {formatRelativeTime(lastUpdated)}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
