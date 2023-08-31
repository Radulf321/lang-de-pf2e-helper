import { writeFileSync } from "fs";
import { BlobReader, BlobWriter, ZipReader } from "@zip.js/zip.js";
import { postExtractMessage } from "../../src/pack-extractor/pack-extractor.js";

/**
 * Read zip file, return array of objects containing filename, file type, file path, and file content (as string)
 * @param {Blob} file                                                                       The file as Blob
 * @returns {Promise<{path: string, fileName: string, fileType: string, content: string}>}  Promise containing file name, file type, file path, and file content
 */
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

/**
 * Get file from URL as blob
 *
 * @param {URL} url             The file URL
 * @returns {Promise<Blob>}     A Promise for the file's Blob data
 */
export async function getFileFromURL(url) {
    return fetch(url).then((res) => res.blob());
}

/**
 * Get path, file name and file extension from file path
 *
 * @param {string} filePath                                         The complete file path
 * @returns {{path: string, fileName: string, fileType: string}}    Object containing path, file name und file type
 */
export function parsePath(filePath) {
    const parts = filePath.split(/\/|\\/g);
    const fileNameParts = parts.pop().split(".");
    const fileType = fileNameParts.pop();
    const fileName = fileNameParts.join(".");
    const path = parts.join("/") + "/";
    return { path: path, fileName: fileName, fileType: fileType };
}

/**
 * Fetch zip file from URL and return array containing file name, file type, file path, and file content
 *
 * @param {URL} url                                                                         The file URL
 * @returns {Promise<{path: string, fileName: string, fileType: string, content: string}>}  Promise containing file name, file type, file path, and file content
 */
export async function getZipContentFromURL(url) {
    return getContentFromZip(await getFileFromURL(url));
}

/**
 * Write files from Blob
 *
 * @param {Array<{fileName:string, fileType: string, content: Blob}>} files         Array if files that should get saves to a directory
 * @param {string} savePath                                                         Destination directory for the files
 * @param {string} extractMessageHeader                                             Caption for the info log in the console
 */
export function writeFiles(files, savePath, extractMessageHeader) {
    postExtractMessage(extractMessageHeader, true);
    files.forEach((entry) => {
        const filePath = `${savePath}/${entry.fileName}.${entry.fileType}`;
        let content = entry.content;

        if (entry.fileType === "json") {
            content = JSON.stringify(JSON.parse(content), null, 2);
        }

        writeFileSync(filePath, content);
        postExtractMessage(`${entry.fileName}.${entry.fileType}`);
    });
}
