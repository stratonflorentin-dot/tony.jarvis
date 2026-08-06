// Native Groq tool-calling agentic loop — replaces the old ACTION:X:Y text-parsing hack.
// Runs entirely client-side: the browser talks to api.groq.com directly, exactly like the
// old askAegis() did (dev_server.py's /proxy exists as a CORS escape hatch but is unused
// here because direct calls already work).
export async function runAgentLoop({
  apiKey,
  model = 'llama-3.3-70b-versatile',
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          temperature: 0.7,
          messages,
          ...(tools.length ? { tools, tool_choice: 'auto' } : {}),
        }),
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') return { text: 'Neural bridge timeout, Boss. Groq took too long to respond.' };
      return { text: `Neural link offline, Boss. I can't reach Groq. Diagnostics: ${error.message}` };
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 401) return { text: 'Boss, that Groq API key was rejected. Check it in Settings.' };
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
