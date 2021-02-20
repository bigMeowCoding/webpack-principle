import * as babel from "@babel/core";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { existsSync, readFileSync, writeFile } from "fs";
import { resolve, relative, dirname } from "path";
import * as fs from "fs";

// 设置根目录
const projectRoot = resolve(__dirname, "project_2");

interface Dep {
  key: string;
  deps: string[];
  code: string;
}

// 类型声明
type DepRelation = Dep[];
// 初始化一个空的 depRelation，用于收集依赖
const depRelation: DepRelation = []; // 数组！

// 将入口文件的绝对路径传入函数，如 D:\demo\fixture_1\index.js
collectCodeAndDeps(resolve(projectRoot, "index.js"));
function generateCode() {
  let code = "";
  code +=
    "var depRelation = [" +
    depRelation
      .map((item) => {
        const { key, code, deps } = item;
        return `{
            key: ${JSON.stringify(key)}, 
      deps: ${JSON.stringify(deps)},
      code: function(require, module, exports){
        ${code}
      }
      }`;
      })
      .join(",") +
    "];\n";
  code += "var modules = {};\n";
  code += `execute(depRelation[0].key)\n`;
  code += `
  function execute(key) {
    if (modules[key]) { return modules[key] }
    var item = depRelation.find(i => i.key === key)
    if (!item) { throw new Error(\`\${item} is not found\`) }
    var pathToKey = (path) => {
      var dirname = key.substring(0, key.lastIndexOf('/') + 1)
      var projectPath = (dirname + path).replace(\/\\.\\\/\/g, '').replace(\/\\\/\\\/\/, '/')
      return projectPath
    }
    var require = (path) => {
      return execute(pathToKey(path))
    }
    modules[key] = { __esModule: true }
    var module = { exports: modules[key] }
    item.code(require, module, module.exports)
    return modules[key]
  }
  `;
  return code;
}
const existDist = existsSync("./dist");
if (!existDist) {
  fs.mkdirSync("./dist");
}

writeFile("./dist/dist_2.js", generateCode(), (err) => {
  if (err) {
    return;
  }
  console.log("done");
});
// console.log(depRelation);

/**
 *
 * @param filepath 文件绝对地址
 */
function collectCodeAndDeps(filepath: string) {
  const key = getProjectPath(filepath); // 文件的项目路径，如 index.js
  if (depRelation.find((i) => i.key === key)) {
    // 注意，重复依赖不一定是循环依赖
    return;
  }
  // 获取文件内容，将内容放至 depRelation
  const code = readFileSync(filepath).toString();
  // 初始化 depRelation[key]
  // 将代码转为 AST
  const transformCode = babel.transform(code, {
    presets: ["@babel/preset-env"],
  });
  const es5Code = transformCode?.code;
  if (!es5Code) {
    return;
  }
  const item: Dep = { key, deps: [], code: es5Code };
  depRelation.push(item);
  const ast = parse(code, { sourceType: "module" });
  // 分析文件依赖，将内容放至 depRelation
  traverse(ast, {
    enter: (path) => {
      if (path.node.type === "ImportDeclaration") {
        // path.node.source.value 往往是一个相对路径，如 ./a.js，需要先把它转为一个绝对路径
        const depAbsolutePath = resolve(
          dirname(filepath),
          path.node.source.value
        );
        // 然后转为项目路径
        const depProjectPath = getProjectPath(depAbsolutePath);
        // 把依赖写进 depRelation
        item.deps.push(depProjectPath);
        collectCodeAndDeps(depAbsolutePath);
      }
    },
  });
}
// 获取文件相对于根目录的相对路径
function getProjectPath(path: string) {
  return relative(projectRoot, path).replace(/\\/g, "/");
}
