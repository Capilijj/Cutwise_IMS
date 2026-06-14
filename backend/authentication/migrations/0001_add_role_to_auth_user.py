from django.db import migrations


class Migration(migrations.Migration):
    dependencies = []

    operations = [
        migrations.RunSQL(
            "ALTER TABLE auth_user ADD COLUMN IF NOT EXISTS role varchar(30) DEFAULT 'sales_clerk';",
            reverse_sql="ALTER TABLE auth_user DROP COLUMN IF EXISTS role;",
        ),
    ]
