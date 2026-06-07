import { useState, useEffect } from 'react';

export function useMemory() {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('jarvis_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [bossPrefs, setBossPrefs] = useState(() => {
    const saved = localStorage.getItem('jarvis_boss_prefs');
    return saved ? JSON.parse(saved) : {
      name: 'Boss',
      preferredApps: [],
      workingHours: '9-5',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      pinnedFacts: []
    };
  });

  useEffect(() => {
    localStorage.setItem('jarvis_history', JSON.stringify(history.slice(-500)));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('jarvis_boss_prefs', JSON.stringify(bossPrefs));
  }, [bossPrefs]);

  const addMessage = (role, content, tags = []) => {
    const newMessage = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      role,
      content,
      tags
    };
    setHistory(prev => [...prev, newMessage]);
    return newMessage;
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const updateBossPrefs = (newPrefs) => {
    setBossPrefs(prev => ({ ...prev, ...newPrefs }));
  };

  return { history, bossPrefs, addMessage, clearHistory, updateBossPrefs };
}
