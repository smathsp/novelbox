export class DirectoryNotFoundError extends Error {
    constructor() {
      super('工作区文件夹不存在或权限不足');
      this.name = 'DirectoryNotFoundError';
    }
  }