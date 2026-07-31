// Service worker: riceve le web push e apre l'app al tocco.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const dati = event.data.json();
  event.waitUntil(
    self.registration.showNotification(dati.title, {
      body: dati.body,
      icon: "/icons/icona-192.png",
      badge: "/icons/icona-192.png",
      data: { url: dati.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((finestre) => {
      for (const finestra of finestre) {
        if ("focus" in finestra) {
          finestra.navigate(url);
          return finestra.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
