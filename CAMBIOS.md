# CAMBIOS — registro de lo que cambia en Catering Control

Archivo de trabajo del repositorio maestro (`G:\catering control\Catering Control`).
Sirve para saber, en cada momento, **qué cambió** y **qué hay que hacer en las bases
que ya están en producción** para ponerlas al día.

## Reglas fijas

1. En `install/` solo puede haber **3 archivos SQL**:
   - `supabase-setup-final.sql` — instalación completa, fuente única de verdad.
   - `reset-admin-password.sql` — recuperación de acceso (una tarea, no una migración).
   - `supabase-promote-superadmin.sql` — ascender a Super Admin (idem).
   **No se crean archivos `migracion-*.sql`.** Todo cambio de esquema o de función va
   directo dentro de `supabase-setup-final.sql`.
2. `supabase-setup-final.sql` tiene que poder correrse **entero sobre una base ya con
   datos, todas las veces que haga falta, sin romper nada**: solo
   `create table if not exists`, `create or replace function`, `insert … on conflict do nothing`,
   `alter table … enable row level security`. Nunca `drop table`, `truncate` ni `delete` de filas de la app.
3. Después de actualizar el setup en una base existente, hay que **redesplegar las Edge
   Functions que cambiaron** (el SQL no las toca). Se anota en la entrada correspondiente.
4. Cuando un cambio entra al maestro, se actualiza este archivo y se anota la versión de
   código (`VERSION_CODIGO` en `scripts/nueva-empresa.mjs`).
5. **Formato de encabezado de entrada** (lo lee `scripts/versiones.mjs` para decir qué le falta
   a cada empresa, no lo cambies de forma):
   `## esquema X.Y · vNN · AAAA-MM-DD — título`. La versión de esquema vive en la línea
   `-- version de esquema: X.Y` del setup y se escribe en la tabla `db_app_version` de cada base.
   En cada entrada, la tabla **`Estado por base` tiene que usar el `projectRef` en la primera
   celda** y `✅` / `⬜` en las columnas SQL y Edge Functions: eso es lo que levanta el script.

---

## esquema 1.24 · v71 · 2026-09-26 — Marca de versión por empresa, tests de lógica y difusión a clientes

### Qué cambió

**Marca de versión dentro de la base (setup, sección 23)**
- Tabla nueva `public.db_app_version` (fuera de los datos de la app) con una sola fila `main`
  que guarda `{"setup": "supabase-setup-final.sql", "esquema": "1.24"}`.
- La versión se declara en **un solo lugar**: la línea `-- version de esquema: 1.24` del
  encabezado del setup. Subila cuando el setup evolucione y el `insert` la propagua sola.
- Por qué tabla propia y no la fila `settings` de `db_personal`: `_save_table_field` reemplaza
  el payload de `settings` **entero** cada vez que un admin guarda Configuración, así que
  cualquier marca puesta ahí desaparece al primer guardado.
- RPC de lectura `_app_version()` (`stable`, `security definer`). El barrido de permisos del
  `do $$` final la cubre por estar prefijada con `_`: verificado en la base, solo
  `postgres` y `service_role` tienen `EXECUTE`; `anon` y `authenticated` no.
- `install/empresas.json`: campos `schemaVersion` y `sqlHash` por empresa, y
  `esquemaVersion` + `actualizado` arriba del arreglo.

**`scripts/versiones.mjs` — inventario de versiones (solo lectura)**
- `--local` compara el sha256 del setup del maestro contra el snapshot SQL de cada empresa y
  lista qué entradas de este archivo le faltan.
- `--api` lee `public._app_version()` de cada base por la API de gestión de Supabase con
  `SUPABASE_ACCESS_TOKEN`; si no hay token o la organización no llega al proyecto, avisa por
  empresa y sigue (no crashea, no imprime el token).
- `--json` para consumirlo desde otros scripts. Verificado: pruebas reporta `1.24` desde la
  base real; In Shape devuelve `HTTP 403` (el token del CLI no es de esa organización) y el
  script lo degrada a `error` por fila.

