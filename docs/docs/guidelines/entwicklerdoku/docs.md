---
sidebar_position: 20
---

# Docs
Für die Dokumentation verwenden wir Docusaurus. Docusaurus ist ein Open-Source-Projekt, das es Entwicklern ermöglicht, Dokumentationen für ihre Projekte zu erstellen und zu veröffentlichen. Es bietet eine einfache Möglichkeit, Dokumentationen in Markdown zu schreiben und sie in eine ansprechende Website umzuwandeln.
Docusaurus unterstützt auch die Integration von React-Komponenten, was es Entwicklern ermöglicht, interaktive Elemente in ihre Dokumentationen einzufügen. Es bietet eine Vielzahl von Funktionen wie Versionierung, mehrsprachige Unterstützung und eine benutzerfreundliche Oberfläche für die Navigation durch die Dokumentation.

## Neue Seite erstellen
Um eine neue Seite in Docusaurus zu erstellen, kann man einfach eine neue Markdown-Datei im `docs`-Verzeichnis erstellen. Die Datei sollte mit `.md` enden und den Inhalt der Seite enthalten. Docusaurus wird automatisch die Navigation und das Layout für die neue Seite generieren.
Die Struktur der Markdown-Datei sollte wie folgt aussehen:

```markdown
---
sidebar_position: 1
title: My New Page
description: This is a description of my new page.
---
# My New Page
Hier ist der Inhalt meiner neuen Seite.
```
Die `sidebar_position` gibt an, wo die Seite in der Seitenleiste angezeigt werden soll. Je niedriger die Zahl, desto weiter oben wird die Seite angezeigt. Der `title` ist der Titel der Seite, der in der Navigation angezeigt wird. Die `description` ist eine kurze Beschreibung der Seite, die in den Metadaten angezeigt wird.
