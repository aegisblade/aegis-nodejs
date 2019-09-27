// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

const AegisBladeClient = require("./client");
const JobConfig = require('./jobConfig');
const Capability = require('./capability');


module.exports = {
    aegisblade: new AegisBladeClient(),
    JobConfig: JobConfig,
    Capability
}