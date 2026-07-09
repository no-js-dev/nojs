// CPU-profile the js-framework-benchmark "create 1000 rows" click for no-js.
//
// Run from the js-framework-benchmark webdriver-ts directory (it provides
// puppeteer-core) with the benchmark HTTP server up on :8080:
//   cp bench/profile-create.mjs ../../js-framework-benchmark/webdriver-ts/
//   cd ../../js-framework-benchmark/webdriver-ts && node profile-create.mjs [runs]
//
// For readable function names, drop an UNMINIFIED build into
// frameworks/keyed/no-js/no.js first:
//   npx esbuild src/cdn.js --bundle --format=iife --outfile=../js-framework-benchmark/frameworks/keyed/no-js/no.js
//
// Usage: node profile-create.mjs [runs]
import puppeteer from 'puppeteer-core';

const RUNS = Number(process.argv[2] || 5);
const URL = 'http://localhost:8080/frameworks/keyed/no-js/index.html';

const browser = await puppeteer.launch({
  headless: false,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--window-size=1200,900'],
});
const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle0' });

const session = await page.createCDPSession();
await session.send('Profiler.enable');
await session.send('Profiler.setSamplingInterval', { interval: 100 });

const agg = new Map(); // fnKey -> selfTime µs

for (let r = 0; r < RUNS; r++) {
  await page.click('#clear').catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 0);
  await session.send('Profiler.start');
  await page.click('#run');
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1000);
  const { profile } = await session.send('Profiler.stop');

  // self time per node = samples count * interval
  const counts = new Map();
  for (const id of profile.samples) counts.set(id, (counts.get(id) || 0) + 1);
  const interval = (profile.endTime - profile.startTime) / profile.samples.length;
  for (const node of profile.nodes) {
    const c = counts.get(node.id);
    if (!c) continue;
    const cf = node.callFrame;
    const url = cf.url.split('/').pop() || '(native)';
    const key = `${cf.functionName || '(anon)'} @ ${url}:${cf.lineNumber + 1}`;
    agg.set(key, (agg.get(key) || 0) + c * interval);
  }
}

const rows = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
console.log(`Top self-time across ${RUNS} create-1k runs (µs total):`);
for (const [k, v] of rows) console.log(String(Math.round(v)).padStart(8), ' ', k);

await browser.close();
