**Konzept: Dokumentenmanagementsystem (DMS)**

## Kernidee

Ein zentrales System (Modul) zur Verwaltung von Dokumenten, die in logischen Gruppen, sogenannten "Collections", organisiert sind. Ziel ist es, Dokumente effizient zu erfassen, automatisch zu analysieren, korrekt zuzuordnen und ihre Qualität durch definierte Prozesse, menschliche Überprüfungen und Validierungen sicherzustellen. Künstliche Intelligenz (KI, mittels LLMs) unterstützt maßgeblich bei der Klassifizierung und Extraktion von Informationen. Jeder KI-Schritt wird durch menschliche Überprüfung und Korrektur bestätigt, bevor der nächste Prozessschritt angestoßen wird.

## Hauptkonzepte und Informationen

1.  **Collections**

    - Dienen als thematische oder kontextbezogene Behälter (z.B. pro Projekt, Kunde, Mitarbeiterakte).
    - **Können hierarchisch aufgebaut sein:** Eine Collection kann einer **übergeordneten Collection** zugeordnet werden, um Strukturen abzubilden (z.B. kann die Collection einer Person Unter-Collections wie 'Einkommen', 'Versicherungen' beinhalten, die alle der Haupt-Collection 'Person X' untergeordnet sind).
    - Bilden den Rahmen für spezifische Dokumentenanforderungen und Validierungsregeln.
    - Metadaten (z.B. Name) können hinterlegt oder aus der umgebenden Applikation bezogen werden.

2.  **Dokumente**

    - Repräsentieren eine Informationseinheit, basierend auf einer Datei (z.B. PDF, Bild).
    - Enthalten KI-extraierte und manuell geprüfte/korrigierte Metadaten (Titel, Datum, Zusammenfassung, Tags).
    - Werden einer **Dokumentenart** (z.B. "Rechnung", "Vertrag") zugeordnet (Klassifizierung), die in **Kategorien** (z.B. "Finanzen", "Recht") gruppiert ist.
    - Speichern strukturierte **Eigenschaften** (z.B. Rechnungsnummer, Vertragsbeginn), definiert durch die Dokumentenart.
    - Sind einer oder mehreren Collections zugeordnet.
    - Besitzen einen **Genehmigungsstatus** (z.B. "In Analyse", "Wartet auf Prüfung", "Genehmigt"). Nach finaler Genehmigung ("Approved") ist das Dokument **unveränderlich**. Notwendige Änderungen erfordern das Archivieren des alten und Hochladen eines neuen Dokuments.
    - Können direkt zur Erfüllung einer offenen **Dokumentenanforderung** dienen.

**3. Dokument-Collection-Zuordnung**

Die Verknüpfung eines Dokuments mit einer oder mehreren Collections ist ein zentrales Element des Systems. Es gibt zwei primäre Wege, wie diese Zuordnung zustande kommen kann:

- **Direkte Zuordnung:**

  - Ein Dokument kann _direkt_ einer oder mehreren Collections zugewiesen werden. Dies kann beispielsweise beim initialen Upload geschehen, wenn der Nutzer explizit Ziel-Collections angibt, oder durch eine spätere manuelle Zuweisung durch einen Bearbeiter (z.B. für Dokumente, die ohne spezifische Anforderung eingingen).
  - Diese direkte Verbindung wird technisch durch einen Eintrag in der Entität `DocumentCollectionAssignment` repräsentiert, die eine `documentId` mit einer `collectionId` verknüpft.

- **Zuordnung durch Erfüllung einer Dokumentenanforderung:**
  - Eine `DocumentRequest` beschreibt den Bedarf an einem Dokument für eine oder mehrere spezifische Collections. Die Entität `DocumentAssignmentCollectionTarget` legt fest, welche Collections (`collectionId`) für eine bestimmte Anforderung (`requestId`) relevant sind.
  - Wenn ein Dokument hochgeladen oder ausgewählt und **akzeptiert** wird, um _diese spezifische Anforderung zu erfüllen_ (typischerweise nach Abschluss der Prüfungs- und Genehmigungsschritte für das Dokument), wird die Verbindung zwischen dem Dokument und den relevanten Collections hergestellt.
  - **Konkret bedeutet dies:** Das System erstellt für jede `collectionId`, die über `DocumentAssignmentCollectionTarget` mit der erfüllten `requestId` verknüpft ist, einen **neuen Eintrag in der `DocumentCollectionAssignment`-Tabelle**. Dieser Eintrag verknüpft die `documentId` des erfüllenden Dokuments mit der jeweiligen `collectionId`.
  - Somit wird die Anforderung nicht nur als erfüllt markiert, sondern das Dokument wird auch **aktiv und direkt** den vorgesehenen Collections zugeordnet, genau wie bei einer manuellen direkten Zuordnung. Die Erfüllung der Anforderung _löst also die Erstellung der direkten `DocumentCollectionAssignment`-Zuordnung(en) aus_.

