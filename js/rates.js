// Official rates used by the pages. Keep in sync with data/constants.json (tests/run-tests.js checks this).
(function (root) {
  var RATES = {
    checked: 'October 23, 2026',
    ss_rate_employer: 6.2,
    medicare_rate_employer: 1.45,
    ss_wage_base_2026: 184500,
    ss_wage_base_2027: 192300,
    futa_rate_after_credit: 0.6,
    futa_rate_gross: 6.0,
    futa_wage_base: 7000,
    nj_sales_tax: 6.625,
    nyc_sales_tax: 8.875,
    mpf_rate: 0.3464,
    mpf_min: 34.58,
    mpf_max: 670.86,
    hmf_rate: 0.125
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = RATES;
  else root.RATES = RATES;
})(this);
