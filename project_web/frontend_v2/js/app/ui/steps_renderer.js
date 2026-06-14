(function () {
  window.App = window.App || {};

  function matrixToText(M) {
    if (!Array.isArray(M) || !M.length) return "(rỗng)";
    const rows = M.map((row) => row.map((x) => App.formatScalar(x)));
    const widths = [];
    rows.forEach((r) =>
      r.forEach((s, i) => (widths[i] = Math.max(widths[i] || 0, s.length))),
    );
    return rows
      .map(
        (r) =>
          "| " + r.map((s, i) => s.padStart(widths[i], " ")).join("  ") + " |",
      )
      .join("\n");
  }

  App.renderStepsToText = function (steps) {
    if (!Array.isArray(steps) || !steps.length) return "";
    return steps
      .map((st) => {
        if (st.kind === "matrix" && Array.isArray(st.matrix)) {
          return `${st.text}\n${matrixToText(st.matrix)}`;
        }
        return st.text || "";
      })
      .filter(Boolean)
      .join("\n\n");
  };
})();
