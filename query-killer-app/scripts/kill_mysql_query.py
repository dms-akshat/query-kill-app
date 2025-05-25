import mysql.connector
import sys
import argparse
import json

def log_to_mysql(cnx, pid, query_text, host, user, db_name_from_process, killed_by_user_arg, logging_db_name_arg):
    try:
        log_cursor = cnx.cursor()
        sql = f"INSERT INTO `{logging_db_name_arg}`.`killed_queries_log` (pid, query_text, host, user, database_name, killed_by_user) VALUES (%s, %s, %s, %s, %s, %s)"
        log_data = (pid, query_text, host, user, db_name_from_process, killed_by_user_arg)
        log_cursor.execute(sql, log_data)
        cnx.commit()
        log_cursor.close()
    except mysql.connector.Error as log_err:
        print(f"MySQL Logging Error: Failed to log killed query PID {pid} to MySQL table `{logging_db_name_arg}`.`killed_queries_log`: {log_err}", file=sys.stderr)

def find_and_kill_query(host, user, password, query_text_to_find, killed_by_user_arg, logging_db_name_arg, initial_db_name_arg):
    cnx = None
    cursor = None 
    try:
        cnx = mysql.connector.connect(
            host=host, user=user, password=password, database=initial_db_name_arg, autocommit=False
        )
        cursor = cnx.cursor(dictionary=True)
        
        cursor.execute("SHOW FULL PROCESSLIST;")
        processes = cursor.fetchall()
        found_pid = None
        killed_query_details = {}
        query_text_to_find = query_text_to_find.rstrip(';')
        for proc in processes:
            # check 'Command' field to ensure it's a 'Query'
            if proc.get('Info') and query_text_to_find.lower() in proc['Info'].lower() and proc.get('Command') == 'Query':
                # Avoid killing the process running "SHOW FULL PROCESSLIST" itself
                if "show full processlist" not in proc['Info'].lower():
                    found_pid = proc.get('Id')
                    killed_query_details = proc
                    break
        
        if found_pid:
            try:
                kill_query_sql = f"KILL QUERY {found_pid};"
                cursor.execute(kill_query_sql)
                cursor.close()

                log_to_mysql(cnx, found_pid, killed_query_details.get('Info'), killed_query_details.get('Host'), 
                             killed_query_details.get('User'), killed_query_details.get('db'), 
                             killed_by_user_arg, logging_db_name_arg)
                
                success_payload = {
                    "status": "success", "pid": found_pid, 
                    "killed_query": killed_query_details.get('Info'), 
                    "user": killed_query_details.get('User'), 
                    "host": killed_query_details.get('Host'), 
                    "db": killed_query_details.get('db'), 
                    "message": f"Successfully sent KILL command for PID {found_pid}."
                }
                print(json.dumps(success_payload), file=sys.stdout)
            
            except mysql.connector.Error as kill_err:
                # This error is for the KILL command itself
                error_payload = {"status": "error", "pid": found_pid, 
                                 "message": f"Error trying to kill query (PID: {found_pid}): {kill_err}"}
                print(json.dumps(error_payload), file=sys.stdout)
        else:
            not_found_payload = {"status": "not_found", 
                                 "message": f"No active query found matching: '{query_text_to_find}'"}
            print(json.dumps(not_found_payload), file=sys.stdout)

    except mysql.connector.Error as conn_err:
        conn_error_payload = {"status": "connection_error", "message": f"MySQL Connection Error: {conn_err}"}
        # Important: Print to stdout as per existing contract for connection errors
        print(json.dumps(conn_error_payload), file=sys.stdout)
    finally:
        if cursor: 
            # Check if cursor is_closed before trying to close, to avoid errors if already closed
            if not cursor.is_closed():
                cursor.close()
        if cnx and cnx.is_connected():
            cnx.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Find and kill a MySQL query, logging details to a MySQL database.",
        epilog="Prerequisites: MySQL user needs PROCESS, SUPER/CONNECTION_ADMIN, and INSERT privileges on the logging table."
    )
    parser.add_argument("host", help="MySQL server host")
    parser.add_argument("user", help="MySQL user")
    parser.add_argument("password", help="MySQL password (can be empty if not set)", nargs='?', default='')
    parser.add_argument("query_text", help="The SQL query text (or part of it) to find")
    
    parser.add_argument("--killed_by_user", required=True, help="User performing the kill action (for logging)")
    parser.add_argument("--db_name", default=None, 
                        help="Optional: Specific MySQL database to connect to initially. Does not affect SHOW FULL PROCESSLIST.")
    parser.add_argument("--logging_db_name", default="query_killer_db", 
                        help="Database name where the 'killed_queries_log' table resides (default: query_killer_db).")
    
    args = parser.parse_args()

    # Basic validation for essential arguments (argparse handles --killed_by_user)
    if not args.host or not args.user or not args.query_text:
        # Output error as JSON to stdout, consistent with other error outputs
        error_payload = {
            "status": "argument_error",
            "message": "Host, user, and query_text arguments are required and cannot be empty."
        }
        print(json.dumps(error_payload), file=sys.stdout)
        # parser.print_help() # Optionally print help
        sys.exit(1) # Exit with an error code

    find_and_kill_query(args.host, args.user, args.password, args.query_text, 
                        args.killed_by_user, args.logging_db_name, args.db_name)
