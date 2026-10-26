// Pure calculation functions. Used by the pages (window.Calc) and by tests/run-tests.js (Node).
(function (root) {
  var TB = 1e12;            // decimal terabyte, as drives and ISPs count
  var TIB = Math.pow(1024, 4);
  var UNIT_BYTES = { GB: 1e9, TB: 1e12, GiB: Math.pow(1024, 3), TiB: TIB };

  // Backup storage: one compressed full copy plus daily incremental changes kept for the retention window.
  function backupStorage(o) {
    if (!(o.dataTB > 0)) throw new Error('Enter the amount of data to protect.');
    if (!(o.changePct >= 0 && o.changePct <= 100)) throw new Error('Daily change must be between 0 and 100%.');
    if (!(o.retention >= 1)) throw new Error('Keep at least 1 restore point.');
    if (!(o.ratio >= 1)) throw new Error('Compression ratio must be 1 or higher (1 means no compression).');
    if (!(o.bufferPct >= 0)) throw new Error('Growth buffer cannot be negative.');
    var full = o.dataTB / o.ratio;
    var incrementals = o.dataTB * (o.changePct / 100) * (o.retention - 1) / o.ratio;
    var subtotal = full + incrementals;
    var total = subtotal * (1 + o.bufferPct / 100);
    return { full: full, incrementals: incrementals, subtotal: subtotal, total: total, totalTiB: total * TB / TIB };
  }

  // Transfer time: bits to move divided by usable line speed.
  function transferTime(o) {
    var bytesPer = UNIT_BYTES[o.unit];
    if (!bytesPer) throw new Error('Unknown size unit.');
    if (!(o.size > 0)) throw new Error('Enter the amount of data to move.');
    if (!(o.mbps > 0)) throw new Error('Enter the connection speed.');
    if (!(o.efficiencyPct > 0 && o.efficiencyPct <= 100)) throw new Error('Efficiency must be between 1 and 100%.');
    var bits = o.size * bytesPer * 8;
    var ideal = bits / (o.mbps * 1e6);
    var estimated = ideal / (o.efficiencyPct / 100);
    return { bytes: o.size * bytesPer, idealSeconds: ideal, estimatedSeconds: estimated, mbPerSec: o.mbps / 8 * (o.efficiencyPct / 100) };
  }

  // Megabits per second to megabytes per second (decimal).
  function mbpsToMBps(mbps) { return mbps / 8; }

  // RAID usable capacity and guaranteed drive failures tolerated.
  function raid(o) {
    var n = o.drives, s = o.driveTB, level = String(o.level);
    if (!(n >= 1) || Math.floor(n) !== n) throw new Error('Enter a whole number of drives.');
    if (!(s > 0)) throw new Error('Enter the size of each drive.');
    var usable, tolerate, minDrives;
    switch (level) {
      case '0': minDrives = 2; usable = n * s; tolerate = 0; break;
      case '1': minDrives = 2; usable = s; tolerate = n - 1; break;
      case '5': minDrives = 3; usable = (n - 1) * s; tolerate = 1; break;
      case '6': minDrives = 4; usable = (n - 2) * s; tolerate = 2; break;
      case '10':
        minDrives = 4;
        if (n % 2 !== 0) throw new Error('RAID 10 needs an even number of drives.');
        usable = n / 2 * s; tolerate = 1; break;
      default: throw new Error('Unknown RAID level.');
    }
    if (n < minDrives) throw new Error('RAID ' + level + ' needs at least ' + minDrives + ' drives.');
    var raw = n * s;
    return { raw: raw, usable: usable, usableTiB: usable * TB / TIB, efficiency: usable / raw, tolerate: tolerate, bestCaseTolerate: level === '10' ? n / 2 : tolerate };
  }

  // UPS runtime. Ideal = stored energy / load. Estimated applies Peukert's law, because
  // lead-acid batteries give less capacity when drained fast.
  function upsRuntime(o) {
    if (!(o.volts > 0 && o.ah > 0 && o.count >= 1)) throw new Error('Enter battery voltage, Ah and how many batteries.');
    if (!(o.loadW > 0)) throw new Error('Enter the load in watts.');
    if (!(o.efficiencyPct > 0 && o.efficiencyPct <= 100)) throw new Error('Inverter efficiency must be between 1 and 100%.');
    if (!(o.peukert >= 1)) throw new Error('Peukert exponent must be 1 or higher.');
    if (!(o.ratedHours > 0)) throw new Error('Rated hours must be above 0.');
    var bankVolts = o.volts * o.count;          // batteries in series
    var wh = bankVolts * o.ah;
    var eff = o.efficiencyPct / 100;
    var idealHours = wh * eff / o.loadW;
    var amps = o.loadW / (bankVolts * eff);      // current drawn from the battery bank
    var estHours = o.ratedHours * Math.pow(o.ah / (amps * o.ratedHours), o.peukert);
    return { wh: wh, amps: amps, idealMinutes: idealHours * 60, estimatedMinutes: Math.min(estHours, idealHours) * 60 };
  }

  // Microsoft 365 monthly and yearly cost from a list of {users, price} rows.
  function m365Cost(rows) {
    var monthly = 0, users = 0;
    rows.forEach(function (r) {
      if (!(r.users >= 0) || !(r.price >= 0)) throw new Error('Users and prices must be 0 or more.');
      monthly += r.users * r.price;
      users += r.users;
    });
    return { users: users, monthly: monthly, yearly: monthly * 12 };
  }

  // ---- Business calculators. Rates come from data/constants.json (source and date on each page). ----

  // Margin and markup from cost plus one of: price, margin %, markup %.
  function marginMarkup(o) {
    if (!(o.cost > 0)) throw new Error('Enter a cost above 0.');
    var price;
    if (o.mode === 'price') price = o.value;
    else if (o.mode === 'margin') {
      if (!(o.value < 100)) throw new Error('Margin must be below 100%.');
      price = o.cost / (1 - o.value / 100);
    } else if (o.mode === 'markup') price = o.cost * (1 + o.value / 100);
    else throw new Error('Unknown mode.');
    if (!(price > 0)) throw new Error('Enter a selling price above 0.');
    var profit = price - o.cost;
    return { price: price, profit: profit, marginPct: profit / price * 100, markupPct: profit / o.cost * 100 };
  }

  // Sales tax: add tax to a pre-tax amount, or pull the tax out of a tax-included total.
  function salesTax(o) {
    if (!(o.amount >= 0)) throw new Error('Enter an amount.');
    if (!(o.ratePct >= 0 && o.ratePct < 100)) throw new Error('Tax rate must be between 0 and 100%.');
    var r = o.ratePct / 100, pre, tax;
    if (o.mode === 'add') { pre = o.amount; tax = pre * r; }
    else if (o.mode === 'extract') { pre = o.amount / (1 + r); tax = o.amount - pre; }
    else throw new Error('Unknown mode.');
    return { preTax: pre, tax: tax, total: pre + tax };
  }

  // Employer payroll taxes on one employee's annual wages (federal FICA employer share, FUTA, state UI).
  function employerCost(o) {
    if (!(o.salary > 0)) throw new Error('Enter an annual salary.');
    if (!(o.ssWageBase > 0)) throw new Error('Missing Social Security wage base.');
    if (!(o.sutaPct >= 0) || !(o.sutaWageBase >= 0)) throw new Error('State unemployment rate and wage base must be 0 or more.');
    if (!(o.futaPct >= 0)) throw new Error('FUTA rate must be 0 or more.');
    var ss = Math.min(o.salary, o.ssWageBase) * o.ssPct / 100;
    var medicare = o.salary * o.medicarePct / 100;
    var futa = Math.min(o.salary, o.futaWageBase) * o.futaPct / 100;
    var suta = Math.min(o.salary, o.sutaWageBase) * o.sutaPct / 100;
    var other = o.otherAnnual > 0 ? o.otherAnnual : 0;
    var taxes = ss + medicare + futa + suta;
    var total = o.salary + taxes + other;
    return { ss: ss, medicare: medicare, futa: futa, suta: suta, taxes: taxes, other: other, total: total, overPct: (total - o.salary) / o.salary * 100 };
  }

  // Import landed cost. Duty, MPF and HMF are charged on the customs value of the goods.
  function landedCost(o) {
    if (!(o.goods > 0)) throw new Error('Enter the value of the goods.');
    ['freight', 'insurance', 'dutyPct', 'extraDutyPct', 'brokerFee', 'otherFees'].forEach(function (k) {
      if (!(o[k] >= 0)) throw new Error('Costs and rates must be 0 or more.');
    });
    var duty = o.goods * o.dutyPct / 100;
    var extraDuty = o.goods * o.extraDutyPct / 100;
    var mpf = o.formalEntry ? Math.min(Math.max(o.goods * o.mpfPct / 100, o.mpfMin), o.mpfMax) : 0;
    var hmf = o.ocean ? o.goods * o.hmfPct / 100 : 0;
    var total = o.goods + o.freight + o.insurance + duty + extraDuty + mpf + hmf + o.brokerFee + o.otherFees;
    var perUnit = o.units > 0 ? total / o.units : NaN;
    return { duty: duty, extraDuty: extraDuty, mpf: mpf, hmf: hmf, total: total, overGoodsPct: (total - o.goods) / o.goods * 100, perUnit: perUnit };
  }

  // Ocean LCL chargeable volume (W/M) and air volumetric weight.
  function freightCbm(o) {
    var toCm = o.dimUnit === 'in' ? 2.54 : 1;
    var toKg = o.weightUnit === 'lb' ? 0.45359237 : 1;
    if (!(o.length > 0 && o.width > 0 && o.height > 0)) throw new Error('Enter length, width and height.');
    if (!(o.qty >= 1)) throw new Error('Enter at least 1 package.');
    if (!(o.weight >= 0)) throw new Error('Weight must be 0 or more.');
    if (!(o.kgPerCbm > 0) || !(o.airDivisor > 0)) throw new Error('Conversion factors must be above 0.');
    var L = o.length * toCm, W = o.width * toCm, H = o.height * toCm;
    var cbm = L * W * H / 1e6 * o.qty;
    var kg = o.weight * toKg * o.qty;
    var revenueTons = Math.max(cbm, kg / o.kgPerCbm);
    var airVolKg = L * W * H / o.airDivisor * o.qty;
    var oceanCost = o.ratePerRT > 0 ? revenueTons * o.ratePerRT : NaN;
    return { cbm: cbm, kg: kg, revenueTons: revenueTons, chargedBy: cbm >= kg / o.kgPerCbm ? 'volume' : 'weight', airVolKg: airVolKg, airChargeableKg: Math.max(airVolKg, kg), oceanCost: oceanCost };
  }

  var api = {
    backupStorage: backupStorage, transferTime: transferTime, mbpsToMBps: mbpsToMBps, raid: raid, upsRuntime: upsRuntime, m365Cost: m365Cost,
    marginMarkup: marginMarkup, salesTax: salesTax, employerCost: employerCost, landedCost: landedCost, freightCbm: freightCbm
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(this);
