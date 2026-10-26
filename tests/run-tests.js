// Run with: node tests/run-tests.js   (no packages needed)
const C = require('../js/calc.js');
let pass = 0, fail = 0;

function near(actual, expected, tol, label) {
  const ok = Math.abs(actual - expected) <= tol;
  if (ok) pass++; else fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + label + ' -> ' + actual + (ok ? '' : ' (expected ' + expected + ')'));
}
function throws(fn, label) {
  let ok = false;
  try { fn(); } catch (e) { ok = true; }
  if (ok) pass++; else fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + label + ' -> throws');
}

// Backup storage
let b = C.backupStorage({ dataTB: 8, changePct: 3, retention: 30, ratio: 1.5, bufferPct: 20 });
near(b.full, 5.3333, 0.001, 'backup 8TB full copy');
near(b.incrementals, 4.64, 0.001, 'backup 8TB incrementals (8*0.03*29/1.5)');
near(b.total, 11.968, 0.001, 'backup 8TB total with 20% buffer');
b = C.backupStorage({ dataTB: 2, changePct: 5, retention: 14, ratio: 2, bufferPct: 25 });
near(b.total, 2.0625, 0.0001, 'backup 2TB total');
b = C.backupStorage({ dataTB: 1, changePct: 10, retention: 1, ratio: 1, bufferPct: 0 });
near(b.total, 1, 1e-9, 'backup 1 restore point = data size');
throws(() => C.backupStorage({ dataTB: 1, changePct: 5, retention: 7, ratio: 0.5, bufferPct: 0 }), 'backup ratio below 1');

// Transfer time
let t = C.transferTime({ size: 2, unit: 'TB', mbps: 100, efficiencyPct: 100 });
near(t.idealSeconds / 3600, 44.444, 0.001, 'transfer 2TB @100Mbps ideal hours');
t = C.transferTime({ size: 2, unit: 'TB', mbps: 100, efficiencyPct: 80 });
near(t.estimatedSeconds / 3600, 55.556, 0.001, 'transfer 2TB @100Mbps 80% hours');
t = C.transferTime({ size: 500, unit: 'GB', mbps: 1000, efficiencyPct: 70 });
near(t.estimatedSeconds, 5714.29, 0.01, 'transfer 500GB @1Gbps 70% seconds');
t = C.transferTime({ size: 2, unit: 'TiB', mbps: 100, efficiencyPct: 100 });
near(t.idealSeconds / 3600, 48.868, 0.001, 'transfer 2TiB @100Mbps ideal hours');
near(C.mbpsToMBps(100), 12.5, 1e-9, '100 Mbps = 12.5 MB/s');
throws(() => C.transferTime({ size: 1, unit: 'TB', mbps: 0, efficiencyPct: 80 }), 'transfer zero speed');

// RAID
let r = C.raid({ drives: 6, driveTB: 8, level: '6' });
near(r.usable, 32, 1e-9, 'RAID6 6x8TB usable');
near(r.tolerate, 2, 0, 'RAID6 tolerates 2');
near(r.usableTiB, 29.104, 0.001, 'RAID6 6x8TB usable TiB');
r = C.raid({ drives: 4, driveTB: 4, level: '10' });
near(r.usable, 8, 1e-9, 'RAID10 4x4TB usable');
r = C.raid({ drives: 4, driveTB: 2, level: '5' });
near(r.usable, 6, 1e-9, 'RAID5 4x2TB usable');
r = C.raid({ drives: 2, driveTB: 4, level: '1' });
near(r.usable, 4, 1e-9, 'RAID1 2x4TB usable');
r = C.raid({ drives: 3, driveTB: 4, level: '0' });
near(r.usable, 12, 1e-9, 'RAID0 3x4TB usable');
throws(() => C.raid({ drives: 3, driveTB: 4, level: '6' }), 'RAID6 with 3 drives');
throws(() => C.raid({ drives: 5, driveTB: 4, level: '10' }), 'RAID10 odd drives');

