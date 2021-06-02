# Tiktok Business Plugin `external_data` Specification

## Background
Every time the end user tries to connect with Tiktok from any pages of the external merchant platform, a new tab whose url contains the query `external_data` will open up.
In this doc, we are going to specify how the `external_data` is generated.

### Terms definition
- External merchant: Online merchant who wants to integrate with TiktokBusiness Plugin

- Shop: The shop on the external merchant's platform.

- Merchant Install App Page: Some external merchants deem any external integration(e.g. into Tiktok or FB) as the creation of  a new
  App on their own platform, and always come up with a page which ask the user to "install" the app. If this is the case, this page should be the first page the user lands on.
  The end user will see the **Splash page** defined below after the installation.
  Note that not all external merchant has this concept and this page can be ignored if so.
  
- Splash Page: The page which is shown to the end users when the connection between
the external merchant and tiktok is not built. Normally we assume that there is a **Connect** button on the Splash page

- Onboarding flow: which includes the Tiktok's `auth page` and `setup page`.

- Management page: Once the user finishes the onboarding flow, he/she will see the management page on the external merchant platform.
This page displays all the config items the user went through as well as the status of the catalog. 

### Why does `external_data` come into play?
1. The user clicks the **Connect** button on the **Splash Page**
   
2. a new tab will open up, and the possible url might be
`https://ads.tiktok.com/tbp/auth?external_data=xxxxxxxxxxxx`

3. The url of the tab contains a parameter called `external_data`, which encapsulates all the information Tiktok needs 
to
   - identify the shop
   - the fields which facilitates the creation of Tiktok's adv account and business center on the `setup page`
   - When the user clicks **Finish Setup** on the setup page, for some external merchants, Tiktok needs to launch an oauth flow to pass the 
    access token to the external platform. `app_id` and `redirect_uri` are needed to acheive this goal.
     
4. The `external_data` should be generated with a `KEY` codetermined by the external merchant and Tiktok's server so as to ensure
this data is neither falsified nor tampered with.
   
5. The generation of the `external_data` should be done on the external merchant platform's server side or BFF side. Never generate
it on the browser side since the `KEY` will be leaked to public!
   
6. If the `external_data` is not valid, Tiktok will send an error page rather than showing the `auth page` or the `setup page`

### Reference implementation
We've implemented a NodeJs version [here](./Node-JS-Example.md) which will be published to NPM before the final launch.
You are more than welcome to use the one provided by us or implement your own using the language you are accustomed to by following the specification described below.

We will upgrade any bugfixes or new features whenever possible, stay tuned.

If you feel confused when reading this doc, we suggest reading the source code of the NodeJs version [here](./src/crypto.ts) or contact Tiktok's representative directly to reach out to the author
(qiucheng@bytedance.com).
   
## Specification

### Generation of external_data
1. Create a json object, which contains the following fields.
Below is a definition in typescript, map it to any language you prefer.
```
export interface ExternalDataRequest {
    // meta fields
    // the requst object might change from to time, this field serves as a hint to Tiktok's server
    version: string; // 1.0 for the time being, tiktok will announce any updates if needed.
    timestamp: string; // unix epoch time, the string format of Date.now()

    // level 1 fields, which are required by all platforms
    // talk to your tiktok's representative to know which constant we are using for your platform
    ext_business_type: string;
    // should be the shop id / shop hash of your platform
    ext_business_id: string;
    

    // level 2 fields
    industry?: string;
    timezone?: string;
    country?: string;
    store_id?: string;
    store_name?: string;
    store_owner_phone_number?: string;
    store_owner_email?: string;
    currency?: string;
    website?: string;
    domain?: string;

    // level 3 fields

    /* Some platforms need to store TikTok Mapi accessToken on their side
    * in order to fetch catalog information on the Management page.
    * when the user clicks "finish setup", we will use the following information to start an oauth2 flow,
    * the app_id will be used to trigger an oauth request,
    * while the redirect_uri should be a callback url hosted by the external platform and they shoule be responsible for exachanging the
    * auth code for access token by themselves.

    // the external business platform should apply a MApi app first.
    // https://ads.tiktok.com/marketing_api/docs?rid=cwp2z3z2cl5&id=1688969396145153
    app_id?: string;

    // The redirect_uri parameter should be the same value as the one in the MApi app configuration
    // and this uri should be hosted by external business platform
    redirect_uri?: string;
    
    // any extra information for your own convenience
    extra?: Record<string, string>;}
```
Example:
```
 {
  "version": "1.0",
  "timestamp": "1622469374637",
  "ext_business_type": "bigcommerce",
  "ext_business_id": "1238928921223",
  "industry": "cosmetics",
  "timezone": "UTC+0",
  "country": "CN",
  "store_id": "this is a very long store name",
  "store_name": "qq_testforbusinessaaaa",
  "store_owner_phone_number": "1232132121232",
  "store_owner_email": "aqqewqe@awqnemnqmq.com",
  "currency": "RMB",
  "website": "www.a.com/test12311sdas123",
  "domain": "https://aa.com",
  "app_id": "12312321321321",
  "redirect_uri": "https://sqaure.com/api/callback"
}
```

It is worth emphasizing that 
- The `meta fields` as well as the `level 1 field` are mandatory for any merchant platform, 
- `level2 fields` and `level3 fields` can be ignored if you don't need them.
- Ordering of the item name is not important however we suggest keeping consistent with the ordering defined above.
- Currently Tiktok's lenient server does not validate the existence of `level2 fields` or `level 3 fields` even if needed, but we 
highly recommend you comply with the rules to avoid any possible bugs.

2. Generate a concatenated string in the form of `a=someValue&b=someValue2`, 
only `version`, `timestamp`, `ext_business_type` and `ext_business_id` are used.
As such, a possible example of all fields might be
```
 version=1.0&timestamp=1622469374637&ext_business_type=bigcommerce&ext_business_id=1238928921223
```


3. Generate the hmac of the string generated by step2, ask your Tiktok's representative for the `KEY` used to generate the hmac
```
// nodejs code example
 function getHmac4Node(str: string) {
    return crypto.createHmac('sha256', KEY).update(str).digest('hex');
  }
  
hmac example: 6afb803ad5bbe2be9dd09dc2bcc4513db1d6493dd214241f7e4c1dc0c89d8e49
```

4. Append the hmac value to the payload in step 1, example:
```
   {
   "ext_business_type": "bigcommerce",
   "ext_business_id": "1238928921223",
   "version": "1.0",
   "timestamp": "1622474263939",
   "industry": "cosmetics",
   "timezone": "UTC+0",
   "country": "CN",
   "store_id": "this is a very long store name",
   "store_name": "qq_testforbusinessaaaa",
   "store_owner_phone_number": "1232132121232",
   "store_owner_email": "aqqewqe@awqnemnqmq.com",
   "currency": "RMB",
   "website": "www.a.com/test12311sdas123",
   "domain": "https://aa.com",
   "app_id": "12312321321321",
   "redirect_uri": "https://sqaure.com/api/callback",
   "hmac": "6afb803ad5bbe2be9dd09dc2bcc4513db1d6493dd214241f7e4c1dc0c89d8e49"
   }
```

5. Turn the final result into a base64 string
```
const str = JSON.stringify(payloadInStep4);
const external_data = convertIntoBase64(str);
```

6. Pass the `external_data` as a query parameter into Tiktok's onboarding flow.

7. On the Tiktok's server side, we will do the unmarshalling of the base64 string and use 
the same steps to generate an hmac, finally we compare the hmac generated with the one in the json payload, an error page will show up if they do not match.
