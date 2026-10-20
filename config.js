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
//   contactEmail: "gravitystudio.pre@gmail.com"
// };
/* ============================================================================
   Gravity site settings - the only file you need to edit to switch things on.
   ============================================================================ */
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB5svOa22ZFa0excZiDiCVc1m3APzURpug",
  authDomain: "gravity-studios-a41ab.firebaseapp.com",
  projectId: "gravity-studios-a41ab",
  storageBucket: "gravity-studios-a41ab.firebasestorage.app",
  messagingSenderId: "600784508217",
  appId: "1:600784508217:web:1b07786a508d03833dc4e8",
  measurementId: "G-5RXQ8QBCG4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);