Este repositorio utiliza GitHub Actions para despliegues. Después de instalar dependencias, actualiza tu workflow de CI para ejecutar `npm ci && npm run lint` antes de `firebase deploy`.

Ejemplo (añadir job de comprobación):

- name: Lint
  run: |
    npm ci
    npm run lint

Puedes pedirme que actualice los workflows para incluir esta comprobación.
