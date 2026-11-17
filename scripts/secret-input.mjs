import { emitKeypressEvents } from "node:readline";
export async function readSecret(prompt) {
  if (!process.stdin.isTTY)
    throw Error(
      "Interactive password input needs a terminal. For automated checks, provide the documented process environment variable.",
    );
  process.stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = "";
    const input = process.stdin;
    const previous = input.isRaw;
    emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    const finish = () => {
      input.off("keypress", keypress);
      input.setRawMode(previous || false);
      input.pause();
      process.stdout.write("\n");
    };
    function keypress(text, key) {
      if (key?.ctrl && key.name === "c") {
        finish();
        reject(Error("Cancelled"));
        return;
      }
      if (key?.name === "return" || key?.name === "enter") {
        finish();
        resolve(value);
        return;
      }
      if (key?.name === "backspace") {
        value = [...value].slice(0, -1).join("");
        return;
      }
      if (!key?.ctrl && !key?.meta && text && !/[\x00-\x1f\x7f]/.test(text))
        value += text;
    }
    input.on("keypress", keypress);
  });
}
