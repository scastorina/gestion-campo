importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAsjMYndgto8apKjasCtD7Hsblw5f6DV8c",
  authDomain: "stock-pomco.firebaseapp.com",
  projectId: "stock-pomco",
  messagingSenderId: "414907870481",
  appId: "1:414907870481:web:44e87ec74ffb8ad86cb0b0",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(
    payload.notification.title,
    { body: payload.notification.body }
  );
});
