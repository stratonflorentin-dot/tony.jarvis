# JARVIS — Advanced Neural Intelligence HUD

JARVIS has been upgraded to an **Advanced AI Architecture**, incorporating NLP, machine learning principles, and predictive context awareness.

## Advanced AI Features

- **Cognitive Matrix HUD**: Real-time visualization of JARVIS's reasoning engine, context awareness levels, and predictive load.
- **Long-Term Memory (LTM)**: JARVIS now remembers facts about the Boss, preferences, and session history using the `ACTION:MEM:` protocol.
- **Predictive Analytics**: The AI anticipates needs by analyzing current interactions and historical data stored in the user profile.
- **Context-Aware Reasoning**: Using `llama-3.3-70b-versatile`, JARVIS maintains coherent, multi-turn interactions with deep understanding of user intent.
- **System Integration**: A robust Python-based bridge (`dev_server.py`) enables JARVIS to control local hardware and software systems seamlessly.

## Quick Start

1. **Start the Development Server**:
   To avoid CORS issues when calling the Groq API from a browser, run the provided local server:
   ```bash
   python dev_server.py
   ```

2. **Access the HUD**:
   Open your browser and navigate to the local network address provided in the terminal output (e.g., `http://jarvis.local:5001`). 
   
   **SECURITY NOTICE**: This system strictly prohibits the use of loopback addresses for connection targets. Always use a proper domain name or local network IP.

3. **Configure API Key**:
   - Click the **⚙ SETTINGS** button in the top-right corner.
   - Enter your **Groq API Key** (get one for free at [console.groq.com](https://console.groq.com)).
   - Click **ACTIVATE LINK**.

## Features

- **Ultra-Fast AI**: Powered by `llama-3.3-70b-versatile` via Groq.
- **Standalone HUD**: No complex backend dependencies.
- **App Commands**: Launch applications like YouTube, Spotify, and GitHub via voice or text.
- **Memory Log**: Persistent session history in the HUD.

## Technical Details

- **Frontend**: HTML5, Tailwind CSS, Three.js (Background), GSAP (Animations).
- **AI Link**: Direct browser-to-API communication with Groq.
- **Port**: Runs on `5001` by default.

---
*JARVIS online. Standing by, Boss.*
