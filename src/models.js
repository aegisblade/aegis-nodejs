// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const {readFile, createTempFile} = require("./util/file");
const runProcess = require('./util/runProcess');
const {trace} = require('./trace');


const getNodeVersion = () => {
    let fullVersion = process.versions.node;

    let versionParts = fullVersion.split('.');
    if (versionParts.length != 3)
        throw new Error("Expected 3 parts in Node Version.");

    return `${versionParts[0]}.${versionParts[1]}`;
};

const ApplicationPackageInfo = function(name, version) {
    this.name = name;
    this.version = version;
};

ApplicationPackageInfo.collect = async (libraryInfos) => {
    let promise = runProcess('npm', ['list', '--depth=0', '--json']);
    // let promise = new Promise(function(resolve, reject){
    //         require('child_process').exec('npm list --depth=0 --json', function(err, stdout, stderr) {
    //             err ? reject(err) : resolve(JSON.parse(stdout));
    //         });
    //     });

    try {
        await promise;
    } catch (err) {
        trace("ERROR collecting application package info.");
        
        console.error(promise.stderr());

        throw new Error("Error while collecting application packages. " + err.toString());
    }

    let npmPackageDetails = JSON.parse(promise.stdout());
    // console.log(npmPackageDetails);

    let packageInfoArr = [];
    let dependencies = npmPackageDetails.dependencies || {};

    for (let npmPackageName of Object.keys(dependencies)) {
        let dependencyDetails = dependencies[npmPackageName];

        // Throw if package missing
        if (dependencyDetails.missing) {
            throw new Error(`Error: package ${npmPackageName} is missing.`);
        }

        if (libraryInfos[npmPackageName]) {
            continue;
        }
        
        let npmPackageVersion = npmPackageDetails.dependencies[npmPackageName].version;
        packageInfoArr.push(new ApplicationPackageInfo(npmPackageName, npmPackageVersion));
    }

    return packageInfoArr;
};

const ApplicationContextFile = function(filePath, filePathRelativeToAppContext, fileHash, fileByteCount, fileContents) {
    this.filePath = filePath;
    this.filePathRelativeToAppContext = filePathRelativeToAppContext;
    this.fileHash = fileHash;
    this.fileByteCount = fileByteCount;
    this.fileContents = fileContents;

    this.toJSON = () => {
        let filteredKeys = Object.keys(this).sort().filter(k => k !== 'fileContents' && k !== 'toJSON');
        let filteredObj = {};
        for (let filteredKey of filteredKeys) {
            filteredObj[filteredKey] = this[filteredKey];
        }

        return filteredObj;
    }
};

const listFiles = (extensions, dir) => {
    dir = dir || process.cwd();

    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        let stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            /* Recurse into a subdirectory */
            results = results.concat(listFiles(extensions, file));
        } else {
            /* Is a file */
            results.push(file);
        }
    });

    if (extensions.includes("*")) {
        return results;
    }

    return results.filter(f => extensions.includes(path.extname(f)));
};

const getLibraryInfos = async (libraries) => {
    if (! libraries || !Array.isArray(libraries)) {
        console.log('return empty');
        return {};
    }

    let libraryInfos = [];

    for (var library of libraries) {
        let dirStat;
        try {
            dirStat = fs.statSync(library);
        } catch (err) {
            if (err.code === 'ENOENT' && err.message.includes('no such file or directory')) {
                throw new Error(`Library directory was not found: ${library}`);
            }

            throw err;
        }

        if (! dirStat.isDirectory()) {
            throw new Error(`Specified library path is not a directory: ${library}.`);
        }

        let packageJsonStat;
        try {
            packageJsonStat = fs.statSync(path.join(library, "package.json"));
        } catch (err) {
            if (err.code === 'ENOENT' && err.message.includes('no such file or directory')) {
                throw new Error(`Library directory does not include a 'package.json' file: ${library}`);
            }

            throw err;
        }

        if (!packageJsonStat.isFile()) {
            throw new Error(`Library directory does not include a 'package.json' file: ${library}`);
        }

        let libraryPackageName, packageJson;
        try {
            let packageJsonContents = await readFile(path.join(library, "package.json"));
            packageJson = JSON.parse(packageJsonContents);
        } catch (err) {
            throw new Error(`Unable to parse library's package.json: ${library}`)
        }

        if (!packageJson["name"]) {
            throw new Error(`Library's package.json has no 'name' property.`);
        }

        libraryPackageName = packageJson["name"];

        let tempFile = await createTempFile();
        let tempDir = path.dirname(tempFile);
        let libraryAbsPath = path.resolve(path.normalize(library));

        let npmPackPromise = runProcess('npm', ['pack', '--json', libraryAbsPath], tempDir);
        await npmPackPromise;

        let npmPackStdout = npmPackPromise.stdout();

        let libraryArchive;
        try {
            let npmPackOutput = JSON.parse(npmPackPromise.stdout());
            libraryArchive = npmPackOutput[0]['filename'];
        }
        catch (err) {
            // Old versions of NPM will not have json-formatted output
            if (err.toString().includes('Unexpected token')) {
                libraryArchive = npmPackStdout.trim();
            }
            else {
                throw err;
            }
        }
        
        let libraryArchivePath = path.join(tempDir, libraryArchive);
        let relLibraryArchivePath = path.join("aegisblade_lib", libraryArchive);

        let libraryArchiveContents = await readFile(libraryArchivePath, null);

        let hash = crypto.createHash('sha256');
        hash.update(libraryArchiveContents);
        const fileHash = hash.digest('hex');

        const fileByteCount = Buffer.byteLength(libraryArchiveContents);
        let fileContentsByteArray = libraryArchiveContents.toJSON().data;

        let libraryInfo = {
            packageName: libraryPackageName,
            archiveContextFile: new ApplicationContextFile(
                libraryArchivePath,
                relLibraryArchivePath,
                fileHash,
                fileByteCount,
                fileContentsByteArray)
        };

        libraryInfos[libraryInfo.packageName] = libraryInfo;
    }

    return libraryInfos;
};

