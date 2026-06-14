# Compatibility shim: psycopg2 mock wrapper using pg8000
import urllib.parse as urlparse
import ssl
import pg8000.dbapi

# Expose standard DBAPI 2.0 exceptions from pg8000
Error = pg8000.dbapi.Error
DatabaseError = pg8000.dbapi.DatabaseError
InterfaceError = pg8000.dbapi.InterfaceError
OperationalError = pg8000.dbapi.OperationalError
ProgrammingError = pg8000.dbapi.ProgrammingError
IntegrityError = pg8000.dbapi.IntegrityError
InternalError = pg8000.dbapi.InternalError

def connect(dsn=None, **kwargs):
    """
    Mock psycopg2.connect by parsing the DSN if it is a PostgreSQL connection URL
    and passing the parsed arguments to pg8000.dbapi.connect.
    """
    if dsn and (dsn.startswith("postgresql://") or dsn.startswith("postgres://")):
        url = urlparse.urlparse(dsn)
        username = url.username
        password = url.password
        database = url.path[1:] if url.path else None
        hostname = url.hostname
        port = url.port or 5432
        
        # Handle SSL parameters
        ssl_context = None
        if "sslmode=require" in dsn or "sslmode=require" in url.query:
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
        return pg8000.dbapi.connect(
            user=username,
            password=password,
            host=hostname,
            database=database,
            port=port,
            ssl_context=ssl_context,
            **kwargs
        )
    return pg8000.dbapi.connect(dsn=dsn, **kwargs)
