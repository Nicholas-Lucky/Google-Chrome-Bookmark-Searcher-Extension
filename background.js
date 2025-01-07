// When the extension is installed, set the default theme to sky
chrome.runtime.onInstalled.addListener(async function() {
    // Mainly for testing in the DevTools console
    console.log("Bookmark Searcher Extension Installed!");

    chrome.storage.local.set({currentTheme: "sky"});
    chrome.storage.local.set({themeIndex: 0});

    // Mainly for testing in the DevTools console
    let currentTheme = await chrome.storage.local.get(["currentTheme"]);
    let themeIndex = await chrome.storage.local.get(["themeIndex"]);

    console.log(`\tDefault currentTheme: ${currentTheme.currentTheme}`);
    console.log(`\tDefault themeIndex: ${themeIndex.themeIndex}`);
});
