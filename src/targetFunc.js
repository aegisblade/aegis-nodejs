// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

/**
 * @module targetFunc
 * @private
 */

const path = require('path');

/**
 * Searches the module tree's exports for the target function.
 * 
 * @param {function} targetFunction The function to search for in the module
 *      tree's exports.
 * 
 * @returns {module} The module the target function is exported from.
 */
const searchForTargetFunctionModule = (targetFunction) => {
    let searchQueue = [];
    let visited = {};

    searchQueue.push(module.parent);

    while (searchQueue.length > 0) {
        let currentModule = searchQueue.shift();

        while (visited[currentModule.filename] === true) {
            currentModule = searchQueue.shift();
        }

        visited[currentModule.filename] = true;

        for (let exportName in currentModule.exports) {
            let exportObj = currentModule.exports[exportName];
            if (exportObj === targetFunction) {
                return currentModule;
            }
        }

        if (currentModule.parent && visited[currentModule.parent.filename] === undefined){
            searchQueue.push(currentModule.parent);
        }

        for (let childModule of currentModule.children) {
            if (visited[childModule.filename] === undefined) {
                searchQueue.push(childModule);
            }
        }
    }

    throw new Error(`Unable to find module for target function: ${targetFunction.name}. Target function must be in module.exports of the enclosing module.`);
};

/**
 * Find's the target function's module it is exported from and returns the components necessary
 * to require the function in another process.
 * 
 * @param {function} targetFunction 
 * 
 * @returns {Object} Function components in 'file', 'relFile', and 'name' properties.
 * 
 * @throws If the target function cannot be located in the module tree's exports.
 */
const targetFunctionComponents = (targetFunction) => {
    let funcModule = searchForTargetFunctionModule(targetFunction);

    return {
        file: funcModule.filename, 
        relFile: path.relative(process.cwd(), funcModule.filename),
        name: targetFunction.name
    };
};

module.exports = {
    targetFunctionComponents: targetFunctionComponents
};