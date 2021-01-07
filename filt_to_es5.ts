import * as fs from "fs";
import  { parse } from "@babel/core";
import  * as babel from "@babel/core";


const code = fs.readFileSync("./test.js").toString();
const ast = parse(code, { sourceType: "module" });
if (ast) {
  const result = babel.transformFromAstSync(ast, code, {
    presets: ["@babel/preset-env"],
  });
  if (result?.code) {
    fs.writeFileSync("./test.es5.js", result.code);
  }
}
