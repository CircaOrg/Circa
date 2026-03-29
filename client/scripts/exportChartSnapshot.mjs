#!/usr/bin/env node

const baseUrl = (process.env.PREDICTOR_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const clusters = ['cluster_1', 'cluster_2', 'cluster_3'];

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Request failed (${response.status}) for ${url}${detail ? `: ${detail}` : ''}`);
  }
  return response.json();
}

async function main() {
  const chartByCluster = {};

  for (const clusterId of clusters) {
    const url = `${baseUrl}/api/v1/predictions/chart/${clusterId}`;
    const payload = await fetchJson(url);
    chartByCluster[clusterId] = payload;
  }

  const output = JSON.stringify(chartByCluster, null, 2);

  process.stdout.write('\nPaste this into PREDICTOR_REAL_SNAPSHOT.chart_by_cluster:\n\n');
  process.stdout.write(output);
  process.stdout.write('\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
