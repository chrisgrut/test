# Dunkelkammer

Eine Lightroom-artige Fotoentwicklung, die komplett im Browser läuft. Sie besteht aus einer einzigen Datei (`index.html`) ohne Build-Schritt und ohne Abhängigkeiten. Die Bildverarbeitung läuft über WebGL2 auf der Grafikkarte.

## Starten

`lightroom/index.html` direkt im Browser öffnen. Alternativ im Projekt `npm run dev` starten und `http://localhost:5173/lightroom/` aufrufen.

Beim ersten Start werden vier Beispielfotos erzeugt. Eigene Fotos kommen über **Importieren**, per Drag & Drop oder mit Strg+V dazu. Der Katalog bleibt im Browser (IndexedDB) gespeichert.

## Funktionen

**Bibliothek**
- Raster mit Miniaturen, Filmstreifen, Mehrfachauswahl mit Strg/⇧-Klick
- Bewertungen (0–5), Markieren / Ablehnen, Filter nach Markierung, Bewertung und Dateiname
- Sortierung nach Import- oder Aufnahmezeit, Dateiname, Bewertung
- Metadaten inklusive EXIF (Kamera, Objektiv, ISO, Blende, Belichtungszeit, Brennweite)
- Ad-hoc-Entwicklung für mehrere Fotos gleichzeitig

**Entwickeln**
- Histogramm mit Beschneidungsanzeige; Bereiche lassen sich direkt mit der Maus ziehen
- Grundeinstellungen: Weißabgleich (Wie Aufnahme, Automatisch, Pipette), Temperatur, Tönung, Belichtung, Kontrast, Lichter, Tiefen, Weiß, Schwarz, Struktur, Klarheit, Dunst entfernen, Dynamik, Sättigung
- Gradationskurve (RGB und Einzelkanäle) mit monotoner Interpolation
- Farbmischer (Farbton, Sättigung, Luminanz für acht Farbbereiche) und Schwarzweiß-Mischung
- Color Grading mit Farbrädern für Tiefen, Mitteltöne, Lichter und Global
- Details: Schärfen, Luminanz- und Farbrauschreduzierung
- Effekte: Vignettierung nach Freistellen, Körnung
- Freistellen & Ausrichten: Seitenverhältnisse, freie Drehung (auch durch Ziehen außerhalb des Rahmens), 90°-Drehung, Spiegeln, automatisches Einpassen ins Bild
- Vorher / Nachher, geteilte Ansicht, Zoom 100 % mit Navigator, RGB-Werte unter dem Mauszeiger
- Vorgaben mit Live-Vorschau beim Überfahren, eigene Vorgaben speichern
- Verlauf mit Rückgängig / Wiederholen, Einstellungen kopieren und einfügen
- Export als JPEG, PNG oder WebP in voller Größe oder mit Wunschkante

## Tastaturkürzel

| Taste | Aktion |
| --- | --- |
| G / D | Bibliothek / Entwickeln |
| R | Freistellen & Ausrichten |
| W | Weißabgleich-Pipette |
| \ / Y | Vorher / geteilte Ansicht |
| Z oder Leertaste | Zoom 100 % / Einpassen |
| J | Beschneidung anzeigen |
| 0–5, P, X, U | Bewerten, Markieren, Ablehnen, Markierung aufheben |
| ← → | Vorheriges / nächstes Foto |
| Strg+Z / Strg+⇧+Z | Rückgängig / Wiederholen |
| Strg+C / Strg+V | Einstellungen kopieren / einfügen |
| Strg+E | Exportieren |
| Tab | Seitenpaletten ein/aus |
| ? | Alle Kürzel anzeigen |

## Grenzen

- RAW- und HEIC-Dateien kann der Browser nicht öffnen. Diese bitte vorher in JPEG umwandeln.
- Bearbeitet wird mit maximal 6144 px an der langen Kante (4096 px auf Touch-Geräten). Größere Fotos werden beim Laden verkleinert.
- Die Regler sind eigene Näherungen an Lightroom und kein Nachbau von Adobes Algorithmen.
