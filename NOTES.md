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
