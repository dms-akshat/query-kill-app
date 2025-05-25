# SQL Query Killer Application

This application allows users to connect to a MySQL database, find a specific SQL query running on the server, and terminate (kill) it. It consists of a React frontend, a Node.js backend, and a Python script for MySQL interaction.

## Project Structure

```
query-killer-app/
├── backend/              # Node.js (Express) application
│   ├── node_modules/
│   ├── package.json
│   ├── package-lock.json
│   └── server.js         # Backend API server
├── frontend/             # React application
│   ├── node_modules/
│   ├── public/
│   ├── src/              # React components and logic
│   │   ├── App.js
│   │   └── QueryKillerForm.js
│   ├── package.json
│   └── package-lock.json
└── scripts/              # Python scripts
    └── kill_mysql_query.py # Python script to interact with MySQL
└── README.md             # This file
```

## Prerequisites

*   Node.js and npm (for frontend and backend)
*   Python 3.x (for the script)
*   Access to a MySQL server that you want to manage.

## Setup Instructions

1.  **Clone the Repository (if applicable) or Create Project Manually:**
    If you've cloned this, navigate to the `query-killer-app` directory. Otherwise, ensure the structure above is met.

2.  **Backend Setup:**
    *   Navigate to the `backend` directory: `cd backend`
    *   Install dependencies: `npm install`

3.  **Frontend Setup:**
    *   Navigate to the `frontend` directory: `cd ../frontend` (if you were in `backend`) or `cd frontend` (from root)
    *   Install dependencies: `npm install`

4.  **Python Script Setup:**
    *   Ensure Python 3 is installed.
    *   Install the required Python library:
        ```bash
        pip install mysql-connector-python
        ```
    *   **Security Note:** The Python script (`scripts/kill_mysql_query.py`) takes MySQL credentials (host, user, password) as command-line arguments. In a production environment, never hardcode credentials or pass them insecurely. Consider using environment variables, a secure vault solution, or configuration files with restricted permissions to manage database credentials. The current setup is for ease of development and testing. The MySQL user provided will need `PROCESS` and `SUPER` (or `CONNECTION_ADMIN`) privileges to view and kill queries.

## How to Run the Application

1.  **Start the Backend Server:**
    *   Navigate to the `backend` directory: `cd backend` (or `cd ../backend` from frontend)
    *   Start the server: `node server.js`
    *   The backend will typically run on `http://localhost:3001`.

2.  **Start the Frontend Application:**
    *   In a new terminal, navigate to the `frontend` directory: `cd frontend`
    *   Start the React development server: `npm start`
    *   The application will typically open in your browser at `http://localhost:3000`.

3.  **Using the Application:**
    *   Open your browser to `http://localhost:3000`.
    *   Select the target MySQL host from the dropdown.
    *   Enter the MySQL username.
    *   Enter the MySQL password (if required for the user).
    *   Enter a distinctive part of the SQL query you want to find and kill in the "SQL Query to Find & Kill" text area.
    *   Click the "Find and Kill Query" button.
    *   The application will display a success or error message.

## How it Works

1.  The React frontend captures the host, credentials, and query text.
2.  It sends this information to the Node.js backend API (`/api/kill-query`).
3.  The Node.js backend executes the `scripts/kill_mysql_query.py` Python script, passing the received details as command-line arguments.
4.  The Python script connects to the specified MySQL server, runs `SHOW FULL PROCESSLIST` to find the query that contains the provided text (case-insensitive match).
5.  If a matching query is found (and it's not the `SHOW FULL PROCESSLIST` query itself), the script issues a `KILL <PID>` command.
6.  The Python script prints success or error messages to its standard output/error streams.
7.  The Node.js backend captures these messages and sends them back to the React frontend as a JSON response.
8.  The frontend displays the message to the user.

## Known Limitations & Assumptions

*   **Security:** As mentioned, credential handling is basic. For production, enhance security for MySQL credentials.
*   **MySQL Privileges:** The MySQL user needs `PROCESS` and `SUPER` (or `CONNECTION_ADMIN` on newer MySQL versions) privileges. `PROCESS` is needed to see all queries, and `SUPER`/`CONNECTION_ADMIN` is needed to kill queries belonging to other users.
*   **Python Path:** The backend `server.js` assumes `python3` is the command to execute Python 3.x scripts and is in the system's PATH. Adjust if your environment uses `python` or a specific path.
*   **Error Handling:** Error handling is implemented, but complex MySQL error codes or edge cases might require more specific handling.
*   **Query Matching:** The Python script does a case-insensitive substring match for the query text within the `Info` field of the `PROCESSLIST`. This might occasionally match unintended queries if the search string is too generic.
*   **Host Selector:** The host list in the frontend is currently hardcoded. For a more dynamic setup, this could be fetched from a configuration file or an external service.
```
