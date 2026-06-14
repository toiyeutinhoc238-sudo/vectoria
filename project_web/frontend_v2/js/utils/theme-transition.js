// Shared theme transition handler: show sun/moon animation on theme change
document.addEventListener("DOMContentLoaded", () => {
  console.debug("[theme-transition] DOMContentLoaded");
  const themeToggle = document.getElementById("themeToggle");
  const sunIcon = document.getElementById("sunIcon");
  const moonIcon = document.getElementById("moonIcon");
  const transitionIcons = document.querySelector(".theme-transition-icons");

  function updateIcons(isDark) {
    if (!sunIcon || !moonIcon) return;
    if (isDark) {
      sunIcon.style.display = "none";
      moonIcon.style.display = "block";
    } else {
      sunIcon.style.display = "block";
      moonIcon.style.display = "none";
    }
  }

  // Set initial state
  try {
    if (typeof ThemeManager !== "undefined") {
      const isDark = ThemeManager.isDarkMode();
      console.debug("[theme-transition] initial isDark=", isDark);
      updateIcons(isDark);
    }
  } catch (e) {
    console.error("[theme-transition] init error", e);
  }

  function playTransition(isDark) {
    if (!transitionIcons) return;
    transitionIcons.classList.remove("animate-rise-fade");
    void transitionIcons.offsetWidth; // force reflow
    updateIcons(isDark);
    transitionIcons.classList.add("animate-rise-fade");
  }

  if (themeToggle) {
    console.debug("[theme-transition] themeToggle found");
    // sync checkbox
    try {
      themeToggle.checked = ThemeManager.isDarkMode();
    } catch (e) {}

    themeToggle.addEventListener("change", () => {
      console.debug("[theme-transition] toggle change");
      const isDark =
        typeof ThemeManager !== "undefined" ? ThemeManager.toggle() : false;
      try {
        ThemeManager.applyTheme(isDark);
      } catch (e) {
        console.error("[theme-transition] applyTheme error", e);
      }
      themeToggle.checked = isDark;
      playTransition(isDark);
    });
  }

  // Listen to storage events (other tabs)
  window.addEventListener("storage", (e) => {
    if (
      e.key &&
      typeof ThemeManager !== "undefined" &&
      e.key === ThemeManager.STORAGE_KEY
    ) {
      const isDark = ThemeManager.isDarkMode();
      if (themeToggle) themeToggle.checked = isDark;
      try {
        ThemeManager.applyTheme(isDark);
      } catch (err) {}
      playTransition(isDark);
    }
  });
});