**Archivierung der Zuordnung:**
Unabhängig davon, _wie_ die Zuordnung zustande kam (direkt oder durch Erfüllung einer Anforderung), kann jede einzelne `DocumentCollectionAssignment`-Zuordnung als **"archiviert"** markiert werden. Dies bedeutet, dass das Dokument für _diese spezifische Collection_ nicht mehr aktiv relevant ist und aus Standard-Übersichten dieser Collection ausgeblendet wird. Das Dokument selbst bleibt jedoch bestehen und kann in anderen Collections, denen es zugeordnet ist (und wo die Zuordnung nicht archiviert ist), weiterhin aktiv sein.

4.  **Dokumentenarten & Eigenschaften**

    - **Kategorien & Arten:** Strukturieren den Dokumentenbestand fachlich. Eine Art (z.B. "Einkommensnachweis") gehört zu einer Kategorie (z.B. "Personal").
    - **Kategorien können hierarchisch strukturiert sein:** Eine Kategorie kann einer **übergeordneten Kategorie** zugeordnet werden (z.B. könnte "Gehaltsabrechnung" eine Unterkategorie von "Einkommensnachweise" sein, welche wiederum zur übergeordneten Kategorie "Personal" gehört).
    - **Eigenschaften:** Definieren wiederverwendbare Datenfelder mit Datentyp. Relevanten Eigenschaften werden einer Dokumentenart zugewiesen.

**5. Dokumentenanforderungen**

- Beschreiben den Bedarf an einem Dokument (oft einer spezifischen Art).
- **Sind einer oder mehreren Collections zugeordnet:** Die spezifischen Collections, für die eine Anforderung gilt, werden über die Entität `DocumentAssignmentCollectionTarget` festgelegt. Ein Dokument, das diese Anforderung erfüllt, wird somit diesen Collections zugeordnet (siehe Abschnitt 3: Indirekte Zuordnung).
- Können Kommentare/Hinweise enthalten.
- Haben einen Status (z.B. "Offen", "Erfüllt").
- Können über **Vorlagen** standardisiert erstellt werden.

6.  **Eingehende Dokumente ohne direkte Anforderung (Zuordnungsaufgabe)**
    - Dokumente können hochgeladen werden, ohne direkt einer Anforderung zugeordnet zu sein, aber mit Ziel-Collection(s).
    - Sie durchlaufen die automatische Analyse (Klassifizierung/Extraktion) und die nachfolgenden menschlichen Prüfschritte.
    - KI-unterstützt wird versucht, das Dokument einer passenden, offenen Anforderung in den Ziel-Collections zuzuordnen.
    - **Falls keine passende Anforderung gefunden wird:** Das Dokument erscheint in einer spezifischen Benutzeroberfläche ("Unzugeordnete Dokumente"). Dort kann ein Bearbeiter es manuell einer Anforderung zuordnen, eine neue Anforderung erstellen (falls die umgebende Applikation dies erlaubt) oder das Dokument (bzw. dessen Eintrag im DMS) löschen.

## Kernprozesse & Workflow (Sequenziell & Menschen-gesteuert)

1.  **Dokumentenerfassung:**

    - Upload mit optionaler Collection-Zuordnung oder zur Erfüllung einer Anforderung.
    - **Dublettenprüfung:** Beim Upload wird mittels Hash/Prüfsumme geprüft, ob eine _identische Datei_ bereits in der/den Ziel-Collection(s) existiert. Bei Fund wird der Nutzer informiert (Verhalten bei Dublette definieren: z.B. Upload abbrechen, nur Metadaten verknüpfen?).
    - Der Upload stößt **automatisch** den ersten Workflow-Schritt an: **Automatische Analyse & Anreicherung**. Dies geschieht typischerweise asynchron (siehe Technische Implementierung).

2.  **Automatische Analyse & Anreicherung (KI-Schritt 1):**

    - Läuft als **Hintergrundprozess** (siehe Technische Implementierung).
    - KI (LLM) analysiert das Dokument.
    - Bestimmt **Dokumentenart** und extrahiert **Metadaten/Eigenschaften**.
    - Speichert die _vorläufigen_ Ergebnisse am Dokument.
    - Dokument erhält Status "Wartet auf Prüfung (Analyse)".

