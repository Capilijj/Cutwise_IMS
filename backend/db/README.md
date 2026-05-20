# Local Docker Postgres DB Setup

This folder contains the local PostgreSQL schema and seed data for the OTTO IMS web system.

## Files

- `init.sql` — creates the local tables used by the system
- `seed.sql` — sample seed data to populate the tables

## Import into Docker Postgres

The Docker service is `otto_shoes_db` and the local database is `otto_ims`.

### Import schema

```powershell
docker cp backend/db/init.sql otto_shoes_db:/tmp/init.sql
docker exec -i otto_shoes_db psql -U otto_admin -d otto_ims -f /tmp/init.sql
```

### Import sample data

```powershell
docker cp backend/db/seed.sql otto_shoes_db:/tmp/seed.sql
docker exec -i otto_shoes_db psql -U otto_admin -d otto_ims -f /tmp/seed.sql
```

## Import a Supabase dump

If you export a Supabase dump file named `supabase_dump.sql`, import it like this:

```powershell
docker cp supabase_dump.sql otto_shoes_db:/tmp/supabase_dump.sql
docker exec -i otto_shoes_db psql -U otto_admin -d otto_ims -f /tmp/supabase_dump.sql
```

If your Docker container or database names change, update the commands accordingly.
