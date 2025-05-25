import mysql.connector
import sys
import argparse
import json

def log_to_mysql(cnx, pid, query, host, user, db, killer, log_db):
    cur = cnx.cursor()
    cur.execute(f"""
        INSERT INTO `{log_db}`.`killed_queries_log`
        (pid, query_text, host, user, database_name, killed_by_user)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (pid, query, host, user, db, killer))
    cur.close()

def find_and_kill_query(host, user, pwd, query_text, killer, log_db, init_db):
    try:
        cnx = mysql.connector.connect(host=host, user=user, password=pwd, database=init_db, autocommit=True)
        cur = cnx.cursor(dictionary=True)
        cur.execute("SHOW FULL PROCESSLIST;")
        processes = cur.fetchall()
        query_text = query_text.rstrip(';')

        for proc in processes:
            info = proc.get('Info')
            if info and query_text in info and proc.get('Command') == 'Query':
                if "show full processlist" in info.lower():
                    continue
                pid = proc['Id']
                cur.execute(f"KILL QUERY {pid}")
                log_to_mysql(cnx, pid, info, proc['Host'], proc['User'], proc['db'], killer, log_db)
                print(json.dumps({
                    "status": "success",
                    "pid": pid,
                    "killed_query": info,
                    "user": proc['User'],
                    "host": proc['Host'],
                    "db": proc['db'],
                    "message": f"Successfully killed PID {pid}"
                }))
                cur.close()
                cnx.close()
                sys.exit(0)

        print(json.dumps({"status": "not_found", "message": f"No query matched: '{query_text}'"}))
        sys.exit(2)

    except mysql.connector.Error as err:
        print(json.dumps({"status": "error", "message": str(err)}))
        sys.exit(1)

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("host")
    p.add_argument("user")
    p.add_argument("password", nargs='?', default='')
    p.add_argument("query_text")
    p.add_argument("--killed_by_user", required=True)
    p.add_argument("--db_name", default=None)
    p.add_argument("--logging_db_name", default="query_killer_db")
    a = p.parse_args()

    if not a.host or not a.user or not a.query_text:
        print(json.dumps({"status": "argument_error", "message": "Missing required arguments."}))
        sys.exit(1)

    find_and_kill_query(a.host, a.user, a.password, a.query_text, a.killed_by_user, a.logging_db_name, a.db_name)