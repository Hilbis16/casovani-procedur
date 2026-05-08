# Audit aplikace – co vyladit před produkčním nasazením

Datum auditu: 2026-04-30

---

## 🔴 Kritické (blokují provoz nebo bezpečnost)

**1. Chybí autentizace**
Žádná ochrana server akcí ani stránek. Libovolný uživatel v síti může volat jakýkoliv endpoint, mazat pacienty nebo měnit rozvrhy. Bez přihlášení nelze nasadit.

**2. Dostupnost terapeutů se nekontroluje**
`conflictDetection.ts` sice načítá field `availabilities`, ale NIKDY ho nevyhodnotí. Lze tak naplánovat proceduru v neděli terapeutovi, který pracuje pouze Po–Pá. TherapistAvailability v DB je uložena správně, jen chybí logika v `findConflicts`.

---

## 🟠 Vysoká priorita (chybějící části)

**3. Chybí stránky pro terapeuta** (`/terapeuti/[id]` a `/terapeuti/[id]/upravit`)
Navigace odkazuje na tyto URL, ale stránky neexistují → 404. Terapeuta nelze editovat.

**4. `procedury/[id]/upravit` má architekturální chybu**
Je to `"use client"` komponenta, která volá server akci `getAllProcedures()` v `useEffect`. Nenačte konkrétní proceduru podle ID, ale stáhne celý seznam a najde ji filtrem. Na pomalé síti nebo s prázdnou DB zobrazí prázdný formulář.

**5. Stav procedury (`planned/completed/cancelled`) nelze měnit z UI**
DB pole existuje, logika tisku ho zobrazuje, ale `AppointmentForm.tsx` ho v editaci neobsahuje. Personál nemůže označit proceduru jako dokončenou.

---

## 🟡 Střední priorita (UX a provozní funkce)

**6. Redundantní stránka `/pacienti/[id]`**
Seznam pacientů odkazuje na `/pacienti/[id]/pobyt`, ne na `/pacienti/[id]`. Stránka s týdenním gridem na `/pacienti/[id]` existuje, ale nikdy se na ni uživatel nedostane.

**7. WeeklyGrid není responzivní**
Má `min-w-[700px]` – na tabletu nebo menším monitoru se grid horizontálně posouvá, což na recepci nebo při tisku komplikuje práci.

**8. Chybí potvrzení/notifikace po akcích**
Po uložení nebo smazání záznamu se stránka tiše překreslí. Bez toast/banner zprávy personál neví, jestli akce proběhla.

**9. Export není implementován**
Rozvrh pacienta jde vytisknout, ale nelze ho exportovat do PDF ani Excelu – standardní požadavek lázeňských zařízení pro pojišťovnu nebo dokumentaci.

---

## 🟢 Nižší priorita (nice to have)

**10. Opakující se procedury nelze editovat**
`RecurringProcedureForm.tsx` umí vytvořit sérii, ale neexistuje způsob, jak celou sérii smazat nebo přeplánovat najednou. Každá instance se musí měnit zvlášť.

**11. Prázdný stav přehledu**
`/prehled` (denní přehled) nemá žádný stav pro den bez procedur – zobrazí se prázdná stránka bez vysvětlení.

**12. Validace dat pobytu pacienta**
Nic nebrání tomu, aby u pacienta byl nastaven `checkin` po `checkout`. Zod schéma v `patientActions.ts` tuto kontrolu postrádá.

---

## Doporučené pořadí oprav

| Pořadí | Co | Složitost |
|--------|----|-----------|
| 1 | Kontrola dostupnosti terapeuta v `conflictDetection.ts` | střední |
| 2 | Stav procedury (`planned/completed/cancelled`) v editačním formuláři | malá |
| 3 | Stránky terapeuta (`/terapeuti/[id]`, `/terapeuti/[id]/upravit`) | střední |
| 4 | Oprava `procedury/[id]/upravit` na server component | malá |
| 5 | Toast notifikace po akcích | malá |
| 6 | Autentizace (NextAuth nebo podobná) | velká |
| 7 | Export do PDF | střední |

Aplikace je funkčně hotová pro interní testování, ale body 1–5 jsou potřeba před prvním ostrým provozem.
