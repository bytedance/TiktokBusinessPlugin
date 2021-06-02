export interface GENERATOR_OPTIONS {
    // if true, only check external_business_type, external_business_id and timestamp,
    // which is the case for bigcommerce.
    debug: (...args: string[])=> any | undefined;
    validationLength: number; // defaults to DEFAULT_VALID_LENGTH
}

export interface ExternalDataRequest {
    // metafields
    // version is required as a hint sine we might need to upgrade fields in the future
    version: string;
    // timestamp "" + Date.now()
    timestamp: string;

    // level1 fields
    // 'bigcommerce' | 'woocommerce' | 'square' | 'presto'
    external_business_type: string;
    external_business_id: string;

    // level2 fields
    industry?: string;
    timezone?: string;
    country?: string;
    store_id?: string;
    store_name?: string;
    phone_number?: string;
    email?: string;
    currency?: string;
    website_url?: string;
    domain?: string;

    // level3 fields
    // External business platform such as square, prestashop need to store tiktok Mapi accessToken on their side
    // in order to fetch catalog information.
    // when the user clicks "finish setup", we will use the following information to start an oauth2 flow,
    // the redirect_uri should be a callback url hosted by them and they are responsible for exachanging the
    // auth code for access token by themselves.

    // the external business platform should apply a MApi app first.
    app_id?: string;
    // The redirect_uri parameter should be the same value as the one in the MApi app configuration
    // this uri should be hosted by external business platform
    redirect_uri?: string;

    // any extra information for your own convenience
    extra?: Record<string, string>;
}

export interface EffectiveExternalData extends ExternalDataRequest{
    hmac: string;
}
