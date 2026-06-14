(function () {
  window.App = window.App || {};

  /* --------- Display helpers --------- */
  App.coordOut = function (text) {
    const el = document.getElementById("coordOut");
    if (el) el.innerText = text;
  };

  App.getCSS = function (v) {
    return getComputedStyle(document.body).getPropertyValue(v).trim() || "#fff";
  };

  /* ===== Number formatting (fraction & surd) ===== */
  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }
  function isNearly(x, y, eps = 1e-10) {
    return Math.abs(x - y) <= eps;
  }
  function isNearlyInt(x, eps = 1e-10) {
    return isNearly(x, Math.round(x), eps);
  }

  function rationalApprox(x, maxDen = 10000, eps = 1e-12) {
    if (!isFinite(x)) return null;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    if (isNearlyInt(x, eps)) return { n: sign * Math.round(x), d: 1 };

    let a0 = Math.floor(x);
    let p0 = 1,
      q0 = 0,
      p1 = a0,
      q1 = 1;
    let frac = x - a0;
    if (isNearly(frac, 0, eps)) return { n: sign * p1, d: q1 };

    for (let i = 0; i < 30; i++) {
      const a = Math.floor(1 / frac);
      const p2 = a * p1 + p0;
      const q2 = a * q1 + q0;
      const approx = p2 / q2;
      if (q2 > maxDen) break;
      if (Math.abs(approx - x) <= eps) return { n: sign * p2, d: q2 };
      p0 = p1;
      q0 = q1;
      p1 = p2;
      q1 = q2;
      frac = 1 / frac - a;
      if (frac <= eps) break;
    }
    if (Math.abs(p1 / q1 - x) <= eps) return { n: sign * p1, d: q1 };
    return null;
  }

  function largestSquareFactor(n) {
    let r = 1;
    for (let k = 2; k * k <= n; k++) {
      while (n % (k * k) === 0) {
        n /= k * k;
        r *= k;
      }
    }
    return { root: r, rest: n };
  }

  function approxRadical(x, eps = 1e-9) {
    if (!isFinite(x)) return null;
    if (isNearlyInt(x, eps)) return null; // prefer integer
    const sign = x < 0 ? "-" : "";
    const ax = Math.abs(x);

    let best = null,
      errBest = 1e9;

    for (let p = 1; p <= 8; p++) {
      for (let n = 2; n <= 400; n++) {
        const s = Math.sqrt(n);
        for (let m = 1; m <= 60; m++) {
          const val = (p * s) / m;
          const err = Math.abs(val - ax);
          if (err < errBest) {
            const { root: r, rest } = largestSquareFactor(n);
            if (rest === 1) continue;
            let num = p * r,
              den = m;
            const g = gcd(num, den);
            num /= g;
            den /= g;
            const coef = num === 1 ? "" : num.toString();
            const frac = den === 1 ? "" : `/${den}`;
            best = `${sign}${coef}√${rest}${frac}`;
            errBest = err;
          }
        }
      }
    }

    for (let n = 2; n <= 400; n++) {
      const val = 1 / Math.sqrt(n);
      const err = Math.abs(val - ax);
      if (err < errBest && err < eps) {
        const { root: r, rest } = largestSquareFactor(n);
        const den = r * rest;
        best = `${sign}√${rest}/${den}`;
        errBest = err;
      }
    }

    if (errBest < eps) return best;
    return null;
  }

  App.formatScalar = function (x, dec = 6) {
    if (typeof x === "string") return x;

    if (!isFinite(x)) return String(x);
    const ax = Math.abs(x);

    if (ax >= 1e6 || (ax > 0 && ax < 1e-6))
      return x.toExponential(2).replace("+", "");
    if (ax < 1e-12) return "0";
    if (isNearlyInt(x)) return String(Math.round(x));

    const rat = rationalApprox(x, 10000, 1e-12);
    if (rat) {
      const { n, d } = rat;
      return d === 1 ? String(n) : `${n}/${d}`;
    }

    const rad = approxRadical(x, 1e-9);
    if (rad) return rad;

    let s = x.toFixed(dec).replace(/\.?0+$/, "");
    return s === "-0" ? "0" : s;
  };

  App.formatVectorShort = (vec) => `[${vec.map(App.formatScalar).join(", ")}]`;
  App.formatTip = (vec) => `(${vec.map(App.formatScalar).join(", ")})`;

  App.niceStep = function (unitsRange) {
    const rough = Math.max(unitsRange, 1e-12) / 10;
    const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
    const d = rough / pow10;
    if (d < 1.5) return 1 * pow10;
    if (d < 3) return 2 * pow10;
    if (d < 7) return 5 * pow10;
    return 10 * pow10;
  };
})();
