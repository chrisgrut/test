# Dunkelkammer

Ein Nachbau der Lightroom-App (Cloud-Version, Desktop und Handy) für den Browser. Aufbau, Bedienung und deutsche Bezeichnungen folgen den aktuellen Lightroom-Screenshots. Name und Logo sind bewusst eigene.

Die App ist eine einzige HTML-Datei ohne Abhängigkeiten. Die Bildverarbeitung läuft komplett auf der Grafikkarte (WebGL2), Fotos und Bearbeitungen bleiben im Browser (IndexedDB).

## Starten

`lightroom/index.html` im Browser öffnen. Beim ersten Start entstehen fünf Beispielfotos. Eigene Fotos kommen über „Fotos hinzufügen“, per Drag & Drop oder mit Strg+V dazu.

## Aufbau wie in Lightroom

- **Top-Bar:** Suche über Dateiname, Titel, Stichwörter, Kamera und Datum; Filter; Rückgängig/Wiederholen; Exportieren.
- **Meine Fotos (links):** Alle Fotos, Zuletzt hinzugefügt, Zuletzt bearbeitet, Markiert, Alben (anlegen, umbenennen, Fotos per Drag & Drop hinzufügen).
- **Mitte:** Fotoraster (Blocksatz, nach Monat gruppiert), Quadratisches Raster, Detailansicht mit Filmstreifen.
- **Bottom-Bar:** Ansichten, Sortieren, Sterne, Markieren/Ablehnen, Einstellungen kopieren, Zoom (Einpassen, Ausfüllen, 25–400 %), Filmstreifen, Vorher/Nachher.
- **Werkzeugleiste (rechts):** Presets, Bearbeiten, Zuschneiden, Entfernen, Maskieren, Versionen, Weitere Optionen, Stichwörter, Informationen.
- **Handy:** Werkzeugleiste unten (Presets, Zuschn., Bearb., Maskieren, Entfernen), Sektionsleiste und Regler-Sheet mit „Fertig“, langes Drücken zeigt das Original.

## Funktionen

**Bearbeiten**
- Histogramm mit Beschneidungsanzeige; Schwarz, Tiefen, Belichtung, Lichter und Weiß lassen sich direkt im Histogramm ziehen
- Auto, S/W, Profile mit Profil-Browser und Live-Vorschau (Standard, Kinematisch, Vintage, Modern, Künstlerisch, Schwarzweiß) samt Stärke-Regler
- Licht: Belichtung, Kontrast, Lichter, Tiefen, Weiß, Schwarz, Punktkurve (RGB, Rot, Grün, Blau) und parametrische Kurve
- Farbe: Weißabgleich (Wie Aufnahme, Automatisch, Pipette), Temperatur, Tonung, Dynamik, Sättigung, Farbmischer (8 Farben, Ziel-Korrektur im Bild), Punktfarbe, Color-Grading (3-Wege und Einzelräder, Überblendung, Abgleich)
- Effekte: Struktur, Klarheit, Dunst entfernen, Vignette (Mittelpunkt, Weiche Kante, Rundheit, Lichter), Körnung
- Detail: Schärfen (Radius, Details, Maskieren), Rauschreduzierung, Farbrauschen
- Optik: Chromatische Aberration entfernen, manuelle Verzerrung und Vignettierung, Rand entfernen (Violett/Grün)
- Augen-Schalter pro Bereich, Doppelklick setzt Regler zurück, Werte direkt eintippbar

**Zuschneiden & Geometrie**
- Seitenverhältnisse, Sperren, Ausrichtung tauschen, Begradigen mit AUTO, Drehen durch Ziehen außerhalb des Rahmens
- Überlagerungen: Drittelregel, Raster, Diagonal, Dreieck, Goldener Schnitt, Goldene Spirale
- Drehen und Spiegeln, Upright (Auto, Ausgleichen, Vertikal, Vollständig) per Linienerkennung, Transformieren (Verzerrung, Vertikal, Horizontal, Drehen, Aspekt, Skalieren, Versatz), Zuschnitt beschränken

**Entfernen**
- Entfernen mit automatischer Quellsuche, Reparieren (Randangleich), Klonen, Rote Augen
- Größe, Weiche Kante, Deckkraft, Quelle verschiebbar, „Bereiche anzeigen“ für Staub und Flecken

