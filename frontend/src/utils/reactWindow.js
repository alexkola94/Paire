/**
 * Re-export FixedSizeList from react-window.
 * Package dist is UMD/CJS: dev pre-bundle may expose named only, build uses dist/react-window.js
 * which exposes the object as default. Use namespace import and take from either shape.
 */
import * as rw from 'react-window'
export const FixedSizeList = rw.FixedSizeList ?? rw.default?.FixedSizeList
