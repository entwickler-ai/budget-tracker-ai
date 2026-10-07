# BudgetTrackerAi – Entwicklungsumgebung & Startanleitung

#### Willkommen zur Entwicklungsumgebung von **BudgetTrackerAi**! Diese Anleitung hilft Ihnen, das Projekt lokal einzurichten und erfolgreich zu starten.

---

## Entwicklungsumgebung

#### Verwenden Sie **Visual Studio Code (VSCode)** als Code-Editor.

---

## Wichtige Plugins & Erweiterungen (für VSCode)

https://code.visualstudio.com/download

#### Installiere die folgenden Erweiterungen/Plugins, um die Entwicklung effizienter zu gestalten:

- **JavaScript and TypeScript**
- **React Native Tools**

---
## Installieren um brew nutzen Command nutzen zu können

https://brew.sh


## Laufzeitumgebung

#### Das Projekt basiert auf JavaScript/TypeScript und benötigt **Node.js**:

```bash
 brew install node
```

## App auf Smartphone testen

1. Lade dir Expo Go aus dem App Store (iOS) oder Google Play Store (Android) herunter.
2. Stelle sicher, dass sich dein Smartphone und dein Entwicklungsrechner im gleichen WLAN befinden.

#### Backend & BudgetTrackerAi Dependencies Installieren:

- „Bitte führe den folgenden Befehl einmal im backend-Verzeichnis und einmal im BudgetTrackerAi-Verzeichnis aus!
```bash
 npm install
```

## Projekt starten

#### Backend starten:
```bash
 npm start
```

#### Mobile App (BudgetTrackerAi) .env datei mit ```EXPO_PUBLIC_API_URL=http://192.168.0.122:3000```  durch Ihr eigene Rechner: ip-address ersetzen.

## Rechner ip-addresse herausfinden:

```bash
 ipconfig getifaddr en0
```

## Mobile App (BudgetTrackerAi) starten

#### BudgetTrackerAi starten:
```bash
 npx expo start
```

#### Ein QR-Code erscheint im Terminal. 

## QR-Code scannen & loslegen ODER taste (w) drücken im webbrowser zu testen!
#### Scanne den angezeigten QR-Code mit der Kamera-App deines Smartphones und genieße dein Erlebnis mit BudgetTrackerAi!


#### Anmelde Daten mit Admin Rechte
- E-Mail: admin@fh.de
- Password: adminfh

#### Anmelde Daten ohne Admin Rechte
- E-Mail: test@fh.de
- Password: testfh

## BudgetTrackerAi online erreichbar über folgenden link:

- Achtung: Viele Design sind über Firebase Hosting unkompatible daher wird empfohlen lokal zu testen:

https://budgettrackerai-7d3d3.web.app