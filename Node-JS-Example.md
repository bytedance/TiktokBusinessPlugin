# Tiktok Business Plugin Helper (NodeJs implementation)

This plugin provides some utility functions that generate
temporary `external_data` which Tiktok's onboarding flow uses to identify a shop in the external platform or to fetch
shop's data. See [here](./README.md) for more contexts.

Since the following methods rely on the `KEY` which is the joint decision by both Tiktok and a specific external merchant,
`KEY` should never be leaked externally. As such, the following code snippet should be executed on your backend server rather than in the frontend code.

## Install
```
We have not released it to npm and the package name is subject to future change,
please hold on for the time being.
```
## Basic Usage
```
// the final npm name is not decided and is subject to change.
import {TiktokBusinessExternalDataGenerator} from '@ad/tiktok_business_plugin_helper';
const key = "TEST_KEY"

const generator = new TiktokBusinessExternalDataGenerator(key, {
    debug: console.error.bind(console); // if set to a falsy value, no debugging info will be spitted
});

// the details of the payload will be described below
const payload = {
  ...
}

const {body, external_data} = generator.encode(payload);
// the final json body that is used to generate the external_data, normally you don't need it
console.log(body);
console.log(external_data);
```


### new TiktokBusinessExternalDataGenerator() constructor
```
const generator = new TiktokBusinessExternalGenerator(
   // key is used to generate hmac, be sure not to expose it to the public or commit to any of your codebase
   // Contact tiktok's representative to get to know the key for your platform
    key,
    {
        debug: undefined | console.log.bind(console) | yourLogger.log.bind(yourLogger)
    }
);
```

### generator#code
```
  // This function returns the final json body in case you need it
  // and the external_data which should be passed as a parameter to tiktok's onboarding flow

  const {body, external_data} = generator.encode(
    {
       ...metaFields,
       ...level1Fields,
       ...optionalLevel2Fields,
       ...optionalLevel3Fields
    }
  );

   // below will throw an exception complaining that the some field in level2 is missing
   const {body,external_data) = generator.encode(payload);

```

### generator#decodeAndVerify
```
// This method is used by Tiktok's side to verify whether you external_data is valid or not.
// since different external merchants have different keys,
// we will configure different instances of the generators internally, below is just a simple example
const generatorForSomeCompany = new TiktokBusinessExternalGenerator(keyForCompany1, {
    debug: tiktokLogger.log.bind(tiktokLogger),
   });

const generatorForAnotherCompany = new TiktokBusinessExternalGenerator(keyForCompany2, {
    debug: tiktokLogger.log.bind(tiktokLogger),
   });

// we will verify
// 1. if external_data is non-empty
// 2. if it is not outdated, currently, the validation period is 30 mins
// 3. if the external_data is tampered with, be sure not to leak you KEY and use the key to encode you data

// if no error occurs, the normal onboarding flow continues
// otherwise an error page will be displayed
generatorForSomeCompany.decodeAndVerify(ctx.query.external_data);
```

## Test cases
Check the test folder since the code inside is self-explicable.
```
// how to run the test?
yarn //install dependencies, execute only once
yarn test
```

## Command line tool
We've also developed a command-line tool to generate `external_data` more conveniently
```
yarn //install dependencies, execute only once
yarn start -h

// some command line examples
yarn normal
yarn gen-outdated-string
```
