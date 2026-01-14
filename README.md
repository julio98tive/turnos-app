# Aplicación de Gestión de Turnos Rotativos

Una aplicación web completa para la asignación y notificación de turnos rotativos, diseñada para optimizar la comunicación entre administradores, ingenieros y agentes. Construida con React y Firebase, la plataforma permite una gestión eficiente del personal y automatiza los recordatorios y las asignaciones.

## ✨ Características Principales

-   **Autenticación y Roles:** Sistema de usuarios con roles (Admin, Ingeniero, Agente) para un acceso controlado.
-   **Calendario Visual:** Interfaz de calendario interactiva para visualizar los turnos asignados por mes, semana o día.
-   **Asignación de Turnos:** Creación de turnos de forma individual directamente desde la interfaz.
-   **Carga Masiva (CSV):** Funcionalidad para asignar cientos de turnos de una sola vez mediante la subida de un archivo CSV.
-   **Notificaciones Automáticas:** Envío de notificaciones por Email y Telegram para:
    -   Asignación de nuevos turnos (tanto individuales como masivos).
    -   Recordatorios automáticos de turnos próximos (24h para Agentes, 48h para Ingenieros).
    -   Notificación a todos los administradores sobre cada nuevo turno creado en el sistema.

## 🚀 Tech Stack

-   **Frontend:** React, Vite, TypeScript, Firebase SDK, `react-big-calendar`
-   **Backend:** Firebase Functions (Node.js v20, TypeScript)
-   **Base de Datos:** Cloud Firestore (NoSQL)
-   **Hosting:** Firebase Hosting
-   **Autenticación:** Firebase Authentication
-   **Notificaciones:** Nodemailer (para Email), Telegram Bot API

## 📂 Estructura del Proyecto

```
/
├── functions/      # Código del Backend (Cloud Functions)
│   ├── src/
│   └── package.json
├── public/         # Archivos estáticos (íconos, plantilla CSV)
├── src/            # Código del Frontend (React)
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   └── App.tsx
└── firebase.json   # Configuración de Firebase
```

## 🛠️ Instalación y Puesta en Marcha

Sigue estos pasos para configurar y ejecutar el proyecto en un entorno de desarrollo local.

### Prerrequisitos

-   Node.js (v20 o superior)
-   `npm` (o `yarn` / `pnpm`)
-   **Firebase CLI:** Instálalo globalmente con `npm install -g firebase-tools`.
-   Un proyecto de **Firebase** creado en [firebase.google.com](https://firebase.google.com/).

### Pasos de Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd <NOMBRE_DEL_PROYECTO>
    ```

2.  **Instalar dependencias del Frontend:**
    ```bash
    npm install
    ```

3.  **Instalar dependencias del Backend:**
    ```bash
    cd functions
    npm install
    cd ..
    ```

4.  **Configurar Firebase en el proyecto:**
    -   Inicia sesión en Firebase: `firebase login`.
    -   Conecta tu proyecto local con tu proyecto de Firebase: `firebase use --add` y selecciona el ID de tu proyecto.

5.  **Configurar las variables de entorno (Backend):**
    -   Navega a la carpeta `functions`.
    -   Crea un archivo llamado `.env`.
    -   Añade las siguientes claves, reemplazando los valores con tus credenciales. Estas son necesarias para el envío de notificaciones.
        ```
        SMTP_USER="tu_correo_smtp@example.com"
        SMTP_PASSWORD="tu_password_smtp"
        TELEGRAM_BOT_TOKEN="el_token_de_tu_bot_de_telegram"
        ```

## 📜 Comandos Disponibles

-   **Ejecutar el Frontend (Desarrollo):**
    ```bash
    npm run dev
    ```

-   **Construir el Frontend (Producción):**
    ```bash
    npm run build
    ```
    Esto generará una carpeta `dist` con los archivos optimizados.

-   **Desplegar en Firebase:**
    ```bash
    # Desplegar únicamente el Frontend
    firebase deploy --only hosting

    # Desplegar únicamente el Backend (Cloud Functions)
    firebase deploy --only functions

    # Desplegar todo
    firebase deploy
    ```

## 📄 Carga Masiva de Turnos (Formato CSV)

Para asignar turnos de forma masiva, puedes subir un archivo CSV desde la aplicación. El archivo debe tener las siguientes columnas y formato:

-   `userId`: El correo electrónico del usuario al que se le asigna el turno.
-   `fecha`: La fecha del turno en formato `YYYY-MM-DD`.
-   `turno`: El tipo de turno. Los valores aceptados son `DIA`, `TARDE`, `NOCHE`.

Puedes encontrar un archivo de ejemplo en `public/plantilla_turnos.csv`.

**Ejemplo de contenido:**

```csv
userId,fecha,turno
ejemplo.agente@correo.com,2024-08-15,DIA
ejemplo.agente2@correo.com,2024-08-15,TARDE
ejemplo.ingeniero@correo.com,2024-08-16,NOCHE
```
