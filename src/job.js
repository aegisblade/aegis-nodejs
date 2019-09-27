// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

const {trace} = require("./trace");

const timeout = ms => new Promise(res => setTimeout(res, ms));

/**
 * An object for fetching job-related information from the API.
 * 
 * <p>
 * This is typically returned by a call to [AegisBladeClient.run()]{@link AegisBladeClient#run} but may
 * be constructed from a saved [Job.id]{@link Job#id} by calling the 
 * [AegisBladeClient.job()]{@link AegisBladeClient#job} method.
 * </p>
 * 
 * <p>
 * In AegisBlade, a job is conceptually a task to execute part
 * of an application.
 * </p>
 */
class Job {
    /**
     * Do not use the constructor directly. Use [AegisBladeClient.job()]{@link AegisBladeClient#job} 
     * to get a reference to an existing job or [AegisBladeClient.run()]{@link AegisBladeClient#run}
     * to start a new job.
     */
    constructor(api, jobId, applicationId, jobType)
    {
        this.api = api;

        /**
         * The type of job represented by this object. Currently 
         * there is only one job type "InstantJob".
         * 
         * @type {string}
         */
        this.jobType = jobType;

        /**
         * The GUID-like id of the job.
         * 
         * @type {string}
         */
        this.id = jobId;

        /**
         * The GUID-like id of the application the job will run on.
         * 
         * @type {string}
         */
        this.applicationId = applicationId;

        this.finalStatusResult = null;

        this.finalStates = ["finished", "canceled"];
        this.errorStates = ["error"];
    }

    /**
     * Retrieves the status of this job from AegisBlade servers.
     * 
     * @param {number} [retries] Number of times to retry in case of HTTP errors.
     * @returns {Object} An object detailing the status of the job and any errors encountered.
     */
    async getStatus(retries=7) {
        for (let i=0; i<retries; ++i) {
            try {
                let statusResult = await this.api.jobStatus(this.id);
        
                trace(`Job (id: ${this.id}), received status result.`);
                trace(statusResult, console.dir);
        
                return statusResult;
            }
            catch (e) {
                // Sometimes the socket blows up, just try again.
                if (e.toString().includes("socket hang up")) {
                    trace(`Socket hang up while fetching status for job (id: ${this.id}), retrying...`);
                    continue;
                }
        
                trace(`Error fetching status for job (id: ${this.id}).`);
                trace(e, console.error);
                
                throw e;
            }
        }
    
        throw new Error("error getting status");
    }

    /**
     * Retrieves the stdout & stderr logs output by the job while running.
     * 
     * @returns {string} the stdout & stderr logs output by the job while running.
     */
    async getLogs() {
        try {
            let logs = await this.api.jobLogs(this.id);
    
            trace(`Job (id: ${this.id}), received logs.`);
    
            return logs;
        }
        catch (e) {
            trace(`Error fetching logs for job (id: ${this.id}).`);
            trace(e, console.error);
            
            throw e;
        }
    }

    /**
     * Returns whether or not the job has completed running. 
     * 
     * @returns {boolean} Whether or not the job has completed running.
     */
    async isCompleted() {
        if (this.finalStatusResult)
            return true;

        let statusResult = await this.getStatus();

        if (this.finalStates.includes(statusResult.jobStatus.toLowerCase())) {
            trace(`Job (id: ${this.id}) finished successfully.`);
            this.finalStatusResult = statusResult;
            return true;
        }

        if (this.errorStates.includes(statusResult.jobStatus.toLowerCase())) {
            trace(`Job (id: ${this.id}) finished with error.`);
            this.finalStatusResult = statusResult;
            return true;
        }

        return false;
    }

    /**
     * Waits for the job to complete. 
     * 
     * @param {number} [expiration] Number of seconds to wait before timing out. Does not time out by default.
     * 
     * @throws An error if the job takes longer than `expiration` seconds.
     */
    async wait(expiration=null) {
        const startTime = new Date().getTime();

        if (this.finalStatusResult) {
            trace('job.wait: returning cached final status result.');
            return this.finalStatusResult;
        }

        while (true) {
            if (expiration && (new Date().getTime() > (startTime + expiration))) {
                trace(`Waiting for Job (id: ${this.id}) to finish timed out: ${JSON.stringify({startTime: startTime, expiration: expiration})}`);
                throw new Error(`Waiting for Job (id: ${this.id}) to finish timed out.`);
            }

            let statusResult = await this.getStatus();

            if (this.finalStates.includes(statusResult.jobStatus.toLowerCase())) {
                trace(`Job (id: ${this.id}) finished successfully.`);
                this.finalStatusResult = statusResult;
                return statusResult;
            }

            if (this.errorStates.includes(statusResult.jobStatus.toLowerCase())) {
                trace(`Job (id: ${this.id}) finished with error.`);
                this.finalStatusResult = statusResult;
                return statusResult;
            }

            await timeout(700);
        }
    }

    /**
     * 
     * @param {number} [expiration] Number of seconds to wait before timing out. Does not time out by default.
     * 
     * @throws If the job takes longer than `expiration` seconds.
     * @throws If the return value cannot be deserialized.
     */
    async getReturnValue(expiration=null) {
        if (!this.finalStatusResult) {
            await this.wait(expiration);
        }
    
        try {
            let returnValueText = await this.api.getReturnValue(this.id);
            let returnValue = JSON.parse(returnValueText);
            return returnValue;
        } catch (err) {
            throw new Error("Failed to parse return value. \n") + err;
        }
    }

    /**
     * Static method for creating a job instance. 
     * NOT RECOMMENDED outside internal use.
     * 
     * <p>
     * For normal use-cases, use [AegisBladeClient.job()]{@link AegisBladeClient#job} to get a job instance instead of this method.
     * </p>
     * 
     * @param {Api} api 
     * @param {Object} apiResponse 
     * @private
     */
    static create(api, apiResponse) {
        return new Job(api, apiResponse.jobId, apiResponse.applicationId, apiResponse.jobType);
    }
}

module.exports = Job;