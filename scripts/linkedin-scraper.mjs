const endpoint = process.env.LINKEDIN_PROCESS_URL || "http://localhost:3000/api/linkedin/process";
const token = process.env.LINKEDIN_SCRAPER_TOKEN || "";
const runId = process.env.LINKEDIN_RUN_ID || "";

async function main() {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(runId ? { runId } : {}),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.ok) {
    throw new Error(json.error || `LinkedIn process request failed (${response.status}).`);
  }

  console.log(JSON.stringify(json, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
