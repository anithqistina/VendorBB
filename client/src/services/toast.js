/**
 * Dispatches a global toast notification.
 * @param {string} message The alert body message
 * @param {'success'|'danger'|'warning'|'info'} type The alert type
 * @param {string} [title] Optional custom header title
 */
export const showToast = (message, type = "success", title = "") => {
  let icon = "check-circle-fill";
  let alertType = type;

  if (type === "error" || type === "danger") {
    alertType = "danger";
    icon = "exclamation-triangle-fill";
  } else if (type === "warning") {
    icon = "exclamation-circle-fill";
  } else if (type === "info") {
    icon = "info-circle-fill";
  }

  if (!title) {
    title = alertType === "danger" ? "Error" : alertType.charAt(0).toUpperCase() + alertType.slice(1);
  }

  window.dispatchEvent(
    new CustomEvent("show-toast", {
      detail: { message, type: alertType, icon, title },
    })
  );
};
