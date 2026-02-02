# EAS Build Walkthrough – Install Paire on Your iPhone (Free Apple ID)

Use EAS (Expo Application Services) to build your app and install it on your iPhone **without** paying the $99/year Apple Developer Program. The build uses a **free Apple ID** and runs on your device for **7 days** before you need to reinstall.

---

## Prerequisites

- **Expo account** (free) at [expo.dev](https://expo.dev)
- **Apple ID** (free) at [appleid.apple.com](https://appleid.apple.com)
- **iPhone** with a cable or on the same Wi‑Fi as your computer (for installing the build)
- **Node.js** and your project set up (you already have this)

---

## Step 1: Create an Expo account (if you don’t have one)

1. Go to [expo.dev/signup](https://expo.dev/signup).
2. Sign up with email or GitHub.
3. Confirm your email if asked.

---

## Step 2: Install EAS CLI

In a terminal (PowerShell, Command Prompt, or Terminal):

```bash
npm install -g eas-cli
```

Check it’s installed:

```bash
eas --version
```

---

## Step 3: Log in to EAS

From your project folder (e.g. `You-me-Expenses/mobile-app`):

```bash
cd path/to/You-me-Expenses/mobile-app
eas login
```

Enter your Expo email and password. You should see “Logged in as …”.

---

## Step 4: Configure the project for EAS (first time only)

Your project already has an `eas.json` file. Link it to your Expo account:

```bash
eas build:configure
```

- If asked “Would you like to create a new project?”, choose **Yes**.
- EAS will create/link the project on expo.dev and use your `app.json` / `eas.json`.

---

## Step 5: Build for iOS (your iPhone)

Use the **preview** profile so you can install on a real device with a free Apple ID (no paid developer account):

```bash
eas build --platform ios --profile preview
```

What happens next:

1. **“Generate a new Apple Distribution Certificate?”**  
   - Choose **Yes** (EAS will create one for you).

2. **“Log in to your Apple account”**  
   - Use your **free** Apple ID (the one you use for iCloud, App Store, etc.).  
   - You do **not** need a paid Apple Developer account.

3. **“Select a team”**  
   - Pick the team that matches your Apple ID (often “Personal Team” or your name).  
   - If you see “Your Apple Developer Program membership has expired” or similar, you can ignore it for this flow; the free account is enough for internal/preview builds.

4. **“Register your device?”**  
   - If EAS asks to register your iPhone, choose **Yes** and follow the prompts (you may need to enter your device name or UDID; EAS can sometimes detect it).

5. The build then runs in the cloud (5–15 minutes). You’ll get a link to the build page.

---

## Step 6: Install the build on your iPhone

When the build finishes:

1. On the build page (expo.dev), you’ll see a **QR code** and a **Install** link.
2. **On your iPhone:**  
   - Open the **Camera** app and scan the QR code, **or**  
   - Open the **Install** link in Safari.
3. Tap **Install** and confirm. The app will download and appear on your home screen.
4. First launch: you may need to go to **Settings → General → VPN & Device Management**, tap your Apple ID under “Developer App”, and choose **Trust**.

---

## Step 7: Run the app

- Tap the **Paire** icon. The app will open like a normal app.
- It will **expire after 7 days** (free Apple ID limitation). When it stops opening, run the same build command again and reinstall from the new build link:

```bash
eas build --platform ios --profile preview
```

Then install the new build on your iPhone as in Step 6.

---

## Useful commands

| Command | Purpose |
|--------|--------|
| `eas build --platform ios --profile preview` | Build for your iPhone (install via link/QR). |
| `eas build:list` | List your recent builds and get install links. |
| `eas whoami` | See which Expo account you’re logged in as. |
| `eas logout` | Log out of EAS. |

---

## If something goes wrong

- **“No valid code signing certificate”**  
  Run the build again and choose “Yes” when EAS asks to create a new Apple Distribution Certificate; use your free Apple ID when prompted.

- **“Device not registered”**  
  When EAS asks to register your device, say Yes and follow the steps. You can also register it at [expo.dev](https://expo.dev) → your project → **Devices**.

- **App won’t open after install**  
  On iPhone: **Settings → General → VPN & Device Management** → select your Apple ID → **Trust**.

- **Build fails**  
  Check the build log on the expo.dev build page; it usually points to a missing config or dependency. Your `app.json` and `eas.json` are already set for a standard Expo app.

---

## Summary

1. **Expo account** → [expo.dev/signup](https://expo.dev/signup)  
2. **Install EAS** → `npm install -g eas-cli`  
3. **Log in** → `eas login`  
4. **Configure** → `eas build:configure` (first time)  
5. **Build** → `eas build --platform ios --profile preview`  
6. **Install** → Scan QR or open link on iPhone, then Trust in Settings if needed  
7. **Reinstall every 7 days** by running the same build command and installing the new build.

You now have Paire as a real app on your iPhone without paying the Apple Developer fee.
