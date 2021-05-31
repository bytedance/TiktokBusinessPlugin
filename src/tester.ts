#!/usr/bin/env node

import commander, {Command} from "commander";
import fs from 'fs';
import {ExternalDataRequest} from "./types";
import {TiktokBusinessExternalDataGenerator} from "./crypto";
import chalk from "chalk";
import {DEFAULT_VALID_LENGTH} from "./const";

if (typeof require !== 'undefined' && require.main === module) {
    const program = new Command();
    program
        .version('0.0.1')
        .requiredOption("-f --file <file>", 'the file which provides all the info')
        .requiredOption("-k --key <key>", 'the key which is used to generate the hmac')
        .option("-o --outdated", 'generate an outdated hash, used for experiments')
        .option("-d --debug", 'print out the intermediate process')
        .parse();

    const options = program.opts();
    doTask(options);
}

async function doTask(options: commander.OptionValues){
    try {
        const fileContent = fs.readFileSync(options.file);
        const obj = JSON.parse(fileContent.toString());
        const generator = new TiktokBusinessExternalDataGenerator(options.key, {
            debug: options.debug ? console.log.bind(console) : undefined,
        });

        const payload: ExternalDataRequest = {
            ...obj,
            timestamp:  options.outdated ? "" + (Date.now() - 2 * DEFAULT_VALID_LENGTH) :  "" + Date.now(),
        };
        const {external_data} = await generator.encode(payload);
        console.log(chalk.bgCyanBright.bold("\n\nFinal base64 str\n"), external_data);
    } catch (e) {
        console.error("Failed to execute task for file " + options.file);
        console.error("Reason: " + e.message);
        process.exit(-1);
    }
}
