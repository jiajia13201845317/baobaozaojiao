import assert from "node:assert/strict";
import { prepareSpeech, zhNumber } from "../src/lib/speech.ts";

assert.equal(zhNumber(1), "一");
assert.equal(zhNumber(11), "十一");
assert.equal(zhNumber(31), "三十一");
assert.equal(prepareSpeech("现在31度", "zh-CN", "care"), "现在三十一度");
assert.equal(prepareSpeech("汪汪汪", "zh-CN", "cry"), "汪，汪，汪");
assert.equal(prepareSpeech("哇呜哇呜", "zh-CN", "cry"), "哇呜，哇呜");
assert.equal(prepareSpeech("咴咴咴", "zh-CN", "cry"), "咴，咴，咴");
assert.equal(prepareSpeech("嘎嘎嘎嘎，真呀真多呀。", "zh-CN", "song"), "嘎，嘎，嘎，嘎，真呀真多呀。");
assert.equal(prepareSpeech("二四六七八", "zh-CN", "song"), "二，四，六，七，八");
assert.equal(prepareSpeech("三十一度", "zh-CN", "care"), "三十一度");
assert.equal(prepareSpeech("E I E I O", "en-US", "song"), "Eee, I, Eee, I, Oh");
assert.equal(prepareSpeech("A B C D E F G.", "en-US", "song"), "Ay Bee See Dee Eee Eff Jee.");
assert.equal(prepareSpeech("Now I know my A B Cs.", "en-US", "song"), "Now I know my Ay Bee See.");
assert.equal(prepareSpeech("How I wonder what you are.", "en-US", "song"), "How I wonder what you are.");
assert.equal(
  prepareSpeech("Old MacDonald had a farm, E I E I O.", "en-US", "song"),
  "Old MacDonald had a farm, Eee, I, Eee, I, Oh."
);

console.log("speech checks passed");
