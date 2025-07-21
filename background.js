chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "sendPrompt") {
    let [tab] = await chrome.tabs.query({
      url: "https://aistudio.google.com/*"
    });

    if (!tab) {
      tab = await chrome.tabs.create({
        url: "https://aistudio.google.com/app/chat",
        active: false
      });
      await new Promise(r => setTimeout(r, 5000));
    }

    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      func: (prompt) => {
        const trySend = () => {
          const textarea = document.querySelector('textarea[placeholder="Start typing a prompt"]');
          const sendBtn = [...document.querySelectorAll("mat-icon")]
            .find(el => el.textContent.trim() === "arrow_upward_alt");

          if (textarea && sendBtn) {
            textarea.value = prompt;
            textarea.dispatchEvent(new Event("input", {
              bubbles: true
            }));
            sendBtn.click();
            return true;
          }
          return false;
        };

        const maxTries = 10;
        let attempts = 0;
        const interval = setInterval(() => {
          const success = trySend();
          attempts++;
          if (success || attempts >= maxTries) clearInterval(interval);
        }, 1000);
      },
      args: [request.prompt]
    });

    // Wait and extract the response using the working console function logic
    const response = await new Promise((resolve) => {
      let tries = 0;
      const maxTries = 30; // Increased timeout for longer responses
      const interval = setInterval(async () => {
        const [{
          result
        }] = await chrome.scripting.executeScript({
          target: {
            tabId: tab.id
          },
          func: () => {
            // Helper function to format model response (from working console function)
            function formatModelResponse(responseElement) {
              if (!responseElement) return '';
              
              let formattedText = [];
              const contentNodes = Array.from(responseElement.children);

              contentNodes.forEach(node => {
                let blockText = '';
                const tagName = node.tagName.toLowerCase();

                // Handle lists by adding a '*' prefix to each item
                if (tagName === 'ul') {
                  const listItems = Array.from(node.querySelectorAll('li'));
                  blockText = listItems.map(li => `* ${li.innerText.trim()}`).join('\n');
                } 
                // Handle headings
                else if (tagName.match(/^h[1-6]$/)) {
                  blockText = node.innerText.trim();
                }
                // Handle song lyrics or poems that use <br> tags for line breaks
                else if (tagName === 'p' && node.innerHTML.includes('<br>')) {
                  // Replace <br> with newlines, then strip any other HTML tags (like <strong>)
                  blockText = node.innerHTML
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<[^>]+>/g, '')
                    .trim();
                }
                // Handle horizontal rules
                else if (tagName === 'hr') {
                  blockText = '---';
                }
                // Handle standard paragraphs and other block elements
                else {
                  blockText = node.innerText.trim();
                }
                
                if (blockText) {
                  formattedText.push(blockText);
                }
              });

              return formattedText.join('\n\n');
            }

            // Extract the latest model response using the working logic
            const allTurnElements = document.querySelectorAll('ms-chat-turn');
            
            if (allTurnElements.length === 0) {
              return null;
            }

            // Get the last turn element (most recent)
            const lastTurn = allTurnElements[allTurnElements.length - 1];
            
            // Check if this turn contains a model response (not a user prompt)
            const userPromptElement = lastTurn.querySelector('.user-prompt-container');
            if (userPromptElement && userPromptElement.innerText.trim()) {
              // This is a user turn, not a model response
              return null;
            }

            // Look for the model response in the last turn
            const modelResponseElement = lastTurn.querySelector('ms-prompt-chunk:not(:has(ms-thought-chunk)) ms-cmark-node');
            
            if (modelResponseElement && modelResponseElement.innerText.trim()) {
              return formatModelResponse(modelResponseElement);
            }

            return null;
          }
        });

        tries++;
        if (result || tries >= maxTries) {
          clearInterval(interval);
          resolve(result ? {
            status: result
          } : {
            status: "No response found after waiting."
          });
        }
      }, 2000); // Check every 2 seconds
    });

    sendResponse(response);
    return true;
  }
});