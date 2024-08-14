import fs from 'fs';

// Your GitLab access token
const token = 'glpat-jPtFysavctUs8J5yzs3x';

// GitLab project details
const projectId = encodeURIComponent('pokemoninfinitefusion/customsprites'); // URL-encoded project path
const directoryPath = 'CustomBattlers';
const branch = 'master';
const apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/tree`;

// Function to fetch files recursively
async function fetchFiles(path = directoryPath, page = 1) {
    try {
        const response = await fetch(`${apiUrl}?path=${path}&ref=${branch}&per_page=1000&page=${page}&recursive=true`, {
            headers: {
                'PRIVATE-TOKEN': token
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const files = await response.json();

        // Log the files from the current page
        console.log(`Fetched ${files.length} files from page ${page}`);

        const nextPage = response.headers.get('x-next-page');
        if (nextPage) {
            const nextPageFiles = await fetchFiles(path, nextPage);
            return files.concat(nextPageFiles);
        }

        return files;
    } catch (error) {
        console.error(`Error fetching files: ${error.message}`);
        return [];
    }
}

// Function to save files to a JSON file
async function saveFilesToJson() {
    const allFiles = await fetchFiles();

    // Save the files data into a JSON file
    fs.writeFile('files.json', JSON.stringify(allFiles, null, 2), (err) => {
        if (err) throw err;
        console.log('Files data saved to files.json');
    });
}

saveFilesToJson();