ApplicationContextFile.collect = async (extraFiles, libraryInfos) => {
    const excludedPatterns = [
        /node_modules/,
        /\.\./,
    ];

    const jsExtensions = [".js"];

    let allModulesSet = {};

    // First add the extra files
    extraFiles = extraFiles || [];
    for (let extraFile of extraFiles) {
        let relativePath = path.relative(process.cwd(), extraFile);

        let stats = fs.statSync(relativePath);
        if (stats.isDirectory()) {
            for (let dirFile of listFiles(["*"], relativePath)) {
                let relativeDirFile = path.relative(process.cwd(), dirFile);

                allModulesSet[relativeDirFile] = true;
            }
        }
        else {
            allModulesSet[relativePath] = true;
        }
    }

    // Get all the required modules
    for (let requiredModulePath of Object.keys(require.cache))
    {
        let relativeModulePath = path.relative(process.cwd(), requiredModulePath);
        allModulesSet[relativeModulePath] = true;
    }

    // Try to list out all ".js" files under cwd
    let jsFilesArr = listFiles(jsExtensions);
    for (let jsFile of jsFilesArr) {
        let relativeModulePath = path.relative(process.cwd(), jsFile);
        allModulesSet[relativeModulePath] = true;
    }

    let allModules = Object.keys(allModulesSet);

    let filteredModules = allModules.filter((elem) => {
        let relElem = path.relative(process.cwd(), elem);

       for (let pattern of excludedPatterns) {
           if (pattern.test(relElem)) {
               return false;
           }
       }
        // console.log(relElem);

       return true;
    });

    let allApplicationFilePaths = filteredModules; // TODO: need to allow for auxiliary files like chrome extension
    let applicationContextFiles = [];

    for (let filePath of allApplicationFilePaths) {
        let relFilePath = path.relative(process.cwd(), filePath);
        let fileContents = await readFile(filePath);

        const hash = crypto.createHash('sha256');
        hash.update(fileContents, 'utf8');
        const fileHash = hash.digest('hex');

        const fileByteCount = Buffer.byteLength(fileContents, 'utf8');

        let fileContentsByteArray = Buffer.from( fileContents, 'utf8' ).toJSON().data;

        let applicationContextFile = new ApplicationContextFile(
            filePath,
            relFilePath,
            fileHash,
            fileByteCount,
            fileContentsByteArray);

        applicationContextFiles.push(applicationContextFile)
    }

    for (let libraryInfo of Object.values(libraryInfos)) {
        applicationContextFiles.push(libraryInfo.archiveContextFile);
    }

    return applicationContextFiles;
};

const ApplicationExecutionContext = function(applicationPackages, applicationFiles) {
    this.language = "nodejs";
    this.packages = applicationPackages;
    this.files = applicationFiles;
    this.packageManagerSourceFeeds = [];
    this.sourceRuntimeIdentifier = `${process.platform}-${process.arch}`; // TODO: get current platform
    this.targetRuntimeVersion = getNodeVersion(); // TODO: get current node version
    this.targetRuntimeName = "node";
    this.clientVersion = "test"; // TODO: put actual client version

    this.toJSON = () => {
        return Object.keys(this).sort().reduce((r, k) => (r[k] = this[k], r), {});
    }
};

const HostDefinition = function(jobConfigHost)
{
    this.driver = jobConfigHost.driver;
    this.hostAffinity = jobConfigHost.affinity;
    this.driverOptions = {
        instanceType: jobConfigHost.options.instanceType,
        region: jobConfigHost.options.region,
        useSpotInstance: jobConfigHost.options.useSpotInstance,
        maxSpotPrice: jobConfigHost.options.maxSpotPrice,
    }
}

const CreateApplicationPayload = function(applicationPackages, applicationFiles, jobConfig) {
    this.applicationExecutionContext = new ApplicationExecutionContext(applicationPackages, applicationFiles);
    this.hostDefinition = new HostDefinition(jobConfig.host);
    this.capabilities = jobConfig.capabilities;
};

const CreateJobPayload = function(applicationId, serializedJobEntrypoint, jobType, memoryMb, jobConfigHost, scheduledJobCrontab=null) {
    this.applicationId = applicationId;
    this.serializedJobEntrypoint = serializedJobEntrypoint;
    this.jobType = jobType;
    this.memoryMb = memoryMb;
    this.scheduledJobCrontab = scheduledJobCrontab;
    this.clientVersion = "test"; // TODO: put in actual client version
    this.hostDefinition = new HostDefinition(jobConfigHost);
};

const UploadFilePayload = function(applicationContextFile, fileContents, applicationId) {
    this.applicationContextFile = applicationContextFile;
    this.fileContents = fileContents;
    this.applicationGuid = applicationId;
};

class CreateDataStorePayload {
    constructor(name, driver, driverOptions) {
        this.dataStoreName = name;
        this.dataStorageDriver = driver;
        this.driverOptions = driverOptions;
    }
}

module.exports = {
    UploadFilePayload,
    CreateJobPayload,
    CreateApplicationPayload,
    ApplicationExecutionContext,
    ApplicationContextFile,
    ApplicationPackageInfo,
    CreateDataStorePayload,
    getLibraryInfos
};