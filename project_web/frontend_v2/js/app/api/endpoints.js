(function () {
  window.App = window.App || {};

  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    App.API_BASE = "http://127.0.0.1:5000";
  } else {
    App.API_BASE = "https://vectoria-3fdh.onrender.com";
  }
})();
