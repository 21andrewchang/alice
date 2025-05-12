#!/bin/bash

# Prompt user
read -p "Enter subdirectory (e.g., nlp or cv): " subdir
# Validate directory exists
if [ ! -d "$subdir" ]; then
  echo "Error: '$subdir' directory not found."
  exit 1
fi

cd "$subdir" || exit 1

# Check for links.txt
if [ ! -f "links.txt" ]; then
  echo "Error: links.txt not found in $subdir/"
  exit 1
fi

output="metadata.csv"
echo "id,link,transcript_path" > "$output"

# Read links
mapfile -t links < links.txt

# Collect transcript files (excluding links.txt itself)
files=( $(ls *.txt | grep -v 'links.txt' | sort) )

# Sanity check
if [ "${#links[@]}" -ne "${#files[@]}" ]; then
  echo "Error: ${#links[@]} links but ${#files[@]} transcript files."
  exit 1
fi

# Write rows to metadata.csv
for i in "${!files[@]}"; do
  id="${files[$i]%%.txt}"  # strip .txt
  rel_path="alice/rec_alg/transcripts/$subdir/${files[$i]}"
  echo "$id,${links[$i]},$rel_path" >> "$output"
done

echo "✅ metadata.csv created in $subdir/"
