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
    country_region?: string;
    currency?: string;
    // store hash or name
    store_name?: string;
    phone_number?: string;
    email?: string;
    website_url?: string;
    domain?: string;

    // If you need to create your own management pages, you need to create an app via
    // https://ads.tiktok.com/marketing_api/docs?rid=qf4zvptcoa&id=1702716474845185
    // and contact Tiktok representative to whitelist for you.
    // Tiktok will launch a new oauth flow using app_id and redirect_uri
    app_id?: string;
    redirect_uri?: string;

    // When user clicks finish setup, we will launch an oauth2 flow using the app_id you provided
    // and redirect to your redirect_uri. If you pass in state, we will give it back as-is
    // pass in any data you like, and tiktok will return it as-is in the oauth flow
    state?: string;
}

export interface EffectiveExternalData extends ExternalDataRequest{
    hmac: string;
}
