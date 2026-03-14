import Link from 'next/link';
import { Logo } from '@/components/logo';
import {
  Users,
  FileJson,
  Webhook,
  AlertTriangle,
  Github,
  ArrowRight,
  Check,
  Terminal,
  Zap,
  Lock,
  Star,
} from 'lucide-react';
import { InteractiveDemo } from '@/components/marketing/interactive-demo';

const comparison = [
  { feature: 'Open source', auditkit: true, workos: false, pangea: false, retraced: true, custom: true },
  { feature: 'Managed cloud', auditkit: true, workos: true, pangea: true, retraced: false, custom: false },
  { feature: 'Tamper-proof (hash chain)', auditkit: true, workos: false, pangea: true, retraced: false, custom: false },
  { feature: 'Merkle tree proofs', auditkit: true, workos: false, pangea: true, retraced: false, custom: false },
  { feature: 'Tenant-scoped access', auditkit: true, workos: true, pangea: true, retraced: true, custom: false },
  { feature: 'Embeddable viewer', auditkit: true, workos: false, pangea: true, retraced: true, custom: false },
  { feature: 'SIEM streaming', auditkit: true, workos: true, pangea: true, retraced: false, custom: false },
  { feature: 'Multi-language SDKs', auditkit: true, workos: true, pangea: true, retraced: false, custom: false },
  { feature: 'Self-hostable', auditkit: true, workos: false, pangea: false, retraced: true, custom: true },
  { feature: 'GraphQL API', auditkit: true, workos: false, pangea: false, retraced: false, custom: false },
  { feature: 'AI anomaly detection', auditkit: true, workos: false, pangea: false, retraced: false, custom: false },
  { feature: 'Setup time', auditkit: '5 min', workos: '1 day', pangea: '2 hrs', retraced: '1 week', custom: '2-4 weeks' },
  { feature: 'Price (100K events)', auditkit: '$39/mo', workos: '$99+/mo', pangea: 'Contact', retraced: 'Free', custom: 'Dev time' },
];

