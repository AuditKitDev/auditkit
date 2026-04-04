import Link from 'next/link';
import { Logo } from '@/components/logo';
import {
  Shield,
  Github,
  Terminal,
  Eye,
  FileCode,
  Lock,
  Zap,
  Package,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'aidevshield — Security Scanner for AI Coding Tools',
  description:
    'Free, open-source security scanner that catches prompt injection, supply chain attacks, and AI config backdoors. Like npm audit for AI workflows.',
  keywords: [
    'aidevshield',
    'ai security scanner',
    'prompt injection detection',
    'github actions security',
    'npm supply chain attack',
    'cursor security',
    'cline security',
    'copilot security',
    'ai workflow security',
    'sarif scanner',
    'clinejection',
    'ai coding tool security',
  ],
  alternates: { canonical: 'https://auditkit.dev/aidevshield' },
  openGraph: {
    title: 'aidevshield — Security Scanner for AI Coding Tools',
    description:
      'Free, open-source security scanner. Catches prompt injection, supply chain attacks, and invisible backdoors in AI config files.',
    url: 'https://auditkit.dev/aidevshield',
    siteName: 'AuditKit',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'aidevshield — npm audit for AI workflows',
    description:
      'Free CLI scanner. Catches the same patterns behind Clinejection, Cacheract, and the Shai-Hulud npm worm.',
  },
};

const checks = [
  {
    category: 'GitHub Actions Workflows',
    icon: FileCode,
    items: [
      { severity: 'CRITICAL', title: 'Wildcard user permissions on AI workflows', attack: 'Clinejection' },
      { severity: 'CRITICAL', title: 'Untrusted input interpolation (${{ github.event.issue.title }})', attack: 'Script injection' },
      { severity: 'CRITICAL', title: 'pull_request_target with untrusted checkout', attack: 'Pwn Request' },
      { severity: 'HIGH', title: 'AI workflow triggered by issues/comments', attack: 'Prompt injection' },
      { severity: 'HIGH', title: 'AI step with shell execution capability', attack: 'RCE via AI' },
      { severity: 'MEDIUM', title: 'Unpinned third-party actions (mutable tags)', attack: 'tj-actions attack' },
      { severity: 'MEDIUM', title: 'Cache + credentials in same workflow', attack: 'Cacheract' },
    ],
  },
  {
    category: 'npm Lifecycle Scripts',
    icon: Package,
    items: [
      { severity: 'HIGH', title: 'curl | sh / wget | bash in lifecycle scripts', attack: 'Shai-Hulud worm' },
      { severity: 'HIGH', title: 'npm install -g in lifecycle hooks', attack: 'Global package hijack' },
      { severity: 'HIGH', title: 'eval() / exec() / child_process in scripts', attack: 'Arbitrary code execution' },
      { severity: 'HIGH', title: 'base64 decode / new Function()', attack: 'Obfuscated payloads' },
    ],
  },
  {
    category: 'AI Config Files',
    icon: Eye,
    items: [
      { severity: 'CRITICAL', title: 'Hidden Unicode characters (zero-width, RTL marks)', attack: 'Invisible prompt injection' },
      { severity: 'MEDIUM', title: 'Bash(*) wildcard permissions', attack: 'Unrestricted shell access' },
      { severity: 'MEDIUM', title: 'dangerouslyDisableSandbox: true', attack: 'Sandbox bypass' },
      { severity: 'MEDIUM', title: 'dangerously-skip-permissions', attack: 'Permission bypass' },
    ],
  },
];

const realAttacks = [
  {
    name: 'Clinejection',
    date: 'Dec 2025',
    impact: '5M+ developers exposed',
    description: 'Attacker opened a GitHub issue with prompt injection in the title. Cline\'s AI triage bot published compromised code to the VS Code Marketplace.',
    detects: 'Wildcard permissions, untrusted input interpolation, AI action with shell execution',
  },
  {
    name: 'tj-actions Supply Chain',
    date: 'Mar 2025',
    impact: '23,000+ repos compromised',
    description: 'Exploited pull_request_target to steal a PAT, then compromised tj-actions/changed-files. Tags silently repointed. Ultimate target: Coinbase.',
    detects: 'pull_request_target with untrusted checkout, unpinned third-party actions',
  },
  {
    name: 'Cacheract',
    date: 'Dec 2024',
    impact: 'Any repo using GitHub Actions cache',
    description: 'GitHub Actions caches poisoned to replace node_modules with malicious code. When publishing workflows restore the cache, attacker code runs with NPM_TOKEN access.',
    detects: 'actions/cache combined with credential secrets in same workflow',
  },
  {
    name: 'Shai-Hulud npm Worm',
    date: 'Sep 2025',
    impact: '500+ packages, self-propagating',
    description: 'First self-propagating worm in npm. Used postinstall hooks with curl | bash. Harvested tokens and self-replicated to other packages owned by the same maintainer.',
    detects: 'curl | bash patterns, suspicious lifecycle scripts in node_modules/',
  },
];

