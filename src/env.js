// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

/**
 * @namespace env
 * 
 * @property {string} apiKey Value of AEGISBLADE_API_KEY environment variable.
 *      The api key to be used by the client.
 * 
 * @property {string} apiEndpoint Value of AEGISBLADE_API_ENDPOINT environment variable.
 *      The api endpoint to be used by the client. NOT RECOMMENDED outside of internal usage.
 * 
 * @property {string} defaultHostdriver Value of AEGISBLADE_DEFAULT_HOSTDRIVER environment variable.
 *      The default hostdriver to be used by the client. ("ec2" only currently)
 * 
 * @property {string} debugOutput Value of AEGISBLADE_DEBUG_OUTPUT environment variable.
 *      A flag to output debug trace logs.
 * 
 * @property {string} libraries Value of AEGISBLADE_LIBRARIES environment variable.
 *      A list of directory paths separated by `:`. @see JobConfig#libraries
 * 
 * @property {string} verifySsl Value of AEGISBLADE_VERIFY_SSL environment variable.
 *      Whether or not to verify the ssl certificates of the api endpoint. 
 *      NOT RECOMMENDED outside of internal usage.
 */
module.exports = {
    apiKey: process.env["AEGISBLADE_API_KEY"],

    apiEndpoint: process.env["AEGISBLADE_API_ENDPOINT"],

    defaultHostdriver: process.env["AEGISBLADE_DEFAULT_HOSTDRIVER"],

    debugOutput: process.env["AEGISBLADE_DEBUG_OUTPUT"],

    libraries: process.env["AEGISBLADE_LIBRARIES"],

    verifySsl: process.env["AEGISBLADE_VERIFY_SSL"]
}