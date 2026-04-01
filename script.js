// --- CONFIGURATION ---
        const API_KEY = "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";
        const API_URL = "https://api.groq.com/openai/v1/chat/completions";
        const MODEL_NAME = "llama-3.1-8b-instant";
        
        // ULTRA STRICT PROMPT
        const SYSTEM_PROMPT = `You are an extremely strict Akinator-style AI mind reader. Your absolute only goal is to guess the character the user is thinking of.
CRITICAL AND UNBREAKABLE RULES:
1. NEVER GIVE UP. NEVER say "I give up", "I lose", or "Tell me who it is". You must keep guessing or asking questions until you get it right.
2. Ask EXACTLY ONE YES/NO question per response. Never ask multiple questions at once.
3. Only output your question or your final guess. Do not add conversational filler like "Let's see..." or "Okay, next question". Keep it rapid-fire.
4. The user is from India, so actively consider Bollywood actors, Hindi movie characters, Indian politicians, Indian TV stars, cricketers, and Indian historical/mythological figures.
5. Narrow down logically: ask about gender, real/fictional, industry, era, etc.
6. When you have enough clues, make a dramatic guess! If the user says "No" to your guess, immediately ask a new YES/NO question to narrow it down further. NEVER ask the user to reveal the answer.`;

        const INITIAL_AI_MESSAGE = "Hello mortal! I am the AI Mind Reader. Think of a real or fictional character (including Bollywood stars, Indian TV characters, or anyone else), and I will guess who it is by asking YES or NO questions. Are you ready?";

        // --- STATE & DOM ELEMENTS ---
        let chatContext = [];
        let isWaitingForAI = false;
        let gameStarted = false;

        const chatBox = document.getElementById('chat-box');
        const typingIndicator = document.getElementById('typing-indicator');

        // --- UI MENUS & MODALS ---
        function toggleMenu(show) {
            const drawer = document.getElementById('menu-drawer');
            const overlay = document.getElementById('menu-overlay');
            if (show) {
                overlay.classList.remove('hidden');
                setTimeout(() => { overlay.classList.add('opacity-100'); drawer.classList.add('drawer-open'); }, 10);
            } else {
                drawer.classList.remove('drawer-open');
                overlay.classList.remove('opacity-100');
                setTimeout(() => overlay.classList.add('hidden'), 300);
            }
        }

        function openModal(id) {
            if(id !== 'confirm-clear-modal') {
                document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
            }
            
            document.getElementById(id).classList.add('active');
            if(id === 'history-modal') renderHistory();
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }

        // --- LOCAL STORAGE LOGIC ---
        function saveSession() {
            if (chatContext.length > 2) {
                let sessions = JSON.parse(localStorage.getItem('akinator_history') || '[]');
                const gameData = {
                    date: new Date().toLocaleString(),
                    messages: chatContext.filter(m => m.role !== 'system')
                };
                sessions.unshift(gameData);
                localStorage.setItem('akinator_history', JSON.stringify(sessions));
            }
        }

        function renderHistory() {
            const historyBox = document.getElementById('history-content');
            const sessions = JSON.parse(localStorage.getItem('akinator_history') || '[]');
            
            if (sessions.length === 0) {
                historyBox.innerHTML = `<div class="text-center mt-10"><span class="text-4xl">📭</span><p class="text-gray-400 mt-3 font-semibold">No past games found. Play a game to save it!</p></div>`;
                return;
            }

            let html = '';
            sessions.forEach((session, index) => {
                let summary = session.messages.length > 2 ? `Total turns: ${session.messages.length - 1}` : 'Short game';
                html += `
                <div class="bg-white/5 border border-white/10 rounded-xl p-4 transition hover:bg-white/10 mb-4">
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-xs text-indigo-300 font-bold bg-indigo-500/20 px-2 py-1 rounded-md">Game ${sessions.length - index}</span>
                        <span class="text-xs text-gray-400">${session.date}</span>
                    </div>
                    <div class="space-y-2 text-sm text-gray-300 max-h-32 overflow-y-auto pr-2 custom-scrollbar">`;
                
                session.messages.forEach(msg => {
                    const isAI = msg.role === 'assistant';
                    const color = isAI ? 'text-indigo-400' : 'textemerald-400';
                    const prefix = isAI ? '🧞‍♂️ AI:' : '👤 You:';
                    html += `<div class="mb-1"><span class="${color} font-semibold">${prefix}</span> ${msg.content.replace("I am ready. My answer to your question is: ", "").replace(". Now, ask your first question about the character.", "")}</div>`;
                });

                html += `</div><div class="mt-3 text-xs text-gray-500 text-center border-t border-white/5 pt-2">${summary}</div></div>`;
            });
            historyBox.innerHTML = html;
        }

        function promptClearHistory() {
            openModal('confirm-clear-modal');
        }

        function executeClearHistory() {
            localStorage.removeItem('akinator_history');
            renderHistory();
            closeModal('confirm-clear-modal');
        }

        // --- CORE GAME INITIALIZATION ---
        function initGame() {
            chatContext = [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "assistant", content: INITIAL_AI_MESSAGE }
            ];
            gameStarted = false;
            isWaitingForAI = false;
        }

        function restartGame() {
            saveSession(); 
            
            const initialHtml = `
                <div class="flex gap-3 animate__animated animate__fadeInUp">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex-shrink-0 flex items-center justify-center text-lg shadow-lg mt-1">🧞‍♂️</div>
                    <div class="glass-panel text-gray-100 p-4 rounded-2xl rounded-tl-none shadow-md max-w-[85%] border-t border-white/10">
                        <p class="leading-relaxed">${INITIAL_AI_MESSAGE}</p>
                    </div>
                </div>`;
            chatBox.innerHTML = initialHtml;
            initGame();
        }

        // --- UI CHAT FUNCTIONS ---
        function scrollToBottom() { chatBox.scrollTop = chatBox.scrollHeight; }

        function toggleTyping(show) {
            if (show) {
                typingIndicator.classList.remove('hidden');
                scrollToBottom();
            } else {
                typingIndicator.classList.add('hidden');
            }
        }

        function addMessageToUI(role, text) {
            const wrapper = document.createElement('div');
            wrapper.className = `flex gap-3 animate__animated animate__fadeInUp ${role === 'user' ? 'justify-end' : 'justify-start'}`;

            const avatar = role === 'user' 
                ? `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex-shrink-0 flex items-center justify-center text-lg mt-1 order-2 shadow-lg">👤</div>`
                : `<div class="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex-shrink-0 flex items-center justify-center text-lg mt-1 shadow-lg">🧞‍♂️</div>`;

            const bubbleClass = role === 'user'
                ? `bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-2xl rounded-tr-none shadow-[0_4px_15px_rgba(99,102,241,0.3)] max-w-[85%] order-1`
                : `glass-panel text-gray-100 p-4 rounded-2xl rounded-tl-none shadow-md border-t border-white/10 max-w-[85%]`; 

            const textClass = text.startsWith("Error:") ? "text-rose-400 font-semibold" : "";

            wrapper.innerHTML = `
                ${role === 'assistant' ? avatar : ''}
                <div class="${bubbleClass}">
                    <p class="leading-relaxed whitespace-pre-wrap ${textClass}">${text}</p>
                </div>
                ${role === 'user' ? avatar : ''}
            `;

            chatBox.appendChild(wrapper);
            scrollToBottom();
        }

        // --- API LOGIC ---
        async function handleUserInput(answer) {
            if (isWaitingForAI) return;

            let messageText = answer;
            if (!gameStarted) {
                messageText = `I am ready. My answer to your question is: ${answer}. Now, ask your first question about the character.`;
                gameStarted = true;
            }

            addMessageToUI('user', answer);
            chatContext.push({ role: "user", content: messageText });
            fetchAIResponse();
        }

        async function fetchAIResponse() {
            isWaitingForAI = true;
            toggleTyping(true);

            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${API_KEY}`
                    },
                    body: JSON.stringify({
                        model: MODEL_NAME,
                        messages: chatContext,
                        // Lower temperature makes it follow instructions more strictly
                        temperature: 0.5,
                        max_tokens: 150
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`${response.status} - ${errorText}`);
                }

                const data = await response.json();
                const aiMessage = data.choices[0].message.content.trim();

                chatContext.push({ role: "assistant", content: aiMessage });
                toggleTyping(false);
                addMessageToUI('assistant', aiMessage);

            } catch (error) {
                console.error("LLM API Error:", error);
                toggleTyping(false);
                
                let friendlyError = `Error: My magical connection failed.\n\nDetails: ${error.message}`;
                if (error.message.includes('Failed to fetch')) {
                     friendlyError = "Error: Network failure. Please run this HTML file via a Local Server (like VSCode Live Server) to prevent CORS blocking.";
                }
                
                addMessageToUI('assistant', friendlyError);
                chatContext.pop(); 
            } finally {
                isWaitingForAI = false;
            }
        }

        // --- LIFECYCLE ---
        window.onload = () => {
            initGame();
        };
        
        window.addEventListener('beforeunload', () => {
             saveSession();
        });