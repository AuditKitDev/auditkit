import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AuditKit — Open-source audit logs + SOC 2 prep';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
            }}
          >
            A
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '28px', fontWeight: 'bold' }}>AuditKit</span>
            <span style={{ fontSize: '14px', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Open-source audit logs
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ fontSize: '64px', fontWeight: 'bold', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Tamper-evident audit logs + SOC 2 evidence.
          </div>
          <div style={{ fontSize: '28px', color: '#a3a3a3', lineHeight: 1.4 }}>
            Open-source (AGPLv3). Self-host free. Cloud from $99/mo. Replaces Drata, Vanta.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '32px', fontSize: '18px', color: '#888' }}>
            <span>auditkit.dev</span>
            <span>·</span>
            <span>github.com/AuditKitDev/auditkit</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '6px 14px', fontSize: '16px', color: '#10b981' }}>
              SOC 2
            </div>
            <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '6px 14px', fontSize: '16px', color: '#10b981' }}>
              HIPAA
            </div>
            <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '6px 14px', fontSize: '16px', color: '#10b981' }}>
              ISO 27001
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
