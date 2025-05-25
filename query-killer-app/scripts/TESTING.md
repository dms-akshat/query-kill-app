# Manual Testing Guide for `kill_mysql_query.py`

This document outlines manual test scenarios for the `kill_mysql_query.py` script.

## Prerequisites

*   A running MySQL server instance.
*   Python 3 and `mysql-connector-python` library installed.
*   Access to execute queries on the MySQL server with different users (one with kill permissions, one without for specific tests).
*   The `kill_mysql_query.py` script.

## Test Scenarios

### Scenario 1: Successful Connection and Query Termination

*   **Setup:**
    *   MySQL server running and accessible.
    *   Execute a long-running query (e.g., `SELECT SLEEP(100);`) using a MySQL client, connected as a user that the script will also use. This user must have permission to kill its own queries.
*   **Command:**
    ```bash
    python kill_mysql_query.py --host <your_host> <your_user> <your_password> "SELECT SLEEP"
    ```
    (Replace `<your_host>`, `<your_user>`, `<your_password>` with actual credentials)
*   **Expected Outcome:**
    1.  The script prints a message identifying the `SELECT SLEEP` query with its details (PID, User, Host, DB, Command, Time, State, Info).
    2.  The script prints a message like: "Attempting to kill query with PID: <pid>, User: <user>, Host: <host_details>, Command: Query, ..., Info: SELECT SLEEP(100)".
    3.  The script prints a success message: "Successfully sent KILL command for PID <pid>."
    4.  The `SELECT SLEEP(100);` query is terminated on the MySQL server (verify in your MySQL client).

### Scenario 2: Failed Connection - Incorrect Host

*   **Setup:**
    *   Ensure no MySQL server is running at `nonexistentmysqlhost` or that it's an invalid/unreachable hostname.
*   **Command:**
    ```bash
    python kill_mysql_query.py --host nonexistentmysqlhost <your_user> <your_password> "some_query"
    ```
*   **Expected Outcome:**
    *   The script prints the error message: "Error: Could not connect to MySQL host 'nonexistentmysqlhost'. Please check the hostname, port, and that the MySQL server is running. Details: <specific mysql.connector error message, e.g., 2005 (HY000): Unknown MySQL server host 'nonexistentmysqlhost' ...>".
    *   The script exits with a non-zero status.

### Scenario 3: Failed Connection - MySQL Server Down

*   **Setup:**
    *   Use valid MySQL connection details for a host where the MySQL server process is confirmed to be stopped.
*   **Command:**
    ```bash
    python kill_mysql_query.py --host <your_host_but_server_down> <your_user> <your_password> "some_query"
    ```
*   **Expected Outcome:**
    *   The script prints an error message similar to Scenario 2, indicating connection failure. The specific error detail will likely be a connection refused error (e.g., "Details: 2003 (HY000): Can't connect to MySQL server on '<your_host_but_server_down>'...").
    *   The script exits with a non-zero status.

### Scenario 4: Query Not Found

*   **Setup:**
    *   MySQL server running and accessible.
    *   Ensure no query containing the string "non_existent_query_string" is running.
*   **Command:**
    ```bash
    python kill_mysql_query.py --host <your_host> <your_user> <your_password> "non_existent_query_string"
    ```
*   **Expected Outcome:**
    *   The script connects, searches for processes, and then prints: "No active query found matching: 'non_existent_query_string'".

### Scenario 5: Attempting to Kill Query - Lacking Permissions

*   **Setup:**
    *   MySQL server running.
    *   Using a MySQL client, connect as a privileged user (e.g., `root`) and execute a long-running query (e.g., `SELECT SLEEP(100) AS root_query;`).
    *   The script will be run by a *different* MySQL user (`<user_without_kill_perms>`) who does not have `SUPER` or `CONNECTION_ADMIN` privileges and is not the owner of the `root_query`.
*   **Command:**
    ```bash
    python kill_mysql_query.py --host <your_host> <user_without_kill_perms> <password_for_that_user> "SELECT SLEEP(100) AS root_query"
    ```
*   **Expected Outcome:**
    1.  The script connects and identifies the target query run by the privileged user.
    2.  When attempting to kill, it prints the specific error: "Error: Cannot kill query PID <pid>. The user '<user_without_kill_perms>' does not have permission to kill this query (MySQL Error 1095: You are not owner of thread). Ensure the user has SUPER or CONNECTION_ADMIN privileges."
    3.  The script exits with a non-zero status.
    4.  The target query (`SELECT SLEEP(100) AS root_query;`) continues running (verify in MySQL).

### Scenario 6: Query Finishes Before Kill

*   **Setup:**
    *   MySQL server running and accessible.
    *   **Option A (Timing critical):** Be prepared to quickly execute the script after starting a very short query.
    *   **Option B (More reliable):**
        1.  In one MySQL client session (Session A), execute a moderately long query like `SELECT SLEEP(10);`. Note its Process ID from `SHOW PROCESSLIST;`.
        2.  Run the `kill_mysql_query.py` script targeting this query text.
        3.  *After* the script prints "Found matching query..." and "Attempting to kill query...", but *before* you expect it to have sent the `KILL` command, manually kill the query from another MySQL client session (Session B) using `KILL <pid>;`.
*   **Command:**
    ```bash
    python kill_mysql_query.py --host <your_host> <your_user> <your_password> "SELECT SLEEP(10)" 
    ```
    (Or `SELECT 1` if attempting Option A, though this is very hard to test reliably for this case).
*   **Expected Outcome:**
    *   The script connects and identifies the query (if it's still running).
    *   If the query finishes or is killed by another means *after* being found but *before* the script's `KILL` command is processed by the server, the script prints: "Info: Query PID <pid> could not be killed as it was not found (MySQL Error 1094: Unknown thread id). It might have already finished."
    *   The script will likely exit with status 1 due to the current implementation.

### Scenario 7: Interactive Host Input

*   **Setup:**
    *   MySQL server running and accessible.
*   **Command:**
    ```bash
    python kill_mysql_query.py --user <your_user> --password <your_password> "SELECT SLEEP"
    ```
    (Note the missing `--host` argument. Provide a long-running query to observe the full behavior.)
*   **Expected Outcome:**
    1.  The script prompts: "Please enter the MySQL server host: ".
    2.  User types in the correct hostname (e.g., `localhost`) and presses Enter.
    3.  The script then proceeds as in Scenario 1 (assuming a `SELECT SLEEP` query is running and killable by `<your_user>`). It finds the query, attempts to kill it, and reports success.

### Scenario 8: Interactive Host Input - EOF/Non-interactive environment

*   **Setup:**
    *   Prepare to run the script in a way that `input()` would cause an `EOFError`.
*   **Command:**
    ```bash
    echo "" | python kill_mysql_query.py --user <your_user> <your_password> "query_text"
    ```
    (Alternatively, `python kill_mysql_query.py --user <your_user> <your_password> "query_text" < /dev/null`)
*   **Expected Outcome:**
    *   The script prints the error message: "\nError: Host not provided and no input available for prompt." (This is the current message for `EOFError`).
    *   The script prints the help message.
    *   The script exits with a non-zero status.

This guide should help in manually verifying the functionality of `kill_mysql_query.py`. Remember to replace placeholder values like `<your_host>`, `<your_user>`, `<your_password>`, and query strings with actual values relevant to your test environment.
