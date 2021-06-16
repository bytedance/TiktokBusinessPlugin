import {DEFAULT_VALID_LENGTH} from "./const";
import {EffectiveExternalData, ExternalDataRequest, GENERATOR_OPTIONS} from "./types";
import chalk from 'chalk';
import {InvalidRequestError, InvalidExternalDataError} from "./error";

const crypto = require('crypto');

const level1Fields = ["business_platform", "external_business_id"];
const metaFields = ["version", "timestamp", "locale"];

export class TiktokBusinessExternalDataGenerator {
  /**
   * @param key the key to encode the whole body, concat tiktok correspondent for the key
   * @param options
   */
  private debug: ((...args: string[]) => any) | undefined = undefined;
  private validationLength = DEFAULT_VALID_LENGTH;

  constructor(public key: string, options: Partial<GENERATOR_OPTIONS>) {
    if (options) {
      this.debug = options.debug;
      if (options.validationLength !== void 0) {
        this.validationLength = options.validationLength;
      }
    }
  }

  private concatLogic(payload: ExternalDataRequest) {
    function setNonNullValue(map: Map<string, string>, payload: ExternalDataRequest, key: string) {
      const value = payload[key];
      if (!value) {
        throw new InvalidRequestError(key + " should not be empty");
      }
      map.set(key, value + "");
    }

    // important: use maps here to ensure the order of the final result!
    // Note that javascript's Map data structure keeps the ordering of the insertion
    const map: Map<string, string> = new Map();
    for (const field of metaFields) {
      setNonNullValue(map, payload, field);
    }

    for (const field of level1Fields) {
      setNonNullValue(map, payload, field);
    }

    const str = [...map.entries()].map((entry: [string, string]) => entry[0] + "=" + entry[1])
      .join("&");
    if (this.debug) {
      this.debug(chalk.red.bold("\nConcat str is \n"), str);
    }
    return str;
  }

  // normal nodejs hmac generation flow
  private async getHmac4Node(str: string) {
    return crypto.createHmac('sha256', this.key).update(str).digest('hex');
  }

  // gen hmac for browser, normally you dont need it, this is just for the sake of Tiktok's internal test
  private async getHmac4Browser(str: string) {
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

  private async generateJSONPayload(data: ExternalDataRequest): Promise<EffectiveExternalData> {
    const concatStr = this.concatLogic(data);
    const hmac = typeof window === 'undefined' ?
      (await this.getHmac4Node(concatStr)) :
      (await this.getHmac4Browser(concatStr));
    return {
      ...data,
      hmac,
    } as EffectiveExternalData;
  }

  private checkPayloadTimeValidity(payload: EffectiveExternalData) {
    const now = new Date().getTime();
    if (now - +payload.timestamp > this.validationLength) {
      throw new InvalidExternalDataError("external_data is outdated");
    }
  }

  // would throw 2 exceptions
  // - external data invalid
  // - hmac is tampered with
  private async checkHmacValid(payload: EffectiveExternalData) {
    const concatStr = this.concatLogic(payload);
    // only node side does the check
    const supposedHmac = await this.getHmac4Node(concatStr);
    if (supposedHmac !== payload.hmac) {
      throw new InvalidExternalDataError("External data is tampered with");
    }
  }


  private checkFieldsValid(payload: EffectiveExternalData) {
    function emptinessCheck(fieldName: string) {
      const v = payload[fieldName];
      if (!v || v.trim().length === 0) {
        throw new InvalidExternalDataError(fieldName + " is empty");
      }
    }

    for (const field of metaFields) {
      emptinessCheck(field);
    }

    for (const field of level1Fields) {
      emptinessCheck(field);
    }
  }

  private async getRequestBody(data: ExternalDataRequest) {
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
  async encode(data: ExternalDataRequest) {
    const body = await this.getRequestBody({...data});
    if (this.debug) {
      this.debug(chalk.bgYellow.bold("\nModified payload\n", JSON.stringify(body, null, 2)));
    }
    const external_data = typeof window === 'undefined' ?
      Buffer.from(JSON.stringify(body)).toString("base64")
      : btoa(JSON.stringify(body));

    // 2063 is the maximum length for any url in the browser
    if (external_data.length > 1950) {
      throw new InvalidRequestError("The final generated external_data is too long, plz concat tiktok correspondents");
    }
    return {
      body,
      external_data
    };
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
    let payload: EffectiveExternalData;
    try {
      payload = JSON.parse(Buffer.from(base64Str, 'base64').toString("utf-8")) as EffectiveExternalData;
    } catch (e) {
      throw new InvalidExternalDataError("Failed to parse external_data");
    }
    if (!justDecode) {
      this.checkFieldsValid(payload);
      this.checkPayloadTimeValidity(payload);
      await this.checkHmacValid(payload);
    }
    return payload;
  }
}
