/** Compact, non-identifying Lighthouse evidence from three separate lab runs per profile. */
const FIELDS = Object.freeze({
  performance_score: (report) => report.categories?.performance?.score,
  lcp_ms: (report) => report.audits?.["largest-contentful-paint"]?.numericValue,
  cls: (report) => report.audits?.["cumulative-layout-shift"]?.numericValue,
  fcp_ms: (report) => report.audits?.["first-contentful-paint"]?.numericValue,
  tbt_ms: (report) => report.audits?.["total-blocking-time"]?.numericValue,
});

export function summarizeLighthouseRuns(reports, profile) {
  if (!["mobile", "desktop"].includes(profile)) throw new Error("Unknown Lighthouse profile");
  if (!Array.isArray(reports) || reports.length !== 3) {
    throw new Error("Lighthouse " + profile + " requires exactly 3 real reports");
  }
  const versions = new Set(reports.map((report) => report?.lighthouseVersion));
  if (versions.size !== 1 || typeof reports[0]?.lighthouseVersion !== "string" || !reports[0].lighthouseVersion) {
    throw new Error("Lighthouse " + profile + " versions missing or inconsistent");
  }
  for (const report of reports) {
    if (report?.configSettings?.formFactor !== profile) {
      throw new Error("Lighthouse " + profile + " contains a mismatched form factor");
    }
    if (report?.runtimeError) throw new Error("Lighthouse " + profile + " report has a runtime error");
  }
  const metrics = {};
  for (const [field, extract] of Object.entries(FIELDS)) {
    const values = reports.map(extract);
    if (values.some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
      throw new Error("Lighthouse " + profile + " has missing or invalid " + field);
    }
    if (field === "performance_score" && values.some((value) => value > 1)) {
      throw new Error("Lighthouse " + profile + " score must be a 0-1 fraction");
    }
    values.sort((a, b) => a - b);
    metrics[field] = {
      median: values[1],
      minimum: values[0],
      maximum: values[2],
      spread: Number((values[2] - values[0]).toFixed(6)),
    };
  }
  return {
    status: "PASS", profile, sample_count: 3,
    lighthouse_version: reports[0].lighthouseVersion,
    metrics,
    lab_not_field_data: true,
    production_cwv_certified: false,
  };
}
