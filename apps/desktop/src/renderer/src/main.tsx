import { Component } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

const S = {
  w: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1419', color: '#e6e8eb', fontFamily: 'system-ui, sans-serif', padding: 24, textAlign: 'center' },
  h: { fontSize: '1.15rem', fontWeight: 650, marginBottom: 10 },
  p: { color: '#9aa2af', fontSize: '0.86rem', maxWidth: 460, lineHeight: 1.5, margin: '0 0 14px' },
  e: { margin: 0, padding: '10px 14px', background: '#17191d', border: '1px solid #30343c', borderRadius: 4, color: '#ff8a80', fontSize: '0.76rem', maxWidth: 540, overflow: 'auto', textAlign: 'left', whiteSpace: 'pre-wrap' }
} as const

class E extends Component<{ children: React.ReactNode }> {
  state = { e: null as Error | null }
  static getDerivedStateFromError(e: Error) { return { e } }
  render() {
    return this.state.e
      ? <div style={S.w}><h1 style={S.h}>DeepWork could not start</h1><p style={S.p}>An error prevented the renderer from mounting.</p><pre style={S.e}>{this.state.e.message}</pre></div>
      : this.props.children
  }
}

const H = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0f1419;color:#e6e8eb;font-family:system-ui,sans-serif;padding:24px;text-align:center'
const r = document.getElementById('root')
if (!r) document.body.innerHTML = `<div style="${H}"><p>Root element not found.</p></div>`
else if (!window.workbenchShell) r.innerHTML = `<div style="${H}"><h1 style="font-size:1.15rem;font-weight:650;margin-bottom:10px">Workbench shell unavailable</h1><p style="color:#9aa2af;font-size:0.86rem">Preload script did not expose the workbench API.</p></div>`
else ReactDOM.createRoot(r).render(<E><App /></E>)
