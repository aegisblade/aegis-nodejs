// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

const {CreateDataStorePayload} = require("./models");
const {readFile, writeFile} = require("./util/file");

/**
 * A utility for accessing data stores and their files.
 *
 * <p>
 * A Data Store is a logical "drive" of files that is backed
 * by your choice of driver (AWS S3 only currently). Before
 * uploading files or other operations the data store must be
 * created with a call to [DataStore.create()]{@link DataStore#create}.
 * </p>
 * 
 * <p>
 * Each data store is identified by a unique name, and can 
 * be accessed from any job or machine with access to the proper
 * API Key.
 * </p>
 * 
 * <p>
 * The data store is typically used to save results from jobs or 
 * put up data that can be accessed by any of your jobs.
 * </p>
 */
class DataStore {

    /**
     * The constructor is not recommended for direct use. 
     * Use [AegisBladeClient.data()]{@link AegisBladeClient#data} to get a {@link DataStore} instance.
     * 
     * <p>
     * Call [DataStore.create()]{@link DataStore#create} to create the data store if it does
     * not already exist.
     * </p>
     * 
     * @param {string} name The unique name of the data store.
     * @param {Api} api The internal class for performing API operations.
     */
    constructor(name, api) {
        this.name = name;
        this.api = api;
    }

    /**
     * Creates the data store using the specified backing driver
     * and options for that driver.
     * 
     * @param {string} driver The driver to use for backing the data store ("s3" only currently.)
     * @param {Object} driverOptions A dictionary of options specific to the driver. (e.g. "region" may be defined for s3)
     * @returns {Promise<DataStore>} The current object for chaining method calls.
     */
    async create(driver, driverOptions) {
        let payload = new CreateDataStorePayload(this.name, driver, driverOptions);

        await this.api.dataStoreCreate(payload);

        return this;
    }

    /**
     * Uploads a file from the local machine to the data store.
     * 
     * @param {string} localFilePath The path of the file to upload on the local machine.
     * @param {string} dataStorePath The storage path the file inside the data store.
     */
    async uploadFile(localFilePath, dataStorePath) {
        let data = await readFile(localFilePath, null);

        await this.api.dataStoreUpload(this.name, data, dataStorePath);
    }

    /**
     * Uploads a string to the data store.
     * 
     * @param {string} data The data string to store in the data store.
     * @param {string} dataStorePath The path in which to store the data inside the data store.
     */
    async uploadData(data, dataStorePath) {
        await this.api.dataStoreUpload(this.name, data, dataStorePath);
    }

    /**
     * Downloads data from the data store and returns it as a string.
     * 
     * @param {string} dataStorePath The path of the data inside the data store to download.
     * 
     * @returns {string} The downloaded data as a string.
     */
    async download(dataStorePath) {
        let data = await this.api.dataStoreDownload(this.name, dataStorePath);
        return data;
    }

    /**
     * Downloads data from the data store and writes it to a local file.
     * 
     * @param {string} dataStorePath The path of the data inside the data store to download.
     * @param {string} localFilePath Path of a local file that the data will be written to.
     */
    async downloadToFile(dataStorePath, localFilePath) {
        let data = await this.api.dataStoreDownload(this.name, dataStorePath);

        await writeFile(localFilePath, data);
    }

    /**
     * Deletes the specified data from the data store.
     * 
     * @param {string} dataStorePath Path of the data inside the data store to delete.
     */
    async delete(dataStorePath) {
        await this.api.dataStoreDeleteFile(this.name, dataStorePath);
    }

    /**
     * Deletes this entire data store and all files in it.
     * 
     * <p>
     * USE CAREFULLY!
     * </p>
     */
    async deleteStore() {
        await this.api.dataStoreDelete(this.name);
    }

    /**
     * Lists all files in the data store.
     * 
     * @returns {Promise<string[]>} A list of all files in the data store.
     */
    async listFiles() {
        return await this.api.dataStoreListFiles(this.name);
    }
}

module.exports = DataStore;