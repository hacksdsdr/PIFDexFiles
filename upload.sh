#!/bin/bash

# Array of tables to dump
tables=("artists" "base_sprites" "sprites")

# SQLite database file
db_file="data.sqlite"

# Cloudflare D1 database name
d1_db_name="pifdex"

# Function to process SQL file
process_sql_file() {
    local file=$1
    sed -i '1d;2d;$d' "$file"
}

# Function to upload to Cloudflare D1
upload_to_d1() {
    local file=$1
    npx wrangler d1 execute $d1_db_name --remote --file="$file"
}

# Main process
for table in "${tables[@]}"; do
    output_file="${table}_dump.sql"

    # Remove existing dump file if it exists
    if [ -f "$output_file" ]; then
        rm "$output_file"
    fi

    # Dump table
    sqlite3 "$db_file" <<EOF
.output $output_file
.dump $table
.exit
EOF

    # Process the dumped file
    process_sql_file "$output_file"

    # Upload to Cloudflare D1
    upload_to_d1 "$output_file"

    # Remove the dump file after upload
    rm "$output_file"

    echo "Processed and uploaded $table"
done

echo "All tables processed and uploaded successfully"