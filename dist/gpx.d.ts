declare class Gpx {
    node: XMLDocument;
    constructor(xmls: XMLDocument);
    /**
     * get node elements
     * @returns {Function} return element data using key
     */
    getElements(): (key: string) => Element;
}
