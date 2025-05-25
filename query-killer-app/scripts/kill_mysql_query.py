import mysql.connector
import sys
import argparse

def find_and_kill_query(host, user, password, query_text_to_find):
    try:
        # Establish a connection to the MySQL server
        cnx = mysql.connector.connect(
            host=host,
            user=user,
            password=password
            # database=database # Optional: specify database if needed for connection
        )
        cursor = cnx.cursor(dictionary=True) # Use dictionary cursor for easy column access

        # Get the list of current processes
        cursor.execute("SHOW FULL PROCESSLIST;")
        processes = cursor.fetchall()

        # Normalize the query text by removing a trailing semicolon
        normalized_query_text_to_find = query_text_to_find.rstrip(';')

        found_pid = None
        target_proc_details = None
        for proc in processes:
            # proc['Info'] contains the query text or command
            # proc['User'] and proc['Host'] can also be checked if needed
            # We are looking for queries, not sleep processes or system processes
            if proc['Info'] and normalized_query_text_to_find.lower() in proc['Info'].lower() and proc['Command'] == 'Query':
                # Avoid killing the process running "SHOW FULL PROCESSLIST" itself if it matches
                if "show full processlist" not in proc['Info'].lower():
                    found_pid = proc['Id']
                    target_proc_details = proc
                    # Informational print about the found query, before deciding to kill.
                    # This was previously done but let's ensure it's clear this is the *found* query, not yet the *attempted kill* query.
                    print(f"Found matching query (PID: {found_pid}): User: {proc['User']}, Host: {proc['Host']}, DB: {proc['db']}, Command: {proc['Command']}, Time: {proc['Time']}, State: {proc['State']}, Info: {proc['Info']}", file=sys.stdout)
                    break
        
        if found_pid and target_proc_details:
            # Clarification printout before attempting to kill
            print(f"Attempting to kill query with PID: {found_pid}, User: {target_proc_details['User']}, Host: {target_proc_details['Host']}, Command: {target_proc_details['Command']}, Time: {target_proc_details['Time']}, State: {target_proc_details['State']}, Info: {target_proc_details['Info']}", file=sys.stdout)
            try:
                kill_query_sql = f"KILL {found_pid};"
                cursor.execute(kill_query_sql)
                # cnx.commit() # Removed: KILL is generally non-transactional and auto-committing.
                print(f"Successfully sent KILL command for PID {found_pid}.", file=sys.stdout)
            except mysql.connector.Error as kill_err:
                if kill_err.errno == 1095: # ER_NOT_OWNER_OF_THREAD
                    print(f"Error: Cannot kill query PID {found_pid}. The user '{user}' does not have permission to kill this query (MySQL Error 1095: You are not owner of thread). Ensure the user has SUPER or CONNECTION_ADMIN privileges.", file=sys.stderr)
                elif kill_err.errno == 1094: # ER_UNKNOWN_THREAD_ID
                    print(f"Info: Query PID {found_pid} could not be killed as it was not found (MySQL Error 1094: Unknown thread id). It might have already finished.", file=sys.stdout)
                else:
                    print(f"Error trying to kill query PID {found_pid}: {kill_err}", file=sys.stderr)
                sys.exit(1) # Exit with error if kill fails or specific info message for 1094
        else:
            print(f"No active query found matching: '{normalized_query_text_to_find}' (original input: '{query_text_to_find}')", file=sys.stdout)

    except mysql.connector.Error as err:
        print(f"Error: Could not connect to MySQL host '{host}'. Please check the hostname, port, and that the MySQL server is running. Details: {err}", file=sys.stderr)
        sys.exit(1) # Exit with error if connection fails
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Find and kill a MySQL query.")
    parser.add_argument("--host", help="MySQL server host")
    parser.add_argument("user", help="MySQL user")
    parser.add_argument("password", help="MySQL password (can be empty if not set)", nargs='?', default='')
    parser.add_argument("query_text", help="The SQL query text (or part of it) to find")

    args = parser.parse_args()

    current_host = args.host
    if not current_host:
        try:
            current_host = input("Please enter the MySQL server host: ")
        except EOFError: # Handle cases where input() receives EOF, e.g. in non-interactive environments
            print("\nError: Host not provided and no input available for prompt.", file=sys.stderr)
            parser.print_help()
            sys.exit(1)


    # Basic validation
    if not current_host or not args.user or not args.query_text:
        print("Error: Host, user, and query_text arguments are required.", file=sys.stderr)
        parser.print_help()
        sys.exit(1)

    find_and_kill_query(current_host, args.user, args.password, args.query_text)
