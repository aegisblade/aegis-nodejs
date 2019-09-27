// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

/**
 * @namespace Capability
 * 
 * @property {string} xvfb Requests that the application be run with xvfb-run.
 * 
 * @property {string} chrome  Requests that the application have the `google-chrome` and `chromedriver` 
 *      binaries available on the PATH. Also implies [Capability.xvfb]{@link Capability#xvfb}.
 * 
 * @property {string} firefox Requests that the application have the `firefox` and `geckodriver` 
 *      binaries available on the PATH. Also implies [Capability.xvfb]{@link Capability#xvfb}.
 */
module.exports = {
    xvfb: "xvfb",
    chrome: "browser-chrome",
    firefox: "browser-firefox"
}