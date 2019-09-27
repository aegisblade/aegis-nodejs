<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://www.aegisblade.com">
    <img src="https://www.aegisblade.com/images/BigCloud.png" alt="Logo" width="80">
  </a>

  <h3 align="center">AegisBlade Node.js Client</h3>

  <p align="center">
    The node.js client library for AegisBlade.
    <br />
    <a href="https://www.aegisblade.com/docs"><strong>Read the docs »</strong></a>
    <br />
    <br />
    <a href="https://www.github.com/aegisblade/examples">Examples</a>
    ·
    <a href="https://www.aegisblade.com/account/register">Sign Up for an API Key</a>
    ·
    <a href="https://github.com/aegisblade/aegis-nodejs/issues">Report Bug</a>
  </p>
</p>

## Installation

Install the npm package as a dependency of your application.

```npm install --save aegisblade```

## Hello World Example

```javascript
const {aegisblade} = require('aegisblade');
const os = require("os");

/**
 * In this example the `helloWorld()` function will be run on a
 * server using AegisBlade. 
 */
async function helloWorld() {
    console.log(`The server's hostname is ${os.hostname()}`);

    return `Hello World from ${os.hostname()}`;
}

// Any target function to be run on AegisBlade must be exported.
module.exports = {helloWorld};

/**
 * The `main()` function will run on your local machine
 * and start the job running the `helloWorld()` function
 * on a server using AegisBlade.
 */
async function main() {
    let job = await aegisblade.run(helloWorld);
    
    console.log(`Job Id: ${job.id}`);
    console.log("Waiting for the job to finish running...");

    let jobReturnValue = await job.getReturnValue();
    let jobLogs = await job.getLogs();

    console.log(`Job Return Value: ${jobReturnValue}`);
    console.log(`Job Logs: ${jobLogs}`);
}

//  Using the `require.main === module` idiom to only run main when this script
//    is called directly is especially important when using AegisBlade to prevent
//    infinite loops of jobs creating jobs.
if (require.main === module) {
    (async () => {
        try {
            await main();
        } catch (err) {
            console.error(err);
        }
    })();
}
```
