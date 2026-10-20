/* =========================================================================
   Gravity site settings — the only file you need to edit to switch things on.
   ========================================================================= */
window.GRAVITY_CONFIG = {

  /* 1) Firebase — powers the admin dashboard, live projects/team, and the orders inbox.
        Paste the config object from Firebase console → Project settings → Your apps → Web app.
        Leave apiKey empty and the site shows the built-in content from js/content.js. */
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  /* 2) Optional: a Formspree form URL (https://formspree.io) so every order is also emailed to you,
        e.g. "https://formspree.io/f/abcdwxyz". */
  formEndpoint: "",

  /* 3) Shown to visitors if an order can’t be sent. */
  contactEmail: "hello@gravity.studio"
};