**`scripts/difundir.mjs` — réplica maestro → empresa (dry-run por defecto)**
- Sin `--aplicar` no escribe un byte (verificado contra `G:\catering control\In Shape`).
- `--list`, `--empresa <nombre|storagePrefix>`, `--solo <ruta>`, `--detallado`, `--aplicar`.
- Protege lo white-label y lo que genera `nueva-empresa.mjs`: `public/config.js`,
  `public/manifest.json`, `public/icons/**`, `install/*.sql`, `install/*.local.json`,
  `install/empresas.json`, `wrangler.jsonc/.toml`, `.env*`, `claves.txt`,
  `.sincronizado.json`, `node_modules`, `dist`, `.git`, `.vercel`, `*.zip`, `*.rar`.
- Detecta ediciones a mano en la empresa con `.sincronizado.json` (en la raíz del maestro,
  agregado a `.gitignore`) y **no las pisa**: reporta `CONFLICTO` y sale con código 1.
- Nunca corre git que escriba, ni en el maestro ni en la empresa.

**Tests (`tests/`, `node --test`, cero dependencias nuevas)**
- 45 tests: 43 pasan, 2 quedan como `todo` marcando deuda real. `npm test` (única línea
  agregada a `package.json`).
- Cubren las 8 ramas de `dispatchStatus`, `effectiveRouteId/DriverId`, `resolvedAddress`,
  `shiftOrdersFrom`, `extractLatLngFromMapsField`, `googleMapsDirectLink`, `addDays` /
  `nextWorkDay` con bordes de fin de mes y año, `planFor` / `stateFor` / `statusClass`,
  y tres invariantes estructurales: **las 11 páginas Premium del JS coinciden con las del
  SQL**, es/en/pt tienen el mismo set de 1275 claves, y `install/` sigue teniendo 3 SQL sin
  `drop table` / `truncate` / `delete` en el scope de instalación.

### Estado por base

| Base | SQL | Edge Functions |
|---|---|---|
| `kkqcaiunetlikfyaldab` (pruebas) | ✅ al día, esquema 1.24 aplicado y verificado | ✅ `send-push` v15 |
| `spvqcxomhkukwzijhvlm` (In Shape) | ⬜ **código difundido 2026-09-26 (32 archivos + snapshot SQL regenerado a 1.24), falta correr el SQL en su base** | ⬜ pendiente |

No hay ninguna Edge Function nueva que desplegar en esta entrada: `db_app_version` y
`_app_version()` las consume `scripts/versiones.mjs`, no la app.

### Deuda que los tests dejaron registrada (no corregida aún)
1. **El panel y el portal del cliente calculan estados distintos para el mismo cliente y día.**
   `dispatchStatus()` (`src/services/dispatchHelpers.js`) vs `stateFor()`
   (`src/services/planHelpers.js`): sin días cargados el panel dice `Retorno pendiente` y el
   portal `Activo`; con `startDate` futuro y días agotados `Retorno pendiente` vs `Programado`;
   fuera de las franjas del `schedule` `Fuera de horario` vs `Activo`. Test:
   `tests/dispatch-vs-portal-status.test.js` (marcado `todo`).
2. La invariante "cero `delete from` en todo el archivo" da 19 ocurrencias, todas **dentro de
   cuerpos de función** (limpieza de sesiones, intentos de login, borrados por RPC). El scope
   de instalación tiene 0, que es lo que importa para re-correr sin romper datos.

### Riesgo aceptado a conciencia (decisión del dueño, 2026-09-26)
`login_staff()` (setup, ~línea 633) mantiene un **admin con credenciales por defecto** que
funciona mientras no exista ningún usuario de staff cargado, y esas credenciales son las
mismas en todas las empresas porque el setup es compartido. Decisión: se deja así, el flujo
previsto es entrar con ese usuario y **borrarlo a mano** al dar de alta el definitivo.
Consecuencia operativa: en cada empresa nueva hay que borrar ese usuario **antes** de dejar
la app pública, y el ZIP que se entrega a un cliente contiene esa línea.

---

## v71 · 2026-09-25 — Plan Premium: nueva tabla de funciones + candado en el servidor

### Qué cambió

