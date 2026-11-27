// Drumsheet inside the Drumhof teacher page (drumhof.com/huiswerk/leraar.html, "✏️ Drumsheet" tab):
// after every change, pass the current groove link to that page so it can add the groove to a
// student's homework with one button. Only runs when Drumsheet is shown inside another page, and
// only ever sends to the origins below (postMessage with another target origin delivers nothing).
const HOSTS = ['https://drumhof.com', 'http://localhost:8778'];

function send() {
  const msg = { type: 'drumsheet-groove', url: location.href, title: document.title };
  for (const origin of HOSTS) window.parent.postMessage(msg, origin);
}

if (window.parent !== window) {
  // the editor updates the address (history.replaceState) after every change to the groove
  const replace = history.replaceState.bind(history);
  history.replaceState = function (...args) {
    const result = replace(...args);
    send();
    return result;
  };
  window.addEventListener('message', (e) => {
    if (HOSTS.includes(e.origin) && e.data && e.data.type === 'drumsheet-get') send();
  });
  window.addEventListener('load', send);
}
