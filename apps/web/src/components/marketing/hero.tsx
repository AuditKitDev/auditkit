'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Shield,
  Zap,
  ArrowRight,
  Github,
  Lock,
  DollarSign,
  Terminal,
  FileCheck,
  ScrollText,
  AlertTriangle,
} from 'lucide-react';

/* ---------- Animation variants ---------- */
const fadeInUp = {
  hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, delay: i * 0.15, ease: [0.25, 0.4, 0.25, 1] as const },
  }),
};

const floatBadge = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 1.0 + i * 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const statPop = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.8 + i * 0.1, duration: 0.4, type: 'spring' as const, stiffness: 200 },
  }),
};

/* ---------- Floating badge ---------- */
function FloatingBadge({
  icon: Icon,
  label,
  value,
  className,
  index,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className: string;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={floatBadge}
      initial="hidden"
      animate="visible"
      className={`absolute glass rounded-xl px-4 py-2.5 hidden lg:flex items-center gap-3 ${className}`}
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <span className="text-sm font-bold text-foreground block leading-tight">{value}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
    </motion.div>
  );
}

/* ---------- Hero ---------- */
export function Hero() {
  return (
    <section className="relative max-w-6xl mx-auto px-6 pt-28 pb-20">
      {/* Background glow orbs */}
      <div className="hero-glow -top-40 -left-40 absolute" />
      <div
        className="hero-glow -top-20 right-0 absolute opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(192, 132, 252, 0.1) 0%, transparent 70%)' }}
      />

      {/* Floating badges */}
      <FloatingBadge icon={Shield} label="SOC 2 Controls" value="51" className="top-[15%] right-[6%] float-badge" index={0} />
      <FloatingBadge icon={ScrollText} label="Policy Templates" value="15" className="top-[35%] right-[3%] float-badge-delay-1" index={1} />
      <FloatingBadge icon={FileCheck} label="Evidence Types" value="5" className="bottom-[30%] right-[8%] float-badge-delay-2" index={2} />
      <FloatingBadge icon={AlertTriangle} label="After Delve" value="Trust matters" className="bottom-[15%] right-[4%] float-badge" index={3} />

      <div className="relative z-10 max-w-3xl">
        {/* Badge */}
        <motion.div
          custom={0}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-8"
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Open source</span>
          <span className="w-1 h-1 rounded-full bg-primary/50" />
          <span>Tamper-proof</span>
          <span className="w-1 h-1 rounded-full bg-primary/50" />
          <span>From $99/mo</span>
        </motion.div>

        {/* Headline — word-by-word blur-in */}
        <h1 className="text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
          {['Stop', 'losing', 'enterprise', 'deals'].map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, delay: 0.2 + i * 0.12, ease: [0.25, 0.4, 0.25, 1] }}
              className="inline-block mr-[0.3em]"
            >
              {word}
            </motion.span>
          ))}
          <br />
          <motion.span
            initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, delay: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            className="gradient-text inline-block"
          >
            to compliance gaps
          </motion.span>
        </h1>

        {/* Subtext */}
        <motion.p
          custom={2}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed"
        >
          Drop-in audit logging and SOC 2 prep in one platform.
          Tamper-proof trails, automated evidence collection, and policy templates
          — open source, not $40K/year.
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={3}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap items-center gap-4 mb-14"
        >
          <Link
            href="/signup"
            className="group relative inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-xl font-semibold hover:bg-primary/90 transition-all btn-shimmer overflow-hidden"
            style={{
              boxShadow: '0 0 25px rgba(129, 140, 248, 0.3), 0 0 60px rgba(129, 140, 248, 0.15), 0 0 100px rgba(129, 140, 248, 0.08)',
            }}
          >
            <span className="absolute inset-0 rounded-xl animate-pulse opacity-20 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span className="relative flex items-center gap-2">
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            href="/soc-2"
            className="group inline-flex items-center gap-2 border border-success/30 bg-success/5 text-success px-7 py-3.5 rounded-xl font-semibold hover:bg-success/10 hover:border-success/50 transition-all"
            style={{
              boxShadow: '0 0 20px rgba(52, 211, 153, 0.1), 0 0 40px rgba(52, 211, 153, 0.05)',
            }}
          >
            <Shield className="h-4 w-4" />
            SOC 2 Audit Prep
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 opacity-60" />
          </Link>
          <a
            href="https://github.com/AuditKitDev/auditkit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all text-sm"
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </a>
        </motion.div>
      </div>

      {/* Social proof stats — animated pop-in */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-5 relative z-10 mt-4"
      >
        {[
          { icon: Terminal, label: 'Open Source', sublabel: 'AGPLv3 licensed', index: 0 },
          { icon: Lock, label: 'Tamper-Proof', sublabel: 'SHA-256 + Merkle proofs', index: 1 },
          { icon: Shield, label: 'SOC 2 Prep', sublabel: '51 controls + 15 policies', index: 2 },
          { icon: DollarSign, label: '80% Cheaper', sublabel: 'vs Vanta / Drata', index: 3 },
        ].map((item) => (
          <motion.div
            key={item.label}
            custom={item.index}
            variants={statPop}
            className="flex items-center gap-3 border border-border/50 rounded-xl px-5 py-4 bg-card/50 card-hover"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.sublabel}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
