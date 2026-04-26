const fs = require("fs");
const path = require("path");

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, ".playwright-browsers");

const { chromium } = require("playwright");

const inputPath = path.join(__dirname, "sample-render-input.html");
const outputPath = path.join(__dirname, "sample-render-output.pdf");
const resultPath = path.join(__dirname, "render-validation-result.json");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>AI Workbench Render Validation</title>
    <style>
      body {
        font-family: "Segoe UI", sans-serif;
        margin: 0;
        padding: 24mm 18mm;
        color: #1f2937;
        background: linear-gradient(180deg, #f8fafc, #ffffff);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }
      p {
        font-size: 14px;
        line-height: 1.6;
      }
      .card {
        margin-top: 16px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 16px;
        background: white;
      }
    </style>
  </head>
  <body>
    <h1>AI Workbench PDF Validation</h1>
    <p>This file verifies that local HTML can be rendered into a PDF artifact.</p>
    <div class="card">
      <strong>Status:</strong> If this page becomes a PDF, the renderer path works.
    </div>
  </body>
</html>
`;

async function main() {
  fs.writeFileSync(inputPath, html, "utf8");

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file:///${inputPath.replace(/\\/g, "/")}`, {
    waitUntil: "load"
  });
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "12mm",
      right: "12mm",
      bottom: "12mm",
      left: "12mm"
    }
  });
  await browser.close();

  const stat = fs.statSync(outputPath);
  fs.writeFileSync(
    resultPath,
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        inputPath,
        outputPath,
        outputSize: stat.size,
        ok: stat.size > 0
      },
      null,
      2
    ),
    "utf8"
  );
}

main().catch((error) => {
  fs.writeFileSync(
    resultPath,
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        inputPath,
        outputPath,
        ok: false,
        error: String(error)
      },
      null,
      2
    ),
    "utf8"
  );
  process.exitCode = 1;
});
