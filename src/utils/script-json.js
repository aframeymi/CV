// Turns data into JSON that is safe to place inside an inline <script>.
// JSON.stringify leaves "<" as it is, so a value containing "</script>" would end the script early
// and let the rest of the value run as HTML. "<" means the same character to JavaScript.
export function toScriptJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