**Maskieren**
- Himmel (Farb- und Kantenanalyse), Pinsel mit Automatisch maskieren und Radiergummi, Linearer und Radialer Verlauf, Farbbereich, Luminanzbereich
- Hinzufügen, Subtrahieren, Schnittmenge, Umkehren, Duplizieren, Umbenennen, Ausblenden
- Schwebende Maskenliste mit Miniaturen, rote Überlagerung (Farbe und Deckkraft wählbar), Schwarzweiß-Ansicht der Maske
- Lokale Regler: Licht, Farbe (inkl. Farbton und Färben), Effekte, Detail, Betrag, Masken-Presets

**Bibliothek & Ablauf**
- Presets: Empfohlen mit Vorschaubildern und Filtern, Sammlung nach Gruppen, eigene Presets, Stärke-Regler
- Versionen (benannt) und automatischer Verlauf mit Vorschau beim Überfahren
- Informationen (EXIF, Titel, Bildunterschrift, Copyright, Dateiname, GPS-Link) und Stichwörter mit Vorschlägen
- Einstellungen kopieren/einfügen, auch auswählbar nach Bereichen und auf mehrere Fotos
- Vorher/Nachher: Original, geteilt links/rechts oder oben/unten (Trenner ziehbar), nebeneinander, übereinander
- Export als JPG, PNG oder WebP, volle Größe oder lange Kante, auch mehrere Fotos

## Bildverarbeitung

Die Regler orientieren sich an veröffentlichten Messungen von Camera Raw und an Open-Source-Nachbauten (u. a. RAWmakase, RapidRAW, darktable):

- Lichter, Tiefen und Klarheit arbeiten mit einem kantenerhaltenden Guided Filter auf der Log-Luminanz (keine Halos).
- Weiß, Schwarz, Kontrast (mit bildabhängigem Drehpunkt) und die Kurven werden zu einer farbtonerhaltenden Tonkurve zusammengefasst.
- Dunst entfernen nutzt den Dark-Channel-Prior, Sättigung und Dynamik die gemessenen Lightroom-Faktoren mit Hautschutz.
- Masken werden pro Pixel ausgewertet; lokale Regler addieren sich zu den globalen Werten.

## Entwicklung

Der Quellcode liegt in `lightroom/src/`. Nach Änderungen die Datei neu bauen:

```
node lightroom/build.mjs
```

| Datei | Inhalt |
| --- | --- |
| `core.js` | Datenmodell, Geometrie, Kurven, Profile, Speicher, EXIF |
| `shaders.js`, `renderer.js` | WebGL2-Pipeline |
| `analysis.js` | Guided Filter, Himmel, Upright, Quellsuche, Pinselmasken |
| `state.js`, `library.js` | Katalog, Verlauf, Raster, Alben, Export |
| `view.js`, `panels.js`, `tools.js`, `app.js` | Oberfläche, Bedienfelder, Werkzeuge, Tastatur |

## Tastaturbefehle

G Fotoraster · Umschalt+G Quadratraster · D Detail · E Bearbeiten · C Zuschneiden · H Entfernen · M Maskieren · B/L/R Pinsel/Linear/Radial · W Pipette · Umschalt+A Auto · V Schwarzweiß · \ Original · Y Geteilt · Leertaste Zoom · J Beschneidung · O Maskenüberlagerung · [ ] Pinselgröße · 0–5 Sterne · Z/X/U Markieren/Ablehnen/Aufheben · Strg+Z Rückgängig · Strg+C/V Einstellungen kopieren/einfügen · Umschalt+E Exportieren · ? alle Befehle

## Nicht enthalten

Diese Lightroom-Funktionen brauchen KI-Modelle oder Adobe-Dienste und fehlen deshalb: Motiv-, Hintergrund-, Objekt-, Personen- und Landschaftsmasken, generatives Entfernen, KI-Entrauschen, Objektivunschärfe, HDR-Bearbeitung, Objektivprofil-Datenbank sowie Cloud-Synchronisation und Freigaben. RAW- und HEIC-Dateien kann der Browser nicht öffnen; sie müssen vorher in JPEG umgewandelt werden. Die Bearbeitung erfolgt mit höchstens 6144 px an der langen Kante (4096 px auf Touch-Geräten).
