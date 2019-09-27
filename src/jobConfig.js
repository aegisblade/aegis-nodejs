// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

const merge = require('./util/merge');
const env = require('./env');

const DefaultJobConfig = function() {
    return {
        memory: null,
        extraFiles: [],
        libraries: [],
        capabilities: [],
        host: {
            driver: "ec2",
            affinity: null,
            options: {
                instanceType: null,
                region: null,
                useSpotInstance: true,
                maxSpotPrice: null
            }
        }
    };
};

/**
 * Configuration container for a job.
 *
 * <p>
 * The JobConfig is an object that can be used to
 * specify configuration that will change the way a job is 
 * executed, determine host placement, or configure values
 * for the backing host driver.
 * </p>
 * 
 * @property {int} [memory] The amount of memory in MB required by the job.
 * 
 * @property {string[]} [extraFiles] A list of extra files or directory 
 *      (inside the current working directory tree) to include as part of 
 *      the upload. Usually used to include non-js content files or directories.
 * 
 * @property {string[]} [libraries] A list of directories (outside the current 
 *      working directory tree) to make available for import by the application 
 *      at runtime. Usually used for project-to-project dependencies or npm 
 *      packages installed from a local source. 'npm pack' will be called on these 
 *      projects and their package archives uploaded as a part of your application.
 * 
 * @property {string[]} [capabilities] An array of [capabilities]{@link Capability} required by this job.
 * 
 * @property {Object} [host]
 * 
 * @property {string} [host.driver] The backing driver to use in launching the hosts
 *      for the job. ("ec2" only currently).
 * 
 * @property {string} [host.affinity] A string label used to group jobs on a host(s). If 
 *      specified, the job will only run on hosts with the same host
 *      affinity label. For example, assigning "host1" to jobs 1-4 and
 *      "host2" to jobs 5-8 will force both sets of jobs to run on 
 *      different hosts regardless of other factors.
 * 
 * @property {Object} [host.options]
 * 
 * @property {string} [host.options.instanceType] (default set in account) The instance type to 
 *      use when launching the job. For example, if you are using the 
 *      "ec2" host driver you may specify "m4.large" for the instance type.
 * 
 * @property {string} [host.options.region] (default set in account) The region in which to launch the
 *      job's host and other resources. (ex. "us-east-1" if using "ec2" host driver)
 * 
 * @property {boolean} [host.options.useSpotInstance] (default=true) Whether or not to use spot 
 *      instances (or the equivalent on a given host driver) when provisioning the jobs. 
 * 
 * @property {string} [host.options.maxSpotPrice] (default=on demand price) If using spot instances, 
 *      this option defines the  maximum price to pay per hour for a given spot instance.
 */
class JobConfig {

    /**
     * Creates a JobConfig, applying the default values and then applying 
     * values of the config param over the defaults.
     * 
     * @param {Object} [config] Optional object with configuration values preset. 
     * 
     * <p> Default values: </p>
     * <pre>
     *  {
     *      memory: null,
     *      extraFiles: [],
     *      libraries: [],
     *      capabilities: [],
     *      host: {
     *          driver: "ec2",
     *          affinity: null,
     *          options: {
     *              instanceType: null,
     *              region: null,
     *              useSpotInstance: true,
     *              maxSpotPrice: null
     *          }
     *      }
     *  };
     * </pre>
     */
    constructor(config) {
        Object.assign(this, DefaultJobConfig());

        if (env.defaultHostdriver) {
            this.host.driver = env.defaultHostdriver;
        }

        if (config) {
            merge(this, config);
        }

        if (env.libraries) {
            let envLibraries = env.libraries.split(":");
            for (let envLibrary of envLibraries) {
                this.libraries.push(envLibrary);
            }
        }
    }
 
    /**
     * Specifies the amount of memory in MB required by the job. 
     * 
     * <p>
     * Used to determine how many jobs will be run per host. Specifying
     * an amount greater than the instance type specified in 
     * {@link JobConfig.host.driver_options} (or the default instance type), will not
     * change the instance type to accomodate the greater amount
     * of memory, but will force only one job to run per host.
     * </p>
     * 
     * @param {number} memory Amount of memory in MB required by the job.
     * @returns {JobConfig} The current object for chaining method calls.
     */
    withMemory(memory) {
        this.memory = memory;

        return this;
    }

    /**
     * <p>
     *   Specifies that a file or directory inside the CWD 
     *   tree should be included when uploading the application.
     * </p>
     * 
     * For files/directories outside of the CWD tree, see [JobConfig.addLibrary()]{@link JobConfig#addLibrary} .
     * 
     * @param {string} extraFilePath Path to the file or directory to include.
     * @returns {JobConfig} The current object for chaining method calls.
     */
    withExtraFile(extraFilePath) {
        this.extraFiles.push(extraFilePath);

        return this;
    }

    /**
     * Adds a library to be uploaded as a part of this job.
     * 
     * <p>
     * A library is a local package/directory used inside the project from 
     * outside the project's directory tree. These libraries will be uploaded 
     * as part of your application and made available to `require()` during its execution.
     * </p>
     * 
     * <p>
     * Usually used for project-to-project dependencies or npm packages 
     * installed from a local source.
     * </p>
     * 
     * @param {string} libraryPath The path to the library directory.
     * @returns {JobConfig} The current object for chaining method calls.
     */
    withLibrary(libraryPath) {
        this.libraries.push(libraryPath);

        return this;
    }

    /**
     * Sets the host driver and options for that driver to be used
     * when starting the job.
     * 
     * @param {string} hostDriver The backing driver to use in launching the hosts
     *       for the job. ("ec2" only currently).
     * @param {Object} hostDriverOptions A dict of options for the host driver such
     *       as "instanceType", "region", and "useSpotInstance".
     * @returns {JobConfig} The current object for chaining method calls.
     */
    withHostDriver(hostDriver, hostDriverOptions) {
        this.host.driver = hostDriver;
        Object.assign(this.host.options, hostDriverOptions);

        return this;
    }

    /**
     * Sets the host affinity label for the job.
     * 
     * <p>
     * Host affinity is a string label used to group jobs on a host(s). If 
        specified, the job will only run on hosts with the same host
        affinity label. For example, assigning "host1" to jobs 1-4 and
        "host2" to jobs 5-8 will force both sets of jobs to run on 
        different hosts regardless of other factors.
     * </p>
     *
     * @param {string} hostAffinity The host affinity label to use for the job.
     * @returns {JobConfig} The current object for chaining method calls.
     */
    withHostAffinity(hostAffinity) {
        this.host.hostAffinity = hostAffinity;

        return this;
    }

    /**
     * Specifies a capability required by the job.
     * 
     * <p>
     * Capabilities are used to request functionality that cannot
     * be defined through the native package manager (npm in node's case).
     * </p>
     * 
     * <p>
     * {@link Capability} defines all available capabilities.
     * </p>
     * 
     * @see Capability
     * 
     * @param {string} capability The capability required for running this job.
     * @returns {JobConfig} The current object for chaining method calls.
     * 
     * @example <caption>Example demonstrating adding capabilities to a jobconfig</caption>
     * const {JobConfig, Capability, aegisblade} = require("aegisblade");
     * 
     * let jobConfig = new JobConfig();
     * jobConfig.withCapability(Capability.chrome);
     * 
     * await aegisblade.run(functionThatUsesChrome, [], jobConfig);
     */
    withCapability(capability) {
        this.capabilities.push(capability);

        return this;
    }
}

module.exports = JobConfig;