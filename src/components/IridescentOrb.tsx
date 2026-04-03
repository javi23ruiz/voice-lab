interface Props {
  isDark: boolean
}

export function IridescentOrb({ isDark }: Props) {
  return (
    <>
      <style>{`
        @keyframes orbRotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes orbMorphA {
          0%, 100% { border-radius: 42% 58% 60% 40% / 45% 55% 45% 55%; }
          25%       { border-radius: 55% 45% 38% 62% / 52% 48% 52% 48%; }
          50%       { border-radius: 40% 60% 55% 45% / 58% 42% 58% 42%; }
          75%       { border-radius: 58% 42% 48% 52% / 40% 60% 40% 60%; }
        }
        @keyframes orbMorphB {
          0%, 100% { border-radius: 50% 50% 45% 55% / 55% 45% 50% 50%; }
          33%       { border-radius: 45% 55% 55% 45% / 40% 60% 55% 45%; }
          66%       { border-radius: 55% 45% 50% 50% / 50% 50% 45% 55%; }
        }
        @keyframes orbMorphC {
          0%, 100% { border-radius: 48% 52% 55% 45% / 52% 48% 45% 55%; }
          50%       { border-radius: 55% 45% 42% 58% / 45% 55% 58% 42%; }
        }
        @keyframes orbPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        .orb-shell {
          animation: orbMorphA 12s ease-in-out infinite, orbPulse 8s ease-in-out infinite;
        }
        .orb-layer-1 { animation: orbRotate 20s linear infinite, orbMorphB 10s ease-in-out infinite; }
        .orb-layer-2 { animation: orbRotate 15s linear infinite reverse, orbMorphC 8s ease-in-out infinite; }
        .orb-layer-3 { animation: orbRotate 25s linear infinite, orbMorphA 14s ease-in-out infinite; }
        .orb-layer-4 { animation: orbRotate 18s linear infinite reverse, orbMorphB 11s ease-in-out infinite; }
      `}</style>

      <div
        className="orb-shell relative w-24 h-24 overflow-hidden"
        style={{
          borderRadius: '42% 58% 60% 40% / 45% 55% 45% 55%',
          background: isDark
            ? 'linear-gradient(135deg, #6366f1 0%, #7c3aed 30%, #a78bfa 60%, #3b82f6 100%)'
            : 'linear-gradient(135deg, #818cf8 0%, #a78bfa 30%, #c084fc 60%, #60a5fa 100%)',
          boxShadow: isDark
            ? '0 8px 40px rgba(99,102,241,0.3), inset 0 0 30px rgba(139,92,246,0.3)'
            : '0 8px 40px rgba(139,92,246,0.25), inset 0 0 30px rgba(167,139,250,0.2)',
        }}
      >
        {/* Internal color layers */}
        <div
          className="orb-layer-1 absolute inset-0"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse at 30% 40%, rgba(96,165,250,0.8) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at 30% 40%, rgba(147,197,253,0.7) 0%, transparent 60%)',
            mixBlendMode: 'screen',
          }}
        />
        <div
          className="orb-layer-2 absolute inset-0"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse at 70% 60%, rgba(244,114,182,0.7) 0%, transparent 55%)'
              : 'radial-gradient(ellipse at 70% 60%, rgba(249,168,212,0.6) 0%, transparent 55%)',
            mixBlendMode: 'screen',
          }}
        />
        <div
          className="orb-layer-3 absolute inset-0"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse at 50% 30%, rgba(45,212,191,0.5) 0%, transparent 50%)'
              : 'radial-gradient(ellipse at 50% 30%, rgba(94,234,212,0.4) 0%, transparent 50%)',
            mixBlendMode: 'screen',
          }}
        />
        <div
          className="orb-layer-4 absolute inset-0"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse at 40% 70%, rgba(167,139,250,0.6) 0%, transparent 50%)'
              : 'radial-gradient(ellipse at 40% 70%, rgba(196,181,253,0.5) 0%, transparent 50%)',
            mixBlendMode: 'overlay',
          }}
        />

        {/* Specular / gloss highlight */}
        <div
          className="absolute"
          style={{
            width: '60%',
            height: '40%',
            top: '8%',
            left: '15%',
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(4px)',
            pointerEvents: 'none',
          }}
        />

        {/* Edge rim light */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(0,0,0,0.08) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </>
  )
}
