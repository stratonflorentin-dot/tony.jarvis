// Native Groq tool-calling agentic loop — replaces the old ACTION:X:Y text-parsing hack.
// Runs entirely client-side: the browser talks to api.groq.com directly, exactly like the
// old askAegis() did (dev_server.py's /proxy exists as a CORS escape hatch but is unused
// here because direct calls already work).
// llama-3.3-70b-versatile occasionally emits a malformed pseudo-XML function call (Groq
// error code `tool_use_failed`) under AEGIS's full ~24-tool schema — measured at roughly a
// 1-in-6 chance per call live against this account. openai/gpt-oss-120b avoids that failure
// mode, but its verbose reasoning traces plus this account's lower per-model token budget
// (8000 vs 12000 TPM) make it hit rate limits noticeably faster in practice. Net tradeoff
// favors llama here: keep the higher budget and terser output, and lean on the retry/
// tools-drop fallback below (keyed on the `tool_use_failed` error code, not message text,
// so it catches every phrasing Groq uses for it) to absorb the occasional bad generation.
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

async function callGroq({ apiKey, model, messages, tools, timeoutMs }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        temperature: 0.7,
        messages,
        ...(tools && tools.length ? { tools, tool_choice: 'auto' } : {}),
      }),
    });
    return { response };
  } catch (error) {
    return { error };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runAgentLoop({
  apiKey,
  model = DEFAULT_MODEL,
  systemPrompt,
  history = [],
  userMessage,
  tools = [],
  executeTool = {},
  maxIterations = 6,
  timeoutMs = 25000,
}) {
  const messages = [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userMessage }];

  for (let i = 0; i < maxIterations; i++) {
    // Retry policy for Groq's `tool_use_failed` (malformed function-call generation, seen
    // under Llama models with many tools available): retry once with tools, then fall back
    // to a tools-free call so the Boss always gets a real reply, never raw API error text.
    let response;
    let useTools = tools;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await callGroq({ apiKey, model, messages, tools: useTools, timeoutMs });
      if (result.error) {
        if (result.error.name === 'AbortError') return { text: 'Neural bridge timeout, Boss. Groq took too long to respond.' };
        return { text: `Neural link offline, Boss. I can't reach Groq. Diagnostics: ${result.error.message}` };
      }
      response = result.response;
      if (response.ok) break;

      const errData = await response.json().catch(() => ({}));
      if (response.status === 401) return { text: 'Boss, that Groq API key was rejected. Check it in Settings.' };
      if (errData.error?.code === 'tool_use_failed' && attempt < 2) {
        useTools = attempt === 0 ? tools : []; // 2nd retry drops tools entirely
        continue;
      }
      return { text: `Neural link disruption, Boss. Error Code: ${response.status}. Details: ${errData.error?.message || 'Unknown'}` };
    }

    const data = await response.json();
    const message = data.choices[0].message;

    if (message.tool_calls && message.tool_calls.length) {
      messages.push({ role: 'assistant', content: message.content || null, tool_calls: message.tool_calls });
      for (const call of message.tool_calls) {
        let result;
        try {
          const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
          const executor = executeTool[call.function.name];
          result = executor ? await executor(args) : { success: false, message: `Unknown tool "${call.function.name}".` };
        } catch (e) {
          result = { success: false, message: e.message };
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
      continue;
    }

    return { text: message.content };
  }

  return { text: "I got a bit tangled in my own instructions there, Boss — could you rephrase that?" };
}