// UPS runtime
let u = C.upsRuntime({ volts: 12, ah: 9, count: 2, loadW: 300, efficiencyPct: 90, peukert: 1, ratedHours: 20 });
near(u.idealMinutes, 38.88, 0.01, 'UPS 2x12V9Ah 300W ideal minutes');
near(u.estimatedMinutes, 38.88, 0.01, 'UPS Peukert 1.0 equals ideal');
u = C.upsRuntime({ volts: 12, ah: 9, count: 2, loadW: 300, efficiencyPct: 90, peukert: 1.2, ratedHours: 20 });
near(u.estimatedMinutes, 19.58, 0.05, 'UPS 2x12V9Ah 300W Peukert 1.2 minutes');
near(u.wh, 216, 1e-9, 'UPS bank Wh');
u = C.upsRuntime({ volts: 12, ah: 9, count: 2, loadW: 150, efficiencyPct: 90, peukert: 1.2, ratedHours: 20 });
near(u.estimatedMinutes, 45.0, 0.1, 'UPS 2x12V9Ah 150W Peukert 1.2 minutes (page example 2)');
throws(() => C.upsRuntime({ volts: 12, ah: 9, count: 2, loadW: 0, efficiencyPct: 90, peukert: 1.2, ratedHours: 20 }), 'UPS zero load');

// Microsoft 365
let m = C.m365Cost([{ users: 10, price: 7 }, { users: 5, price: 32 }]);
near(m.monthly, 230, 1e-9, 'M365 10 Basic + 5 Premium w/ Copilot monthly');
near(m.yearly, 2760, 1e-9, 'M365 yearly');
m = C.m365Cost([{ users: 12, price: 23.5 }]);
near(m.monthly, 282, 1e-9, 'M365 12 Standard w/ Copilot monthly');
m = C.m365Cost([{ users: 0, price: 7 }]);
near(m.monthly, 0, 0, 'M365 zero users');
throws(() => C.m365Cost([{ users: -1, price: 7 }]), 'M365 negative users');

// Margin / markup
let mm = C.marginMarkup({ cost: 1000, mode: 'margin', value: 30 });
near(mm.price, 1428.571, 0.001, 'margin 30% on $1,000 cost -> price');
near(mm.profit, 428.571, 0.001, 'margin 30% profit');
near(mm.markupPct, 42.857, 0.001, 'margin 30% = markup 42.86%');
mm = C.marginMarkup({ cost: 1000, mode: 'markup', value: 30 });
near(mm.price, 1300, 1e-9, 'markup 30% -> $1,300');
near(mm.marginPct, 23.077, 0.001, 'markup 30% = margin 23.08%');
mm = C.marginMarkup({ cost: 80, mode: 'price', value: 100 });
near(mm.marginPct, 20, 1e-9, 'cost 80 price 100 margin 20%');
near(mm.markupPct, 25, 1e-9, 'cost 80 price 100 markup 25%');
throws(() => C.marginMarkup({ cost: 100, mode: 'margin', value: 100 }), 'margin 100% impossible');

// Sales tax
let st = C.salesTax({ amount: 100, ratePct: 6.625, mode: 'add' });
near(st.tax, 6.625, 1e-9, 'NJ 6.625% on $100');
st = C.salesTax({ amount: 1000, ratePct: 8.875, mode: 'add' });
near(st.total, 1088.75, 1e-9, 'NYC 8.875% on $1,000 total');
st = C.salesTax({ amount: 1088.75, ratePct: 8.875, mode: 'extract' });
near(st.preTax, 1000, 1e-9, 'NYC extract pre-tax from $1,088.75');
st = C.salesTax({ amount: 53.31, ratePct: 6.625, mode: 'extract' });
near(st.tax, 3.312, 0.001, 'NJ extract tax from $53.31');
st = C.salesTax({ amount: 0, ratePct: 8.875, mode: 'add' });
near(st.total, 0, 0, 'sales tax on $0');
throws(() => C.salesTax({ amount: 10, ratePct: 100, mode: 'add' }), 'tax rate 100%');

// Employer cost (2026 federal values; SUTA values are hypothetical test inputs)
const fed26 = { ssPct: 6.2, ssWageBase: 184500, medicarePct: 1.45, futaPct: 0.6, futaWageBase: 7000 };
let ec = C.employerCost(Object.assign({ salary: 60000, sutaPct: 3, sutaWageBase: 20000, otherAnnual: 0 }, fed26));
near(ec.ss, 3720, 1e-9, 'employer SS on $60k');
near(ec.medicare, 870, 1e-9, 'employer Medicare on $60k');
near(ec.futa, 42, 1e-9, 'FUTA 0.6% of $7,000');
near(ec.suta, 600, 1e-9, 'SUTA 3% of $20,000 (test input)');
near(ec.total, 65232, 1e-9, 'total cost $60k');
ec = C.employerCost(Object.assign({ salary: 200000, sutaPct: 0, sutaWageBase: 0, otherAnnual: 0 }, fed26));
near(ec.ss, 11439, 1e-9, 'SS capped at 2026 wage base $184,500');
near(ec.medicare, 2900, 1e-9, 'Medicare uncapped on $200k');
ec = C.employerCost(Object.assign({ salary: 5000, sutaPct: 0, sutaWageBase: 0, otherAnnual: 1200 }, fed26));
near(ec.futa, 30, 1e-9, 'FUTA on $5,000 below wage base');
near(ec.total, 5000 + 310 + 72.5 + 30 + 1200, 1e-9, 'small salary with other costs');
throws(() => C.employerCost(Object.assign({ salary: 0, sutaPct: 0, sutaWageBase: 0 }, fed26)), 'employer cost zero salary');

