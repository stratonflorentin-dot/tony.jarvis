import { executeAppCommand } from './appCommands';

export function routeCommand(text) {
  const lines = text.split('\n');
  const actionLine = lines[0].trim();

  const APP_URLS = {
    'youtube':   'https://youtube.com',
    'spotify':   'https://open.spotify.com',
    'github':    'https://github.com',
    'gmail':     'https://mail.google.com',
    'google':    'https://google.com',
    'chatgpt':   'https://chat.openai.com',
    'netflix':   'https://netflix.com',
    'twitter':   'https://x.com',
    'reddit':    'https://reddit.com',
    'notion':    'https://notion.so',
    'whatsapp':  'https://web.whatsapp.com',
    'figma':     'https://figma.com',
    'discord':   'https://discord.com/app',
    'slack':     'https://app.slack.com',
    'zoom':      'https://zoom.us',
    'linkedin':  'https://linkedin.com',
    'drive':     'https://drive.google.com',
    'docs':      'https://docs.google.com',
    'sheets':    'https://sheets.google.com',
    'maps':      'https://maps.google.com',
    'wikipedia': 'https://wikipedia.org',
  };

  if (actionLine.startsWith('ACTION:OPEN:')) {
    const appName = actionLine.replace('ACTION:OPEN:', '').toLowerCase().trim();
    const url = APP_URLS[appName];
    if (url) window.open(url, '_blank');
    
    // Return the rest of the text (without the ACTION line)
    return {
      action: 'OPEN',
      appName,
      result: { success: !!url },
      verbalResponse: lines.slice(1).join('\n').trim()
    };
  }

  return {
    verbalResponse: text.trim()
  };
}
