const { app } = require('electron');

async function main() {
  try {
    const pty = require('node-pty');
    const shell = pty.spawn('powershell.exe', ['-NoLogo', '-NoProfile'], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env,
      useConpty: true
    });

    let output = '';
    shell.onData((data) => {
      output += data;
      if (/ELECTRON_PTY_OK/i.test(output)) {
        console.log('ELECTRON_PTY_OK');
        try {
          shell.write('exit\r');
        } catch {}
      }
    });

    shell.onExit(({ exitCode, signal }) => {
      console.log(`ELECTRON_PTY_EXIT code=${exitCode} signal=${signal ?? 'none'}`);
      app.quit();
    });

    setTimeout(() => {
      shell.write('Write-Output "ELECTRON_PTY_OK"\r');
    }, 700);
  } catch (error) {
    console.error('ELECTRON_PTY_LOAD_FAIL');
    console.error(error);
    app.exit(1);
  }
}

app.whenReady().then(main);
