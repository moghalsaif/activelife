(function () {
  "use strict";

  const alert = document.getElementById("app-alert");
  const reload = document.getElementById("app-reload-button");
  if (reload) reload.addEventListener("click", () => window.location.reload());

  function reportRuntimeError() {
    if (!alert) return;
    alert.hidden = false;
  }

  window.PATHWAY_REPORT_ERROR = reportRuntimeError;
  window.addEventListener("error", reportRuntimeError);
  window.addEventListener("unhandledrejection", reportRuntimeError);
})();
