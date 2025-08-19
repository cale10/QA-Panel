// Lightweight script to verify Ollama endpoints, streaming, and cancellation
// Run with: node public/services/ollama-endpoint-check.js

const fetch = require('node-fetch');
const { Readable } = require('stream');

async function getJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, json: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, text }; }
}

async function checkVersion() {
  const { ok, status, json } = await getJson('http://localhost:11434/api/version');
  return { ok, status, version: json?.version };
}

async function listTags() {
  const { ok, status, json } = await getJson('http://localhost:11434/api/tags');
  return { ok, status, models: json?.models?.map(m => m.name) || [] };
}

async function generateOnce(model) {
  const payload = { model, prompt: 'Say hello in one short sentence.', stream: false };
  const { ok, status, json, text } = await getJson('http://localhost:11434/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  return { ok, status, response: json?.response || text };
}

async function generateStream(model) {
  const controller = new AbortController();
  const signal = controller.signal;
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: 'streaming test', stream: true }), signal
  });
  if (!res.ok) return { ok: false, status: res.status };
  return new Promise((resolve, reject) => {
    let received = '';
    let chunks = 0;
    const onData = (buf) => {
      chunks++;
      const lines = buf.toString('utf8').trim().split(/\r?\n/);
      for (const line of lines) {
        try { const obj = JSON.parse(line); if (obj.response) received += obj.response; }
        catch { /* ignore partial */ }
      }
      if (chunks >= 5) { // cancel after a few chunks
        controller.abort();
      }
    };
    const onEnd = () => resolve({ ok: true, status: res.status, received, cancelled: true });
    const onErr = (e) => resolve({ ok: true, status: res.status, received, cancelled: true });
    res.body.on('data', onData);
    res.body.on('end', onEnd);
    res.body.on('error', onErr);
  });
}

async function main() {
  console.log('Checking Ollama endpoints...');
  const ver = await checkVersion();
  console.log('Version:', ver);
  const tags = await listTags();
  console.log('Tags:', tags.models);

  const textModel = tags.models.find(n => /llama|mistral|qwen|gemma/i.test(n)) || tags.models[0];
  if (!textModel) {
    console.log('No models installed; install one with: ollama pull llama3.2');
    return;
  }

  const once = await generateOnce(textModel);
  console.log('Generate (non-stream):', { status: once.status, sample: String(once.response).slice(0, 80) });

  const stream = await generateStream(textModel);
  console.log('Generate (stream, cancelled):', { status: stream.status, chunksSample: String(stream.received).slice(0, 80), cancelled: stream.cancelled });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Endpoint check failed:', err);
    process.exitCode = 1;
  });
}

