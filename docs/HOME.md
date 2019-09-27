AegisBlade Node.js Client <span>v@VERSION</span>
==========================

Package `aegisblade` provides the nodejs client library for [AegisBlade](/).

This is the reference documentation for the nodejs client library.

[Read the docs](/docs) for more detail.

[See more examples](https://www.github.com/aegisblade/examples) on Github.

Installation
=============

```npm install --save aegisblade```


Examples
==========

#### Hello World

```
const {aegisblade} = require('aegisblade');

/**
 * In this example the `helloWorld()` function will be run on a
 * server using AegisBlade. 
 */
function helloWorld() {
    console.log("Hello World Logs");
    return "Hello World Return Value";
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
    console.log(`Job Return Value: ${jobReturnValue}`);
    console.log(`Job Logs: ${await job.getLogs()}`);
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
