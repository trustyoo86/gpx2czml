/**
 * get elements
 * @param node Element
 * @returns () => Element
 */
export const getElements = (node: Element) => {
  const gpxNode = node;

  return (key: string): Element => gpxNode.getElementsByTagName(key)[0];
};

/**
 * get node attributes
 * @returns () => string | null
 */
export const getAttribute = (node: Element) => {
  const targetNode = node;

  return (key: string): string | null => targetNode.getAttribute(key);
};

/**
 * get text in tag
 * @param tag tag element
 * @returns text string
 */
export const getTextTag = (tag: Element): string | null => {
  try {
    const tagStr = tag.textContent;
    tagStr?.replace(/(^\s*)|(\s*$)/gi, '');

    return tagStr;
  } catch (e) {
    return null;
  }
};
