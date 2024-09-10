#!/bin/bash

# Create the ./lib/data directory if it doesn't exist
mkdir -p ./lib/data

# List of files to download and their target paths
declare -A files
files["moves.txt"]="https://raw.githubusercontent.com/infinitefusion/infinitefusion-e18/main/PBS/moves.txt"
files["abilities.txt"]="https://raw.githubusercontent.com/infinitefusion/infinitefusion-e18/main/PBS/abilities.txt"
files["types.txt"]="https://raw.githubusercontent.com/infinitefusion/infinitefusion-e18/main/PBS/types.txt"
files["species.dat"]="https://raw.githubusercontent.com/infinitefusion/infinitefusion-e18/main/Data/species.dat"
files["FusedSpecies.rb"]="https://raw.githubusercontent.com/infinitefusion/infinitefusion-e18/main/Data/Scripts/048_Fusion/FusedSpecies.rb"
files["SplitNames.rb"]="https://raw.githubusercontent.com/infinitefusion/infinitefusion-e18/main/Data/Scripts/048_Fusion/SplitNames.rb"

# Loop through the files and download them
for filename in "${!files[@]}"; do
    url="${files[$filename]}"
    output="./lib/data/$filename"
    
    # Download the file and overwrite if exists
    echo "Downloading $filename from $url..."
    curl -o "$output" "$url"
    
    # Check if the download was successful
    if [ $? -eq 0 ]; then
        echo "$filename successfully downloaded and saved to $output."
    else
        echo "Failed to download $filename."
    fi
done

echo "All files have been processed."
