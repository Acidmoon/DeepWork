const os = require("os");
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const pty = require("node-pty");

const resultPath = path.join(__dirname, "pty-validation-result.json");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runProcess(file, args, options = {}) {
  const timeoutMs = options.timeoutMs || 15000;
  const input = options.input || [];
  const cwd = options.cwd || __dirname;

  return new Promise((resolve) => {
    let output = "";
    let exited = false;

    const child = pty.spawn(file, args, {
      name: "xterm-color",
      cols: 120,
      rows: 30,
      cwd,
      env: process.env
    });

    const timer = setTimeout(() => {
      if (!exited) {
        child.kill();
      }
    }, timeoutMs);

    child.onData((data) => {
      output += data;
    });

    child.onExit(({ exitCode, signal }) => {
      exited = true;
      clearTimeout(timer);
      resolve({
        file,
        args,
        exitCode,
        signal,
        output
      });
    });

    (async () => {
      for (const step of input) {
        await delay(step.afterMs || 400);
        child.write(step.text);
      }
    })().catch(() => {
      if (!exited) {
        child.kill();
      }
    });
  });
}

function parseExecutable(source) {
  if (!source) {
    return null;
  }
  const line = source
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find(Boolean);
  return line || null;
}

function safeWhere(command) {
  try {
    return parseExecutable(execFileSync("where", [command], { encoding: "utf8" }));
  } catch (_error) {
    return null;
  }
}

function runInteractivePowerShell(commands, options = {}) {
  const input = commands.map((text, index) => ({
    afterMs: index === 0 ? 900 : 700,
    text: `${text}\r`
  }));
  input.push({ afterMs: 700, text: "exit\r" });

  return runProcess("powershell.exe", ["-NoLogo", "-NoProfile"], {
    timeoutMs: options.timeoutMs || 20000,
    input
  });
}

async function main() {
  const results = {
    startedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      release: os.release(),
      cwd: __dirname
    },
    checks: []
  };

  const shellCheck = await runInteractivePowerShell([
    'Write-Output "POWERSHELL_PTY_OK"',
    "Get-Location"
  ]);
  results.checks.push({
    name: "powershell-interactive-pty",
    ok: /POWERSHELL_PTY_OK/i.test(shellCheck.output),
    exitCode: shellCheck.exitCode,
    signal: shellCheck.signal,
    excerpt: shellCheck.output.slice(0, 2000)
  });

  const codexWhere = safeWhere("codex");
  results.checks.push({
    name: "codex-command-discovery",
    ok: Boolean(codexWhere),
    source: codexWhere
  });

  const codexVersion = await runInteractivePowerShell(["codex --version"], {
    timeoutMs: 20000
  });
  results.checks.push({
    name: "codex-in-pty-version",
    ok:
      /codex/i.test(codexVersion.output) &&
      /\d+\.\d+|\d+\.\d+\.\d+/i.test(codexVersion.output),
    exitCode: codexVersion.exitCode,
    signal: codexVersion.signal,
    excerpt: codexVersion.output.slice(0, 2000)
  });

  const codexHelp = await runInteractivePowerShell(["codex --help"], {
    timeoutMs: 20000
  });
  results.checks.push({
    name: "codex-in-pty-help",
    ok: /usage|options|commands/i.test(codexHelp.output),
    exitCode: codexHelp.exitCode,
    signal: codexHelp.signal,
    excerpt: codexHelp.output.slice(0, 2000)
  });

  const claudeWhere = safeWhere("claude");
  results.checks.push({
    name: "claude-command-discovery",
    ok: Boolean(claudeWhere),
    source: claudeWhere
  });

  const claudeVersion = await runInteractivePowerShell(["claude --version"], {
    timeoutMs: 20000
  });
  results.checks.push({
    name: "claude-in-pty-version",
    ok:
      /claude/i.test(claudeVersion.output) &&
      /\d+\.\d+|\d+\.\d+\.\d+/i.test(claudeVersion.output),
    exitCode: claudeVersion.exitCode,
    signal: claudeVersion.signal,
    excerpt: claudeVersion.output.slice(0, 2000)
  });

  const claudeHelp = await runInteractivePowerShell(["claude --help"], {
    timeoutMs: 20000
  });
  results.checks.push({
    name: "claude-in-pty-help",
    ok: /usage|options|commands/i.test(claudeHelp.output),
    exitCode: claudeHelp.exitCode,
    signal: claudeHelp.signal,
    excerpt: claudeHelp.output.slice(0, 2000)
  });

  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2), "utf8");
}

main().catch((error) => {
  fs.writeFileSync(
    resultPath,
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        fatalError: String(error)
      },
      null,
      2
    ),
    "utf8"
  );
  process.exitCode = 1;
});
