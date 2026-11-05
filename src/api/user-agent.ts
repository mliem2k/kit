export interface ParsedUserAgent {
  deviceType: 'mobile' | 'tablet' | 'desktop'
  browserName: string | null
  browserVersion: string | null
  osName: string | null
  osVersion: string | null
}

interface BrowserPattern {
  name: string
  regex: RegExp
}

// Order matters: engines that embed other browsers' identifying strings
// (Edge/Chrome both include "Chrome/", "OPR" is Opera but also has Chrome/)
// must be checked before the more generic pattern they'd otherwise match.
const BROWSER_PATTERNS: BrowserPattern[] = [
  { name: 'Edge', regex: /Edg(?:A|iOS)?\/([\d.]+)/ },
  { name: 'Opera', regex: /(?:Opera|OPR)\/([\d.]+)/ },
  { name: 'Samsung Internet', regex: /SamsungBrowser\/([\d.]+)/ },
  { name: 'Chrome', regex: /Chrome\/(\d+)/ },
  { name: 'Firefox', regex: /Firefox\/([\d.]+)/ },
  { name: 'Safari', regex: /Version\/([\d.]+).*Safari/ },
]

interface OsPattern {
  name: string
  regex: RegExp
  // Some OS version numbers use underscores in the raw UA (iOS/macOS); this
  // converts them to dots for display.
  normalizeVersion?: (raw: string) => string
}

const OS_PATTERNS: OsPattern[] = [
  {
    name: 'iOS',
    regex: /(?:iPhone|iPad|iPod).*OS ([\d_]+)/,
    normalizeVersion: (v) => v.replace(/_/g, '.'),
  },
  { name: 'Android', regex: /Android ([\d.]+)/ },
  {
    name: 'Windows',
    regex: /Windows NT ([\d.]+)/,
    normalizeVersion: (v) => (v === '10.0' ? '10' : v),
  },
  { name: 'macOS', regex: /Mac OS X ([\d_]+)/, normalizeVersion: (v) => v.replace(/_/g, '.') },
  { name: 'Linux', regex: /Linux/ },
]

function detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase()
  const isIpad = ua.includes('ipad') || (ua.includes('macintosh') && ua.includes('mobile'))
  if (ua.includes('ipad') || isIpad || (ua.includes('android') && !ua.includes('mobile'))) {
    return 'tablet'
  }
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
    return 'mobile'
  }
  return 'desktop'
}

export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  if (!userAgent) {
    return {
      deviceType: 'desktop',
      browserName: null,
      browserVersion: null,
      osName: null,
      osVersion: null,
    }
  }

  let browserName: string | null = null
  let browserVersion: string | null = null
  for (const pattern of BROWSER_PATTERNS) {
    const match = userAgent.match(pattern.regex)
    if (match) {
      browserName = pattern.name
      browserVersion = match[1]
      break
    }
  }

  let osName: string | null = null
  let osVersion: string | null = null
  for (const pattern of OS_PATTERNS) {
    const match = userAgent.match(pattern.regex)
    if (match) {
      osName = pattern.name
      osVersion = match[1]
        ? pattern.normalizeVersion
          ? pattern.normalizeVersion(match[1])
          : match[1]
        : null
      break
    }
  }

  return {
    deviceType: detectDeviceType(userAgent),
    browserName,
    browserVersion,
    osName,
    osVersion,
  }
}