// Landed cost (MPF 0.3464%, min $34.58, max $670.86; HMF 0.125%)
const fees = { mpfPct: 0.3464, mpfMin: 34.58, mpfMax: 670.86, hmfPct: 0.125 };
let lc = C.landedCost(Object.assign({ goods: 50000, freight: 3000, insurance: 150, dutyPct: 2.5, extraDutyPct: 0, brokerFee: 250, otherFees: 0, formalEntry: true, ocean: true, units: 1000 }, fees));
near(lc.duty, 1250, 1e-9, 'duty 2.5% of $50,000');
near(lc.mpf, 173.2, 1e-9, 'MPF 0.3464% of $50,000');
near(lc.hmf, 62.5, 1e-9, 'HMF 0.125% of $50,000');
near(lc.total, 54885.7, 1e-6, 'landed total $50k ocean');
near(lc.perUnit, 54.8857, 1e-6, 'landed per unit');
lc = C.landedCost(Object.assign({ goods: 5000, freight: 0, insurance: 0, dutyPct: 0, extraDutyPct: 0, brokerFee: 0, otherFees: 0, formalEntry: true, ocean: false, units: 0 }, fees));
near(lc.mpf, 34.58, 1e-9, 'MPF minimum applies on $5,000');
near(lc.hmf, 0, 0, 'no HMF for air');
lc = C.landedCost(Object.assign({ goods: 500000, freight: 0, insurance: 0, dutyPct: 0, extraDutyPct: 0, brokerFee: 0, otherFees: 0, formalEntry: true, ocean: false, units: 0 }, fees));
near(lc.mpf, 670.86, 1e-9, 'MPF maximum applies on $500,000');

// Freight CBM
let fc = C.freightCbm({ length: 120, width: 100, height: 150, dimUnit: 'cm', qty: 2, weight: 400, weightUnit: 'kg', kgPerCbm: 1000, airDivisor: 6000, ratePerRT: 0 });
near(fc.cbm, 3.6, 1e-9, 'CBM 2 pallets 120x100x150 cm');
near(fc.revenueTons, 3.6, 1e-9, 'charged by volume 3.6 RT');
near(fc.airVolKg, 600, 1e-9, 'air volumetric 2 x 300 kg');
fc = C.freightCbm({ length: 50, width: 40, height: 30, dimUnit: 'cm', qty: 10, weight: 120, weightUnit: 'kg', kgPerCbm: 1000, airDivisor: 6000, ratePerRT: 80 });
near(fc.cbm, 0.6, 1e-9, 'CBM 10 cartons');
near(fc.revenueTons, 1.2, 1e-9, 'charged by weight 1.2 RT');
near(fc.oceanCost, 96, 1e-9, 'ocean cost 1.2 RT x $80');
fc = C.freightCbm({ length: 10, width: 10, height: 10, dimUnit: 'in', qty: 1, weight: 1, weightUnit: 'lb', kgPerCbm: 1000, airDivisor: 6000, ratePerRT: 0 });
near(fc.cbm, 0.016387064, 1e-12, '1000 cubic inches = 0.016387 CBM');
throws(() => C.freightCbm({ length: 0, width: 1, height: 1, dimUnit: 'cm', qty: 1, weight: 1, weightUnit: 'kg', kgPerCbm: 1000, airDivisor: 6000 }), 'CBM zero length');

// rates.js must match data/constants.json, and every constant needs a source and date
const RATES = require('../js/rates.js');
const constants = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../data/constants.json'), 'utf8'));
constants.forEach(c => {
  const ok = !!c.source_url && /^\d{4}-\d{2}-\d{2}$/.test(c.last_verified);
  if (ok) pass++; else fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + c.id + ' has source and date');
  if (c.id in RATES) near(RATES[c.id], c.value, 0, c.id + ' rates.js matches constants.json');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
