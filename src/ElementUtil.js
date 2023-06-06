/**
 * get elements
 * @param node Element
 * @returns () => Element
 */
export const getElements = (node) => {
    const gpxNode = node;
    return (key) => gpxNode.getElementsByTagName(key)[0];
};
/**
 * get node attributes
 * @returns () => string | null
 */
export const getAttribute = (node) => {
    const targetNode = node;
    return (key) => targetNode.getAttribute(key);
};
/**
 * get text in tag
 * @param tag tag element
 * @returns text string
 */
export const getTextTag = (tag) => {
    try {
        const tagStr = tag.textContent;
        tagStr?.replace(/(^\s*)|(\s*$)/gi, '');
        return tagStr;
    }
    catch (e) {
        return null;
    }
};
