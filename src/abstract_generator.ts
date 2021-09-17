import {DEFAULT_VALID_LENGTH} from "./const";
import chalk from 'chalk';
import {InvalidRequestError, InvalidExternalDataError} from "./error";
const crypto = require('crypto');

export interface GENERATOR_OPTIONS {
    // if true, only check business_platform, external_business_id and timestamp,
    // which is the case for bigcommerce.
    debug: (...args: string[])=> any | undefined;
    validationLength: number; // defaults to DEFAULT_VALID_LENGTH
}

export abstract class AbstractGenerator<T extends {timestamp: string}> {
    /**
     * @param key the key to encode the whole body, concat tiktok correspondent for the key
     * @param options
     */
    protected debug: ((...args: string[]) => any) | undefined = undefined;
    protected validationLength = DEFAULT_VALID_LENGTH;

    constructor(public key: string, options: Partial<GENERATOR_OPTIONS>) {
        if (options) {
            this.debug = options.debug;
            if (options.validationLength !== void 0) {
                this.validationLength = options.validationLength;
            }
        }
    }

    protected abstract concatLogic(payload: T): string;

    // normal nodejs hmac generation flow
    protected async getHmac4Node(str: string) {
        return crypto.createHmac('sha256', this.key).update(str).digest('hex');
    }

    // gen hmac for browser, normally you dont need it, this is just for the sake of Tiktok's internal test
    protected async getHmac4Browser(str: string) {
        const enc = new TextEncoder();
        return window.crypto.subtle.importKey(
            'raw', // raw format of the key - should be Uint8Array
            enc.encode(this.key),
            { // algorithm details
                name: 'HMAC',
                hash: {name: 'SHA-256'},
            },
            false, // export = false
            ['sign', 'verify'], // what this key can do
        ).then((key) => window.crypto.subtle.sign(
            'HMAC',
            key,
            enc.encode(str),
        ).then((signature) => {
            const b = new Uint8Array(signature);
            return Array.prototype.map.call(b, (x) => (`00${x.toString(16)}`).slice(-2)).join('');
        }));
    }

    private async generateJSONPayload(data: T): Promise<T & {hmac: string}> {
        const concatStr = this.concatLogic(data);
        const hmac = typeof window === 'undefined' ?
            (await this.getHmac4Node(concatStr)) :
            (await this.getHmac4Browser(concatStr));
        return {
            ...data,
            hmac,
        } as (T & {hmac: string});
    }

    private checkPayloadTimeValidity(payload: T) {
        const now = new Date().getTime();
        if (now - +payload.timestamp > this.validationLength) {
            throw new InvalidExternalDataError("external_data is outdated");
        }
    }

    // would throw 2 exceptions
    // - external data invalid
    // - hmac is tampered with
    private async checkHmacValid(payload: T & {hmac: string}) {
        const concatStr = this.concatLogic(payload);
        // only node side does the check
        const supposedHmac = await this.getHmac4Node(concatStr);
        if (supposedHmac !== payload.hmac) {
            throw new InvalidExternalDataError("External data is tampered with");
        }
    }

    private async getRequestBody(data: T) {
        if (this.debug) {
            this.debug(chalk.blue.bold("Well received:\n"), JSON.stringify(data, null, 2));
        }
        return this.generateJSONPayload(data);
    }

    /**
     * Encode request into base64
     * returns the final jsonBody and external_data, normally you will only need the external_data
     * @param data
     */
    public async encode(data: T) {
        const body = await this.getRequestBody({...data});
        if (this.debug) {
            this.debug(chalk.bgYellow.bold("\nModified payload\n", JSON.stringify(body, null, 2)));
        }
        const external_data = AbstractGenerator.payloadToStr(body);

        // 2063 is the maximum length for any url in the browser
        if (external_data.length > 1950) {
            throw new InvalidRequestError("The final generated external_data is too long, plz concat tiktok correspondents");
        }
        return {
            body,
            external_data
        };
    }

    private static payloadToStr<T>(body: T){
        return typeof window === 'undefined' ?
            Buffer.from(JSON.stringify(body)).toString("base64")
            : btoa(JSON.stringify(body));
    }

    private static strToPayload<T>(base64Str: string){
        return  JSON.parse(Buffer.from(base64Str, 'base64').toString("utf-8")) as T;
    }

    /**
     * convert the base64 str back to json body,
     * @param base64Str
     * @param justDecode just decode the string, for internal test only
     */
    async decodeAndVerify(base64Str: string, justDecode = false) {
        if (!base64Str) {
            throw new InvalidExternalDataError("external_data is empty");
        }
        let payload: T & {hmac: string};
        try {
            payload = AbstractGenerator.strToPayload(base64Str);
        } catch (e) {
            throw new InvalidExternalDataError("Failed to parse external_data");
        }
        if (!justDecode) {
            this.checkPayloadTimeValidity(payload);
            await this.checkHmacValid(payload);
        }
        return payload;
    }

    static addAttributeToExternalDataStr<T>(externalDataStr: string, obj: {[key: string]: any}){
        const payload = AbstractGenerator.strToPayload<T>(externalDataStr);
        for(const key of Object.keys(obj)){
            payload[key] = obj[key];
        }
        return AbstractGenerator.payloadToStr(payload);
    }
}
