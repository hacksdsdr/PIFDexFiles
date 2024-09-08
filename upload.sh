#!/bin/bash

# Array of tables to dump and upload
tables=("artists")
# tables=("artists" "base_sprites" "sprites" "game_info")

# SQLite database file
db_file="data.sqlite"

# Cloudflare D1 database name
d1_db_name="pifdex"

# Function to process SQL file (removes headers and footers)
process_sql_file() {
    local file=$1
    echo "Processing SQL file: $file"
    sed -i '1d;2d;$d' "$file" # remove the first two lines and the last line
}

# Function to modify INSERT statements to INSERT OR REPLACE
modify_insert_statements() {
    local file=$1
    echo "Modifying INSERT statements in: $file"
    sed -i 's/INSERT INTO/INSERT OR REPLACE INTO/g' "$file" # change INSERT INTO to INSERT OR REPLACE INTO
}

# Function to modify CREATE TABLE statements to handle existing tables
modify_create_table_statements() {
    local file=$1
    echo "Modifying CREATE TABLE statements in: $file"
    sed -i 's/CREATE TABLE/CREATE TABLE IF NOT EXISTS/g' "$file" # add IF NOT EXISTS to CREATE TABLE statements
}

# Function to upload to Cloudflare D1
upload_to_d1() {
    local file=$1
    echo "Uploading $file to Cloudflare D1..."
    npx wrangler d1 execute $d1_db_name --remote --file="$file"
}

# Main process
for table in "${tables[@]}"; do
    output_file="${table}_dump.sql"
    
    # Remove existing dump file if it exists
    if [ -f "$output_file" ]; then
        echo "Removing existing dump file: $output_file"
        rm "$output_file"
    fi
    
    # Dump table
    echo "Dumping table: $table"
    sqlite3 "$db_file" <<EOF
.output $output_file
.dump $table
.exit
EOF
    
    # Process the dumped file
    process_sql_file "$output_file"
    
    # Modify CREATE TABLE statements to handle existing tables
    modify_create_table_statements "$output_file"
    
    # Modify INSERT statements to handle updates
    modify_insert_statements "$output_file"
    
    # Upload to Cloudflare D1
    upload_to_d1 "$output_file"
    
    # Check if upload was successful
    if [ $? -eq 0 ]; then
        echo "Successfully uploaded $table to Cloudflare D1."
        # Remove the dump file after successful upload
        rm "$output_file"
    else
        echo "Failed to upload $table. Check the error above."
    fi
    
    echo "Processed and uploaded $table"
done

echo "All tables processed and uploaded successfully."