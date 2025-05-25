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

        found_pid = None
        for proc in processes:
            # proc['Info'] contains the query text or command
            # proc['User'] and proc['Host'] can also be checked if needed
            # We are looking for queries, not sleep processes or system processes
            if proc['Info'] and query_text_to_find.lower() in proc['Info'].lower() and proc['Command'] == 'Query':
                # Avoid killing the process running "SHOW FULL PROCESSLIST" itself if it matches
                if "show full processlist" not in proc['Info'].lower():
                    found_pid = proc['Id']
                    print(f"Found matching query (PID: {found_pid}): {proc['Info']}", file=sys.stdout)
                    break
        
        if found_pid:
            try:
                kill_query_sql = f"KILL {found_pid};"
                cursor.execute(kill_query_sql)
                cnx.commit() # Some KILL operations might need a commit or just run implicitly
                print(f"Successfully sent KILL command for PID {found_pid}.", file=sys.stdout)
            except mysql.connector.Error as kill_err:
                # Common errors:
                # 1095: You are not owner of thread
                # 1094: Unknown thread id. (Query finished before KILL)
                print(f"Error trying to kill query (PID: {found_pid}): {kill_err}", file=sys.stderr)
                sys.exit(1) # Exit with error if kill fails
        else:
            print(f"No active query found matching: '{query_text_to_find}'", file=sys.stdout)

    except mysql.connector.Error as err:
        print(f"MySQL Connection Error: {err}", file=sys.stderr)
        sys.exit(1) # Exit with error if connection fails
    finally:
        if 'cnx' in locals() and cnx.is_connected():
            cursor.close()
            cnx.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Find and kill a MySQL query.")
    parser.add_argument("host", help="MySQL server host")
    parser.add_argument("user", help="MySQL user")
    parser.add_argument("password", help="MySQL password (can be empty if not set)", nargs='?', default='')
    parser.add_argument("query_text", help="The SQL query text (or part of it) to find")

    args = parser.parse_args()

    # Basic validation
    if not args.host or not args.user or not args.query_text:
        print("Error: Host, user, and query_text arguments are required.", file=sys.stderr)
        parser.print_help()
        sys.exit(1)

    find_and_kill_query(args.host, args.user, args.password, args.query_text)