3.  **Menschliche Überprüfung & Korrektur (Analyse):**

    - Ein Bearbeiter prüft die KI-Ergebnisse (Klassifizierung, extrahierte Daten) in der UI, sobald der Hintergrundprozess abgeschlossen ist.
    - **Korrektur:** Bei Fehlern korrigiert der Bearbeiter die Daten _direkt_. Es gibt keinen "Ablehnen"-Schritt, der die KI erneut anstößt.
    - Nach Prüfung/Korrektur stößt der Bearbeiter **manuell** den nächsten Schritt an (z.B. Validierung oder direkt Genehmigung).

4.  **Validierung (Optionaler Schritt):**

    - _Falls konfiguriert:_ Basierend auf Dokumentenart/Collection werden Regeln geprüft (Vollständigkeit, Plausibilität).
    - Kann automatisch (ggf. als weiterer **Hintergrundprozess**) oder als menschliche Aufgabe erfolgen. Ergebnisse werden protokolliert.
    - Dokument erhält Status "Wartet auf Prüfung (Validierung)".

5.  **Menschliche Überprüfung & Korrektur (Validierung):**

    - _Falls Validierungsschritt erfolgte:_ Ein Bearbeiter prüft die Validierungsergebnisse.
    - Er entscheidet über das Vorgehen (z.B. Daten korrigieren, Warnung akzeptieren).
    - Nach Prüfung/Korrektur stößt der Bearbeiter **manuell** den finalen Genehmigungsschritt an.

6.  **Menschliche Genehmigung (Final):**

    - Ein Bearbeiter führt die finale Prüfung durch.
    - Mit der Bestätigung wird der **Genehmigungsstatus** des Dokuments auf "Genehmigt" gesetzt. Das Dokument ist ab jetzt **unveränderlich**.
    - Falls das Dokument einer Anforderung zugeordnet ist, wird geprüft, ob die Anforderung damit als "Erfüllt" markiert werden kann (ggf. separater Bestätigungsschritt durch den Anforderer, je nach Prozessdesign).

7.  **Zuordnung (für unzugeordnete Dokumente):**
    - Parallel oder nach der Genehmigung: Wenn ein Dokument initial keiner Anforderung zugeordnet war und die KI keine passende fand, erfolgt die manuelle Zuordnung oder Löschung über die dedizierte Oberfläche (siehe Punkt 6 oben). Die KI-gestützte Suche nach passenden Anforderungen kann ebenfalls als **Hintergrundprozess** implementiert werden.

## Technische Implementierungsaspekte

1.  **Asynchrone Verarbeitung mittels Queues:**

    - **Kernprinzip:** Zeitintensive, automatisierte Aufgaben wie die KI-Analyse (Klassifizierung, Extraktion), die potenzielle Zuordnung zu Anforderungen und ggf. automatische Validierungen werden **nicht synchron** während der Benutzerinteraktion ausgeführt.
    - **Mechanismus:** Beim Anstoßen einer solchen Aufgabe (z.B. durch Dokumenten-Upload) wird ein **Job** in eine **Warteschlange (Queue)** eingestellt. Der Job enthält typischerweise die ID des Dokuments und die auszuführende Aufgabe.
    - **Vorteile:**
      - **Entkopplung & Responsivität:** Die Benutzeroberfläche (UI) oder die aufrufende API blockiert nicht, sondern kann dem Benutzer sofort Feedback geben (z.B. "Dokument wird analysiert").
      - **Skalierbarkeit:** **Worker-Prozesse** (Consumers) können die Jobs aus der Queue unabhängig voneinander abarbeiten. Die Anzahl der Worker kann je nach Last skaliert werden (mehrere Server/Instanzen können sich die Arbeit teilen).
      - **Robustheit:** Bei temporären Fehlern (z.B. LLM-API nicht erreichbar) können Jobs in der Queue verbleiben und später erneut versucht werden (Retry-Mechanismen).

