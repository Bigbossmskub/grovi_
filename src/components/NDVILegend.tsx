import React from 'react';

interface LegendItem {
  color: string;
  label: string;
  percent: number;
}

interface NDVILegendProps {
  items: LegendItem[];
}

const NDVILegend: React.FC<NDVILegendProps> = ({ items }) => {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        padding: '10px 18px 10px 16px',
        minWidth: 150,
        fontSize: 13,
        color: '#222',
        lineHeight: 1.3,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>NDVI Index</div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: i === items.length - 1 ? 0 : 2 }}>
          <span
            style={{
              display: 'inline-block',
              width: 18,
              height: 18,
              borderRadius: 4,
              background: item.color,
              marginRight: 8,
              border: '1px solid #ccc',
            }}
          />
          <span style={{ flex: 1 }}>{item.label}</span>
          <span style={{ marginLeft: 6, color: '#666', fontSize: 12 }}>{item.percent}%</span>
        </div>
      ))}
    </div>
  );
};

export default NDVILegend;
