// A part of the AegisBlade Node.js Client Library
// Copyright (C) 2019 Thornbury Organization, Bryan Thornbury
// This file may be used under the terms of the GNU Lesser General Public License, version 2.1.
// For more details see: https://www.gnu.org/licenses/lgpl-2.1.html

const spawn = require('child_process');
const {trace} = require('../trace');


function TrackablePromise(promise) {
    // Don't modify any promise that has been already modified.
    if (promise.isPending) return promise;

    // Set initial state
    var isPending = true;
    var isRejected = false;
    var isFulfilled = false;

    // Observe the promise, saving the fulfillment in a closure scope.
    var result = promise.then(
        function(v) {
            isFulfilled = true;
            isPending = false;
            return v; 
        }, 
        function(e) {
            isRejected = true;
            isPending = false;
            throw e; 
        }
    );

    result.isFulfilled = function() { return isFulfilled; };
    result.isPending = function() { return isPending; };
    result.isRejected = function() { return isRejected; };
    return result;
}

const runInProcess = (exec, args, cwd, env, print=false) => {
    args = args || [];
    cwd = cwd || process.cwd();

    trace(`[${cwd}] spawn(${exec}, ${args})`);
    let child = spawn.spawn(exec, args, {
        cwd: cwd,
        env: env,
        detached: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on('data', (data) => {
        let strData = data.toString();
        if (print) console.log(strData);

        stdout += strData;
    });

    child.stderr.on('data', (data) => {
        let strData = data.toString();
        if (print) console.log(strData);

        stderr += strData;
    });

    let promise = new Promise((res, rej) => {
       child.on('exit', (code) => code == 0 && res(code) || rej(`Bad Exit Code: ${code}`));
       child.on('close', (code) => res(code));

       child.on('error', (err) => {
          console.error(err);
          rej(err);
        });
    });

    let trackablePromise = TrackablePromise(promise);

    trackablePromise.kill = function() {
        process.kill(-child.pid);
    };

    trackablePromise.stdout = () => stdout;
    trackablePromise.stderr = () => stderr;

    return trackablePromise;
};

module.exports = runInProcess;