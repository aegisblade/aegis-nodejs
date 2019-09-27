// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

const https = require('https');
const http = require('http');

const { URL } = require('url');

/*
 * Internal class for performing API operations.
 * 
 * @constructor
 */
const Api = function(apiKey, apiEndpoint, verifySsl=true) {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint + "/api/v1";
    this.verifySsl = verifySsl;

    this.setApiKey = (apikey) => this.apiKey = apikey;
    this.setEndpoint = (endpoint) => this.apiEndpoint = endpoint + "/api/v1";

    this.createApplication = async (payload) => {
        let urlStr = this.apiEndpoint + "/application/create";
        return await this.sendRequest(urlStr, payload);
    };

    this.createJob = async (payload) => {
        let urlStr = this.apiEndpoint + "/job/create";
        return await this.sendRequest(urlStr, payload);
    };

    this.uploadFile = async (payload) => {
        let urlStr = this.apiEndpoint + "/application/upload";
        return await this.sendRequest(urlStr, payload);
    };

    this.jobLogs = async (jobGuid) => {
        let urlStr = this.apiEndpoint + "/job/logs/" + jobGuid;
        let res = await this.sendRequest(urlStr, null, "text");

        return res;
    }

    this.getReturnValue = async (jobGuid) => {
        let urlStr = this.apiEndpoint + "/job/returnvalue/" + jobGuid;
        let res = await this.sendRequest(urlStr, null, "text");

        return res;
    };

    this.jobStatus = async (jobGuid) => {
        let retries = 3;
        let urlStr = this.apiEndpoint + "/job/status/" + jobGuid;

        let res = null;

        for (let i=0;i<retries;++i) {
            try {
                res = await this.sendRequest(urlStr);
                break;
            }
            catch (err) {
                console.error(err);

                if (i === (retries - 1))
                    throw err;
            }
        }

        return res;
    };
    
    
    this.dataStoreCreate = async (payload) => {
        if (!payload.constructor || payload.constructor.name !== 'CreateDataStorePayload') {
            throw new Error("Invalid Argument Type: Expected CreateDataStorePayload type payload");
        }

        let urlStr = this.apiEndpoint + "/data/store/create";

        let res = await this.sendRequest(urlStr, payload, "text");

        return res;
    };

    this.dataStoreDelete = async (name) => {
        if (typeof(name) !== 'string') {
            throw new Error("Invalid Argument Type: Expected string type name");
        }

        let urlStr = this.apiEndpoint + `/data/store/${name}/delete`;

        let res = await this.sendRequest(urlStr, null,
            "text", null, "DELETE");

        return res;
    };

    this.dataStoreUpload = async (name, data, path) => {
        if (typeof(name) !== 'string') {
            throw new Error("Invalid Argument Type: Expected string type name.");
        }

        if (typeof(data) !== 'string' 
            && (!data.constructor || !data.constructor.name === 'Buffer')) {
            throw new Error("Invalid Argument Type: Expected string or Buffer type data.");
        }

        if (typeof(path) !== 'string') {
            throw new Error("Invalid Argument Type: Expected string type path.")
        }

        let urlStr = this.apiEndpoint + `/data/store/${name}/file/${path}`;

        let res = await this.sendRequest(urlStr, data, 
            'text', 'text', 'PUT', true);
        
        if (!res.redirect)
            return res;

        let redirectUrl = res.location;
        let redirectHeaders = {
            'Content-Type': "application/octet-stream",
            'Content-Length': Buffer.byteLength(data),
            'User-Agent': 'aegisblade-js',
            'Expect': '100-Continue'
        };

        let redirectRes = await this.baseRequest(true, 'PUT', redirectUrl, 
            redirectHeaders, data);

        if (redirectRes.redirect)
            throw new Error("unexpected redirect");

        return redirectRes.body;
    };

    this.dataStoreDeleteFile = async (name, path) => {
        if (typeof(name) !== 'string') {
            throw new Error("Invalid Argument Type: Expected string type name.");
        }

        if (typeof(path) !== 'string') {
            throw new Error("Invalid Argument Type: Expected string type path.")
        }

        let urlStr = this.apiEndpoint + `/data/store/${name}/file/${path}`;

        let res = await this.sendRequest(urlStr, null, 
            "text", null, "DELETE");

        return res;
    };

    this.dataStoreDownload = async (name, path) => {
        if (typeof(name) !== 'string') {
            throw new Error("Invalid Argument Type: Expected string type name.");
        }

        if (typeof(path) !== 'string') {
            throw new Error("Invalid Argument Type: Expected string type path.")
        }

        let urlStr = this.apiEndpoint + `/data/store/${name}/file/${path}`;

        let res = await this.sendRequest(urlStr, null, "text");
        if (!res.redirect) {
            return res;
        }

        let redirectUrl = res.location;

        let redirectRes = await this.baseRequest(true, 'GET', redirectUrl);

        if (redirectRes.redirect)
            throw new Error("unexpected redirect");

        return redirectRes.body;
    };

    this.dataStoreListFiles = async (name) => {
        if (typeof(name) !== 'string') {
            throw new Error("Invalid Argument Type: Expected string type name.");
        }

        let urlStr = this.apiEndpoint + `/data/store/${name}/list`;
        let res = await this.sendRequest(urlStr, null);

        return res;
    };

    this.sendRequest = async (urlStr, payload, responseType="json", payloadType="json", methodOverride=null, expectContinue=false) => {
        let method = methodOverride || 'GET';
        if (payload && !methodOverride) method = 'POST';

        let headers = {
            "Authorization": "bearer " + this.apiKey
        };

        if (expectContinue) {
            headers["Expect"] = "100-Continue"
        }

        let body = null;
        if (payload) {
            if (payloadType === "json") {
                body = JSON.stringify(payload);
                headers["Content-Type"] = "application/json";
            }
            else {
                body = payload;
                headers["Content-Type"] = "application/octet-stream";
            }

            headers["Content-Length"] = Buffer.byteLength(body);
            headers["Accept-Encoding"] = 'gzip, deflate';
            headers["User-Agent"] = "aegisblade-js-client";
        }

        let response;
        try {
            response = await this.baseRequest(this.verifySsl, method, urlStr, headers, body)
        }
        catch (err) {
            if (err.body) {
                throw new Error(err.body);
            }

            throw new Error(err);
        }

        if (response.redirect)
        {
            return response;
        }
        
        let responseBody = response.body;
        if (responseType == "json") {
            try {
                responseBody = JSON.parse(responseBody);
            } catch (e) {
                throw responseBody;
            }
        }

        return responseBody;
    };

    this.baseRequest = async (verifySsl, method, urlStr, headers, body) => {
        // if (!verifySsl) {
        //     process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
        // } else {
        //     process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 1;
        // }

        let url = new URL(urlStr);
        let expectContinue = headers && headers["Expect"] === "100-Continue";

        let requestFunc = {
            'https:': https.request,
            'http:': http.request
        }[url.protocol];

        if (!requestFunc) {
            throw new Error("Unrecognized protocol on endpoint: " + url.protocol)
        }

        let port = url.port || {
            'https:': 443,
            'http:': 80
        }[url.protocol];

        if (body && typeof(body) !== 'string' && body.constructor && body.constructor.name !== 'Buffer')
        {
            throw new Error("body must be a string or buffer");
        }

        let requestOptions = {
            hostname: url.hostname,
            port: port,
            path: url.pathname + url.search,
            method: method,
            headers: headers,
            protocol: url.protocol,
            family: 4,                    // IPv4 only
            rejectUnauthorized: verifySsl
        };

        let requestPromise = new Promise((resolve, reject) => {
            let request = requestFunc(requestOptions, res => {
                res.setEncoding("utf8");

                let responseBody = "";

                let responseObject = {
                    response: res
                };

                res.on("error", err => {
                    reject(err);
                });

                res.on("data", data => {
                    responseBody += data;
                });

                res.on("end", () => {
                    responseObject.body = responseBody;

                    // Handle Redirect
                    if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                        responseObject.redirect = true;
                        responseObject.location = res.headers["location"];

                        resolve(responseObject);
                    }

                    if (![200, 201].includes(res.statusCode)) {
                        reject(res.statusCode + " - " + res.statusMessage);
                    }

                    resolve(responseObject);
                });
            });
            
            if (! expectContinue)
            {
                if (body) request.end(body);
                else request.end();
            } else {
                request.on("continue", () => {
                    if (body) request.end(body);
                    else request.end();
                });
            }
        });

        let response;
        try {
            response = await requestPromise;
        }
        catch (err) {
            throw new Error(err);
        }

        return response;
    };
};

module.exports = Api;