document.getElementById("sendBtn").addEventListener("click", () => {
  const prompt = document.getElementById("prompt").value;
  document.getElementById("status").textContent = "Sending...";
  chrome.runtime.sendMessage({
    action: "sendPrompt",
    prompt
  }, (response) => {
    if (chrome.runtime.lastError) {
      document.getElementById("status").textContent = "Error: " + chrome.runtime.lastError.message;
    } else if (response && response.status) {
      document.getElementById("status").textContent = response.status;
    } else {
      document.getElementById("status").textContent = "No response received.";
    }
  });
});