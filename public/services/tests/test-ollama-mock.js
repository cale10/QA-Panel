/* Minimal mock tests for OllamaService without external deps
   Validates: catalog defaults + enriched metadata
   Jira: SCRUM-49
*/

// Ensure we use our own fetch mock
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.endsWith('/api/version')) {
    return {
      ok: true,
      status: 200,
      async json() { return { version: 'v0.2.0' }; },
      async text() { return JSON.stringify({ version: 'v0.2.0' }); }
    };
  }
  if (u.endsWith('/api/tags')) {
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          models: [
            { name: 'llama3.2:latest', size: 1, modified_at: 'now', digest: 'x', parameters: '1B' },
            { name: 'minicpm-v:latest', size: 1, modified_at: 'now', digest: 'y', parameters: '1B' },
            { name: 'llava:latest', size: 1, modified_at: 'now', digest: 'z', parameters: '1B' }
          ]
        };
      },
      async text() { return 'ok'; }
    };
  }
  if (u.endsWith('/api/generate') || u.endsWith('/api/chat') || u.endsWith('/api/show')) {
    return { ok: true, status: 200, async json() { return {}; }, async text() { return '{}'; } };
  }
  return { ok: false, status: 404, async json() { return {}; }, async text() { return 'not found'; } };
};

const path = require('path');
const OllamaService = require(path.join('..', 'OllamaService.js'));

(async () => {
  try {
    const svc = new OllamaService();

    // Catalog models and check defaults
    const catalog = await svc.catalogModels();
    if (!catalog || !catalog.defaults) throw new Error('No catalog defaults produced');

    const { defaultRegularModel, defaultVisionModel } = catalog.defaults;
    if (!String(defaultRegularModel || '').startsWith('llama3.2')) {
      throw new Error(`Expected defaultRegularModel to start with llama3.2, got ${defaultRegularModel}`);
    }
    if (!String(defaultVisionModel || '').startsWith('minicpm-v')) {
      throw new Error(`Expected defaultVisionModel to start with minicpm-v, got ${defaultVisionModel}`);
    }

    // Ensure enriched metadata is present for vision model
    const m = (catalog.vision || []).find(m => m.name.startsWith('minicpm-v'));
    if (!m) throw new Error('minicpm-v not present in vision models');
    if (!m.displayName || !m.description || !m.maxResolution) {
      throw new Error('Expected enriched metadata (displayName, description, maxResolution) for vision model');
    }

    console.log('PASS: OllamaService catalog defaults and metadata OK');
    process.exit(0);
  } catch (err) {
    console.error('FAIL:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();

