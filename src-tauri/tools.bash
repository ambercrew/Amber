#!/bin/bash

# Function to display the menu
show_menu() {
    clear
    echo "================================================"
    echo "            SQLx Management Script"
    echo "================================================"
    echo "1. Create .env file/apply latest migration"
    echo "2. Exit"
    echo "================================================"
}

# Function to create .env file
create_env_file_apply_migration() {
    db_path="$(pwd)/temp.db"
    if [ ! -f ".env" ]; then
        env_content="DATABASE_URL=\"sqlite:///$db_path?mode=rwc\""
        echo "$env_content" > .env
        echo "✅ .env file created"
    fi

    if [ -f "$db_path" ]; then
        rm "$db_path"
    fi

    sqlx migrate run --source brainy_core/db
    echo "✅ migration is applied to $db_path"
}

show_menu
echo -n "Please select an option (1-3): "
read -r choice

case $choice in
    1)
        create_env_file_apply_migration
        ;;
    2)
        exit 0
        ;;
    *)
        echo "❌ Invalid option. Please select 1, or 2"
        echo
        ;;
esac
