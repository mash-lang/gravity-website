// /* =========================================================================
//    Gravity site settings — the only file you need to edit to switch things on.
//    ========================================================================= */
// window.GRAVITY_CONFIG = {

//   /* 1) Firebase — powers the admin dashboard, live projects/team, and the orders inbox.
//         Paste the config object from Firebase console → Project settings → Your apps → Web app.
//         Leave apiKey empty and the site shows the built-in content from js/content.js. */
//   firebase: {
//     apiKey: "",
//     authDomain: "",
//     projectId: "",
//     storageBucket: "",
//     messagingSenderId: "",
//     appId: ""
//   },

//   /* 2) Optional: a Formspree form URL (https://formspree.io) so every order is also emailed to you,
//         e.g. "https://formspree.io/f/abcdwxyz". */
//   formEndpoint: "",

//   /* 3) Shown to visitors if an order can’t be sent. */
//   contactEmail: "hello@gravity.studio"
// };
/* ============================================================================
   Gravity site settings - the only file you need to edit to switch things on.
   ============================================================================ */
window.GRAVITY_CONFIG = {

  /* 1) Firebase - powers the admin dashboard, live projects/team, and the orders inbox.
        Paste the config object from Firebase console -> Project settings -> Your apps -> Web app.
        Leave apiKey empty and the site shows the built-in content from js/content.js. */
  firebase: {
    apiKey: "",
    authDomain: "gravity-studios-a41ab.firebaseapp.com",
    projectId: "gravity-studios-a41ab",
    storageBucket: "gravity-studios-a41ab.firebasestorage.app",
    messagingSenderId: "600784508217",
    appId: "1:600784508217:web:1b07786a508d03833dc4e8"
  },

  /* 2) Optional: a Formspree form URL (https://formspree.io) so every order is also emailed to you,
        e.g. "https://formspree.io/f/abcdwxyz". */
  formEndpoint: "",

  /* 3) Shown to visitors if an order can't be sent. */
  contactEmail: "hello@gravity.studio"
};
