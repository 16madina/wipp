// WIPP — service worker Firebase Cloud Messaging.
// La config arrive par la query string passée lors de l'enregistrement
// (un service worker ne peut pas lire import.meta.env).
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
const messaging = firebase.messaging();

// Notification reçue pendant que l'app est fermée ou en arrière-plan.
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  self.registration.showNotification(n.title || "WIPP", {
    body: n.body || "Nouveau message",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: payload.data || {},
  });
});

// Un toucher sur la notification ouvre (ou focalise) l'app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.path) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      return clients.openWindow(path);
    }),
  );
});
