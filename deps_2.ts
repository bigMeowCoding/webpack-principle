import { dirname, relative, resolve } from "path";
import { readFileSync } from "fs";
import { parse } from "@babel/core";
import traverse from "@babel/traverse";
const projectRoot = resolve(__dirname, "project_1");
// 类型声明
type DepRelation = { [key: string]: { deps: string[]; code: string } };
// 初始化一个空的 depRelation，用于收集依赖
const depRelation: DepRelation = {};

collectCodeAndDeps(resolve(projectRoot, "index.js"));
console.log(depRelation);
console.log("done");
function collectCodeAndDeps(filePath: string) {
  const key = getProjectPath(filePath);
  const code = readFileSync(filePath).toString();
  depRelation[key] = { deps: [], code: code };
  const ast = parse(code, { sourceType: "module" });
  traverse(ast, {
    enter: (path) => {
      if (path.node.type === "ImportDeclaration") {
        // path.node.source.value 往往是一个相对路径，如 ./a.js，需要先把它转为一个绝对路径
        const depAbsolutePath = resolve(
          dirname(filePath),
          path.node.source.value
        );
        // 然后转为项目路径
        const depProjectPath = getProjectPath(depAbsolutePath);
        // 把依赖写进 depRelation
        depRelation[key].deps.push(depProjectPath);
        collectCodeAndDeps(depAbsolutePath);
      }
    },
  });
}

// 获取文件相对于根目录的相对路径
function getProjectPath(path: string) {
  return relative(projectRoot, path).replace(/\\/g, "/");
}
