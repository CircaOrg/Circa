/**
 * useSimulatedData — temporary demo hook.
 *
 * Injects 10 base stations + a large node fleet into the Zustand field store and
 * continuously fires simulated sensor readings every 1.5 s (simulating live
 * transmissions). Also intercepts fetch() so the Control-page Scheduler and
 * Configure-page device lists look fully populated without a real server.
 *
 * To restore real data: remove the import + useSimulatedData() call from App.tsx.
 */
import { useEffect } from 'react';
import { useFieldStore } from '../lib/socket';
import type { BaseStation, Node } from '../lib/socket';

// ─── Static device definitions ────────────────────────────────────────────────

const SIMULATED_STATIONS: BaseStation[] = [
  { id: 'demo-station-01', name: 'Base Station North-1', field_x: 0.12, field_y: 0.18, crop_type: 'Wheat',  online: true, humidity: 61, temperature: 22.8, soil_moisture: 46, turret_range_m: 18 },
  { id: 'demo-station-02', name: 'Base Station North-2', field_x: 0.30, field_y: 0.16, crop_type: 'Corn',   online: true, humidity: 59, temperature: 23.2, soil_moisture: 43, turret_range_m: 17 },
  { id: 'demo-station-03', name: 'Base Station North-3', field_x: 0.48, field_y: 0.14, crop_type: 'Cotton', online: true, humidity: 57, temperature: 24.1, soil_moisture: 39, turret_range_m: 18 },
  { id: 'demo-station-04', name: 'Base Station North-4', field_x: 0.66, field_y: 0.17, crop_type: 'Rice',   online: true, humidity: 64, temperature: 23.5, soil_moisture: 51, turret_range_m: 19 },
  { id: 'demo-station-05', name: 'Base Station North-5', field_x: 0.84, field_y: 0.19, crop_type: 'Wheat',  online: true, humidity: 62, temperature: 22.9, soil_moisture: 48, turret_range_m: 18 },
  { id: 'demo-station-06', name: 'Base Station Mid-1',   field_x: 0.18, field_y: 0.45, crop_type: 'Corn',   online: true, humidity: 56, temperature: 24.3, soil_moisture: 37, turret_range_m: 17 },
  { id: 'demo-station-07', name: 'Base Station Mid-2',   field_x: 0.38, field_y: 0.46, crop_type: 'Cotton', online: true, humidity: 58, temperature: 24.0, soil_moisture: 41, turret_range_m: 18 },
  { id: 'demo-station-08', name: 'Base Station Mid-3',   field_x: 0.58, field_y: 0.48, crop_type: 'Rice',   online: true, humidity: 63, temperature: 23.6, soil_moisture: 52, turret_range_m: 19 },
  { id: 'demo-station-09', name: 'Base Station Mid-4',   field_x: 0.76, field_y: 0.44, crop_type: 'Wheat',  online: true, humidity: 60, temperature: 23.1, soil_moisture: 45, turret_range_m: 18 },
  { id: 'demo-station-10', name: 'Base Station South-1', field_x: 0.50, field_y: 0.76, crop_type: 'Corn',   online: true, humidity: 55, temperature: 24.7, soil_moisture: 36, turret_range_m: 17 },
];

const NODE_OFFSETS: Array<[number, number]> = [
  [-0.055, -0.03],
  [0.062, -0.018],
  [-0.02, 0.065],
];

const SIMULATED_NODES: Node[] = SIMULATED_STATIONS.flatMap((station, stationIndex) =>
  NODE_OFFSETS.map(([dx, dy], nodeIndex) => {
    const absoluteIndex = stationIndex * NODE_OFFSETS.length + nodeIndex + 1;
    const moistureBase = 34 + ((stationIndex * 9 + nodeIndex * 7) % 36);

    return {
      id: `demo-node-${String(absoluteIndex).padStart(2, '0')}`,
      station_id: station.id,
      name: `Node ${String.fromCharCode(65 + nodeIndex)} · ${station.name.replace('Base Station ', '')}`,
      field_x: Math.min(0.96, Math.max(0.04, station.field_x + dx)),
      field_y: Math.min(0.96, Math.max(0.04, station.field_y + dy)),
      crop_type: station.crop_type,
      online: true,
      soil_moisture: moistureBase,
      irrigation_radius_m: 7 + ((stationIndex + nodeIndex) % 3),
    };
  }),
);

