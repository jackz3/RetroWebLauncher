// 通用的 promisify 函数
export function promisify<T>(fn: (...args: any[]) => void): (...args: any[]) => Promise<T> {
  return (...args: any[]) => {
    return new Promise<T>((resolve, reject) => {
      fn(...args, (err: any, result: T) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  };
}


// 将回调形式的 fs.readFile 转换为 Promise 形式
// const readFileAsync = promisify<string>((path, callback) => fs.readFile(path, 'utf8', callback));
// readFileAsync('./example.txt')
//   .then((data) => {
//     console.log('文件内容:', data);
//   })
//   .catch((err) => {
//     console.error('读取文件出错:', err);
//   });