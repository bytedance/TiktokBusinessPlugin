# Tiktok Business Plugin `external_data` Specification

## Background
Every time the end user tries to connect with Tiktok from any pages of the external merchant platform, a new tab whose url contains the query `external_data` will open up.
In this doc, we are going to specify how the `external_data` is generated.

**[Here](https://ads.tiktok.com/business-extension/external_data_helper) is a place for you to check the validity of your external_data.**

### Terms definition
- External merchant: Online merchant who wants to integrate with TiktokBusiness Plugin

- Shop: The shop on the external merchant's platform.

- Merchant Install App Page: Some external merchants deem any external integration(e.g. into Tiktok or FB) as the creation of  a new
  App on their own platform, and always come up with a page which ask the user to "install" the app. If this is the case, this page should be the first page the user lands on.
  The end user will see the **Splash page** defined below after the installation.
  Note that not all external merchant has this concept and this page can be ignored if so.
  
- Splash Page: The page which is shown to the end users when the connection between
the external merchant and tiktok is not built. Normally we assume that there is a **Connect** button on the Splash page

- Onboarding flow: which includes the Tiktok's `auth page`, `login/register page` and `setup page`.

- Management page: Once the user finishes the onboarding flow, he/she will see the management page on the external merchant platform.
This page displays all the config items the user went through as well as the status of the catalog. For some external platforms, we also provide a pixel management page in addition to the normal management page.

- Note that in our jargon, we call the combination of `splash page` and the `management page` as the management suite, and call the combination of
`auth page`, `login/register page` and `setup page` as the onboarding flow.

### Why does `external_data` come into play?
1. The user clicks the **Connect** button on the **Splash Page**
   
2. a new tab will open up, and the possible url might be
`https://ads.tiktok.com/business-extension/auth?external_data=xxxxxxxxxxxx`

3. The url of the tab contains a parameter called `external_data`, which encapsulates all the information Tiktok needs 
to
   - identify the shop
   - the fields which facilitates the creation of Tiktok's adv account and business center on the `setup page`
   - When the user clicks **Finish Setup** on the setup page, for some external merchants, Tiktok needs to launch an oauth flow to pass the 
    authCode to the external platform, the field `state` will be carried along to the final callback url.
     
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
   
**[Here](https://ads.tiktok.com/business-extension/external_data_helper) is a place for you to check the validity of your external_data.**

Below is a definition in typescript, map it to any language you prefer.
```
export interface ExternalDataRequest {
    // meta fields
    // the requst object might change from to time, this field serves as a hint to Tiktok's server
    version: string; // 1.0 for the time being, tiktok will announce any updates if needed.
    timestamp: string; // unix epoch time, the string format of Date.now()
    locale: en | fr | es; // if passed values other than the ones listed here, we will fallback to English
    
    // optional, defaults to 'close_from_tiktok'
    // No matter which option you choose, tiktok will try to do 'window.opener.focus()' and wrap it in an exception block
    // if your csp rule does not accept our domain.
    
    // described at the bottom of the README, default value is 'close_from_tiktok'
    close_method?: 'close_from_tiktok' | 'send_message' | 'do_nothing';

    // level 1 fields, which are required by all platforms
    // talk to your tiktok's business_platformentative to know which constant we are using for your platform
    business_platform: string;
    // should be the shop id / shop hash of your platform
    external_business_id: string;
    

    // level 2 fields,
    // Take a look at this [page](https://ads.tiktok.com/business-extension/external_data_helper)
    // if you are not sure how to set the relevant fields
    industry?: string; 
    timezone?: string;
    country_region?: string;
    store_name?: string;
    // format should be like +86 13817282221
    phone_number?: string;
    email?: string;
    currency?: string;
    website_url?: string;
    domain?: string;

    
    /* level 3 fields
     * For platform who commissions Tiktok to create the management page, please ignore the following fields!
     *
     * For platform who wants to create the management page by themselves, you'll have to apply for a Tiktok Mapi app
     * first. As such, you will be able to call Tiktok MApi via our access_token
     * https://ads.tiktok.com/marketing_api/docs?rid=n1ow2qmxk7&id=1701890909484033
     * When the user clicks "finish setup", Tiktok's server will launch an oauth2 flow using app_id and redirect_uri
     * and will take the user to "redirect_uri" along with 2 parameters, the auth_code and the state which are defined below
     * it is the external platform's responsibility to exchange auth_code for accessToken and save it in their own storage
    */
    
    // here is your MApi app_id, which will become available after the approval of your MApi app.
    app_id?: string;
    
    // The redirect_uri parameter should be the same value as the one in the MApi app configuration
    // this uri should be hosted by the server of the external business platform.
    redirect_uri?: string;
    
    // Pass this parameter if you want to use different app_id and redirect_uri for different environment,
    // the env name should be in snake_case.
    // for example, dev,prod,qa,staging,test_env1,test_env2
    // note that if you have different environment, you should also provide a different key to generate hmac
    // defaults to 'prod' environment if not provided
    // Note that for each environment,you should apply for a different Mapi app.
    // So if you have 3 environmnts, you should apply 3 apps and pass the app_id and redirect_uri in the form of external_data, 
    // and finally provide us with 3 different hash keys via email or common group chats.
    /*
     {
       // we don't store you app_id and redirect_uri, always encode them in the external_data.
        aPlatform: [
            {
               env: 'prod',
               key: '12345', //co-determined key to genrate hmac
           },
            {
               env: 'qa',
               key: '123456', //co-determined key to genrate hmac
            },
            {
               env: 'dev',
               key: '1234567', //co-determined key to genrate hmac
            }
           
        ]
     }
    */
    env?: string; 
    
    // optional state in case you need it
    // pass this data as a normal string and there's no need to encode it,
    // tiktok will pass it back in a query param when redirecting back to your server
    // we will use encodeURIComponent(youState) and its your responsibility to decodeURIComponent(state) on your side
    // For instance, the url would look like `https://yourdomain/your_callback?state=${encodeURIComponent(yourState)}`
    state?: string;
```
Example:
```
 {
  "version": "1.0",
  "timestamp": "1622469374637",
  "locale": "en",
  "business_platform": "PLATFORM_NAME",
  "external_business_id": "1238928921223",
  "industry": "cosmetics",
  "timezone": "UTC+0",
  "country_region": "CN",
  "store_name": "qq_testforbusinessaaaa",
  "phone_number": "1232132121232",
  "email": "aqqewqe@awqnemnqmq.com",
  "currency": "RMB",
  "website_url": "www.a.com/test12311sdas123",
  "domain": "https://aa.com",
  "app_id": "12312321321321",
  "redirect_uri": "https://example.com/api/callback",
  "state" :"someConvenientInfo"
}
```

It is worth emphasizing that 
- The `meta fields` as well as the `level 1 field` are mandatory for any merchant platform, 
- `level2 fields` and `level3 fields` can be ignored if you don't need them.
- Ordering of the item name is not important however we suggest keeping consistent with the ordering defined above.
- Currently Tiktok's lenient server does not validate the existence of `level2 fields` or `level 3 fields` even if needed, but we 
highly recommend you comply with the rules to avoid any possible bugs.

2. Generate a concatenated string in the form of `a=someValue&b=someValue2`, 
only `version`, `timestamp`,`locale`, `business_platform` and `external_business_id` are used.
As such, a possible example of all fields might be, note that the ordering is important!
```
 version=1.0&timestamp=1622469374637&locale=en&business_platform=bigcommerce&external_business_id=1238928921223
```


3. Generate the hmac of the string generated by step2, use the Tiktok MApi App's secret as the key
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
   "business_platform": "PLATFORM_NAME",
   "external_business_id": "1238928921223",
   "version": "1.0",
   "timestamp": "1622474263939",
   "locale": "en",
   "industry": "cosmetics",
   "timezone": "UTC+0",
   "country_region": "CN",
   "store_name": "qq_testforbusinessaaaa",
   "phone_number": "1232132121232",
   "email": "aqqewqe@awqnemnqmq.com",
   "currency": "RMB",
   "website_url": "www.a.com/test12311sdas123",
   "domain": "https://aa.com",
   "state" :"someConvenientInfo"
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


## Close method ##
- 'close_from_tiktok'(This is the default behavior if you don't pass in this param.):
    - Tiktok will call `window.opener.location.href = redirectUri?auth_code=***&state=***` if possible 
    - Tiktok will close the setup page after user clicks 'finish setup'.

- 'redirect_inside_tiktok'(This is a very common way which is implemented by dozens of companies) :
  - Tiktok will redirect the user in its window using the redirect_uri you passed in 
    `window.location.href = ${redirect_uri}?auth_code={code}&state={state}`
  - The backend logic of your redirect_uri will exchange authCode for accessToken and save it to DB.
  - Your backend logic should make then make a 302 redirect to an empty page,which is also created by your platform.
  - In the blank page, it will simply 'postMessage' to window.opener and close the current popup window.
    Since the blank page is most of the time deployed at the same domain as `window.opener`, csp rules should not be a problem.
  
[comment]: <> (- 'send_message', if the user clicks the 'finish_setup' btn, tiktok will only simply post a message ,)

[comment]: <> (  In order to make this feasible, watch out for your CSP rule and allow ads.tiktok.com.)
  
[comment]: <> (  The postMessage logic will be like: )
   
[comment]: <> (    ```)

[comment]: <> (   const message =  btoa&#40;JSON.stringify&#40;{)

[comment]: <> (     'type' : 'tiktok_setup_finish',)

[comment]: <> (     'external_business_id': 123, )

[comment]: <> (     'business_platform': 'your_platform',)

[comment]: <> (     // this url will be your redirect_uri configured in Mapi's app and it will contain the authCode,)

[comment]: <> (     // and you should be responsible for exchanging the accessToken)

[comment]: <> (     'business_profile_id: 'business_profile_id in the setup page')

[comment]: <> (     }}&#41;; // base64 encoded json)
    
[comment]: <> (  ```)

[comment]: <> (  On your end, you should)

[comment]: <> (    ```)

[comment]: <> (    tiktokWindow.on&#40;'message', &#40;payload&#41;=>{)

[comment]: <> (        const payload = JSON.parse&#40;atob&#40;payload.data&#41;&#41;;)

[comment]: <> (        // verify e.origin)

[comment]: <> (        if&#40;!check&#40;e.origin&#41;{)

[comment]: <> (          // do error handling)

[comment]: <> (        })

[comment]: <> (        if&#40;payload.type === 'tiktok_setup_finish'&#41;{)

[comment]: <> (            // close tiktok's window)

[comment]: <> (            tiktokWindow.close&#40;&#41;;)

[comment]: <> (            doSomethingWithThePayloadIfNeeded&#40;payload&#41;;)

[comment]: <> (            // redirect the user to your backend to finish oauth)

[comment]: <> (            window.location.href = payload.redirect_uri;)

[comment]: <> (        })

[comment]: <> (    };)

[comment]: <> ( ```)
    
    
- 'do_nothing': if the user clicks the 'finish_setup' btn, tiktok will do nothing and it is the external platform's duty to
  close the setup page.
  
  This is particularly useful if the external_platform is doing long polling on their end and 
  to see whether the business_profile is ready (e.g. business_profile.status === 2).

- If you wish to support more 'close_method' behavior, leave us an issue in github.
