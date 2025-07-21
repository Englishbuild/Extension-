document.addEventListener('DOMContentLoaded', function() {
  const promptTextarea = document.getElementById("prompt");
  const sendBtn = document.getElementById("sendBtn");
  const statusDiv = document.getElementById("status");
  const clearBtn = document.getElementById("clearBtn");
  const btnText = document.querySelector(".btn-text");

  // Focus on textarea when popup opens
  promptTextarea.focus();

  // Handle send button click
  sendBtn.addEventListener("click", sendPrompt);

  // Handle Enter key (Ctrl+Enter to send)
  promptTextarea.addEventListener("keydown", function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
      sendPrompt();
    }
  });

  // Handle clear button click
  clearBtn.addEventListener("click", function() {
    statusDiv.textContent = "Ready to send your prompt...";
    statusDiv.className = "";
    promptTextarea.focus();
  });

  // Auto-resize textarea
  promptTextarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
  });

  function sendPrompt() {
    const prompt = promptTextarea.value.trim();
    
    if (!prompt) {
      updateStatus("Please enter a prompt first.", "error");
      promptTextarea.focus();
      return;
    }

    // Set loading state
    setLoadingState(true);
    updateStatus("Sending prompt to Gemini...", "");

    chrome.runtime.sendMessage({
      action: "sendPrompt",
      prompt: prompt
    }, (response) => {
      setLoadingState(false);

      if (chrome.runtime.lastError) {
        updateStatus("Connection Error: " + chrome.runtime.lastError.message, "error");
        return;
      }

      if (!response) {
        updateStatus("No response received from extension.", "error");
        return;
      }

      if (response.status === "success") {
        updateStatus(response.response, "success");
      } else if (response.status === "error") {
        updateStatus("Error: " + response.response, "error");
      } else {
        // Fallback for old response format
        updateStatus(response.status || "Unknown response format.", "error");
      }
    });
  }

  function setLoadingState(loading) {
    if (loading) {
      sendBtn.disabled = true;
      btnText.textContent = "Sending...";
      sendBtn.innerHTML = `
        <span class="btn-text">Sending...</span>
        <div class="loading"></div>
      `;
    } else {
      sendBtn.disabled = false;
      btnText.textContent = "Send to Gemini";
      sendBtn.innerHTML = `
        <span class="btn-text">Send to Gemini</span>
        <span>✨</span>
      `;
    }
  }

  function updateStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    
    // Auto-scroll to bottom of status if it's long
    statusDiv.scrollTop = statusDiv.scrollHeight;
  }

  // Add keyboard shortcut info to placeholder
  promptTextarea.placeholder = "Ask Gemini anything... What would you like to know or discuss today?\n\nTip: Press Ctrl+Enter to send quickly!";
});