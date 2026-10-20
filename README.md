# Gravity website

Static website for Gravity: graphic design, video editing and broadcasting.
Works on GitHub Pages. The admin dashboard runs on Firebase (free Spark plan).

## Files

| File | What it is |
|---|---|
| `index.html` | Home page |
| `services.html` | Services |
| `work.html` | Previous projects |
| `team.html` | Team |
| `contact.html` | Place an order / send a message |
| `admin.html` | Admin dashboard (not linked from the site) |
| `css/styles.css` | Styles for every page |
| `css/admin.css` | Extra styles for the dashboard |
| `js/config.js` | **Your settings** (Firebase, Formspree, contact email) |
| `js/content.js` | Built-in projects and team, used until Firebase is connected |
| `js/store.js` | Loads content and sends orders |
| `js/site.js` | Navigation, motion, projects, team, forms |
| `js/hero.js` | Home page 3D logo and orbit animation |
| `js/admin.js` | Dashboard logic |
| `firestore.rules` | Database security rules to paste into Firebase |

## 1. Publish on GitHub Pages

1. Create a public repository, e.g. `gravity-website`.
2. Upload **everything in this folder** (keep the `css`, `js` and `images` folders).
3. Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.
4. Your site appears at `https://YOUR-USERNAME.github.io/gravity-website/`.

The site works straight away with the built-in content. Steps 2–5 switch on the admin dashboard.

## 2. Create a Firebase project

1. Go to https://console.firebase.google.com → **Add project** (Google Analytics is optional).
2. On the project overview, click the **Web** icon (`</>`), give it a name, and register the app.
3. Copy the `firebaseConfig` values into `js/config.js` (apiKey, authDomain, projectId, and the rest).

## 3. Turn on sign-in and create the admin account

1. Build → **Authentication** → Get started → **Email/Password** → Enable → Save.
2. Authentication → **Users** → **Add user**: enter the admin email and a strong password.
3. Authentication → **Settings** → **Authorized domains** → add `YOUR-USERNAME.github.io`
   (and your own domain later, if you use one).
4. Optional but recommended: Authentication → Settings → **User actions** → turn off *Enable create (sign-up)*,
   so nobody else can create accounts.

## 4. Create the database and paste the rules

1. Build → **Firestore Database** → Create database → pick a location near your customers → *Start in production mode*.
2. Open the **Rules** tab, replace everything with the contents of `firestore.rules`.
3. Change `admin@yourdomain.com` to the admin email from step 3, then click **Publish**.

## 5. Use the dashboard

1. Upload the updated `js/config.js` to GitHub.
2. Open `https://YOUR-USERNAME.github.io/gravity-website/admin.html` and sign in. Bookmark it.
3. Projects and Team start empty. Click **Add the 9 sample projects** / **Add the 5 sample members**
   to start from the current content, or add your own.

From the dashboard you can add, edit, delete and reorder projects and team members (with images and video links),
read orders and messages, mark them done, and change your password.

## Optional: get orders by email too

Create a free form at https://formspree.io and paste its URL into `formEndpoint` in `js/config.js`.
Orders then go to your inbox as well as the dashboard.

## Is the admin page secure?

`admin.html` isn’t linked anywhere and asks search engines not to list it, but the real protection is Firebase:
only the email(s) in `firestore.rules` can change content or read orders, whoever opens the page.
The Firebase `apiKey` in `config.js` is meant to be public; it identifies your project, it doesn’t grant access.

## Previewing on your computer

Open the folder with a local server (for example `python3 -m http.server`) and visit `http://localhost:8000`.
Double-clicking the HTML files also works for the public pages; sign-in needs a real web address.
