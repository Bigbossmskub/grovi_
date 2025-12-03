import React from 'react';

interface LegendBreak {
  from: number;
  to: number;
  color: string;
  label: string;
  percent?: number;
}

interface VIBoxLegendProps {
  title: string;
  breaks: LegendBreak[];
}

const VIBoxLegend: React.FC<VIBoxLegendProps> = ({ title, breaks }) => {
  if (!breaks || breaks.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        right: 20,
        bottom: 20,
        zIndex: 1200,
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 12,
        boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
        padding: '12px 14px',
        minWidth: 160,
        fontSize: 12,
        color: '#1f2937',
        lineHeight: 1.3,
        border: '1px solid #e5e7eb'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{title}</div>
      </div>
      <div>
        {breaks.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: i === breaks.length - 1 ? 0 : 4 }}>
            <span
              style={{
                display: 'inline-block',
                width: 16,
                height: 16,
                borderRadius: 3,
                background: b.color,
                marginRight: 8,
                border: '1px solid #d1d5db'
              }}
            />
            <span style={{ flex: 1 }}>{b.label}</span>
            {typeof b.percent === 'number' && (
              <span style={{ marginLeft: 8, color: '#6b7280' }}>{b.percent}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VIBoxLegend;


