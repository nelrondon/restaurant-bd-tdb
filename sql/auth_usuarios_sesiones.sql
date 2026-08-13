    -- Autenticación de empleados
    -- Debido a cómo funciona PostgreSQL (no existe el comando USE como en MySQL), la base de datos se debe seleccionar de antemano y este script se debe ejecutar dentro de la misma
    -- El documento original describe el esquema en dialecto MySQL: aquí se traduce a PostgreSQL (SERIAL en vez de AUTO_INCREMENT, tipo ENUM propio, TIMESTAMPTZ e índices como sentencia aparte)

    -- Crear el tipo (o enum) correspondiente al rol de un usuario
    -- Se envuelve en un bloque DO porque PostgreSQL no admite "CREATE TYPE IF NOT EXISTS"

    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
            CREATE TYPE rol_usuario AS ENUM ('admin', 'gerente', 'empleado');
        END IF;
    END
    $$;

    -- Crear la tabla "usuarios"
    -- Se encarga de mantener registro de los empleados que pueden iniciar sesión en el sistema.
    -- - Columna "id_usuario" que acepta un entero no nulo autoincremental. Marcada como la llave primaria de la tabla
    -- - Columna "usuario" que acepta una cadena variable de longitud máxima de 50 no nula. Marcada como única: es el nombre con el que se inicia sesión
    -- - Columna "nombre" que acepta una cadena variable de longitud máxima de 120 no nula
    -- - Columna "hash_clave" que acepta una cadena variable de longitud máxima de 255 no nula. Guarda el hash bcrypt (cost >= 12) de la contraseña. La contraseña en texto plano NUNCA se almacena
    -- - Columna "rol" que puede aceptar uno de 3 valores (no nulo): 'admin', 'gerente' y 'empleado'. Por defecto, tendrá el valor de 'empleado'
    -- - Columna "activo" que acepta un booleano no nulo. Por defecto, tendrá el valor de TRUE. Permite desactivar una cuenta sin borrarla
    -- - Columna "creado_en" que acepta una marca de tiempo con zona horaria no nula. Por defecto, tendrá la fecha y hora actual
    -- - Columna "ultimo_login" que acepta una marca de tiempo con zona horaria. Permite nulos (una cuenta recién creada nunca ha iniciado sesión)

    CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario SERIAL PRIMARY KEY,
        usuario VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(120) NOT NULL,
        hash_clave VARCHAR(255) NOT NULL,
        rol rol_usuario NOT NULL DEFAULT 'empleado',
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ultimo_login TIMESTAMPTZ
    );

    -- Crear la tabla "sesiones"
    -- Se encarga de mantener registro de los refresh tokens emitidos, de forma que una sesión se pueda revocar antes de que expire.
    -- - Columna "id_sesion" que acepta un entero no nulo autoincremental. Marcada como la llave primaria de la tabla
    -- - Columna "fk_id_usuario" que acepta un entero no nulo
    -- - Columna "hash_refresh" que acepta una cadena de longitud fija de 64 no nula. Marcada como única. Guarda el SHA-256 en hexadecimal del refresh token: el token en claro NUNCA se almacena, de modo que una filtración de esta tabla no permita suplantar a nadie
    -- - Columna "expira_en" que acepta una marca de tiempo con zona horaria no nula
    -- - Columna "revocada" que acepta un booleano no nulo. Por defecto, tendrá el valor de FALSE
    -- - Columna "rotada_en" que acepta una marca de tiempo con zona horaria. Permite nulos. Se llena cuando el token se canjea en /auth/refresh, lo que permite distinguir un token "ya usado" (indicio de robo: se revocan todas las sesiones del usuario) de uno simplemente cerrado con /auth/logout
    -- - Columna "creada_en" que acepta una marca de tiempo con zona horaria no nula. Por defecto, tendrá la fecha y hora actual
    -- - Columna "user_agent" que acepta una cadena variable de longitud máxima de 255. Permite nulos
    -- Relación: La columna "fk_id_usuario" es marcada como llave foránea, haciendo referencia a la columna "id_usuario" de la tabla "usuarios". Al borrar un usuario se borran sus sesiones en cascada

    CREATE TABLE IF NOT EXISTS sesiones (
        id_sesion SERIAL PRIMARY KEY,
        fk_id_usuario INT NOT NULL,
        hash_refresh CHAR(64) NOT NULL UNIQUE,
        expira_en TIMESTAMPTZ NOT NULL,
        revocada BOOLEAN NOT NULL DEFAULT FALSE,
        rotada_en TIMESTAMPTZ,
        creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_agent VARCHAR(255),
        FOREIGN KEY (fk_id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones (fk_id_usuario);

    -- Trigger "trg_revocar_sesiones_al_desactivar"
    -- Al desactivar una cuenta (activo pasa de TRUE a FALSE) se revocan automáticamente todas sus sesiones abiertas.
    -- Se implementa en la base de datos (y no solo en la API) para que la regla se cumpla incluso si alguien desactiva la cuenta con un UPDATE manual.
    -- El borrado de un usuario ya está cubierto por el ON DELETE CASCADE de la tabla "sesiones"

    CREATE OR REPLACE FUNCTION revocar_sesiones_al_desactivar()
    RETURNS TRIGGER AS $$
    BEGIN
        UPDATE sesiones
        SET revocada = TRUE
        WHERE fk_id_usuario = NEW.id_usuario AND revocada = FALSE;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_revocar_sesiones_al_desactivar ON usuarios;

    CREATE TRIGGER trg_revocar_sesiones_al_desactivar
    AFTER UPDATE OF activo ON usuarios
    FOR EACH ROW
    WHEN (OLD.activo = TRUE AND NEW.activo = FALSE)
    EXECUTE FUNCTION revocar_sesiones_al_desactivar();

    -- El usuario semilla NO se crea aquí, porque el hash bcrypt se debe calcular en la aplicación.
    -- Para crearlo: npm run seed:usuarios (ver seed/usuarios.js)
