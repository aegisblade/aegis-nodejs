// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

/**
 * @module file
 * @private
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
var crypto = require('crypto');

/**
 * Async version of fs.readFile()
 * 
 * @see https://nodejs.org/api/fs.html#fs_fs_readfile_path_options_callback
 * 
 * @param {string} path 
 * @param {string | Object} opts 'utf8' by default, returns a buffer when null
 */
const readFile = (path, opts = 'utf8') =>
    new Promise((res, rej) => {
        fs.readFile(path, opts, (err, data) => {
            if (err) rej(err);
            else res(data)
        })
    });

/**
 * Async version of fs.writeFile()
 * 
 * @see https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback
 * 
 * @param {string} path 
 * @param {string | Buffer} data 
 */
const writeFile = (path, data) => 
    new Promise((res, rej) => {
        fs.writeFile(path, data, (err, text) => {
            if (err) rej(err);
            else res(path);
        });
    });

/**
 * Creates a randomly named file in a temporary directory in /tmp (or os.tmpdir).
 * 
 * @returns {string} The path to the temporary file.
 */
const createTempFile = async () => {
    return new Promise((resolve, reject) => {
        var filenameBytes = crypto.randomBytes(8);
        var filename = `f${filenameBytes.readUInt32LE(0)}${filenameBytes.readUInt32LE(4)}`;

        const tempPath = path.join(os.tmpdir(), 'tmpdir-');
        fs.mkdtemp(tempPath, (err, folder) => {
            if (err) 
                return reject(err)

            const filePath = path.join(folder, filename);

            fs.writeFile(filePath, '', 'utf-8', errorFile => {
                if (errorFile) 
                    return reject(errorFile);

                resolve(filePath)
            })
        })
    })
};

/**
 * Synchronously creates all non-existent directories in a given path.
 * 
 * @param {string} pathToCreate 
 */
const mkdirp = (pathToCreate) => {
    pathToCreate
        .split(path.sep)
        .reduce((currentPath, folder) => {
            currentPath += folder + path.sep;
            if (!fs.existsSync(currentPath)){
                fs.mkdirSync(currentPath);
            }
            return currentPath;
        }, '');
};

module.exports = {readFile, writeFile, createTempFile};