const sevColors: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
  HIGH: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  MEDIUM: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

export default function AidevshieldPage() {
  return (
    <>
      {/* Nav */}
      <nav className="glass-subtle sticky top-0 z-50 border-b border-border/30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-8">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
              AuditKit
            </Link>
            <a
              href="https://github.com/aidevshield/aidevshield"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/aidevshield"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition"
            >
              <Package className="h-4 w-4" />
              npm
            </a>
          </div>
        </div>
      </nav>

      <div className="relative overflow-x-hidden">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm mb-6">
              <Shield className="h-3.5 w-3.5" />
              Free &amp; Open Source &middot; by AuditKit
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              <span className="text-emerald-400">npm audit</span> for AI workflows
            </h1>

            <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
              Security scanner that catches prompt injection, supply chain attacks, and invisible
              backdoors in AI coding tool configurations. The same patterns behind Clinejection,
              Cacheract, and the Shai-Hulud npm worm.
            </p>

            <div className="bg-muted/50 border border-border rounded-xl px-6 py-4 font-mono text-base mb-8 inline-block">
              <span className="text-muted-foreground">$</span>{' '}
              <span className="text-emerald-400">npx aidevshield scan .</span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <a
                href="https://github.com/aidevshield/aidevshield"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition font-medium"
              >
                <Github className="h-5 w-5" />
                View on GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/aidevshield"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg hover:bg-muted/50 transition text-muted-foreground hover:text-foreground font-medium"
              >
                <Package className="h-5 w-5" />
                npm install aidevshield
              </a>
            </div>
          </div>
        </section>

        {/* Terminal Preview */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="bg-[#0d1117] border border-border rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-border">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">terminal</span>
            </div>
            <div className="px-6 py-5 font-mono text-sm leading-7 space-y-0.5">
              <p><span className="text-muted-foreground">$</span> <span className="text-emerald-400">npx aidevshield scan .</span></p>
              <p className="text-muted-foreground mt-3">  aidevshield v1.0.0 — AI Workflow Security Scanner</p>
              <p className="text-muted-foreground mt-1">  Scanning: /home/user/my-project</p>
              <p className="text-muted-foreground">  Checks:   workflows | package.json | AI configs | .gitignore</p>

              <p className="mt-4"><span className="text-red-400 font-bold">[CRITICAL]</span> <span className="text-muted-foreground">.github/workflows/ai-triage.yml:18</span></p>
              <p className="text-gray-300 pl-4">Wildcard user permissions on AI workflow</p>
              <p className="text-muted-foreground pl-4 text-xs">allowed_non_write_users: &quot;*&quot; lets any GitHub user trigger this workflow</p>
              <p className="text-emerald-400/70 pl-4 text-xs">Fix: Restrict to specific trusted usernames or remove the wildcard</p>

              <p className="mt-3"><span className="text-red-400 font-bold">[CRITICAL]</span> <span className="text-muted-foreground">.github/workflows/pr-deploy.yml:5</span></p>
              <p className="text-gray-300 pl-4">pull_request_target with untrusted checkout (Pwn Request)</p>
              <p className="text-muted-foreground pl-4 text-xs">Checking out PR head runs attacker code with access to secrets</p>
              <p className="text-emerald-400/70 pl-4 text-xs">Fix: Use pull_request trigger instead, or checkout base ref</p>

              <p className="mt-3"><span className="text-amber-400 font-bold">[HIGH]</span> <span className="text-muted-foreground">node_modules/shady-pkg/package.json</span></p>
              <p className="text-gray-300 pl-4">curl | sh in postinstall lifecycle script</p>
              <p className="text-muted-foreground pl-4 text-xs">Executes remote code during npm install — Shai-Hulud attack pattern</p>
              <p className="text-emerald-400/70 pl-4 text-xs">Fix: Remove the dependency or pin to a verified version</p>

              <p className="mt-3"><span className="text-red-400 font-bold">[CRITICAL]</span> <span className="text-muted-foreground">.cursorrules:1</span></p>
              <p className="text-gray-300 pl-4">Hidden Unicode characters detected (invisible prompt injection)</p>
              <p className="text-muted-foreground pl-4 text-xs">3 zero-width joiners found — invisible to humans, read by AI</p>
              <p className="text-emerald-400/70 pl-4 text-xs">Fix: Remove non-visible characters or regenerate the file</p>

              <p className="mt-4 text-muted-foreground">  24 issues found (<span className="text-red-400">6 critical</span>, <span className="text-amber-400">8 high</span>, <span className="text-blue-400">6 medium</span>, 2 low, 2 info)</p>
            </div>
          </div>
        </section>

        {/* What it checks */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">
              What it checks
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              22 detection rules across three attack surfaces. Every rule maps to a real-world exploit.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {checks.map((group) => (
              <div key={group.category} className="border border-border rounded-xl p-6 bg-card">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <group.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold">{group.category}</h3>
                </div>
                <div className="space-y-3">
                  {group.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${sevColors[item.severity]}`}>
                        {item.severity}
                      </span>
                      <div>
                        <p className="text-sm leading-snug">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.attack}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Real attacks */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">
              Real attacks this catches
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every detection rule exists because of a real incident. These aren&apos;t theoretical.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {realAttacks.map((attack) => (
              <div key={attack.name} className="border border-border rounded-xl p-7 bg-card group hover:border-red-500/20 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">{attack.name}</h3>
                  <span className="text-xs text-muted-foreground font-mono">{attack.date}</span>
                </div>
                <p className="text-sm text-red-400 font-medium mb-3">{attack.impact}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{attack.description}</p>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-4 py-2.5">
                  <p className="text-xs text-emerald-400">
                    <span className="font-bold">aidevshield detects:</span> {attack.detects}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick start */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">Get started in 10 seconds</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Run the scanner', code: 'npx aidevshield scan .' },
              { step: '2', title: 'Fix critical issues', code: 'Follow the fix suggestions' },
              { step: '3', title: 'Add to CI', code: 'Add to .github/workflows/' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground font-mono">{s.code}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-muted/30 border border-border rounded-xl p-6 max-w-2xl mx-auto">
            <p className="text-sm font-mono text-muted-foreground mb-2"># CI/CD Integration</p>
            <pre className="text-sm font-mono text-foreground leading-relaxed whitespace-pre">{`# .github/workflows/security.yml
name: AI Security Check
on: [push, pull_request]
jobs:
  aidevshield:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx aidevshield scan .`}</pre>
          </div>
        </section>

        {/* Properties */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Lock, title: 'Fully offline', desc: 'No API keys, no network requests, no telemetry' },
              { icon: Zap, title: 'Single dependency', desc: 'Just js-yaml. Node 16+. Nothing else.' },
              { icon: Terminal, title: 'Three output modes', desc: 'Text, JSON, and SARIF 2.1.0 for GitHub Code Scanning' },
              { icon: Shield, title: '56 tests', desc: 'Every detection rule tested against realistic fixtures' },
            ].map((prop) => (
              <div key={prop.title} className="border border-border rounded-xl p-6 bg-card text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-4">
                  <prop.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold mb-1">{prop.title}</h3>
                <p className="text-sm text-muted-foreground">{prop.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="border border-border rounded-2xl p-12 bg-card text-center">
            <h2 className="text-3xl font-extrabold tracking-tight mb-4">
              Scan your project now
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              One command. No install needed. No API key. No sign-up.
            </p>
            <div className="bg-muted/50 border border-border rounded-xl px-6 py-4 font-mono text-lg mb-8 inline-block">
              <span className="text-muted-foreground">$</span>{' '}
              <span className="text-emerald-400">npx aidevshield scan .</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://github.com/aidevshield/aidevshield"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition font-medium"
              >
                <Github className="h-5 w-5" />
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/aidevshield"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg hover:bg-muted/50 transition text-muted-foreground hover:text-foreground font-medium"
              >
                <Package className="h-5 w-5" />
                npm
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 py-12">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                aidevshield is open source (MIT) by{' '}
                <Link href="/" className="text-foreground hover:text-primary transition">
                  AuditKit
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://github.com/aidevshield/aidevshield" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-foreground transition">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
