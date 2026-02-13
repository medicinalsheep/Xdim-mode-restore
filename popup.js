document.addEventListener('DOMContentLoaded', () => {
    const dimToggle = document.getElementById('dimToggle');
    const intensityRow = document.getElementById('intensityRow');
    const intensity = document.getElementById('intensity');
    const intensityValue = document.getElementById('intensityValue');

    if (!dimToggle || !intensity || !intensityValue) return;

    chrome.storage.local.get(['dimEnabled', 'dimIntensity'], (data = {}) => {
        const enabled = data.dimEnabled !== false;
        dimToggle.checked = enabled;
        intensityRow.style.display = enabled ? 'block' : 'none';

        const val = typeof data.dimIntensity === 'number' ? data.dimIntensity : 60;
        intensity.value = val;
        intensityValue.textContent = val;
    });

    dimToggle.addEventListener('change', () => {
        const enabled = dimToggle.checked;
        chrome.storage.local.set({ dimEnabled: enabled });
        intensityRow.style.display = enabled ? 'block' : 'none';
        notify();
    });

    intensity.addEventListener('input', () => {
        const val = parseInt(intensity.value, 10);
        intensityValue.textContent = val;
        chrome.storage.local.set({ dimIntensity: val });
        notify();
    });

    function notify() {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "refreshDim" });
            }
        });
    }
});