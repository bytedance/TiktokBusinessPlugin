export class InvalidExternalDataError extends Error{
    constructor(msg: string) {
        super('Invalid external data provided : ' + msg);
    }
}

export class InvalidRequestError extends Error{
    constructor(msg: string) {
        super('Invalid request : ' + msg);
    }
}
