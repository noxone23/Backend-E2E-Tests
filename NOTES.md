# Notizen: E2E-Tests

## Challenge 1: Flow-Test "add a book and delete it"

Der Test steht in `e2e/books.spec.ts`. Er legt ein Buch mit eindeutigem Titel an (`E2E Book ${Date.now()}`), erwartet es in der Liste, löscht es über `Delete <title>` und erwartet, dass es weg ist. Er hat keinen DB-Code, keine CSS-Selektoren und kein `waitForTimeout`.

Geprüft: `npm run e2e` zweimal hintereinander grün, einzeln mit `npx playwright test -g "add a book"` grün, `npm run typecheck` ohne Fehler.

## Break it on purpose

Jeder Fehler wurde eingebaut, `npm run e2e` lief, danach `git restore`.

| Änderung | Ergebnis | Fehlschlagende Zeile | Warum |
| --- | --- | --- | --- |
| `toBook` gibt kein `id` mehr zurück (`backend/src/models/Book.ts`) | Rot | `toHaveCount(0)` (Zeile 23) | Das Buch wird angelegt, aber der Delete-Button ruft `/books/undefined` auf. Das Backend wirft einen `CastError`, das Buch bleibt in der Liste. |
| `POST` antwortet `200` statt `201` (`backend/src/routes/books.ts`) | Grün | keine | Die Seite prüft nur `response.ok`. Den Statuscode würde ein Route-Test prüfen. |
| `VITE_API_URL` auf `http://localhost:9/api` (`playwright.config.ts`) | Rot | `toBeVisible()` (Zeile 20) | Nichts hört auf Port 9, die Seite zeigt den Alert `Failed to fetch`. Test 1 bleibt grün, weil er die API nicht aufruft. |
| Eigener Fehler: `DELETE` antwortet immer `404 Book not found`, das Buch wird nicht gelöscht | Rot | `toHaveCount(0)` (Zeile 23) | Die Seite zeigt den Alert `404 Book not found`, lädt die Liste neu, und das Buch steht noch dort. Test 1 bleibt grün. |

Vorhersage beim eigenen Fehler: rot, nach dem Klick auf Löschen, Test 1 nicht betroffen. Das stimmte.

Was die Übung zeigt:

- Der Flow-Test prüft, was ein Nutzer sieht. Statuscodes und das Fehlerformat prüft er nicht. Das wäre die Aufgabe eines Route-Tests.
- Hätte der Handler bei `DELETE` das Buch gelöscht und trotzdem `404` gesendet, wäre der Test grün geblieben.

## Hinterlassene Testdaten

Bei fehlgeschlagenen Läufen bleibt ein Buch in der Datenbank, weil das Löschen nicht mehr erreicht wird. Es heißt `E2E Book <Zahl>` und ist harmlos. Löschen geht in der Seite oder in Compass.

Offen (nach den Fehlerläufen): `E2E Book 1795705965581` und `E2E Book 1795706324115`.

## Challenge 2: Buch nach einem Reload noch da

Der Test `a book is still there after a reload` legt ein Buch an, ruft `page.reload()` auf, erwartet das Buch weiter in der Liste und löscht es dann.

Was er beweist, was der Flow-Test nicht beweist: Nach dem Reload ist der Zustand der Seite weg, die Liste wird neu von der API geladen. Das Buch steht also in der Datenbank. Der Flow-Test sieht das Buch auch dann, wenn die Seite es nur im Speicher hält.

Geprüft: `npm run e2e` zweimal hintereinander grün (3 Tests), einzeln mit `npx playwright test -g "after a reload"` grün, `npm run typecheck` ohne Fehler.

## Challenge 3: Locators und Trace Viewer

Fehler eingebaut: In Test 1 heißt die Überschrift `Reading Lst` statt `Reading List`. Danach `git restore e2e/books.spec.ts`.

Ergebnis: Rot, Zeile 7 (`toBeVisible()` der Überschrift). Test 1 wartet das volle Timeout von 5 s ab, bevor er fehlschlägt.

Der Call-Log sagt, was passiert ist:

- `Expect "toBeVisible" getByRole('heading', { name: 'Reading Lst' }) with timeout 5000ms`
- `waiting for getByRole('heading', { name: 'Reading Lst' })`
- `Error: element(s) not found`

Der Locator hat nie ein Element gefunden. Er ist also nicht "unsichtbar", er passt auf nichts.

Die Datei `error-context.md` im Ordner `test-results/` zeigt den Aufbau der Seite zum Zeitpunkt des Fehlers: `heading "Reading List" [level=1]`. Daran sieht man den Tippfehler sofort: die Seite hat `Reading List`, der Test sucht `Reading Lst`.

Trace: Die Konfiguration schreibt mit `trace: "retain-on-failure"` für jeden fehlgeschlagenen Test eine `trace.zip` nach `test-results/<ordner>/`. Öffnen mit `npx playwright show-trace test-results/<ordner>/trace.zip`. Der Ordner `test-results/` ist von git ignoriert.

### `getByRole` gegen einen CSS-Selektor

