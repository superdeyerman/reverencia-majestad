# Copilot Instructions for reverencia-majestad

## Resumen rápido
Proyecto estático: landing page única en `public/index.html` desplegada en Firebase Hosting. No hay paso de construcción real — `npm run build` es un mensaje informativo (ver `package.json`).

## Arquitectura y por qué
- `public/` contiene todo: HTML + CSS inline. Diseño pensado para cambios directos en ese archivo.
- `firebase.json` tiene la regla de rewrite: todas las rutas devuelven `index.html` (sitio single‑page).
- CI: GitHub Actions despliega automáticamente desde `.github/workflows/` (merge → `live`, PR → preview).

## Patrones y convenciones del proyecto
- CSS inline con variables en `:root` (ej.: `--gold`, `--gold2`) — mantener la paleta y efectos de glassmorphism.
- Tipografías responsivas usan `clamp()`; efectos visuales en `h1` por `background-clip: text`.
- Evitar agregar JS o dependencias innecesarias: este repositorio pretende seguir sin build ni runtime extra.

## Flujo de desarrollo y comandos útiles
- Probar localmente: abrir `public/index.html` en el navegador.
- Emulador Firebase (si procede): `firebase emulators:start` (requiere Firebase CLI configurado).
- CI en PRs ejecuta `npm ci && npm run build` pero `build` es un eco — no genera artefactos.

## Archivos clave (ejemplos)
- `public/index.html` — HTML/CSS principal; cambiar `href` del botón de Instagram para actualizar la red social.
- `firebase.json` — configurar `public` y rewrites.
- `.firebaserc` — proyecto por defecto `reverenciamajestad-dd2ba`.
- `.github/workflows/firebase-hosting-merge.yml` — despliegue en `main` → canal `live`.
- `.github/workflows/firebase-hosting-pull-request.yml` — preview para PRs (usa `FIREBASE_SERVICE_ACCOUNT_REVERENCIAMAJESTAD_DD2BA` en el archivo generado).

## Seguridad y secretos
- No agregar credenciales al repo. Las Actions esperan secretos: `FIREBASE_SERVICE_ACCOUNT` (deploy en merge) y `FIREBASE_SERVICE_ACCOUNT_REVERENCIAMAJESTAD_DD2BA` (PR preview).

## Qué pedirle a la AI / tareas comunes
- Cambios de contenido o estilo: editar `public/index.html` directamente; mantener variables CSS y estética dorada.
- Añadir páginas: crear HTML nuevos en `public/` y actualizar `firebase.json` si quieres rutas separadas (actualmente todas rewriten a `index.html`).
- Actualizar CI: mirar workflows en `.github/workflows/` y mantener `projectId: reverenciamajestad-dd2ba` si se cambia el proyecto.

Si algo no está claro (por ejemplo, si quieres internacionalizar o añadir analytics), pregunta antes de cambiar workflows o añadir dependencias.
