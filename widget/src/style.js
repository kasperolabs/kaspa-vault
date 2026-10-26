// The widget's look, inside its shadow root. Host pages recolor it with CSS variables on the
// element, e.g.  kaspa-vault { --kv-accent: #1a365d; --kv-font: Inter, sans-serif; }
export default `
:host {
    --kv-accent: #134e4a;
    --kv-accent-soft: #f0fdfa;
    --kv-accent-line: #99f6e4;
    --kv-ink: #0f172a;
    --kv-text: #334155;
    --kv-muted: #64748b;
    --kv-line: #e5e9f0;
    --kv-bg: #f6f8fb;
    --kv-card: #ffffff;
    --kv-good: #16a34a;
    --kv-warn-bg: #fff7ed; --kv-warn-line: #fed7aa; --kv-warn-ink: #7c2d12;
    --kv-info-bg: #eff6ff; --kv-info-line: #bfdbfe; --kv-info-ink: #1d4ed8;
    --kv-bad: #b91c1c;
    --kv-radius: 16px;
    --kv-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --kv-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    display: block; font-family: var(--kv-font); color: var(--kv-text); font-size: 15px; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
}
* { box-sizing: border-box; }
button { font: inherit; }
a { color: inherit; }
.kv { max-width: 640px; margin: 0 auto; }
.kv-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.kv-title { margin: 0; font-size: 24px; font-weight: 700; color: var(--kv-ink); letter-spacing: -0.01em; }
.kv-sub { margin: 2px 0 0; font-size: 14px; color: var(--kv-muted); }
.kv-net { font-size: 12px; font-weight: 600; color: var(--kv-warn-ink); background: var(--kv-warn-bg); border: 1px solid var(--kv-warn-line); border-radius: 999px; padding: 3px 10px; white-space: nowrap; }

.kv-card { background: var(--kv-card); border: 1px solid var(--kv-line); border-radius: var(--kv-radius); padding: 22px; margin-bottom: 14px; }
.kv-card h2 { font-size: 17px; font-weight: 600; margin: 0 0 6px; color: var(--kv-ink); }
.kv-card p { margin: 0; }
.kv-card p + p { margin-top: 10px; }
.kv-muted { color: var(--kv-muted); font-size: 13px; }
.kv-center { text-align: center; }
.kv-mono { font-family: var(--kv-mono); font-size: 13px; color: var(--kv-ink); word-break: break-all; }
.kv-gap { margin-top: 14px; }

.kv-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 13px 18px; border-radius: 12px; border: 1px solid var(--kv-accent); background: var(--kv-accent); color: #fff; font-weight: 600; font-size: 15px; cursor: pointer; transition: filter .15s, background .15s; }
.kv-btn:hover:not(:disabled) { filter: brightness(1.12); }
.kv-btn:disabled { opacity: .45; cursor: not-allowed; }
.kv-btn-line { background: #fff; color: var(--kv-accent); }
.kv-btn-line:hover:not(:disabled) { background: var(--kv-accent-soft); filter: none; }
.kv-btn-quiet { background: transparent; border-color: transparent; color: var(--kv-muted); font-weight: 500; }
.kv-btn-quiet:hover:not(:disabled) { color: var(--kv-ink); filter: none; }
.kv-btn-small { width: auto; padding: 8px 14px; font-size: 14px; border-radius: 10px; }
.kv-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
.kv-link { background: none; border: 0; padding: 0; color: var(--kv-muted); font-size: 13px; cursor: pointer; text-decoration: none; }
.kv-link:hover { color: var(--kv-accent); text-decoration: underline; }

.kv-input { width: 100%; padding: 12px 14px; border: 1.5px solid var(--kv-line); border-radius: 12px; font: inherit; color: var(--kv-ink); background: #fff; outline: none; transition: border-color .15s; }
.kv-input:focus { border-color: var(--kv-accent); }
.kv-input.kv-mono { font-size: 13px; }
.kv-label { display: block; font-size: 13px; font-weight: 600; color: var(--kv-ink); margin: 12px 0 6px; }
.kv-err { color: var(--kv-bad); font-size: 14px; margin-top: 10px; }
.kv-err:empty { display: none; }

/* hero */
.kv-hero { display: flex; gap: 18px; align-items: flex-start; }
.kv-hero svg { flex-shrink: 0; }
.kv-hints { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 18px; }
.kv-hints div { background: var(--kv-bg); border-radius: 12px; padding: 12px; font-size: 13px; line-height: 1.4; }
.kv-hints b { display: block; color: var(--kv-ink); margin-bottom: 3px; }

/* setup */
.kv-step { display: flex; gap: 14px; }
.kv-num { width: 28px; height: 28px; border-radius: 50%; background: var(--kv-accent); color: #fff; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kv-num-done { background: var(--kv-good); }
.kv-num-todo { background: #e2e8f0; color: var(--kv-muted); }
.kv-step-body { flex: 1; min-width: 0; }
.kv-step-body .kv-btn { margin-top: 14px; }
.kv-step-sum { font-size: 14px; color: var(--kv-muted); margin-top: 2px; }
.kv-words { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0 4px; padding: 14px; background: var(--kv-bg); border-radius: 12px; counter-reset: w; }
.kv-words span { font-family: var(--kv-mono); font-size: 14px; color: var(--kv-ink); background: #fff; border: 1px solid var(--kv-line); border-radius: 8px; padding: 7px 9px; }
.kv-words span::before { counter-increment: w; content: counter(w) ". "; color: var(--kv-muted); font-size: 12px; }
.kv-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
.kv-tile { border: 1.5px solid var(--kv-line); border-radius: 14px; padding: 14px; cursor: pointer; background: #fff; text-align: left; }
.kv-tile:hover:not(:disabled) { border-color: #c7d2e3; }
.kv-tile:disabled { opacity: .5; cursor: not-allowed; }
.kv-tile-sel { border-color: var(--kv-accent); background: var(--kv-accent-soft); }
.kv-tile b { display: block; font-size: 15px; color: var(--kv-ink); }
.kv-tile span { font-size: 13px; color: var(--kv-muted); line-height: 1.35; }
.kv-wallets { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.kv-wallet { display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; text-align: left; cursor: pointer; }
.kv-wallet:hover:not(:disabled) { border-color: var(--kv-accent); background: var(--kv-bg); }
.kv-wallet:disabled { opacity: .55; cursor: not-allowed; }
.kv-wallet-ic { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 17px; color: #fff; flex: none; }
.kv-wallet-t { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.kv-wallet-t b { font-size: 15px; color: var(--kv-ink); }
.kv-wallet-t span { font-size: 13px; color: var(--kv-muted); }
.kv-ok { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 12px 14px; border-radius: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; font-size: 14px; color: var(--kv-ink); }
.kv-ok svg { flex: none; }
.kv-warn { margin-top: 12px; font-size: 14px; line-height: 1.5; color: var(--kv-warn-ink); background: var(--kv-warn-bg); border: 1px solid var(--kv-warn-line); border-radius: 12px; padding: 12px 14px; }
.kv-check { display: flex; gap: 10px; align-items: flex-start; margin-top: 14px; font-size: 14px; line-height: 1.45; cursor: pointer; }
.kv-check input { margin-top: 3px; width: 18px; height: 18px; flex-shrink: 0; accent-color: var(--kv-accent); }
.kv-quiz { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* account */
.kv-balance { text-align: center; padding: 26px 22px 22px; }
.kv-lbl { font-size: 13px; color: var(--kv-muted); text-transform: uppercase; letter-spacing: .06em; }
.kv-amt { font-size: 38px; font-weight: 700; margin: 6px 0 2px; letter-spacing: -0.02em; color: var(--kv-ink); font-variant-numeric: tabular-nums; }
.kv-amt small { font-size: 18px; color: var(--kv-muted); font-weight: 600; margin-left: 6px; }
.kv-pill { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; padding: 6px 12px; border-radius: 999px; background: #f0fdf4; color: #166534; font-size: 13px; font-weight: 500; max-width: 100%; }
.kv-pill-off { background: var(--kv-warn-bg); color: var(--kv-warn-ink); }
.kv-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; flex: none; }
.kv-pill-off .kv-dot { background: #f59e0b; }
.kv-spend { display: flex; align-items: center; gap: 14px; }
.kv-spend-t { flex: 1; min-width: 0; }
.kv-spend-t b { display: block; color: var(--kv-ink); font-size: 15px; }
.kv-spend-amt { font-size: 22px; font-weight: 700; color: var(--kv-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
.kv-spend-btns { display: flex; gap: 8px; margin-top: 14px; }
.kv-spend-btns .kv-btn { flex: 1; }

.kv-banner { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 14px; margin-bottom: 14px; background: var(--kv-warn-bg); border: 1px solid var(--kv-warn-line); color: var(--kv-warn-ink); font-size: 14px; }
.kv-banner b { display: block; color: var(--kv-ink); font-size: 15px; margin-bottom: 2px; }
.kv-banner .kv-btn { margin-top: 10px; }
.kv-strip { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 14px; margin-bottom: 14px; background: var(--kv-info-bg); border: 1px solid var(--kv-info-line); }
.kv-strip-ic { width: 36px; height: 36px; border-radius: 10px; background: #dbeafe; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kv-strip b { display: block; font-size: 15px; margin-bottom: 2px; color: var(--kv-ink); }
.kv-strip p { font-size: 14px; margin: 0; }
.kv-strip .kv-link { color: var(--kv-info-ink); font-weight: 600; margin-top: 6px; display: inline-block; }

.kv-row { display: flex; align-items: center; gap: 14px; padding: 13px 0; border-top: 1px solid #f1f5f9; }
.kv-row:first-of-type { border-top: 0; }
.kv-row-ic { width: 38px; height: 38px; border-radius: 10px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kv-row-t { flex: 1; min-width: 0; }
.kv-row-t b { display: block; font-size: 15px; color: var(--kv-ink); font-weight: 600; }
.kv-row-t span { font-size: 13px; color: var(--kv-muted); }
.kv-row-amt { font-size: 16px; font-weight: 700; white-space: nowrap; color: var(--kv-ink); font-variant-numeric: tabular-nums; }
.kv-empty { padding: 18px; background: var(--kv-bg); border: 1px dashed #d5dce6; border-radius: 12px; font-size: 14px; color: var(--kv-muted); text-align: center; }
.kv-foot { display: flex; gap: 8px 18px; justify-content: center; flex-wrap: wrap; margin: 6px 0 4px; }
.kv-small-print { text-align: center; font-size: 12px; color: var(--kv-muted); margin-top: 12px; }

/* sheets */
.kv-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, .45); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 2147483000; }
.kv-sheet { background: #fff; border-radius: 20px; padding: 24px; width: 100%; max-width: 460px; max-height: calc(100vh - 32px); overflow: auto; box-shadow: 0 24px 60px rgba(15, 23, 42, .25); }
.kv-sheet h3 { font-size: 19px; font-weight: 700; margin: 0 0 4px; color: var(--kv-ink); }
.kv-sheet > .kv-muted { margin: 0 0 14px; }
.kv-sheet .kv-btn { margin-top: 10px; }
.kv-amt-in { display: flex; align-items: baseline; gap: 8px; border-bottom: 2px solid var(--kv-line); padding: 6px 0; margin: 4px 0 8px; }
.kv-amt-in input { font: inherit; font-size: 34px; font-weight: 700; border: 0; outline: 0; width: 100%; color: var(--kv-ink); background: transparent; font-variant-numeric: tabular-nums; }
.kv-amt-in span { font-size: 18px; color: var(--kv-muted); font-weight: 600; }
.kv-amt-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 26px; margin-bottom: 10px; }
.kv-note { font-size: 14px; line-height: 1.5; background: var(--kv-bg); border-radius: 12px; padding: 12px 14px; margin: 10px 0; }
.kv-note b { color: var(--kv-ink); }
.kv-pick { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; max-height: 40vh; overflow: auto; }
.kv-pick label { display: flex; gap: 12px; align-items: center; padding: 10px 12px; border: 1.5px solid var(--kv-line); border-radius: 12px; cursor: pointer; }
.kv-pick input { width: 18px; height: 18px; accent-color: var(--kv-accent); }
.kv-pick b { display: block; color: var(--kv-ink); }
.kv-pick span { font-size: 13px; color: var(--kv-muted); }
.kv-qr { display: flex; gap: 16px; align-items: center; margin: 8px 0; }
.kv-qr-box { width: 132px; height: 132px; flex: none; border: 1px solid var(--kv-line); border-radius: 10px; overflow: hidden; background: #fff; }
.kv-qr-box svg { width: 100%; height: 100%; display: block; }
.kv-kv { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 13px; margin: 12px 0; }
.kv-kv dt { color: var(--kv-muted); }
.kv-kv dd { margin: 0; font-family: var(--kv-mono); color: var(--kv-ink); word-break: break-all; }
.kv-progress { display: flex; flex-direction: column; gap: 10px; margin: 16px 0 6px; }
.kv-pstep { display: flex; align-items: center; gap: 12px; font-size: 15px; color: #94a3b8; }
.kv-pdot { width: 26px; height: 26px; border-radius: 50%; background: #e2e8f0; color: var(--kv-muted); font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kv-pstep-done { color: var(--kv-ink); }
.kv-pstep-done .kv-pdot { background: var(--kv-good); color: #fff; }
.kv-pstep-now { color: var(--kv-ink); }
.kv-pstep-now .kv-pdot { background: var(--kv-accent); color: #fff; animation: kv-pulse 1.4s ease-in-out infinite; }
@keyframes kv-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(19, 78, 74, .35); } 50% { box-shadow: 0 0 0 6px rgba(19, 78, 74, 0); } }
.kv-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: var(--kv-ink); color: #fff; padding: 11px 18px; border-radius: 12px; font-size: 14px; z-index: 2147483001; box-shadow: 0 10px 30px rgba(0,0,0,.2); max-width: calc(100vw - 32px); }
.kv-toast-bad { background: var(--kv-bad); }

@media (max-width: 520px) {
    .kv-card { padding: 18px; }
    .kv-hero { flex-direction: column; gap: 12px; }
    .kv-hints, .kv-tiles { grid-template-columns: 1fr; }
    .kv-words { grid-template-columns: repeat(2, 1fr); }
    .kv-amt { font-size: 32px; }
    .kv-row2 .kv-btn { padding: 12px 10px; font-size: 14px; }
    .kv-qr { flex-direction: column; align-items: flex-start; }
    .kv-overlay { align-items: flex-end; padding: 0; }
    .kv-sheet { border-radius: 20px 20px 0 0; max-height: 92vh; }
}
`;