**Frontend (tabla de planes)**
- Pasaron a **Premium**: portal de clientes (incluidos "Nuestros planes" y "Menú de la
  semana" dentro del portal), Notas (con verificación de comprobante), Despacho, Sueldos,
  Inventario, horario semanal y exportar dietas especiales.
- Siguen en **Básico**: Métricas, Auditoría y cierre automático del día.
- Total de páginas bloqueables: **11**. Se eliminó `returnDate` (reactivación por fecha):
  estaba marcado como Premium pero ningún llamador pasaba nunca `true`, así que el candado
  no hacía nada. Ahora la reactivación por fecha siempre funciona.
- Archivos: `src/services/panelAuth.js`, `src/services/dispatchHelpers.js`
  (`dispatchStatus` ahora recibe 3 argumentos, se actualizaron 24 usos en 8 archivos),
  `src/components/panel/settings/SettingsPage.jsx`, `src/i18n/locales/{es,en,pt}.json`.

**Backend (el candado ahora corre en Postgres, no en la app)**
- `_plan_blocks(p_page)` lee `db_personal` fila `settings` y decide si la página está
  bloqueada, teniendo en cuenta `premiumUntil` en la **zona horaria de la empresa**.
- Escrita: `_require_permission` llama a `_plan_blocks` → un editor sin Premium recibe
  error al guardar Notas/Sueldos/Inventario/Despacho. Super Admin exento.
- Lectura: los RPCs de lectura devuelven **vacío**, no error, para que el panel arranque
  sin páginas rotas.
- `plan_blocks_page(p_page)` es la misma comprobación para las Edge Functions (service_role).
- **Sweep de permisos** (último bloque `do $$` del setup): repasa *todas* las funciones
  `_`-prefijadas más 6 funciones sin token que usan pg_cron y las Edge Functions, y hace
  `revoke … from public, anon, authenticated` + `grant … to service_role`.
  Motivo: los **default privileges** de Supabase vuelven a dar `EXECUTE` a `anon` en cada
  función nueva, así que un `revoke` suelto no sirve. Verificado: el cron de cierre de día
  sigue ejecutándose (job 95, `cron.job_run_details`).

**Edge Functions**
- `send-push` → **v15**, desplegada en pruebas. El modo `manual` comprueba
  `plan_blocks_page('manualPush')` para todo el que no sea Super Admin.

**Seguridad (punto 4 del informe)**
- 6 funciones internas que estaban accesibles con la clave anónima quedaron cerradas
  (`get_push_reminder_config`, `get_push_reminder_targets`, `get_clients_for_push_reminder`,
  `run_push_reminder`, `plan_blocks_page`, `get_company_timezone`, `get_day_cutoff_hour`).

### Estado por base

| Base | SQL | Edge Functions |
|---|---|---|
| Pruebas `kkqcaiunetlikfyaldab` | ✅ al día (2026-09-25) | ✅ `send-push` v15 |
| In Shape `spvqcxomhkukwzijhvlm` | ⬜ pendiente: correr `install/supabase-setup-final.sql` (resuelto con su ref) | ⬜ pendiente: redesplegar `send-push` |

Correr el setup en In Shape **no borra ni toca datos**: son tablas/functions idempotentes.
Único paso manual después, si se quisiera que Métricas y Auditoría queden libres en Básico:

```sql
update db_personal set payload = jsonb_set(payload, '{premiumLockedPages}',
  (payload -> 'premiumLockedPages') - 'audit' - 'metrics')
  where id = 'settings' and payload -> 'premiumLockedPages' ?| array['audit','metrics'];
```

Un valor explícito en `premiumLockedPages` manda sobre el default del código, por eso se
limpia: si una base vieja guardó `{"audit": true, "metrics": true}`, esas dos páginas
seguirían cerradas aunque Básico las regale.

### Pendiente de decidir
- `VERSION_CODIGO` sigue en `v71` aunque el código cambió. Subirlo a `v72` antes del push
  es lo que hace que los clientes existentes reciban el update por Service Worker.

---

## Arreglos de UI del mismo día

- **Scroll del menú lateral en teléfonos con letra grande** (`src/pages/PanelPage.css`,
  `PanelPage.jsx`): la barra se salía de la pantalla y no se podía bajar. Ahora el
  contenedor del menú tiene altura propia y `overflow-y: auto`.

---

## Pendientes (medidos, sin hacer)

1. **Despliegue de pruebas sin verificar.** El `site_url` de Auth del proyecto
   `kkqcaiunetlikfyaldab` es `https://catering-control-react-cateringcontrol.vercel.app/` y esa
   URL responde 200 con una app **Next.js** (`/_next/static/…`), no con el bundle de Vite
   (`/assets/index-*.js`). En el repo aparecieron las ramas `vercel/install-vercel-speed-insights-*`
   y `vercel/install-vercel-web-analytics-*`. Revisar en Vercel: Settings → Production Branch =
   `main`, y qué deployment es el de producción.
2. **`origin/master`** es una rama vieja divergida (2 commits propios, 141 archivos de
   diferencia contra `main`). Confirmar que nada la despliegue y borrarla o dejarla muerta.
3. **`cerrar-dia-automatico` sigue en v5** (deploy anterior al commit `5d0ad8d`). Sus `shared/`
   cambiaron pero el comportamiento es idéntico (los llamadores ya pasaban `false`).
   Redesplegar para que repo y base queden byte-idénticos.
4. **In Shape `spvqcxomhkukwzijhvlm`** — estado medido 2026-09-26:
   - **Código: ya al día.** `difundir --aplicar` dejó la carpeta idéntica al maestro
     (32 archivos, luego 3 más al arreglar los tests). 45 tests, 40 pasan, 3 se saltean por ser
     copia de empresa, 0 fallas.
   - **SQL listo para correr**: `In Shape/install/supabase-setup-inshape.sql` regenerado desde el
     maestro con el ref resuelto (6 `<PROJECT_REF>`), esquema **1.24**, sha256 `6f059855`.
     El anterior era de antes del candado Premium: **no tenía** `_plan_blocks`,
     `_premium_lockable_pages`, `plan_blocks_page` ni el barrido de permisos — o sea que en esa
     base hoy el Premium se corta solo en el navegador.
   - **Pendiente**: correr ese archivo ENTERO en su base (dry-run `begin/rollback` primero),
     redesplegar `send-push` (v15) y `cerrar-dia-automatico`.
   - **Pendiente**: en `In Shape/install/` hay **4 archivos SQL** porque quedó un
     `supabase-setup-final.sql` copiado a mano el 2026-09-24 (pre-Premium, con `<PROJECT_REF>`
     sin resolver, o sea inutilizable). Borrarlo deja la regla de 3 también en la copia.
   - `versiones.mjs --api` no puede leer esa base con el token del CLI (HTTP 403, es de otra
     organización): hace falta la sesión del navegador o un token de esa organización.
5. **Green Fork**: la carpeta `G:\catering control\Green Fork` ya está creada (copia del maestro
   sin `node_modules`/`dist`/`.git`) y registrada en `install/empresas.json` con
   `projectRef: null`. `public/config.js` quedó con 4 campos en blanco marcados `[COMPLETAR]`
   para llenar a mano; `public/manifest.json` ya dice "Green Fork". **No arranca hasta poner
   `supabaseUrl` + `supabaseKey`**: `createClient('','')` lanza `supabaseUrl is required` y la
   pantalla queda en blanco. Falta: crear el proyecto Supabase, llenar el config, y recién ahí
   `npm run nueva-empresa init --ref <REF> --empresa "Green Fork" --whatsapp <NUM> --out
   "G:\catering control\Green Fork"` (eso genera el SQL con el ref resuelto y el par VAPID).
   Verificado con `difundir --empresa "Green Fork"`: 138 sin cambios, 0 conflictos, protegidos
   `config.js`/`manifest.json`/`icons`/`*.sql`.
6. **`Catering Control.rar` (939 KB) en la raíz del maestro.** Está ignorado por el
   `*.rar` de `.gitignore`, así que no se sube a git, pero es una copia del proyecto con
   `config.js` y secretos a la vista en el disco. Decidir si se borra o se muda fuera de la
   carpeta del repo.
