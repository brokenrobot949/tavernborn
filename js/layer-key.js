// One sprite layer is named by its LPC sheet definition plus the colours baked into it.
// Shared by the game (sprite.js) and the dev-time bake tool so both agree on the key.
export function layerKey(ref) {
  let key = ref.def;
  if (ref.color) key += '|' + ref.color;
  if (ref.color2) key += '+' + ref.color2;
  return key;
}
