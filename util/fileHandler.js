import { BlobReader, BlobWriter, ZipReader } from "@zip.js/zip.js";

// Read zip file, return array of objects containing filename, file path, and file content
export async function getContentFromZip(file) {
    const zipReader = new ZipReader(new BlobReader(file));
    const zipContent = await zipReader.getEntries();
    const zipFiles = zipContent.filter((entry) => !entry.filename.endsWith("/"));
    const fileContentPromises = [];
    zipFiles.forEach((entry) => {
        fileContentPromises.push(entry.getData(new BlobWriter()).then((blobRes) => blobRes.text()));
    });
    const fileContents = await Promise.all(fileContentPromises);
    let i = 0;
    const results = zipFiles.map((entry) => {
        const parsedPath = parsePath(entry.filename);
        const mappedEntry = {
            ...parsedPath,
            ["content"]: fileContents[i],
        };
        i = i + 1;
        return mappedEntry;
    });
    return results;
}

// Get file from URL as blob
export async function getFileFromURL(url) {
    return fetch(url).then((res) => res.blob());
}

// Get path, file name and file extension from file path
export function parsePath(filePath) {
    const parts = filePath.split(/\/|\\/g);
    const [fileName, fileType] = parts.pop().split(".");
    const path = parts.join("/") + "/";
    return { path: path, fileName: fileName, fileType: fileType };
}

// Fetch zip file from URL and return array containing filename, file path, and file content
export async function getZipContentFromURL(url) {
    return getContentFromZip(await getFileFromURL(url));
}
