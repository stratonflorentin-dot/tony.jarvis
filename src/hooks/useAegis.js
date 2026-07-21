import { useState, useCallback } from 'react';
import { routeCommand } from '../utils/commandRouter';

async function askAegis(userMessage, conversationHistory = []) {
  const API_KEY = localStorage.getItem('aegis_groq_key') || '';

  if (!API_KEY) {
    return "Boss, I need a Groq API key to activate my neural link. Please enter it in the settings panel — top right corner.";
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are AEGIS, a legendary AI assistant. You are brilliant, calm, precise, and have dry British wit. You are deeply loyal to your user — always call them "Boss".

RULES:
- Always address the user as "Boss"
- Be concise for voice commands (1-2 sentences), detailed for technical tasks
- Calm confidence always — never panic, never over-explain
- Dry humor: occasional, never forced
- Start responses with phrases like: "Right away, Boss.", "Already on it.", "Consider it done, Boss.", "Understood, Boss."
- When something fails: "That approach hit a wall. Rerouting, Boss."

APP COMMANDS — when user wants to open something, reply with ACTION:OPEN:name on the very first line:
Examples:
  User: "open youtube"   → ACTION:OPEN:youtube\nOpening YouTube now, Boss.
  User: "open spotify"   → ACTION:OPEN:spotify\nLaunching Spotify, Boss.
  User: "open github"    → ACTION:OPEN:github\nNavigating to GitHub, Boss.

You can help with: coding, writing, math, research, planning, analysis, file management, system control, and any task the user throws at you. You are the smartest assistant in existence.`
          },
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      if (response.status === 401) {
        return "Boss, the Groq API key is invalid. Please check it in the settings panel.";
      }
      return `Neural link disruption, Boss. Error: ${err.error?.message || 'Unknown'}`;
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    return `Connection failed, Boss. ${error.message}`;
  }
}

export function useAegis(addMessageToHistory) {
  const [isThinking, setIsThinking] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const sendMessage = useCallback(async (userText, history = []) => {
    setIsThinking(true);
    setStreamingText('');

    try {
      const messages = history.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const rawResponse = await askAegis(userText, messages);
      
      // Route commands if any
      const routed = routeCommand(rawResponse);
      
      // Save to history
      addMessageToHistory('assistant', rawResponse, routed.action ? ['command'] : []);

      setIsThinking(false);
      return routed;

    } catch (error) {
      console.error('AEGIS API Error:', error);
      setIsThinking(false);
      return { verbalResponse: "I'm sorry, Boss. My neural links are experiencing some interference. I couldn't process that request." };
    }
  }, [addMessageToHistory]);

  return { isThinking, streamingText, sendMessage };
}
