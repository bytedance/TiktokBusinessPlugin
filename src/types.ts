export interface GENERATOR_OPTIONS {
    // if true, only check business_platform, external_business_id and timestamp,
    // which is the case for bigcommerce.
    debug: (...args: string[])=> any | undefined;
    validationLength: number; // defaults to DEFAULT_VALID_LENGTH
}

export interface ExternalDataRequest {
    // meta fields
    // version is required as a hint sine we might need to upgrade fields in the future
    version: string;
    // timestamp "" + Date.now()
    timestamp: string;
    // Locale currently supported: English, French, Spanish
    locale: string;

    // level1 fields
    business_platform: string;
    external_business_id: string;

    // level2 fields
    // https://docs.google.com/document/d/1-A_yuy1Fc9uUc-UCc8PQtOvRm5BS6B9N_Z-PNx8c_lQ/edit#heading=h.2hvcnfua6ha6
    industry_id?: string;

    // GMT+/-hh:mm format, for example, GMT-07:00 GMT+06:30
    timezone?: string;
    // available countries and currency mappings can be found at
    // https://docs.google.com/document/d/1-A_yuy1Fc9uUc-UCc8PQtOvRm5BS6B9N_Z-PNx8c_lQ/edit#
    countryRegion?: string;
    currency?: string;
    // store hash or name
    store_name?: string;
    phone_number?: string;
    email?: string;
    website_url?: string;
    domain?: string;

    // level3 fields
    // External business platform such as square, prestashop need to store tiktok Mapi accessToken on their side
    // in order to fetch catalog information.
    // when the user clicks "finish setup", we will use the following information to start an oauth2 flow,
    // the redirect_uri should be a callback url hosted by them and they are responsible for exachanging the
    // auth code for access token by themselves.

    // For platform who commissions Tiktok to create the management page, please ignore the following fields!

    // For platform who wants to create the management page by themselves, you'll have to apply for a Tiktok Mapi app
    // first. As such, you will be able to call Tiktok MApi via our access_token
    // https://ads.tiktok.com/marketing_api/docs?rid=n1ow2qmxk7&id=1701890909484033

    // here is your MApi app_id
    app_id?: string;
    // the scope in your MApi config, if not passed, we will assume you are going to apply for all scopes
    scope?: number[];
    // The redirect_uri parameter should be the same value as the one in the MApi app configuration
    // this uri should be hosted by external business platform
    // when the user clicks "finish setup", Tiktok's server will launch an oauth2 flow using app_id and redirect_uri
    // and will take the user to "redirect_uri" along with 2 parameters, the auth_code and the state which is defined below
    // it is the external platform's responsibility to exchange auth_code for accessToken and save it in their own storage
    redirect_uri?: string;
    // pass in any data you like, and tiktok return it as-is in the oauth flow
    state?: string;
}

export interface EffectiveExternalData extends ExternalDataRequest{
    hmac: string;
}
