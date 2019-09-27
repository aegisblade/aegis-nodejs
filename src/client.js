// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

const {CreateApplicationPayload, CreateJobPayload, ApplicationContextFile, ApplicationPackageInfo, UploadFilePayload, getLibraryInfos} = require("./models");
const {targetFunctionComponents} = require('./targetFunc');
const {trace} = require("./trace");
const env = require("./env.js");
const Api = require("./api.js");
const Job = require("./job.js");
const DataStore = require("./dataStore.js");
const JobConfig = require('./jobConfig');

const DEFAULT_API_ENDPOINT = "https://www.aegisblade.com"

/**
 * AegisBlade client. Provides easy methods for starting jobs
 * and accessing a data store. 
 * 
 * @constructor
 */
const AegisBladeClient = function() {
    this.apikey = env.apiKey;

    this.endpoint = env.apiEndpoint;
    if (!this.endpoint)
        this.endpoint = DEFAULT_API_ENDPOINT;

    let verifySsl = true;
    if (env.verifySsl === '0' || env.verifySsl === 'false') {
        verifySsl = false;
    }

    this.api = new Api(this.apikey, this.endpoint, verifySsl);

    /**
     * Sets the api key used by this client to access the AegisBlade API.
     * @param apiKey The API Key from aegisblade.com
     */
    this.setApiKey = (apikey) => {
        this.apikey = apikey;
        this.api.setApiKey(apikey);
    }

    /**
     * Sets the api endpoint used by this client. 
     * Not recommended outside of internal use.
     * @param endpoint The api endpoint to use.
     */
    this.setEndpoint = (endpoint) => {
        this.endpoint = endpoint;
        this.api.setEndpoint(endpoint);
    }

    /**
     * Returns a list of files that will be uploaded as part of the 
     * application build. It DOES NOT upload any files or contact the API.
     * 
     * <p>
     * This method exists so developers can check what files are going
     * to be uploaded when they call [AegisBladeClient.run()]{@link AegisBladeClient#run}. 
     * </p>
     * 
     * @async
     * @param {JobConfig} jobConfig The job configuration used to locate extra files
     *      and libraries.
     * 
     * @returns {Promise<string[]>} A list of file paths that will be uploaded.
     */
    this.getUploadFiles = async (jobConfig) => {
        let safeJobConfig = new JobConfig(jobConfig);

        let libraryInfos = await getLibraryInfos(safeJobConfig.libraries);
        let applicationFiles = await ApplicationContextFile.collect(safeJobConfig.extraFiles, libraryInfos);

        return applicationFiles.map(f => f.filePath);
    };

    /**
     * Used to access the data store api. 
     * 
     * <p>
     * The data store can be used to store arbitrary data accessible by any 
     * job or machine with internet access (and the proper api key).
     * </p>
     * 
     * <p>
     * If it is not already created, you will need to call [DataStore.create()]{@link DataStore#create} 
     * on the return value of this function.
     * </p>
     * 
     * @param {string} dataStoreName The name of the data store you want to access. 
     * @returns {DataStore} An object used to access the named data store.
     */
    this.data = (dataStoreName) => {
        return new DataStore(dataStoreName, this.api);
    };

    /**
     * Used to get a {@link Job} instance for an already existing job.
     * 
     * <p>
     * This method will contact the API to fetch information about the job then return an {@link Job} instance.
     * </p>
     *
     * @async 
     * @param {string} jobId The id ([Job.id]{@link Job#id}) of the already existing job.
     * 
     * @returns {Promise<Job>} An {@link Job} instance.
     * 
     * @throws If the job with jobId does not exist.
     * @throws If there is an error fetching the job information from the api.
     */
    this.job = async (jobId) => {
        var fauxJob = Job.create(this.api, {jobId: jobId});
        
        var status = await fauxJob.getStatus();

        return Job.create(this.api, status);
    }

    /**
     * Creates and runs a job on AegisBlade.
     * 
     * <p>
     * When called this function will first create an application by uploading
     * .js files found inside the current working directory tree, determine 
     * libraries by calling 'npm list', and upload local libraries explicitly
     * defined by the jobConfig argument.
     * </p>
     * 
     * <p>
     * Refer to the [AegisBladeClient.getUploadFiles()]{@link AegisBladeClient#getUploadFiles} 
     * method if you wish to preview the files that will be uploaded prior 
     * to running a job.
     * </p>
     * 
     * <p>
     * After the files are uploaded successfully, AegisBlade will build an 
     * application image that can be deployed and run on any number of machines.
     * Jobs created as a part of this application will need to wait for it to finish
     * building before running. The length of the build depends primarily upon the
     * time required to install the various dependencies of the application.
     * </p>
     * 
     * <p>
     * Applications are cached by AegisBlade, and subsequent calls to this function
     * will only upload updated files. If no files have been updated, the same 
     * application will be used, and created jobs will not need to wait for it to build.
     * </p>
     * 
     * <p>
     * This function will queue a job to be run as a part of the application immediately
     * after creating it and uploading the files. 
     * </p>
     * 
     * <p>
     * Any number of jobs may be queued for an application, and there is no need to wait 
     * for an application to be finished building or for the first job to run before 
     * queuing more jobs.
     * </p>
     * 
     * <p>
     * The returned object of this function may be used to check on the status of the job
     * or application, or you can use the web ui available at https://www.aegisblade.com/app.
     * </p>
     * 
     * @async
     * @param targetFunction Target function to run on the server. Must be an exported module function.
     * @param args Arguments for the target function, to be supplied at runtime on the server.
     * @param {JobConfig|Object} [jobConfig]
     * @returns {Promise<Job>}
     * 
     * @throws If the target function cannot be located, throws an Error.
     */
    this.run = async (targetFunction, args, jobConfig) => {
        if (typeof(targetFunction) !== typeof(() => {})) {
            throw new Error("targetFunction parameter must be a function");
        }

        if (!this.apikey) {
            throw new Error("The ApiKey was not specified. Call `.setApiKey()` or set the AEGISBLADE_API_KEY environment variable.");
        }

        let safeJobConfig = new JobConfig(jobConfig);

        let {file: targetFunctionModuleFile, 
            name: targetFunctionName, 
            relFile: relativeTargetFunctionModuleFile} = targetFunctionComponents(targetFunction);

        let entrypoint = {
            functionModuleFile: relativeTargetFunctionModuleFile,
            functionName: targetFunctionName,
            functionArguments: args
        };

        let serializedEntrypoint = JSON.stringify(entrypoint);

        let libraryInfos = await getLibraryInfos(safeJobConfig.libraries);
        let applicationPackages = await ApplicationPackageInfo.collect(libraryInfos);
        let applicationFiles = await ApplicationContextFile.collect(safeJobConfig.extraFiles, libraryInfos);

        let createApplicationPayload = new CreateApplicationPayload(applicationPackages, applicationFiles, safeJobConfig);
        let createApplicationResponse;

        try {
            trace("Sending create application payload.");
            trace(createApplicationPayload, console.dir);

            createApplicationResponse = await this.api.createApplication(createApplicationPayload);
            
            trace("Received Create Application response.");
            trace(createApplicationResponse, console.dir);
        } catch (err) {
            trace(err, console.error);
            throw new Error("Unable to create application, file an issue at https://github.com/brthor/aegisblade if it persists. Error: ") + err.toString();
        }

        for (let uploadFileHash of createApplicationResponse.fileHashesRequiringUpload) {
            let appFile = applicationFiles.find((f) => f.fileHash === uploadFileHash);
            let fileContents = appFile.fileContents;

            let uploadFilePayload = new UploadFilePayload(appFile, fileContents,
                createApplicationResponse.applicationId);

            await this.api.uploadFile(uploadFilePayload);
        }

        let createJobPayload = new CreateJobPayload(
            createApplicationResponse.applicationId, serializedEntrypoint, "instant", 
            safeJobConfig.memoryMb || null, safeJobConfig.host);
        
        trace("Sending create job payload");
        trace(createJobPayload, console.dir);

        let createJobResponse = await this.api.createJob(createJobPayload);

        trace("Received create job response");
        trace(createJobResponse, console.dir);

        return Job.create(this.api, createJobResponse);
    }
};

module.exports = AegisBladeClient;