2.  **Workflow:**

    - **Trigger:** Ein Ereignis (z.B. Dokumenten-Upload, manuelles Anstoßen eines optionalen Schritts) führt dazu, dass die Kernapplikation (z.B. über ein API-Backend) einen Job in die entsprechende Queue legt.
    - **Verarbeitung:** Ein oder mehrere Worker-Prozesse überwachen die Queue. Sobald ein Job verfügbar ist, nimmt ein Worker ihn auf, führt die Aufgabe aus (z.B. Aufruf der LLM-API, Regelprüfung) und aktualisiert anschließend den Status und die Daten des Dokuments in der Datenbank.
    - **Benutzer-Feedback:** Die UI muss den asynchronen Status reflektieren (z.B. "In Analyse"). Sobald der Worker den Status aktualisiert hat (z.B. auf "Wartet auf Prüfung (Analyse)"), wird dies in der UI sichtbar (z.B. durch Polling, WebSockets oder beim nächsten Laden der Ansicht).
    - **Datenbank-Design** Der aktuelle Stand des Workflows wird in der separaten DocumentWorkflow Entität gespeichert. Für jeden Schritt wird hierzu eine eigene Entität erstellt.

3.  **Fehlerbehandlung & Monitoring:**

    - Robuste Fehlerbehandlung in den Workern ist essenziell (z.B. für den Fall, dass ein Dokument nicht analysiert werden kann).
    - Mechanismen für Retries bei temporären Fehlern.

4.  **Speicherung der Dokumentdateien in Objektspeicher (S3):**

    - **Kernprinzip:** Die eigentlichen Dokumentdateien (z.B. PDFs, Bilder) werden aus Gründen der Skalierbarkeit, Kosteneffizienz und Robustheit nicht in der primären Datenbank oder auf lokalen Dateisystemen der Anwendungsserver gespeichert, sondern in einem dedizierten Objektspeicher wie bspw. S3
    - **Mechanismus:**
      - Das DMS speichert in seiner Datenbank _nicht_ die Datei selbst, sondern nur die Metadaten zum Dokument (siehe Punkt 2 unter "Hauptkonzepte").
      - Beim **Upload** wird die Datei direkt in den konfigurierten S3-Bucket abgelegt, der Objekt-Key entspricht hierbei grob der ID des Dokuments.
      - **Worker-Prozesse** (z.B. für Analyse, Validierung) greifen über die S3-API auf die Datei im Objektspeicher zu, um deren Inhalt zu lesen und zu verarbeiten.
      - Die **Benutzeroberfläche** ruft bei Bedarf (z.B. zur Anzeige einer Dokumentenvorschau) über das Backend die Datei ebenfalls aus S3 ab (über temporär signierte URLs für direkten Browserzugriff).

## Fachliche Ziele

- **Effizienz:** Reduzierung manueller Dateneingabe durch KI; klare, wenn auch manuell gesteuerte, Prozessschritte, unterstützt durch nicht-blockierende Hintergrundverarbeitung.
- **Datenqualität:** Sicherstellung korrekter Daten durch zwingende menschliche Überprüfung/Korrektur und optionale Validierungen.
- **Compliance & Nachvollziehbarkeit:** Unveränderlichkeit genehmigter Dokumente; Protokollierung von Statuswechseln und Genehmigungen durch Benutzer.
- **Zentralisierung & Struktur:** Zentrale Ablage mit Zugriff über hierarchische Collections und Kategorien.
- **Skalierbarkeit der Speicherung:** Ermöglichung der Speicherung großer Mengen von Dokumentdateien ohne Beeinträchtigung der Applikationsperformance oder Datenbankgröße.

## Abgrenzung & Zukünftige Erweiterungen

- **Außerhalb des Scopes (Initial):**
  - Berechtigungsmanagement (erfolgt durch umgebende Applikation; DMS muss es aber unterstützen/respektieren).
  - Umfassende Suche & Recherche (über Metadaten hinaus).
  - Dokumenten-Lebenszyklus-Management & Aufbewahrungsfristen.
  - Dashboards & Reporting (erfolgt durch umgebende Applikation).
  - Direkte Verknüpfungen zwischen Dokumenten auf DMS-Ebene (erfolgt durch umgebende Applikation).
  - Benachrichtigungssystem.
  - Externe APIs / Integrationen (Modul ist intern).
- **Zukünftige Erweiterungen (Potenziell):**
  - Fine-tuning der KI-Modelle (LLMs) basierend auf gesammelten Korrekturen.
  - Erweiterte Suchfunktionen.
  - Lebenszyklus-Management.
  - Benachrichtigungen.

## Protokollierung (Audit-Trail)

- Alle Statusänderungen von Dokumenten und Anforderungen werden protokolliert.
- Insbesondere wird festgehalten, **wer** (Benutzer) **wann** einen Workflow-Schritt (Prüfung, Korrektur, Genehmigung) abgeschlossen und den nächsten angestoßen hat.
