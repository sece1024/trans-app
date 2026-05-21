/**
 * Copy text to clipboard with fallback for non-secure contexts (LAN IP access).
 * navigator.clipboard.writeText() requires HTTPS or localhost;
 * on plain HTTP we fall back to execCommand('copy').
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}