export default function LandingPage() {
  return (
    <>
      {/* Nav */}
      <nav className="glass-subtle sticky top-0 z-50 border-b border-border/30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-8">
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition">
              Docs
            </Link>
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition">
              Pricing
            </Link>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition">
              Blog
            </Link>
            <a href="https://github.com/AuditKitDev/auditkit" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition">
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <Link
              href="/signup"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition btn-shimmer font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative overflow-x-hidden">
      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-28 pb-20">
        {/* Background glow orbs */}
        <div className="hero-glow -top-40 -left-40 absolute" />
        <div className="hero-glow -top-20 right-0 absolute opacity-40" style={{ background: 'radial-gradient(circle, rgba(192, 132, 252, 0.1) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-8 animate-fade-up">
            <Zap className="h-3.5 w-3.5" />
            <span>Open source</span>
            <span className="w-1 h-1 rounded-full bg-primary/50" />
            <span>Tamper-evident</span>
            <span className="w-1 h-1 rounded-full bg-primary/50" />
            <span>Enterprise-ready</span>
          </div>

          <h1 className="text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
            Ship audit logging in
            <br />
            <span className="gradient-text">5 minutes, not 5 sprints</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed animate-fade-up" style={{ animationDelay: '200ms' }}>
            Immutable, tenant-scoped audit trails that close enterprise deals.
            Stop spending weeks building custom logging infrastructure.
            Open-source SDK with optional managed cloud.
          </p>

          <div className="flex items-center gap-4 mb-14 animate-fade-up" style={{ animationDelay: '300ms' }}>
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-xl font-semibold hover:bg-primary/90 transition-all btn-shimmer glow-primary btn-glow"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://github.com/AuditKitDev/auditkit"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-border px-7 py-3.5 rounded-xl font-semibold hover:bg-secondary hover:border-muted-foreground/20 transition-all"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>

          {/* Code Example */}
          <div className="code-block rounded-xl overflow-hidden shadow-2xl shadow-black/40 animate-fade-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">app.ts</span>
            </div>
            <pre className="p-5 overflow-x-auto text-sm font-mono leading-relaxed">
              <code>
                <span className="code-keyword">import</span>{' '}
                <span className="text-foreground/70">{'{ '}</span>
                <span className="code-function">AuditKit</span>
                <span className="text-foreground/70">{' }'}</span>
                <span className="code-keyword"> from</span>{' '}
                <span className="code-string">{`'@auditkit/sdk'`}</span>
                <span className="text-foreground/70">;</span>
                {'\n\n'}
                <span className="code-keyword">const</span>{' '}
                <span className="text-foreground">audit</span>
                <span className="text-foreground/70"> = </span>
                <span className="code-keyword">new</span>{' '}
                <span className="code-function">AuditKit</span>
                <span className="text-foreground/70">{'({'}</span>
                {'\n  '}
                <span className="code-property">apiKey</span>
                <span className="text-foreground/70">: </span>
                <span className="text-foreground">process.env.</span>
                <span className="code-property">AUDITKIT_API_KEY</span>
                <span className="text-foreground/70">!,</span>
                {'\n'}
                <span className="text-foreground/70">{'});'}</span>
                {'\n\n'}
                <span className="code-keyword">await</span>{' '}
                <span className="text-foreground">audit.</span>
                <span className="code-function">log</span>
                <span className="text-foreground/70">(</span>
                <span className="code-string">{`'document.updated'`}</span>
                <span className="text-foreground/70">, {'{'}</span>
                {'\n  '}
                <span className="code-property">actor</span>
                <span className="text-foreground/70">{': { '}</span>
                <span className="code-property">id</span>
                <span className="text-foreground/70">: </span>
                <span className="code-string">{`'user_123'`}</span>
                <span className="text-foreground/70">, </span>
                <span className="code-property">name</span>
                <span className="text-foreground/70">: </span>
                <span className="code-string">{`'Jane Doe'`}</span>
                <span className="text-foreground/70">{' },'}</span>
                {'\n  '}
                <span className="code-property">target</span>
                <span className="text-foreground/70">{': { '}</span>
                <span className="code-property">type</span>
                <span className="text-foreground/70">: </span>
                <span className="code-string">{`'document'`}</span>
                <span className="text-foreground/70">, </span>
                <span className="code-property">id</span>
                <span className="text-foreground/70">: </span>
                <span className="code-string">{`'doc_456'`}</span>
                <span className="text-foreground/70">{' },'}</span>
                {'\n  '}
                <span className="code-property">tenantId</span>
                <span className="text-foreground/70">: </span>
                <span className="code-string">{`'org_acme'`}</span>
                <span className="text-foreground/70">,</span>
                {'\n'}
                <span className="text-foreground/70">{'});'}</span>
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Social Proof — Real Metrics */}
      <section className="max-w-6xl mx-auto px-6 pb-20 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { icon: Terminal, label: 'Open Source', sublabel: 'AGPLv3 licensed' },
            { icon: Lock, label: 'Tamper-Evident', sublabel: 'SHA-256 hash chaining' },
            { icon: Zap, label: '< 5 min setup', sublabel: 'npm install to production' },
            { icon: Check, label: 'SOC 2 Ready', sublabel: 'Compliance exports included' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 border border-border/50 rounded-xl px-5 py-4 bg-card/50">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sublabel}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pain Points */}
      <section className="max-w-6xl mx-auto px-6 py-28 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">
            Building audit logs in-house costs more than you think
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every B2B SaaS team hits the same wall. Here&apos;s what you&apos;re signing up for when you build it yourself.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: Zap,
              stat: '2-4 weeks',
              title: 'Engineering time',
              description: 'Schema design, hash chaining, tenant isolation, search indexing, export pipelines. That\'s before you write a single test.',
              gradient: 'from-amber-500/20 to-orange-500/20',
            },
            {
              icon: AlertTriangle,
              stat: 'Every quarter',
              title: 'Ongoing compliance maintenance',
              description: 'SOC 2 auditors come back every year. New formats, new requirements, new exports. The maintenance never stops.',
              gradient: 'from-red-500/20 to-pink-500/20',
            },
            {
              icon: Lock,
              stat: 'Deals blocked',
              title: 'Enterprise deals stall at security review',
              description: '"Do you have immutable audit trails?" If the answer is no, your deal sits in security review for weeks.',
              gradient: 'from-indigo-500/20 to-purple-500/20',
            },
          ].map((pain) => (
            <div
              key={pain.title}
              className="group relative border border-border rounded-xl p-7 bg-card card-hover feature-glow overflow-hidden text-center"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${pain.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-5 mx-auto">
                  <pain.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-3xl font-extrabold tracking-tight mb-1">{pain.stat}</p>
                <h3 className="font-bold text-lg mb-3">{pain.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{pain.description}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-lg text-muted-foreground">
          <span className="font-semibold text-foreground">AuditKit handles all of this with a single SDK.</span>
        </p>
      </section>

      {/* Interactive Demo */}
      <InteractiveDemo />

      {/* How it Works */}
      <section className="max-w-6xl mx-auto px-6 py-28 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-4">
            <Terminal className="h-3.5 w-3.5" />
            Quick start
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">Production-ready in three steps</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From zero to enterprise-grade audit trails in under 5 minutes.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative border border-border rounded-xl p-7 bg-card overflow-hidden">
            <div className="absolute top-4 right-5 text-6xl font-black text-muted-foreground/[0.06] leading-none">1</div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-5">
                <Terminal className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">Install the SDK</h3>
              <p className="text-sm text-muted-foreground mb-5">One package. Zero config. Works with Node, Python, Go, and Ruby.</p>
              <div className="code-block rounded-lg p-4">
                <code className="text-sm font-mono">
                  <span className="code-keyword">$</span>{' '}
                  <span className="text-foreground">npm install @auditkit/sdk</span>
                </code>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative border border-border rounded-xl p-7 bg-card overflow-hidden">
            <div className="absolute top-4 right-5 text-6xl font-black text-muted-foreground/[0.06] leading-none">2</div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-5">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">Log your first event</h3>
              <p className="text-sm text-muted-foreground mb-5">Five lines of code. Tamper-evident from the first event.</p>
              <div className="code-block rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm font-mono leading-relaxed">
                  <code>
                    <span className="code-keyword">await</span>{' '}
                    <span className="text-foreground">audit.</span>
                    <span className="code-function">log</span>
                    <span className="text-foreground/70">(</span>
                    <span className="code-string">&apos;user.login&apos;</span>
                    <span className="text-foreground/70">, {'{'}</span>
                    {'\n'}
                    {'  '}<span className="code-property">actor</span><span className="text-foreground/70">: {'{ '}</span><span className="code-property">id</span><span className="text-foreground/70">: </span><span className="code-string">&apos;usr_1&apos;</span><span className="text-foreground/70">{' },'}</span>
                    {'\n'}
                    {'  '}<span className="code-property">tenantId</span><span className="text-foreground/70">: </span><span className="code-string">&apos;org_acme&apos;</span><span className="text-foreground/70">,</span>
                    {'\n'}
                    <span className="text-foreground/70">{'});'}</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative border border-border rounded-xl p-7 bg-card overflow-hidden">
            <div className="absolute top-4 right-5 text-6xl font-black text-muted-foreground/[0.06] leading-none">3</div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-5">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">Your customers see their audit trail</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Embed our pre-built viewer in your app. Tenant-scoped by default so each customer sees only their own events.
              </p>
              <div className="code-block rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm font-mono leading-relaxed">
                  <code>
                    <span className="code-keyword">{'<'}</span>
                    <span className="code-function">AuditKitViewer</span>
                    {'\n'}
                    {'  '}<span className="code-property">tenantId</span><span className="text-foreground/70">=</span><span className="code-string">&quot;org_acme&quot;</span>
                    {'\n'}
                    {'  '}<span className="code-property">token</span><span className="text-foreground/70">=</span><span className="text-foreground/70">{'{'}</span><span className="text-foreground">jwt</span><span className="text-foreground/70">{'}'}</span>
                    {'\n'}
                    <span className="code-keyword">{'/>'}</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — Chess Layout (alternating) */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-28 relative">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-4">
            <Lock className="h-3.5 w-3.5" />
            Enterprise-grade
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">Built for the people who actually need audit logs</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Auditors, customers, security teams, compliance officers. AuditKit is designed for all of them.
          </p>
        </div>

        {/* Feature 1 — Left text, right visual */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-28">
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 mb-5">
              <Lock className="h-6 w-6 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight mb-3">Your auditors need proof, not promises.</h3>
            <p className="text-muted-foreground leading-relaxed mb-5">
              Every event is SHA-256 hash-chained to the previous one, creating a cryptographic chain of custody that proves no records have been altered. Merkle tree verification lets auditors validate the entire log mathematically.
            </p>
            <ul className="space-y-2">
              {['SHA-256 hash chaining', 'Merkle tree proofs', 'Cryptographic verification API', 'Append-only storage'].map((item) => (
                <li key={item} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="code-block rounded-xl p-6 shadow-2xl shadow-black/30">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">verification</span>
            </div>
            <pre className="text-sm font-mono leading-relaxed overflow-x-auto">
              <code>
                <span className="code-keyword">const</span>{' '}
                <span className="text-foreground">proof</span>
                <span className="text-foreground/70"> = </span>
                <span className="code-keyword">await</span>{' '}
                <span className="text-foreground">audit.</span>
                <span className="code-function">verify</span>
                <span className="text-foreground/70">(</span>
                <span className="code-string">&apos;evt_789&apos;</span>
                <span className="text-foreground/70">);</span>
                {'\n\n'}
                <span className="text-foreground/40">{'// => { '}</span>
                {'\n'}
                <span className="text-foreground/40">{'//   valid: true,'}</span>
                {'\n'}
                <span className="text-foreground/40">{'//   hashChain: "unbroken",'}</span>
                {'\n'}
                <span className="text-foreground/40">{'//   merkleRoot: "a1b2c3..."'}</span>
                {'\n'}
                <span className="text-foreground/40">{'// }'}</span>
              </code>
            </pre>
          </div>
        </div>

        {/* Feature 2 — Right text, left visual */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-28">
          <div className="order-2 md:order-1 code-block rounded-xl p-6 shadow-2xl shadow-black/30">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">embedded viewer</span>
            </div>
            <div className="space-y-3">
              {[
                { action: 'document.updated', actor: 'Jane Doe', time: '2 min ago' },
                { action: 'member.invited', actor: 'Mike Chen', time: '14 min ago' },
                { action: 'permission.changed', actor: 'Sarah Kim', time: '1 hr ago' },
                { action: 'export.requested', actor: 'Jane Doe', time: '3 hrs ago' },
              ].map((evt) => (
                <div key={evt.action + evt.time} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-sm font-mono text-foreground">{evt.action}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{evt.actor}</span>
                    <span className="text-xs text-muted-foreground/60">{evt.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 mb-5">
              <Users className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight mb-3">Your customers need their own audit trail.</h3>
            <p className="text-muted-foreground leading-relaxed mb-5">
              Tenant-scoped by default. Each customer sees only their own events. Embed the pre-built viewer directly in your app with a single React component or iframe.
            </p>
            <ul className="space-y-2">
              {['Row-level tenant isolation', 'Embeddable React viewer', 'JWT-scoped access tokens', 'Full-text search per tenant'].map((item) => (
                <li key={item} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature 3 — Left text, right visual */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-28">
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pink-500/10 mb-5">
              <Webhook className="h-6 w-6 text-pink-400" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight mb-3">Your security team needs real-time alerts.</h3>
            <p className="text-muted-foreground leading-relaxed mb-5">
              Webhooks fire on every event. SIEM streaming pushes to Splunk, Datadog, and S3 in real time. Built-in anomaly detection flags suspicious patterns before they become incidents.
            </p>
            <ul className="space-y-2">
              {['HMAC-signed webhooks with retries', 'SIEM streaming (Splunk, Datadog, S3)', 'AI anomaly detection', 'Slack/Discord notifications'].map((item) => (
                <li key={item} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="code-block rounded-xl p-6 shadow-2xl shadow-black/30">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">webhook payload</span>
            </div>
            <pre className="text-sm font-mono leading-relaxed overflow-x-auto">
              <code>
                <span className="text-foreground/70">{'{'}</span>
                {'\n'}
                {'  '}<span className="code-property">&quot;type&quot;</span><span className="text-foreground/70">: </span><span className="code-string">&quot;anomaly.detected&quot;</span><span className="text-foreground/70">,</span>
                {'\n'}
                {'  '}<span className="code-property">&quot;severity&quot;</span><span className="text-foreground/70">: </span><span className="code-string">&quot;high&quot;</span><span className="text-foreground/70">,</span>
                {'\n'}
                {'  '}<span className="code-property">&quot;reason&quot;</span><span className="text-foreground/70">: </span><span className="code-string">&quot;Bulk export from new IP&quot;</span><span className="text-foreground/70">,</span>
                {'\n'}
                {'  '}<span className="code-property">&quot;actor&quot;</span><span className="text-foreground/70">: </span><span className="code-string">&quot;user_123&quot;</span><span className="text-foreground/70">,</span>
                {'\n'}
                {'  '}<span className="code-property">&quot;tenant&quot;</span><span className="text-foreground/70">: </span><span className="code-string">&quot;org_acme&quot;</span>
                {'\n'}
                <span className="text-foreground/70">{'}'}</span>
              </code>
            </pre>
          </div>
        </div>

        {/* Feature 4 — Right text, left visual */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 code-block rounded-xl p-6 shadow-2xl shadow-black/30">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">compliance export</span>
            </div>
            <pre className="text-sm font-mono leading-relaxed overflow-x-auto">
              <code>
                <span className="code-keyword">const</span>{' '}
                <span className="text-foreground">report</span>
                <span className="text-foreground/70"> = </span>
                <span className="code-keyword">await</span>{' '}
                <span className="text-foreground">audit.</span>
                <span className="code-function">export</span>
                <span className="text-foreground/70">({'{'}</span>
                {'\n'}
                {'  '}<span className="code-property">format</span><span className="text-foreground/70">: </span><span className="code-string">&apos;pdf&apos;</span><span className="text-foreground/70">,</span>
                {'\n'}
                {'  '}<span className="code-property">standard</span><span className="text-foreground/70">: </span><span className="code-string">&apos;ocsf&apos;</span><span className="text-foreground/70">,</span>
                {'\n'}
                {'  '}<span className="code-property">range</span><span className="text-foreground/70">: </span><span className="code-string">&apos;last-quarter&apos;</span><span className="text-foreground/70">,</span>
                {'\n'}
                {'  '}<span className="code-property">tenantId</span><span className="text-foreground/70">: </span><span className="code-string">&apos;org_acme&apos;</span><span className="text-foreground/70">,</span>
                {'\n'}
                <span className="text-foreground/70">{'});'}</span>
                {'\n\n'}
                <span className="text-foreground/40">{'// => SOC 2 evidence PDF ready'}</span>
              </code>
            </pre>
          </div>
          <div className="order-1 md:order-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 mb-5">
              <FileJson className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight mb-3">Your compliance officer needs exports.</h3>
            <p className="text-muted-foreground leading-relaxed mb-5">
              One-click exports in CSV, JSON, and PDF. Industry-standard OCSF and CEF formats. Generate SOC 2 evidence packages that auditors actually accept.
            </p>
            <ul className="space-y-2">
              {['CSV, JSON, PDF exports', 'OCSF + CEF standard formats', 'SOC 2 evidence packages', 'Scheduled compliance reports'].map((item) => (
                <li key={item} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">How AuditKit compares</h2>
          <p className="text-muted-foreground text-lg">
            The only tool that&apos;s open source, managed, self-hostable, and cryptographically immutable.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xl shadow-black/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-5 font-medium text-muted-foreground">Feature</th>
                <th className="text-center p-5 font-bold text-primary">
                  <Logo size="md" />
                </th>
                <th className="text-center p-5 font-medium text-muted-foreground">WorkOS</th>
                <th className="text-center p-5 font-medium text-muted-foreground">Pangea</th>
                <th className="text-center p-5 font-medium text-muted-foreground">Retraced</th>
                <th className="text-center p-5 font-medium text-muted-foreground">Custom Build</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr key={row.feature} className={`border-b border-border/30 ${i % 2 === 0 ? 'bg-secondary/20' : ''}`}>
                  <td className="p-5 font-medium">{row.feature}</td>
                  {[row.auditkit, row.workos, row.pangea, row.retraced, row.custom].map((val, j) => (
                    <td key={j} className="text-center p-5">
                      {val === true ? (
                        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${j === 0 ? 'bg-success/20' : 'bg-muted'}`}>
                          <Check className={`h-3.5 w-3.5 ${j === 0 ? 'text-success' : 'text-muted-foreground'}`} />
                        </div>
                      ) : val === false ? (
                        <span className="text-muted-foreground/40">&mdash;</span>
                      ) : (
                        <span className={`text-sm ${j === 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                          {String(val)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">Simple, usage-based pricing</h2>
          <p className="text-muted-foreground text-lg">Start free. Scale as you grow.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              name: 'Free',
              price: '$0',
              period: '',
              events: '1K events/mo',
              retention: '7-day retention',
              cta: 'Get Started Free',
              features: ['SDK + hash chaining', 'Search + API', 'Basic dashboard', '1 project', '1 seat', 'Community support'],
            },
            {
              name: 'Pro',
              price: '$39',
              period: '/mo',
              events: '50K events/mo',
              retention: '90-day retention',
              cta: 'Start Pro Trial',
              popular: true,
              features: [
                'Everything in Free',
                'Embedded viewer UI',
                'CSV/JSON export',
                'Webhooks + Slack/Discord',
                'Anomaly detection',
                'Unlimited tenants',
                '3 projects \u00b7 5 seats',
              ],
            },
            {
              name: 'Business',
              price: '$99',
              period: '/mo',
              events: '500K events/mo',
              retention: '1-year retention',
              cta: 'Start Business Trial',
              features: [
                'Everything in Pro',
                'SIEM streaming included',
                'OCSF/CEF formats',
                'Compliance evidence export',
                'Data residency (EU/US)',
                'PII redaction',
                '10 projects \u00b7 15 seats',
              ],
            },
            {
              name: 'Supersize + Milkshake',
              price: '$349',
              period: '/mo',
              events: '5M events/mo',
              retention: '7-year retention',
              cta: 'Go Supersize',
              features: [
                'Everything in Business',
                'Merkle tree proofs',
                'Legal hold',
                'SSO/SCIM',
                'GraphQL API',
                '99.99% SLA',
                'Unlimited projects, seats & tenants',
                'Priority support + extra milkshakes',
              ],
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-xl p-7 flex flex-col transition-all duration-300 ${
                tier.popular
                  ? 'gradient-border bg-card glow-primary-lg scale-[1.02] glow-breathe'
                  : 'border border-border bg-card pricing-glow'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-foreground bg-primary px-3 py-1 rounded-full shadow-lg">
                    <Star className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}
              <h3 className="text-lg font-bold mb-1">{tier.name}</h3>
              <div className="mb-1">
                <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                <span className="text-muted-foreground text-sm">{tier.period}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{tier.events}</p>
              <p className="text-sm text-muted-foreground/60 mb-7">{tier.retention}</p>

              <button
                className={`w-full py-2.5 rounded-lg text-sm font-semibold mb-7 transition-all ${
                  tier.popular
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 btn-shimmer glow-primary btn-glow'
                    : 'bg-secondary text-foreground hover:bg-muted border border-border btn-glow'
                }`}
              >
                {tier.cta}
              </button>

              <ul className="space-y-3 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="text-sm text-muted-foreground flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-6 py-28 relative">
        <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-4">
              <Star className="h-3.5 w-3.5" />
              Trusted by builders
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">Teams ship faster with AuditKit</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From secure document sharing to AI-powered operations, teams choose AuditKit to handle the compliance work they&apos;d rather not build.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "We needed tamper-proof audit trails for every document view, download, and watermark event. AuditKit gave us enterprise-grade logging in an afternoon \u2014 would have taken us weeks to build the hash-chaining alone.",
                name: 'Engineering Team',
                role: 'CloakShare',
                description: 'Open-source secure document & video sharing with dynamic watermarks',
                url: 'https://cloakshare.dev',
                gradient: 'from-emerald-500/20 to-teal-500/20',
                initial: 'C',
                initialBg: 'bg-emerald-500/15 text-emerald-400',
              },
              {
                quote: "Our enterprise customers asked for full audit visibility into every crawl, every report, every user action. AuditKit\u2019s tenant-scoped logs and embeddable viewer meant we could ship that feature same-day instead of next quarter.",
                name: 'Product Team',
                role: 'SiteCrawlIQ',
                description: 'AI-driven SEO & geographic website auditing platform',
                url: 'https://sitecrawliq.com',
                gradient: 'from-blue-500/20 to-cyan-500/20',
                initial: 'S',
                initialBg: 'bg-blue-500/15 text-blue-400',
              },
              {
                quote: "When you\u2019re handling SOPs and sensitive operational data, you need an immutable record of who accessed what and when. AuditKit\u2019s SIEM streaming and compliance exports made our SOC 2 prep painless.",
                name: 'Operations Team',
                role: 'DocOpsIQ',
                description: 'AI-powered SOP retrieval with cited sources',
                url: 'https://docopsiq.com',
                gradient: 'from-amber-500/20 to-orange-500/20',
                initial: 'D',
                initialBg: 'bg-amber-500/15 text-amber-400',
              },
            ].map((testimonial) => (
              <div
                key={testimonial.role}
                className="group relative border border-border rounded-xl p-7 bg-card card-hover feature-glow overflow-hidden flex flex-col"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative flex-1">
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  {/* Quote */}
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                </div>
                {/* Attribution */}
                <div className="relative flex items-center gap-3 pt-5 border-t border-border/40">
                  <div className={`w-10 h-10 rounded-xl ${testimonial.initialBg} flex items-center justify-center font-bold text-sm`}>
                    {testimonial.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <a
                      href={testimonial.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline transition"
                    >
                      {testimonial.role}
                    </a>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{testimonial.description}</p>
                  </div>
                  <a
                    href={testimonial.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground/40 hover:text-primary transition"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-28 text-center relative">
        <div className="hero-glow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold tracking-tight mb-5">Stop spending sprints on audit logging</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto text-lg leading-relaxed">
            Your enterprise customers need audit trail access. Ship it today, not next quarter.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-all btn-shimmer glow-primary-lg text-lg"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://github.com/AuditKitDev/auditkit"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-border px-8 py-4 rounded-xl font-semibold hover:bg-secondary hover:border-muted-foreground/20 transition-all text-lg"
            >
              <Github className="h-5 w-5" />
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">Frequently asked questions</h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about AuditKit.
          </p>
        </div>

        <div className="space-y-6">
          {[
            {
              question: 'What is AuditKit?',
              answer:
                'AuditKit is an open-source, tamper-evident audit logging platform built for B2B SaaS. It gives your application immutable, tenant-scoped audit trails with SHA-256 hash chaining and Merkle tree cryptographic proofs. You can use the managed cloud or self-host on your own infrastructure.',
            },
            {
              question: 'How does tamper-proof logging work?',
              answer:
                'Every audit event is linked to the previous one using SHA-256 hash chaining. AuditKit also builds Merkle tree proofs over batches of events. If any event is modified or deleted, the hash chain breaks and the tampering is immediately detectable. This gives you cryptographic proof that your audit trail has not been altered.',
            },
            {
              question: 'What compliance standards does AuditKit support?',
              answer:
                'AuditKit generates compliance-ready exports for SOC 2, ISO 27001, HIPAA, and GDPR. It supports industry-standard OCSF and CEF event formats, and can produce PDF evidence packages that auditors accept. SIEM streaming to Splunk, Datadog, and Elastic is also included for continuous monitoring.',
            },
            {
              question: 'Can I self-host AuditKit?',
              answer:
                'Yes. AuditKit is fully self-hostable using Docker Compose. The project is licensed under AGPLv3 with a commercial license option for enterprises that need it. You get zero vendor lock-in and full control over your data residency.',
            },
            {
              question: 'How fast is setup?',
              answer:
                'Most teams are logging their first audit event within 5 minutes. Install the SDK (TypeScript, Python, Go, or Java), call audit.log() with your event data, and you are done. The embeddable React viewer can be dropped into your customer dashboard with a single component.',
            },
            {
              question: "What is the difference between free and paid plans?",
              answer:
                'The Free plan includes 1K events per month, 7-day retention, SDK access with hash chaining, and basic search. Pro ($39/mo) adds the embedded viewer, webhooks, anomaly detection, and 50K events. Business ($99/mo) includes SIEM streaming, compliance exports, data residency, and 500K events. Supersize ($349/mo) adds Merkle tree proofs, SSO/SCIM, GraphQL API, 99.99% SLA, and 5M events.',
            },
            {
              question: 'What SDKs and APIs are available?',
              answer:
                'AuditKit provides official SDKs for TypeScript, Python, Go, and Java, all with full type safety. The platform also offers a GraphQL API with filtering, pagination, and real-time subscriptions. Webhooks can push events to Slack, Discord, or any HTTP endpoint.',
            },
            {
              question: 'How does tenant-scoped access work?',
              answer:
                'Every audit event is associated with a tenant ID. Your customers can only see their own logs, and access is enforced at the API level. The embeddable viewer component automatically scopes to the current tenant, so you can safely embed it in multi-tenant dashboards without any extra access control logic.',
            },
          ].map((faq) => (
            <details
              key={faq.question}
              className="group border border-border rounded-xl bg-card overflow-hidden"
            >
              <summary className="flex items-center justify-between p-6 cursor-pointer font-semibold hover:bg-secondary/50 transition select-none">
                {faq.question}
                <span className="text-muted-foreground ml-4 shrink-0 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
              </summary>
              <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'What is AuditKit?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'AuditKit is an open-source, tamper-evident audit logging platform built for B2B SaaS. It gives your application immutable, tenant-scoped audit trails with SHA-256 hash chaining and Merkle tree cryptographic proofs. You can use the managed cloud or self-host on your own infrastructure.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How does tamper-proof logging work?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Every audit event is linked to the previous one using SHA-256 hash chaining. AuditKit also builds Merkle tree proofs over batches of events. If any event is modified or deleted, the hash chain breaks and the tampering is immediately detectable. This gives you cryptographic proof that your audit trail has not been altered.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What compliance standards does AuditKit support?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'AuditKit generates compliance-ready exports for SOC 2, ISO 27001, HIPAA, and GDPR. It supports industry-standard OCSF and CEF event formats, and can produce PDF evidence packages that auditors accept. SIEM streaming to Splunk, Datadog, and Elastic is also included for continuous monitoring.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Can I self-host AuditKit?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes. AuditKit is fully self-hostable using Docker Compose. The project is licensed under AGPLv3 with a commercial license option for enterprises that need it. You get zero vendor lock-in and full control over your data residency.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How fast is setup?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Most teams are logging their first audit event within 5 minutes. Install the SDK (TypeScript, Python, Go, or Java), call audit.log() with your event data, and you are done. The embeddable React viewer can be dropped into your customer dashboard with a single component.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What is the difference between free and paid plans?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'The Free plan includes 1K events per month, 7-day retention, SDK access with hash chaining, and basic search. Pro ($39/mo) adds the embedded viewer, webhooks, anomaly detection, and 50K events. Business ($99/mo) includes SIEM streaming, compliance exports, data residency, and 500K events. Supersize ($349/mo) adds Merkle tree proofs, SSO/SCIM, GraphQL API, 99.99% SLA, and 5M events.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What SDKs and APIs are available?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'AuditKit provides official SDKs for TypeScript, Python, Go, and Java, all with full type safety. The platform also offers a GraphQL API with filtering, pagination, and real-time subscriptions. Webhooks can push events to Slack, Discord, or any HTTP endpoint.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How does tenant-scoped access work?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Every audit event is associated with a tenant ID. Your customers can only see their own logs, and access is enforced at the API level. The embeddable viewer component automatically scopes to the current tenant, so you can safely embed it in multi-tenant dashboards without any extra access control logic.',
                  },
                },
              ],
            }),
          }}
        />
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="mb-4">
                <Logo size="md" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Open-source audit logging for B2B SaaS. Tamper-evident, tenant-scoped, enterprise-ready.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground transition">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground transition">Pricing</Link></li>
                <li><Link href="/docs" className="hover:text-foreground transition">Documentation</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Developers</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="https://github.com/AuditKitDev/auditkit" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">GitHub</a></li>
                <li><Link href="/docs" className="hover:text-foreground transition">API Reference</Link></li>
                <li><Link href="/docs" className="hover:text-foreground transition">SDK Guide</Link></li>
                <li><Link href="/docs" className="hover:text-foreground transition">Self-Hosting</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link href="/blog" className="hover:text-foreground transition">Blog</Link></li>
                <li><Link href="#" className="hover:text-foreground transition">Privacy</Link></li>
                <li><Link href="#" className="hover:text-foreground transition">Terms</Link></li>
                <li><a href="mailto:hello@auditkit.dev" className="hover:text-foreground transition">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-between pt-8 border-t border-border/30">
            <span className="text-sm text-muted-foreground/60">&copy; 2026 AuditKit. AGPLv3 + Commercial.</span>
            <div className="flex items-center gap-4">
              <a href="https://github.com/AuditKitDev/auditkit" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/60 hover:text-foreground transition">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
