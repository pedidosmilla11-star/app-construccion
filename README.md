# APP CONSTRUCCIÓN · Incremento 1

Aplicación local Next.js/TypeScript para expedientes de proyectos. Incluye acceso con contraseña, sesiones persistidas, roles por proyecto, alta/consulta/edición, asignación de participantes existentes y auditoría.

El trabajo arquitectónico previo permanece en `../outputs/diseno-arquitectonico/`. Los módulos de predio, normativa, necesidades, alternativas y revisiones aparecen como próximos incrementos: no están implementados. No hay aprobación técnica ni emisión automática.

## Requisitos

- Node.js 24 o superior y npm.
- PostgreSQL de desarrollo y cliente `psql`, o Docker Desktop activo con Compose.
- Una conexión local o de desarrollo controlada por el usuario. No probar contra producción.

## Instalación

Desde esta carpeta:

```sh
npm ci
cp .env.example .env.local
```

Editar `.env.local` con `DATABASE_URL` y `APP_ORIGIN`. Las credenciales nunca se versionan. Usar `http://localhost:3000` como origen de desarrollo y abrir la misma dirección en el navegador.

### PostgreSQL con Docker

Arrancar Docker Desktop. Definir `POSTGRES_PASSWORD` en el entorno de la terminal sin incluirlo en historial ni compartirlo. Compose requiere esa variable incluso al ejecutar el cliente. Levantar PostgreSQL con:

```sh
docker compose up -d db
```

Si Docker no está en el PATH en macOS, usar `/Applications/Docker.app/Contents/Resources/bin/docker`.

Configurar `DATABASE_URL` con usuario `construccion`, base `construccion`, servidor `127.0.0.1:5432` y la misma contraseña codificada para URL. Si no hay `psql` en el equipo, poner en `PSQL_BIN` la ruta absoluta a `scripts/psql-docker.sh`; el wrapper usa el cliente dentro del contenedor. Mantener `POSTGRES_PASSWORD` exportada al ejecutar los comandos y el servidor Next.js.

El volumen conserva datos al detener el contenedor. No ejecutar `docker compose down -v` sobre un entorno con datos que deban conservarse.

### Migraciones y cuenta inicial

```sh
npm run db:migrate
```

Las migraciones tienen checksum, historial y bloqueo transaccional; una migración ya aplicada no debe editarse. La primera migración contiene usuarios, roles, proyectos, participantes, sesiones, límites de acceso y auditoría.

Para crear la cuenta inicial en zsh, introducir la contraseña sin mostrarla:

```sh
read -rs 'APP_USER_PASSWORD?Contraseña inicial (mínimo 12 caracteres): '
export APP_USER_PASSWORD
npm run user:create -- director@example.com 'Director General' --admin
unset APP_USER_PASSWORD
```

Cambiar correo y nombre por los del responsable real. No existen cuentas o contraseñas predeterminadas. Crear otras cuentas con el mismo procedimiento y sin `--admin`; después asignarlas desde el expediente.

```sh
npm run pilot:seed -- director@example.com
npm run dev
```

Abrir http://localhost:3000. La semilla crea Las Violetas una sola vez y no sobrescribe el proyecto si ya existe. Guarda la porción de 70 m², el predio matriz desconocido, los pendientes y la validación conceptual de A-01 del 9 de octubre de 2026 como notas trazables. La importación estructurada de espacios y documentos se desarrollará en un incremento posterior. No crea A-02 ni inventa aprobaciones.

## Permisos

| Rol | Acceso |
| --- | --- |
| Administrador de cuentas | Puede crear proyectos; no obtiene acceso automático a proyectos ajenos |
| Director del proyecto | Consulta, edición, participantes y bitácora |
| Diseñador | Consulta y edición de datos en borrador |
| Revisor o aprobador | Consulta y bitácora; revisión/aprobación futura |
| Consulta | Lectura del expediente asignado |

El director no puede modificar su propio rol ni degradar a otro director en este incremento. La edición usa revisión optimista para rechazar cambios sobre datos desactualizados. Los permisos se comprueban otra vez en la escritura. Los estados aprobados y emitidos están protegidos en la base; este incremento no permite transiciones hacia esos estados.

## Arquitectura y seguridad

`src/domain` contiene reglas; `src/server` contiene persistencia, credenciales, sesiones y permisos; `src/app` contiene páginas y endpoints. No se introduce servicio Python ni almacenamiento alternativo.

Para evitar una dependencia ausente en este entorno, el adaptador PostgreSQL usa el cliente oficial `psql`, mediante un proceso sin shell y SQL exclusivamente definido por la aplicación. Las credenciales pasan por entorno, los datos se convierten en literales con escapes y `standard_conforming_strings=on`, y las escrituras con auditoría son transaccionales. No se acepta SQL del usuario. Es una solución local de bajo volumen; antes de escalar conviene sustituirla por un controlador PostgreSQL con parámetros y pool, conservando las operaciones y pruebas.

Contraseñas con scrypt y sal individual. La base almacena el digest del token de sesión, no el token. Cookies HttpOnly, SameSite y Secure en producción; duración de ocho horas. Control de origen en POST y límite persistido de diez intentos por correo en quince minutos. Los mensajes no revelan contraseñas ni errores de filas PostgreSQL.

Antes de uso productivo: HTTPS, validación integral de permisos, usuario de base con privilegios mínimos, revisión de autenticación, estrategia de recuperación de cuentas, protección adicional ante abuso y pruebas de recuperación. Actualmente no hay carga de archivos; el próximo incremento incorporará validación y almacenamiento privado, incluyendo tratamiento seguro de SVG.

## Verificación

Para comprobar requisitos y conexión sin modificar datos:

```sh
npm run doctor
```

El diagnóstico informa los pendientes y no muestra credenciales. Para ejecutar pruebas, tipos y compilación en un solo paso, usar `npm run verify`.

```sh
npm test
npm run typecheck
npm run build
```

Para integración, crear `.env.test` no versionado con `TEST_DATABASE_URL` apuntando a una base dedicada de pruebas y `PSQL_BIN` si hace falta. Ejecutar `npm test`. La prueba crea un esquema aislado y lo elimina al terminar; verifica persistencia, aislamiento, roles, auditoría inmutable, conflictos, sesiones y rollback. Sin conexión, se informa como omitida, nunca como pasada.

## Copias y restauración antes de producción

Definir una política de frecuencia y retención. Con un cliente PostgreSQL compatible, hacer un `pg_dump` en formato custom y almacenar el archivo fuera del repositorio, con acceso restringido y una copia independiente. No pasar contraseñas por argumentos. Restaurar con `pg_restore` en una base separada y vacía; comprobar proyectos, usuarios, participantes, auditoría y acceso. Documentar fecha, duración y resultado. No restaurar sobre el único original.

Este procedimiento todavía no se ha probado en el entorno actual. La aplicación no debe presentarse como lista para producción hasta completar integración y recuperación. Cuando se incorporen archivos, respaldarlos junto con su manifiesto y verificar sus huellas.

## Estado de verificación de esta entrega

Ver `../plans/2026-10-10-incremento-1.md` para resultados y limitaciones reales.
