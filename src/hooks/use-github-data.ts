import { useState, useEffect } from 'react'

const REPO_OWNER = 'hazlijohar95'
const REPO_NAME = 'open-event'
const CACHE_KEY = 'github-data-cache'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

interface GitHubRepo {
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  watchers_count: number
  language: string
  description: string
  html_url: string
  created_at: string
  updated_at: string
  pushed_at: string
}

interface GitHubContributor {
  login: string
  avatar_url: string
  html_url: string
  contributions: number
}

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      date: string
    }
  }
  author: {
    login: string
    avatar_url: string
    html_url: string
  } | null
  html_url: string
}

interface GitHubRelease {
  id: number
  tag_name: string
  name: string
  body: string
  published_at: string
  html_url: string
}

interface GitHubLanguages {
  [key: string]: number
}

export interface GitHubData {
  repo: GitHubRepo | null
  contributors: GitHubContributor[]
  commits: GitHubCommit[]
  releases: GitHubRelease[]
  languages: GitHubLanguages
  loading: boolean
  error: string | null
  lastUpdated: string | null
}

interface CachedData {
  data: Omit<GitHubData, 'loading' | 'error'>
  timestamp: number
}

// Fallback contributors (the actual team)
const fallbackContributors: GitHubContributor[] = [
  {
    login: 'hazlijohar95',
    avatar_url: 'https://avatars.githubusercontent.com/u/hazlijohar95',
    html_url: 'https://github.com/hazlijohar95',
    contributions: 150,
  },
  {
    login: 'Claude',
    avatar_url: 'https://www.anthropic.com/images/icons/apple-touch-icon.png',
    html_url: 'https://claude.ai',
    contributions: 200,
  },
]

// Fallback data in case API fails
const fallbackData: Omit<GitHubData, 'loading' | 'error'> = {
  repo: {
    stargazers_count: 0,
    forks_count: 0,
    open_issues_count: 0,
    watchers_count: 0,
    language: 'TypeScript',
    description: 'The open-source event operations platform',
    html_url: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    pushed_at: new Date().toISOString(),
  },
  contributors: fallbackContributors,
  commits: [],
  releases: [],
  languages: { TypeScript: 45000, CSS: 12000, HTML: 3000 },
  lastUpdated: null,
}

function getCachedData(): CachedData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as CachedData
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null
}

function setCachedData(data: Omit<GitHubData, 'loading' | 'error'>) {
  try {
    const cacheData: CachedData = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch {
    // Ignore cache errors
  }
}

// Initialize with cached data if available
function getInitialData(): GitHubData {
  const cached = getCachedData()
  if (cached) {
    return {
      ...cached.data,
      loading: false,
      error: null,
    }
  }
  return {
    ...fallbackData,
    loading: true,
    error: null,
  }
}

export function useGitHubData(): GitHubData {
  const [data, setData] = useState<GitHubData>(getInitialData)

  useEffect(() => {
    // Skip fetch if we already have cached data
    if (!data.loading) return

    // Fetch fresh data
    const fetchData = async () => {
      try {
        const baseUrl = 'https://api.github.com'
        const headers = {
          Accept: 'application/vnd.github.v3+json',
        }

        // Fetch all data in parallel
        const [repoRes, contributorsRes, commitsRes, releasesRes, languagesRes] =
          await Promise.allSettled([
            fetch(`${baseUrl}/repos/${REPO_OWNER}/${REPO_NAME}`, { headers }),
            fetch(`${baseUrl}/repos/${REPO_OWNER}/${REPO_NAME}/contributors?per_page=50`, {
              headers,
            }),
            fetch(`${baseUrl}/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=10`, { headers }),
            fetch(`${baseUrl}/repos/${REPO_OWNER}/${REPO_NAME}/releases?per_page=10`, { headers }),
            fetch(`${baseUrl}/repos/${REPO_OWNER}/${REPO_NAME}/languages`, { headers }),
          ])

        const repo =
          repoRes.status === 'fulfilled' && repoRes.value.ok
            ? await repoRes.value.json()
            : fallbackData.repo

        const contributors =
          contributorsRes.status === 'fulfilled' && contributorsRes.value.ok
            ? await contributorsRes.value.json()
            : fallbackData.contributors

        const commits =
          commitsRes.status === 'fulfilled' && commitsRes.value.ok
            ? await commitsRes.value.json()
            : fallbackData.commits

        const releases =
          releasesRes.status === 'fulfilled' && releasesRes.value.ok
            ? await releasesRes.value.json()
            : fallbackData.releases

        const languages =
          languagesRes.status === 'fulfilled' && languagesRes.value.ok
            ? await languagesRes.value.json()
            : fallbackData.languages

        // Always include Claude as a contributor
        const claudeContributor: GitHubContributor = {
          login: 'Claude',
          avatar_url: 'https://www.anthropic.com/images/icons/apple-touch-icon.png',
          html_url: 'https://claude.ai',
          contributions: 200,
        }

        const apiContributors = Array.isArray(contributors) ? contributors : []
        const hasClaudeAlready = apiContributors.some((c) => c.login === 'Claude')
        const mergedContributors = hasClaudeAlready
          ? apiContributors
          : [...apiContributors, claudeContributor]

        const newData = {
          repo,
          contributors: mergedContributors.length > 0 ? mergedContributors : fallbackContributors,
          commits: Array.isArray(commits) ? commits : [],
          releases: Array.isArray(releases) ? releases : [],
          languages: Object.keys(languages || {}).length > 0 ? languages : fallbackData.languages,
          lastUpdated: new Date().toISOString(),
        }

        // Cache the data
        setCachedData(newData)

        setData({
          ...newData,
          loading: false,
          error: null,
        })
      } catch (err) {
        setData({
          ...fallbackData,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch GitHub data',
        })
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run on mount, data.loading is checked for initialization
  }, [])

  return data
}
