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