| | `getByRole("button", { name: "Add book" })` | `form button` |
| --- | --- | --- |
| Was er beschreibt | Was der Nutzer sieht: ein Button mit dem Namen "Add book" | Wo der Button im HTML steht |
| Zweiter Button im Formular | Findet weiter genau den richtigen | Trifft zwei Elemente, Playwright meldet einen Strict-Mode-Fehler |
| Button aus dem `<form>` heraus verschoben | Findet ihn weiter | Findet nichts mehr |
| Button umbenannt (z. B. "Save") | Findet nichts mehr, und das ist richtig: für den Nutzer hat sich etwas geändert | Findet ihn weiter, der Test merkt die Umbenennung nicht |
| Fehlt der Name (Icon-Button ohne Label) | Rot, und das zeigt ein Problem der Barrierefreiheit | Bleibt grün |

Fazit: Der Role-Locator bricht, wenn sich das ändert, was ein Nutzer wahrnimmt. Der CSS-Selektor bricht, wenn sich die Struktur ändert, auch wenn sich für den Nutzer nichts geändert hat. Das erste ist ein gewollter Fehler, das zweite ein unnötiger.

## Challenge 4: Eigene Test-Datenbank

Die Tests laufen jetzt gegen `reading-list-e2e` statt gegen `reading-list`, auf demselben Cluster und mit derselben Connection-String aus `backend/.env`. Es gibt keinen zweiten String in der `.env`.

Umsetzung:

- `e2e/database.ts` lädt `backend/.env` mit `process.loadEnvFile("backend/.env")` (ein Fehler wird abgefangen, wenn es die Datei nicht gibt), liest `MONGODB_URI` und setzt mit `new URL(uri)` den Pfad auf `/reading-list-e2e`.
- Der Guard wirft einen Fehler, wenn der Datenbankname nicht auf `-e2e` endet. Die Meldung nennt nur den Namen, nie den String. Ein ungültiger String führt zu einer eigenen Meldung, weil der Originalfehler von `new URL` die Eingabe enthalten kann.
- `playwright.config.ts` gibt der Test-API den neuen String als `MONGODB_URI` in `webServer.env`. Eine dort gesetzte Variable hat Vorrang vor der `.env`.
- `e2e/database.ts` steht in der "Do not change"-Liste der `CLAUDE.md`.

Geprüft:

- Ein Skript hat nur den Datenbanknamen ausgegeben: `reading-list-e2e`. Der String wurde nicht ausgegeben.
- `npm run typecheck` ohne Fehler, `npm run e2e` mit 3 Tests grün.
- Guard: Mit dem Namen `reading-list` bricht `npm run e2e` beim Laden der Konfiguration ab mit `The E2E tests only run against a database ending with "-e2e", not "reading-list".` Es startet kein Server und läuft kein Test.

Zum Nachdenken: Wovor schützt die Trennung, und warum ist sie nur eine Hürde und keine Grenze?

- Sie schützt vor Versehen. Ein Test, der nach einem Fehler ein Buch zurücklässt, oder ein Test, der später doch Daten löscht, trifft nicht mehr die echten Bücher in `reading-list`. Die Testdaten und die echten Daten vermischen sich nicht, und die Seed-Bücher bleiben unangetastet.
- Sie ist keine Grenze, weil derselbe Atlas-User alle Datenbanken des Clusters lesen und schreiben darf. Wer die Konstante ändert oder `MONGODB_URI` in `webServer.env` anders setzt, kommt trotzdem an `reading-list`. Der Guard bremst nur ein Versehen, nicht jemanden mit Absicht. Eine echte Grenze wäre ein eigener Atlas-User, der nur auf `reading-list-e2e` Rechte hat, oder ein eigener Cluster.

## Review der Tests

Geprüft:

- **Eigene Daten und Aufräumen:** Test 2 und 3 legen ein Buch mit eindeutigem Titel (`E2E Book ${Date.now()}`) an und löschen es über die Seite. Test 1 legt gar keine Daten an. Keiner zählt Bücher und keiner hat DB-Code. Offen bleibt: Bricht ein Test in der Mitte ab, bleibt sein Buch in `reading-list-e2e` liegen (siehe oben).
- **Einzeln lauffähig:** Alle drei Tests bestehen allein mit `-g` (`heading and the form`, `add a book`, `after a reload`).
- **`waitForTimeout`:** Keiner. Auch keine CSS-Selektoren, kein `setTimeout` und kein `reuseExistingServer: true` (Suche mit `grep` in `e2e/` und `playwright.config.ts`).

Gefunden und behoben: Test 2 und 3 wiederholten dieselben sieben Zeilen (Seite öffnen, Titel und Autor ausfüllen, "Add book" klicken, Buch erwarten). Jetzt macht das die Hilfsfunktion `addBook(page)` in `e2e/books.spec.ts`. Sie gibt den Titel und das Listenelement zurück. Ändert sich das Formular, muss man es nur an einer Stelle anpassen.

Danach: `npm run e2e` zweimal grün (3 Tests), beide Flow-Tests einzeln grün, `npm run typecheck` ohne Fehler.
