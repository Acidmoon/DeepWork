## 1. Diagnose root cause

- [x] 1.1 Check Vite dev server console output for renderer build errors
- [x] 1.2 Verify `ELECTRON_RENDERER_URL` is correctly set and reachable at Electron startup
- [x] 1.3 Inspect Electron renderer DevTools console for runtime JavaScript errors
- [x] 1.4 Add temporary `console.log` in `main.tsx` to confirm script execution reaches React mount

## 2. Add renderer startup guard

- [x] 2.1 Add `window.workbenchShell` availability check in `main.tsx` before React mount
- [x] 2.2 Add try-catch around `ReactDOM.createRoot().render()` in `main.tsx`
- [x] 2.3 Add React Error Boundary component wrapping `<App />`
- [x] 2.4 Display visible error message on dark background when startup fails

## 3. Verify fix

- [x] 3.1 Run `npm run dev` and confirm window renders correctly
- [x] 3.2 Run `npm run typecheck -w @ai-workbench/desktop`
- [x] 3.3 Run `npm run build -w @ai-workbench/desktop` and verify build succeeds
- [x] 3.4 Run `npm run validate:renderer-entrypoint -w @ai-workbench/desktop`
- [x] 3.5 Run `npm run validate:renderer-startup -w @ai-workbench/desktop`
