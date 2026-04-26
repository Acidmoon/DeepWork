const { app, BrowserWindow, session } = require("electron");
const fs = require("fs");
const path = require("path");

const resultPath = path.join(__dirname, "web-validation-result.json");
const partition = "persist:ai-workbench-validation";
const targetUrl = "https://chat.deepseek.com/";
const timeoutMs = 30000;

function writeResult(result) {
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf8");
}

async function main() {
  const result = {
    startedAt: new Date().toISOString(),
    targetUrl,
    partition,
    loadOk: false,
    didFinishLoad: false,
    title: "",
    finalUrl: "",
    cookieSetOk: false,
    cookieReadOk: false,
    storagePathExists: false,
    notes: [],
    errors: []
  };

  const partitionSession = session.fromPartition(partition);
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      partition,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  const fail = (scope, error) => {
    result.errors.push({
      scope,
      message: error && error.message ? error.message : String(error)
    });
  };

  window.webContents.on("did-finish-load", () => {
    result.didFinishLoad = true;
    result.finalUrl = window.webContents.getURL();
  });

  window.webContents.on("page-title-updated", (event, title) => {
    event.preventDefault();
    result.title = title;
  });

  window.webContents.on("did-fail-load", (_event, code, description, url) => {
    fail("did-fail-load", `${code} ${description} ${url}`);
  });

  const timer = setTimeout(() => {
    fail("timeout", `Timed out after ${timeoutMs}ms`);
    window.destroy();
  }, timeoutMs);

  try {
    await window.loadURL(targetUrl);
    result.loadOk = true;
    result.finalUrl = window.webContents.getURL();
  } catch (error) {
    fail("loadURL", error);
  }

  try {
    const cookie = {
      url: "https://example.com/",
      name: "ai_workbench_validation",
      value: String(Date.now()),
      sameSite: "lax"
    };
    await partitionSession.cookies.set(cookie);
    result.cookieSetOk = true;
    await partitionSession.flushStorageData();
    const cookies = await partitionSession.cookies.get({
      url: "https://example.com/"
    });
    result.cookieReadOk = cookies.some(
      (item) =>
        item.name === "ai_workbench_validation" && item.value === cookie.value
    );
  } catch (error) {
    fail("cookies", error);
  }

  try {
    const storagePath = partitionSession.getStoragePath();
    result.storagePath = storagePath;
    result.storagePathExists = Boolean(storagePath && fs.existsSync(storagePath));
  } catch (error) {
    fail("storagePath", error);
  }

  if (result.loadOk && result.cookieReadOk) {
    result.notes.push(
      "Remote page load and persistent partition storage primitives both succeeded."
    );
    result.notes.push(
      "Actual login-state persistence for a real DeepSeek account still requires a manual sign-in round-trip check."
    );
  }

  clearTimeout(timer);
  result.finishedAt = new Date().toISOString();
  writeResult(result);

  if (!window.isDestroyed()) {
    window.destroy();
  }
  app.quit();
}

app.whenReady().then(main).catch((error) => {
  writeResult({
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    targetUrl,
    partition,
    loadOk: false,
    cookieReadOk: false,
    errors: [{ scope: "app.whenReady", message: String(error) }]
  });
  app.quit();
});
