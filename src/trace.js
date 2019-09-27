// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

const env = require("./env.js");

const DebugMode = () => env.debugOutput === "1" 
    || env.debugOutput === "true";

module.exports.trace = (msg, log = console.log) => {
    if (DebugMode()) {
        log(msg);
    }
}