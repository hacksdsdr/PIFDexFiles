#!/bin/bash

# Define the directories
GRAPHICS_DIR="./graphics"
TEMP_DIR="./temp_graphics"
GAME_DIR="./game"
AUTOGEN_REPO="https://gitlab.com/pokemoninfinitefusion/autogen-fusion-sprites.git"
CUSTOM_REPO="https://gitlab.com/pokemoninfinitefusion/customsprites.git"
GAME_REPO="https://github.com/infinitefusion/infinitefusion-e18.git"

# Delete the graphics and temp directories before starting to ensure clean slate
echo "Deleting $GRAPHICS_DIR and $TEMP_DIR..."
rm -rf "$GRAPHICS_DIR"
rm -rf "$TEMP_DIR"

# Recreate the graphics directory
mkdir -p "$GRAPHICS_DIR"

# Define final folder structure
BASE_DIR="$GRAPHICS_DIR/base"
FUSION_DIR="$GRAPHICS_DIR/fusions"
TRIPLE_DIR="$GRAPHICS_DIR/triples"
AUTOGEN_DIR="$GRAPHICS_DIR/autogen"
CSV_FILE="$GRAPHICS_DIR/Sprite Credits.csv"

# Create necessary directories
mkdir -p "$BASE_DIR" "$FUSION_DIR" "$TRIPLE_DIR" "$AUTOGEN_DIR"

# Create a temporary directory
mkdir -p "$TEMP_DIR"

# Clone the repositories into the temporary directory
echo "Cloning autogen-fusion-sprites repository into temp directory..."
git clone "$AUTOGEN_REPO" "$TEMP_DIR/autogen"

echo "Cloning customsprites repository into temp directory..."
git clone "$CUSTOM_REPO" "$TEMP_DIR/custom"

# Remove the .git directories to avoid any conflicts
echo "Removing .git directories from cloned repositories..."
rm -rf "$TEMP_DIR/autogen/.git"
rm -rf "$TEMP_DIR/custom/.git"

# Copy CSV file
echo "Copying CSV file..."
cp "$TEMP_DIR/custom/Sprite Credits.csv" "$CSV_FILE"

# Function to move files quickly
move_files() {
    local source_dir=$1
    local target_dir=$2

    echo "Moving files from $source_dir to $target_dir..."
    
    find "$source_dir" -type f -print0 | xargs -0 -I {} mv {} "$target_dir"
}

# Move custom base, fusion, and triple sprites
echo "Moving custom base sprites..."
move_files "$TEMP_DIR/custom/Other/BaseSprites/" "$BASE_DIR"

echo "Moving custom fusion sprites..."
move_files "$TEMP_DIR/custom/CustomBattlers/" "$FUSION_DIR"

echo "Moving custom triple sprites..."
move_files "$TEMP_DIR/custom/Other/Triples/" "$TRIPLE_DIR"

# Move all autogen sprites (flattening the structure)
echo "Moving and flattening autogen sprites..."
move_files "$TEMP_DIR/autogen" "$AUTOGEN_DIR"

# Clone the game repository
echo "Cloning infinitefusion-e18 repository..."
git clone "$GAME_REPO" "$TEMP_DIR/infinitefusion-e18"

# Remove the .git directory from the game repository
echo "Removing .git directory from game repository..."
rm -rf "$TEMP_DIR/infinitefusion-e18/.git"

# Function to copy all graphics subfolders to the game directory
copy_graphics() {
    local source_dir=$1
    local target_dir=$2

    echo "Copying graphics from $source_dir to $target_dir..."
    
    find "$source_dir" -type d -exec mkdir -p "$target_dir/{}" \;
    find "$source_dir" -type f -print0 | xargs -0 -I {} cp {} "$target_dir"
}

# Copy all graphics from the game repo to the game directory
echo "Copying game graphics..."
copy_graphics "$TEMP_DIR/infinitefusion-e18/Graphics" "$GAME_DIR"

# Clean up the temporary directory
echo "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo "All tasks completed successfully."
