/**
 * "Tags" wat 'n admin aan 'n gebruiker kan toeken, los van hul rol.
 * 'n Tag gee bykomende toegang sonder om die gebruiker se rol te verander.
 *
 * FINANCE — kry toegang tot die finansiële inligting (begroting) van
 *           geleenthede waaraan hulle toegeken is.
 */

export enum UserTag {
    FINANCE = 'FINANCE',
}