const PRIMARY_STATION_ID = SIMULATED_STATIONS[0]?.id ?? 'demo-station-01';
const SECONDARY_STATION_ID = SIMULATED_STATIONS[1]?.id ?? PRIMARY_STATION_ID;
const TERTIARY_STATION_ID = SIMULATED_STATIONS[7]?.id ?? PRIMARY_STATION_ID;

// ─── Simulated schedules for the Control → Scheduler tab ───────────────────────

const SIMULATED_SCHEDULES = [
  {
    id:         'demo-sched-01',
    name:       'Morning Moisture Check',
    station_id: PRIMARY_STATION_ID,
    trigger:    { type: 'condition', metric: 'soil_moisture', operator: '<', threshold: 30 },
    conditions: [],
    actions:    [{ type: 'fire_turret', angle: 90, duration: 8 }],
    enabled:    true,
    created_at: new Date(Date.now() - 86_400_000 * 2).toISOString(),
  },
  {
    id:         'demo-sched-02',
    name:       'Sunrise Irrigation',
    station_id: SECONDARY_STATION_ID,
    trigger:    { type: 'time', cron: '0 6 * * *' },
    conditions: [],
    actions:    [{ type: 'fire_turret', angle: 45, duration: 15 }],
    enabled:    true,
    created_at: new Date(Date.now() - 86_400_000 * 5).toISOString(),
  },
  {
    id:         'demo-sched-03',
    name:       'Evening Top-Up',
    station_id: TERTIARY_STATION_ID,
    trigger:    { type: 'time', cron: '0 19 * * *' },
    conditions: [],
    actions:    [{ type: 'fire_turret', angle: 135, duration: 10 }],
    enabled:    false,
    created_at: new Date(Date.now() - 86_400_000 * 1).toISOString(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fluctuate(base: number, noise: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, base + (Math.random() - 0.5) * 2 * noise));
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Fetch interceptor ────────────────────────────────────────────────────────

// A mutable list of simulated schedules so create/delete work within the session.
let simulatedSchedules = [...SIMULATED_SCHEDULES];

const originalFetch = window.fetch.bind(window);

function simulatedScheduleId(): string {
  return 'demo-sched-' + Math.random().toString(36).slice(2, 8);
}

function interceptedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url   = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();

  // ── GET /api/schedules ──────────────────────────────────────────────────────
  if (url.includes('/api/schedules') && method === 'GET' && !url.match(/\/api\/schedules\/[^/]+$/)) {
    return Promise.resolve(jsonResponse(simulatedSchedules));
  }

  // ── POST /api/schedules ─────────────────────────────────────────────────────
  if (url.includes('/api/schedules') && method === 'POST' && !url.match(/\/api\/schedules\/[^/]+$/)) {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    const newSchedule = { ...body, id: simulatedScheduleId(), created_at: new Date().toISOString() };
    simulatedSchedules = [newSchedule, ...simulatedSchedules];
    return Promise.resolve(jsonResponse(newSchedule, 201));
  }

  // ── PATCH /api/schedules/:id ────────────────────────────────────────────────
  if (url.match(/\/api\/schedules\/[^/]+$/) && method === 'PATCH') {
    const id   = url.split('/').pop()!;
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    simulatedSchedules = simulatedSchedules.map((s) => s.id === id ? { ...s, ...body } : s);
    return Promise.resolve(jsonResponse({ ok: true }));
  }

  // ── DELETE /api/schedules/:id ───────────────────────────────────────────────
  if (url.match(/\/api\/schedules\/[^/]+$/) && method === 'DELETE') {
    const id = url.split('/').pop()!;
    simulatedSchedules = simulatedSchedules.filter((s) => s.id !== id);
    return Promise.resolve(jsonResponse({ ok: true }));
  }

  // ── GET/POST /api/stations ──────────────────────────────────────────────────
  if (url.match(/\/api\/stations$/) && method === 'GET') {
    return Promise.resolve(jsonResponse(SIMULATED_STATIONS));
  }
  if (url.match(/\/api\/stations$/) && method === 'POST') {
    return Promise.resolve(jsonResponse({ ok: true }, 201));
  }

  // ── DELETE /api/stations/:id ────────────────────────────────────────────────
  if (url.match(/\/api\/stations\/[^/]+$/) && !url.includes('/nodes') && method === 'DELETE') {
    return Promise.resolve(jsonResponse({ ok: true }));
  }

  // ── GET/POST /api/stations/nodes ────────────────────────────────────────────
  if (url.includes('/api/stations/nodes') && method === 'GET') {
    return Promise.resolve(jsonResponse(SIMULATED_NODES));
  }
  if (url.includes('/api/stations/nodes') && method === 'POST') {
    return Promise.resolve(jsonResponse({ ok: true }, 201));
  }

  // ── DELETE /api/stations/nodes/:id ─────────────────────────────────────────
  if (url.match(/\/api\/stations\/nodes\/[^/]+$/) && method === 'DELETE') {
    return Promise.resolve(jsonResponse({ ok: true }));
  }

  // All other requests pass through unmodified
  return originalFetch(input, init);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSimulatedData() {
  useEffect(() => {
    const store = useFieldStore.getState();

    // Clear old demo entities from persisted state before reseeding.
    store.stations
      .filter((station) => station.id.startsWith('demo-station-'))
      .forEach((station) => store.removeStation(station.id));
    store.nodes
      .filter((node) => node.id.startsWith('demo-node-'))
      .forEach((node) => store.removeNode(node.id));

    // Seed field store devices.
    SIMULATED_STATIONS.forEach((station) => store.upsertStation(station));
    SIMULATED_NODES.forEach((n) => store.upsertNode(n));
    store.setConnected(true);

    // Install fetch interceptor (so Control/Configure pages see simulated server data)
    simulatedSchedules = [...SIMULATED_SCHEDULES]; // reset to defaults each mount
    window.fetch = interceptedFetch as typeof fetch;

    // Continuously emit simulated sensor readings — mimics live transmissions
    const interval = setInterval(() => {
      const now = new Date().toISOString();

      SIMULATED_STATIONS.forEach((station) => {
        const humidityBase = typeof station.humidity === 'number' ? station.humidity : 60;
        const temperatureBase = typeof station.temperature === 'number' ? station.temperature : 23;
        const moistureBase = typeof station.soil_moisture === 'number' ? station.soil_moisture : 45;

        store.applyReading({ entityType: 'station', entityId: station.id, metric: 'humidity',      value: fluctuate(humidityBase, 3.0, 35, 95),  timestamp: now });
        store.applyReading({ entityType: 'station', entityId: station.id, metric: 'temperature',   value: fluctuate(temperatureBase, 1.1, 10, 45), timestamp: now });
        store.applyReading({ entityType: 'station', entityId: station.id, metric: 'soil_moisture', value: fluctuate(moistureBase, 2.8, 8, 100),   timestamp: now });
      });

      SIMULATED_NODES.forEach((node) => {
        const moistureBase = typeof node.soil_moisture === 'number' ? node.soil_moisture : 42;
        store.applyReading({ entityType: 'node', entityId: node.id, metric: 'soil_moisture', value: fluctuate(moistureBase, 4.2, 8, 100), timestamp: now });
      });
    }, 1500);

    return () => {
      clearInterval(interval);
      window.fetch = originalFetch as typeof fetch; // restore real fetch
      SIMULATED_STATIONS.forEach((station) => store.removeStation(station.id));
      SIMULATED_NODES.forEach((n) => store.removeNode(n.id));
      store.setConnected(false);
    };
  }, []);
}

