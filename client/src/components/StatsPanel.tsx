import type { BaseStation, Node } from '../lib/socket';
import './StatsPanel.css';

interface Props {
  stations: BaseStation[];
  nodes: Node[];
  /** `station:id` or `node:id` for dashboard placement mode */
  selectedKey?: string | null;
  onSelectDevice?: (key: string | null) => void;
}

export default function StatsPanel({ stations, nodes, selectedKey, onSelectDevice }: Props) {
  return (
    <div className="stats-panel">
      {/* Base Stations */}
      {stations.length > 0 && (
        <section className="stats-section">
          <p className="section-title stats-section-title">Base Stations</p>
          <div className="stats-card-list">
            {stations.map((s) => (
              <StationCard
                key={s.id}
                station={s}
                selected={Boolean(onSelectDevice && selectedKey === `station:${s.id}`)}
                onSelect={
                  onSelectDevice
                    ? () => onSelectDevice(selectedKey === `station:${s.id}` ? null : `station:${s.id}`)
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Nodes grouped by station */}
      {stations.map((s) => {
        const stationNodes = nodes.filter((n) => n.station_id === s.id);
        if (stationNodes.length === 0) return null;
        return (
          <section key={s.id} className="stats-section">
            <p className="section-title stats-section-title">
              {s.name} — Nodes
            </p>
            <div className="stats-card-list">
              {stationNodes.map((n) => (
                <NodeCard
                  key={n.id}
                  node={n}
                  selected={Boolean(onSelectDevice && selectedKey === `node:${n.id}`)}
                  onSelect={
                    onSelectDevice
                      ? () => onSelectDevice(selectedKey === `node:${n.id}` ? null : `node:${n.id}`)
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Unassigned nodes */}
      {(() => {
        const stationIds = new Set(stations.map((s) => s.id));
        const unassigned = nodes.filter((n) => !stationIds.has(n.station_id));
        if (unassigned.length === 0) return null;
        return (
          <section className="stats-section">
            <p className="section-title stats-section-title">Unassigned Nodes</p>
            <div className="stats-card-list">
              {unassigned.map((n) => (
                <NodeCard
                  key={n.id}
                  node={n}
                  selected={Boolean(onSelectDevice && selectedKey === `node:${n.id}`)}
                  onSelect={
                    onSelectDevice
                      ? () => onSelectDevice(selectedKey === `node:${n.id}` ? null : `node:${n.id}`)
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        );
      })()}

      {stations.length === 0 && nodes.length === 0 && (
        <div className="stats-empty">
          <p>No devices found.</p>
          <p>Configure your first base station to get started.</p>
        </div>
      )}
    </div>
  );
}

function StationCard({
  station,
  selected,
  onSelect,
}: {
  station: BaseStation;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const cls = [
    'stats-card',
    onSelect ? 'stats-card--selectable' : '',
    selected ? 'stats-card--selected' : '',
    !station.online ? 'stats-card--offline' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const inner = (
    <div className="stats-card-inner">
      <div className="stats-card-head">
        <div className="stats-card-title-wrap">
          <span className="stats-card-dot" style={{ background: '#c4972a' }} />
          <div className="stats-card-title-text">
            <span className="stats-card-title">{station.name}</span>
            <span className="stats-card-id mono">{station.id}</span>
          </div>
        </div>
        <span className={`stats-card-status ${station.online ? 'online' : 'offline'}`}>
          {station.online ? 'Connected' : 'Not connected'}
        </span>
      </div>
      {station.online && (
        <div className="stats-card-grid">
          <MetricRow label="Soil Moisture" value={station.soil_moisture !== undefined ? `${station.soil_moisture.toFixed(0)}%` : '--'} />
          <MetricRow label="Temperature" value={station.temperature !== undefined ? `${station.temperature.toFixed(1)}°C` : '--'} />
          <MetricRow label="Humidity" value={station.humidity !== undefined ? `${station.humidity.toFixed(0)}%` : '--'} />
        </div>
      )}
    </div>
  );
  if (onSelect) {
    return (
      <button type="button" className={cls} onClick={onSelect}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

function NodeCard({
  node,
  selected,
  onSelect,
}: {
  node: Node;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const pct = node.soil_moisture;
  const color = pct === undefined || !node.online ? 'var(--gray-400)'
    : pct < 20 ? '#ef4444'
    : pct < 40 ? '#f97316'
    : pct < 60 ? '#eab308'
    : '#4ade80';

  const cls = [
    'stats-card',
    onSelect ? 'stats-card--selectable' : '',
    selected ? 'stats-card--selected' : '',
    !node.online ? 'stats-card--offline' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const inner = (
    <div className="stats-card-inner">
      <div className="stats-card-head">
        <div className="stats-card-title-wrap">
          <span className="stats-card-dot" style={{ background: color }} />
          <div className="stats-card-title-text">
            <span className="stats-card-title">{node.name}</span>
            <span className="stats-card-id mono">{node.id}</span>
          </div>
        </div>
        <span className={`stats-card-status ${node.online ? 'online' : 'offline'}`}>
          {node.online ? 'Connected' : 'Not connected'}
        </span>
      </div>
      {node.online && (
        <div className="stats-card-grid">
          <MetricRow label="Soil Moisture" value={pct !== undefined ? `${pct.toFixed(0)}%` : '--'} />
        </div>
      )}
    </div>
  );
  if (onSelect) {
    return (
      <button type="button" className={cls} onClick={onSelect}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="stats-card-row">
      <span className="stats-card-label mono">{label}</span>
      <span className="stats-card-value">{value}</span>
    </div>
  );
}
