/**
 * Minimal embedded chat UI served at `GET /`.
 *
 * Plain HTML + CSS + fetch — no build step, no framework. Posts to `/chat`,
 * persists `threadId` in localStorage so multi-turn retrieval stays
 * window-aware across refreshes. Edit this in-place, or delete it and point
 * your own frontend (Assistant UI, Next.js, etc.) at `POST /chat`.
 */
export const CHAT_UI = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>copass-agent</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      max-width: 760px; margin: 0 auto; padding: 1.5rem 1rem;
      background: #fafafa; color: #111;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0b0d10; color: #e7e9ea; }
      .msg.assistant { background: #1a1d21; border-color: #2a2d31; }
      .msg.user { background: #264873; color: #e7f1ff; }
      .msg.error { background: #3a1515; color: #ffb3b3; }
      #log { background: #14171a; border-color: #23272b; }
      input[type=text] { background: #14171a; color: inherit; border-color: #2a2d31; }
      #meta { color: #777; }
      #meta button { background: #1a1d21; color: #ccc; border-color: #2a2d31; }
    }
    header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.5rem; }
    header h1 { font-size: 1rem; margin: 0; font-weight: 600; }
    header .hint { font-size: 0.75rem; color: #888; }
    #log {
      border: 1px solid #e1e4e8; border-radius: 10px; padding: 1rem;
      height: 60vh; overflow-y: auto; background: white;
    }
    #log:empty::before {
      content: "Ask anything about your Copass knowledge graph.";
      color: #999; font-style: italic;
    }
    .msg { margin: 0 0 0.6rem; padding: 0.55rem 0.8rem; border-radius: 8px;
           max-width: 85%; white-space: pre-wrap; word-wrap: break-word; line-height: 1.45; }
    .msg.user { background: #e0efff; margin-left: auto; border-bottom-right-radius: 2px; }
    .msg.assistant { background: #fff; border: 1px solid #eaeaea; border-bottom-left-radius: 2px; }
    .msg.error { background: #ffe8e8; color: #a00; font-style: italic; border: 1px solid #fcc; }
    .msg.pending { opacity: 0.7; }
    form { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
    input[type=text] {
      flex: 1; padding: 0.7rem 0.9rem;
      border: 1px solid #cdd1d6; border-radius: 8px; font: inherit;
      background: white; color: inherit;
    }
    button {
      padding: 0.7rem 1.1rem; border: 0; border-radius: 8px;
      background: #0969da; color: white; font: inherit; cursor: pointer;
      font-weight: 500;
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    #meta {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 0.6rem; font-size: 0.73rem; color: #666;
    }
    #meta button {
      padding: 0.2rem 0.55rem; font-size: 0.73rem; font-weight: normal;
      background: #eee; color: #333; border: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <header>
    <h1>copass-agent</h1>
    <span class="hint">POST /chat · thread-aware via Context Window</span>
  </header>
  <div id="log"></div>
  <form id="f">
    <input type="text" id="i" placeholder="Ask about your knowledge graph…" autofocus autocomplete="off" required />
    <button type="submit" id="b">Send</button>
  </form>
  <div id="meta">
    <span>thread: <span id="tid">new</span></span>
    <button type="button" id="reset">New thread</button>
  </div>
  <script>
    const log = document.getElementById('log');
    const form = document.getElementById('f');
    const input = document.getElementById('i');
    const btn = document.getElementById('b');
    const tidSpan = document.getElementById('tid');
    const resetBtn = document.getElementById('reset');
    const KEY = 'copass:threadId';

    function add(role, content) {
      const div = document.createElement('div');
      div.className = 'msg ' + role;
      div.textContent = content;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    }
    function getTid() { return localStorage.getItem(KEY); }
    function setTid(tid) {
      if (tid) localStorage.setItem(KEY, tid);
      else localStorage.removeItem(KEY);
      tidSpan.textContent = tid ? tid.slice(0, 16) + '…' : 'new';
    }
    setTid(getTid());

    resetBtn.addEventListener('click', () => {
      setTid(null);
      log.innerHTML = '';
      input.focus();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = input.value.trim();
      if (!message) return;
      add('user', message);
      input.value = '';
      btn.disabled = true;
      const pending = add('assistant pending', '…thinking');

      try {
        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message, threadId: getTid() || undefined }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'request failed');
        setTid(data.threadId);
        pending.textContent = data.answer || '(no content)';
        pending.className = 'msg assistant';
      } catch (err) {
        pending.textContent = 'Error: ' + (err && err.message || err);
        pending.className = 'msg error';
      } finally {
        btn.disabled = false;
        input.focus();
      }
    });
  </script>
</body>
</html>
`;
