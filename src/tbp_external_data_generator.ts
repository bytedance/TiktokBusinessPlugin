import chalk from 'chalk';
import {InvalidRequestError, InvalidExternalDataError} from "./error";
import {AbstractGenerator} from "./abstract_generator";
import {ExternalDataRequest} from "./types";

const level1Fields = ["business_platform", "external_business_id"];
const metaFields = ["version", "timestamp", "locale"];

export class TiktokBusinessExternalDataGenerator extends AbstractGenerator<ExternalDataRequest>{

  public concatLogic(payload: ExternalDataRequest) {
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

  private checkFieldsValid(payload: ExternalDataRequest) {
    function emptinessCheck(fieldName: string) {
      let v = payload[fieldName];
      if(typeof v === 'number'){
        v = "" + v;
      }
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

  /**
   * convert the base64 str back to json body,
   * @param base64Str
   * @param justDecode just decode the string, for internal test only
   */
  async decodeAndVerify(base64Str: string, justDecode = false) {
     const payload = await super.decodeAndVerify(base64Str, justDecode);
     if(!justDecode){
       this.checkFieldsValid(payload);
     }
     return payload;
  }
}
